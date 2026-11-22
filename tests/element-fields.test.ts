/** 元素按类型的必填字段（spec §6）与图表数据完整性（spec §11.6）。 */
import { describe, expect, it } from 'vitest'
import { validateChartData, validateElementFields } from '../src/core/pptd/element-fields.js'

const codes = (issues: Array<{ code: string }>): string[] => issues.map((i) => i.code)

describe('validateElementFields', () => {
  it('各类型缺必填字段给 SchemaError', () => {
    const cases: Array<Record<string, unknown>> = [
      { elementType: 'text', content: {} },
      { elementType: 'shape' },
      { elementType: 'shape', shapeName: 'custom' },
      { elementType: 'line', points: '0,0' },
      { elementType: 'image' },
      { elementType: 'icon', iconName: 'house' },
      { elementType: 'table', columnWidths: [0.5, 0.6], rowHeights: [1], rows: [[{ text: 'a' }]] },
      { elementType: 'chart', series: [] }
    ]
    for (const element of cases) {
      const issues = validateElementFields(element, 'p')
      expect(issues.length, JSON.stringify(element)).toBeGreaterThan(0)
      expect(issues.every((i) => i.level === 'blocker')).toBe(true)
    }
  })

  it('合规元素无问题', () => {
    const ok: Array<Record<string, unknown>> = [
      { elementType: 'text', content: { text: '标题' } },
      { elementType: 'shape', shapeName: 'rect' },
      { elementType: 'line', viewBox: [100, 10], points: '0,0 100,10' },
      { elementType: 'image', src: 'media/a.png' },
      { elementType: 'icon', iconName: 'fas:house' },
      { elementType: 'table', columnWidths: [0.5, 0.5], rowHeights: [1], rows: [[{ text: 'a' }, { text: 'b' }]] }
    ]
    for (const element of ok) expect(validateElementFields(element, 'p'), JSON.stringify(element)).toEqual([])
  })
})

describe('validateChartData（§11.6）', () => {
  const base = { cols: ['项', '值'], rows: [['A', 1], ['B', 2]] }

  it('列名重复、空列名、行长不符', () => {
    expect(codes(validateChartData({ data: { cols: ['a', 'a'], rows: [] }, series: [{ type: 'bar', encode: { x: 'a', y: 'a' } }] }, 'c'))).toContain(
      'DuplicateColumnError'
    )
    expect(codes(validateChartData({ data: { cols: ['a', ''], rows: [] }, series: [{ type: 'bar', encode: { x: 'a', y: 'a' } }] }, 'c'))).toContain(
      'EmptyColumnError'
    )
    expect(codes(validateChartData({ data: { cols: ['a', 'b'], rows: [['x']] }, series: [{ type: 'bar', encode: { x: 'a', y: 'b' } }] }, 'c'))).toContain(
      'RowLengthError'
    )
  })

  it('未知列与非数值', () => {
    expect(codes(validateChartData({ data: base, series: [{ type: 'bar', encode: { x: '项', y: '无' } }] }, 'c'))).toEqual(['UnknownColumnError'])
    const bad = { cols: ['项', '值'], rows: [['A', '一']] }
    expect(codes(validateChartData({ data: bad, series: [{ type: 'bar', encode: { x: '项', y: '值' } }] }, 'c'))).toEqual(['NonNumericValueError'])
    // 横向条形图：x 才是数值通道
    const horizontal = { data: base, yAxis: { type: 'category' }, series: [{ type: 'bar', encode: { x: '值', y: '项' } }] }
    expect(validateChartData(horizontal, 'c')).toEqual([])
  })

  it('堆叠模式不一致', () => {
    const chart = {
      data: { cols: ['项', 'a', 'b'], rows: [['A', 1, 2]] },
      series: [
        { type: 'bar', stack: 'value', encode: { x: '项', y: 'a' } },
        { type: 'bar', stack: 'percent', encode: { x: '项', y: 'b' } }
      ]
    }
    expect(codes(validateChartData(chart, 'c'))).toEqual(['StackModeMismatchError'])
  })

  it('waterfall：isTotal 非 bool 报错，总计不符给警告', () => {
    const data = { cols: ['项', 'y', 't'], rows: [['期初', 10, true], ['增', 5, null], ['期末', 20, true], ['坏', 1, 'true']] }
    const issues = validateChartData({ data, series: [{ type: 'waterfall', encode: { x: '项', y: 'y', isTotal: 't' } }] }, 'c')
    expect(codes(issues)).toEqual(expect.arrayContaining(['WaterfallTotalMismatchWarning', 'InvalidValueError']))
  })

  it('sankey 成环', () => {
    const data = { cols: ['s', 't', 'f'], rows: [['A', 'B', 1], ['B', 'A', 1]] }
    expect(codes(validateChartData({ data, series: [{ type: 'sankey', encode: { source: 's', target: 't', flow: 'f' } }] }, 'c'))).toEqual([
      'CyclicGraphError'
    ])
  })

  it('dataLabels.content 越取值表', () => {
    const issues = validateChartData({ data: base, series: [{ type: 'radar', encode: { category: '项', y: '值' }, dataLabels: { content: 'percentage' } }] }, 'c')
    expect(codes(issues)).toEqual(['InvalidValueError'])
  })
})
