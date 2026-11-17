/**
 * ppt_render — render project pages to PNG previews via libreoffice-kit:
 * { ok, images: [{ page, path }] }. Renders the engine-built
 * pptx bytes BEFORE font embedding (LibreOffice 会误用嵌入的子集 EOT 字体，
 * 预览必须走未嵌入字节，由系统字体承担渲染).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildProjectDeck, renderPptxImages, saveRawProjectPptx } from '../core/export-pipeline.js'
import { renderSummary, resultSchema, resolveSessionCwd, toolError, type PluginToolCtx } from './shared.js'

export function registerRenderTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_render',
    description:
      '把工程渲染成每页 PNG 预览：经引擎构建最终 pptx 字节后由 libreoffice-kit 光栅化（96dpi）。' +
      '返回 { ok, images:[{page,path}] }，图片落在工程目录 .previews/ 下；' +
      '宿主支持附件时同时回传图片内容块（无需再 read_image 即可直接看图复核版面）。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir'],
      properties: {
        dir: { type: 'string', minLength: 1, description: '工程目录（相对于会话 cwd）' },
        pages: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
          description: '只渲染这些页（1 起）；默认全部'
        },
        dpi: { type: 'integer', minimum: 24, maximum: 600, description: '渲染分辨率，默认 96' }
      }
    },
    output: {
      schema: resultSchema({
        revision: { type: 'integer' },
        images: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
            properties: {
              page: { type: 'integer' },
              path: { type: 'string' },
              width: { type: 'integer' },
              height: { type: 'integer' }
            }
          }
        },
        missingFonts: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } }
      }),
      render: renderSummary((r) => {
        const images = (r.images as Array<{ page: number }> | undefined) ?? []
        return `已渲染 ${images.length} 页预览`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const dir = args.dir as string
        const pipeline = await buildProjectDeck(cwd, dir)
        // 渲染用未嵌字体的裸字节：LibreOffice 会误用嵌入的子集 EOT（字形错乱），
        // 预览必须反映版面本身，由系统字体承担渲染。
        const bytes = await saveRawProjectPptx(pipeline)

        const rendered = await renderPptxImages(bytes, {
          pages: args.pages as number[] | undefined,
          dpi: (args.dpi as number | undefined) ?? 96
        })
        try {
          const previewDir = path.join(pipeline.dir, '.previews')
          await mkdir(previewDir, { recursive: true })
          const images: Array<{ page: number; path: string; width: number; height: number }> = []
          const pngBytes: Array<{ page: number; bytes: Uint8Array; name: string }> = []
          for (const image of rendered.result.images) {
            const page = image.page ?? image.index + 1
            const target = path.join(previewDir, `page-${String(page).padStart(2, '0')}.png`)
            const bytesIn = await readFile(image.path)
            await writeFile(target, bytesIn)
            images.push({
              page,
              path: path.relative(cwd, target).replace(/\\/g, '/'),
              width: image.width,
              height: image.height
            })
            pngBytes.push({ page, bytes: new Uint8Array(bytesIn), name: path.basename(target) })
          }
          // 图片内容块：经 attachments 入库后作为工具结果的 content 返回，
          // 主模型不用再 read_image 就能直接看到每页渲染图（视觉复核闭环）。
          // 宿主没注入 attachments 时降级为纯路径清单（原行为）。
          const content: Array<Record<string, unknown>> = []
          const saveImages = (ctx.attachments as { saveImages?: unknown } | undefined)?.saveImages
          if (typeof saveImages === 'function') {
            try {
              const refs = await (saveImages as (items: Array<{ data: Uint8Array; mediaType: 'image/png'; name: string }>) => Promise<unknown[]>)(
                pngBytes.map((p) => ({ data: p.bytes, mediaType: 'image/png', name: p.name }))
              )
              pngBytes.forEach((p, i) => {
                content.push({ type: 'text', text: `第 ${p.page} 页渲染图：` })
                content.push({ type: 'image', attachment: refs[i] })
              })
            } catch {
              /* 入库失败不反噬渲染结果：路径清单仍然有效 */
            }
          }
          return {
            ok: true,
            revision: pipeline.revision,
            images,
            missingFonts: rendered.result.missingFonts,
            warnings: pipeline.buildWarnings,
            ...(content.length > 0 ? { content } : {})
          }
        } finally {
          await rendered.cleanup()
        }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
