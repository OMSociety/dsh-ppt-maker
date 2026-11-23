/**
 * 逆向保真（spec §10.4）：源存档骨架 + 逐页沿用。
 *
 * 主线：
 *  1. reverseImport 落 source/original.pptx，deck.source 记账 archive/originalSha1；
 *  2. 页指纹未变的页沿用源页，改过的页按 PPTD 重建并挂回源版式；页可重排、删除；
 *  3. planSourceRestore 的存档级门槛（sha1 不一致 / 存档缺失 → 从空白文档重建）。
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addBlankSlide,
  addSlideTextBox,
  createPresentation,
  emu,
  getShapeBounds,
  getShapeChartSpec,
  getShapeText,
  getSlideLayout,
  getSlideLayoutPartName,
  getSlideShapes,
  getSlides,
  isChartShape,
  loadPresentation,
  savePresentation
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/index.js'
import { editProject, loadProject } from '../src/core/project/store.js'
import { buildProjectDeck, saveRawProjectPptx } from '../src/core/export-pipeline.js'
import { planSourceRestore } from '../src/core/reverse/restore.js'
import { buildChartPptx, buildFixturePptx } from './__fixtures__/pptx-fixtures.js'

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-restore-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

async function threePageDeck(): Promise<Uint8Array> {
  const pres = createPresentation({ size: '16:9' })
  for (const word of ['甲页', '乙页', '丙页']) {
    const slide = addBlankSlide(pres)
    addSlideTextBox(slide, { text: word, x: emu(100 * 12700), y: emu(100 * 12700), w: emu(300 * 12700), h: emu(60 * 12700) })
  }
  return savePresentation(pres)
}

async function exportedTexts(): Promise<string[]> {
  const pipeline = await buildProjectDeck(cwd, 'proj')
  const pres = await loadPresentation(await saveRawProjectPptx(pipeline))
  return getSlides(pres).map((slide) => getSlideShapes(slide).map((s) => getShapeText(s)).join('|'))
}

describe('源存档骨架与逐页沿用', () => {
  it('导入落 source/original.pptx，deck.source 记账；零编辑导出全部页沿用（图表原样）', async () => {
    const bytes = await buildChartPptx()
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })

    const archiveAbs = path.join(cwd, 'proj', 'source', 'original.pptx')
    const archiveBytes = new Uint8Array(await readFile(archiveAbs))
    const sha1 = createHash('sha1').update(bytes).digest('hex')
    expect(createHash('sha1').update(archiveBytes).digest('hex')).toBe(sha1)

    const loaded = await loadProject(cwd, 'proj')
    expect(loaded.deck.source?.archive).toBe('source/original.pptx')
    expect(loaded.deck.source?.originalSha1).toBe(sha1)

    const pipeline = await buildProjectDeck(cwd, 'proj')
    expect(pipeline.buildWarnings.some((w) => w.includes('直接沿用源存档页'))).toBe(true)
    const pres = await loadPresentation(await saveRawProjectPptx(pipeline))
    expect(getSlides(pres).some((slide) => getSlideShapes(slide).some((s) => isChartShape(s)))).toBe(true)
  })

  it('改一页：其余页沿用源页，改过的页按 PPTD 重建并挂回源版式', async () => {
    const bytes = await buildFixturePptx()
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const before = await loadProject(cwd, 'proj')
    const pageCount = before.deck.pages.length

    const decision = await planSourceRestore(before.deck, before.deck.pages.map((p) => before.pages.get(String(p))!), path.join(cwd, 'proj'))
    expect(decision.archiveReady).toBe(true)
    expect(decision.restoreFrom).toEqual([...Array(pageCount).keys()])

    await editProject(cwd, {
      dir: 'proj',
      baseRevision: before.manifest.revision,
      sessionId: 's1',
      ops: [{ op: 'update_page', page: 'pages/01.page', patch: { notes: '编辑痕迹' } }]
    })
    const after = await loadProject(cwd, 'proj')
    const pages = after.deck.pages.map((p) => after.pages.get(String(p))!)
    const next = await planSourceRestore(after.deck, pages, path.join(cwd, 'proj'))
    expect(next.restoreFrom[0]).toBeNull()
    expect(next.restoreFrom.slice(1)).toEqual([...Array(pageCount).keys()].slice(1))

    const pipeline = await buildProjectDeck(cwd, 'proj')
    expect(pipeline.buildWarnings.some((w) => w.includes(`${pageCount - 1} 页原样保留，1 页按 PPTD 重建`))).toBe(true)
    const pres = await loadPresentation(await saveRawProjectPptx(pipeline))
    const slides = getSlides(pres)
    expect(slides).toHaveLength(pageCount)
    const layoutRef = (pages[0] as { layoutRef?: { partName?: string } }).layoutRef
    if (layoutRef?.partName) expect(getSlideLayoutPartName(getSlideLayout(slides[0])!)).toBe(layoutRef.partName)
  })

  it('占位直通：重建页上的 placeholder 从源存档拷回原件，并按占位 bounds 定位', async () => {
    const bytes = await buildChartPptx('radar')
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const before = await loadProject(cwd, 'proj')
    const pageKey = String(before.deck.pages[0])
    const ph = before.pages.get(pageKey)!.elements.find((e) => e.elementType === 'placeholder') as
      | { elementId: string; sourceRef?: unknown }
      | undefined
    expect(ph?.sourceRef).toBeDefined()

    await editProject(cwd, {
      dir: 'proj',
      baseRevision: before.manifest.revision,
      sessionId: 's1',
      ops: [
        { op: 'update_page', page: pageKey, patch: { notes: '编辑痕迹' } },
        { op: 'update_element', page: pageKey, elementId: ph!.elementId, patch: { bounds: [40, 50, 320, 200] } }
      ]
    })
    const after = await loadProject(cwd, 'proj')
    const kept = after.pages.get(pageKey)!.elements.find((e) => e.elementId === ph!.elementId) as { sourceRef?: unknown }
    expect(kept.sourceRef).toEqual(ph!.sourceRef)

    const pipeline = await buildProjectDeck(cwd, 'proj')
    expect(pipeline.buildWarnings.some((w) => w.includes('按 PPTD 重建'))).toBe(true)
    const pres = await loadPresentation(await saveRawProjectPptx(pipeline))
    const chart = getSlideShapes(getSlides(pres)[0]).find((s) => isChartShape(s))
    expect(chart).toBeDefined()
    expect(getShapeBounds(chart!)).toEqual({ x: 40 * 12700, y: 50 * 12700, w: 320 * 12700, h: 200 * 12700 })
    expect(getShapeChartSpec(chart!)?.kind).toBe('radar')
  })

  it('重排与删页：按指纹逐页沿用，导出页序跟随 deck.pages', async () => {
    await reverseImport({ cwd, source: await threePageDeck(), targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    expect(await exportedTexts()).toEqual(['甲页', '乙页', '丙页'])

    await editProject(cwd, {
      dir: 'proj',
      baseRevision: loaded.manifest.revision,
      sessionId: 's1',
      ops: [
        { op: 'move_page', page: 'pages/03.page', toIndex: 0 },
        { op: 'remove_page', page: 'pages/02.page' }
      ]
    })
    expect(await exportedTexts()).toEqual(['丙页', '甲页'])
    const pipeline = await buildProjectDeck(cwd, 'proj')
    expect(pipeline.buildWarnings.some((w) => w.includes('全部 2 页内容自导入后未变'))).toBe(true)
  })

  it('存档指纹不一致 / 存档缺失 → 从空白文档重建；页指纹缺失 → 存档骨架 + 全部重建', async () => {
    const bytes = await buildFixturePptx()
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    const projAbs = path.join(cwd, 'proj')
    const pages = loaded.deck.pages.map((ref) => loaded.pages.get(String(ref))!)

    await rm(path.join(projAbs, 'source', 'page-fingerprints.json'))
    const noPrints = await planSourceRestore(loaded.deck, pages, projAbs)
    expect(noPrints.archiveReady).toBe(true)
    expect(noPrints.restoreFrom.every((v) => v === null)).toBe(true)

    await writeFile(path.join(projAbs, 'source', 'original.pptx'), new Uint8Array([1, 2, 3]))
    const tampered = await planSourceRestore(loaded.deck, pages, projAbs)
    expect(tampered.archiveReady).toBe(false)
    expect(tampered.notes.some((n) => n.includes('指纹'))).toBe(true)

    await rm(path.join(projAbs, 'source'), { recursive: true, force: true })
    const missing = await planSourceRestore(loaded.deck, pages, projAbs)
    expect(missing.archiveReady).toBe(false)
    expect(missing.notes.some((n) => n.includes('读不到'))).toBe(true)
  })

  it('按导入时页指纹对账：删空页、保留 sourceRef 改字都判为已改', async () => {
    const bytes = await buildFixturePptx()
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    const projAbs = path.join(cwd, 'proj')
    const pages = loaded.deck.pages.map((ref) => loaded.pages.get(String(ref))!)

    const emptied = pages.map((page, i) => (i === 0 ? { ...page, elements: [] } : page))
    expect((await planSourceRestore(loaded.deck, emptied, projAbs)).restoreFrom[0]).toBeNull()

    const retexted = pages.map((page, i) =>
      i === 0
        ? {
            ...page,
            elements: page.elements.map((el) =>
              el.elementType === 'text' ? { ...el, content: { ...(el as { content?: object }).content, text: '偷偷改字' } } : el
            )
          }
        : page
    )
    expect((await planSourceRestore(loaded.deck, retexted as typeof pages, projAbs)).restoreFrom[0]).toBeNull()
  })

  it('generate 方言工程不触发存档轨', async () => {
    const decision = await planSourceRestore({ pages: [], elements: [] } as never, [], cwd)
    expect(decision.archiveReady).toBe(false)
  })
})
