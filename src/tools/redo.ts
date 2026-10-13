/**
 * ppt_redo — move the revision cursor forwards (`{ ok, revision, redoneOps }`).
 */
import { redoProject } from '../core/project/store.js'
import { renderSummary, resultSchema, resolveSessionCwd, toolError, type PluginToolCtx } from './shared.js'

export function registerRedoTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_redo',
    description:
      '重做：undo 之后沿 history 日志向回放到更新的修订（新编辑会剪掉被放弃的分支，之后无可重做）。' +
      '返回 { ok, revision, redoneOps, warnings }。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir'],
      properties: {
        dir: { type: 'string', minLength: 1 },
        steps: { type: 'integer', minimum: 1, maximum: 20, description: '重做步数（1–20，默认 1）' }
      }
    },
    output: {
      schema: resultSchema({
        revision: { type: 'integer' },
        redoneOps: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } }
      }),
      render: renderSummary((r) => `已重做到 revision ${String(r.revision)}（${(r.redoneOps as string[] | undefined)?.length ?? 0} 个 op）`)
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const result = await redoProject(cwd, args.dir as string, (args.steps as number | undefined) ?? 1)
        return { ok: true, revision: result.revision, redoneOps: result.undoneOps, warnings: result.warnings }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
