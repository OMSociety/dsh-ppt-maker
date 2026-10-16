import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createProject,
  editProject,
  OpError,
  ProjectError,
  redoProject,
  resolveProjectDir,
  undoProject
} from '../src/core/project/store.js'
import { DEFAULT_HISTORY_LIMIT, DEFAULT_MERGE_WINDOW_MS, setHistoryPolicy } from '../src/core/project/history.js'

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-store-'))
  setHistoryPolicy({ limit: DEFAULT_HISTORY_LIMIT, mergeWindowMs: DEFAULT_MERGE_WINDOW_MS })
})

afterEach(async () => {
  setHistoryPolicy({ limit: DEFAULT_HISTORY_LIMIT, mergeWindowMs: DEFAULT_MERGE_WINDOW_MS })
  await rm(cwd, { recursive: true, force: true })
})

async function exists(rel: string): Promise<boolean> {
  try {
    await access(path.join(cwd, rel))
    return true
  } catch {
    return false
  }
}

describe('project store（工程层）', () => {
  it('createProject：manifest revision 0 + 目录骨架 + r0000 锚点', async () => {
    const { manifest } = await createProject(cwd, { dir: 'proj', title: '测试', sessionId: 's1' })
    expect(manifest.revision).toBe(0)
    expect(await exists('proj/deck.pptd')).toBe(true)
    expect(await exists('proj/manifest.json')).toBe(true)
    expect(await exists('proj/.history/r0000/meta.json')).toBe(true)
    const deck = await readFile(path.join(cwd, 'proj', 'deck.pptd'), 'utf8')
    expect(deck).toContain('profile: generate')
    expect(deck).toContain('title: 测试')
  })

  it('重复创建 → ProjectAlreadyExists 409', async () => {
    await createProject(cwd, { dir: 'proj' })
    await expect(createProject(cwd, { dir: 'proj' })).rejects.toMatchObject({ code: 'ProjectAlreadyExists', status: 409 })
  })

  it('editProject：add_page + add_element 原子落盘，revision 推进', async () => {
    await createProject(cwd, { dir: 'proj', sessionId: 's1' })
    const result = await editProject(cwd, {
      dir: 'proj',
      sessionId: 's1',
      baseRevision: 0,
      ops: [
        { op: 'add_page', page: 'pages/01.page', content: { elements: [] } },
        { op: 'add_element', page: 'pages/01.page', element: { elementType: 'text', elementId: 't1', bounds: [0, 0, 100, 50], content: 'hi' } }
      ]
    })
    expect(result.revision).toBe(1)
    expect(result.appliedOps).toHaveLength(2)
    const page = await readFile(path.join(cwd, 'proj', 'pages', '01.page'), 'utf8')
    expect(page).toContain('elementId: t1')
  })

  it('baseRevision 不匹配 → RevisionMismatch 409（乐观锁）', async () => {
    await createProject(cwd, { dir: 'proj', sessionId: 's1' })
    await editProject(cwd, { dir: 'proj', sessionId: 's1', ops: [{ op: 'add_page' }] })
    await expect(editProject(cwd, { dir: 'proj', ops: [{ op: 'add_page' }], baseRevision: 5 })).rejects.toMatchObject({
      code: 'RevisionMismatch',
      status: 409,
      detail: { expected: 1, actual: 5 }
    })
  })

  it('别名 page_add / page_delete 映射到 add_page / remove_page', async () => {
    await createProject(cwd, { dir: 'proj', sessionId: 's1' })
    const add = await editProject(cwd, { dir: 'proj', sessionId: 's1', ops: [{ op: 'page_add', page: 'pages/01.page' }] })
    expect(add.appliedOps[0]).toContain('add_page')
    expect(await exists('proj/pages/01.page')).toBe(true)
    const del = await editProject(cwd, { dir: 'proj', sessionId: 's2', baseRevision: add.revision, ops: [{ op: 'page_delete', page: 'pages/01.page' }] })
    expect(del.appliedOps[0]).toContain('remove_page')
    expect(await exists('proj/pages/01.page')).toBe(false)
  })

  it('ops 原子性：批内任一失败整批不落盘', async () => {
    await createProject(cwd, { dir: 'proj', sessionId: 's1' })
    await expect(
      editProject(cwd, {
        dir: 'proj',
        sessionId: 's1',
        ops: [
          { op: 'add_page', page: 'pages/02.page' },
          { op: 'update_element', page: 'pages/02.page', elementId: 'ghost', patch: {} }
        ]
      })
    ).rejects.toBeInstanceOf(OpError)
    expect(await exists('proj/pages/02.page')).toBe(false)
    expect((await readFile(path.join(cwd, 'proj', 'manifest.json'), 'utf8')).includes('"revision": 0')).toBe(true)
  })

  it('undo/redo 全链（关合并窗）：create → edit×3 → undo 2 → redo 2', async () => {
    setHistoryPolicy({ mergeWindowMs: 0 })
    await createProject(cwd, { dir: 'proj', sessionId: 's1' })
    for (let i = 1; i <= 3; i++) {
      await editProject(cwd, {
        dir: 'proj',
        sessionId: 's1',
        baseRevision: i - 1,
        ops: [{ op: 'add_page', page: `pages/0${i}.page`, content: { elements: [] } }]
      })
    }
    const undone = await undoProject(cwd, 'proj', 2)
    expect(undone.revision).toBe(1)
    expect(undone.undoneOps).toHaveLength(2)
    expect(await exists('proj/pages/03.page')).toBe(false)
    expect(await exists('proj/pages/01.page')).toBe(true)

    const redone = await redoProject(cwd, 'proj', 2)
    expect(redone.revision).toBe(3)
    expect(redone.undoneOps).toHaveLength(2)
    expect(await exists('proj/pages/03.page')).toBe(true)
  })

  it('undo 后新编辑剪掉死分支，redo 无步可重做时温和返回', async () => {
    setHistoryPolicy({ mergeWindowMs: 0 })
    await createProject(cwd, { dir: 'proj', sessionId: 's1' })
    await editProject(cwd, { dir: 'proj', sessionId: 's1', baseRevision: 0, ops: [{ op: 'add_page', page: 'pages/01.page' }] })
    await editProject(cwd, { dir: 'proj', sessionId: 's1', baseRevision: 1, ops: [{ op: 'add_page', page: 'pages/02.page' }] })
    await undoProject(cwd, 'proj', 1)
    await editProject(cwd, { dir: 'proj', sessionId: 's1', baseRevision: 1, ops: [{ op: 'add_page', page: 'pages/09.page' }] })
    const redone = await redoProject(cwd, 'proj', 5)
    expect(redone.revision).toBe(2)
    expect(await exists('proj/pages/09.page')).toBe(true)
    expect(await exists('proj/pages/02.page')).toBe(false)
  })

  it('undo 无可撤步骤：温和返回原 revision', async () => {
    await createProject(cwd, { dir: 'proj', sessionId: 's1' })
    const r = await undoProject(cwd, 'proj', 1)
    expect(r.revision).toBe(0)
    expect(r.undoneOps).toEqual([])
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('resolveProjectDir：越出 cwd → PathOutsideCwd 400；空 cwd → SessionCwdMissing', () => {
    expect(() => resolveProjectDir(cwd, '../evil')).toThrowError(
      expect.objectContaining({ code: 'PathOutsideCwd', status: 400 }) as Error
    )
    expect(() => resolveProjectDir('', 'x')).toThrowError(expect.objectContaining({ code: 'SessionCwdMissing' }) as Error)
  })

  it('manifest 缺失 → ManifestMissing 404', async () => {
    await createProject(cwd, { dir: 'proj' })
    await rm(path.join(cwd, 'proj', 'manifest.json'))
    await expect(editProject(cwd, { dir: 'proj', ops: [{ op: 'add_page' }] })).rejects.toMatchObject({ code: 'ManifestMissing', status: 404 })
  })

  it('未知 op → OpError 指明词表', async () => {
    await createProject(cwd, { dir: 'proj' })
    await expect(editProject(cwd, { dir: 'proj', ops: [{ op: 'nope' }] })).rejects.toThrow(/未知 op/)
  })
})

describe('合并窗口（默认 30s）', () => {
  it('同会话快速连续编辑合并为同一修订', async () => {
    await createProject(cwd, { dir: 'proj', sessionId: 's1' })
    const first = await editProject(cwd, { dir: 'proj', sessionId: 's1', baseRevision: 0, ops: [{ op: 'add_page', page: 'pages/01.page' }] })
    expect(first.revision).toBe(1)
    expect(first.merged).toBe(false)
    const second = await editProject(cwd, { dir: 'proj', sessionId: 's1', baseRevision: 1, ops: [{ op: 'add_page', page: 'pages/02.page' }] })
    expect(second.merged).toBe(true)
    expect(second.revision).toBe(1)
    // 合并后 undo 一步直接回锚点
    const undone = await undoProject(cwd, 'proj', 1)
    expect(undone.revision).toBe(0)
    expect(undone.undoneOps).toHaveLength(2)
  })
})

describe('ProjectError 形态', () => {
  it('是 Error 子类且带 code/status', async () => {
    await createProject(cwd, { dir: 'proj' })
    const err = await createProject(cwd, { dir: 'proj' }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ProjectError)
    expect((err as ProjectError).code).toBe('ProjectAlreadyExists')
  })
})
