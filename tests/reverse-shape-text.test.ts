/**
 * Reverse mapping of text that does not live in a txBox, and of text bodies
 * shrunk by `<a:normAutofit>`.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { unzipSync, zipSync } from 'fflate'
import {
  addBlankSlide,
  addSlideShape,
  addSlideTextBox,
  createPresentation,
  emu,
  savePresentation,
  setParagraphLineSpacing,
  setShapeFill,
  setShapeParagraphs,
  setShapeTextAutoFit
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/index.js'
import { loadProject } from '../src/core/project/store.js'
import type { Page } from '../src/core/pptd/parse.js'

const PT = 12700

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-reverse-text-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

type AnyElement = Page['elements'][number] & {
  content?: { text?: string }
  bounds?: number[]
  fill?: { color?: string }
}

async function importSingle(bytes: Uint8Array): Promise<{ page: Page; report: Awaited<ReturnType<typeof reverseImport>> }> {
  const report = await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
  const loaded = await loadProject(cwd, 'proj')
  return { page: loaded.pages.get('pages/01.page') as Page, report }
}

describe('reverse：形状内嵌文字与缩字适配', () => {
  it('带文字的预设形状拆成 Shape + 同 bounds 叠放 Text，并如实记账', async () => {
    const pres = createPresentation({ size: '16:9' })
    const slide = addBlankSlide(pres)
    const card = addSlideShape(slide, { preset: 'roundRect', x: emu(100 * PT), y: emu(80 * PT), w: emu(300 * PT), h: emu(120 * PT), text: ' ' })
    setShapeFill(card, '#C8102E')
    setShapeParagraphs(card, [{ runs: [{ text: '卡片里的标题', format: { size: 24, bold: true } }] }])
    const plain = addSlideShape(slide, { preset: 'ellipse', x: emu(500 * PT), y: emu(80 * PT), w: emu(100 * PT), h: emu(100 * PT) })
    setShapeFill(plain, '#2456C4')
    const { page, report } = await importSingle(await savePresentation(pres))

    const elements = page.elements as AnyElement[]
    const shapes = elements.filter((e) => e.elementType === 'shape')
    const texts = elements.filter((e) => e.elementType === 'text')
    expect(shapes).toHaveLength(2)
    expect(texts).toHaveLength(1)
    const text = texts[0]
    expect(text.content?.text).toContain('卡片里的标题')
    const cardShape = shapes.find((s) => s.fill?.color === '#C8102E')
    expect(cardShape).toBeDefined()
    expect(text.bounds).toEqual(cardShape!.bounds)
    expect(text.elementId).toBe(`${cardShape!.elementId}-text`)
    // 文字叠放在形状之上
    expect(elements.indexOf(text)).toBeGreaterThan(elements.indexOf(cardShape!))
    expect(report.degraded.some((d) => d.elementId === text.elementId && d.detail.includes('Shape + 叠放 Text'))).toBe(true)
  })

  it('连接线按 bounds 与 flip 写真实端点、viewBox 与箭头', async () => {
    const { addSlideLine, setShapeStroke, setShapeStrokeArrow } = await import('@office-kit/pptx')
    const pres = createPresentation({ size: '16:9' })
    const slide = addBlankSlide(pres)
    const down = addSlideLine(slide, { from: { x: emu(100 * PT), y: emu(100 * PT) }, to: { x: emu(300 * PT), y: emu(150 * PT) } })
    setShapeStroke(down, { color: '#112233', widthEmu: 2 * PT })
    setShapeStrokeArrow(down, 'tail', { type: 'triangle' })
    addSlideLine(slide, { from: { x: emu(300 * PT), y: emu(200 * PT) }, to: { x: emu(100 * PT), y: emu(250 * PT) } })
    const { page } = await importSingle(await savePresentation(pres))
    const lines = (page.elements as Array<AnyElement & { points?: string; viewBox?: number[]; arrow?: unknown[]; flip?: boolean[] }>).filter(
      (e) => e.elementType === 'line'
    )
    expect(lines).toHaveLength(2)
    expect(lines[0].viewBox).toEqual([200, 50])
    expect(lines[0].points).toBe('0,0 200,50')
    expect(lines[0].arrow).toEqual([null, 'arrow'])
    expect(lines[0].flip).toEqual([false, false])
    // 右上→左下：水平翻转折算进端点
    expect(lines[1].points).toBe('200,0 0,50')
  })

  it('normAutofit 的 fontScale / lnSpcReduction 折算进字号与行距并记 text.autoFit', async () => {
    const pres = createPresentation({ size: '16:9' })
    const slide = addBlankSlide(pres)
    const box = addSlideTextBox(slide, { x: emu(40 * PT), y: emu(40 * PT), w: emu(400 * PT), h: emu(60 * PT), text: '' })
    setShapeParagraphs(box, [{ runs: [{ text: '很长的标题被缩字', format: { size: 40 } }] }])
    setParagraphLineSpacing(box, 0, { kind: 'pct', value: 1.2 })
    setShapeTextAutoFit(box, 'normal')
    const entries = unzipSync(await savePresentation(pres))
    const slidePath = 'ppt/slides/slide1.xml'
    const xml = new TextDecoder().decode(entries[slidePath])
    expect(xml).toMatch(/<a:normAutofit\s*\/>/)
    entries[slidePath] = new TextEncoder().encode(
      xml.replace(/<a:normAutofit\s*\/>/, '<a:normAutofit fontScale="50000" lnSpcReduction="20000"/>')
    )
    const { page, report } = await importSingle(zipSync(entries))

    const text = (page.elements as AnyElement[]).find((e) => e.elementType === 'text')
    const html = text?.content?.text ?? ''
    expect(html).toContain('font-size:20px')
    expect(html).toContain('line-height:1')
    expect(html).not.toContain('font-size:40px')
    const fit = report.degraded.find((d) => d.feature === 'text.autoFit')
    expect(fit?.elementId).toBe(text?.elementId)
    expect(fit?.originalValue).toBe('fontScale=0.5;lnSpcReduction=0.2')
  })
})
