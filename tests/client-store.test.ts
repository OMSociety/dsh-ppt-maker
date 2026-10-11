/**
 * PptStore 时序与纪律：mock 掉 client/api.ts 的 fetch，只验证 store 的**决策**——
 * init 把 /state 拉进快照；applyPoll 无草稿静默重载、有草稿只亮「外部已修改」；
 * stage 立 flush、409 挂 conflict 且 draft 留身；undo 之前草稿必须先 flush。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  uploadMedia: vi.fn(),
  exportPptx: vi.fn(),
  thumbUrl: vi.fn(() => '/ppt-maker/api/thumb'),
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
  canUndo: false,
  canRedo: false,
}

const DECK = {
  version: 'v3',
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
    // stage → flush → 409：conflict 就位、draft 留身
    mockApi.edit.mockRejectedValueOnce(new ConflictError(5))
    await store.actions.stage({ kind: 'update_page', pageIndex: 0, set: {} })
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
    // stage 会立即 flush；flush 在飞期间 draft 留着、saving=true
    const stagePromise = store.actions.stage({ kind: 'update_page', pageIndex: 0, set: {} })
    // 让 stage 内部的 patch 先发生，再让 flush 发出 fetch（这时候 fetch 还挂着）
    await Promise.resolve()
    await Promise.resolve()
    expect(store.getSnapshot().saving).toBe(true)
    expect(store.getSnapshot().draft).not.toBeNull()
    // 轮询撞上来：不得推进 lastSeenRevision（在飞那次成功了会自动推）
    await store.actions.applyPoll({ ...STATE_R1, manifest: { ...STATE_R1.manifest, revision: 9 } })
    expect(store.getSnapshot().externalChange).toEqual({ revision: 9 })
    expect(store.getSnapshot().lastSeenRevision).toBe(1)
    // flush 成功：draft 清掉、conflict/externalChange 也一并收走（flush 成功补丁里显式清了）
    resolvePending?.({ ok: true, revision: 2, applied: 1 })
    await stagePromise
    expect(store.getSnapshot().saving).toBe(false)
    expect(store.getSnapshot().draft).toBeNull()
    expect(store.getSnapshot().externalChange).toBeNull()
    expect(store.getSnapshot().lastSeenRevision).toBe(2)
    store.dispose()
  })

  it('stage 一杆 op：先记入 draft，再 flush；成功后 draft 清空，lastSeenRevision 推进', async () => {
    const store = seedStore()
    await store.actions.init()
    const ok = await store.actions.stage({ kind: 'update_page', pageIndex: 0, set: { 'a.b': 1 } })
    expect(ok).toBe(true)
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
    expect(ok).toBe(false)
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
    // stage（骨架期立 flush 得先成功）→ 推 canUndo=true 的 state 进来 → undo 才通过
    await store.actions.stage({ kind: 'move_page', from: 0, to: 1 })
    expect(store.getSnapshot().lastSeenRevision).toBe(2)
    // 此刻 canUndo=false（STATE_R1 的），undo 不该发出
    await store.actions.undo()
    expect(mockApi.undo).not.toHaveBeenCalled()
    // 推 host 说可撤销
    await store.actions.applyPoll({ ...STATE_R1, manifest: { ...STATE_R1.manifest, revision: 2 }, canUndo: true })
    await store.actions.undo()
    expect(mockApi.undo).toHaveBeenCalledWith('s1', 'k1')
    expect(store.getSnapshot().lastSeenRevision).toBe(1)
    store.dispose()
  })

  it('openProject 有草稿/冲突：拒切，不假正经切过去', async () => {
    const store = seedStore()
    await store.actions.init()
    mockApi.edit.mockRejectedValueOnce(new ConflictError(5))
    await store.actions.stage({ kind: 'add_page', at: 0 })
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
    // setPage 里顺手调了一次 ensurePageLoaded——它在另一只 promise 上，等一下
    await new Promise((r) => setTimeout(r, 0))
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
    expect(mockApi.edit).toHaveBeenCalledWith('s1', 'k1', 1, [
      { op: 'update_element', page: 'pages/01.page', elementId: 'el-1', patch: { content: { text: '改了' } } },
    ])
    store.dispose()
  })

  it('movePage / duplicatePage / removePage / addPage 各自走对应 op 的 stage', async () => {
    const store = seedStore()
    await store.actions.init()
    // mockApi.edit 总是回 revision: 2——所以第二次 stage 的 base 仍是 2（一杆一送的语义：每次都重置 draft）
    // 这里只关心「各 action 构造出来的 op 形状」，base 值就让 seedStore 那份 mock 来定。
    await store.actions.movePage('pages/01.page', 1)
    expect(mockApi.edit.mock.calls[0]).toEqual(['s1', 'k1', 1, [{ op: 'move_page', page: 'pages/01.page', toIndex: 1 }]])
    await store.actions.duplicatePage('pages/02.page')
    expect(mockApi.edit.mock.calls[1][3]).toEqual([{ op: 'page_duplicate', page: 'pages/02.page' }])
    await store.actions.removePage('pages/02.page')
    expect(mockApi.edit.mock.calls[2][3]).toEqual([{ op: 'remove_page', page: 'pages/02.page' }])
    await store.actions.addPage()
    expect(mockApi.edit.mock.calls[3][3]).toEqual([{ op: 'add_page', content: { elements: [] } }])
    store.dispose()
  })

  it('undo 成功后推进 lastSeenRevision、清页缓存，并随后自动重拉页内容', async () => {
    const store = seedStore()
    await store.actions.init()
    await store.actions.stage({ op: 'update_page', page: 'pages/01.page', patch: {} })
    expect(store.getSnapshot().lastSeenRevision).toBe(2)
    await store.actions.applyPoll({ ...STATE_R1, manifest: { ...STATE_R1.manifest, revision: 2 }, canUndo: true })
    await store.actions.cacheThumb(1, 'data:image/png;base64,x', 2)
    expect(store.getSnapshot().pageCache[1]).toBeTruthy()
    mockApi.undo.mockResolvedValueOnce({ ok: true, revision: 3, undoneOps: ['u1'] })
    mockApi.page.mockResolvedValueOnce({ ok: true, path: 'pages/01.page', page: { elements: [] }, revision: 3 })
    await store.actions.undo()
    expect(store.getSnapshot().lastSeenRevision).toBe(3)
    expect(store.getSnapshot().pageCache).toEqual({})
    // undo 完了之后顺手 ensurePageLoaded：等一个 tick 让那次 async 走完，currentPageData 就该拉起来了
    await new Promise((r) => setTimeout(r, 0))
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
