/**
 * ppt_create — create an empty PPTD v3 project under the session cwd.
 *
 * Frozen result shape (plan §2): `{ ok, manifest }` with
 * `manifest.revision === 0`.
 */
import { createProject, DEFAULT_SIZE } from '../core/project/store.js'
import { renderSummary, resultSchema, resolveSessionCwd, sessionIdOf, toolError, type PluginToolCtx } from './shared.js'

export function registerCreateTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_create',
    description:
      '创建 PPTD v3 演示文稿工程：在会话工作目录下生成 <dir>/deck.pptd、manifest.json（revision: 0）、pages/、media/ 与 .history/ 锚点快照。' +
      '返回 { ok, manifest }；后续编辑把 manifest.revision 作为 ppt_edit 的 baseRevision。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir'],
      properties: {
        dir: { type: 'string', minLength: 1, description: '工程目录（相对于会话 cwd）' },
        title: { type: 'string', description: '演示文稿标题' },
        size: {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
          description: `[宽, 高]（px），默认 [${DEFAULT_SIZE[0]}, ${DEFAULT_SIZE[1]}]（16:9）`
        },
        designSystem: { type: 'string', description: '设计系统族（ppt_themes 可查），记录进 manifest' },
        theme: { type: 'string', description: '主题 id（design_system/<族>/<主题>），记录进 manifest' }
      }
    },
    output: {
      schema: resultSchema({
        manifest: { type: 'object', additionalProperties: true, properties: { revision: { type: 'integer' } } }
      }),
      render: renderSummary((r) => `已创建工程：${(r.manifest as { revision?: number })?.revision === 0 ? 'revision 0' : ''}（ppt_edit 开始编辑）`)
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const size = args.size as [number, number] | undefined
        const { manifest } = await createProject(cwd, {
          dir: args.dir as string,
          title: args.title as string | undefined,
          size,
          designSystem: (args.designSystem as string | undefined) ?? null,
          theme: (args.theme as string | undefined) ?? null,
          sessionId: sessionIdOf(exec)
        })
        return { ok: true, manifest }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
