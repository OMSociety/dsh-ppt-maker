/**
 * 逆向 → 重建的保真细节：文本框内边距、字间距、分散对齐、乱序渐变文字、预设调整值。
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  addBlankSlide,
  addSlideLine,
  addSlideShape,
  addSlideTextBox,
  createPresentation,
  emu,
  savePresentation,
  setParagraphAlignment,
  setShapeAdjustValues,
  setShapeParagraphs,
  setShapeStroke,
  setShapePatternFill,
  setShapeTextMargins
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/index.js'
import { PAGE_FINGERPRINTS_FILE } from '../src/core/reverse/restore.js'
import { loadProject } from '../src/core/project/store.js'
import { buildProjectDeck, saveRawProjectPptx } from '../src/core/export-pipeline.js'
import type { Page } from '../src/core/pptd/parse.js'

const PT = 12700

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-reverse-fidelity-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

type AnyElement = Page['elements'][number] & {
  content?: { text?: string; padding?: number[]; letterSpacing?: number; gradient?: { stops: { position: number; color: string }[]; angle?: number } }
  fill?: { type?: string; preset?: string; foreground?: string; background?: string }
  shapeName?: string
  adjustments?: number[]
}

async function sourceDeck(): Promise<Uint8Array> {
  const pres = createPresentation({ size: '16:9' })
  const slide = addBlankSlide(pres)
  const flush = addSlideTextBox(slide, { x: emu(60 * PT), y: emu(40 * PT), w: emu(300 * PT), h: emu(40 * PT), text: '' })
  setShapeParagraphs(flush, [{ runs: [{ text: 'THIS IS DECORATIVE', format: { size: 18, spc: 300 } }] }])
  setShapeTextMargins(flush, { left: 0, top: 0, right: 0, bottom: 0 })
  setParagraphAlignment(flush, 0, 'distribute')
  const big = addSlideTextBox(slide, { x: emu(400 * PT), y: emu(40 * PT), w: emu(300 * PT), h: emu(200 * PT), text: '' })
  setShapeParagraphs(big, [{ runs: [{ text: '01', format: { size: 120 } }] }])
  const arc = addSlideShape(slide, { preset: 'arc', x: emu(60 * PT), y: emu(200 * PT), w: emu(200 * PT), h: emu(200 * PT) })
  setShapeAdjustValues(arc, { adj1: 1615952, adj2: 6569477 })
  const tilted = addSlideShape(slide, { preset: 'rect', x: emu(400 * PT), y: emu(300 * PT), w: emu(200 * PT), h: emu(100 * PT) })
  const line = addSlideLine(slide, { from: { x: emu(700 * PT), y: emu(300 * PT) }, to: { x: emu(700 * PT), y: emu(400 * PT) } })
  setShapeStroke(line, {
    widthEmu: 12700,
    fill: { kind: 'gradient', angleDeg: 90, stops: [{ offset: 0, color: '#C00000' }, { offset: 1, color: '#C00000', opacity: 0 }] }
  })
  void tilted
  const hatch = addSlideShape(slide, { preset: 'rect', x: emu(60 * PT), y: emu(440 * PT), w: emu(120 * PT), h: emu(60 * PT) })
  setShapePatternFill(hatch, { preset: 'dkUpDiag', foreground: '#1F4E79', background: '#FFFFFF' })
  const bytes = await savePresentation(pres)
  // 「01」的文字填充改成乱序书写的渐变：先写 74% 的白，再写 0% 的强调色。
  const files = unzipSync(bytes)
  const name = 'ppt/slides/slide1.xml'
  const xml = strFromU8(files[name]).replace(
    /(<a:rPr[^>]*sz="12000"[^>]*?)(\/>|>)/,
    (_m, open: string) =>
      `${open}><a:gradFill><a:gsLst><a:gs pos="74000"><a:srgbClr val="FFFFFF"/></a:gs><a:gs pos="0"><a:srgbClr val="F39800"/></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:rPr>`
  )
  // 第 4 个形状（矩形）加正交相机绕 x 轴转 315°：投影高度 × cos 45°。
  let shapeNo = 0
  const tiltedXml = xml.replace(/<\/p:spPr>/g, (m) => (++shapeNo === 4
    ? '<a:scene3d><a:camera prst="orthographicFront"><a:rot lat="18900000" lon="0" rev="0"/></a:camera><a:lightRig rig="threePt" dir="t"/></a:scene3d></p:spPr>'
    : m))
  files[name] = strToU8(tiltedXml)
  return zipSync(files)
}

describe('reverse：文本与形状细节保真', () => {
  it('内边距、字间距、分散对齐、乱序渐变文字、arc 调整值进入 PPTD', async () => {
    await reverseImport({ cwd, source: await sourceDeck(), targetDir: 'proj', sessionId: 's1' })
    const loaded = await loadProject(cwd, 'proj')
    const elements = (loaded.pages.get('pages/01.page') as Page).elements as AnyElement[]

    const flush = elements.find((e) => e.content?.text?.includes('DECORATIVE'))!
    expect(flush.content?.padding).toEqual([0, 0, 0, 0])
    expect(flush.content?.letterSpacing).toBe(3)
    expect(flush.content?.text).toContain('text-align:distributed')

    const big = elements.find((e) => e.content?.text?.includes('>01<') || e.content?.text === '01')!
    expect(big.content?.text?.toLowerCase()).toContain('#f39800')
    expect(big.content?.gradient?.stops.map((s) => [s.position, s.color])).toEqual([[0.74, '#FFFFFF'], [0, '#F39800']])
    expect(big.content?.gradient?.angle).toBe(90)

    const hatch = elements.find((e) => e.fill?.type === 'pattern')!
    expect(hatch.fill).toEqual({ type: 'pattern', preset: 'dkUpDiag', foreground: '#1F4E79', background: '#FFFFFF' })
    expect(big.content?.padding).toBeUndefined()

    const arc = elements.find((e) => e.shapeName === 'arc')!
    expect(arc.adjustments).toEqual([1615952, 6569477])

    const tilted = elements.find((e) => e.shapeName === 'rect' && Array.isArray(e.bounds) && e.bounds[0] === 400) as AnyElement & { bounds: number[] }
    expect(tilted.bounds[2]).toBe(200)
    expect(tilted.bounds[3]).toBeCloseTo(70.71, 1)
    expect(tilted.bounds[1]).toBeCloseTo(314.64, 1)

    const line = elements.find((e) => e.elementType === 'line') as AnyElement & { border?: { gradient?: { stops: { position: number; color: string }[]; angle?: number } } }
    expect(line.border?.gradient?.stops.map((s) => s.color)).toEqual(['#C00000', '#C0000000'])
    expect(line.border?.gradient?.angle).toBe(90)
  })

  it('逐页重建后 PPTX 写回 lIns=0、spc、algn=dist 与 arc 的 avLst', async () => {
    const report = await reverseImport({ cwd, source: await sourceDeck(), targetDir: 'proj', sessionId: 's1' })
    await rm(path.join(report.projectDir, 'source', PAGE_FINGERPRINTS_FILE), { force: true })
    const bytes = await saveRawProjectPptx(await buildProjectDeck(cwd, 'proj'))
    // 重建页是新 slide 部件（源存档页已移除），部件名不固定，合并全部 slide XML 检查。
    const parts = unzipSync(bytes)
    const xml = Object.keys(parts)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .map((n) => strFromU8(parts[n]))
      .join('\n')
    expect(xml).toMatch(/lIns="0"/)
    expect(xml).toMatch(/spc="300"/)
    expect(xml).toMatch(/algn="dist"/)
    expect(xml).toMatch(/<a:pattFill prst="dkUpDiag"><a:fgClr><a:srgbClr val="1F4E79"\/><\/a:fgClr><a:bgClr><a:srgbClr val="FFFFFF"\/>/)
    expect(xml).toMatch(/sz="12000"[^>]*>(?:(?!<\/a:rPr>)[\s\S])*<a:gradFill/)
    expect(xml).toMatch(/<a:gd name="adj1" fmla="val 1615952"\/>/)
    expect(xml).toMatch(/<a:gd name="adj2" fmla="val 6569477"\/>/)
    expect(xml).toMatch(/<a:ln w="12700"><a:gradFill[^>]*><a:gsLst><a:gs pos="0"><a:srgbClr val="C00000"\/><\/a:gs><a:gs pos="100000"><a:srgbClr val="C00000"><a:alpha val="0"\/>/)
  })
})
