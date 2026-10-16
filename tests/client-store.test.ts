/**
 * PptStore 时序与纪律：mock 掉 client/api.ts 的 fetch，只验证 store 的**决策**——
 * init 把 /state 拉进快照；applyPoll 无草稿静默重载、有草稿只亮「外部已修改」；
 * stage 立 flush、409 挂 conflict 且 draft 留身；undo 之前草稿必须先 flush。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// client/store.ts 只在相对路径里 import './api'，vitest 的 vi.mock 按同样的相对路径抓。
const mockApi = vi.hoisted(() => ({
  state: vi.fn(),
  tabOpened: vi.fn(),
  setActive: vi.fn(),
  project: vi.fn(),
  page: vi.fn(),
  edit: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  restoreHistory: vi.fn(),
  uploadMedia: vi.fn(),
  exportPptxToProject: vi.fn(),
  mediaUrl: vi.fn(() => '/ppt-maker/api/media'),
}))
vi.mock('../client/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client/api')>()
  return { ...actual, api: mockApi }
})

import { ConflictError } from '../client/api'
import { createPptStore, type PptStore } from '../client/store'

const STATE_R1 = {
  ok: true as const,
  cwd: 'C:/ws',
  projects: [{ key: 'k1', dir: 'a/deck.pptd' }],
  activeKey: 'k1',
  openRequests: [],
  manifest: { revision: 1, title: 'T', pageCount: 3 },
}

const DECK = {
  title: 'T',
  size: [960, 540] as [number, number],
  pages: ['pages/01.page', 'pages/02.page'],
}

const PROJECT_R1 = {
  ok: true as const,
  key: 'k1',
  dir: 'a/deck.pptd',
  revision: 1,
  manifest: { revision: 1, title: 'T' },
  deck: DECK,
  pages: DECK.pages.map((path) => ({ path })),
}

const PAGE_1 = { elements: [{ elementId: 'el-1', elementType: 'text', bounds: [10, 10, 100, 30], content: { text: 'hi' } }] }

function seedStore(): PptStore {
  mockApi.state.mockResolvedValue(STATE_R1)
  mockApi.project.mockResolvedValue(PROJECT_R1)
  mockApi.tabOpened.mockResolvedValue({ ok: true })
  mockApi.setActive.mockResolvedValue({ ok: true, key: 'k1' })
  mockApi.page.mockResolvedValue({ ok: true, path: 'pages/01.page', page: PAGE_1, revision: 1 })
  mockApi.edit.mockResolvedValue({ ok: true, revision: 2, appliedOps: [], warnings: [] })
  mockApi.undo.mockResolvedValue({ ok: true, revision: 1, undoneOps: [] })
  mockApi.redo.mockResolvedValue({ ok: true, revision: 2, undoneOps: [] })
  mockApi.uploadMedia.mockResolvedValue({ ok: true, src: 'media/x.png', bytes: 1 })
  return createPptStore('s1')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PptStore（S6 骨架纪律）', () => {
  it('init 拉 /state：projects 进来，activeKey 成为活动工程，status 变 ready', async () => {
    const store = seedStore()
    await store.actions.init()
    const snap = store.getSnapshot()
    expect(snap.status).toBe('ready')
    expect(snap.projects).toHaveLength(1)
    expect(snap.activeKey).toBe('k1')
    expect(snap.lastSeenRevision).toBe(1)
    expect(mockApi.state).toHaveBeenCalledWith('s1')
    store.dispose()
  })

  it('重启竞态：init 撞「会话尚未注册」的 400 不进错误屏，保持 loading 等宿主就绪', async () => {
    const store = seedStore()
    // 宿主刚起来时 sessions.get 还没注册该会话：/state 回 400——这是已知瞬时态，
    // 用户应看到「正在打开工作台」而非「无法解析会话工作目录」错误屏
    mockApi.state.mockRejectedValueOnce(new Error('无法解析会话工作目录：s1'))
    await store.actions.init()
    expect(store.getSnapshot().status).toBe('loading')
    expect(store.getSnapshot().error).toBeNull()
    expect(mockApi.state).toHaveBeenCalledTimes(1)
    store.dispose()
  })

  it('重启竞态：等待中由轮询把人带进面板（loading 态 applyPoll 成功即恢复）', async () => {
    const store = seedStore()
    mockApi.state.mockRejectedValueOnce(new Error('无法解析会话工作目录：s1'))
    await store.actions.init()
    expect(store.getSnapshot().status).toBe('loading')

    // 会话注册完成后某次轮询成功（本会话恰好没有任何工程）：直接恢复成 empty
    await store.actions.applyPoll({ ...STATE_R1, projects: [], activeKey: null, manifest: null })
    expect(store.getSnapshot().status).toBe('empty')
    store.dispose()
  })

  it('重启竞态：init 自身静默重试，800ms 后自动再拉一次直到成功', async () => {
    const store = seedStore()
    mockApi.state
      .mockRejectedValueOnce(new Error('无法解析会话工作目录：s1'))
      .mockRejectedValueOnce(new Error('无法解析会话工作目录：s1'))
    await store.actions.init()
    expect(store.getSnapshot().status).toBe('loading')

    await vi.advanceTimersByTimeAsync(800)
    expect(mockApi.state).toHaveBeenCalledTimes(2)
    expect(store.getSnapshot().status).toBe('loading')

    await vi.advanceTimersByTimeAsync(800)
    expect(mockApi.state).toHaveBeenCalledTimes(3)
    // 第三次拉取走 seedStore 的默认成功 mock：恢复 ready
    expect(store.getSnapshot().status).toBe('ready')
    store.dispose()
  })

  it('重启竞态：等满 3 秒提示换成「宿主正在就绪」，超过 15 秒预算才升级成错误屏', async () => {
    const store = seedStore()
    mockApi.state.mockRejectedValue(new Error('无法解析会话工作目录：s1'))
    await store.actions.init()
    expect(store.getSnapshot().loadingHint).toBeNull()

    await vi.advanceTimersByTimeAsync(3500)
    expect(store.getSnapshot().status).toBe('loading')
    expect(store.getSnapshot().loadingHint).toContain('宿主正在就绪')

    // 预算耗尽（15 秒）：才允许挂 error
    await vi.advanceTimersByTimeAsync(13000)
    expect(store.getSnapshot().status).toBe('error')
    expect(store.getSnapshot().error).toContain('无法解析会话工作目录')
    store.dispose()
  })

  it('exportDeck：toast 挂导出文件路径（打开方式菜单的数据源），并视觉残留 10 秒', async () => {
    const store = seedStore()
    await store.actions.init()
    mockApi.exportPptxToProject.mockResolvedValue({
      relativePath: 'a/export/x-r1.pptx',
      absolutePath: 'C:/ws/a/export/x-r1.pptx',
      filename: 'x-r1.pptx',
      revision: 1,
      bytes: 2048,
    })
    const res = await store.actions.exportDeck()
    expect(res).not.toBeNull()
    const snap = store.getSnapshot()
    expect(snap.toast?.text).toContain('已导出 a/export/x-r1.pptx')
    expect(snap.toast?.file).toBe('C:/ws/a/export/x-r1.pptx')

    // 普通 info 2.6s 就消；导出 toast 要留够点开「打开方式」的时间
    await vi.advanceTimersByTimeAsync(5000)
    expect(store.getSnapshot().toast?.text).toContain('已导出')
    await vi.advanceTimersByTimeAsync(6000)
    expect(store.getSnapshot().toast).toBeNull()
    store.dispose()
  })

  it('applyPoll 安静重载：无草稿时 revision 前进就推进 lastSeenRevision，不亮横幅', async () => {
    const store = seedStore()
    await store.actions.init()
    await store.actions.applyPoll({ ...STATE_R1, manifest: { ...STATE_R1.manifest, revision: 3 } })
    const snap = store.getSnapshot()
    expect(snap.lastSeenRevision).toBe(3)
    expect(snap.externalChange).toBeNull()
    expect(snap.conflict).toBeNull()
    store.dispose()
  })

  it('applyPoll 有冲突时 revision 前进也只亮「外部已修改」，不静默重载', async () => {
    const store = seedStore()
    await store.actions.init()
    // stage → 攒批 → flush → 409：conflict 就位、draft 留身
    mockApi.edit.mockRejectedValueOnce(new ConflictError(5))
    await store.actions.stage({ kind: 'update_page', pageIndex: 0, set: {} })
    await vi.runAllTimersAsync() // 过防抖窗，flush 真的发出并撞 409
    expect(store.getSnapshot().conflict).toEqual({ revision: 5 })
    // 冲突未决时 applyPoll 撞 revision 前进：只亮 banner，绝不推进 lastSeenRevision
    await store.actions.applyPoll({ ...STATE_R1, manifest: { ...STATE_R1.manifest, revision: 6 } })
    expect(store.getSnapshot().externalChange).toEqual({ revision: 6 })
    expect(store.getSnapshot().lastSeenRevision).toBe(1)
    store.dispose()
  })

  it('flush 在飞时 applyPoll 撞 revision 前进：saving 亮出、externalChange 亮起、saving 结束后草稿才清', async () => {
    const store = seedStore()
    await store.actions.init()
    let resolvePending: ((v: { ok: true; revision: number; applied: number }) => void) | undefined
    mockApi.edit.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePending = resolve
        }),
    )
    // stage 只攒批不立即 flush；过防抖窗后 flush 发出 fetch，此时 fetch 还挂着
    await store.actions.stage({ kind: 'update_page', pageIndex: 0, set: {} })
    expect(store.getSnapshot().saving).toBe(false) // 还没过防抖窗，fetch 未发
    await vi.runAllTimersAsync() // 过防抖窗，flush 发出（edit 是 pending 的）
    expect(store.getSnapshot().saving).toBe(true)
    expect(store.getSnapshot().draft).not.toBeNull()
    // 轮询撞上来：不得推进 lastSeenRevision（在飞那次成功了会自动推）
    await store.actions.applyPoll({ ...STATE_R1, manifest: { ...STATE_R1.manifest, revision: 9 } })
    expect(store.getSnapshot().externalChange).toEqual({ revision: 9 })
    expect(store.getSnapshot().lastSeenRevision).toBe(1)
    // flush 成功：draft 清掉、conflict/externalChange 也一并收走（flush 成功补丁里显式清了）
    resolvePending?.({ ok: true, revision: 2, applied: 1 })
    await vi.runAllTimersAsync()
    expect(store.getSnapshot().saving).toBe(false)
    expect(store.getSnapshot().draft).toBeNull()
    expect(store.getSnapshot().externalChange).toBeNull()
    expect(store.getSnapshot().lastSeenRevision).toBe(2)
    store.dispose()
  })

  it('stage 一杆 op：先记入 draft，过防抖窗再 flush；成功后 draft 清空，lastSeenRevision 推进', async () => {
    const store = seedStore()
    await store.actions.init()
    const ok = await store.actions.stage({ kind: 'update_page', pageIndex: 0, set: { 'a.b': 1 } })
    expect(ok).toBe(true)
    // 攒批：还没过防抖窗，fetch 未发，draft 留着
    expect(mockApi.edit).not.toHaveBeenCalled()
    expect(store.getSnapshot().draft).not.toBeNull()
    await vi.runAllTimersAsync() // 过防抖窗，flush 发出并成功
    expect(mockApi.edit).toHaveBeenCalledWith('s1', 'k1', 1, [{ kind: 'update_page', pageIndex: 0, set: { 'a.b': 1 } }])
    const snap = store.getSnapshot()
    expect(snap.draft).toBeNull()
    expect(snap.lastSeenRevision).toBe(2)
    expect(snap.saving).toBe(false)
    store.dispose()
  })

  it('stage 撞 409：挂 conflict，draft 留在身上（未提交），saving 复位；再 stage 不送', async () => {
    const store = seedStore()
    await store.actions.init()
    mockApi.edit.mockRejectedValueOnce(new ConflictError(5))
    const ok = await store.actions.stage({ kind: 'remove_page', pageIndex: 0 })
    expect(ok).toBe(true) // stage 只攒批：409 在过防抖窗那次 flush 才撞
    await vi.runAllTimersAsync()
    const snap = store.getSnapshot()
    expect(snap.conflict).toEqual({ revision: 5 })
    expect(snap.draft, '409 不许清草稿：用户要在横幅上决定').not.toBeNull()
    expect(snap.saving).toBe(false)
    // 冲突未决时再 stage：不攒第二杆、不再 fetch——弹一句只（409 是编辑动作在横幅下审）
    mockApi.edit.mockClear()
    const ok2 = await store.actions.stage({ kind: 'add_page', at: 0 })
    expect(ok2).toBe(false)
    expect(mockApi.edit, '冲突未决不得再撞 409').not.toHaveBeenCalled()
    expect(store.getSnapshot().draft?.ops, '冲突未决时 stage 暂不攒 op').toHaveLength(1)
    store.dispose()
  })

  it('undo 前必须先把草稿 flush：canUndo=false 时不调 /undo，游标要靠 /state 上来', async () => {
    const store = seedStore()
    await store.actions.init()
    // stage（攒批）→ 过防抖窗 flush 成功 → 推 canUndo=true 的 state 进来 → undo 才通过
    await store.actions.stage({ kind: 'move_page', from: 0, to: 1 })
    await vi.runAllTimersAsync()
    expect(store.getSnapshot().lastSeenRevision).toBe(2)
    // 此刻 canUndo=false（STATE_R1 的），undo 不该发出
    await store.actions.undo()
    expect(mockApi.undo).not.toHaveBeenCalled()
    // 推 host 说可撤销
    await store.actions.applyPoll({ ...STATE_R1, manifest: { ...STATE_R1.manifest, revision: 2, canUndo: true } })
    await store.actions.undo()
    expect(mockApi.undo).toHaveBeenCalledWith('s1', 'k1')
    expect(store.getSnapshot().lastSeenRevision).toBe(1)
    store.dispose()
  })

  it('restoreRevision：成功推游标并清选择；409 挂 conflict 横幅', async () => {
    const store = seedStore()
    await store.actions.init()
    mockApi.restoreHistory.mockResolvedValueOnce({ revision: 0, undoneOps: ['add_page'], warnings: [] })
    const ok = await store.actions.restoreRevision(0)
    expect(ok).toBe(true)
    expect(mockApi.restoreHistory).toHaveBeenCalledWith('s1', 'k1', 0, 1)
    const snap = store.getSnapshot()
    expect(snap.lastSeenRevision).toBe(0)
    expect(snap.selection).toBeNull()
    expect(snap.conflict).toBeNull()

    mockApi.restoreHistory.mockRejectedValueOnce(new ConflictError(7))
    const ok2 = await store.actions.restoreRevision(1)
    expect(ok2).toBe(false)
    expect(store.getSnapshot().conflict).toEqual({ revision: 7 })
    store.dispose()
  })

  it('openProject 有草稿/冲突：拒切，不假正经切过去', async () => {
    const store = seedStore()
    await store.actions.init()
    mockApi.edit.mockRejectedValueOnce(new ConflictError(5))
    await store.actions.stage({ kind: 'add_page', at: 0 })
    await vi.runAllTimersAsync() // 过防抖窗，flush 撞 409，draft 留身
    expect(store.getSnapshot().draft).not.toBeNull()
    await store.actions.openProject('other')
    expect(store.getSnapshot().activeKey).toBe('k1')
    expect(mockApi.project, '不得拉 other 的 manifest').toHaveBeenCalledTimes(1) // init 那一次
    store.dispose()
  })

  it('openProject 干净切换：拉 manifest + activeKey 换位 + revision 进 lastSeen', async () => {
    const store = seedStore()
    await store.actions.init()
    mockApi.project.mockResolvedValueOnce({ ...PROJECT_R1, key: 'k2', revision: 7, deck: DECK, pages: DECK.pages.map((path) => ({ path })) })
    await store.actions.openProject('k2')
    const snap = store.getSnapshot()
    expect(snap.activeKey).toBe('k2')
    expect(snap.lastSeenRevision).toBe(7)
    expect(snap.deckPages).toEqual(DECK.pages)
    expect(snap.currentPage).toBe(0)
    expect(snap.draft).toBeNull()
    store.dispose()
  })

  it('setPage 翻页 → 清掉 currentPageData（过期） → ensurePageLoaded 重拉这一页', async () => {
    const store = seedStore()
    await store.actions.init()
    await store.actions.ensurePageLoaded()
    const baseline = store.getSnapshot()
    expect(baseline.currentPageData).toBeTruthy()
    expect(baseline.currentPageRevision).toBe(1)
    // 翻页
    mockApi.page.mockResolvedValueOnce({ ok: true, path: 'pages/02.page', page: { elements: [] }, revision: 1 })
    store.actions.setPage(1)
    // setPage 里顺手调了一次 ensurePageLoaded——它在另一只 promise 上，等一个微任务 + 时钟 tick
    await Promise.resolve()
    await vi.runAllTimersAsync()
    const after = store.getSnapshot()
    expect(after.currentPage).toBe(1)
    expect(after.currentPageData).toEqual({ elements: [] })
    expect(mockApi.page).toHaveBeenCalledWith('s1', 'k1', 'pages/02.page')
    store.dispose()
  })

  it('updateElement 走 stage：op 形状匹配，elementId/page/patch 三项都在', async () => {
    const store = seedStore()
    await store.actions.init()
    await store.actions.ensurePageLoaded()
    const ok = await store.actions.updateElement('el-1', { content: { text: '改了' } })
    expect(ok).toBe(true)
    // 攒批：过防抖窗才真正 flush
    expect(mockApi.edit).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(mockApi.edit).toHaveBeenCalledWith('s1', 'k1', 1, [
      { op: 'update_element', page: 'pages/01.page', elementId: 'el-1', patch: { content: { text: '改了' } } },
    ])
    store.dispose()
  })

  it('合并窗口：/edit 回应 revision 不变，也要重拉页内容（否则「保存一次之后就改不动了」）', async () => {
    const store = seedStore()
    await store.actions.init()
    await store.actions.ensurePageLoaded()
    expect(store.getSnapshot().currentPageRevision).toBe(1)
    // history.ts 的 merge window：30s 内同 session 的连写并进同一份快照，revision 停在旧值
    mockApi.edit.mockResolvedValueOnce({ ok: true, revision: 1, appliedOps: [], warnings: [] })
    mockApi.page.mockResolvedValue({
      ok: true,
      path: 'pages/01.page',
      page: { elements: [{ elementId: 'el-1', content: { text: '服务端已存' } }] },
      revision: 1,
    })
    await store.actions.updateElement('el-1', { content: { text: '改了' } })
    await vi.runAllTimersAsync()
    // revision 没前进：旧实现据此认定「磁盘没变」，屏上永远停在旧 AST
    expect(store.getSnapshot().lastSeenRevision).toBe(1)
    await Promise.resolve()
    await vi.runAllTimersAsync()
    expect(store.getSnapshot().currentPageData).toEqual({
      elements: [{ elementId: 'el-1', content: { text: '服务端已存' } }],
    })
    store.dispose()
  })

  it('movePage / duplicatePage / removePage / addPage 各自走对应 op 的 stage', async () => {
    const store = seedStore()
    await store.actions.init()
    // 攒批期：每次 stage 都把 op 加进 draft，过防抖窗一次性送出——所以四次 stage 合并成一次 edit 调用
    await store.actions.movePage('pages/01.page', 1)
    await store.actions.duplicatePage('pages/02.page')
    await store.actions.removePage('pages/02.page')
    await store.actions.addPage()
    await vi.runAllTimersAsync()
    expect(mockApi.edit).toHaveBeenCalledTimes(1)
    expect(mockApi.edit.mock.calls[0][3]).toEqual([
      { op: 'move_page', page: 'pages/01.page', toIndex: 1 },
      { op: 'page_duplicate', page: 'pages/02.page' },
      { op: 'remove_page', page: 'pages/02.page' },
      { op: 'add_page', content: { elements: [] } },
    ])
    store.dispose()
  })

  it('undo 成功后推进 lastSeenRevision、清页 AST 缓存，并随后自动重拉页内容', async () => {
    const store = seedStore()
    await store.actions.init()
    await store.actions.stage({ op: 'update_page', page: 'pages/01.page', patch: {} })
    await vi.runAllTimersAsync() // 过防抖窗 flush 成功，lastSeenRevision 才到 2
    expect(store.getSnapshot().lastSeenRevision).toBe(2)
    await store.actions.applyPoll({ ...STATE_R1, manifest: { ...STATE_R1.manifest, revision: 2, canUndo: true } })
    // 先拉一页进 pagesAst，验证 undo 会清掉它
    mockApi.page.mockResolvedValueOnce({ ok: true, path: 'pages/01.page', page: { elements: [{ elementId: 'e1' }] }, revision: 2 })
    await store.actions.ensurePageAst(0)
    expect(store.getSnapshot().pagesAst[0]).toBeTruthy()
    mockApi.undo.mockResolvedValueOnce({ ok: true, revision: 3, undoneOps: ['u1'] })
    mockApi.page.mockResolvedValueOnce({ ok: true, path: 'pages/01.page', page: { elements: [] }, revision: 3 })
    await store.actions.undo()
    expect(store.getSnapshot().lastSeenRevision).toBe(3)
    expect(store.getSnapshot().pagesAst).toEqual({})
    // undo 完了之后顺手 ensurePageLoaded：等一个微任务 + 时钟 tick 让那次 async 走完
    await Promise.resolve()
    await vi.runAllTimersAsync()
    expect(store.getSnapshot().currentPageData).toEqual({ elements: [] })
    expect(store.getSnapshot().currentPageRevision).toBe(3)
    store.dispose()
  })

  it('uploadMedia 走 /media/upload 通道：宿主要 key 与 base64 data， 返回 src 不会自动改元素', async () => {
    const store = seedStore()
    await store.actions.init()
    const res = await store.actions.uploadMedia({ name: 'cat.png', mime: 'image/png', data: 'aGVsbG8=' })
    expect(mockApi.uploadMedia).toHaveBeenCalledWith('s1', 'k1', { name: 'cat.png', mime: 'image/png', data: 'aGVsbG8=' })
    expect(res.src).toBe('media/x.png')
    // 不上人不要把元素 src 写进去——那是 Inspector 去调用 updateElement('id', {src}) 的活
    expect(mockApi.edit).not.toHaveBeenCalled()
    store.dispose()
  })
})
