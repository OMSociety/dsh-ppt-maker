/**
 * restoreProject（显式恢复到历史版本）的 store 级契约：
 *  - 目标 = 当前版本 → 安全 no-op
 *  - 非整数 / 负数 → 400 InvalidRevision
 *  - 快照不存在 → 409 SnapshotUnavailable（moveCursor 口径）
 *  - 恢复后工程文件内容与快照逐字一致（checksum 走 manifest）
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProject, editProject, loadProject, restoreProject } from '../src/core/project/store.js'
import { setHistoryPolicy, DEFAULT_HISTORY_LIMIT, DEFAULT_MERGE_WINDOW_MS } from '../src/core/project/history.js'

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-restore-'))
  setHistoryPolicy({ limit: DEFAULT_HISTORY_LIMIT, mergeWindowMs: 0 })
})

afterEach(async () => {
  setHistoryPolicy({ limit: DEFAULT_HISTORY_LIMIT, mergeWindowMs: DEFAULT_MERGE_WINDOW_MS })
  await rm(cwd, { recursive: true, force: true })
})

describe('restoreProject', () => {
  it('no-op / 非法输入 / 快照缺失 三个边界都给确定答复', async () => {
    await createProject(cwd, { dir: 'deck', title: '恢复测试', sessionId: 's1' })

    // 非法输入
    await expect(restoreProject(cwd, 'deck', 1.5)).rejects.toMatchObject({ code: 'InvalidRevision', status: 400 })
    await expect(restoreProject(cwd, 'deck', -1)).rejects.toMatchObject({ code: 'InvalidRevision', status: 400 })

    // 目标 = 当前版本 → no-op
    const noop = await restoreProject(cwd, 'deck', 0)
    expect(noop).toMatchObject({ revision: 0, undoneOps: [] })
    expect(noop.warnings[0]).toContain('无需恢复')

    // 推进到 r1 后要求恢复到不存在的 r5 → 409（moveCursor 的快照缺失口径）
    await editProject(cwd, {
      dir: 'deck',
      baseRevision: 0,
      ops: [{ op: 'add_page', page: 'pages/01.page', content: { elements: [] } }],
      sessionId: 's1'
    })
    await expect(restoreProject(cwd, 'deck', 5)).rejects.toMatchObject({ code: 'SnapshotUnavailable', status: 409 })
  })

  it('恢复到旧版本后工程内容与快照一致，且可前向恢复', async () => {
    await createProject(cwd, { dir: 'deck', title: '恢复测试', sessionId: 's1' })
    await editProject(cwd, {
      dir: 'deck',
      baseRevision: 0,
      ops: [
        { op: 'add_page', page: 'pages/01.page', content: { elements: [] } },
        { op: 'add_element', page: 'pages/01.page', element: { elementType: 'text', elementId: 't1', bounds: [0, 0, 100, 40], content: '第一版' } }
      ],
      sessionId: 's1'
    })
    await editProject(cwd, {
      dir: 'deck',
      baseRevision: 1,
      ops: [{ op: 'update_element', page: 'pages/01.page', elementId: 't1', patch: { content: '第二版' } }],
      sessionId: 's1'
    })

    const back = await restoreProject(cwd, 'deck', 1)
    expect(back.revision).toBe(1)
    const r1 = await loadProject(cwd, 'deck')
    expect(r1.manifest.revision).toBe(1)
    const page1 = r1.pages.get('pages/01.page') as { elements: Array<{ content?: string }> }
    expect(page1.elements[0].content).toBe('第一版')

    const fwd = await restoreProject(cwd, 'deck', 2)
    expect(fwd.revision).toBe(2)
    const r2 = await loadProject(cwd, 'deck')
    const page2 = r2.pages.get('pages/01.page') as { elements: Array<{ content?: string }> }
    expect(page2.elements[0].content).toBe('第二版')
  })
})
