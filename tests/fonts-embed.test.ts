/**
 * 字体子系统纯逻辑单测（不依赖本机字体，CI 两个 runner 都跑）：
 *  - fsType 位判定（bit 组合）
 *  - collectFontUsage：theme.textStyles + 页面内联 + 富文本 span / slot 推导 / charset 去重
 *  - readFontMeta 对非 glyf sfnt 拒收
 *  - 空工程整链 smoke
 *
 * 用真实字体字节的用例见 tests/fonts-embed.real.test.ts。
 */
import os from 'node:os'
import { describe, expect, it } from 'vitest'
import { createPresentation, addBlankSlide, savePresentation, addSlideTextBox, emu } from '@office-kit/pptx'
import { licenseOf, FS_BITMAP_ONLY, FS_NO_SUBSET, FS_PREVIEW_PRINT, FS_RESTRICTED } from '../src/core/fonts/fsType.js'
import { wrapEot } from '../src/core/fonts/eot.js'
import { collectFontUsage } from '../src/core/fonts/usage.js'
import type { Page, Presentation } from '../src/core/pptd/schema.js'
/** 最小非 glyf sfnt 头（OTTO/CFF），用于负例——不依赖本机装没装 OTF */
function ottoHeader(): Uint8Array {
  const buf = new Uint8Array(12)
  buf.set([0x4f, 0x54, 0x54, 0x4f], 0) // 'OTTO'
  return buf
}

/** 构造最小裸 pptx（officekit 产物，不含嵌入字体），作为注入画布 */
async function barePptxBytes(): Promise<Uint8Array> {
  const pres = createPresentation({ size: '16:9' })
  const slide = addBlankSlide(pres)
  addSlideTextBox(slide, { x: emu(914400), y: emu(914400), w: emu(7315200), h: emu(914400), text: '字体嵌入测试 ABCabc0123' })
  return savePresentation(pres)
}
describe('字体子系统 · fsType 位判定', () => {
  it('纯函数 licenseOf 各 bit 组合', () => {
    expect(licenseOf(0x0000)).toMatchObject({ embeddable: true, readonly: false, noSubset: false })
    expect(licenseOf(FS_PREVIEW_PRINT)).toMatchObject({ embeddable: true, readonly: true })
    expect(licenseOf(0x0008)).toMatchObject({ embeddable: true, readonly: false })
    expect(licenseOf(FS_NO_SUBSET)).toMatchObject({ embeddable: true, noSubset: true })
    expect(licenseOf(FS_PREVIEW_PRINT | FS_NO_SUBSET)).toMatchObject({ embeddable: true, readonly: true, noSubset: true })
    expect(licenseOf(FS_RESTRICTED).embeddable).toBe(false)
    expect(licenseOf(FS_BITMAP_ONLY).embeddable).toBe(false)
    expect(licenseOf(null).embeddable).toBe(false)
  })

})

describe('字体子系统 · usage 收集', () => {
  const deck: Presentation = {
    size: [960, 540],
    theme: {
      textStyles: {
        title: { fontFamily: 'MiSans', fontSize: 40, bold: true },
        body: { fontFamily: { latin: 'Inter', ea: 'Microsoft YaHei' } }
      }
    },
    export: { fontEmbed: 'subset', transition: 'fade', animations: 'auto' },
    pages: ['pages/01.page']
  }
  const page: Page = {
    elements: [
      {
        elementId: 't1',
        elementType: 'text',
        bounds: [0, 0, 100, 20],
        content: { text: '标题 ABC', fontFamily: 'LXGW WenKai GB', bold: true, italic: true }
      },
      {
        elementId: 'tb',
        elementType: 'table',
        bounds: [0, 30, 400, 200],
        rows: [
          [{ text: '表格文本' }, { text: '123' }],
          [{ text: '第二行' }, { text: '456' }]
        ]
      }
    ],
    notes: '页备注也收'
  }

  it('收集 theme 与页内 fontFamily + slot 推导 + charset 去重', () => {
    const usage = collectFontUsage(deck, [page])
    expect(usage.typefaces.has('MiSans')).toBe(true)
    expect(usage.typefaces.get('MiSans')!.has('bold')).toBe(true)
    expect(usage.typefaces.get('MiSans')!.has('regular')).toBe(true) // 非 regular 也保底 regular 槽
    expect(usage.typefaces.has('Inter')).toBe(true)
    expect(usage.typefaces.has('Microsoft YaHei')).toBe(true)
    expect(usage.typefaces.get('LXGW WenKai GB')!.has('boldItalic')).toBe(true)
    expect(usage.charset).toContain('标')
    expect(usage.charset).toContain('A')
    expect(usage.charset).toContain('1')
    expect(usage.charset).toContain('表')
    // 去重生效：'1' 只出现一次
    expect(usage.charset.split('1').length - 1).toBe(1)
  })

  it('富文本 span 的 font-family 收进字体清单（按 regular 槽记）', () => {
    const richPage: Page = {
      elements: [
        {
          elementId: 'rt',
          elementType: 'text',
          bounds: [0, 0, 200, 40],
          content: {
            text:
              '<p><span style="font-size:20px; font-family:Georgia">A</span>' +
              '<span style=\'font-family:"Arial, 微软雅黑"\'>B</span></p>'
          }
        }
      ]
    }
    const usage = collectFontUsage(deck, [richPage])
    expect(usage.typefaces.get('Georgia')).toEqual(new Set(['regular']))
    // 引号包住的逗号列表按 fontFamily:{latin, ea} 同口径拆开
    expect(usage.typefaces.get('Arial')).toEqual(new Set(['regular']))
    expect(usage.typefaces.get('微软雅黑')).toEqual(new Set(['regular']))
  })
})

describe('字体子系统 · EOT 封装', () => {
  it('readFontMeta 对非 glyf sfnt（OTTO/CFF）抛错：EOT 仅封装 glyf', () => {
    expect(() => wrapEot(ottoHeader())).toThrow(/非 TrueType 轮廓/)
  })
})

describe('字体子系统 · 整链 smoke（空工程走通）', () => {
  it('空 deck + off 模式：原样通过，零警告', async () => {
    const { embedFontsForPptx } = await import('../src/core/fonts/embed-pipeline.js')
    const bare = await barePptxBytes()
    const deckEmpty: Presentation = {
      size: [960, 540],
      export: { fontEmbed: 'off', transition: 'none', animations: 'off' },
      pages: []
    }
    const built = { native: null, slides: [], shapes: new Map(), warnings: [], fontsUsed: [] }
    const r = await embedFontsForPptx(bare, built, deckEmpty, [], { projectDir: os.tmpdir(), mode: 'off' })
    expect(r.bytes).toBe(bare)
    expect(r.summary.mode).toBe('off')
    expect(r.summary.warnings).toEqual([])
  })
})
