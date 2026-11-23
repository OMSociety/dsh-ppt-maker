/** 图表图案填充与饼 / 环形图逐点数据标签：校验、导出、逆向往返。 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { strFromU8, unzipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getSlideCharts, getSlides, loadPresentation } from '@office-kit/pptx'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import type { ElementBase, Page, Presentation } from '../src/core/pptd/schema.js'
import { validateChartData } from '../src/core/pptd/element-fields.js'
import { reverseImport } from '../src/core/reverse/index.js'
import { PAGE_FINGERPRINTS_FILE } from '../src/core/reverse/restore.js'
import { loadProject } from '../src/core/project/store.js'
import { buildProjectDeck, saveRawProjectPptx } from '../src/core/export-pipeline.js'

const corpus = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus', 'tpl-badge-blue-desens.pptx')

function ctx(): BuildContext {
  return { projectDir: '/tmp/pptd-chart-pattern-test', loadMedia: async () => { throw new Error('no media') }, warnings: [] }
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

const hatch = { type: 'pattern', preset: 'ltUpDiag', foreground: '#2456c4', background: '#ffffff' }

function ring(): ElementBase {
  return {
    elementId: 'ring',
    elementType: 'chart',
    bounds: [80, 60, 300, 300],
    fill: { type: 'pattern', preset: 'wdUpDiag', foreground: '#d9d9d9', background: '#ffffff' },
    data: { cols: ['项', '占比'], rows: [['完成', 0.74], ['其余', 0.26]] },
    series: [
      {
        type: 'pie',
        name: '占比',
        encode: { category: '项', value: '占比' },
        innerRadius: 0.7,
        fill: ['#2456c4', hatch],
        dataLabels: {
          show: true,
          numberFormat: '0%',
          points: [{ show: true, offset: { x: -0.2459, y: -0.276 }, fontSize: 40, bold: true, color: '#2456c4' }, { show: false }]
        }
      }
    ],
    legend: false
  } as unknown as ElementBase
}

async function exported(element: ElementBase): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  const engine = createOfficeKitEngine()
  const built = await engine.buildDeck({ deck: deck(), pages: [{ elements: [element] } as Page] }, ctx())
  return { bytes: await engine.saveDeck(built.native), warnings: built.warnings }
}

function chartXmls(bytes: Uint8Array): string[] {
  const files = unzipSync(bytes)
  return Object.keys(files)
    .filter((n) => /^ppt\/charts\/chart[^/]*\.xml$/.test(n))
    .map((n) => strFromU8(files[n]))
}

describe('图表图案填充与逐点标签', () => {
  it('手写环形图：图案切片、容器图案与中心标签写入合法的 chart XML，并可被库读回', async () => {
    const { bytes, warnings } = await exported(ring())
    expect(warnings).toEqual([])
    const [xml] = chartXmls(bytes)
    expect(xml).toContain('<a:pattFill prst="ltUpDiag">')
    expect(xml).toContain('<a:pattFill prst="wdUpDiag">')
    expect(xml).toContain('<c:x val="-0.2459"/><c:y val="-0.276"/>')
    expect(xml).toContain('<c:dLbl><c:idx val="1"/><c:delete val="1"/></c:dLbl>')
    expect(xml).toContain('sz="4000"')
    // CT_DLbl 顺序：idx、layout、numFmt、txPr、show*
    const dlbl = /<c:dLbl><c:idx val="0"\/>[\s\S]*?<\/c:dLbl>/.exec(xml)![0]
    const order = ['<c:layout>', '<c:numFmt', '<c:txPr>', '<c:showLegendKey'].map((t) => dlbl.indexOf(t))
    expect(order.every((n) => n >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    // chartSpace spPr 位于 c:chart 之后
    expect(xml.indexOf('<a:pattFill prst="wdUpDiag">')).toBeGreaterThan(xml.indexOf('</c:chart>'))

    const back = await loadPresentation(bytes)
    const spec = getSlideCharts(getSlides(back)[0])[0].spec
    expect(spec?.kind).toBe('doughnut')
    expect(spec?.series[0].values).toEqual([0.74, 0.26])
  })

  it('柱状图系列图案写入系列 spPr 并保留线条', async () => {
    const hatched = { ...hatch }
    const bars = {
      elementId: 'bars',
      elementType: 'chart',
      bounds: [80, 60, 400, 300],
      data: { cols: ['月', '额'], rows: [['一', 3], ['二', 5]] },
      series: [{ type: 'bar', name: '额', encode: { x: '月', y: '额' }, fill: hatched }]
    } as unknown as ElementBase
    const { bytes } = await exported(bars)
    const [xml] = chartXmls(bytes)
    expect(xml).toMatch(/<c:ser>[\s\S]*?<c:spPr>[^]*?<a:pattFill prst="ltUpDiag">[\s\S]*?<\/c:spPr>[\s\S]*?<c:cat>/)
    expect(xml).not.toMatch(/<c:ser>[\s\S]*?<a:solidFill><a:srgbClr val="2456C4"\/>[\s\S]*?<c:cat>/i)
  })

  it('环形图的绘图区位置与标签框尺寸随图表一起落盘', async () => {
    const el = ring() as unknown as Record<string, unknown>
    el.plotLayout = { x: 0.1079, y: 0.0141, w: 0.7755, h: 0.961, target: 'inner' }
    const s = (el.series as Array<Record<string, unknown>>)[0]
    ;(s.dataLabels as Record<string, unknown>).points = [{ show: true, offset: { x: -0.2459, y: -0.276 }, size: { w: 0.5064, h: 0.4477 } }]
    const { bytes } = await exported(el as unknown as ElementBase)
    const [xml] = chartXmls(bytes)
    expect(xml).toMatch(/<c:plotArea><c:layout><c:manualLayout><c:layoutTarget val="inner"\/>[\s\S]*?<c:x val="0.1079"\/><c:y val="0.0141"\/><c:w val="0.7755"\/><c:h val="0.961"\/>/)
    // 标签框尺寸用 OOXML 指定的 c15 扩展 URI，包在 c:extLst 里，否则渲染器忽略
    expect(xml).toContain('<c:extLst><c:ext uri="{CE6537A1-D6FC-4f65-9D91-7224C49458BB}"')
    expect(xml).toContain('<c:w val="0.5064"/><c:h val="0.4477"/>')
    expect(xml).toContain('anchor="ctr" anchorCtr="1"')
  })

  it('校验器拒绝非法 PatternFill 与 dataLabels.points', () => {
    const bad = (patch: Record<string, unknown>) => {
      const el = ring() as unknown as Record<string, unknown>
      const s = (el.series as Array<Record<string, unknown>>)[0]
      Object.assign(s, patch)
      return validateChartData(el as never, 'e')
    }
    const codes = (issues: Array<{ code?: string }>) => issues.map((i) => i.code)
    expect(codes(bad({ fill: [{ type: 'pattern', preset: 'nope', foreground: '#000', background: '#fff' }] }))).toContain('SchemaError')
    expect(codes(bad({ dataLabels: { show: true, points: 'x' } }))).toContain('SchemaError')
    expect(codes(bad({ dataLabels: { show: true, points: [{ offset: { x: 'a', y: 0 } }] } }))).toContain('SchemaError')
    expect(codes(bad({ dataLabels: { show: true, points: [null, { show: false }] } }))).not.toContain('SchemaError')
  })
})

describe('tpl-badge 图表往返', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'ppt-chart-pattern-'))
  })
  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  it('背景斜纹与环形图斜纹切片、中心标签导入后落在 PPTD，重建后仍是图案与偏移', async () => {
    const report = await reverseImport({ cwd, source: new Uint8Array(await readFile(corpus)), targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    const charts: Array<Record<string, any>> = []
    for (const page of loaded.pages.values()) {
      for (const e of (page as Page).elements as Array<Record<string, any>>) if (e.elementType === 'chart') charts.push(e)
    }
    const striped = charts.find((c) => c.series?.some((s: any) => s?.fill?.type === 'pattern'))
    expect(striped!.series[1].fill).toMatchObject({ type: 'pattern', preset: 'ltUpDiag' })
    const centre = charts.find((c) => c.series?.[0]?.dataLabels?.points)
    const points = centre!.series[0].dataLabels.points
    expect(points[0].offset.x).toBeCloseTo(-0.2459, 3)
    expect(points[0].offset.y).toBeCloseTo(-0.276, 3)
    expect(points[0].size.w).toBeCloseTo(0.5064, 3)
    expect(points[0].size.h).toBeCloseTo(0.4477, 3)
    expect(points[0].fontSize).toBe(40)
    expect(points[1].show).toBe(false)
    expect(centre!.series[0].fill.some((f: unknown) => (f as { type?: string })?.type === 'pattern')).toBe(true)
    expect(report.degraded.some((d) => String(d.detail).includes('逐点显隐'))).toBe(false)

    await rm(path.join(report.projectDir, 'source', PAGE_FINGERPRINTS_FILE), { force: true })
    const bytes = await saveRawProjectPptx(await buildProjectDeck(cwd, 'proj'))
    const xmls = chartXmls(bytes)
    expect(xmls.some((x) => /<c:ser>[\s\S]*?<a:pattFill prst="ltUpDiag">/.test(x))).toBe(true)
    expect(xmls.some((x) => x.includes('<c:x val="-0.2459"/>') && x.includes('<c:delete val="1"/>'))).toBe(true)
  })
})


