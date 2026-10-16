/**
 * Cordis host plugin for dsh-ppt-maker.
 *
 * Two jobs:
 *  1. Register the bundled `skills/ppt-maker` directory as a DSH skill so the
 *     model can load it (DSH never discovers skill files shipped inside a
 *     package on its own).
 *  2. Register the eleven project tools（ppt_create / ppt_themes / ppt_edit /
 *     ppt_undo / ppt_redo / ppt_render / ppt_export / ppt_check /
 *     ppt_import / ppt_open / ppt_patch；raw JSON-Schema via ctx.tools.register）——
 *     经 src/lazy-tools.ts 懒展开：技能被 invoke 前工具不进会话工具表。
 *
 * `inject = ['tools', 'sessions', 'skills', 'webServer']`——只声明插件装载
 * 上下文里**保证存在**的服务（与 dsh-fishpai / 官方工具包同一口径）。
 * `llm` / `attachments`（ppt_check 的 opt-in AI 视觉质检用）**不得进 inject**：
 * Cordis 对注入但缺席的服务会把 apply() 无限期挂起且全程静默——实测症状是
 * 技能注册成功（目录里看得见）而全部 ppt_* 工具与 webServer 路由凭空消失。
 * 二者改在调用时经 `ctx.get()` 懒取（dsh-config-manager 同款纪律：
 * never injected → never blocks the fiber），缺席时 ai.ts 显式降级。
 * the tools need `sessions` to resolve the session cwd
 * (`exec.agent.session.id` → `sessions.get(id).header.cwd`); there is
 * deliberately no process.cwd() fallback.
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
  listProjectHistory,
  projectUndoState,
  readHistorySnapshot,
  redoProject,
  restoreProject,
  undoProject,
  writeExportReport
} from './core/project/store.js'
import { armLazyTools } from './lazy-tools.js'
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
export const inject = ['tools', 'sessions', 'skills', 'webServer']
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
  /** Cordis `ctx.get(name)`：懒取 inject 之外的可选服务（llm / attachments）。 */
  get?: (name: string) => unknown
  /** Cordis 事件总线（懒展开用）：tools/result、session/event、session/created。 */
  on?: (event: string, handler: (...args: never[]) => void) => unknown
  /** Cordis `ctx.inject(deps, cb)`：服务到达回调（懒展开扫 sessions 用）。 */
  inject?: (deps: readonly string[], cb: (ctx: ApplyCtx) => void) => unknown
}

/* ------------------------------------------------------------------ *
 * webServer 路由 + 宿主 → 工具 backchannel
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
      projectUndoState: typeof projectUndoState
      listProjectHistory: typeof listProjectHistory
      readHistorySnapshot: typeof readHistorySnapshot
      restoreProject: typeof restoreProject
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
            projectUndoState,
            listProjectHistory,
            readHistorySnapshot,
            restoreProject,
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
    const tools = ctx.tools
    /** 注册全部 11 个 ppt_* 工具，返回合并注销函数。懒展开触发时整组进场。 */
    const registerToolSuite = (): (() => void) => {
      const suiteOffs: Array<() => void> = []
      for (const register of [
        registerCreateTool,
        registerThemesTool,
        registerEditTool,
        registerUndoTool,
        registerRedoTool,
        registerRenderTool,
        registerExportTool,
        registerCheckTool,
        // Reverse / open / patch tools (raw JSON-Schema; ppt_open and the
        // open=true path of ppt_import rely on the optional bridge).
        registerImportTool,
        registerOpenTool,
        registerPatchTool
      ]) {
        try {
          const off = register({
            tools,
            sessions: ctx.sessions,
            // llm / attachments 懒取：它们不在 inject 里（缺席会静默挂死 apply，
            // 见文件头注释），工具每次执行时才经 ctx.get() 现取；缺席由 ai.ts 降级。
            get llm() {
              return ctx.get?.('llm') as ApplyCtx['llm']
            },
            get attachments() {
              return ctx.get?.('attachments') as ApplyCtx['attachments']
            },
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
          if (typeof off === 'function') suiteOffs.push(off)
        } catch (err) {
          ctx.logger?.warn?.(`[dsh-ppt-maker] tool registration failed: ${(err as Error).message}`)
        }
      }
      return () => {
        for (const off of suiteOffs.splice(0)) {
          try {
            off()
          } catch {
            /* teardown must not throw */
          }
        }
      }
    }
    // 懒展开（browser-skill 同款）：常驻的只有技能目录行；模型 invoke "ppt-maker"
    // 技能成功后整组工具才进场。webServer 路由不进懒展开——工作台面板随时要用。
    offs.push(armLazyTools(ctx, registerToolSuite))
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
