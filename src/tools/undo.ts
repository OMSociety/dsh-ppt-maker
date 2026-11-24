/**
 * ppt_undo — move the revision cursor backwards (`{ ok, revision, undoneOps }`).
 */
import { undoProject } from '../core/project/store.js'
import { requireBaseRevision, renderSummary, resultSchema, resolveSessionCwd, toolError, type PluginToolCtx } from './shared.js'

export function registerUndoTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_undo',
    description:
      '撤销：把工程恢复到 history 日志中更早的修订（manifest.historyCursor 为游标；快照 append-only，第 0 号锚点永不驱逐）。' +
      '返回 { ok, revision, undoneOps, warnings }；恢复时校验 media 哈希，缺失/被改的素材进 warnings。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir', 'baseRevision'],
      properties: {
        dir: { type: 'string', minLength: 1 },
        baseRevision: { type: 'integer', minimum: 0, description: '必填乐观锁基线修订号；与当前 manifest.revision 不一致返回 409' },
        steps: { type: 'integer', minimum: 1, maximum: 20, description: '撤销步数（1–20，默认 1）' }
      }
    },
    output: {
      schema: resultSchema({
        revision: { type: 'integer' },
        undoneOps: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } }
      }),
      render: renderSummary((r) => `撤销结果：编辑版本 ${String(r.revision)}（${(r.undoneOps as string[] | undefined)?.length ?? 0} 个 op）`)
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const result = await undoProject(cwd, args.dir as string, (args.steps as number | undefined) ?? 1, {
          baseRevision: requireBaseRevision(args, '撤销')
        })
        return { ok: true, revision: result.revision, undoneOps: result.undoneOps, warnings: result.warnings }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
