/** 工作台数据视图直接消费 PPTD 元素顶层契约的回归测试。 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { scatterModelOf, bubbleModelOf, radarModelOf, bubbleRadius, candlestickModelOf } from '../client/render/chart-xy-model'
import { chartModelOf } from '../client/render/chart-model'
import { patternTileOf } from '../client/render/pattern-svg'
// @ts-expect-error 根 tsconfig 不启用 JSX；组件由 tsconfig.client.json 完整校验。
import { ChartView } from '../client/components/ChartView'
import { tableCellViewModel, tableModelOf } from '../client/render/table-model'

const horizontalBars = {
  elementType: 'chart',
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
    { type: 'bar', name: '质量', encode: { x: '质量', y: '环节' }, fill: '#f2b705', stack: 'value' },
    { type: 'bar', name: '交付', encode: { x: '交付', y: '环节' }, fill: '#2456c4', stack: 'value' },
  ],
  yAxis: { type: 'category', label: false, axisLine: false, gridLine: false },
  xAxis: { type: 'value', min: 0, max: 8, label: false, axisLine: false, gridLine: false },
  legend: { show: false },
  dataLabels: { show: true, color: '#333333', fontSize: 11 },
  barWidth: 0.56,
}

function chartSvg(content: Record<string, unknown>): string {
  return renderToStaticMarkup(createElement(ChartView, { content }))
}

function rects(markup: string): Array<Record<string, number>> {
  return markup.match(/<rect\b[^>]*>/g)?.map((tag) => {
    const attrs: Record<string, number> = {}
    for (const name of ['x', 'y', 'width', 'height']) {
      attrs[name] = Number(tag.match(new RegExp(`${name}="([^"]+)"`))?.[1])
    }
    return attrs
  }) ?? []
}

describe('ChartView · PPTD data/series 契约', () => {
  it('从二维 rows 与 series.encode 取类目和数值', () => {
    const model = chartModelOf({
      elementType: 'chart',
      data: {
        cols: ['工具', '数量'],
        rows: [['创建/编辑', 8], ['质检/导出', 5]],
      },
      series: [{
        name: '工具数量',
        type: 'bar',
        encode: { x: '工具', y: '数量' },
        fill: '#2456c4',
      }],
    })
    expect(model).toHaveLength(1)
    expect(model[0].kind).toBe('bar')
    expect(model[0].color).toBe('#2456c4')
    expect(model[0].points).toEqual([
      { category: '创建/编辑', value: 8 },
      { category: '质检/导出', value: 5 },
    ])
  })

  it('颜色支持主题引用与 solid fill', () => {
    const model = chartModelOf({
      data: { cols: ['x', 'y'], rows: [['A', 1]] },
      series: [{ type: 'bar', encode: { x: 'x', y: 'y' }, fill: { type: 'solid', color: '$accent' } }],
    }, { colors: { accent: '#c8102e' } })
    expect(model[0].color).toBe('#c8102e')
  })

  it('yAxis.category 横向取 x 数值/y 类目，null 不转为零', () => {
    const model = chartModelOf(horizontalBars)
    expect(model).toHaveLength(3)
    expect(model[0].categories).toEqual(['创作', '质量', '交付'])
    expect(model.map((series) => series.points)).toEqual([
      [{ category: '创作', value: 8 }],
      [{ category: '质量', value: 3 }],
      [{ category: '交付', value: 2 }],
    ])
    expect(model.every((series) => series.stack === 'value')).toBe(true)
    expect(model.every((series) => series.dataLabels?.show === true)).toBe(true)
  })

  it('横向 SVG 每类目只画非空段和对应数值标签，并隐藏轴线网格及轴标签', () => {
    const markup = chartSvg(horizontalBars)
    const bars = rects(markup)
    expect(bars).toHaveLength(3)
    expect(bars.every((bar) => bar.width > bar.height)).toBe(true)
    expect(markup).not.toContain('<line')
    expect(Array.from(markup.matchAll(/<text\b[^>]*>(.*?)<\/text>/g), (match) => match[1])).toEqual(['8', '3', '2'])
    const valueLabels = Array.from(markup.matchAll(/<text\b[^>]*>(?:8|3|2)<\/text>/g), (match) => match[0])
    expect(valueLabels).toHaveLength(3)
    valueLabels.forEach((label, index) => {
      expect(label).toContain('text-anchor="middle"')
      expect(Number(label.match(/x="([^"]+)"/)?.[1])).toBeCloseTo(bars[index].x + bars[index].width / 2)
    })
    expect(markup).toContain('fill="#c8102e"')
    expect(markup).toContain('fill="#f2b705"')
    expect(markup).toContain('fill="#2456c4"')
    expect(markup).toContain('font-size="11"')
    expect(markup).toContain('fill="#333333"')
  })

  it('逐系列数值标签合并图表级样式，并保留可见类目标签', () => {
    const markup = chartSvg({
      ...horizontalBars,
      series: horizontalBars.series.map((series) => ({
        ...series,
        dataLabels: { show: true, color: '#1a1a1a', fontSize: 12 },
      })),
      yAxis: {
        ...horizontalBars.yAxis,
        label: { color: '#1a1a1a', fontFamily: 'Noto Sans SC', fontSize: 12 },
      },
      dataLabels: { show: true, color: '#1a1a1a', fontFamily: 'Noto Sans SC', fontSize: 12 },
    })
    expect(rects(markup)).toHaveLength(3)
    expect(Array.from(markup.matchAll(/<text\b[^>]*>(.*?)<\/text>/g), (match) => match[1])).toEqual([
      '8', '创作', '3', '质量', '2', '交付',
    ])
    expect(markup.match(/font-size="12"/g)).toHaveLength(6)
    expect(markup.match(/font-family="Noto Sans SC"/g)).toHaveLength(6)
    expect(markup).not.toContain('<line')
  })

  it('同组 stack 共用一个类目槽并累计起点，而不是并列占位', () => {
    const markup = chartSvg({
      data: { cols: ['环节', '甲', '乙'], rows: [['A', 2, 3], ['B', 4, 1]] },
      series: [
        { type: 'bar', name: '甲', encode: { x: '甲', y: '环节' }, stack: 'value' },
        { type: 'bar', name: '乙', encode: { x: '乙', y: '环节' }, stack: 'value' },
      ],
      yAxis: { type: 'category', label: false, axisLine: false, gridLine: false },
      xAxis: { type: 'value', min: 0, max: 6, label: false, axisLine: false, gridLine: false },
    })
    const bars = rects(markup)
    expect(bars).toHaveLength(4)
    expect(bars[1].y).toBeCloseTo(bars[0].y)
    expect(bars[3].y).toBeCloseTo(bars[2].y)
    expect(bars[1].x).toBeCloseTo(bars[0].x + bars[0].width)
    expect(bars[3].x).toBeCloseTo(bars[2].x + bars[2].width)
  })

  it('xAxis.category 保持纵向柱图', () => {
    const bars = rects(chartSvg({
      data: { cols: ['环节', '数量'], rows: [['创作', 8], ['质量', 2]] },
      series: [{ type: 'bar', name: '数量', encode: { x: '环节', y: '数量' } }],
      xAxis: { type: 'category', label: false, axisLine: false, gridLine: false },
      yAxis: { type: 'value', min: 0, max: 10, label: false, axisLine: false, gridLine: false },
    }))
    expect(bars).toHaveLength(2)
    expect(bars[0].height).toBeGreaterThan(bars[0].width)
  })
})

describe('TableView · PPTD rows/style 契约', () => {
  const element = {
    elementType: 'table',
    columnWidths: [0.42, 0.58],
    rowHeights: [0.2, 0.2, 0.2, 0.2, 0.2],
    rows: [
      [
        { text: '工具', color: '#fff', fill: { type: 'solid', color: '#1a1a1a' }, fontSize: 16 },
        { text: '功能', color: '#fff', fill: { type: 'solid', color: '#1a1a1a' }, fontSize: 16 },
      ],
      ['ppt_check', '规则质检'],
      ['ppt_svg', 'SVG 页面轨'],
    ],
    style: {
      cellStyle: { border: { color: '#d8d2c4', width: 1 } },
      bodyStyles: [
        { fill: { type: 'solid', color: '#fffdf7' } },
        { fill: { type: 'solid', color: '#ece8dd' } },
      ],
    },
  }

  it('读取 columnWidths/rowHeights 并归一二维 rows', () => {
    const model = tableModelOf(element)
    expect(model.rows).toHaveLength(3)
    expect(model.columns).toBe(2)
    expect(model.columnWidths[0]).toBeCloseTo(0.42)
    expect(model.columnWidths[1]).toBeCloseTo(0.58)
    expect(model.rowHeights.every((height) => Math.abs(height - 1 / 3) < 1e-9)).toBe(true)
    expect(model.rows[1][0].text).toBe('ppt_check')
  })

  it('rows 省略被覆盖格时按网格列落位', () => {
    const model = tableModelOf({
      columnWidths: [0.34, 0.33, 0.33],
      rowHeights: [0.5, 0.5],
      rows: [
        [{ text: 'A', rowSpan: 2 }, { text: 'B', colSpan: 2 }],
        [{ text: 'C' }, { text: 'D' }],
      ],
    })
    expect(model.columns).toBe(3)
    expect(model.cells.map(({ r, c, cell }) => `${r}${c}${cell.text}`)).toEqual(['00A', '01B', '11C', '12D'])
  })

  it('单元格保留 fill、字号、颜色与边框', () => {
    const cell = tableCellViewModel(element.rows[0][0] as Record<string, unknown>, {}, null)
    expect(cell.background).toBe('#1a1a1a')
    expect(cell.color).toBe('#fff')
    expect(cell.fontSize).toBe(16)
    expect(cell.html).toBe('工具')
  })

  it('BorderSpec 数组逐边落位：null 边不画，只留指定横线', () => {
    const rule = { color: '#d8d2c4', style: 'solid', width: 1 }
    const four = tableCellViewModel({ text: 'x' }, { border: [null, null, rule, null] }, null)
    expect(four.borderTop).toBe('none')
    expect(four.borderRight).toBe('none')
    expect(four.borderLeft).toBe('none')
    expect(four.borderBottom).toContain('#d8d2c4')
    const two = tableCellViewModel({ text: 'x' }, { border: [rule, null] }, null)
    expect(two.borderTop).toContain('#d8d2c4')
    expect(two.borderBottom).toContain('#d8d2c4')
    expect(two.borderLeft).toBe('none')
    expect(tableCellViewModel({ text: 'x', border: null }, {}, null).borderTop).toBe('none')
  })
})

describe('ChartView · 图案填充与逐点标签', () => {
  const hatch = { type: 'pattern', preset: 'ltUpDiag', foreground: '#005193', background: '#ffffff' }

  it('系列图案填充画成 SVG 瓦片引用', () => {
    const markup = chartSvg({
      elementType: 'chart',
      data: { cols: ['月', '额'], rows: [['一', 3], ['二', 5]] },
      series: [{ type: 'bar', name: '额', encode: { x: '月', y: '额' }, fill: hatch }],
    })
    expect(markup).toContain('<pattern id="pptd-pat-0"')
    expect(markup).toContain('fill="url(#pptd-pat-0)"')
    expect(markup).toContain('fill="#ffffff"')
  })

  it('斜纹瓦片：UpDiag 自左下向右上，线长跨满瓦片，DnDiag 反向', () => {
    const up = patternTileOf('ltUpDiag')
    const down = patternTileOf('ltDnDiag')
    for (const line of up.lines) {
      expect(line.x2 - line.x1).toBe(up.size)
      expect(line.y1 - line.y2).toBe(up.size)
    }
    for (const line of down.lines) {
      expect(line.x2 - line.x1).toBe(down.size)
      expect(line.y2 - line.y1).toBe(down.size)
    }
  })

  it('环形图逐点标签按 offset 落在环中心，隐藏点不出标签', () => {
    const markup = chartSvg({
      elementType: 'chart',
      data: { cols: ['项', '占比'], rows: [['完成', 0.74], ['其余', 0.26]] },
      series: [{
        type: 'pie',
        name: '占比',
        encode: { category: '项', value: '占比' },
        innerRadius: 0.7,
        fill: ['#005193', hatch],
        dataLabels: {
          show: true,
          numberFormat: '0%',
          fontSize: 40,
          points: [{ offset: { x: -0.2459, y: -0.276 }, fontSize: 40, bold: true }, { show: false }],
        },
      }],
    })
    expect(markup).toContain('74%')
    expect(markup).not.toContain('26%')
    expect(markup).toMatch(/<text[^>]*font-size="40"[^>]*>74%<\/text>/)
    expect(markup).toContain('font-weight="600"')
    expect(markup).toContain('fill="url(#pptd-pat-0)"')
  })

  it('图案填充进模型时同时给出回落色', () => {
    const model = chartModelOf({
      data: { cols: ['月', '额'], rows: [['一', 3]] },
      series: [{ type: 'bar', name: '额', encode: { x: '月', y: '额' }, fill: hatch }],
    })
    expect(model[0].pattern).toEqual({ preset: 'ltUpDiag', foreground: '#005193', background: '#ffffff' })
    expect(model[0].color).toBe('#005193')
  })
})

describe('ChartView · scatter / bubble / radar', () => {
  const size = { width: 400, height: 240 }
  const scatter = {
    type: 'scatter',
    data: { cols: ['a', 'b', 'c', 'd'], rows: [[1, 10, 5, 2], [2, 20, 6, 4], [3, 30, 7, 8]] },
    series: [{ type: 'scatter', name: 'S', encode: { x: 'a', y: 'b' } }, { type: 'scatter', name: 'T', encode: { x: 'c', y: 'd' } }],
    xAxis: { min: 0, max: 10 },
  }

  it('散点：各系列取自己的 x/y 列，轴范围读 xAxis', () => {
    const m = scatterModelOf(scatter, null, size)!
    expect(m.series).toHaveLength(2)
    expect(m.series[0].points.map((p) => [p.x, p.y])).toEqual([[1, 10], [2, 20], [3, 30]])
    expect(m.series[1].points.map((p) => [p.x, p.y])).toEqual([[5, 2], [6, 4], [7, 8]])
    expect([m.xAxis.min, m.xAxis.max]).toEqual([0, 10])
    expect(m.series[0].points[0].px).toBeLessThan(m.series[0].points[2].px)
    expect(chartSvg(scatter)).toContain('<circle')
  })

  it('气泡：sqrt/linear 缩放，size 负值半径为 0', () => {
    expect(bubbleRadius(25, 100, 'sqrt', [0, 20])).toBeCloseTo(10)
    expect(bubbleRadius(25, 100, 'linear', [0, 20])).toBeCloseTo(5)
    expect(bubbleRadius(-5, 100, 'sqrt', [0, 20])).toBe(0)
    const m = bubbleModelOf({
      type: 'bubble',
      data: { cols: ['x', 'y', 's'], rows: [[1, 1, 100], [2, 2, -4]] },
      series: [{ type: 'bubble', encode: { x: 'x', y: 'y', size: 's' } }],
    }, null, size)!
    expect(m.series[0].points[1].r).toBe(0)
    expect(m.series[0].points[0].r!).toBeGreaterThan(0)
  })

  const radar = (area?: unknown) => ({
    type: 'radar',
    data: { cols: ['k', 'v'], rows: [['A', 1], ['B', 2], ['C', 3], ['D', 4]] },
    series: [{ type: 'radar', encode: { category: 'k', y: 'v' }, ...(area === undefined ? {} : { areaColor: area }) }],
  })

  it('雷达：辐条数与角度，areaColor:false 不填充', () => {
    const m = radarModelOf(radar(false), null, size)!
    expect(m.spokes.map((s) => s.angle)).toEqual([0, 90, 180, 270])
    expect(m.series[0].area).toBe(false)
    expect(radarModelOf(radar(), null, size)!.series[0].area).not.toBe(false)
    expect(chartSvg(radar(false))).toContain('<path')
  })

  it('混排降级提示且不抛错', () => {
    const mixed = { ...scatter, series: [scatter.series[0], { type: 'bar', encode: { x: 'a', y: 'b' } }] }
    expect(() => chartSvg(mixed)).not.toThrow()
    expect(chartSvg(mixed)).toContain('导出后查看')
  })
})
describe('ChartView · candlestick', () => {
  const data = { cols: ['d', 'o', 'h', 'l', 'c'], rows: [['1', 10, 15, 8, 14], ['2', 14, 16, 9, 11]] }
  it('OHLC：实体窄于类目宽 50%，涨红跌绿', () => {
    const content = { type: 'candlestick', data, series: [{ type: 'candlestick', encode: { x: 'd', open: 'o', high: 'h', low: 'l', close: 'c' } }] }
    const m = candlestickModelOf(content, null, { width: 400, height: 240 })!
    expect(m.ohlc).toBe(true)
    expect(m.bars[0].color).toBe('#d93a2b')
    expect(m.bars[1].color).toBe('#2a9d5c')
    expect(m.bars[0].body!.width).toBeLessThanOrEqual(m.plot.width / 2 * 0.5 + 1e-6)
    expect(chartSvg(content)).toContain('<rect')
  })
  it('HLC：无实体，有收盘短横', () => {
    const content = { type: 'candlestick', data, series: [{ type: 'candlestick', encode: { x: 'd', high: 'h', low: 'l', close: 'c' } }] }
    const m = candlestickModelOf(content, null, { width: 400, height: 240 })!
    expect(m.ohlc).toBe(false)
    expect(m.bars.every((b) => !b.body && b.dotR === 3)).toBe(true)
    expect(chartSvg(content)).not.toContain('<rect')
    expect(chartSvg(content)).toContain('<circle')
  })
  it('K 线不画图例：开高低收是数据通道，legend 写什么都不出图例项', () => {
    const base = { type: 'candlestick', data, series: [{ type: 'candlestick', encode: { x: 'd', open: 'o', high: 'h', low: 'l', close: 'c' } }] }
    for (const legend of [undefined, true, { position: 'top' }]) {
      const svg = chartSvg({ ...base, ...(legend === undefined ? {} : { legend }) })
      expect(svg).not.toContain('上涨')
      expect(svg).not.toContain('下跌')
      expect(svg).not.toContain('高低收')
    }
  })
})

describe('ChartView · 整数轴外扩半步', () => {
  it('x 为 1..3 时范围含 0.5–3.5', () => {
    const m = scatterModelOf({ type: 'scatter', data: { cols: ['x', 'y'], rows: [[1, 1.5], [2, 2.5], [3, 9]] }, series: [{ type: 'scatter', encode: { x: 'x', y: 'y' } }] }, null, { width: 400, height: 240 })!
    expect(m.xAxis.min).toBeLessThanOrEqual(0.5)
    expect(m.xAxis.max).toBeGreaterThanOrEqual(3.5)
  })
})
describe('ChartView · 散点留白', () => {
  it('两端点离绘图区边缘不小于标记半径', () => {
    const m = scatterModelOf({
      type: 'scatter',
      data: { cols: ['x', 'y'], rows: [[1, 1], [2, 5], [3, 3]] },
      series: [{ type: 'scatter', encode: { x: 'x', y: 'y' } }],
    }, null, { width: 400, height: 240 })!
    const r = m.series[0].marker!.size / 2
    const xs = m.series[0].points.map((p) => p.px)
    const ys = m.series[0].points.map((p) => p.py)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(m.plot.left + r - 1e-6)
    expect(Math.max(...xs)).toBeLessThanOrEqual(m.plot.left + m.plot.width - r + 1e-6)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(m.plot.top + r - 1e-6)
    expect(Math.max(...ys)).toBeLessThanOrEqual(m.plot.top + m.plot.height - r + 1e-6)
  })
})