/**
 * 逆向回归基线：tests/corpus/ 20 份 pptx 逐份 ppt_import → 改动后重建 → 回读，
 * 与入库基线 tests/corpus/reverse-baseline.json 比对。
 *
 * 「改动后重建」：删掉 source/page-fingerprints.json 让整份恢复判定 fail-closed，
 * 导出走逐页重建——这是用户改过任意一页之后的真实路径，零编辑整份恢复测不出它。
 *
 * 每份记录：
 *  - 源文字量与重建后保留的文字量（去空白后按字符多重集求交，占位提示等新增文字不计入）；
 *  - 重建产物里的图片、表格、原生图表数；
 *  - 导入报告的 dropped / degraded 条数与占位数。
 *
 * 断言：文字保留、图片/表格/图表数不得低于基线，dropped 与占位不得多于基线。
 * 能力变好时用 UPDATE_REVERSE_BASELINE=1 重跑，把新基线一起提交。
 */
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import {
  getPresentationChartCountsBySlide,
  getPresentationTableCountsBySlide,
  getShapeText,
  getSlideShapes,
  getSlides,
  hasShapeImage,
  loadPresentation,
  type PresentationData
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/apply.js'
import { PAGE_FINGERPRINTS_FILE } from '../src/core/reverse/restore.js'
import { buildProjectDeck, saveRawProjectPptx } from '../src/core/export-pipeline.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CORPUS_DIR = path.join(HERE, 'corpus')
const BASELINE = path.join(CORPUS_DIR, 'reverse-baseline.json')
const UPDATE = process.env.UPDATE_REVERSE_BASELINE === '1'

export interface CorpusStats {
  pages: number
  sourceChars: number
  keptChars: number
  pictures: number
  tables: number
  charts: number
  sourcePictures: number
  sourceTables: number
  sourceCharts: number
  dropped: number
  degraded: number
  placeholders: number
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}

function charCounts(pres: PresentationData): Map<string, number> {
  const counts = new Map<string, number>()
  for (const slide of getSlides(pres)) {
    for (const shape of getSlideShapes(slide)) {
      let text = ''
      try {
        text = getShapeText(shape)
      } catch {
        text = ''
      }
      for (const ch of text.replace(/\s+/g, '')) counts.set(ch, (counts.get(ch) ?? 0) + 1)
    }
  }
  return counts
}

function sizeOf(counts: Map<string, number>): number {
  return sum([...counts.values()])
}

function overlap(a: Map<string, number>, b: Map<string, number>): number {
  let n = 0
  for (const [ch, k] of a) n += Math.min(k, b.get(ch) ?? 0)
  return n
}

function pictureCount(pres: PresentationData): number {
  let n = 0
  for (const slide of getSlides(pres)) {
    for (const shape of getSlideShapes(slide)) {
      try {
        if (hasShapeImage(shape)) n++
      } catch {
        // 不可读的形状不计数
      }
    }
  }
  return n
}

async function measure(name: string, work: string): Promise<CorpusStats> {
  const bytes = new Uint8Array(await readFile(path.join(CORPUS_DIR, name)))
  const source = await loadPresentation(bytes)
  const dir = name.replace(/\.pptx$/, '')
  const result = await reverseImport({ cwd: work, source: bytes, targetDir: dir })
  const reportText = await readFile(path.join(result.projectDir, 'import.report.yml'), 'utf8')
  const placeholders = Number(/placeholders:\s*(\d+)/.exec(reportText)?.[1] ?? '0')
  await rm(path.join(result.projectDir, 'source', PAGE_FINGERPRINTS_FILE), { force: true })
  const pipeline = await buildProjectDeck(work, dir)
  const rebuilt = await loadPresentation(await saveRawProjectPptx(pipeline))
  return {
    pages: getSlides(rebuilt).length,
    sourceChars: sizeOf(charCounts(source)),
    keptChars: overlap(charCounts(source), charCounts(rebuilt)),
    pictures: pictureCount(rebuilt),
    tables: sum(getPresentationTableCountsBySlide(rebuilt)),
    charts: sum(getPresentationChartCountsBySlide(rebuilt)),
    sourcePictures: pictureCount(source),
    sourceTables: sum(getPresentationTableCountsBySlide(source)),
    sourceCharts: sum(getPresentationChartCountsBySlide(source)),
    dropped: result.dropped.length,
    degraded: result.degraded.length,
    placeholders
  }
}

const files = (await readdir(CORPUS_DIR)).filter((f) => f.endsWith('.pptx')).sort()
const baseline: Record<string, CorpusStats> = existsSync(BASELINE)
  ? JSON.parse(await readFile(BASELINE, 'utf8'))
  : {}
const measured: Record<string, CorpusStats> = {}
const work = await mkdtemp(path.join(os.tmpdir(), 'ppt-reverse-corpus-'))

afterAll(async () => {
  await rm(work, { recursive: true, force: true })
  if (UPDATE && Object.keys(measured).length === files.length) {
    const sorted = Object.fromEntries(Object.keys(measured).sort().map((k) => [k, measured[k]]))
    await writeFile(BASELINE, JSON.stringify(sorted, null, 2) + '\n', 'utf8')
  }
})

describe('逆向回归基线：20 份语料导入 → 改动后重建 → 回读', () => {
  it('基线覆盖全部语料', () => {
    if (UPDATE) return
    expect(Object.keys(baseline).sort()).toEqual(files)
  })

  for (const name of files) {
    it(`${name}`, async () => {
      const stats = await measure(name, work)
      measured[name] = stats
      expect(stats.pages).toBeGreaterThan(0)
      if (UPDATE) return
      const base = baseline[name]
      expect(base, `${name} 缺基线`).toBeDefined()
      expect(stats.pages).toBe(base.pages)
      expect(stats.keptChars, '重建后保留的文字变少').toBeGreaterThanOrEqual(base.keptChars)
      expect(stats.pictures, '重建后图片变少').toBeGreaterThanOrEqual(base.pictures)
      expect(stats.tables, '重建后表格变少').toBeGreaterThanOrEqual(base.tables)
      expect(stats.charts, '重建后原生图表变少').toBeGreaterThanOrEqual(base.charts)
      expect(stats.dropped, 'dropped 变多').toBeLessThanOrEqual(base.dropped)
      expect(stats.placeholders, '占位变多').toBeLessThanOrEqual(base.placeholders)
    }, 120_000)
  }
})
