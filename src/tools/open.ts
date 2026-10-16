/**
 * ppt_open — ask the workbench panel to open an existing PPTD project.
 *
 * This tool does not read or write the project itself; it only writes a
 * per-session openRequest via the host plugin's backchannel. The panel's 3 s
 * poll on /ppt-maker/api/state picks the request up, focuses the right
 * session, and opens the tab.
 *
 * Frozen contract:
 *  - cwd resolution: `sessions.get(sessionId).header.cwd`; missing is an
 *    error, no process.cwd() fallback.
 *  - `path` must resolve inside cwd to an existing PPTD project
 *    (manifest.json present, unreadable → ProjectNotFound 404).
 */
import path from 'node:path'
import { access, readFile } from 'node:fs/promises'
import { ProjectError, resolveProjectDir } from '../core/project/store.js'
import { renderSummary, resultSchema, resolveSessionCwd, sessionIdOf, toolError, type PluginToolCtx } from './shared.js'

/**
 * Backchannel injected by the host plugin. Mirrors plugin/host/store.mjs:
 *   - registerProject(sessionId, cwd, dir): idempotent, returns {key, dir};
 *   - requestOpen(sessionId, key): stamps an open request (TTL 60 s).
 */
export interface PptMakerHostBridge {
  registerProject(sessionId: string, cwd: string, dir: string): { key: string; dir: string }
  requestOpen(sessionId: string, key: string): void
}

export interface PluginToolCtxWithOpen extends PluginToolCtx {
  pptMaker?: PptMakerHostBridge
}

async function ensureProjectDir(cwd: string, dir: string): Promise<string> {
  const abs = resolveProjectDir(cwd, dir)
  try {
    await access(path.join(abs, 'manifest.json'))
    const raw = await readFile(path.join(abs, 'manifest.json'), 'utf8')
    const parsed = JSON.parse(raw) as { revision?: unknown }
    if (typeof parsed?.revision !== 'number') throw new Error('revision 缺失')
  } catch (err) {
    throw new ProjectError('ProjectNotFound', `目标不是可打开的 PPTD 工程（manifest.json 读不出来）：${abs}`, {
      status: 404,
      detail: err instanceof Error ? err.message : String(err)
    })
  }
  return abs
}

export function registerOpenTool(ctx: PluginToolCtxWithOpen): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_open',
    description:
      '把工作台（右侧栏）打开到指定的 PPTD 工程目录。' +
      '只在面板活跃的会话里通过轮询生效；不修改工程文件。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir'],
      properties: {
        dir: { type: 'string', minLength: 1, description: '工程目录，相对会话 cwd' }
      }
    },
    output: {
      schema: resultSchema({
        dir: { type: 'string' },
        requested: { type: 'boolean' }
      }),
      render: renderSummary((r) => `已请求打开 ${String(r.dir ?? '')}`)
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const sessionId = sessionIdOf(exec)
        if (!sessionId) {
          throw new ProjectError('SessionMissing', '执行上下文缺少 agent.session.id', { status: 400 })
        }
        const dir = String(args.dir ?? '')
        const abs = await ensureProjectDir(cwd, dir)
        const rel = path.relative(cwd, abs).replace(/\\/g, '/')
        const bridge = ctx.pptMaker
        if (bridge && typeof bridge.registerProject === 'function' && typeof bridge.requestOpen === 'function') {
          const { key } = bridge.registerProject(sessionId, cwd, rel)
          bridge.requestOpen(sessionId, key)
          return { ok: true, dir: rel, requested: true }
        }
        // No host bridge (headless caller / tests): still answer with the
        // resolved path so callers can surface it however they like.
        return { ok: true, dir: rel, requested: false }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
