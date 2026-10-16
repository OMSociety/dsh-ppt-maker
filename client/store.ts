/**
 * 面板状态机：把「工程 + 当前页 + 选择 + 草稿 + 保存态 + 冲突」收在一个可订阅对象里，
 * React 侧只用 `useSyncExternalStore` 读快照 + 调动作，不自己管请求时序。
 *
 * 面板骨架的三条纪律：
 *   1. **轮询 3s**：面板反复挂别的 effect 会闪、会重拉，所以 index.tsx 全局起一个；
 *      `PptStore.applyPoll(state)` 是 store 侧唯一的「宿主 → 面板」入口。
 *   2. **草稿防覆盖**：`draft` 非空=有未提交编辑。轮询看见 revision 变了——
 *      无草稿才允许静默重载（`refreshProjects`）；有草稿只亮「外部已修改」，绝不吞字。
 *   3. **per-session**：`index.tsx` 的 `Map<sessionId, PptStore>` 持有多个，互不干扰。
 *
 * S6 先空的字段（`selection` / `pagesAst` / `draft`）也是**真字段**：S7–S9 的组件挂上来
 * 就不再动 store 的形状，只往里填值。
 */
import { api, ConflictError, type StatePayload } from './api'

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'error'
  /** 主机侧可打开的导出产物绝对路径（「打开方式」菜单的数据源；其它 toast 无此字段）。 */
  file?: string
}

/** 选中一扇图形元素（S7 Stage/ElementOverlay 落地后往里写）。 */
export interface Selection {
  /** 屏上的页下标（`pageIndex`），不是 1-based 页号——与 PPTD 页数组一致。 */
  page: number
  /** 元素 id（update_element 的 target）；同页多选时升序排列。 */
  ids: string[]
}

export type { ProjectEntry } from './api'
import type { ProjectEntry } from './api'

export interface PptState {
  status: 'loading' | 'ready' | 'empty' | 'error'
  error: string | null
  /** loading 态的辅助提示（如「宿主正在就绪」）；null = 默认「正在打开工作台…」。 */
  loadingHint: string | null
  sessionId: string
  /** 当前会话里已知的工程列表（来自轮询 /state 的 projects）。 */
  projects: ProjectEntry[]
  /** 活动工程 key；null = 空面板（还没 openRequest，也没人点开过工程）。 */
  activeKey: string | null
  /** 活动工程的 manifest（GET /project 拉起；占位面板显示品牌，真 Stage 用 deck）。 */
  manifest: unknown | null
  /** 活动工程 GET /project 的整棵 deck（size / source / …都在里面）。 */
  deck: { profile?: string; title?: string; size: [number, number]; pages: string[]; source?: unknown } | null
  /** 活动工程 deck 的页文件清单（GET /project 的 deck.pages，顺序即页序）。 */
  deckPages: string[]
  /** 当前页的文件内容（GET /page 拉起来的单页 AST；Store 只存「已经请求过」的那一份）。 */
  currentPageData: unknown | null
  /** 判断「currentPageData 是不是 lastSeenRevision 时的那一份」：错了就该重拉。 */
  currentPageRevision: number
  /** 活动工程 revision：轮询看见它变了，就得决定静默重载 / 亮提示（见 applyPoll）。 */
  lastSeenRevision: number
  /** 每页 AST 缓存（DOM 直渲用）：pageIndex → {page, revision}。缩略图条也要逐页渲染。 */
  pagesAst: Record<number, { page: unknown; revision: number }>
  /** 屏上正在看的那一页（ThumbStrip 点选后填）。 */
  currentPage: number
  /** 画布上选中的元素；null = 没选。 */
  selection: Selection | null
  /** 未提交草稿（防轮询覆盖）：S8 TextEditor / Inspector 往里写。 */
  draft: { baseRevision: number; ops: unknown[] } | null
  canUndo: boolean
  canRedo: boolean
  /** 保存进行中（flush/saveNow 在飞）。 */
  saving: boolean
  /** 409 冲突横幅：写编辑时 baseRevision 落后于服务端。 */
  conflict: { revision: number } | null
  /** 「外部已修改」横幅：轮询看见服务端 revision 变了，但本地 draft 没提交。 */
  externalChange: { revision: number } | null
  toast: Toast | null
}

function initialState(sessionId: string): PptState {
  return {
    status: 'loading',
    error: null,
    loadingHint: null,
    sessionId,
    projects: [],
    activeKey: null,
    manifest: null,
    deck: null,
    deckPages: [],
    currentPageData: null,
    currentPageRevision: -1,
    lastSeenRevision: -1,
    pagesAst: {},
    currentPage: 0,
    selection: null,
    draft: null,
    canUndo: false,
    canRedo: false,
    saving: false,
    conflict: null,
    externalChange: null,
    toast: null,
  }
}

export function createPptStore(sessionId: string) {
  let state = initialState(sessionId)
  const listeners = new Set<() => void>()
  let toastSeq = 0
  const toastTimers = new Set<ReturnType<typeof setTimeout>>()
  // 输入防抖：stage 之后过这么久才 flush（继续打字顺延窗口）。
  const STAGE_DEBOUNCE_MS = 400
  // 会改 deck.pages 页序/数量的 op：pagesAst 按索引缓存，结构性变化后必须清缓存重拉；
  // 属性级 op（update_element/update_page/add_element/remove_element）不清，原地静默重拉。
  const STRUCTURAL_OPS = new Set(['add_page', 'remove_page', 'move_page', 'page_duplicate'])
  let stageTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * 重启竞态预算：init 撞「无法解析会话工作目录」（宿主侧会话还没注册完，/state 回 400）
   * 是已知瞬时态——保持 loading、短间隔静默重试；超过预算仍失败才升级成错误屏。
   * 这样用户看到的是「正在打开工作台」，而不是一闪而过、还得手动点的错误屏。
   */
  const SESSION_RACE_BUDGET_MS = 15000
  const SESSION_RACE_RETRY_MS = 800
  let sessionRaceSince = -1
  let sessionRaceTimer: ReturnType<typeof setTimeout> | null = null
  function scheduleFlush() {
    if (stageTimer) clearTimeout(stageTimer)
    stageTimer = setTimeout(() => {
      stageTimer = null
      void flush()
    }, STAGE_DEBOUNCE_MS)
  }
  /** 立刻把挂起的草稿 flush 掉（撤销/重做/卸载前必须先把最后一笔送出去）。 */
  async function flushNow(): Promise<boolean> {
    if (stageTimer) {
      clearTimeout(stageTimer)
      stageTimer = null
    }
    return flush()
  }

  const emit = () => {
    for (const fn of listeners) fn()
  }
  const patch = (next: Partial<PptState>) => {
    state = { ...state, ...next }
    emit()
  }
  /**
   * 状态条提示。普通 info 2.6s / error 5s 自动消；opts.lingerMs 可定制
   * （导出成功要给人留出点开「打开方式」的时间，10s）。
   * opts.file 挂上主机侧可打开的导出产物路径。
   */
  const toast = (text: string, kind: Toast['kind'] = 'info', opts?: { file?: string; lingerMs?: number }) => {
    toastSeq += 1
    const id = toastSeq
    patch({ toast: { id, text, kind, file: opts?.file } })
    const timer = setTimeout(
      () => {
        toastTimers.delete(timer)
        if (state.toast && state.toast.id === id) patch({ toast: null })
      },
      opts?.lingerMs ?? (kind === 'error' ? 5000 : 2600),
    )
    toastTimers.add(timer)
  }

  /**
   * 打开 / 切到某个工程：GET /project 拉整棵 deck（面板据此画 ThumbStrip + Stage）。
   * 草稿 / 冲突 / 外部修改横幅一同清零（draft 本来就是 per 工程的状态）。
   * 点同一条 = noop。失败 → 挂 status:error + toast，不改 activeKey。
   */
  async function switchProject(key: string): Promise<boolean> {
    if (!key || key === state.activeKey) return true
    try {
      const res = await api.project(state.sessionId, key)
      patch({
        status: 'ready',
        activeKey: key,
        manifest: res.manifest,
        deck: res.deck,
        deckPages: Array.isArray(res.deck?.pages) ? res.deck.pages : [],
        currentPageData: null,
        currentPageRevision: -1,
        lastSeenRevision: res.revision,
        currentPage: 0,
        selection: null,
        draft: null,
        conflict: null,
        externalChange: null,
        pagesAst: {},
      })
      return true
    } catch (error) {
      const message = `打开工程失败：${(error as Error).message}`
      patch({ status: 'error', error: message })
      toast(message, 'error')
      return false
    }
  }

  /**
   * 轮询每次带回的 whole-session state 都走这里。
   * 三件干净事 + 一件众说纷纭的事：
   *   1. projects / canUndo / canRedo 直接刷；
   *   2. activeKey **只升不降**：轮询发现 host 的活动 key 变了 → 有草稿亮
   *      「外部已修改」、没草稿就切过去；本地没 activeKey（空面板）时跟着 host 走；
   *   3. activeKey 没变但 revision 变了 → 同样无 draft 静默重载、有 draft 亮提示；
   *   4. host 的 active 空了：若本地有草稿，不清面板——draft 属于人，轮询没资格收。
   */
  async function applyPoll(st: StatePayload) {
    const projects = Array.isArray(st.projects) ? st.projects : []
    const nextKey = st.activeKey ?? null
    // manifest 是「如果当前有 activeKey，就带上它的 revision」的轮廓（供「外部修改」判对）。
    const nextRevision = nextKey && st.manifest ? st.manifest.revision : -1

    const patchBase: Partial<PptState> = {
      // 不保留 error：applyPoll 只在 /state 成功时被调用（失败走 init/轮询的 catch，根本到不了这里），
      // 一次成功的轮询就是「宿主恢复」的信号——重启竞态里 init 撞 400 后，这里负责把人救回面板，
      // 否则错误屏会一直挂到用户手动点「重试」。
      status: projects.length || nextKey ? 'ready' : 'empty',
      error: null,
      projects,
      // canUndo/canRedo 由宿主 /state 的 manifest 轮廓给出（activeKey 工程才有意义）。
      canUndo: Boolean(st.manifest?.canUndo),
      canRedo: Boolean(st.manifest?.canRedo),
    }

    if (nextKey === null) {
      // host 说本会话没有活动工程：本地若**正好也没有**，就只是空面板；若有，是人正在编辑
      // 的工程（模型已改走/关掉那份了）——留着面板、亮「外部已修改」，不许把 draft 踹掉。
      if (state.activeKey) {
        patch({ ...patchBase, externalChange: { revision: state.lastSeenRevision } })
        return
      }
      patch(patchBase)
      return
    }

    const switched = state.activeKey !== nextKey
    if (switched) {
      if (state.activeKey && (state.draft || state.conflict)) {
        patch({ ...patchBase, externalChange: { revision: nextRevision } })
        return
      }
      await switchProject(nextKey)
      // switchProject 里已经 patch 了 activeKey / revision；这里补轮询数据即可
      patch(patchBase)
      return
    }

    // activeKey 相同，看 revision 有没有动
    if (nextRevision > state.lastSeenRevision) {
      if (state.draft || state.conflict) {
        patch({ ...patchBase, externalChange: { revision: nextRevision } })
        return
      }
      patch({
        ...patchBase,
        lastSeenRevision: nextRevision,
        currentPageData: null,
        currentPageRevision: -1,
        pagesAst: {},
      })
      void actions.ensurePageLoaded()
      return
    }

    patch(patchBase)
  }

  /**
   * 累计草稿里的所有 op 一起送出去；或直接把「这一批」发出去（不传参 = 刷草稿）。
   * 409 → 挂冲突横幅 + **草稿不动**（用户拿到横幅再决定），不要顺手把草稿清了；
   * 成功才清（applied 的数量与草稿 ops 数对得上——上游 op 引擎对未应用的会回 warnings）。
   */
  async function flush(): Promise<boolean> {
    if (!state.activeKey || !state.draft || !state.draft.ops.length) return false
    if (state.conflict) return false // 冲突未决不再重试：每个新 op 就再撞一次 409
    if (state.saving) return false
    if (state.externalChange) return false // 本地 revision 已过期，写出去必然 409
    const key = state.activeKey
    const base = state.draft.baseRevision
    const ops = state.draft.ops
    patch({ saving: true })
    try {
      // eslint-disable-next-line no-use-before-define -- flush 是 actions 共用入口
      const res = await api.edit(state.sessionId, key, base, ops)
      patch({
        saving: false,
        lastSeenRevision: res.revision,
        draft: null,
        conflict: null,
        externalChange: null,
      })
      // 编辑成功 => 磁盘变了。
      // 结构性 op 改 deck.pages 的页序与数量，pagesAst 按索引缓存会直接错位 → 清缓存重拉。
      // 属性级 op（update_element 等）：**不清缓存**——旧 AST 留在屏上继续渲染，后台静默
      // 重拉、到位后原位替换。清空再拉会让画布闪一次空白（用户看到的「弹动」）。
      const structural = ops.some(
        (op) => op && typeof op === 'object' && STRUCTURAL_OPS.has(String((op as { op?: unknown }).op ?? '')),
      )
      if (structural) {
        patch({ currentPageData: null, currentPageRevision: -1, pagesAst: {} })
        void actions.ensurePageLoaded(true)
      } else {
        // 强制重拉：同 session 30s 内的连写会「并进」同一份快照（history.ts 的
        // merge window），revision **不前进**——只比 revision 会让第二笔之后的
        // 改动永远刷不到屏上（「保存一次之后就改不动了」）。
        void actions.ensurePageLoaded(true)
        void actions.ensurePageAst(state.currentPage, true)
        void actions.ensureAllPages()
      }
      void actions.syncProjectPages()
      return true
    } catch (error) {
      if (error instanceof ConflictError) {
        patch({ saving: false, conflict: { revision: error.revision } })
        return false
      }
      patch({ saving: false })
      toast(`保存失败：${(error as Error).message}`, 'error')
      return false
    }
  }

  const actions = {
    /**
     * 让正在 edit 的动作之前来一次：把 draft 刷成已提交（undo/redo 之前一笔 op 得先进 .history，
     * 不然 .history 看到的是「draft 不在历史里」时的旧游标；操作然后就会变成把还没提交的东西撤回）。
     */
    async applyDraft() {
      if (stageTimer) {
        clearTimeout(stageTimer)
        stageTimer = null
      }
      if (!state.draft) return true
      return flush()
    },

    /** 面板挂载时初始化：拉一次 /state，把 projects 与 active 排进 store。 */
    async init() {
      try {
        patch({ status: 'loading', error: null, loadingHint: null })
        const st = await api.state(state.sessionId)
        // 成功：竞态预算清零，下一次失败重新计时。
        sessionRaceSince = -1
        await applyPoll(st)
      } catch (error) {
        const message = (error as Error).message
        if (message.includes('无法解析会话工作目录')) {
          const now = Date.now()
          if (sessionRaceSince < 0) sessionRaceSince = now
          if (now - sessionRaceSince <= SESSION_RACE_BUDGET_MS) {
            // 等过 3 秒还没好，把提示从「正在打开工作台」换成「宿主正在就绪」，
            // 让用户知道没卡死，只是宿主还没登记完这个会话。
            const waited = now - sessionRaceSince
            patch({
              status: 'loading',
              error: null,
              loadingHint: waited >= 3000 ? '宿主正在就绪，请稍候…' : null,
            })
            if (sessionRaceTimer) clearTimeout(sessionRaceTimer)
            sessionRaceTimer = setTimeout(() => {
              sessionRaceTimer = null
              void actions.init()
            }, SESSION_RACE_RETRY_MS)
            return
          }
        }
        patch({ status: 'error', error: message, loadingHint: null })
      }
    },

    /** 轮询入口（index.tsx 的定时器调它）。 */
    applyPoll,

    /**
     * Inspector 换图按钮：POST /media/upload（宿主给文件名与白名单），response 的 src 拿来
     * 发 update_element set src（op 入队 = 同一杆）。
     */
    async uploadMedia(payload: { name?: string; mime?: string; data: string }) {
      if (!state.activeKey) throw new Error('还没有打开工程')
      return api.uploadMedia(state.sessionId, state.activeKey, payload)
    },

    /** Stage 元素翻索引：updateElement(id,patch) 的便捷版，直接 stage。 */
    async updateElement(elementId: string, patch: Record<string, unknown>) {
      if (!state.activeKey) return false
      const page = state.currentPage
      if (page < 0) return false
      const pagePath = state.deckPages[page]
      if (!pagePath) return false
      return actions.stage({ op: 'update_element', page: pagePath, elementId, patch })
    },

    /** ThumbStrip 拖拽页序 → move_page op。 */
    async movePage(pagePath: string, toIndex: number) {
      return actions.stage({ op: 'move_page', page: pagePath, toIndex })
    },

    /** ThumbStrip 复制按钮 → page_duplicate op。 */
    async duplicatePage(pagePath: string) {
      return actions.stage({ op: 'page_duplicate', page: pagePath })
    },

    /** ThumbStrip 删除按钮 → remove_page op。 */
    async removePage(pagePath: string) {
      return actions.stage({ op: 'remove_page', page: pagePath })
    },

    /** ThumbStrip 顶上的 「+ 新页」 → add_page op。 */
    async addPage() {
      return actions.stage({ op: 'add_page', content: { elements: [] } })
    },

    /** 「最近仓库」点一条项目：等保存 flush 了再切，免得丢 op。 */
    async openProject(key: string) {
      if (!key || key === state.activeKey) return
      if (state.draft || state.conflict) {
        toast('先处理上方的冲突/外部修改，再切工程', 'error')
        return
      }
      await switchProject(key)
    },

    /**
     * S7 起 ThumbStrip 的点选会走这里：翻页不动磁盘、也不动 revision，
     * 只更新屏上的 currentPage（草稿是 per 工程、不是 per 页，不用清）。
     * 顺带把页缓存打上过期标记——面板想看就得重新拉（翻页 → GET /page）。
     */
    setPage(page: number) {
      if (page === state.currentPage) return
      patch({ currentPage: page, selection: null, currentPageData: null })
      void actions.ensurePageLoaded()
    },

    /**
     * Stage/ElementOverlay/TextEditor 落地都要页上的元素清单——
     * 走这里拉（已经有就复用，revision 过了就重拉）。
     * `force`：保存成功后必须走这条——合并窗口里的连写不推进 revision，
     * 光比 revision 会以为「磁盘没变」，把后续改动全压在旧 AST 上。
     */
    async ensurePageLoaded(force = false): Promise<void> {
      if (!state.activeKey) return
      const page = state.currentPage
      if (page < 0 || page >= state.deckPages.length) {
        patch({ currentPageData: null, currentPageRevision: -1 })
        return
      }
      // force=true：调用方（保存成功后）知道磁盘变了，但 revision 可能没动。
      if (!force && state.currentPageData !== null && state.currentPageRevision === state.lastSeenRevision) return
      const key = state.activeKey
      const path = state.deckPages[page]
      try {
        const res = await api.page(state.sessionId, key, path)
        // 期间可能又翻页了或切了工程：只有当前页/当前工程还是这个才落数据
        if (state.currentPage !== page || state.activeKey !== key) return
        patch({ currentPageData: res.page, currentPageRevision: res.revision })
      } catch (error) {
        patch({ currentPageData: null, currentPageRevision: -1 })
        toast(`第 ${page + 1} 页载入失败：${(error as Error).message}`, 'error')
      }
    },

    /** 画布上点了一个元素（S7 ElementOverlay）；空数组 = 取消选择。 */
    setSelection(ids: string[]) {
      patch({ selection: ids.length ? { page: state.currentPage, ids } : null })
    },

    /**
     * PptdView 的媒体 src 解析：media/ 相对路径映射到宿主 /media 路由；
     * http(s): 远端 URL（规格允许）原样透传，不进 /media。
     */
    mediaUrl(src: string): string {
      if (!state.activeKey) return src
      if (!src.startsWith('media/')) return src
      return api.mediaUrl(state.sessionId, state.activeKey, src)
    },

    /**
     * 拉某一页的 AST 进 pagesAst 缓存（ThumbStrip 的 DOM 缩略图按页渲染用）。
     * 已有缓存且 revision 未变则复用；失败静默（缩略图退化为占位）。
     * 竞态守卫：捕获请求时的 activeKey，响应回来比对——切了工程就把旧响应丢掉。
     */
    async ensurePageAst(pageIndex: number, force = false): Promise<void> {
      if (!state.activeKey) return
      if (pageIndex < 0 || pageIndex >= state.deckPages.length) return
      const hit = state.pagesAst[pageIndex]
      // force=true：刚保存过——合并窗口里 revision 可能没动，缓存不能当「没过期」。
      if (!force && hit && hit.revision === state.lastSeenRevision) return
      const key = state.activeKey
      const path = state.deckPages[pageIndex]
      try {
        const res = await api.page(state.sessionId, key, path)
        if (state.activeKey !== key) return // 期间切了工程：旧响应不落盘
        patch({
          pagesAst: { ...state.pagesAst, [pageIndex]: { page: res.page, revision: res.revision } },
        })
      } catch {
        /* 单页失败不阻断整列缩略图 */
      }
    },

    /** 并行拉齐所有页 AST（打开工程 / revision 变化后，ThumbStrip 一次性渲染整列）。 */
    async ensureAllPages(force = false): Promise<void> {
      if (!state.activeKey) return
      await Promise.all(state.deckPages.map((_, i) => actions.ensurePageAst(i, force)))
    },

    /**
     * 重拉 /project 同步页清单：add/remove/move_page 之后 deck.pages 会变。
     * 只刷新 deck/deckPages——lastSeenRevision 的权威是 /edit 响应（flush 已推进），
     * 这里不覆盖（否则一个迟到的旧 project 响应会把 revision 拽回去）。
     * 失败静默（下轮轮询还会再来）。
     */
    async syncProjectPages(): Promise<void> {
      const key = state.activeKey
      if (!key) return
      try {
        const res = await api.project(state.sessionId, key)
        if (state.activeKey !== key) return
        patch({
          deck: res.deck,
          deckPages: Array.isArray(res.deck?.pages) ? res.deck.pages : [],
        })
      } catch {
        /* 同步失败不阻断：下轮轮询兜底 */
      }
    },

    /**
     * 累积一杆 op（S8 TextEditor 提交、S9 ThumbStrip 页操作都走这里）：
     * 只是先记入草稿 + 亮「save」，不立即 flush——真正的提交在
     * 以下任一时候发生：①另一笔 op 跟着来；②点「保存/应用」；③切工程/关面板前。
     * 简化骨架：草稿第一杆立刻 flush（面板容易做出「我改了但没生效」的错觉），
     * 后续 op 攒到下一杆自然攒。
     */
    async stage(op: unknown) {
      if (!state.activeKey) {
        toast('还没有打开工程', 'error')
        return false
      }
      if (state.conflict) {
        toast('先处理上方的冲突再改', 'error')
        return false
      }
      patch(
        state.draft
          ? { draft: { ...state.draft, ops: [...state.draft.ops, op] } }
          : { draft: { baseRevision: state.lastSeenRevision, ops: [op] } },
      )
      // 不立即 flush：打字每次 onChange 都走 stage，若立即送就会「每敲一字整栏
      // 闪一下」。攒 400ms 再送（见下面的 stageTimer）；期间用户继续打字会
      // 顺延窗口。撤销/重做/切工程/关面板前会先 applyDraft 把草稿刷进 .history，
      // 所以合批不会让撤销丢掉最后一笔。
      scheduleFlush()
      return true
    },

    /** 「撤回」：先刷 draft（撤回只追加，不清空），再调 POST /undo。 */
    async undo() {
      if (!state.activeKey) return
      if (!(await actions.applyDraft())) return
      if (!state.canUndo) return
      const key = state.activeKey
      try {
        const res = await api.undo(state.sessionId, key)
        patch({
          lastSeenRevision: res.revision,
          conflict: null,
          externalChange: null,
          currentPageData: null,
          currentPageRevision: -1,
          pagesAst: {},
          // 乐观更新按钮态：undo 成功后游标下降，前方必有快照可重做
          canUndo: res.revision > 0,
          canRedo: true,
        })
        void actions.ensurePageLoaded()
        void actions.syncProjectPages()
        toast('已撤销', 'info')
      } catch (error) {
        toast(`撤销失败：${(error as Error).message}`, 'error')
      }
    },

    async redo() {
      if (!state.activeKey) return
      if (!(await actions.applyDraft())) return
      if (!state.canRedo) return
      const key = state.activeKey
      try {
        const res = await api.redo(state.sessionId, key)
        patch({
          lastSeenRevision: res.revision,
          conflict: null,
          externalChange: null,
          currentPageData: null,
          currentPageRevision: -1,
          pagesAst: {},
          // redo 成功后游标必 > 0；canRedo 是否还有余量交给下轮轮询校准
          canUndo: true,
        })
        void actions.ensurePageLoaded()
        void actions.syncProjectPages()
        toast('已重做', 'info')
      } catch (error) {
        toast(`重做失败：${(error as Error).message}`, 'error')
      }
    },

    /**
     * 「恢复到历史版本」：与 undo/redo 同为游标移动，只是目标显式（版本历史抽屉用）。
     * baseRevision 取 lastSeenRevision——和编辑同一条修订基线；409 时亮冲突横幅。
     */
    async restoreRevision(revision: number): Promise<boolean> {
      if (!state.activeKey) return false
      if (!(await actions.applyDraft())) return false
      const key = state.activeKey
      try {
        const res = await api.restoreHistory(state.sessionId, key, revision, state.lastSeenRevision)
        patch({
          lastSeenRevision: res.revision,
          conflict: null,
          externalChange: null,
          currentPageData: null,
          currentPageRevision: -1,
          pagesAst: {},
          selection: null,
          canUndo: res.revision > 0,
          canRedo: true,
        })
        void actions.ensurePageLoaded()
        void actions.syncProjectPages()
        toast(`已恢复到 r${res.revision}`, 'info')
        return true
      } catch (error) {
        if (error instanceof ConflictError) {
          patch({ conflict: { revision: error.revision } })
        }
        toast(`恢复失败：${(error as Error).message}`, 'error')
        return false
      }
    },

    /**
     * 「导出 .pptx」：宿主把 pptx 落到工程目录 `export/` 下，回相对路径 + 字节数。
     * 不走浏览器下载——桌面外壳的下载没有可回读的落点，磁盘上的文件才是确定的结果，
     * 所以这里只报告落点（store 不碰 DOM）。
     */
    async exportDeck(): Promise<{ relativePath: string; filename: string } | null> {
      if (!state.activeKey) return null
      try {
        const saved = await api.exportPptxToProject(state.sessionId, state.activeKey)
        if (saved.revision) patch({ lastSeenRevision: saved.revision })
        const kb = Math.max(1, Math.round(saved.bytes / 1024))
        toast(`已导出 ${saved.relativePath || saved.filename}（${kb} KB）`, 'info', {
          file: saved.absolutePath || undefined,
          lingerMs: 10000,
        })
        return saved
      } catch (error) {
        toast(`导出失败：${(error as Error).message}`, 'error')
        return null
      }
    },

    /**
     * 「重载」横幅上的确认：用户点头把外部修订拉进来，**丢掉本地 draft**。
     * 只在「外部已修改」横幅上出现——那是它唯一存在的意义。
     */
    async acceptExternal() {
      patch({ externalChange: null, draft: null, conflict: null })
      if (state.activeKey) await switchProject(state.activeKey)
    },

    /** 「冲突」横幅上的「采用服务端版本」：清冲突 + 清草稿，重载磁盘上的样子。 */
    async resolveConflictTheirs() {
      patch({ conflict: null, draft: null })
      if (state.activeKey) await switchProject(state.activeKey)
    },

    flush,
    toast,
  }

  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    actions,
    dispose() {
      for (const timer of toastTimers) clearTimeout(timer)
      toastTimers.clear()
      if (stageTimer) {
        clearTimeout(stageTimer)
        stageTimer = null
      }
      if (sessionRaceTimer) {
        clearTimeout(sessionRaceTimer)
        sessionRaceTimer = null
      }
      listeners.clear()
    },
  }
}

export type PptStore = ReturnType<typeof createPptStore>
