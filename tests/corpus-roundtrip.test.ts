/**
 * 语料对拍（PR 1 plan §5 一致性测试、§8「20 份真实语料 round-trip」）：
 * tests/corpus/ 20 份脱敏 pptx → loadPresentation → 断言关键字段。
 *
 * 断言口径（与 MANIFEST.md 的覆盖矩阵逐条对应）：
 *  - 每份：能打开、页数与清单一致、画布尺寸是 16:9；
 *  - 每份：至少一处可读文本、形状数 > 0；
 *  - 按清单点名抽查：图表（xiaohui 蓝版 6 个 / xueshu 4 个）、表格（xiaohui
 *    蓝版 1 个）、隐藏页（mun-v2 第 5 页 show=0）、备注（fumunc-v1 有文本备注）。
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

/** MANIFEST.md 第一节的页数台账（手工对拍口径的唯一来源）。 */
const EXPECTED_PAGE_COUNTS: Record<string, number> = {
  'mun-training-desens-v1.pptx': 22,
  'mun-training-desens-v2.pptx': 20,
  'mun-training-desens-v3.pptx': 23,
  'fumunc-closing-desens-v1.pptx': 8,
  'fumunc-closing-desens-v2.pptx': 7,
  'tpl-shekehong-jianyue-desens.pptx': 20,
  'tpl-shekehong-xingzheng-desens.pptx': 25,
  'tpl-xiaohui-blue-desens.pptx': 51,
  'tpl-xiaohui-red-desens.pptx': 51,
  'tpl-xueshu-dabian-desens.pptx': 25,
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
  it('tests/corpus 恰好是清单里的 20 份', async () => {
    const files = (await readdir(CORPUS_DIR)).filter((f) => f.endsWith('.pptx')).sort()
    expect(files).toEqual(Object.keys(EXPECTED_PAGE_COUNTS).sort())
  })

  for (const [name, pageCount] of Object.entries(EXPECTED_PAGE_COUNTS)) {
    it(`${name}：打开 + ${pageCount} 页 + 有文本 + 结构校验零 error`, async () => {
      const pres = await loadCorpus(name)

      // 页数与清单一致
      expect(getSlideCount(pres)).toBe(pageCount)
      expect(getSlides(pres)).toHaveLength(pageCount)

      // 画布尺寸：16:9（12192000×6858000 EMU）或 16:10（18288000×11430000 不
      // 在语料里；fumunc 两份是 18288000×10287000，即 A4 横向 16:9 高的变体）。
      // 口径：尺寸必须能读出来且宽高比落在 16:9~16:10 之间。
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

  /* ---------------- 按清单点名抽查（覆盖矩阵的抽样对拍） ---------------- */

  it('tpl-xiaohui-blue-desens：6 个图表 + 1 个表格（清单口径）', async () => {
    const pres = await loadCorpus('tpl-xiaohui-blue-desens.pptx')
    // 实测 API 形态：getPresentation*CountsBySlide 返回 number[]（每页计数）。
    expect(sumCounts(getPresentationChartCountsBySlide(pres))).toBe(6)
    expect(sumCounts(getPresentationTableCountsBySlide(pres))).toBe(1)
  })

  it('tpl-xueshu-dabian-desens：4 个图表', async () => {
    const pres = await loadCorpus('tpl-xueshu-dabian-desens.pptx')
    expect(sumCounts(getPresentationChartCountsBySlide(pres))).toBe(4)
  })

  it('mun-training-desens-v2：第 5 页隐藏（show=0）', async () => {
    const pres = await loadCorpus('mun-training-desens-v2.pptx')
    expect(isSlideHidden(getSlides(pres)[4])).toBe(true)
    // 其余页不隐藏（抽第 1 页对照）
    expect(isSlideHidden(getSlides(pres)[0])).toBe(false)
  })

  it('fumunc-closing-desens-v1：至少有 1 页带文本备注', async () => {
    const pres = await loadCorpus('fumunc-closing-desens-v1.pptx')
    // 实测 API 形态：getSlideNotes 返回 string | null。
    const withNotes = getSlides(pres).filter((s) => notesText(s).trim().length > 0)
    expect(withNotes.length).toBeGreaterThan(0)
  })

  it('脱敏红线抽查：全 20 份文本不含「中国社会科学院大学」', async () => {
    // 语料入库时已做 45 串双通道零命中校验；这里抽最显眼的一串做回归。
    for (const name of Object.keys(EXPECTED_PAGE_COUNTS)) {
      const pres = await loadCorpus(name)
      expect(deckText(pres)).not.toContain('中国社会科学院大学')
    }
  })
})
