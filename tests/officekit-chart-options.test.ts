/** 原生图表方向、堆叠、标签与坐标轴配置的真实 PPTX 往返回归。 */
import { describe, expect, it } from 'vitest'
import { getSlideCharts, getSlides, loadPresentation } from '@office-kit/pptx'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import type { ElementBase, Page, Presentation } from '../src/core/pptd/schema.js'

function ctx(): BuildContext {
  return {
    projectDir: '/tmp/pptd-chart-options-test',
    loadMedia: async () => { throw new Error('no media in tests') },
    warnings: [],
  }
}

function deck(): Presentation {
  return {
    profile: 'generate',
    size: [960, 540],
    theme: { colors: { primary: '#2456c4' }, textStyles: {} },
    export: { fontEmbed: 'off', transition: 'none', animations: 'off' },
    pages: ['pages/01.page'],
  }
}

async function readOnlyChart(element: ElementBase) {
  const engine = createOfficeKitEngine()
  const page: Page = { elements: [element] }
  const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
  expect(built.warnings).toEqual([])
  const back = await loadPresentation(await engine.saveDeck(built.native))
  const charts = getSlideCharts(getSlides(back)[0])
  expect(charts).toHaveLength(1)
  const spec = charts[0].spec
  if (!spec) throw new Error('chart spec was not read back')
  return spec
}

describe('office-kit 图表契约选项', () => {
  it('横向堆叠 bar 保留空值并映射标签、图例、双轴与柱宽', async () => {
    const spec = await readOnlyChart({
      elementId: 'funnel-bars',
      elementType: 'chart',
      bounds: [80, 100, 720, 300],
      data: {
        cols: ['环节', '创作', '质量', '交付'],
        rows: [
          ['创作', 8, null, null],
          ['质量', null, 3, null],
          ['交付', null, null, 2],
        ],
      },
      series: [
        { type: 'bar', name: '创作', encode: { x: '创作', y: '环节' }, fill: '#c8102e', stack: 'value' },
        { type: 'bar', name: '质量', encode: { x: '质量', y: '环节' }, fill: '#f2b705', stack: 'value', dataLabels: { color: '#ffffff' } },
        { type: 'bar', name: '交付', encode: { x: '交付', y: '环节' }, fill: '#2456c4', stack: 'value' },
      ],
      yAxis: { type: 'category', label: false, axisLine: false, gridLine: false },
      xAxis: { type: 'value', min: 0, max: 8, label: false, axisLine: false, gridLine: false },
      legend: { show: false },
      dataLabels: { show: true, color: '#333333', fontSize: 11, fontFamily: 'Microsoft YaHei' },
      barWidth: 0.56,
    })

    expect(spec.kind).toBe('bar')
    expect(spec.categories).toEqual(['创作', '质量', '交付'])
    expect(spec.series.map((series) => series.name)).toEqual(['创作', '质量', '交付'])
    expect(spec.series.map((series) => series.values)).toEqual([
      [8, null, null],
      [null, 3, null],
      [null, null, 2],
    ])
    expect(spec.series.map((series) => series.color?.toLowerCase())).toEqual(['#c8102e', '#f2b705', '#2456c4'])
    expect(spec.grouping).toBe('stacked')
    expect(spec.overlapPct).toBe(100)
    expect(spec.legend).toBeUndefined()
    expect(spec.dataLabels).toMatchObject({
      showValue: true,
      showCategory: false,
      showSeriesName: false,
      showPercent: false,
      textStyle: { sizePt: 11, color: '#333333', font: 'Microsoft YaHei' },
    })
    expect(spec.series[1].dataLabels).toMatchObject({
      showValue: true,
      textStyle: { sizePt: 11, color: '#FFFFFF', font: 'Microsoft YaHei' },
    })
    expect(spec.valueAxis).toMatchObject({ min: 0, max: 8 })
    expect(spec.valueAxisTickLabelPos).toBe('none')
    expect(spec.categoryAxisTickLabelPos).toBe('none')
    expect(spec.valueAxisLineHidden).toBe(true)
    expect(spec.categoryAxisLineHidden).toBe(true)
    expect(spec.valueAxisMajorGridlines).toBe(false)
    expect(spec.categoryAxisMajorGridlines ?? false).toBe(false)
    expect(spec.categoryAxisOrientation).toBe('maxMin')
    expect(spec.gapWidthPct).toBe(79)
  })

  it('未声明 yAxis.category 时保留默认纵向 column 映射', async () => {
    const spec = await readOnlyChart({
      elementId: 'default-column',
      elementType: 'chart',
      bounds: [80, 100, 720, 300],
      data: { cols: ['环节', '数量'], rows: [['创作', 8], ['质量', 3]] },
      series: [{ type: 'bar', name: '数量', encode: { x: '环节', y: '数量' }, fill: '$primary' }],
    })

    expect(spec.kind).toBe('column')
    expect(spec.categories).toEqual(['创作', '质量'])
    expect(spec.series[0].values).toEqual([8, 3])
    expect(spec.series[0].color?.toLowerCase()).toBe('#2456c4')
  })
})
