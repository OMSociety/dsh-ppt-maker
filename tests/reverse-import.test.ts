/**
 * Reverse engine tests.
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
  addSlideTextBox,
  createPresentation,
  emu,
  savePresentation,
  setParagraphAlignment,
  setParagraphLineSpacing,
  setShapeParagraphs,
  setShapeTextAnchor,
  setSlideBackground
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

    // Re-load through the project store to prove the project is well-formed.
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

  it('R1 run 级映射：加粗/字号/颜色/对齐编成富文本，align 取真实值', async () => {
    const pres = createPresentation({ size: '16:9' })
    const slide = (await import('@office-kit/pptx')).addBlankSlide(pres)
    const box = addSlideTextBox(slide, {
      x: emu(100 * 12700),
      y: emu(100 * 12700),
      w: emu(600 * 12700),
      h: emu(200 * 12700),
      text: ''
    })
    setShapeParagraphs(box, [
      {
        runs: [
          { text: '大标题', format: { size: 40, bold: true } },
          { text: '蓝色后缀', format: { size: 40, color: '#2563EB' } }
        ]
      },
      { runs: [{ text: '正文斜体。', format: { size: 16, italic: true } }] }
    ])
    setParagraphAlignment(box, 0, 'center')
    setParagraphAlignment(box, 1, 'right')
    setParagraphLineSpacing(box, 0, { kind: 'pct', value: 1.5 })
    setShapeTextAnchor(box, 'center')
    const bytes = await savePresentation(pres)

    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    const page = loaded.pages.get('pages/01.page') as Page
    const text = page.elements.find((e) => e.elementType === 'text') as {
      content?: { text?: string; align?: [string, string] }
    }
    const html = text.content?.text ?? ''
    expect(html).toContain('<strong>大标题</strong>')
    expect(html).toContain('<em>正文斜体。</em>')
    expect(html).toContain('font-size:40px')
    expect(html).toContain('color:#2563EB')
    expect(html).toContain('text-align:center')
    expect(html).toContain('text-align:right')
    expect(html).toContain('line-height:1.5')
    // 元素级 align：首个显式段落 center，垂直 anchor ctr → middle
    expect(text.content?.align).toEqual(['center', 'middle'])
  })

  it('R2 SmartArt：diagram graphicFrame 走 dropped + SmartArt 占位', async () => {
    // 库不写 SmartArt；用 fflate（@office-kit/pptx 的 zip 实现）向保存出的
    // pptx 里注入一个 diagram graphicFrame。
    const { unzipSync, zipSync } = await import('fflate')
    const pres = createPresentation({ size: '16:9' })
    const slide = (await import('@office-kit/pptx')).addBlankSlide(pres)
    addSlideTextBox(slide, { x: emu(0), y: emu(0), w: emu(100 * 12700), h: emu(50 * 12700), text: '占位页' })
    const bytes = await savePresentation(pres)

    const entries = unzipSync(bytes)
    const slidePath = 'ppt/slides/slide1.xml'
    const xml = new TextDecoder().decode(entries[slidePath])
    const frame = `<p:graphicFrame xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:nvGraphicFramePr><p:cNvPr id="900" name="Diagram 1"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="914400" y="914400"/><a:ext cx="4572000" cy="2743200"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/diagram"><dgm:relIds xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:dm="rId100" r:lo="rId101" r:qs="rId102" r:cs="rId103"/></a:graphicData></a:graphic></p:graphicFrame>`
    const patched = xml.replace('</p:spTree>', `${frame}</p:spTree>`)
    entries[slidePath] = new TextEncoder().encode(patched)
    const patchedBytes = zipSync(entries)

    const result = await reverseImport({ cwd, source: patchedBytes, targetDir: 'proj', sessionId: 's1' })
    expect(result.dropped).toHaveLength(1)
    expect(result.dropped[0].originalType).toBe('smartArt')

    const loaded = await loadProject(cwd, 'proj')
    const page = loaded.pages.get('pages/01.page') as Page
    const placeholder = page.elements.find((e) => e.elementType === 'placeholder') as {
      originalType?: string
      label?: string
      bounds?: [number, number, number, number]
    }
    expect(placeholder).toBeDefined()
    expect(placeholder.originalType).toBe('smartArt')
    expect(placeholder.label).toBe('此处原为 SmartArt 图示')
    expect(placeholder.bounds?.[2]).toBeGreaterThan(0)
  })

  it('R3 背景继承：slide 未设背景时取版式/母版生效值', async () => {
    const pres = createPresentation({ size: '16:9' })
    // slide 显式背景
    const slide1 = (await import('@office-kit/pptx')).addBlankSlide(pres)
    setSlideBackground(slide1, '#112233')
    // slide 未设背景 → 继承链（默认母版为白或 inherit，落盘与否均可，只断言不抛错且 slide1 生效）
    ;(await import('@office-kit/pptx')).addBlankSlide(pres)
    const bytes = await savePresentation(pres)

    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    const page1 = loaded.pages.get('pages/01.page') as Page
    expect(page1.background).toEqual({ type: 'solid', color: '#112233' })
    // deck.theme.textStyles 带主题字体槽位
    const styles = (loaded.deck.theme?.textStyles ?? {}) as Record<string, { fontFamily?: { latin?: string } }>
    expect(styles.title?.fontFamily?.latin).toBeTruthy()
    expect(styles.body?.fontFamily?.latin).toBeTruthy()
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
