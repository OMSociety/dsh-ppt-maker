import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  appendSnapshot,
  enforceLimit,
  listSnapshots,
  pruneAbove,
  readMeta,
  setHistoryPolicy,
  sha1Of,
  verifyMedia,
  DEFAULT_HISTORY_LIMIT,
  DEFAULT_MERGE_WINDOW_MS,
  type SnapshotState
} from '../src/core/project/history.js'

function state(label: string, media: SnapshotState['media'] = []): SnapshotState {
  return {
    deck: `# ${label}\npages:\n  - pages/01.page\n`,
    pages: new Map([['pages/01.page', `elements: [] # ${label}\n`]]),
    media
  }
}

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'ppt-history-'))
  setHistoryPolicy({ limit: DEFAULT_HISTORY_LIMIT, mergeWindowMs: DEFAULT_MERGE_WINDOW_MS })
})

afterEach(async () => {
  setHistoryPolicy({ limit: DEFAULT_HISTORY_LIMIT, mergeWindowMs: DEFAULT_MERGE_WINDOW_MS })
  await rm(dir, { recursive: true, force: true })
})

describe('history（append-only 日志）', () => {
  it('force 锚点 + 普通追加：不合并，meta.ops 记录', async () => {
    await appendSnapshot(dir, state('r0'), { baseRevision: -1, revision: 0, sessionId: null, ops: ['create'], force: true })
    const r1 = await appendSnapshot(dir, state('r1'), { baseRevision: 0, revision: 1, sessionId: 's1', ops: ['add_page pages/01.page'] })
    expect(r1.merged).toBe(false)
    const snaps = await listSnapshots(dir)
    expect(snaps.map((s) => s.revision)).toEqual([0, 1])
    expect(snaps[1].ops).toEqual(['add_page pages/01.page'])
    expect(snaps[0].anchor).toBe(true)
  })

  it('合并窗口：同会话、光标在 tip、窗口未过 → 合并且 revision 保持', async () => {
    setHistoryPolicy({ mergeWindowMs: 60_000 })
    await appendSnapshot(dir, state('r0'), { baseRevision: -1, revision: 0, sessionId: null, ops: ['create'], force: true })
    await appendSnapshot(dir, state('r1'), { baseRevision: 0, revision: 1, sessionId: 's1', ops: ['op1'] })
    const r2 = await appendSnapshot(dir, state('r2'), { baseRevision: 1, revision: 2, sessionId: 's1', ops: ['op2'] })
    expect(r2.merged).toBe(true)
    const snaps = await listSnapshots(dir)
    expect(snaps.map((s) => s.revision)).toEqual([0, 1])
    const meta = await readMeta(snaps[1].dir)
    expect(meta?.mergedCount).toBe(1)
    expect(meta?.ops).toEqual(['op1', 'op2'])
  })

  it('合并窗口：会话不同不合并', async () => {
    setHistoryPolicy({ mergeWindowMs: 60_000 })
    await appendSnapshot(dir, state('r0'), { baseRevision: -1, revision: 0, sessionId: null, ops: ['create'], force: true })
    await appendSnapshot(dir, state('r1'), { baseRevision: 0, revision: 1, sessionId: 's1', ops: ['op1'] })
    const r2 = await appendSnapshot(dir, state('r2'), { baseRevision: 1, revision: 2, sessionId: 's2', ops: ['op2'] })
    expect(r2.merged).toBe(false)
    expect((await listSnapshots(dir)).map((s) => s.revision)).toEqual([0, 1, 2])
  })

  it('上限驱逐：第 0 号锚点永不驱逐', async () => {
    setHistoryPolicy({ mergeWindowMs: 0, limit: 3 })
    await appendSnapshot(dir, state('r0'), { baseRevision: -1, revision: 0, sessionId: null, ops: ['create'], force: true })
    for (let i = 1; i <= 5; i++) {
      await appendSnapshot(dir, state(`r${i}`), { baseRevision: i - 1, revision: i, sessionId: `s${i}`, ops: [`op${i}`] })
    }
    await enforceLimit(dir)
    const snaps = await listSnapshots(dir)
    expect(snaps[0].revision).toBe(0)
    expect(snaps.map((s) => s.revision)).toEqual([0, 4, 5])
  })

  it('pruneAbove 剪掉被放弃的前向分支', async () => {
    setHistoryPolicy({ mergeWindowMs: 0 })
    await appendSnapshot(dir, state('r0'), { baseRevision: -1, revision: 0, sessionId: null, ops: ['create'], force: true })
    for (let i = 1; i <= 3; i++) {
      await appendSnapshot(dir, state(`r${i}`), { baseRevision: i - 1, revision: i, sessionId: `s${i}`, ops: [`op${i}`] })
    }
    const pruned = await pruneAbove(dir, 1)
    expect(pruned).toEqual([2, 3])
    expect((await listSnapshots(dir)).map((s) => s.revision)).toEqual([0, 1])
  })

  it('media 哈希校验：存在→通过，删除→missing', async () => {
    await mkdir(path.join(dir, 'media'), { recursive: true })
    await writeFile(path.join(dir, 'media', 'a.bin'), 'hello')
    const entries = [{ path: 'media/a.bin', sha1: sha1Of('hello'), bytes: 5 }]
    let v = await verifyMedia(dir, entries)
    expect(v.missing).toEqual([])
    expect(v.mismatched).toEqual([])

    await rm(path.join(dir, 'media', 'a.bin'))
    v = await verifyMedia(dir, entries)
    expect(v.missing).toEqual(['media/a.bin'])

    await writeFile(path.join(dir, 'media', 'a.bin'), 'tampered')
    v = await verifyMedia(dir, entries)
    expect(v.mismatched).toEqual([{ path: 'media/a.bin', expected: sha1Of('hello'), actual: sha1Of('tampered') }])
    await readFile(path.join(dir, 'media', 'a.bin'), 'utf8') // sanity
  })
})
