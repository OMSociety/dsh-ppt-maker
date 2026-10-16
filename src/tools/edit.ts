/**
 * ppt_edit — apply one atomic ops[] batch with an optimistic lock.
 *
 * Frozen contract (plan §2):
 *  - ops[] vocabulary: add_page / remove_page / move_page / update_page /
 *    page_duplicate / add_element / update_element / remove_element, plus the
 *    aliases page_add / page_delete.
 *  - baseRevision mismatch → `{ ok: false, error: { code: 'RevisionMismatch',
 *    status: 409 } }`.
 *  - returns `{ ok, revision, appliedOps, warnings }`.
 */
import { editProject, OP_NAMES, type OpRecord } from '../core/project/store.js'
import { renderSummary, resultSchema, resolveSessionCwd, sessionIdOf, toolError, type PluginToolCtx } from './shared.js'

export function registerEditTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_edit',
    description:
      '对 PPTD 工程应用一组编辑 op（原子批量：任一 op 失败整批不落盘）。' +
      'op 词表（冻结）：add_page / remove_page / move_page / update_page / page_duplicate / add_element / update_element / remove_element' +
      '（别名 page_add=add_page、page_delete=remove_page）。' +
      '带 baseRevision 做乐观锁：与 manifest.revision 不一致返回 409 RevisionMismatch。' +
      '返回 { ok, revision, appliedOps, warnings }。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir', 'ops'],
      properties: {
        dir: { type: 'string', minLength: 1 },
        ops: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['op'],
            properties: { op: { type: 'string', enum: [...OP_NAMES] } },
            additionalProperties: true
          }
        },
        baseRevision: {
          type: 'integer',
          minimum: 0,
          description: '乐观锁基线修订号；与当前 manifest.revision 不一致时整批拒绝（409）'
        }
      }
    },
    output: {
      schema: resultSchema({
        revision: { type: 'integer' },
        appliedOps: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        merged: { type: 'boolean' }
      }),
      render: renderSummary((r) => {
        const applied = (r.appliedOps as string[] | undefined)?.length ?? 0
        return `已应用 ${applied} 个 op，revision → ${String(r.revision)}${r.merged === true ? '（合并窗口内，修订号保持）' : ''}`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const result = await editProject(cwd, {
          dir: args.dir as string,
          ops: args.ops as OpRecord[],
          baseRevision: args.baseRevision as number | undefined,
          sessionId: sessionIdOf(exec)
        })
        return { ok: true, revision: result.revision, appliedOps: result.appliedOps, warnings: result.warnings, merged: result.merged }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
