/** 工作台数据视图直接消费 PPTD 元素顶层契约的回归测试。 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { chartModelOf } from '../client/render/chart-model'
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
      ['ppt_plan', '规划契约'],
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
    expect(model.rows[1][0].text).toBe('ppt_plan')
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
