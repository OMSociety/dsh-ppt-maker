/**
 * 引擎适配层测试：PPTD 模型 → @office-kit/pptx → pptx 字节。
 *
 * 断言只走引擎公开面（buildDeck + saveDeck），再用 loadPresentation 把落盘字节
 * 读回来——这同时是映射规则的金标准往返校验。
 */
import { describe, expect, it } from 'vitest'
import { loadPresentation, getSlides, getSlideShapes, getShapeText, getShapeBounds, getSlideSize, getSlideTransition, getShapeXmlString, getPresentationFonts, getPresentationTheme } from '@office-kit/pptx'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import type { Page, Presentation } from '../src/core/pptd/parse.js'

function ctx(overrides: Partial<BuildContext> = {}): BuildContext {
  return {
    projectDir: '/tmp/pptd-test',
    loadMedia: async () => {
      throw new Error('no media in tests')
    },
    warnings: [],
    ...overrides
  }
}

function deck(overrides: Partial<Presentation> = {}): Presentation {
  return {
    profile: 'generate',
    size: [960, 540],
    theme: {
      colors: { primary: '#2563EB', text: '#1F2937' },
      textStyles: { title: { fontSize: 40, color: '$primary' } }
    },
    export: { fontEmbed: 'subset', transition: 'fade', animations: 'auto' },
    pages: ['pages/01.page'],
    ...overrides
  }
}

describe('officekit 引擎', () => {
  it('单页 deck（一个文本框）能构建并保存成字节', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [
        {
          elementId: 'title1',
          elementType: 'text',
          bounds: [100, 200, 760, 80],
          content: { style: '$title', align: ['center', 'middle'], text: '年度工作总结' }
        }
      ]
    }
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    expect(built.warnings).toEqual([])
    const bytes = await engine.saveDeck(built.native)
    expect(bytes.byteLength).toBeGreaterThan(1000)

    const back = await loadPresentation(bytes)
    expect(getSlides(back)).toHaveLength(1)
    const size = getSlideSize(back)
    expect(size).not.toBeNull()
    // 960 px × 12700 EMU/px = 12192000; 540 × 12700 = 6858000
    expect(Number(size!.width)).toBe(12192000)
    expect(Number(size!.height)).toBe(6858000)

    const shapes = getSlideShapes(getSlides(back)[0])
    expect(shapes).toHaveLength(1)
    expect(getShapeText(shapes[0])).toBe('年度工作总结')
    const bounds = getShapeBounds(shapes[0])
    expect(Number(bounds!.x)).toBe(100 * 12700)
    expect(Number(bounds!.w)).toBe(760 * 12700)
  })

  it('经 theme.colors 解析 $key 颜色', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [
        {
          elementId: 'box',
          elementType: 'shape',
          bounds: [10, 10, 100, 50],
          shapeName: 'roundRect',
          fill: { type: 'solid', color: '$primary' }
        }
      ]
    }
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    const bytes = await engine.saveDeck(built.native)
    const back = await loadPresentation(bytes)
    const shapes = getSlideShapes(getSlides(back)[0])
    expect(shapes).toHaveLength(1)
  })

  it('默认写 fade 转场，export.transition=none 时不写', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = { elements: [] }
    const withFade = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    const fadeBytes = await engine.saveDeck(withFade.native)
    const fadeBack = await loadPresentation(fadeBytes)
    expect(getSlideTransition(getSlides(fadeBack)[0])?.effect).toBe('fade')

    const noTransition = await engine.buildDeck(
      { deck: deck({ export: { fontEmbed: 'off', transition: 'none', animations: 'off' } }), pages: [page] },
      ctx()
    )
    const noneBytes = await engine.saveDeck(noTransition.native)
    const noneBack = await loadPresentation(noneBytes)
    expect(getSlideTransition(getSlides(noneBack)[0])).toBeNull()
  })

  it('export.transition=auto 时轮换预设转场表', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = { elements: [] }
    const built = await engine.buildDeck(
      { deck: deck({ export: { fontEmbed: 'off', transition: 'auto', animations: 'off' } }), pages: [page, page, page, page] },
      ctx()
    )
    const bytes = await engine.saveDeck(built.native)
    const back = await loadPresentation(bytes)
    const effects = getSlides(back).map((s) => getSlideTransition(s)?.effect)
    expect(effects).toEqual(['fade', 'push', 'wipe', 'fade'])
  })

  it('不支持的特性记为 warnings，不让构建失败', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [
        { elementId: 'i1', elementType: 'icon', bounds: [0, 0, 32, 32], iconName: 'fas:house' } as never
      ]
    }
    const c = ctx()
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, c)
    expect(built.warnings.some((w) => w.includes('icon'))).toBe(true)
    const bytes = await engine.saveDeck(built.native)
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('富文本标记落到 run 上', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [
        {
          elementId: 't1',
          elementType: 'text',
          bounds: [10, 10, 300, 60],
          content: { text: '正常<strong>加粗</strong>与<em>斜体</em>', fontSize: 20 }
        }
      ]
    }
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    const bytes = await engine.saveDeck(built.native)
    const back = await loadPresentation(bytes)
    const shape = getSlideShapes(getSlides(back)[0])[0]
    expect(getShapeText(shape)).toBe('正常加粗与斜体')
  })

  // 终验缺陷 P1-c 回归：逆向 map 把 latin/ea 拼成逗号栈写进 font-family，
  // 导出端必须拆回两个 OOXML 槽位，绝不允许 "Liter, MiSans" 整体进 typeface。
  it('run 级逗号字体栈拆进 latin/ea 槽位', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [
        {
          elementId: 't1',
          elementType: 'text',
          bounds: [10, 10, 300, 60],
          content: { text: '<span style="font-family:Liter, MiSans">01 目录</span>', fontSize: 26 }
        }
      ]
    }
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    expect(built.fontsUsed).toContain('Liter')
    expect(built.fontsUsed).toContain('MiSans')
    expect(built.fontsUsed.some((f) => f.includes(','))).toBe(false)
    const bytes = await engine.saveDeck(built.native)
    const back = await loadPresentation(bytes)
    const xml = getShapeXmlString(getSlideShapes(getSlides(back)[0])[0])
    expect(xml).toContain('typeface="Liter"')
    expect(xml).toContain('typeface="MiSans"')
    expect(xml).not.toContain('Liter, MiSans')
  })

  // 终验缺陷 P1-b 回归：<ul>/<li> 必须落成 buChar + 27pt 悬挂缩进。
  it('列表标记转成 buChar 与悬挂缩进', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [
        {
          elementId: 't1',
          elementType: 'text',
          bounds: [10, 10, 400, 200],
          content: { text: '<ul><li>第一条</li><li>第二条</li></ul>', fontSize: 20 }
        }
      ]
    }
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    const bytes = await engine.saveDeck(built.native)
    const back = await loadPresentation(bytes)
    const xml = getShapeXmlString(getSlideShapes(getSlides(back)[0])[0])
    expect(xml).toContain('<a:buChar char="•"/>')
    expect(xml).toContain('marL="342900"')
    expect(xml).toContain('indent="-342900"')
  })

  // 终验缺陷「主题被重置」回归：title/body textStyles 的字体与 colors 里的
  // 规范色槽必须回写进包的主题部件，而不是停在库的 Office 默认。
  it('用 deck 主题给包主题打品牌（字体 + clrScheme）', async () => {
    const engine = createOfficeKitEngine()
    const themed = deck({
      theme: {
        colors: { primary: '#2563EB', accent1: '#009682', dark1: '#000000', light1: '#FFFFFF' },
        textStyles: {
          title: { fontFamily: { latin: 'Liter', ea: 'MiSans' } },
          body: { fontFamily: { latin: 'Liter', ea: 'MiSans' } }
        }
      }
    })
    const built = await engine.buildDeck({ deck: themed, pages: [{ elements: [] }] }, ctx())
    const bytes = await engine.saveDeck(built.native)
    const back = await loadPresentation(bytes)
    const fonts = getPresentationFonts(back)
    expect(fonts?.majorLatin).toBe('Liter')
    expect(fonts?.majorEastAsian).toBe('MiSans')
    expect(fonts?.minorLatin).toBe('Liter')
    const theme = getPresentationTheme(back)
    expect(theme?.accent1).toBe('#009682')
  })
})
