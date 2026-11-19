/** 横向原生图表的 LibreOffice / PDF 真实渲染对照。 */
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import { renderPptxImages } from '../src/core/export-pipeline.js'
import type { ElementBase, Page, Presentation } from '../src/core/pptd/schema.js'

function chart(
  elementId: string,
  series: Array<Record<string, unknown>>,
  rows: Array<Array<number | string | null>>,
  options: Record<string, unknown> = {}
): ElementBase {
  return {
    elementId,
    elementType: 'chart',
    bounds: [80, 70, 800, 400],
    data: { cols: ['环节', '创作', '质量', '交付'], rows },
    series,
    ...options,
  } as ElementBase
}

const oneSeries = [
  { type: 'bar', name: '创作', encode: { x: '创作', y: '环节' }, fill: '#c8102e' },
]
const stackedSeries = [
  { type: 'bar', name: '创作', encode: { x: '创作', y: '环节' }, fill: '#c8102e', stack: 'value' },
  { type: 'bar', name: '质量', encode: { x: '质量', y: '环节' }, fill: '#f2b705', stack: 'value' },
  { type: 'bar', name: '交付', encode: { x: '交付', y: '环节' }, fill: '#2456c4', stack: 'value' },
]
const fullOptions = {
  yAxis: { type: 'category', label: false, axisLine: false, gridLine: false },
  xAxis: { type: 'value', min: 0, max: 8, label: false, axisLine: false, gridLine: false },
  legend: { show: false },
  dataLabels: { show: true, color: '#333333', fontSize: 11 },
  barWidth: 0.56,
}

const nullRows: Array<Array<number | string | null>> = [
  ['创作', 8, null, null],
  ['质量', null, 3, null],
  ['交付', null, null, 2],
]
const demoOptions = {
  ...fullOptions,
  bounds: [64, 250, 480, 202],
  xAxis: { ...fullOptions.xAxis, max: 9 },
  yAxis: {
    type: 'category',
    label: { color: '#1a1a1a', fontFamily: 'Noto Sans SC', fontSize: 12 },
    axisLine: false,
    gridLine: false,
  },
  dataLabels: { show: true, color: '#1a1a1a', fontFamily: 'Noto Sans SC', fontSize: 12 },
  barWidth: 0.52,
}
const demoSeries = stackedSeries.map((series) => ({
  ...series,
  dataLabels: { show: true, color: '#1a1a1a', fontSize: 12 },
}))

const pages: Page[] = [
  { elements: [chart('single-horizontal', oneSeries, [['创作', 8, null, null], ['质量', 3, null, null], ['交付', 2, null, null]], { yAxis: { type: 'category' } })] },
  { elements: [chart('stacked-null-full', demoSeries, nullRows, demoOptions)] },
  { elements: [chart('stacked-zero-full', demoSeries, [['创作', 8, 0, 0], ['质量', 0, 3, 0], ['交付', 0, 0, 2]], demoOptions)] },
]

describe('office-kit 横向图表真实渲染', () => {
  it('单系列、堆叠空值与零值均通过 LibreOffice / PDF 输出', async () => {
    const engine = createOfficeKitEngine()
    const deck: Presentation = {
      profile: 'generate',
      size: [960, 540],
      theme: { colors: { primary: '#2456c4' }, textStyles: {} },
      export: { fontEmbed: 'off', transition: 'none', animations: 'off' },
      pages: pages.map((_, index) => `pages/${index + 1}.page`),
    }
    const context: BuildContext = {
      projectDir: '/tmp/pptd-chart-render-test',
      loadMedia: async () => { throw new Error('no media in tests') },
      warnings: [],
    }
    const built = await engine.buildDeck({ deck, pages }, context)
    expect(built.warnings).toEqual([])
    const rendered = await renderPptxImages(await engine.saveDeck(built.native), { dpi: 96 })
    try {
      expect(rendered.result.images).toHaveLength(3)
      const output = process.env.PPT_CHART_RENDER_OUT
      if (output) await mkdir(output, { recursive: true })
      for (const [index, image] of rendered.result.images.entries()) {
        const bytes = await readFile(image.path)
        expect(bytes.length).toBeGreaterThan(1000)
        if (output) await copyFile(image.path, path.join(output, `case-${index + 1}.png`))
      }
      if (output) console.info(`chart render cases: ${output}`)
    } finally {
      await rendered.cleanup()
    }
  }, 120_000)

})
