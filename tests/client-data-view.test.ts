/** 工作台数据视图直接消费 PPTD 元素顶层契约的回归测试。 */
import { describe, expect, it } from 'vitest'
import { chartModelOf } from '../client/render/chart-model'
import { tableCellViewModel, tableModelOf } from '../client/render/table-model'

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

  it('单元格保留 fill、字号、颜色与边框', () => {
    const cell = tableCellViewModel(element.rows[0][0] as Record<string, unknown>, {}, null)
    expect(cell.background).toBe('#1a1a1a')
    expect(cell.color).toBe('#fff')
    expect(cell.fontSize).toBe(16)
    expect(cell.html).toBe('工具')
  })
})
