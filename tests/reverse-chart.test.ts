/**
 * 原生图表逆向为 PPTD chart，并在逐页重建后仍是原生图表。
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addBlankSlide,
  addSlideChart,
  createPresentation,
  emu,
  getSlideCharts,
  getSlides,
  loadPresentation,
  savePresentation
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/index.js'
import { PAGE_FINGERPRINTS_FILE } from '../src/core/reverse/restore.js'
import { loadProject } from '../src/core/project/store.js'
import { buildProjectDeck, saveRawProjectPptx } from '../src/core/export-pipeline.js'
import type { Page } from '../src/core/pptd/parse.js'

const PT = 12700
let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-reverse-chart-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

async function sourceDeck(): Promise<Uint8Array> {
  const pres = createPresentation({ size: '16:9' })
  addSlideChart(addBlankSlide(pres), {
    spec: {
      kind: 'bar',
      categories: ['甲', '乙', '丙'],
      grouping: 'stacked',
      legend: { position: 'b' },
      series: [
        { name: '一季', values: [3, 5, 2], color: 'C00000' },
        { name: '二季', values: [1, null, 4], color: '0070C0' }
      ]
    } as never,
    x: emu(60 * PT), y: emu(60 * PT), w: emu(400 * PT), h: emu(300 * PT)
  })
  addSlideChart(addBlankSlide(pres), {
    spec: {
      kind: 'doughnut',
      categories: ['A', 'B'],
      holeSizePct: 60,
      series: [{ name: '占比', values: [70, 30], pointColors: ['FF0000', '00FF00'] }]
    } as never,
    x: emu(60 * PT), y: emu(60 * PT), w: emu(300 * PT), h: emu(300 * PT)
  })
  return savePresentation(pres)
}

type Chart = Record<string, any>

describe('reverse：原生图表', () => {
  it('横向堆叠条形图与环形图映射为 PPTD chart，逐页重建后仍是原生图表', async () => {
    const report = await reverseImport({ cwd, source: await sourceDeck(), targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    const chartsOf = (p: string) =>
      ((loaded.pages.get(p) as Page).elements as Chart[]).filter((e) => e.elementType === 'chart')

    const [bar] = chartsOf('pages/01.page')
    expect(bar.data.cols).toEqual(['类别', '一季', '二季'])
    expect(bar.data.rows).toEqual([['甲', 3, 1], ['乙', 5, null], ['丙', 2, 4]])
    expect(bar.yAxis).toEqual({ type: 'category' })
    expect(bar.series[0]).toMatchObject({ type: 'bar', stack: 'value', encode: { x: '一季', y: '类别' } })
    expect(String(bar.series[0].fill).toUpperCase()).toBe('#C00000')
    expect(bar.legend).toBe(true)

    const [ring] = chartsOf('pages/02.page')
    expect(ring.legend).toBe(false)
    expect(ring.series[0]).toMatchObject({ type: 'pie', encode: { category: '类别', value: '占比' } })
    expect(ring.series[0].innerRadius).toBeCloseTo(0.6)
    expect((ring.series[0].fill as string[]).map((c) => c.toUpperCase())).toEqual(['#FF0000', '#00FF00'])

    await rm(path.join(report.projectDir, 'source', PAGE_FINGERPRINTS_FILE), { force: true })
    const bytes = await saveRawProjectPptx(await buildProjectDeck(cwd, 'proj'))
    const pres = await loadPresentation(bytes)
    const specs = getSlides(pres).flatMap((slide) => getSlideCharts(slide).map((c) => c.spec))
    expect(specs.map((s) => s?.kind)).toEqual(['bar', 'doughnut'])
    expect(specs[1]?.series[0].pointColors?.map((c) => c?.toUpperCase())).toEqual(['#FF0000', '#00FF00'])
  })
})
