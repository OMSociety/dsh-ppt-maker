/**
 * ppt_export — 统一发布管线的模型侧入口（releaseProject）：
 * QA 指纹门禁（stale 拒导出，skipCheck 可绕过）→ 构建 + 字体嵌入 →
 * postflight 回读校验 → 落盘 + manifest.exportReport 落账（含 sha256）。
 */
import { computeProjectFingerprint } from '../core/release/fingerprint.js'
import { releaseProject } from '../core/release/release.js'
import { renderSummary, resultSchema, resolveSessionCwd, toolError, type PluginToolCtx } from './shared.js'

export function registerExportTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_export',
    description:
      '把工程导出为 .pptx：统一发布管线 = QA 指纹门禁 + 构建 + 字体嵌入 + postflight 回读校验。' +
      '导出前必须先跑 ppt_check 且通过；工程在质检后有改动会被判 stale 拒导出（重新 ppt_check 即可）。' +
      '传 skipCheck: true 跳过质检门禁（postflight 仍强制执行，落账会标注未检）。' +
      '传 pdf 时同时把成品转成 PDF（与 ppt_render 同一引擎），便于直接分发或打印。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir', 'out'],
      properties: {
        dir: { type: 'string', minLength: 1, description: '工程目录（相对于会话 cwd）' },
        out: { type: 'string', minLength: 1, description: '导出文件路径（相对于会话 cwd，.pptx）' },
        pdf: { type: 'string', minLength: 1, description: '可选：同时导出 PDF 的路径（相对于会话 cwd，.pdf）' },
        skipCheck: { type: 'boolean', description: '跳过 QA 指纹门禁直接导出（默认 false；postflight 不跳）' }
      }
    },
    output: {
      schema: resultSchema({
        path: { type: 'string' },
        pdf: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, bytes: { type: 'integer' } } },
        revision: { type: 'integer' },
        bytes: { type: 'integer' },
        sha256: { type: 'string' },
        fontsUsed: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        fontEmbed: { type: 'object', additionalProperties: true },
        postflight: { type: 'object', additionalProperties: true },
        check: {
          type: 'object',
          additionalProperties: true,
          properties: {
            pass: { type: 'boolean' },
            fingerprint: { type: 'string' },
            skipped: { type: 'boolean' }
          }
        }
      }),
      render: renderSummary((r) => {
        const p = r.path as string | undefined
        const check = r.check as { pass?: boolean; skipped?: boolean } | undefined
        const pf = r.postflight as { ok?: boolean; slides?: number } | undefined
        const verdict = check?.skipped === true ? '未质检' : '质检已绑定'
        const pfNote = pf?.ok === true ? `，postflight ${pf.slides} 页` : ''
        const pdf = r.pdf as { path?: string } | undefined
        return `已导出 ${p ?? ''}${pdf?.path ? ` 与 ${pdf.path}` : ''}（${verdict}${pfNote}）`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const dir = args.dir as string
        const out = args.out as string

        const pdf = typeof args.pdf === 'string' ? args.pdf : undefined
        const rel = await releaseProject(cwd, dir, { out, pdf, skipCheck: args.skipCheck === true })

        return {
          ok: true,
          path: rel.out,
          ...(rel.pdf ? { pdf: rel.pdf } : {}),
          revision: rel.revision,
          bytes: rel.bytes.byteLength,
          sha256: rel.sha256,
          fontsUsed: rel.fontsUsed,
          warnings: rel.buildWarnings,
          fontEmbed: rel.fontEmbed
            ? {
                mode: rel.fontEmbed.mode,
                facesEmbedded: rel.fontEmbed.facesEmbedded,
                facesEmbeddedCount: rel.fontEmbed.facesEmbedded.length,
                skipped: rel.fontEmbed.skipped,
                skippedCount: rel.fontEmbed.skipped.length,
                rawBytes: rel.fontEmbed.rawBytes,
                finalBytes: rel.fontEmbed.finalBytes,
                subset: rel.fontEmbed.subset,
                warnings: rel.fontEmbed.warnings
              }
            : { mode: 'off' as const, facesEmbedded: [], facesEmbeddedCount: 0, skipped: [], skippedCount: 0, rawBytes: rel.bytes.byteLength, finalBytes: rel.bytes.byteLength, warnings: [] },
          postflight: rel.postflight,
          check: rel.check
        }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}

/** 供面板路由复用：computeProjectFingerprint 的稳定再出口。 */
export { computeProjectFingerprint }
