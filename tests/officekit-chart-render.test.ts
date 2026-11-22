/** 横向原生图表的 LibreOffice / PDF 真实渲染对照。 */
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import { renderPptxImages } from '../src/core/export-pipeline.js'
import type { ElementBase, Page, Presentation } from '../src/core/pptd/schema.js'
import { colorBox, colorRowBands, decodePng, type RgbaImage } from './__fixtures__/png.js'

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
  it('单系列、堆叠空值与零值经 LibreOffice / PDF 渲染：条数、方向、颜色与长度比正确', async () => {
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
      const decoded: RgbaImage[] = []
      for (const [index, image] of rendered.result.images.entries()) {
        const bytes = await readFile(image.path)
        if (output) await copyFile(image.path, path.join(output, `case-${index + 1}.png`))
        decoded.push(decodePng(bytes))
      }

      // 用例 1：单系列红色横向条 3 根，自上而下由长到短（8 / 3 / 2），且是横向（宽 > 高）
      const single = colorRowBands(decoded[0], '#c8102e')
      expect(single, '单系列应画出 3 根红条').toHaveLength(3)
      expect(single[0].width).toBeGreaterThan(single[1].width)
      expect(single[1].width).toBeGreaterThan(single[2].width)
      expect(single[0].width / single[2].width).toBeGreaterThan(2.5)
      for (const band of single) expect(band.width).toBeGreaterThan(band.to - band.from + 1)

      // 用例 2/3：堆叠 + 空值 / 零值，每类目一根独立色条：红 8 在上、黄 3 居中、蓝 2 在下，长度比约 8:3:2
      // （零值段在 LibreOffice 里会留 1px 细线，按「每行至少 20 个同色像素」取色条即可忽略）
      for (const [label, image] of [['stacked-null', decoded[1]], ['stacked-zero', decoded[2]]] as const) {
        const bands = (['#c8102e', '#f2b705', '#2456c4'] as const).map((hex) => {
          const found = colorRowBands(image, hex)
          expect(found, `${label} 的 ${hex} 应恰好一根色条`).toHaveLength(1)
          return found[0]
        })
        const [red, yellow, blue] = bands
        expect(red.to, `${label} 红条应在黄条上方`).toBeLessThan(yellow.from)
        expect(yellow.to, `${label} 黄条应在蓝条上方`).toBeLessThan(blue.from)
        expect(red.width / yellow.width).toBeGreaterThan(2)
        expect(red.width / yellow.width).toBeLessThan(3.4)
        expect(yellow.width / blue.width).toBeGreaterThan(1.1)
        expect(yellow.width / blue.width).toBeLessThan(2)
        // 三根条左端对齐（从 0 起画，不是互相堆在后面）
        const left = (['#c8102e', '#f2b705', '#2456c4'] as const).map((hex, i) => {
          const band = bands[i]
          const mid = Math.round((band.from + band.to) / 2)
          return colorBox({ ...image, height: 1, data: image.data.subarray(mid * image.width * 4, (mid + 1) * image.width * 4) }, hex).minX
        })
        expect(Math.abs(left[0] - left[1])).toBeLessThan(4)
        expect(Math.abs(left[1] - left[2])).toBeLessThan(4)
      }
      if (output) console.info(`chart render cases: ${output}`)
    } finally {
      await rendered.cleanup()
    }
  }, 120_000)

})
