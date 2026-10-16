/**
 * ppt_patch — 外科手术模式：对 .pptx 做轻改而**不**走
 * PPTD 逆向/重导出。适用面:调用方拿到一份既有 pptx，只想改字 / 换图 /
 * 调页序，且不愿冒「图表/SmartArt/OLE 被逆向卡掉重写成占位」的风险。
 *
 * 底层契约：@office-kit/pptx 的 loadPresentation →
 * savePresentation **passthrough** 保证「库不建模的部件在 round-trip 中
 * 原样保留」；本工具只做三类窄操作，不去解析 / 重建没建模的东西。
 *
 * 冻结 op 词表（与 PPTD 层的 add_page/remove_page... 刻意不同——这里
 * 是按形状引用，不是按 PPTD elementId）：
 *  - { op: 'set_text',      slide, shapeId | shapeName, text }
 *      文本整体替换。newlines: 'paragraph' 让 \n 起新段。
 *  - { op: 'replace_image', slide, shapeId | shapeName, image { bytes(base64) | src(相对 cwd 路径) } }
 *  - { op: 'move_page',     slide, toIndex }   0-based,移动整页到指定位置
 *
 * shape 引用优先级：shapeId（源 <p:cNvPr id>）→ shapeName（cNvPr name）
 * → findShapesAtPoint 命中检测的 {x, y}（单位 EMU）。
 *
 * 输出：{ ok, out, bytes, appliedOps, unchangedParts }。
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import {
  findShapeById,
  findShapesAtPoint,
  findShapesByName,
  getShapeId,
  getSlideAt,
  getSlideCount,
  getSlides,
  loadPresentation,
  moveSlide,
  savePresentation,
  setShapeImage,
  setShapeText,
  type PresentationData,
  type SlideShapeData
} from '@office-kit/pptx'
import { ProjectError } from '../core/project/store.js'
import { listPackageParts } from '@office-kit/pptx'
import { renderSummary, resultSchema, resolveSessionCwd, sessionIdOf, toolError, type PluginToolCtx } from './shared.js'

type PatchOp =
  | { op: 'set_text'; slide: number; shapeId?: number; shapeName?: string; at?: [number, number]; text: string }
  | {
      op: 'replace_image'
      slide: number
      shapeId?: number
      shapeName?: string
      at?: [number, number]
      image: { bytes?: string; src?: string }
    }
  | { op: 'move_page'; slide: number; toIndex: number }

interface PatchArgs {
  source: string
  out?: string
  ops: PatchOp[]
}

interface ShapeRef {
  slide: number
  shapeId?: number
  shapeName?: string
  at?: [number, number]
}

function pickShape(pres: PresentationData, ref: ShapeRef): SlideShapeData {
  const slide = getSlideAt(pres, ref.slide - 1)
  if (!slide) {
    throw new ProjectError('SlideIndexOutOfRange', `源文件没有第 ${ref.slide} 页`, { status: 404 })
  }
  if (ref.shapeId !== undefined) {
    const shape = findShapeById(slide, ref.shapeId)
    if (!shape) throw new ProjectError('ShapeNotFound', `第 ${ref.slide} 页没有 shapeId=${ref.shapeId} 的形状`, { status: 404 })
    return shape
  }
  if (typeof ref.shapeName === 'string' && ref.shapeName !== '') {
    const hits = findShapesByName(slide, ref.shapeName)
    if (hits.length === 0) throw new ProjectError('ShapeNotFound', `第 ${ref.slide} 页没有名为 "${ref.shapeName}" 的形状`, { status: 404 })
    if (hits.length > 1) {
      throw new ProjectError('ShapeAmbiguous', `第 ${ref.slide} 页有 ${hits.length} 个形状都叫 "${ref.shapeName}"，请改用 shapeId`, { status: 409 })
    }
    return hits[0]
  }
  if (Array.isArray(ref.at) && ref.at.length === 2) {
    const hits = findShapesAtPoint(slide, ref.at[0], ref.at[1])
    if (hits.length === 0) {
      throw new ProjectError('ShapeNotFound', `第 ${ref.slide} 页坐标 (${ref.at[0]},${ref.at[1]}) 没有命中任何形状`, { status: 404 })
    }
    return hits[0]
  }
  throw new ProjectError('ShapeRefRequired', 'patch 需要 shapeId / shapeName / at 三者至少其一', { status: 400 })
}

async function readImageBytes(cwd: string, image: { bytes?: string; src?: string }): Promise<Uint8Array> {
  if (typeof image.bytes === 'string' && image.bytes !== '') {
    return new Uint8Array(Buffer.from(image.bytes, 'base64'))
  }
  if (typeof image.src === 'string' && image.src !== '') {
    const abs = path.resolve(cwd, image.src)
    const rel = path.relative(path.resolve(cwd), abs)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new ProjectError('PathOutsideCwd', `图片必须位于会话 cwd 内：${image.src}`, { status: 400 })
    }
    const buffer = await readFile(abs)
    return new Uint8Array(buffer)
  }
  throw new ProjectError('ImageBytesMissing', 'replace_image 需要 image.bytes(Base64) 或 image.src（cwd 内路径）', { status: 400 })
}

function relativeOrSelf(cwd: string, abs: string): string {
  const rel = path.relative(cwd, abs)
  return rel.startsWith('..') || path.isAbsolute(rel) ? abs : rel.replace(/\\/g, '/')
}

/**
 * Compare the part-name sets between two package sessions to demonstrate L1
 * passthrough. Any part that existed before but not after is a loss; we only
 * ever *add* parts (e.g. embedded images on replace_image).
 */
function diffParts(before: Set<string>, after: Set<string>): { lost: string[]; gained: string[] } {
  const lost: string[] = []
  const gained: string[] = []
  for (const part of before) if (!after.has(part)) lost.push(part)
  for (const part of after) if (!before.has(part)) gained.push(part)
  return { lost, gained }
}

export function registerPatchTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_patch',
    description:
      '对 .pptx 做外科手术式轻改（改字/换图/调页序），不经 PPTD 逆向。**库不建模的部件**（SmartArt/嵌入 Excel/OLE 等）在 L1 passthrough 下原样保留。' +
      'shape 用 shapeId / shapeName / at([xEmu,yEmu]) 三选一引用。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['source', 'ops'],
      properties: {
        source: { type: 'string', minLength: 1, description: '.pptx 源文件（相对 cwd）' },
        out: {
          type: 'string',
          description: '输出路径（相对 cwd）；缺省 <源名>-patched.pptx；绝不原地写源文件'
        },
        ops: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['op', 'slide'],
            properties: {
              op: { type: 'string', enum: ['set_text', 'replace_image', 'move_page'] },
              slide: { type: 'integer', minimum: 1 },
              shapeId: { type: 'integer' },
              shapeName: { type: 'string' },
              at: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              text: { type: 'string' },
              toIndex: { type: 'integer', minimum: 0 },
              image: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  bytes: { type: 'string', description: 'base64 图片字节' },
                  src: { type: 'string', description: 'cwd 内图片路径' }
                }
              }
            },
            additionalProperties: true
          }
        }
      }
    },
    output: {
      schema: resultSchema({
        out: { type: 'string' },
        bytes: { type: 'integer' },
        appliedOps: { type: 'integer' },
        appliedList: { type: 'array', items: { type: 'string' } },
        unchangedParts: { type: 'integer' },
        lostParts: { type: 'array', items: { type: 'string' } },
        beforeSha1: { type: 'string' },
        afterSha1: { type: 'string' },
        sessionId: { type: 'string' }
      }),
      render: renderSummary((r) => {
        const lost = Array.isArray(r.lostParts) ? r.lostParts.length : 0
        return `已写入 ${String(r.out ?? '')}（${String(r.appliedOps)} 个 op；未建模部件 ${String(r.unchangedParts)} 件全数保留，丢件 ${lost}）`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const source = String(args.source ?? '')
        const ops = args.ops as PatchOp[]
        if (!Array.isArray(ops) || ops.length === 0) {
          throw new ProjectError('OpsEmpty', 'ops 必须是非空数组', { status: 400 })
        }

        // Load source bytes (cwd-scoped; never writes back to the source).
        const sourceAbs = path.resolve(cwd, source)
        const rel = path.relative(path.resolve(cwd), sourceAbs)
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          throw new ProjectError('PathOutsideCwd', `源文件必须位于会话 cwd 内：${source}`, { status: 400 })
        }
        const sourceBytes = new Uint8Array(await readFile(sourceAbs))
        const beforeSha1 = createHash('sha1').update(sourceBytes).digest('hex')

        const pres = await loadPresentation(sourceBytes)
        const slides = getSlides(pres)
        if (slides.length === 0) throw new ProjectError('NoSlides', '源文件没有页面', { status: 409 })
        const beforeParts = new Set(listPackageParts(pres).map((p) => p.name))

        const appliedOps: string[] = []
        for (let i = 0; i < ops.length; i++) {
          const op = ops[i]
          const slideIndex = op.slide
          if (slideIndex < 1 || slideIndex > getSlideCount(pres)) {
            throw new ProjectError('SlideIndexOutOfRange', `ops[${i}] slide=${slideIndex} 超界（1..${getSlideCount(pres)}）`, { status: 400 })
          }
          switch (op.op) {
            case 'set_text': {
              const shape = pickShape(pres, op as ShapeRef)
              if (typeof op.text !== 'string') throw new ProjectError('TextRequired', `ops[${i}] set_text 需要 text 字符串`, { status: 400 })
              setShapeText(shape, op.text, { newlines: 'paragraph' })
              appliedOps.push(`set_text p${slideIndex}#${getShapeId(shape)} «${op.text.slice(0, 30)}»`)
              break
            }
            case 'replace_image': {
              const shape = pickShape(pres, op as ShapeRef)
              if (!op.image) throw new ProjectError('ImageRequired', `ops[${i}] replace_image 需要 image 字段`, { status: 400 })
              const bytes = await readImageBytes(cwd, op.image)
              setShapeImage(shape, bytes)
              appliedOps.push(`replace_image p${slideIndex}#${getShapeId(shape)} (${bytes.byteLength} bytes)`)
              break
            }
            case 'move_page': {
              const target = op.toIndex
              if (typeof target !== 'number' || !Number.isInteger(target) || target < 0 || target >= slides.length + 1) {
                throw new ProjectError('MoveTargetInvalid', `ops[${i}] move_page.toIndex=${String(target)} 非法（0..${slides.length}）`, { status: 400 })
              }
              const slide = getSlideAt(pres, slideIndex - 1)
              if (!slide) throw new ProjectError('SlideIndexOutOfRange', `源文件没有第 ${slideIndex} 页`, { status: 404 })
              moveSlide(pres, slide, target)
              appliedOps.push(`move_page p${slideIndex} → ${target}`)
              break
            }
            default: {
              const unknown = (op as { op?: string }).op
              throw new ProjectError('OpUnknown', `ops[${i}] 未知 op：${String(unknown)}（冻结词表 set_text / replace_image / move_page）`, { status: 400 })
            }
          }
        }

        const outBytes = await savePresentation(pres)
        const afterPres = await loadPresentation(outBytes)
        const afterParts = new Set(listPackageParts(afterPres).map((p) => p.name))
        const { lost } = diffParts(beforeParts, afterParts)

        const sourceStem = path.basename(source, path.extname(source))
        const outRel = typeof args.out === 'string' && args.out !== '' ? args.out : `${sourceStem}-patched.pptx`
        const outAbs = path.resolve(path.resolve(cwd), outRel)
        const outRelChecked = path.relative(path.resolve(cwd), outAbs)
        if (outRelChecked.startsWith('..') || path.isAbsolute(outRelChecked)) {
          throw new ProjectError('PathOutsideCwd', `输出路径必须位于会话 cwd 内：${outRel}`, { status: 400 })
        }
        await (await import('node:fs/promises')).writeFile(outAbs, Buffer.from(outBytes))

        return {
          ok: true,
          out: relativeOrSelf(cwd, outAbs),
          bytes: outBytes.byteLength,
          appliedOps: appliedOps.length,
          appliedList: appliedOps,
          unchangedParts: lost.length === 0 ? beforeParts.size : beforeParts.size - lost.length,
          lostParts: lost,
          beforeSha1,
          afterSha1: createHash('sha1').update(outBytes).digest('hex'),
          sessionId: sessionIdOf(exec)
        }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}

// Re-exports used by tests for targeted probing of shape resolution.
export { diffParts }
export type { PatchOp }
