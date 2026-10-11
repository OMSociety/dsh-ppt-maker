/**
 * Test fixtures: shared pptx producers for reverse-import / tools tests.
 *
 * Kept here (not inline in tests) so both suites use the exact same bytes —
 * the round-trip property only means anything when both sides see the same
 * fixture.
 */
import {
  addBlankSlide,
  addSlideChart,
  addSlideImage,
  addSlideLine,
  addSlideShape,
  addSlideTable,
  addSlideTextBox,
  createPresentation,
  emu,
  mergeTableCells,
  savePresentation,
  setShapeAdjustValues,
  setShapeImageCrop,
  setShapeParagraphs,
  setShapeRotation,
  setSlideNotes
} from '@office-kit/pptx'

/** 1×1 transparent PNG, enough for `addSlideImage`. */
export const PNG_1PX = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
  0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00,
  0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c,
  0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
])

export async function buildFixturePptx(): Promise<Uint8Array> {
  const pres = createPresentation({ size: '16:9' })
  const slide = addBlankSlide(pres)

  const textBox = addSlideTextBox(slide, {
    x: emu(100 * 12700),
    y: emu(80 * 12700),
    w: emu(760 * 12700),
    h: emu(120 * 12700),
    text: ''
  })
  setShapeParagraphs(textBox, [
    { align: 'left', runs: [{ text: '标题——', format: { size: 32, bold: true } }, { text: '年度工作', format: { size: 32, color: '#2563EB' } }] },
    { align: 'left', runs: [{ text: '第一段正文。', format: { size: 16 } }, { text: '同段另一 run。', format: { size: 16, italic: true } }] },
    { align: 'left', runs: [{ text: '第二段正文。', format: { size: 14, color: '#6B7280' } }] }
  ])
  setSlideNotes(slide, '旁白：三段试验文本')

  const shape = addSlideShape(slide, {
    preset: 'roundRect',
    x: emu(120 * 12700),
    y: emu(280 * 12700),
    w: emu(160 * 12700),
    h: emu(80 * 12700)
  })
  setShapeAdjustValues(shape, { adj: 5000 })
  setShapeRotation(shape, 15)

  const image = addSlideImage(slide, PNG_1PX, {
    x: emu(320 * 12700),
    y: emu(280 * 12700),
    w: emu(120 * 12700),
    h: emu(80 * 12700)
  })
  setShapeImageCrop(image, { left: 0.1, right: 0.1 })

  const table = addSlideTable(slide, {
    x: emu(480 * 12700),
    y: emu(280 * 12700),
    w: emu(320 * 12700),
    h: emu(160 * 12700),
    rows: [
      ['A1', 'B1', 'C1'],
      ['A2', 'B2', 'C2']
    ],
    colWidths: [emu(110 * 12700), emu(110 * 12700), emu(100 * 12700)],
    rowHeights: [emu(80 * 12700), emu(80 * 12700)]
  })
  mergeTableCells(table, { row: 0, col: 0, rowSpan: 1, colSpan: 2 })

  addSlideLine(slide, {
    from: { x: emu(100 * 12700), y: emu(500 * 12700) },
    to: { x: emu(860 * 12700), y: emu(500 * 12700) },
    widthEmu: Number(emu(2 * 12700))
  })

  return savePresentation(pres)
}

export async function buildChartPptx(): Promise<Uint8Array> {
  const pres = createPresentation({ size: '16:9' })
  const slide = addBlankSlide(pres)
  addSlideChart(slide, {
    spec: {
      kind: 'column',
      categories: ['Q1', 'Q2', 'Q3'],
      series: [{ name: 'Series 1', values: [10, 20, 30] }]
    },
    x: emu(100 * 12700),
    y: emu(100 * 12700),
    w: emu(600 * 12700),
    h: emu(400 * 12700)
  })
  return savePresentation(pres)
}
