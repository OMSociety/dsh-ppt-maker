/**
 * ppt_import — PPTX → PPTD 全量逆向（opt-in）。
 *
 * This is the only tool that touches the reverse engine. Surgical mode
 * （对导入 deck 的轻改——改字/换图/调页序）does NOT go through here; that
 * path is ppt_patch on a raw .pptx.
 *
 * Frozen contract:
 *  - input: source（相对 cwd 的 .pptx 路径）、targetDir、title、open；
 *  - mode: 'full'（默认，走逆向）| 'surgical'（早退，返回 guidance，由调用
 *    方走 ppt_patch；本工具只建空 projectDir 不动它）；
 *  - output: { ok, projectDir, pageCount, mediaCount, revision, dropped,
 *    degraded } — RevisionMismatch 等错误走 toolError 统一通道。
 */
import path from 'node:path'
import { access, readFile } from 'node:fs/promises'
import { reverseImport, ReverseImportError } from '../core/reverse/index.js'
import { ProjectError, resolveProjectDir } from '../core/project/store.js'
import { renderSummary, resultSchema, resolveSessionCwd, sessionIdOf, toolError, type PluginToolCtx } from './shared.js'
import type { PluginToolCtxWithOpen } from './open.js'

async function manifestRevisionOf(projectDir: string): Promise<number> {
  const raw = await readFile(path.join(projectDir, 'manifest.json'), 'utf8')
  const parsed = JSON.parse(raw) as { revision?: unknown }
  if (typeof parsed?.revision !== 'number') return -1
  return parsed.revision
}

export function registerImportTool(ctx: PluginToolCtxWithOpen): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_import',
    description:
      '把一个 .pptx 全量逆向成 PPTD 工程（opt-in 高阶动作；对导入 deck 的轻改请用 ppt_patch）。' +
      '产出 deck.pptd + pages/*.page + media/（sha1 去重）+ import.report.yml；' +
      '不支持元素（chart/smartart/ole/media/3d/group）在原位置插灰底占位形状并记 dropped。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['source'],
      properties: {
        source: { type: 'string', minLength: 1, description: '.pptx 源文件路径（相对会话 cwd）' },
        targetDir: {
          type: 'string',
          minLength: 1,
          description: '目标工程目录（相对 cwd）；缺省取源文件名去扩展名'
        },
        title: { type: 'string', description: '工程标题；缺省沿用源文件名' },
        open: {
          type: 'boolean',
          description: 'true = 写完请求工作台打开该工程（默认 true）'
        },
        mode: {
          type: 'string',
          enum: ['full', 'surgical'],
          description: 'full（默认）= 全量逆向；surgical = 早退（仅给提示，不建工程）'
        }
      }
    },
    output: {
      schema: resultSchema({
        mode: { type: 'string' },
        source: { type: 'string' },
        guidance: { type: 'string' },
        projectDir: { type: 'string' },
        pageCount: { type: 'integer' },
        mediaCount: { type: 'integer' },
        revision: { type: 'integer' },
        dropped: { type: 'integer' },
        degraded: { type: 'integer' },
        droppedList: { type: 'array', items: { type: 'object', additionalProperties: true } },
        degradedList: { type: 'array', items: { type: 'object', additionalProperties: true } }
      }),
      render: renderSummary((r) => {
        if (r.mode === 'surgical') return `surgical 模式：请用 ppt_patch 直接对 ${String(r.source)} 做轻改`
        return `已导入 ${String(r.pageCount)} 页 / 媒体 ${String(r.mediaCount)} 件 / dropped ${String(r.dropped)} / degraded ${String(r.degraded)}`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const source = String(args.source ?? '')
        const mode = (args.mode as 'full' | 'surgical' | undefined) ?? 'full'

        if (mode === 'surgical') {
          return {
            ok: true,
            mode: 'surgical',
            source,
            guidance:
              '对导入 .pptx 的轻改（改字/换图/调页序）请用 ppt_patch：直接 patch 形状后另存，不经 PPTD 往返，保留 SmartArt/图表/OLE 未建模部件'
          }
        }

        const sourceAbs = path.resolve(cwd, source)
        try {
          await access(sourceAbs)
        } catch {
          throw new ProjectError('SourceNotFound', `源文件读不到：${sourceAbs}`, { status: 404 })
        }
        const targetDir =
          typeof args.targetDir === 'string' && args.targetDir !== ''
            ? args.targetDir
            : path.basename(source, path.extname(source))
        const title = typeof args.title === 'string' ? args.title : path.basename(source, path.extname(source))
        const open = args.open !== false

        const result = await reverseImport({
          cwd,
          source: sourceAbs,
          targetDir,
          title,
          sessionId: sessionIdOf(exec)
        })

        if (open) {
          const abs = resolveProjectDir(cwd, targetDir)
          const rel = path.relative(cwd, abs).replace(/\\/g, '/')
          const sessionId = sessionIdOf(exec)
          const bridge = ctx.pptMaker
          if (sessionId && bridge && typeof bridge.registerProject === 'function' && typeof bridge.requestOpen === 'function') {
            const { key } = bridge.registerProject(sessionId, cwd, rel)
            bridge.requestOpen(sessionId, key)
          }
        }

        return {
          ok: true,
          projectDir: path.relative(cwd, result.projectDir).replace(/\\/g, '/'),
          pageCount: result.pageCount,
          mediaCount: result.mediaCount,
          revision: await manifestRevisionOf(result.projectDir),
          dropped: result.dropped.length,
          degraded: result.degraded.length,
          droppedList: result.dropped,
          degradedList: result.degraded
        }
      } catch (err) {
        if (err instanceof ReverseImportError) {
          return toolError(
            new ProjectError(err.code, err.message, {
              status: err.code === 'SourceNotFound' ? 404 : err.code === 'SourceOutsideCwd' ? 400 : 409,
              detail: err.detail
            })
          )
        }
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
