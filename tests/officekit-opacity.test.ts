/** 元素 opacity 按绘制部件写入 alpha 的真实 PPTX 往返回归。 */
import { describe, expect, it } from 'vitest'
import { getShapeXmlString, getSlideShapes, getSlides, loadPresentation } from '@office-kit/pptx'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import type { Page, Presentation } from '../src/core/pptd/schema.js'

function ctx(): BuildContext {
  return {
    projectDir: '/tmp/pptd-opacity-test',
    loadMedia: async () => {
      throw new Error('no media in tests')
    },
    warnings: []
  }
}

function deck(): Presentation {
  return {
    profile: 'generate',
    size: [960, 540],
    theme: { colors: {}, textStyles: {} },
    export: { fontEmbed: 'off', transition: 'none', animations: 'off' },
    pages: ['pages/01.page']
  }
}

async function shapesXml(page: Page): Promise<{ xml: Map<string, string>; warnings: string[] }> {
  const engine = createOfficeKitEngine()
  const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
  const back = await loadPresentation(await engine.saveDeck(built.native))
  const xml = new Map<string, string>()
  for (const shape of getSlideShapes(getSlides(back)[0])) {
    const s = getShapeXmlString(shape)
    const name = /name="([^"]+)"/.exec(s)?.[1]
    if (name) xml.set(name, s)
  }
  return { xml, warnings: built.warnings }
}

describe('office-kit 元素 opacity', () => {
  it('文字、实色、渐变、描边分别写入 alpha，构建无失败告警', async () => {
    const page = {
      elements: [
        {
          elementId: 'title',
          elementType: 'text',
          bounds: [40, 40, 400, 60],
          opacity: 0.5,
          content: { text: '半透明标题', fontSize: 28, color: '#112233' }
        },
        {
          elementId: 'solid',
          elementType: 'shape',
          shapeName: 'rect',
          bounds: [40, 140, 120, 80],
          opacity: 0.4,
          fill: { type: 'solid', color: '#C8102E' },
          border: { style: 'solid', width: 2, color: '#000000' }
        },
        {
          elementId: 'grad',
          elementType: 'shape',
          shapeName: 'rect',
          bounds: [200, 140, 120, 80],
          opacity: 0.5,
          fill: {
            type: 'gradient',
            stops: [
              { position: 0, color: '#FFFFFF' },
              { position: 1, color: '#2456C4' }
            ]
          }
        }
      ]
    } as unknown as Page
    const { xml, warnings } = await shapesXml(page)
    expect(warnings.filter((w) => w.includes('opacity'))).toEqual([])
    expect(xml.get('title')).toMatch(/<a:alpha val="50000"\s*\/>/)
    const solid = xml.get('solid') ?? ''
    expect(solid).toMatch(/<a:solidFill><a:srgbClr val="C8102E"><a:alpha val="40000"\s*\/>/)
    expect(solid).toMatch(/<a:ln[^>]*>[\s\S]*<a:alpha val="40000"\s*\/>/)
    const grad = xml.get('grad') ?? ''
    expect(grad).toContain('<a:gradFill')
    expect(grad.match(/<a:alpha val="50000"\s*\/>/g)).toHaveLength(2)
  })

  it('未指定颜色的文字如实告警而不抛错', async () => {
    const page = {
      elements: [
        { elementId: 'plain', elementType: 'text', bounds: [40, 40, 400, 60], opacity: 0.5, content: { text: '无色文字' } }
      ]
    } as unknown as Page
    const { warnings } = await shapesXml(page)
    expect(warnings.some((w) => w.includes('未指定颜色'))).toBe(true)
    expect(warnings.some((w) => w.includes('构建失败'))).toBe(false)
  })
})
