/**
 * 工具组懒展开（progressive disclosure）——照 @wxg-prc-cpg/browser-skill-dsh-plugin
 * 的 lazyTools 机制落地，只用宿主公开 seam，不碰私有 API：
 *
 * 常驻成本只有技能目录里的一行 name+description；当模型调 `skill` 工具
 * invoke 了 "ppt-maker"（工具结果 isError===false），才把 11 个 ppt_* 工具
 * 经 ctx.tools.register 注册进场——此后新组装的轮次/会话的工具表即包含它们。
 *
 * 三个进场通道（任一命中即展开，幂等）：
 *  1. `tools/result` 事件：本会话刚刚成功 invoke 了 ppt-maker 技能；
 *  2. `session/event` 流：逐事件折叠（SkillInvocationState），识别历史里的
 *     skill-invocation 用户消息与 tool/call→tool/result 成对（断线重放场景）；
 *  3. `session/created` + 启动时全量扫描：老会话恢复（resume）时已 invoke 过
 *     技能的，新会话直接带工具出生。
 *
 * 注册失败不吞：revealPending 置位，下个 turn/start 或技能消息到达时重试。
 * 返回的 disposer 连监听器带已注册的工具组一起拆。
 */

/** 触发展开的技能名（与 skills/ppt-maker/SKILL.md frontmatter 一致）。 */
export const LAZY_SKILL_NAME = 'ppt-maker'

interface LazyCtx {
  on?: (event: string, handler: (...args: never[]) => void) => (() => void) | unknown
  get?: (name: string) => unknown
  inject?: (deps: readonly string[], cb: (ctx: LazyCtx) => void) => { dispose(): void } | unknown
  logger?: { warn?: (message: string) => void }
}

interface SessionLike {
  snapshotEvents?: () => readonly unknown[]
  events?: readonly unknown[]
}

interface SessionsServiceLike {
  list?: () => readonly SessionLike[]
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

function isCallId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/** 解析可能是对象也可能是原始 JSON 串的工具参数。 */
export function skillNameOf(args: unknown): string | undefined {
  if (typeof args === 'string') {
    try {
      return skillNameOf(JSON.parse(args))
    } catch {
      return undefined
    }
  }
  const obj = record(args)
  if (obj && 'name' in obj) {
    return typeof obj.name === 'string' ? (obj.name as string) : undefined
  }
  return undefined
}

/** user/message 事件 data 是否是「成功 invoke 了目标技能」的消息。 */
function isSkillInvocationMessage(data: unknown): boolean {
  const source = record(record(data)?.source)
  return source?.kind === 'skill-invocation' && source?.name === LAZY_SKILL_NAME
}

/** 同时接受现行 DSH 消息形态与旧的扁平 tool-result 形态。 */
function toolResultOf(data: unknown): { callId: string; isError: boolean } | undefined {
  const message = record(record(data)?.message)
  if (message === undefined) return undefined
  const source = record(message.source)
  if (source?.kind === 'tool') {
    if (message.role === 'tool' && 'toolCallId' in message) {
      if (isCallId(source.callId) && message.toolCallId === source.callId && typeof message.isError === 'boolean') {
        return { callId: source.callId, isError: message.isError }
      }
      return undefined
    }
    const blocks = message.content
    const block = Array.isArray(blocks) && blocks.length === 1 ? record(blocks[0]) : undefined
    if (isCallId(source.callId) && block?.type === 'tool-result' && block.toolCallId === source.callId && typeof block.isError === 'boolean') {
      return { callId: source.callId, isError: block.isError as boolean }
    }
    return undefined
  }
  if (isCallId(message.callId) && typeof message.isError === 'boolean') {
    return { callId: message.callId, isError: message.isError }
  }
  return undefined
}

/** 单个会话的只追加历史折叠：只留未结算的 skill 调用。 */
class SkillInvocationState {
  successful = false
  private pending = new Set<string>()

  consume(event: unknown): void {
    if (this.successful) return
    const ev = record(event)
    if (ev?.type === 'user/message' && isSkillInvocationMessage(ev.data)) {
      this.successful = true
    } else if (ev?.type === 'tool/call') {
      const data = record(ev.data)
      if (data?.name === 'skill' && skillNameOf(data.arguments) === LAZY_SKILL_NAME && isCallId(data.callId)) {
        this.pending.add(data.callId)
      }
    } else if (ev?.type === 'tool/result') {
      const result = toolResultOf(ev?.data)
      if (result !== undefined && this.pending.delete(result.callId)) {
        this.successful = !result.isError
      }
    }
    if (this.successful) this.pending.clear()
  }
}

/**
 * 挂起懒展开。返回 disposer：拆监听器，并在已展开时连工具组一起注销。
 * @param registerSuite 注册全部 ppt_* 工具，返回合并注销函数。
 */
export function armLazyTools(ctx: LazyCtx, registerSuite: () => () => void): () => void {
  let disposed = false
  let revealPending = false
  let sessionStates = new WeakMap<SessionLike, SkillInvocationState>()
  let suiteDisposer: (() => void) | undefined
  const disposers: Array<() => void> = []
  const log = (msg: string) => ctx.logger?.warn?.(msg)

  const ensureSuite = () => {
    if (disposed || suiteDisposer !== undefined) return
    try {
      suiteDisposer = registerSuite()
      revealPending = false
      sessionStates = new WeakMap()
    } catch (error) {
      suiteDisposer = undefined
      revealPending = true
      log(`[dsh-ppt-maker] 懒展开注册失败：${(error as Error).message}（下个轮次重试）`)
    }
  }

  const stateFor = (session: SessionLike): SkillInvocationState | undefined => {
    const known = sessionStates.get(session)
    if (known !== undefined) return known
    try {
      const state = new SkillInvocationState()
      const history = typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : session.events
      if (history === undefined) return undefined
      for (const event of history) {
        state.consume(event)
        if (state.successful) break
      }
      sessionStates.set(session, state)
      return state
    } catch {
      return undefined
    }
  }

  const scanSession = (session: SessionLike) => {
    if (disposed || suiteDisposer !== undefined) return
    if (revealPending || stateFor(session)?.successful) ensureSuite()
  }

  if (typeof ctx.on === 'function') {
    const onToolResult = (exec: unknown, result: unknown) => {
      const r = record(result)
      if (r?.isError !== false) return
      const e = record(exec)
      if (e?.name !== 'skill') return
      if (skillNameOf(e.arguments) === LAZY_SKILL_NAME) ensureSuite()
    }
    disposers.push(ctx.on('tools/result', onToolResult as never) as () => void)

    const onSessionEvent = (session: SessionLike | null, event: unknown) => {
      if (disposed || suiteDisposer !== undefined) return
      const ev = record(event)
      if ((revealPending && ev?.type === 'turn/start') || (ev?.type === 'user/message' && isSkillInvocationMessage(ev.data))) {
        ensureSuite()
        return
      }
      if (session == null || event == null) return
      const state = stateFor(session)
      state?.consume(event)
      if (state?.successful && !revealPending) ensureSuite()
    }
    disposers.push(ctx.on('session/event', onSessionEvent as never) as () => void)
    disposers.push(ctx.on('session/created', ((session: SessionLike) => scanSession(session)) as never) as () => void)
  }

  const scanExisting = (context: LazyCtx) => {
    if (disposed || suiteDisposer !== undefined) return
    if (revealPending) {
      ensureSuite()
      return
    }
    try {
      const sessions = context.get?.('sessions') as SessionsServiceLike | undefined
      if (sessions != null && typeof sessions.list === 'function') {
        for (const session of sessions.list()) {
          scanSession(session)
          if (revealPending || suiteDisposer !== undefined) break
        }
      }
    } catch {
      /* sessions 服务形态不符就等事件通道 */
    }
  }
  scanExisting(ctx)
  if (typeof ctx.inject === 'function') {
    const watcher = ctx.inject(['sessions'], scanExisting)
    const dispose = record(watcher)?.dispose
    if (typeof dispose === 'function') disposers.push(() => (dispose as () => void).call(watcher))
  }

  return () => {
    if (disposed) return
    disposed = true
    for (const dispose of disposers.splice(0)) {
      try {
        dispose()
      } catch {
        /* teardown 不抛 */
      }
    }
    suiteDisposer?.()
    sessionStates = new WeakMap()
  }
}
