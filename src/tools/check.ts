/**
 * ppt_check — rule-layer quality review (PR 1 plan §6): text overflow,
 * out-of-canvas, overlap, contrast, structural sanity, missing fonts.
 * `ai: true` is a PR 1-B stretch that requires the llm/attachments channel —
 * declared in the schema but returns an explicit Unsupported notice for now.
 */
import { checkProject } from '../core/export-pipeline.js'
import { renderSummary, resolveSessionCwd, toolError, type PluginToolCtx } from './shared.js'

export function registerCheckTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_check',
    description:
      '对工程跑规则质检：文字溢出 / 出界 / 重叠 / 对比度 / 结构健全 / 缺字体。' +
      '返回 { ok, pass, issues:[{page,severity,category,elementId,description,suggestion}] }；blocker 会阻断 ppt_export。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir'],
      properties: {
        dir: { type: 'string', minLength: 1, description: '工程目录（相对于会话 cwd）' },
        pages: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
          description: '只检查这些页（1 起）；默认全部'
        },
        ai: { type: 'boolean', description: '附加 AI 视觉质检（默认 false）' }
      }
    },
    output: {
      render: renderSummary((r) => {
        const issues = (r.issues as Array<{ severity?: string }> | undefined) ?? []
        const blockers = issues.filter((i) => i.severity === 'blocker').length
        return `质检：${r.pass === true ? '通过' : `${blockers} 个阻断`}（共 ${issues.length} 条）`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const dir = args.dir as string
        const ai = args.ai === true

        const result = await checkProject(cwd, dir, {
          pages: args.pages as number[] | undefined,
          withMissingFonts: true
        })

        if (ai) {
          // PR 1 plan §6: the llm/attachments channel is proven but lands with
          // the AI layer spike; until then, say so explicitly instead of
          // silently returning rule-only results.
          return {
            ok: true,
            ...result,
            ai: {
              requested: true,
              performed: false,
              reason: 'AI 质检层（llm/attachments 通路）按 PR1 计划属 spike 先行项，本版未启用'
            }
          }
        }

        return { ok: true, ...result }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
