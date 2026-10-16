/**
 * 客户端入口：把 PPT 工作台挂到 **官方右侧栏**（`sidebarRightTabs` + `sidebar.right.pane.tab`）。
 *
 * 轮询（3s）承担「宿主 → 浏览器」的唯一推送：
 *   - `openRequest` 出现 → 自动打开/展开面板（模型调 ppt_import / ppt_open 后用户立刻看到）
 *   - `active.revision` 变了 → 通知面板（干净就静默重载，有草稿只亮「外部已修改」）
 *
 * 读完 DSH 宿主源码后的正确姿势照抄自 `dsh-fishpai/client/index.tsx`（同为右侧栏面板）。
 * 两个关键事实：
 *   1. `ctx.inject(deps, cb)` 回调**不是同步执行**的（cordis 在 Fiber._reload 里先
 *      `await Promise.resolve()` 再跑 apply），「注册完同步回头检查」这类判断必然落空；
 *   2. 「界面上当前的会话」在 0.1.7 多会话形态里由**右侧栏座位的挂载态**公开
 *      （`ISidebarRight.mounted`），读不到就不能猜（猜错会把别的会话的 openRequest 算到当前头上）。
 */
import * as React from 'react'
import { SkeletonPanel, Title } from './panel'
import { createPptStore, type PptStore } from './store'
import { ensureStyles } from './styles'
import { PptMark } from './icons'
import { api } from './api'

export const name = 'dsh-ppt-maker'

/**
 * 客户端硬依赖：槽位系统（注册面板）与会话服务（拿当前会话）。
 * 右侧栏本身走 `ctx.inject` 的延迟注入——它缺席时面板槽位只是不注册，**不拖垮插件**。
 */
export const inject = ['slots', 'sessions']

const TAB_ID = 'dsh-ppt-maker'
const TAB_KIND = 'ppt'
const POLL_MS = 3000

function pick(injected: any, key: string): any {
  if (!injected) return undefined
  try {
    if (typeof injected.get === 'function') {
      const value = injected.get(key)
      if (value !== undefined) return value
    }
  } catch {
    /* 未声明该服务时 get 会抛，退回属性访问 */
  }
  return injected[key]
}

/** 服务只能通过 ctx.get 读（直接 ctx.xxx 访问未声明的服务会抛）。 */
function service(ctx: any, key: string): any {
  try {
    return typeof ctx.get === 'function' ? ctx.get(key) : undefined
  } catch {
    return undefined
  }
}

/**
 * 「界面上当前选中的会话」，两代宿主各有一条读法，全都拿不到时退到「只有一个会话」：
 *   - 旧线：选中态挂在会话列表快照上（`list.getSnapshot().current`）；
 *   - 0.1.7 起：列表快照不再携带选中态，屏幕上那个会话由右侧栏座位的挂载态公开
 *     （`ISidebarRight.mounted`），所以走注入回调捕获的读取函数。
 * 返回 null 就让轮询这一轮空转，下一轮再试——**绝不瞎猜会话**。
 */
function currentSessionId(ctx: any, readMounted?: () => string | null): string | null {
  try {
    const sessions = service(ctx, 'sessions')
    const snapshot = sessions?.list?.getSnapshot?.()
    if (snapshot?.current) return snapshot.current
    const mounted = readMounted?.() || null
    if (mounted) return mounted
    if (Array.isArray(snapshot?.ids) && snapshot.ids.length === 1) return snapshot.ids[0]
    return null
  } catch {
    return null
  }
}

export function apply(ctx: any): void {
  const stores = new Map<string, PptStore>()
  const disposeStyles = ensureStyles()
  ctx.effect(() => () => disposeStyles(), 'ppt-maker: 面板样式')

  // 右侧栏座位的挂载会话读取函数，由通道一的注入回调捕获（0.1.7 线读当前会话就靠它）。
  let getMountedSession: (() => string | null) | null = null
  const readMounted = (): string | null => {
    try {
      return getMountedSession ? getMountedSession() : null
    } catch {
      return null
    }
  }

  const storeFor = (sessionId: string): PptStore => {
    let store = stores.get(sessionId)
    if (!store) {
      store = createPptStore(sessionId)
      stores.set(sessionId, store)
    }
    return store
  }

  /**
   * 面板组件：per-session 取同一个 store，保证开关面板不丢编辑状态。
   * 槽位没给 sessionId 时退回「界面上当前选中的会话」：这不只是兜底——
   * 右侧栏本身就是 per-session 的（rightbar.session 按当前会话挂载），
   * 所以「当前会话」与「这个面板所属会话」在实际产品里是同一个。
   */
  function PanelHost(props: any) {
    const sessionId = props?.sessionId || currentSessionId(ctx, readMounted)
    const store = React.useMemo(() => (sessionId ? storeFor(sessionId) : null), [sessionId])
    if (!sessionId || !store) {
      return React.createElement('div', { className: 'ppt-root' }, 'PPT 工作台：拿不到当前会话，请在一个会话里打开。')
    }
    return React.createElement(SkeletonPanel, { store })
  }

  // ── 打开面板（官方右侧栏）──────────────────────────────────
  // 席位是异步到位的，所以这里只保存「官方打开方式」，由 openPanel() 现取。
  let openOfficial: (() => void) | null = null
  const openPanel = () => {
    if (!openOfficial) throw new Error('官方右侧栏尚未就绪')
    openOfficial()
  }

  const openIfRequested = (sessionId: string, key: string) => {
    try {
      openPanel?.()
    } catch (error) {
      console.warn('[dsh-ppt-maker] 打开面板失败，下一次轮询会重试：', error)
      return false
    }
    storeFor(sessionId)
    void api.tabOpened(sessionId, key).catch(() => {})
    return true
  }

  // ── 官方右侧栏席位 ─────────────────────────────────────────
  // 注意 cordis 的 inject 回调是异步的：「注册完同步回头检查」必然落空，所以
  // openOfficial / getMountedSession 都只是保存起来、用时再取。
  let seatHandle: any = null
  try {
    seatHandle = ctx.inject(['sidebarRightTabs', 'sidebarRight'], (injected: any) => {
      const tabs = pick(injected, 'sidebarRightTabs')
      const sidebarRight = pick(injected, 'sidebarRight')

      // 0.1.7 线读「当前会话」：右侧栏座位挂载的会话就是屏幕上那个。
      // 旧版没有这个公开字段，读不到就返回 null、走别的读法。
      // 装在 tab 注册守卫之前：挂载读法与注册无关，裁剪构建（有 mounted、没有席位注册）也要能读。
      getMountedSession = () => {
        try {
          return sidebarRight?.mounted?.getSnapshot?.() || null
        } catch {
          return null
        }
      }
      if (!tabs || typeof tabs.register !== 'function') return

      const disposers: Array<() => void> = []
      disposers.push(
        tabs.register({
          id: TAB_ID,
          kind: TAB_KIND,
          priority: 'extension',
          title: () => 'PPT 工作台',
          guide: [
            {
              // 0.1.7 起 guide 条目契约要求稳定 id（注册时的唯一性检查与渲染 key 都按它走）；
              // 旧版注册处不读这个字段，多了无害。
              id: 'workbench',
              order: 40,
              title: () => 'PPT 工作台',
              description: () => '逆向导入 / 编辑 / 导出 .pptx；所见即所得',
              // 不给 icon 的话，新标签页的引导列表画一个默认的立方体占位。
              icon: PptMark,
            },
          ],
        }),
      )

      const slots = ctx.slots
      if (slots && typeof slots.inject === 'function') {
        disposers.push(
          slots.inject('sidebar.right.pane.tab', () =>
            slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID }, PanelHost),
          ),
        )
        disposers.push(
          slots.inject('sidebar.right.pane.tab.title', () =>
            slots.register({ name: 'sidebar.right.pane.tab.title', key: TAB_ID }, Title),
          ),
        )
      }

      if (sidebarRight && typeof sidebarRight.openTab === 'function') {
        openOfficial = () => sidebarRight.openTab(TAB_KIND)
      }

      const dispose = () => {
        for (const off of disposers.reverse()) {
          try {
            off()
          } catch {
            /* 卸载失败不影响其它席位 */
          }
        }
        openOfficial = null
        getMountedSession = null
      }
      return dispose
    })
  } catch (error) {
    console.warn('[dsh-ppt-maker] 官方右侧栏席位注入失败：', error)
  }

  // ── 轮询：唯一的「宿主 → 页面」推送 ───────────────────────────
  ctx.effect(() => {
    let stopped = false
    let warned = false
    const seenSessions = new Set<string>()
    const tick = async () => {
      if (stopped || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return
      const sessionId = currentSessionId(ctx, readMounted)
      if (!sessionId) return
      try {
        const st = await api.state(sessionId)
        warned = false
        // openRequests（复数数组，宿主 pendingOpenRequests）一来就自动打开。tabOpened 是幂等的
        // （宿主回包不依赖旧状态），即便面板已经开着、或 openTab 本地还没到，也让它每轮把
        // 请求清掉——否则那条 openRequest 会一直挂着，别的会话切过来又弹一次。
        const reqs = Array.isArray(st.openRequests) ? st.openRequests : []
        for (const req of reqs) {
          if (req && req.key) openIfRequested(sessionId, req.key)
        }
        // 面板自己的 init() 已拉过 /state；第一轮 tick 不重复 push 一遍，但第二轮起
        // 通通都进 store（skeleton 的 ProjectList / 空面板都靠 store.projects）。
        // 例外：init() 还没成功（loading=仍在等宿主就绪，error=已失败）时首轮不许跳过——
        // 这一轮成功的 /state 正是恢复信号，applyPoll 会把面板救回 ready/empty。
        const firstPoll = !seenSessions.has(sessionId)
        seenSessions.add(sessionId)
        const store = stores.get(sessionId)
        if (store) {
          const status = store.getSnapshot().status
          if (firstPoll && (status === 'ready' || status === 'empty')) return
          await store.actions.applyPoll(st)
        }
      } catch (error) {
        // 宿主刚起来时路由可能还没注册：每个「未就绪期」只报一次，别每 3 秒刷屏
        if (!warned) {
          warned = true
          console.warn('[dsh-ppt-maker] 轮询失败（宿主路由可能尚未就绪）：', error)
        }
      }
    }
    const timer = setInterval(() => void tick(), POLL_MS)
    void tick()
    return async () => {
      stopped = true
      clearInterval(timer)
      // 席位的 dispose 是异步的（cordis 的 `fiber.dispose(): Promise`）：不 await 的话
      // 面板的槽位注销可能还排在微任务里，紧接着的重新挂载就会撞上旧席位。
      // effect 的清理链本身支持返回 Promise（cordis 会把每个 disposer 串进同一条 then 链）。
      try {
        await seatHandle?.dispose?.()
      } catch {
        /* 席位已随 fiber 销毁时不重复报错 */
      }
      for (const store of stores.values()) store.dispose()
      stores.clear()
    }
  }, 'ppt-maker: 轮询与生命周期')
}
