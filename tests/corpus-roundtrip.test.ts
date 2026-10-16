/**
 * 语料对拍（一致性测试：20 份真实语料 round-trip）：
 * tests/corpus/ 20 份脱敏 pptx → loadPresentation → 断言关键字段。
 *
 * 语料分两类，文件名保持中性（不含来源机构/会议/主题名）：
 *  - `real-*` / `tpl-*`：真实 deck 的脱敏变体（10 份）。原始文件与脱敏映射都在
 *    本机暂存区，**不进仓库**；改名只为不带出可识别的专名。
 *  - `syn-*`：按设计系统合成的 10 份，无来源。
 *
 * 断言口径：
 *  - 每份：能打开、页数与台账一致、画布接近 16:9；
 *  - 每份：至少一处可读文本、形状数 > 0、结构校验零 error；
 *  - 按覆盖点抽查：图表（徽标蓝版 6 个 / 答辩 4 个）、表格（徽标蓝版 1 个）、
 *    隐藏页（training-v2 第 5 页 show=0）、备注（notes-v1 有文本备注）。
 *
 * 这批文件是「引擎 + 解析层面对真实世界 pptx 不炸」的护栏：任何引擎升级
 * （0.24.0 → 以后）先过这里再谈合并。
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  getPresentationChartCountsBySlide,
  getPresentationTableCountsBySlide,
  getShapeText,
  getSlideCount,
  getSlideNotes,
  getSlideShapes,
  getSlideSize,
  getSlides,
  isSlideHidden,
  loadPresentation,
  validatePresentation,
  type PresentationData
} from '@office-kit/pptx'

const CORPUS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'corpus')
/** 脱敏词表：只在本机存在（.gitignore 挡住），仓库里不留任何真实专名。 */
const SENSITIVE_WORDS = path.join(CORPUS_DIR, 'sensitive-words.txt')

/** 页数台账（覆盖矩阵的机器可读版本）。 */
const EXPECTED_PAGE_COUNTS: Record<string, number> = {
  'real-training-v1.pptx': 22,
  'real-training-v2.pptx': 20,
  'real-training-v3.pptx': 23,
  'real-notes-v1.pptx': 8,
  'real-notes-v2.pptx': 7,
  'tpl-theme-a-desens.pptx': 20,
  'tpl-theme-b-desens.pptx': 25,
  'tpl-badge-blue-desens.pptx': 51,
  'tpl-badge-red-desens.pptx': 51,
  'tpl-defense-desens.pptx': 25,
  'syn-academic-v1.pptx': 9,
  'syn-academic-v2.pptx': 8,
  'syn-consulting-v1.pptx': 9,
  'syn-consulting-v2.pptx': 8,
  'syn-finance-v1.pptx': 8,
  'syn-finance-v2.pptx': 8,
  'syn-promotion-v1.pptx': 8,
  'syn-promotion-v2.pptx': 8,
  'syn-work-v1.pptx': 8,
  'syn-work-v2.pptx': 8
}

async function loadCorpus(name: string): Promise<PresentationData> {
  const bytes = await readFile(path.join(CORPUS_DIR, name))
  return loadPresentation(new Uint8Array(bytes))
}

/** getPresentation*CountsBySlide 返回 readonly number[]（每页一个计数），不是行对象。 */
function sumCounts(counts: readonly number[]): number {
  return counts.reduce((a, b) => a + b, 0)
}

/** getSlideNotes 返回 string | null（实测：无备注页给 null）。 */
function notesText(slide: unknown): string {
  try {
    const notes = getSlideNotes(slide as never)
    return typeof notes === 'string' ? notes : ''
  } catch {
    return ''
  }
}

/** 全 deck 的可读文本总量（所有页所有形状 getShapeText 拼接）。 */
function deckText(pres: PresentationData): string {
  const parts: string[] = []
  for (const slide of getSlides(pres)) {
    for (const shape of getSlideShapes(slide)) {
      try {
        parts.push(getShapeText(shape))
      } catch {
        // 单个形状读不出文本不炸整份
      }
    }
  }
  return parts.join('\n')
}

describe('语料对拍：20 份脱敏 pptx → loadPresentation', () => {
  it('tests/corpus 恰好是台账里的 20 份', async () => {
    const files = (await readdir(CORPUS_DIR)).filter((f) => f.endsWith('.pptx')).sort()
    expect(files).toEqual(Object.keys(EXPECTED_PAGE_COUNTS).sort())
  })

  for (const [name, pageCount] of Object.entries(EXPECTED_PAGE_COUNTS)) {
    it(`${name}：打开 + ${pageCount} 页 + 有文本 + 结构校验零 error`, async () => {
      const pres = await loadCorpus(name)

      // 页数与台账一致
      expect(getSlideCount(pres)).toBe(pageCount)
      expect(getSlides(pres)).toHaveLength(pageCount)

      // 画布尺寸：必须能读出来且宽高比落在 16:9~16:10 之间（real-notes 两份是
      // 18288000×10287000，即 A4 横向的 16:9 变体）。
      const size = getSlideSize(pres)
      expect(size).not.toBeNull()
      const w = Number(size!.width)
      const h = Number(size!.height)
      expect(w).toBeGreaterThan(0)
      expect(h).toBeGreaterThan(0)
      expect(w / h).toBeGreaterThan(1.7)
      expect(w / h).toBeLessThan(1.85)

      // 关键字段：至少一处可读文本 + 形状存在
      const slides = getSlides(pres)
      const shapeCounts = slides.map((s) => getSlideShapes(s).length)
      expect(shapeCounts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
      expect(deckText(pres).trim().length).toBeGreaterThan(0)

      // 结构健全：validatePresentation 无 error 级
      const issues = validatePresentation(pres)
      expect(issues.filter((i) => i.severity === 'error')).toEqual([])
    })
  }

  /* ---------------- 按覆盖点抽查 ---------------- */

  it('tpl-badge-blue-desens：6 个图表 + 1 个表格', async () => {
    const pres = await loadCorpus('tpl-badge-blue-desens.pptx')
    // 实测 API 形态：getPresentation*CountsBySlide 返回 number[]（每页计数）。
    expect(sumCounts(getPresentationChartCountsBySlide(pres))).toBe(6)
    expect(sumCounts(getPresentationTableCountsBySlide(pres))).toBe(1)
  })

  it('tpl-defense-desens：4 个图表', async () => {
    const pres = await loadCorpus('tpl-defense-desens.pptx')
    expect(sumCounts(getPresentationChartCountsBySlide(pres))).toBe(4)
  })

  it('real-training-v2：第 5 页隐藏（show=0）', async () => {
    const pres = await loadCorpus('real-training-v2.pptx')
    expect(isSlideHidden(getSlides(pres)[4])).toBe(true)
    // 其余页不隐藏（抽第 1 页对照）
    expect(isSlideHidden(getSlides(pres)[0])).toBe(false)
  })

  it('real-notes-v1：至少有 1 页带文本备注', async () => {
    const pres = await loadCorpus('real-notes-v1.pptx')
    // 实测 API 形态：getSlideNotes 返回 string | null。
    const withNotes = getSlides(pres).filter((s) => notesText(s).trim().length > 0)
    expect(withNotes.length).toBeGreaterThan(0)
  })

  it('脱敏红线：全 20 份文本不含本机词表里的任一串', async () => {
    // 词表刻意不入库（内含来源专名）；权威口径在语料生成管线里（45 串双通道零命中）。
    let words: string[]
    try {
      words = (await readFile(SENSITIVE_WORDS, 'utf8'))
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('#'))
    } catch {
      return // 本机没有词表就跳过：这项校验的前提是「本机持有原始语料」
    }
    expect(words.length).toBeGreaterThan(0)
    for (const name of Object.keys(EXPECTED_PAGE_COUNTS)) {
      const text = deckText(await loadCorpus(name))
      for (const word of words) {
        expect(text, `${name} 命中词表串`).not.toContain(word)
      }
    }
  })
})
