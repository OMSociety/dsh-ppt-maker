/**
 * ppt_check — rule-layer quality review: text overflow,
 * out-of-canvas, overlap, contrast, structural sanity, missing fonts.
 *
 * `ai: true` adds the on-demand AI visual pass: screenshots are the
 * libreoffice-kit renders of the FINAL pptx, shipped through
 * ctx.attachments.saveImages → ctx.llm.stream on the session's own route
 * (requestHeader().config). Routes without image input degrade to "PNG paths
 * + layout digest for the main model's own read_image". AI findings are
 * advisory only — they never block; rule-layer blockers do.
 */
import { checkProject } from '../core/export-pipeline.js'
import { writeQaReport } from '../core/project/store.js'
import { sessionIdOf, renderSummary, resultSchema, resolveSessionCwd, toolError, type PluginToolCtx } from './shared.js'

export function registerCheckTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_check',
    description:
      '对工程跑规则质检：文字溢出 / 出界 / 重叠 / 对比度 / 结构健全 / 缺字体。' +
      '返回 { ok, pass, issues:[{page,severity,category,elementId,description,suggestion}] }；blocker 会阻断 ppt_export。' +
      '传 ai: true 追加 AI 视觉质检（最终渲染页截图送当前路由模型，只出建议不阻断；路由不支持图像时降级为 PNG 路径清单，由你自行 read_image 复核）。',
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
        ai: { type: 'boolean', description: '附加 AI 视觉质检（默认 false；只出建议不阻断）' }
      }
    },
    output: {
      schema: resultSchema({
        pass: { type: 'boolean' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
            properties: {
              page: { type: 'integer' },
              severity: { type: 'string' },
              category: { type: 'string' },
              elementId: { type: 'string' },
              description: { type: 'string' },
              suggestion: { type: 'string' }
            }
          }
        },
        ai: { type: 'object', additionalProperties: true }
      }),
      render: renderSummary((r) => {
        const issues = (r.issues as Array<{ severity?: string }> | undefined) ?? []
        const blockers = issues.filter((i) => i.severity === 'blocker').length
        const ai = r.ai as { performed?: boolean } | undefined
        const aiNote = ai === undefined ? '' : ai.performed === true ? '，AI 已审' : '，AI 降级'
        return `质检：${r.pass === true ? '通过' : `${blockers} 个阻断`}（共 ${issues.length} 条${aiNote}）`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const dir = args.dir as string
        const ai = args.ai === true

        const result = await checkProject(cwd, dir, {
          pages: args.pages as number[] | undefined,
          withMissingFonts: true,
          ...(ai
            ? {
                ai: {
                  cwd,
                  deps: {
                    llm: ctx.llm,
                    attachments: ctx.attachments,
                    sessions: ctx.sessions,
                    sessionId: sessionIdOf(exec)
                  }
                }
              }
            : {})
        })

        // 质检落账（best-effort）：报告随 revision 可追溯，落账失败不反噬质检结论。
        try {
          const blockers = result.issues.filter((i) => i.severity === 'blocker').length
          await writeQaReport(cwd, dir, {
            tool: 'ppt_check',
            pass: result.pass,
            issueCount: result.issues.length,
            blockerCount: blockers,
            issues: result.issues,
            pages: (args.pages as number[] | undefined) ?? null,
            ai: ai ? (result.ai ?? null) : null
          })
        } catch {
          /* 落账是副产物：manifest 写不动时质检结果仍然有效 */
        }

        return { ok: true, ...result }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
