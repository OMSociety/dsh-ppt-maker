/**
 * 逆向保真（spec §10.4）：源存档 + 未改页整页恢复。
 *
 * 三条主线：
 *  1. reverseImport 落 source/original.pptx，deck.source 记账 archive/originalSha1；
 *  2. 零编辑时 buildProjectDeck 整份从存档恢复（buildWarnings 带恢复说明），
 *     编辑后（update_page 触内容字段）sourceRef 失效、回退逐页重建；
 *  3. planSourceRestore 的存档级门槛（sha1 不一致 / 存档缺失 / 页数不符 → 全回退）。
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { reverseImport } from '../src/core/reverse/index.js'
import { editProject, loadProject } from '../src/core/project/store.js'
import { buildProjectDeck } from '../src/core/export-pipeline.js'
import { planSourceRestore } from '../src/core/reverse/restore.js'
import { buildChartPptx, buildFixturePptx } from './__fixtures__/pptx-fixtures.js'

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-restore-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe('源存档与整页恢复', () => {
  it('导入落 source/original.pptx，deck.source 记账，零编辑导出整份恢复', async () => {
    const bytes = await buildChartPptx()
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })

    const archiveAbs = path.join(cwd, 'proj', 'source', 'original.pptx')
    const archiveBytes = new Uint8Array(await readFile(archiveAbs))
    const sha1 = createHash('sha1').update(bytes).digest('hex')
    expect(createHash('sha1').update(archiveBytes).digest('hex')).toBe(sha1)

    const loaded = await loadProject(cwd, 'proj')
    expect(loaded.deck.source?.archive).toBe('source/original.pptx')
    expect(loaded.deck.source?.originalSha1).toBe(sha1)

    // 零编辑 → 整份恢复：chart 部件回来，dropped 的占位不再是唯一出口。
    const pipeline = await buildProjectDeck(cwd, 'proj')
    expect(pipeline.buildWarnings.some((w) => w.includes('零编辑') && w.includes('源存档恢复'))).toBe(true)
  })

  it('update_page 触内容字段 → sourceRef 失效，整份回退逐页重建', async () => {
    const bytes = await buildFixturePptx()
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const before = await loadProject(cwd, 'proj')

    const decision = await planSourceRestore(before.deck, [...before.pages.values()], path.join(cwd, 'proj'))
    expect(decision.archiveReady).toBe(true)
    expect(decision.restorePage.every(Boolean)).toBe(true)

    // 改一个元素的文字 → invalidatePageProvenance 清掉整页 sourceRef。
    await editProject(cwd, {
      dir: 'proj',
      baseRevision: before.manifest.revision,
      sessionId: 's1',
      ops: [{ op: 'update_page', page: 'pages/01.page', patch: { notes: '编辑痕迹' } }]
    })

    const after = await loadProject(cwd, 'proj')
    const page = after.pages.get('pages/01.page')
    expect(page?.elements.every((el) => (el as { sourceRef?: unknown }).sourceRef === undefined)).toBe(true)

    const pipeline = await buildProjectDeck(cwd, 'proj')
    expect(pipeline.buildWarnings.some((w) => w.includes('源存档恢复'))).toBe(false)
  })

  it('存档指纹不一致 / 存档缺失 → planSourceRestore 全回退', async () => {
    const bytes = await buildFixturePptx()
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    const projAbs = path.join(cwd, 'proj')

    // 篡改存档。
    await writeFile(path.join(projAbs, 'source', 'original.pptx'), new Uint8Array([1, 2, 3]))
    const tampered = await planSourceRestore(loaded.deck, [...loaded.pages.values()], projAbs)
    expect(tampered.archiveReady).toBe(false)
    expect(tampered.notes.some((n) => n.includes('指纹'))).toBe(true)

    // 存档缺失。
    await rm(path.join(projAbs, 'source'), { recursive: true, force: true })
    const missing = await planSourceRestore(loaded.deck, [...loaded.pages.values()], projAbs)
    expect(missing.archiveReady).toBe(false)
    expect(missing.notes.some((n) => n.includes('读不到'))).toBe(true)
  })

  it('generate 方言工程不触发恢复轨', async () => {
    const decision = await planSourceRestore(
      { pages: [], elements: [] } as never,
      [],
      cwd,
    )
    expect(decision.archiveReady).toBe(false)
  })
})
