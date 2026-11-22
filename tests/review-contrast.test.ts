/** 规则质检对比度：无填充文本框回落到页面生效背景色。 */
import { describe, expect, it } from 'vitest'
import { addBlankSlide, addSlideTextBox, createPresentation, emu, setShapeParagraphs, setSlideBackground, type Color } from '@office-kit/pptx'
import { reviewDeck } from '../src/core/review/index.js'

const PT = 12700

function deckWith(background: Color, color: Color) {
  const pres = createPresentation({ size: '16:9' })
  const slide = addBlankSlide(pres)
  setSlideBackground(slide, background)
  const box = addSlideTextBox(slide, { x: emu(40 * PT), y: emu(40 * PT), w: emu(400 * PT), h: emu(60 * PT), text: '' })
  setShapeParagraphs(box, [{ runs: [{ text: '看得清吗', format: { size: 20, color } }] }])
  return pres
}

describe('reviewDeck 对比度', () => {
  it('无填充文本框与页面背景对比不足 → contrast 警告', () => {
    const issues = reviewDeck(deckWith('#FFFFFF', '#EEEEEE')).issues.filter((i) => i.category === 'contrast')
    expect(issues).toHaveLength(1)
  })

  it('无填充文本框与页面背景对比充足 → 无警告', () => {
    const issues = reviewDeck(deckWith('#FFFFFF', '#111111')).issues.filter((i) => i.category === 'contrast')
    expect(issues).toEqual([])
  })
})
