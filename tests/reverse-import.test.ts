/**
 * Reverse engine tests (PR 2 task-1).
 *
 * Fixtures are built with the same engine that writes production decks
 * (`createOfficeKitEngine`) so this test doubles as a round-trip check:
 * PPTD → pptx (engine) → PPTD (reverse) must preserve the fields the
 * reverse dialect promises to model.
 *
 * Two fixtures cover the spec §10 mapping matrix:
 *   - reverse-fixture.pptx: text with multiple paragraph runs + shape with
 *     adjustments + image with crop + merged-cell table + connector;
 *   - reverse-chart.pptx: a single chart so we can assert `dropped` and the
 *     grey 占位 shape sitting where the chart used to be.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addSlideImage,
  createPresentation,
  emu,
  savePresentation
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/index.js'
import { parse as parseYaml } from 'yaml'
import { loadProject } from '../src/core/project/store.js'
import type { ImportReport } from '../src/core/reverse/types.js'
import type { Page } from '../src/core/pptd/parse.js'
import { buildChartPptx, buildFixturePptx } from './__fixtures__/pptx-fixtures.js'
import { PNG_1PX } from './__fixtures__/pptx-fixtures.js'

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-reverse-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe('reverse engine（PPTX → PPTD 逆向）', () => {
  it('round-trip：fixture pptx 反向导入后字段完整', async () => {
    const bytes = await buildFixturePptx()
    const result = await reverseImport({
      cwd,
      source: bytes,
      targetDir: 'proj',
      sessionId: 's1'
    })

    expect(result.pageCount).toBe(1)
    expect(result.revision).toBe(1) // create r0 + edit r1
    expect(result.dropped).toHaveLength(0)

    // manifest + history + report on disk
    const manifestRaw = await readFile(path.join(cwd, 'proj', 'manifest.json'), 'utf8')
    const manifest = JSON.parse(manifestRaw) as { revision: number }
    expect(manifest.revision).toBe(1)

    const reportRaw = await readFile(path.join(cwd, 'proj', 'import.report.yml'), 'utf8')
    const report = parseYaml(reportRaw) as ImportReport
    expect(report.profile).toBe('reverse')
    expect(report.source.slideCount).toBe(1)
    expect(report.summary.dropped).toBe(0)

    // Re-load through the PR 1 store to prove the project is well-formed.
    const loaded = await loadProject(cwd, 'proj')
    expect(loaded.deck.profile).toBe('reverse')
    expect(loaded.deck.source?.slideCount).toBe(1)
    // 16:9 slide is 12192000×6858000 EMU = 960×540 px
    expect(loaded.deck.size).toEqual([960, 540])
    const page = loaded.pages.get('pages/01.page') as Page
    expect(page).toBeDefined()

    // text
    const text = page.elements.find((e) => e.elementType === 'text')
    expect(text).toBeDefined()
    expect((text as { content?: { text?: string } }).content?.text).toContain('标题')

    // shape with adjustments
    const shapes = page.elements.filter((e) => e.elementType === 'shape')
    expect(shapes.length).toBeGreaterThan(0)
    const shapeEl = shapes[0] as { shapeName?: string; adjustments?: number[]; rotation?: number }
    expect(shapeEl.shapeName).toBe('roundRect')
    expect(shapeEl.adjustments).toEqual([5000])
    expect(shapeEl.rotation).toBe(15)

    // image with crop
    const imageEl = page.elements.find((e) => e.elementType === 'image') as {
      src?: string
      crop?: { left?: number; right?: number }
    }
    expect(imageEl).toBeDefined()
    expect(imageEl.src).toMatch(/^media\//
)
    expect(imageEl.crop?.left).toBe(0.1)
    expect(imageEl.crop?.right).toBe(0.1)

    // table with merged cells
    const tableEl = page.elements.find((e) => e.elementType === 'table') as {
      rows?: Array<Array<{ text?: string; colSpan?: number }>>
    }
    expect(tableEl).toBeDefined()
    expect(tableEl.rows).toHaveLength(2)
    expect(tableEl.rows?.[0][0]?.colSpan).toBe(2)

    // connector
    const lineEl = page.elements.find((e) => e.elementType === 'line')
    expect(lineEl).toBeDefined()

    // notes
    expect(page.notes).toContain('旁白')
  })

  it('chart/smartart 走 dropped：占位形状插回原位置 + 报告记录', async () => {
    const bytes = await buildChartPptx()
    const result = await reverseImport({
      cwd,
      source: bytes,
      targetDir: 'proj',
      sessionId: 's1'
    })

    expect(result.dropped).toHaveLength(1)
    expect(result.dropped[0].originalType).toBe('chart')
    expect(result.dropped[0].placeholder).toBeDefined()

    const loaded = await loadProject(cwd, 'proj')
    const page = loaded.pages.get('pages/01.page') as Page
    const placeholder = page.elements.find((e) => e.elementType === 'placeholder') as {
      elementId?: string
      originalType?: string
      label?: string
      bounds?: [number, number, number, number]
    }
    expect(placeholder).toBeDefined()
    expect(placeholder.originalType).toBe('chart')
    expect(placeholder.label).toBe('此处原为图表')
    expect(placeholder.bounds?.[2]).toBeGreaterThan(0)

    // import.report.yml consistency (spec §10.3: dropped count matches array).
    const reportRaw = await readFile(path.join(cwd, 'proj', 'import.report.yml'), 'utf8')
    const report = parseYaml(reportRaw) as ImportReport
    expect(report.summary.dropped).toBe(1)
    expect(report.summary.placeholders).toBe(1)
    expect(report.dropped[0].placeholder?.elementId).toBe(placeholder.elementId)
  })

  it('sha1 去重：两张同字节图片只在 media 写一次', async () => {
    const pres = createPresentation({ size: '16:9' })
    const slide = (await import('@office-kit/pptx')).addBlankSlide(pres)
    addSlideImage(slide, PNG_1PX, { x: emu(0), y: emu(0), w: emu(100 * 12700), h: emu(80 * 12700) })
    addSlideImage(slide, PNG_1PX, { x: emu(200 * 12700), y: emu(0), w: emu(100 * 12700), h: emu(80 * 12700) })
    const bytes = await savePresentation(pres)

    const result = await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    expect(result.mediaCount).toBe(1) // same bytes dedup to one media entry

    const loaded = await loadProject(cwd, 'proj')
    const page = loaded.pages.get('pages/01.page') as Page
    const images = page.elements.filter((e) => e.elementType === 'image') as Array<{ src?: string }>
    expect(images).toHaveLength(2)
    expect(images[0].src).toBe(images[1].src)
  })
})
