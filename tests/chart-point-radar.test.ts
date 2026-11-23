/** 散点 / 气泡 / 雷达 / K 线图：生成、校验、导出后逆向导入的往返。 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { strFromU8, unzipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getSlideCharts, getSlides, loadPresentation } from '@office-kit/pptx'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import type { ElementBase, Page, Presentation } from '../src/core/pptd/schema.js'
import { validateChartData } from '../src/core/pptd/element-fields.js'
import { reverseImport } from '../src/core/reverse/index.js'
import { loadProject } from '../src/core/project/store.js'

function ctx(): BuildContext {
  return { projectDir: '/tmp/pptd-chart-point-radar', loadMedia: async () => { throw new Error('no media') }, warnings: [] }
}

function deck(): Presentation {
  return {
    profile: 'generate',
    size: [960, 540],
    theme: { colors: { primary: '#2456c4' }, textStyles: {} },
    export: { fontEmbed: 'off', transition: 'none', animations: 'off' },
    pages: ['pages/01.page']
  }
}

async function exported(element: ElementBase): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  const engine = createOfficeKitEngine()
  const built = await engine.buildDeck({ deck: deck(), pages: [{ elements: [element] } as Page] }, ctx())
  return { bytes: await engine.saveDeck(built.native), warnings: built.warnings }
}

function chartXml(bytes: Uint8Array): string {
  const files = unzipSync(bytes)
  const name = Object.keys(files).find((n) => /^ppt\/charts\/chart[^/]*\.xml$/.test(n))
  return strFromU8(files[name!])
}

async function specOf(bytes: Uint8Array) {
  const back = await loadPresentation(bytes)
  return getSlideCharts(getSlides(back)[0])[0].spec as any
}

function scatter(): ElementBase {
  return {
    elementId: 'sc',
    elementType: 'chart',
    bounds: [60, 60, 420, 300],
    data: {
      cols: ['组', 'x', 'y'],
      rows: [['甲', 1, 2], ['甲', 2, 4], ['甲', 3, 3], ['乙', 1, 5], ['乙', 2, 1]]
    },
    series: [
      { type: 'scatter', name: '甲', encode: { x: 'x', y: 'y' }, dataFilter: { col: '组', value: '甲' }, marker: { shape: 'diamond', size: 12, fill: '#d93a2b' } },
      { type: 'scatter', name: '乙', encode: { x: 'x', y: 'y' }, dataFilter: { col: '组', value: '乙' }, fill: '#2456c4' }
    ],
    yAxis: { min: 0, max: 6, gridLine: false }
  } as unknown as ElementBase
}

function bubble(): ElementBase {
  return {
    elementId: 'bb',
    elementType: 'chart',
    bounds: [60, 60, 420, 300],
    data: { cols: ['x', 'y', 's'], rows: [[1, 2, 10], [2, 4, 30], [3, 3, -5]] },
    series: [{ type: 'bubble', name: '规模', encode: { x: 'x', y: 'y', size: 's' }, sizeScale: 'linear', fill: '#2456c4' }]
  } as unknown as ElementBase
}

function radar(): ElementBase {
  return {
    elementId: 'rd',
    elementType: 'chart',
    bounds: [60, 60, 360, 320],
    data: { cols: ['维度', '本期', '上期'], rows: [['速度', 4, 3], ['质量', 5, 4], ['成本', 2, 3], ['体验', 4, 4], ['安全', 3, 5]] },
    series: [
      { type: 'radar', name: '本期', encode: { category: '维度', y: '本期' }, areaColor: '#2456c4', lineColor: '#2456c4' },
      { type: 'radar', name: '上期', encode: { category: '维度', y: '上期' }, areaColor: false, lineColor: '#d93a2b', marker: {} }
    ],
    spokeAxis: { min: 0, max: 6 }
  } as unknown as ElementBase
}

describe('散点 / 气泡 / 雷达生成', () => {
  it('散点：按 dataFilter 拆成系列，写入 xValues、标记形状与大小，库可读回', async () => {
    const { bytes, warnings } = await exported(scatter())
    expect(warnings).toEqual([])
    const xml = chartXml(bytes)
    expect(xml).toContain('<c:scatterChart>')
    expect(xml).toContain('<c:symbol val="diamond"/>')
    expect(xml).toContain('<c:size val="9"/>')
    const spec = await specOf(bytes)
    expect(spec.kind).toBe('scatter')
    expect(spec.series).toHaveLength(2)
    expect(spec.series[0].xValues).toEqual([1, 2, 3])
    expect(spec.series[0].values).toEqual([2, 4, 3])
    expect(spec.series[1].xValues).toEqual([1, 2])
    expect(spec.valueAxis).toMatchObject({ min: 0, max: 6 })
    expect(spec.valueAxisMajorGridlines).toBe(false)
  })

  it('气泡：size 列写入 bubbleSizes，负值取 0，linear 对应按宽度表示', async () => {
    const { bytes } = await exported(bubble())
    const xml = chartXml(bytes)
    expect(xml).toContain('<c:bubbleChart>')
    expect(xml).toContain('<c:sizeRepresents val="w"/>')
    const spec = await specOf(bytes)
    expect(spec.kind).toBe('bubble')
    expect(spec.series[0].bubbleSizes).toEqual([10, 30, 0])
  })

  it('雷达：辐条取自 category 列，areaColor:false 的系列按轮廓写，整体仍是 filled', async () => {
    const { bytes } = await exported(radar())
    const xml = chartXml(bytes)
    expect(xml).toContain('<c:radarChart>')
    expect(xml).toContain('<c:radarStyle val="filled"/>')
    const spec = await specOf(bytes)
    expect(spec.kind).toBe('radar')
    expect(spec.categories).toEqual(['速度', '质量', '成本', '体验', '安全'])
    expect(spec.series.map((s: any) => s.name)).toEqual(['本期', '上期'])
    expect(spec.valueAxis).toMatchObject({ min: 0, max: 6 })
  })

  it('全部系列都不填充的雷达写成轮廓雷达', async () => {
    const el = radar() as unknown as Record<string, any>
    el.series[0].areaColor = false
    const { bytes } = await exported(el as unknown as ElementBase)
    expect(chartXml(bytes)).toMatch(/<c:radarStyle val="(marker|standard)"\/>/)
  })

  it('与柱状图混排时落占位并给出警告，不抛错', async () => {
    const el = scatter() as unknown as Record<string, any>
    el.series.push({ type: 'bar', name: '柱', encode: { x: 'x', y: 'y' } })
    const { warnings } = await exported(el as unknown as ElementBase)
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('校验器：散点 encode.x 必须是数值列，雷达系列须共用同一 category 列', () => {
    const sc = scatter() as unknown as Record<string, any>
    sc.data.rows[0][1] = '文字'
    expect(validateChartData(sc as never, 'e').map((i) => i.code)).toContain('NonNumericValueError')
    const rd = radar() as unknown as Record<string, any>
    rd.data.cols.push('另一维度')
    rd.data.rows.forEach((r: unknown[]) => r.push('x'))
    rd.series[1].encode.category = '另一维度'
    expect(validateChartData(rd as never, 'e').map((i) => i.code)).toContain('SchemaError')
  })
})

function candle(withOpen: boolean): ElementBase {
  const rows = [['周一', 10, 14, 9, 12], ['周二', 12, 16, 11, 15], ['周三', 15, 17, 12, 13]]
  const cols = ['日', '开', '高', '低', '收']
  return {
    elementId: 'kl',
    elementType: 'chart',
    bounds: [60, 60, 420, 300],
    data: { cols: withOpen ? cols : ['日', '高', '低', '收'], rows: rows.map((r) => (withOpen ? r : [r[0], r[2], r[3], r[4]])) },
    series: [
      {
        type: 'candlestick',
        name: 'K',
        encode: withOpen ? { x: '日', open: '开', high: '高', low: '低', close: '收' } : { x: '日', high: '高', low: '低', close: '收' },
        upBars: { fill: '#d93a2b' },
        downBars: { fill: '#2a9d5c' }
      }
    ]
  } as unknown as ElementBase
}

describe('K 线生成', () => {
  it('提供 open 时写成开高低收四个系列并带涨跌柱颜色', async () => {
    const { bytes, warnings } = await exported(candle(true))
    expect(warnings).toEqual([])
    const xml = chartXml(bytes)
    expect(xml).toContain('<c:stockChart>')
    expect(xml).toContain('<c:upDownBars>')
    expect(xml).toMatch(/<c:upBars>[\s\S]*?D93A2B/i)
    expect(xml).toMatch(/<c:downBars>[\s\S]*?2A9D5C/i)
    const spec = await specOf(bytes)
    expect(spec.series.map((s: any) => s.name)).toEqual(['开', '高', '低', '收'])
  })

  it('省略 open 时写成高低收三个系列，没有涨跌柱', async () => {
    const { bytes } = await exported(candle(false))
    const xml = chartXml(bytes)
    expect(xml).toContain('<c:stockChart>')
    expect(xml).not.toContain('<c:upDownBars>')
    expect((await specOf(bytes)).series).toHaveLength(3)
  })

  it('与其他系列类型混排时落占位', async () => {
    const el = candle(true) as unknown as Record<string, any>
    el.series.push({ type: 'line', name: 'MA', encode: { x: '日', y: '收' } })
    const { warnings } = await exported(el as unknown as ElementBase)
    expect(warnings.some((w) => w.includes('混排'))).toBe(true)
  })
})
describe('散点 / 气泡 / 雷达逆向往返', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'ppt-point-radar-'))
  }, 60000)
  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  }, 60000)

  async function reversed(element: ElementBase): Promise<Record<string, any>> {
    const { bytes } = await exported(element)
    await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    for (const page of loaded.pages.values()) {
      for (const e of (page as Page).elements as Array<Record<string, any>>) if (e.elementType === 'chart') return e
    }
    throw new Error('逆向后没有图表元素')
  }

  it('散点：每个系列各占 x / y 两列，标记形状与大小回到 marker', { timeout: 120000 }, async () => {
    const chart = await reversed(scatter())
    expect(chart.data.cols).toEqual(['甲 X', '甲', '乙 X', '乙'])
    expect(chart.data.rows[0]).toEqual([1, 2, 1, 5])
    expect(chart.data.rows[2]).toEqual([3, 3, null, null])
    expect(chart.series[0]).toMatchObject({ type: 'scatter', encode: { x: '甲 X', y: '甲' } })
    expect(chart.series[0].marker).toMatchObject({ shape: 'diamond', size: 12 })
    expect(chart.yAxis).toMatchObject({ min: 0, max: 6, gridLine: false })
  })

  it('气泡：size 列与线性缩放回到 PPTD', { timeout: 120000 }, async () => {
    const chart = await reversed(bubble())
    expect(chart.data.cols).toEqual(['规模 X', '规模', '规模 大小'])
    expect(chart.series[0]).toMatchObject({ type: 'bubble', sizeScale: 'linear', encode: { x: '规模 X', y: '规模', size: '规模 大小' } })
  })

  it('K 线：开高低收列与涨跌柱颜色回到 candlestick 系列', { timeout: 120000 }, async () => {
    const chart = await reversed(candle(true))
    expect(chart.series).toHaveLength(1)
    expect(chart.series[0]).toMatchObject({ type: 'candlestick', encode: { x: '类别', open: '开', high: '高', low: '低', close: '收' } })
    expect(chart.series[0].upBars.fill.toLowerCase()).toBe('#d93a2b')
    expect(chart.series[0].downBars.fill.toLowerCase()).toBe('#2a9d5c')
    expect(chart.data.rows[1]).toEqual(['周二', 12, 16, 11, 15])
  })

  it('高低收三个系列的 K 线不带 open', { timeout: 120000 }, async () => {
    const chart = await reversed(candle(false))
    expect(chart.series[0].encode.open).toBeUndefined()
    expect(chart.series[0].encode.close).toBe('收')
  })
  it('雷达：辐条列、填充与仅轮廓、spokeAxis 范围回到 PPTD', { timeout: 120000 }, async () => {
    const chart = await reversed(radar())
    expect(chart.data.cols[0]).toBe('类别')
    expect(chart.data.rows.map((r: unknown[]) => r[0])).toEqual(['速度', '质量', '成本', '体验', '安全'])
    expect(chart.series).toHaveLength(2)
    expect(chart.series[0].type).toBe('radar')
    expect(chart.spokeAxis).toMatchObject({ min: 0, max: 6 })
  })
})
