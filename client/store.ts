/**
 * 面板状态机：把「工程 + 当前页 + 选择 + 草稿 + 保存态 + 冲突」收在一个可订阅对象里，
 * React 侧只用 `useSyncExternalStore` 读快照 + 调动作，不自己管请求时序。
 *
 * S6 骨架的三条纪律（与 PR2 计划 §4 逐字对齐）：
 *   1. **轮询 3s**：面板反复挂别的 effect 会闪、会重拉，所以 index.tsx 全局起一个；
 *      `PptStore.applyPoll(state)` 是 store 侧唯一的「宿主 → 面板」入口。
 *   2. **草稿防覆盖**：`draft` 非空=有未提交编辑。轮询看见 revision 变了——
 *      无草稿才允许静默重载（`refreshProjects`）；有草稿只亮「外部已修改」，绝不吞字。
 *   3. **per-session**：`index.tsx` 的 `Map<sessionId, PptStore>` 持有多个，互不干扰。
 *
 * S6 先空的字段（`selection` / `pageCache` / `draft`）也是**真字段**：S7–S9 的组件挂上来
 * 就不再动 store 的形状，只往里填值。
 */
import { api, ConflictError, type StatePayload } from './api'

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'error'
}

/** 选中一扇图形元素（S7 Stage/ElementOverlay 落地后往里写）。 */
export interface Selection {
  /** 屏上的页下标（`pageIndex`），不是 1-based 页号——与 PPTD 页数组一致。 */
  page: number
  /** 元素 id（update_element 的 target）；同页多选时升序排列。 */
  ids: string[]
}

/** 页缩略图缓存：一图一条，按 (pageNumber, revision) 缓存击穿。 */
export interface PageThumb {
  page: number
  revision: number
  /** GET /thumb?rev=N 的 data URI。 */
  dataUrl: string
}

export type { ProjectEntry } from './api'
import type { ProjectEntry } from './api'

export interface PptState {
  status: 'loading' | 'ready' | 'empty' | 'error'
  error: string | null
  sessionId: string
  /** 当前会话里已知的工程列表（来自轮询 /state 的 projects）。 */
  projects: ProjectEntry[]
  /** 活动工程 key；null = 空面板（还没 openRequest，也没人点开过工程）。 */
  activeKey: string | null
  /** 活动工程的 manifest（GET /project 拉起；占位面板显示品牌，真 Stage 用 deck）。 */
  manifest: unknown | null
  /** 活动工程 GET /project 的整棵 deck（size / source / …都在里面）。 */
  deck: { version: string; profile?: string; title?: string; size: [number, number]; pages: string[]; source?: unknown } | null
  /** 活动工程 deck 的页文件清单（GET /project 的 deck.pages，顺序即页序）。 */
  deckPages: string[]
  /** 当前页的文件内容（GET /page 拉起来的单页 AST；Store 只存「已经请求过」的那一份）。 */
  currentPageData: unknown | null
  /** 判断「currentPageData 是不是 lastSeenRevision 时的那一份」：错了就该重拉。 */
  currentPageRevision: number
  /** 活动工程 revision：轮询看见它变了，就得决定静默重载 / 亮提示（见 applyPoll）。 */
  lastSeenRevision: number
  /** 活动工程的页缩略图：page → ?rev=N。S6 不取，S7 ThumbStrip/hook 填。 */
  pageCache: Record<number, PageThumb>
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
    sessionId,
    projects: [],
    activeKey: null,
    manifest: null,
    deck: null,
    deckPages: [],
    currentPageData: null,
    currentPageRevision: -1,
    lastSeenRevision: -1,
    pageCache: {},
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

  const emit = () => {
    for (const fn of listeners) fn()
  }
  const patch = (next: Partial<PptState>) => {
    state = { ...state, ...next }
    emit()
  }
  const toast = (text: string, kind: Toast['kind'] = 'info') => {
    toastSeq += 1
    const id = toastSeq
    patch({ toast: { id, text, kind } })
    const timer = setTimeout(() => {
      toastTimers.delete(timer)
      if (state.toast && state.toast.id === id) patch({ toast: null })
    }, kind === 'error' ? 5000 : 2600)
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
        pageCache: {},
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
      status: state.status === 'error' && state.error ? 'error' : projects.length || nextKey ? 'ready' : 'empty',
      error: null,
      projects,
      canUndo: Boolean(st.canUndo),
      canRedo: Boolean(st.canRedo),
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
        pageCache: {},
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
      // 编辑成功 => 磁盘变了：让已展示的页重拉（ThumbStrip 带 ?rev= 已经会破缓存，
      // 这里只负责页 AST 那份）。
      patch({ currentPageData: null, currentPageRevision: -1, pageCache: {} })
      void actions.ensurePageLoaded()
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
      if (!state.draft) return true
      return flush()
    },

    /** 面板挂载时初始化：拉一次 /state，把 projects 与 active 排进 store。 */
    async init() {
      try {
        patch({ status: 'loading', error: null })
        const st = await api.state(state.sessionId)
        await applyPoll(st)
      } catch (error) {
        patch({ status: 'error', error: (error as Error).message })
      }
    },

    /** 轮询入口（index.tsx 的定时器调它）。 */
    applyPoll,

    cacheThumb: async (page: number, dataUrl: string, revision: number) => {
      if (page < 1 || !Number.isInteger(page)) return
      patch({
        pageCache: {
          ...state.pageCache,
          [page]: { page, revision, dataUrl },
        },
      })
    },

    ensureThumb: async (page: number, revision: number): Promise<PageThumb | null> => {
      if (!state.activeKey) return null
      const hit = state.pageCache[page]
      if (hit && hit.revision === revision) return hit
      const url = api.thumbUrl(state.sessionId, state.activeKey, page, revision)
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const Reader: any = (globalThis as any).FileReader
          if (!Reader) return reject(new Error('这个浏览器不支持本地图预览'))
          const reader = new Reader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(new Error('缩略图读取失败'))
          reader.readAsDataURL(blob)
        })
        const thumb: PageThumb = { page, revision, dataUrl }
        patch({ pageCache: { ...state.pageCache, [page]: thumb } })
        return thumb
      } catch {
        return null
      }
    },

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
     */
    async ensurePageLoaded(): Promise<void> {
      if (!state.activeKey) return
      const page = state.currentPage
      if (page < 0 || page >= state.deckPages.length) {
        patch({ currentPageData: null, currentPageRevision: -1 })
        return
      }
      if (state.currentPageData !== null && state.currentPageRevision === state.lastSeenRevision) return
      const path = state.deckPages[page]
      try {
        const res = await api.page(state.sessionId, state.activeKey, path)
        // 期间可能又翻页了：只有当前页还是这个 page 才落数据
        if (state.currentPage !== page) return
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
      // 骨架期就一杆一送：等 S8 TextEditor 落地，「继续打字再攒一杆」的合批生长在这里。
      return flush()
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
          pageCache: {},
        })
        void actions.ensurePageLoaded()
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
          pageCache: {},
        })
        void actions.ensurePageLoaded()
        toast('已重做', 'info')
      } catch (error) {
        toast(`重做失败：${(error as Error).message}`, 'error')
      }
    },

    /**
     * 「导出 .pptx」请求体（返回 Blob，不调 document——真正的「点出下载气泡」由组件干）。
     * store 不碰 DOM：vitest 的 environment:node 没有 document；Toolbar 拿到 Blob 后自己触发。
     */
    async exportDeck(): Promise<{ blob: Blob; filename: string } | null> {
      if (!state.activeKey) return null
      try {
        const { blob, revision } = await api.exportPptx(state.sessionId, state.activeKey)
        if (revision) patch({ lastSeenRevision: Number(revision) || state.lastSeenRevision })
        return { blob, filename: `${state.activeKey}.pptx` }
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
      listeners.clear()
    },
  }
}

export type PptStore = ReturnType<typeof createPptStore>
