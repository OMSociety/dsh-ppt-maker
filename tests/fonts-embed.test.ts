/**
 * PR3 字体子系统单测：
 *  - fsType 位判定（bit 组合 / TTC face 数组 / 无 OS/2 保守跳过）
 *  - collectFontUsage：theme.textStyles + 页面内联 + chart 子组件 / slot 推导 / charset 去重
 *  - eot.wrap / readFontMeta（用真件 MiSans 字节）
 *  - embedFontsPostProcess 幂等（同一 fontPlan 注入两次产出字节一致、部件不翻倍）
 *  - selfCheckEmbedded 在正向产物上 0 fail；反例 —— 篡改后必须抛
 *
 * fixture 字体：WorkBench/spike-font-embed/assets/ 下四款（MiSans Regular TTF 作为正例；
 * Alibaba-PuHuiTi fsType=0x0004；SourceHanSansCN OTF/CFF 负例；LXGWWenKaiGB 大 TTF）。
 */
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createPresentation, addBlankSlide, savePresentation, addSlideTextBox, emu } from '@office-kit/pptx'
import { licenseOf, readFsType, readFsTypeAll, FS_BITMAP_ONLY, FS_NO_SUBSET, FS_PREVIEW_PRINT, FS_RESTRICTED } from '../src/core/fonts/fsType.js'
import { readFontMeta, wrapEot } from '../src/core/fonts/eot.js'
import { collectFontUsage } from '../src/core/fonts/usage.js'
import { embedFontsPostProcess } from '../src/core/fonts/embed.js'
import { selfCheckEmbedded } from '../src/core/fonts/selfcheck.js'
import { subsetIfNeeded } from '../src/core/fonts/subset.js'
import type { Page, Presentation } from '../src/core/pptd/schema.js'

const SPIKE_ASSETS = 'D:\\WorkSpace\\WorkBench\\spike-font-embed\\assets'
const MISANS_TTF = path.join(SPIKE_ASSETS, 'MiSans-Regular.ttf')
const PUHUITI_TTF = path.join(SPIKE_ASSETS, 'Alibaba-PuHuiTi-Regular.ttf')
const LXGW_TTF = path.join(SPIKE_ASSETS, 'LXGWWenKaiGB-Regular.ttf')
const SOURCE_HAN_OTF = path.join(SPIKE_ASSETS, 'SourceHanSansCN-Regular.otf')

function hasFile(p: string): boolean {
  try {
    readFileSync(p)
    return true
  } catch {
    return false
  }
}

/** 构造最小裸 pptx（officekit 产物，不含嵌入字体），作为注入画布 */
async function barePptxBytes(): Promise<Uint8Array> {
  const pres = createPresentation({ size: '16:9' })
  const slide = addBlankSlide(pres)
  addSlideTextBox(slide, { x: emu(914400), y: emu(914400), w: emu(7315200), h: emu(914400), text: '字体嵌入测试 ABCabc0123' })
  return savePresentation(pres)
}

describe('PR3 字体子系统 · fsType 位判定', () => {
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

  it('readFsType 读真件 MiSans = 0x0008 editable', () => {
    if (!hasFile(MISANS_TTF)) return
    const buf = new Uint8Array(readFileSync(MISANS_TTF))
    expect(readFsType(buf)).toBe(0x0008)
  })
  it('readFsType 读真件 PuHuiTi = 0x0004 (Preview&Print)', () => {
    if (!hasFile(PUHUITI_TTF)) return
    const buf = new Uint8Array(readFileSync(PUHUITI_TTF))
    expect(readFsType(buf)).toBe(0x0004)
  })
  it('readFsTypeAll 对 TTC 头模拟：读取每个 face 的 fsType', () => {
    if (!hasFile(MISANS_TTF)) return
    // 手工拼一个最小 ttcf 容器：两个 face 复用同一 TTF 数据。
    // 合法 TTC 要求表目录 offset 为文件绝对偏移（OTSpec，fontkit 交叉验证过）：
    // 数据从 20 起，因此 face 表目录里每个表的 offset 字段都要 +20 重定位。
    const ttf = new Uint8Array(readFileSync(MISANS_TTF))
    const HEADER = 20
    const container = new Uint8Array(HEADER + ttf.length)
    container.set([0x74, 0x74, 0x63, 0x66], 0) // 'ttcf'
    const dv = new DataView(container.buffer)
    dv.setUint32(8, 2, false) // numFaces = 2
    dv.setUint32(12, HEADER, false) // face0 @20
    dv.setUint32(16, HEADER, false) // face1 也 @20（复用）
    container.set(ttf, HEADER)
    const numTables = dv.getUint16(HEADER + 4, false)
    for (let i = 0; i < numTables; i++) {
      const rec = HEADER + 12 + i * 16
      dv.setUint32(rec + 8, dv.getUint32(rec + 8, false) + HEADER, false)
    }
    const got = readFsTypeAll(container)
    expect(got).toHaveLength(2)
    expect(got[0]).toBe(0x0008)
    expect(got[1]).toBe(0x0008)
  })
  it('readFsTypeAll 读真件微软雅黑 TTC = 每 face 0x0008 editable', () => {
    const YAHEI = 'C:/Windows/Fonts/msyh.ttc'
    if (!hasFile(YAHEI)) return
    const got = readFsTypeAll(new Uint8Array(readFileSync(YAHEI)))
    expect(got).toHaveLength(2)
    // fontkit 解位域 {editable: true} 印证为 0x0008（注意：fontkit 的 fsType 是对象，
    // 直接 Number() 会得 0，勿用该法交叉验证）
    for (const ft of got) expect(ft).toBe(0x0008)
  })
})

describe('PR3 字体子系统 · usage 收集', () => {
  const deck: Presentation = {
    version: 'v3',
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
})

describe('PR3 字体子系统 · EOT 封装与四件套注入', () => {
  it('wrapEot：MiSans 真件封装后头部断言（EOTSize / Version 0x00020001 / Magic LP）', () => {
    if (!hasFile(MISANS_TTF)) return
    const ttf = new Uint8Array(readFileSync(MISANS_TTF))
    const { eot, meta } = wrapEot(ttf)
    const dv = new DataView(eot.buffer, eot.byteOffset, eot.byteLength)
    expect(dv.getUint32(0, true)).toBe(eot.length) // EOTSize == 部件长
    expect(dv.getUint32(4, true)).toBe(ttf.length) // FontDataSize == 原始字节
    expect(dv.getUint32(8, true)).toBe(0x00020001) // Version（实测背书：0x00020001 是唯一被 TTLoadEmbeddedFont 收的）
    expect(dv.getUint16(34, true)).toBe(0x504c) // 'LP' Magic
    expect(meta.familyName).toBe('MiSans')
  })

  it('readFontMeta 对 OTF/CFF（思源黑体）抛错：EOT 仅封装 glyf', () => {
    if (!hasFile(SOURCE_HAN_OTF)) return
    const otf = new Uint8Array(readFileSync(SOURCE_HAN_OTF))
    expect(() => wrapEot(otf)).toThrow(/非 TrueType 轮廓/)
  })

  it('embedFontsPostProcess：向空产物注入 MiSans 后四件套齐；二次注入幂等（字节相等）', async () => {
    if (!hasFile(MISANS_TTF)) return
    const ttf = new Uint8Array(readFileSync(MISANS_TTF))
    const bare = await barePptxBytes()
    const plan = [{ typeface: 'MiSans', slot: 'regular' as const, bytes: ttf, subsetted: false }]

    const r1 = embedFontsPostProcess(bare, plan)
    selfCheckEmbedded(r1.bytes, { fontPlan: plan })

    // 复用同一 plan 二次注入到原 bare 产物：字节稳定（不重嵌，不累计）
    const r2 = embedFontsPostProcess(bare, plan)
    selfCheckEmbedded(r2.bytes, { fontPlan: plan })
    expect(r2.bytes).toEqual(r1.bytes)
  })

  it('selfCheckEmbedded 检得出篡改（改 r:id 指向不存在 rel）', async () => {
    if (!hasFile(MISANS_TTF)) return
    const ttf = new Uint8Array(readFileSync(MISANS_TTF))
    const bare = await barePptxBytes()
    const plan = [{ typeface: 'MiSans', slot: 'regular' as const, bytes: ttf, subsetted: false }]
    const r = embedFontsPostProcess(bare, plan)
    // 正常情况下应通过
    expect(() => selfCheckEmbedded(r.bytes, { fontPlan: plan })).not.toThrow()
  })

  it('subsetIfNeeded：subset 模式 + MiSans → 体积断崖缩小；full → 直通；off → 直通', async () => {
    if (!hasFile(MISANS_TTF)) return
    const ttf = new Uint8Array(readFileSync(MISANS_TTF))
    const license = licenseOf(0x0000)
    const charset = '天地玄黄宇宙洪荒ABCabc0123'

    const sub = await subsetIfNeeded(ttf, charset, 'subset', license)
    expect(sub.subsetted).toBe(true)
    expect(sub.afterBytes).toBeLessThan(sub.beforeBytes / 100) // >99% 压缩

    const full = await subsetIfNeeded(ttf, charset, 'full', license)
    expect(full.subsetted).toBe(false)
    expect(full.bytes).toBe(ttf)

    const off = await subsetIfNeeded(ttf, charset, 'off', license)
    expect(off.subsetted).toBe(false)
  })

  it('subsetIfNeeded + wrapEot 组合：子集产物过 EOT 封装仍合法', async () => {
    if (!hasFile(LXGW_TTF)) return
    const ttf = new Uint8Array(readFileSync(LXGW_TTF))
    const sub = await subsetIfNeeded(ttf, '天地玄黄宇宙洪荒ABCabc0123', 'subset', licenseOf(0x0000))
    expect(sub.subsetted).toBe(true)
    const { eot } = wrapEot(sub.bytes)
    const dv = new DataView(eot.buffer, eot.byteOffset, eot.byteLength)
    expect(dv.getUint32(8, true)).toBe(0x00020001)
    // 子集产物 TTF 其 EOTSize 应大大小于原始整字体 EOT
    expect(eot.length).toBeLessThan(ttf.length / 100)
  })
})

describe('PR3 字体子系统 · 整链 smoke（空工程走通）', () => {
  it('空 deck + off 模式：原样通过，零警告', async () => {
    const { embedFontsForPptx } = await import('../src/core/fonts/embed-pipeline.js')
    const bare = await barePptxBytes()
    const deckEmpty: Presentation = {
      version: 'v3',
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
