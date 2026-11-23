/** 文本元素 content.align 的水平分量写入每个段落（spec §6.1 Alignment）。 */
import { describe, expect, it } from 'vitest'
import { getShapeXmlString, getSlideShapes, getSlides, loadPresentation } from '@office-kit/pptx'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import type { Page, Presentation } from '../src/core/pptd/schema.js'

const ctx = (): BuildContext => ({
  projectDir: '/tmp/pptd-align-test',
  loadMedia: async () => {
    throw new Error('no media in tests')
  },
  warnings: []
})

const deck: Presentation = {
  profile: 'generate',
  size: [960, 540],
  theme: { colors: {}, textStyles: {} },
  export: { fontEmbed: 'off', transition: 'none', animations: 'off' },
  pages: ['pages/01.page']
}

async function xmlOf(page: Page): Promise<Map<string, string>> {
  const engine = createOfficeKitEngine()
  const built = await engine.buildDeck({ deck, pages: [page] }, ctx())
  const back = await loadPresentation(await engine.saveDeck(built.native))
  const out = new Map<string, string>()
  for (const shape of getSlideShapes(getSlides(back)[0])) {
    const s = getShapeXmlString(shape)
    const name = /name="([^"]+)"/.exec(s)?.[1]
    if (name) out.set(name, s)
  }
  return out
}

const text = (elementId: string, extra: Record<string, unknown>) => ({
  elementId,
  elementType: 'text',
  bounds: [0, 0, 300, 40],
  content: { text: '甲\n乙', ...extra }
})

describe('文本水平对齐', () => {
  it('right / center 写到全部段落；left 缺省；段落标记优先', async () => {
    const xml = await xmlOf({
      elements: [
        text('right', { align: ['right', 'top'] }),
        text('center', { align: ['center', 'middle'] }),
        text('plain', {}),
        { ...text('mixed', { align: ['right', 'top'] }), content: { text: '<p style="text-align:center">中</p><p>右</p>', align: ['right', 'top'] } }
      ]
    } as unknown as Page)
    const count = (s: string, re: RegExp) => (s.match(re) ?? []).length
    expect(count(xml.get('right')!, /<a:pPr[^>]*algn="r"/g)).toBe(2)
    expect(count(xml.get('center')!, /<a:pPr[^>]*algn="ctr"/g)).toBe(2)
    expect(xml.get('plain')!).not.toMatch(/algn="(r|ctr)"/)
    const mixed = xml.get('mixed')!
    expect(count(mixed, /algn="ctr"/g)).toBe(1)
    expect(count(mixed, /algn="r"/g)).toBe(1)
  })

  it('<br> 写成段内 <a:br>：同一段、对齐与两侧 run 格式保留', async () => {
    const xml = await xmlOf({
      elements: [
        {
          ...text('br', {}),
          content: {
            text: '<p style="text-align:center"><span style="font-size:36px">甲</span><br><span style="font-size:44px">乙</span></p><p>丙<br>丁</p>'
          }
        }
      ]
    } as unknown as Page)
    const body = xml.get('br')!
    expect((body.match(/<a:p>/g) ?? []).length).toBe(2)
    expect((body.match(/<a:br>/g) ?? []).length).toBe(2)
    expect(body).not.toMatch(/<a:t>[^<]*\n/)
    expect(body).toMatch(/<a:pPr[^>]*algn="ctr"[^>]*\/?>(?:<a:lnSpc>[\s\S]*?<\/a:lnSpc><\/a:pPr>)?<a:r><a:rPr[^>]*sz="3600"[\s\S]*?<a:t>甲<\/a:t><\/a:r><a:br>[\s\S]*?<a:r><a:rPr[^>]*sz="4400"[\s\S]*?<a:t>乙<\/a:t>/)
  })
})
