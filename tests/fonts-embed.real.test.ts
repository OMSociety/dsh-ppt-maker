/**
 * 字体子系统真件单测（用本机或 runner 上已装的字体字节）：
 *  - fsType 读真件 / 改写后逐值判定 / TTC 逐 face
 *  - wrapEot 头部断言、embedFontsPostProcess 四件套 + 字节确定 + 已嵌原样返回
 *  - selfCheckEmbedded 正向与篡改反例、subsetIfNeeded 体积断崖
 *  - resolver 按内部族名命中工程 assets/fonts
 *
 * 字体候选见下方 TTF_CANDIDATES / TTC_CANDIDATES（含 Windows 与 Linux 路径，PPT_TEST_FONT 可覆盖）；
 * 找不到时用例 it.skip 并在顶层打印原因。纯逻辑用例见 tests/fonts-embed.test.ts。
 */
import { readFileSync, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { createPresentation, addBlankSlide, savePresentation, addSlideTextBox, emu } from '@office-kit/pptx'
import { licenseOf, readFsType, readFsTypeAll, FS_BITMAP_ONLY, FS_NO_SUBSET, FS_PREVIEW_PRINT, FS_RESTRICTED } from '../src/core/fonts/fsType.js'
import { readFontMeta, wrapEot } from '../src/core/fonts/eot.js'
import { collectFontUsage } from '../src/core/fonts/usage.js'
import { embedFontsPostProcess } from '../src/core/fonts/embed.js'
import { selfCheckEmbedded } from '../src/core/fonts/selfcheck.js'
import { subsetIfNeeded } from '../src/core/fonts/subset.js'
import type { Page, Presentation } from '../src/core/pptd/schema.js'

/** 候选真件 TTF（单 face，便于按 name 表族名断言） */
const TTF_CANDIDATES = [
  process.env.PPT_TEST_FONT,
  'C:\\Windows\\Fonts\\simhei.ttf',
  'C:\\Windows\\Fonts\\Deng.ttf',
  'C:\\Windows\\Fonts\\arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
].filter((p): p is string => typeof p === 'string' && p.length > 0)
/** 候选真件 TTC（多 face，只用于逐 face 读取断言） */
const TTC_CANDIDATES = [
  'C:\\Windows\\Fonts\\msyh.ttc',
  'C:\\Windows\\Fonts\\simsun.ttc',
  '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
]

function hasFile(p: string): boolean {
  try {
    return existsSync(p) && readFileSync(p).length > 0
  } catch {
    return false
  }
}

const REAL_TTF = TTF_CANDIDATES.find(hasFile) ?? null
const REAL_TTC = TTC_CANDIDATES.find(hasFile) ?? null
/** 真件族名（name 表 platform 3 / lang 0x409） */
const REAL_FAMILY = REAL_TTF === null ? null : familyOf(REAL_TTF)
const hasRealFont = REAL_TTF !== null && REAL_FAMILY !== null

if (!hasRealFont) {
  console.warn(`[fonts-embed] 真件字体用例跳过：未找到系统 TTF（候选 ${TTF_CANDIDATES.join(' / ')}，可用 PPT_TEST_FONT 指定）`)
}
if (REAL_TTC === null) {
  console.warn(`[fonts-embed] TTC 用例跳过：未找到系统 TTC（候选 ${TTC_CANDIDATES.join(' / ')}）`)
}

const itFont = hasRealFont ? it : it.skip
const itTtc = REAL_TTC === null ? it.skip : it

function readReal(): Uint8Array {
  return new Uint8Array(readFileSync(REAL_TTF!))
}

function familyOf(file: string): string | null {
  try {
    return readFontMeta(new Uint8Array(readFileSync(file))).familyName
  } catch {
    return null
  }
}

/** 复制一份并改写 OS/2.fsType（OS/2 表内偏移 8），用于逐值判定，不动原字节 */
function withFsType(ttf: Uint8Array, value: number): Uint8Array {
  const copy = new Uint8Array(ttf)
  const dv = new DataView(copy.buffer, copy.byteOffset, copy.byteLength)
  const numTables = dv.getUint16(4)
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    const tag = String.fromCharCode(copy[rec], copy[rec + 1], copy[rec + 2], copy[rec + 3])
    if (tag === 'OS/2') {
      dv.setUint16(dv.getUint32(rec + 8, false) + 8, value, false)
      return copy
    }
  }
  throw new Error('测试字体缺 OS/2 表')
}

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

  itFont('readFsType 读真件：值落在可嵌入位域内', () => {
    const raw = readFsType(readReal())
    expect(raw).not.toBeNull()
    expect([0x0000, 0x0004, 0x0008]).toContain(raw)
    expect(licenseOf(raw).embeddable).toBe(true)
  })
  itFont('OS/2.fsType 改写后逐值判定：0x0004 只读可嵌 / 0x0002 拒嵌', () => {
    const ttf = readReal()
    expect(readFsType(withFsType(ttf, FS_PREVIEW_PRINT))).toBe(FS_PREVIEW_PRINT)
    expect(licenseOf(readFsType(withFsType(ttf, FS_PREVIEW_PRINT)))).toMatchObject({ embeddable: true, readonly: true })
    expect(readFsType(withFsType(ttf, FS_RESTRICTED))).toBe(FS_RESTRICTED)
    expect(licenseOf(readFsType(withFsType(ttf, FS_RESTRICTED))).embeddable).toBe(false)
  })
  itFont('readFsTypeAll 对 TTC 头模拟：读取每个 face 的 fsType', () => {
    // 手工拼一个最小 ttcf 容器：两个 face 复用同一 TTF 数据。
    // 合法 TTC 要求表目录 offset 为文件绝对偏移（OTSpec，fontkit 交叉验证过）：
    // 数据从 20 起，因此 face 表目录里每个表的 offset 字段都要 +20 重定位。
    const ttf = readReal()
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
    expect(got[0]).toBe(readFsType(ttf))
    expect(got[1]).toBe(readFsType(ttf))
  })
  itTtc('readFsTypeAll 读真件系统 TTC：逐 face 判定皆可嵌', () => {
    const got = readFsTypeAll(new Uint8Array(readFileSync(REAL_TTC!)))
    // 回归：表目录 offset 若错误地叠加 face 偏移，雅黑 face0 会读成 0x0204（Bitmap Only）→ 误判拒嵌
    expect(got.length).toBeGreaterThanOrEqual(2)
    for (const ft of got) {
      expect(ft).not.toBeNull()
      expect(licenseOf(ft).embeddable).toBe(true)
    }
  })
})

describe('字体子系统 · EOT 封装与四件套注入', () => {
  itFont('wrapEot：真件封装后头部断言（EOTSize / Version 0x00020001 / Magic LP）+ fsType 交叉一致', () => {
    const ttf = readReal()
    const { eot, meta } = wrapEot(ttf)
    const dv = new DataView(eot.buffer, eot.byteOffset, eot.byteLength)
    expect(dv.getUint32(0, true)).toBe(eot.length) // EOTSize == 部件长
    expect(dv.getUint32(4, true)).toBe(ttf.length) // FontDataSize == 原始字节
    expect(dv.getUint32(8, true)).toBe(0x00020001) // Version（实测背书：0x00020001 是唯一被 TTLoadEmbeddedFont 收的）
    expect(dv.getUint16(34, true)).toBe(0x504c) // 'LP' Magic
    expect(meta.familyName).toBe(REAL_FAMILY)
    expect(meta.fsType).toBe(readFsType(ttf)) // readFontMeta 与 fsType 表解析同源交叉
  })

  itFont('embedFontsPostProcess：向空产物注入真件后四件套齐；同输入两次调用字节确定；已嵌产物再注入原样返回', { timeout: 90000 }, async () => {
    const ttf = readReal()
    const bare = await barePptxBytes()
    const plan = [{ typeface: REAL_FAMILY!, slot: 'regular' as const, bytes: ttf, subsetted: false }]

    const r1 = embedFontsPostProcess(bare, plan)
    selfCheckEmbedded(r1.bytes, { fontPlan: plan })

    // 同一输入再跑一次：输出字节确定
    const r2 = embedFontsPostProcess(bare, plan)
    expect(r2.bytes).toEqual(r1.bytes)

    // 把已嵌产物再送进来：槽位已在位，不写第二套部件，字节原样返回
    const r3 = embedFontsPostProcess(r1.bytes, plan)
    expect(r3.writtenParts).toEqual([])
    expect(r3.bytes).toBe(r1.bytes)
    selfCheckEmbedded(r3.bytes, { fontPlan: plan })
  })

  itFont('selfCheckEmbedded 对正向产物 0 fail', async () => {
    const ttf = readReal()
    const bare = await barePptxBytes()
    const plan = [{ typeface: REAL_FAMILY!, slot: 'regular' as const, bytes: ttf, subsetted: false }]
    const r = embedFontsPostProcess(bare, plan)
    expect(() => selfCheckEmbedded(r.bytes, { fontPlan: plan })).not.toThrow()
  })

  itFont('subsetIfNeeded：subset 模式 + 真件 → 体积断崖缩小；full → 直通；off → 直通', async () => {
    const ttf = readReal()
    const license = licenseOf(0x0000)
    const charset = '天地玄黄宇宙洪荒ABCabc0123'

    const sub = await subsetIfNeeded(ttf, charset, 'subset', license)
    expect(sub.subsetted).toBe(true)
    // 系统真件因机器而异（CJK 大字体缩到 1% 以下，Arial / DejaVu 缩到 4%–8%），取各类真件都成立的下限\n    expect(sub.afterBytes).toBeLessThan(sub.beforeBytes / 5)

    const full = await subsetIfNeeded(ttf, charset, 'full', license)
    expect(full.subsetted).toBe(false)
    expect(full.bytes).toBe(ttf)

    const off = await subsetIfNeeded(ttf, charset, 'off', license)
    expect(off.subsetted).toBe(false)
  })

  itFont('subsetIfNeeded + wrapEot 组合：子集产物过 EOT 封装仍合法', async () => {
    const ttf = readReal()
    const sub = await subsetIfNeeded(ttf, '天地玄黄宇宙洪荒ABCabc0123', 'subset', licenseOf(0x0000))
    expect(sub.subsetted).toBe(true)
    const { eot } = wrapEot(sub.bytes)
    const dv = new DataView(eot.buffer, eot.byteOffset, eot.byteLength)
    expect(dv.getUint32(8, true)).toBe(0x00020001)
    // 子集产物封装后的 EOT 应明显小于原始整字体
    expect(eot.length).toBeLessThan(ttf.length / 5)
  })
})

type ZipParts = Record<string, Uint8Array>

/** 解包 → 改坏 → 压回：selfCheckEmbedded 的反例都要经过这一步 */
function tamper(bytes: Uint8Array, mutate: (parts: ZipParts) => void): Uint8Array {
  const parts = unzipSync(bytes) as ZipParts
  mutate(parts)
  return zipSync(parts)
}

/** 改打包内某个 XML 部件 */
function editXml(parts: ZipParts, name: string, mutate: (doc: ReturnType<typeof parseXml>) => boolean): void {
  const doc = parseXml(strFromU8(parts[name]))
  if (!mutate(doc)) throw new Error(`反例构造失败：${name} 里没有可改的目标`)
  parts[name] = strToU8(new XMLSerializer().serializeToString(doc))
}

function parseXml(text: string) {
  return new DOMParser().parseFromString(text, 'application/xml')
}

describe('字体子系统 · selfCheckEmbedded 反例（篡改必须抛）', () => {
  itFont('四类篡改各自命中对应断言', async () => {
    const ttf = readReal()
    const bare = await barePptxBytes()
    const plan = [{ typeface: REAL_FAMILY!, slot: 'regular' as const, bytes: ttf, subsetted: false }]
    const good = embedFontsPostProcess(bare, plan)
    expect(() => selfCheckEmbedded(good.bytes, { fontPlan: plan })).not.toThrow()

    const cases: Array<{ name: string; mutate: (parts: ZipParts) => void; message: RegExp }> = [
      {
        name: 'embeddedFontLst 引用不存在的 r:id',
        message: /r:id=rId9999 在 rels 里不存在/,
        mutate: (parts) =>
          editXml(parts, 'ppt/presentation.xml', (doc) => {
            const slot = doc.getElementsByTagName('p:embeddedFontLst').item(0)?.getElementsByTagName('p:regular').item(0)
            if (!slot) return false
            slot.setAttribute('r:id', 'rId9999')
            return true
          })
      },
      {
        name: 'rels 的 font Target 指向不存在的部件',
        message: /在包里不存在/,
        mutate: (parts) =>
          editXml(parts, 'ppt/_rels/presentation.xml.rels', (doc) => {
            const rels = doc.getElementsByTagName('Relationship')
            for (let i = 0; i < rels.length; i++) {
              const el = rels.item(i)
              if (el?.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font') {
                el.setAttribute('Target', 'fonts/gone.fntdata')
                return true
              }
            }
            return false
          })
      },
      {
        name: '[Content_Types] 缺 fntdata Override',
        message: /缺 Override/,
        mutate: (parts) =>
          editXml(parts, '[Content_Types].xml', (doc) => {
            const ovr = doc.getElementsByTagName('Override')
            for (let i = 0; i < ovr.length; i++) {
              const el = ovr.item(i)
              if (el?.getAttribute('ContentType') === 'application/x-fontdata') {
                el.parentNode?.removeChild(el)
                return true
              }
            }
            return false
          })
      },
      {
        name: 'EOT Version 被改坏',
        message: /EOT Version .* != 0x00020001/,
        mutate: (parts) => {
          const name = Object.keys(parts).find((n) => n.startsWith('ppt/fonts/') && n.endsWith('.fntdata'))
          if (!name) throw new Error('反例构造失败：产物里没有 fntdata 部件')
          const copy = new Uint8Array(parts[name])
          new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint32(8, 0x00020002, true)
          parts[name] = copy
        }
      }
    ]

    for (const c of cases) {
      const broken = tamper(good.bytes, c.mutate)
      expect(() => selfCheckEmbedded(broken, { fontPlan: plan }), c.name).toThrow(c.message)
    }
  })
})

describe('resolver · assets/fonts 命中按字体内部族名而非文件 stem', () => {
  itFont('文件名与内部族名不一致时，仍按族名命中，且命中项来自工程 assets/fonts', async () => {
    const { mkdtempSync, mkdirSync, copyFileSync } = await import('node:fs')
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'ppt-resolver-'))
    const fontsDir = path.join(tmp, 'assets', 'fonts')
    mkdirSync(fontsDir, { recursive: true })
    // 故意用与内部族名无关的文件名；命中必须来自这份拷贝，而不是系统同名字体
    const copied = path.join(fontsDir, 'not-the-family-name.ttf')
    copyFileSync(REAL_TTF!, copied)
    const { resolveTypeface } = await import('../src/core/fonts/resolver.js')
    const hit = await resolveTypeface(REAL_FAMILY!, 'regular', { projectDir: tmp })
    expect(hit).not.toBeNull()
    expect(hit!.familyName).toBe(REAL_FAMILY)
    expect(hit!.path.toLowerCase()).toBe(copied.toLowerCase())
  })
})
