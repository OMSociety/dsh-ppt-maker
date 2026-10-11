/**
 * Cordis host plugin for dsh-ppt-maker (renamed from dsh-kimi-ppt, v1.0.0).
 *
 * Two jobs:
 *  1. Register the bundled `skills/ppt-maker` directory as a DSH skill so the
 *     model can load it (DSH never discovers skill files shipped inside a
 *     package on its own).
 *  2. Register the eight project tools: ppt_create / ppt_themes / ppt_edit /
 *     ppt_undo / ppt_redo / ppt_render / ppt_export / ppt_check (raw
 *     JSON-Schema via ctx.tools.register, per the PR 1 plan).
 *
 * `inject = ['tools', 'sessions', 'skills', 'llm', 'attachments']`: the tools
 * need `sessions` to resolve the session cwd (`exec.agent.session.id` →
 * `sessions.get(id).header.cwd`); there is deliberately no process.cwd()
 * fallback. `llm` + `attachments` power the opt-in AI review pass of
 * ppt_check (PR 1 plan §6, added in PR1-C). `webServer` joins in PR 2.
 *
 * Note: Cordis refuses bare service access without declaring it in `inject`,
 * and refuses to run apply() at all when an injected service is missing.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { PACKAGE_ROOT } from './root.js'
import { buildProjectDeck, saveProjectPptx } from './core/export-pipeline.js'
import {
  ProjectError,
  editProject,
  loadProject,
  redoProject,
  undoProject,
  writeExportReport
} from './core/project/store.js'
import { registerCheckTool } from './tools/check.js'
import { registerCreateTool } from './tools/create.js'
import { registerEditTool } from './tools/edit.js'
import { registerExportTool } from './tools/export.js'
import { registerImportTool } from './tools/import.js'
import { registerOpenTool, type PptMakerHostBridge } from './tools/open.js'
import { registerPatchTool } from './tools/patch.js'
import { registerRedoTool } from './tools/redo.js'
import { registerRenderTool } from './tools/render.js'
import { registerThemesTool } from './tools/themes.js'
import { registerUndoTool } from './tools/undo.js'

export const name = 'dsh-ppt-maker'
export const inject = ['tools', 'sessions', 'skills', 'llm', 'attachments', 'webServer']
export { PACKAGE_ROOT }

const SKILL_DIR = path.join(PACKAGE_ROOT, 'skills', 'ppt-maker')
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md')

/** Minimal YAML-frontmatter reader for the skill's own `key: value` block. */
function readSkillFrontmatter(source: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match) return {}
  const out: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (kv) out[kv[1]] = kv[2].trim()
  }
  return out
}

interface SkillsLike {
  register(def: {
    name?: string
    description?: string
    whenToUse?: string
    content: string
    source: string
    resourceBase: { kind: 'directory'; path: string }
  }): unknown
}

interface ApplyCtx {
  skills?: SkillsLike
  tools?: Parameters<typeof registerCreateTool>[0]['tools']
  sessions?: Parameters<typeof registerCreateTool>[0]['sessions']
  llm?: Parameters<typeof registerCheckTool>[0]['llm']
  attachments?: Parameters<typeof registerCheckTool>[0]['attachments']
  webServer?: {
    register(spec: { kind: 'prefix'; path: string; handler: unknown }): () => void
  }
  logger?: { warn?: (message: string) => void }
  effect?: (fn: () => void | (() => void)) => void
}

/* ------------------------------------------------------------------ *
 * webServer 路由 + 宿主 → 工具 backchannel（PR2 §4/§7）
 *
 * The host routes live in `plugin/host/routes.mjs` (plain JS so DSH can run
 * them without a TS loader), but they take their core from this bundle via
 * `deps.core` so they never re-import `lib/index.js`. The bridge below is
 * the other half: it gives `ppt_open` / `ppt_import` a way to mark a project
 * as "please open in the panel" without either half importing the other.
 * ------------------------------------------------------------------ */

interface HostStoreModule {
  registerProject(sessionId: string, cwd: string, dir: string): { key: string; dir: string }
  requestOpen(sessionId: string, key: string): void
}

interface HostRoutesModule {
  API_PREFIX: string
  createApiHandler(deps: {
    resolveCwd(sessionId: string): string | null
    log?: (message: string) => void
    core: {
      loadProject: typeof loadProject
      editProject: typeof editProject
      undoProject: typeof undoProject
      redoProject: typeof redoProject
      buildProjectDeck: typeof buildProjectDeck
      saveProjectPptx: typeof saveProjectPptx
      writeExportReport: typeof writeExportReport
      ProjectError: typeof ProjectError
    }
    sessionStore?: HostStoreModule
  }): (req: unknown, res: unknown) => Promise<void>
}

let hostModulesPromise: Promise<{ routes: HostRoutesModule; store: HostStoreModule }> | null = null

function loadHostModules(): Promise<{ routes: HostRoutesModule; store: HostStoreModule }> {
  if (!hostModulesPromise) {
    const routesUrl = pathToFileURL(path.join(PACKAGE_ROOT, 'plugin', 'host', 'routes.mjs')).href
    const storeUrl = pathToFileURL(path.join(PACKAGE_ROOT, 'plugin', 'host', 'store.mjs')).href
    hostModulesPromise = Promise.all([import(routesUrl), import(storeUrl)]).then(
      ([routes, store]) => ({ routes: routes as HostRoutesModule, store: store as HostStoreModule })
    )
  }
  return hostModulesPromise
}

function buildPptMakerBridge(store: HostStoreModule): PptMakerHostBridge {
  return {
    registerProject(sessionId, cwd, dir) {
      return store.registerProject(sessionId, cwd, dir)
    },
    requestOpen(sessionId, key) {
      store.requestOpen(sessionId, key)
    }
  }
}

function registerRoutes(ctx: ApplyCtx, bridge: PptMakerHostBridge): () => void {
  if (typeof ctx.effect !== 'function') return () => {}
  const disposer = ctx.effect(() => {
    const webServer = ctx.webServer
    if (!webServer || typeof webServer.register !== 'function') {
      ctx.logger?.warn?.('[dsh-ppt-maker] webServer 不可用，右侧栏面板将无法读写工程')
      return undefined
    }
    const sessions = ctx.sessions
    const resolveCwd = (sessionId: string): string | null => {
      if (!sessions || typeof sessions.get !== 'function') return null
      const header = sessions.get(String(sessionId))?.header
      return typeof header?.cwd === 'string' ? header.cwd : null
    }
    let dispose: () => void = () => {}
    let cancelled = false
    void loadHostModules()
      .then(({ routes }) => {
        if (cancelled) return
        const handler = routes.createApiHandler({
          resolveCwd,
          log: (message) => ctx.logger?.warn?.(`[dsh-ppt-maker] ${message}`),
          core: {
            loadProject,
            editProject,
            undoProject,
            redoProject,
            buildProjectDeck,
            saveProjectPptx,
            writeExportReport,
            ProjectError
          }
        })
        dispose = webServer.register({ kind: 'prefix', path: routes.API_PREFIX, handler })
      })
      .catch((err: unknown) => {
        ctx.logger?.warn?.(`[dsh-ppt-maker] webServer 路由注册失败: ${(err as Error).message}`)
      })
    return () => {
      cancelled = true
      dispose()
    }
  })
  void bridge
  return typeof disposer === 'function' ? (disposer as () => void) : () => {}
}

function registerSkill(ctx: ApplyCtx): () => void {
  if (!ctx.skills || !existsSync(SKILL_FILE)) return () => {}
  try {
    const source = readFileSync(SKILL_FILE, 'utf8')
    const frontmatter = readSkillFrontmatter(source)
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    const off = ctx.skills.register({
      name: frontmatter.name,
      description: frontmatter.description,
      ...(frontmatter.whenToUse !== undefined ? { whenToUse: frontmatter.whenToUse } : {}),
      content: body.trim(),
      // `register()` fills `provider` but not `source`, and the registry's load
      // path (SkillRegistry.get → validateDefinition) requires both to be
      // strings — without `source` the skill catalogs fine and then throws on
      // first load.
      source: 'bundled',
      resourceBase: { kind: 'directory', path: SKILL_DIR }
    })
    return typeof off === 'function' ? (off as () => void) : () => {}
  } catch (err) {
    ctx.logger?.warn?.(`[dsh-ppt-maker] could not register the skill: ${(err as Error).message}`)
    return () => {}
  }
}

export function apply(ctx: ApplyCtx): void {
  const offs: Array<() => void> = [registerSkill(ctx)]

  // The routes module is plain JS under plugin/host; the bridge needs the
  // shared per-session store it owns, so we resolve the module before
  // building the bridge and hand the bridge to the tool registrations below.
  let cachedBridge: PptMakerHostBridge | undefined
  const resolveBridge = (): PptMakerHostBridge | undefined => cachedBridge

  if (ctx.tools) {
    for (const register of [
      registerCreateTool,
      registerThemesTool,
      registerEditTool,
      registerUndoTool,
      registerRedoTool,
      registerRenderTool,
      registerExportTool,
      registerCheckTool,
      // PR 2 tools (raw JSON-Schema; rely on the optional bridge for ppt_open /
      // the open=true path of ppt_import).
      registerImportTool,
      registerOpenTool,
      registerPatchTool
    ]) {
      try {
        const off = register({
          tools: ctx.tools,
          sessions: ctx.sessions,
          llm: ctx.llm,
          attachments: ctx.attachments,
          pptMaker: undefined,
          // Lazy getter: the bridge is filled in once the host-store module
          // finishes loading (microtask after apply). Tool calls always come
          // after apply, so by the time execute runs the bridge is present.
          ...(register === registerImportTool || register === registerOpenTool
            ? {
                get pptMaker() {
                  return resolveBridge()
                }
              }
            : {})
        })
        if (typeof off === 'function') offs.push(off)
      } catch (err) {
        ctx.logger?.warn?.(`[dsh-ppt-maker] tool registration failed: ${(err as Error).message}`)
      }
    }
  }

  // webServer 路由在 apply 之后再起：先把 store/bridge 装配好，再让 handler
  // 见到它们。effect 本身就是 cordis 的清理通道。
  const effectOff = registerRoutes(
    ctx,
    new Proxy(
      {},
      {
        get(_t, prop) {
          const bridge = resolveBridge()
          if (!bridge) return undefined
          return bridge[prop as keyof PptMakerHostBridge]
        }
      }
    ) as PptMakerHostBridge
  )
  if (typeof effectOff === 'function') offs.push(effectOff as () => void)

  // Eagerly warm the module load so bridge is ready before the first tool call.
  void loadHostModules()
    .then(({ store }) => {
      cachedBridge = buildPptMakerBridge(store)
    })
    .catch((err: unknown) => {
      ctx.logger?.warn?.(`[dsh-ppt-maker] host store 装载失败: ${(err as Error).message}`)
    })

  ctx.effect?.(() => () => {
    for (const off of offs.splice(0)) {
      try {
        off()
      } catch {
        /* teardown must not throw */
      }
    }
  })
}
