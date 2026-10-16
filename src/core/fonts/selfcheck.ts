/**
 * selfcheck.ts — 注入后自检（与 spike verify.mjs 口径对齐）
 *
 * 在 embedFontsPostProcess 收口阶段调用；发现任何一条断言失败即 throw。
 * 这是导出失败的最便宜兜底 —— 在写盘前发现嵌入损坏。
 *
 * 进一步对外验证（PowerPoint / WPS 实测清单）只能人工做，机器无法替代。
 */
import { unzipSync } from 'fflate'
import { DOMParser } from '@xmldom/xmldom'
import type { FontPlanEntry } from './embed.js'
import type { FontSlot } from './resolver.js'

const CT_FONTDATA = 'application/x-fontdata'
const REL_TYPE_FONT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'

export interface SelfCheckOpts {
  /** 注入时的 fontPlan（自检断言参照） */
  fontPlan: FontPlanEntry[]
}

/**
 * 断言产物合格，否则 throw Error（含失败明细）。
 * @param pptxBytes embedFontsPostProcess 输出
 */
export function selfCheckEmbedded(pptxBytes: Uint8Array, opts: SelfCheckOpts): void {
  const parts = unzipSync(pptxBytes)
  const failures: string[] = []
  const ok = (cond: boolean, msg: string): void => {
    if (!cond) failures.push(msg)
  }

  // 1) fntdata 部件数 == fontPlan 行数；每个头是合法 EOT
  const fontParts = Object.keys(parts)
    .filter((n) => n.startsWith('ppt/fonts/') && n.endsWith('.fntdata'))
    .sort()
  ok(fontParts.length === opts.fontPlan.length, `fntdata 部件数 ${fontParts.length} != fontPlan 行数 ${opts.fontPlan.length}`)
  for (const name of fontParts) {
    const data = parts[name]
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength)
    const eotSize = dv.getUint32(0, true)
    const version = dv.getUint32(8, true)
    const magic = dv.getUint16(34, true)
    ok(eotSize === data.length, `${name} EOTSize(${eotSize}) != 部件长(${data.length})`)
    ok(version === 0x00020001, `${name} EOT Version 0x${version.toString(16)} != 0x00020001`)
    ok(magic === 0x504c, `${name} EOT MagicNumber 0x${magic.toString(16)} != 0x504C "LP"`)
    // 尾部应为合法 sfnt（TTF=00 01 00 00 / OTTO）
    const fontDataSize = dv.getUint32(4, true)
    const tailStart = data.length - fontDataSize
    if (tailStart >= 0 && tailStart + 4 <= data.length) {
      const h = data.subarray(tailStart, tailStart + 4)
      const hex = Array.from(h)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')
      const isSfnt = hex === '00 01 00 00' || hex === '4f 54 54 4f' || hex === '74 72 75 65'
      ok(isSfnt, `${name} EOT 尾部 FontData 非合法 sfnt（头 ${hex}）`)
    }
  }

  // 2) [Content_Types].xml：每个 fntdata 有 Override
  {
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(parts['[Content_Types].xml']), 'application/xml')
    const overrides = new Set<string>()
    const ovr = doc.getElementsByTagName('Override')
    for (let i = 0; i < ovr.length; i++) {
      const el = ovr.item(i)
      if (el?.getAttribute('ContentType') === CT_FONTDATA) {
        const p = el.getAttribute('PartName') ?? ''
        overrides.add(p.replace(/^\//, ''))
      }
    }
    for (const fp of fontParts) {
      ok(overrides.has(fp), `[Content_Types] 缺 Override：${fp}`)
    }
  }

  // 3) presentation.xml.rels：font Relationship 与 fntdata 双向一致
  {
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(parts['ppt/_rels/presentation.xml.rels']), 'application/xml')
    const fontRels: Array<{ id: string; target: string }> = []
    const rels = doc.getElementsByTagName('Relationship')
    for (let i = 0; i < rels.length; i++) {
      const el = rels.item(i)
      if (el?.getAttribute('Type') === REL_TYPE_FONT) {
        fontRels.push({ id: el.getAttribute('Id') ?? '', target: `ppt/${el.getAttribute('Target') ?? ''}` })
      }
    }
    ok(fontRels.length === opts.fontPlan.length, `rels 中 font Relationship 数 ${fontRels.length} != fontPlan 行数 ${opts.fontPlan.length}`)
    for (const r of fontRels) {
      ok(r.target in parts, `rels Target ${r.target} 在包里不存在`)
    }
    // embeddedFontLst 引用的 rId 全部存在
    const presDoc = new DOMParser().parseFromString(new TextDecoder().decode(parts['ppt/presentation.xml']), 'application/xml')
    const lst = presDoc.getElementsByTagName('p:embeddedFontLst').item(0)
    if (lst) {
      for (const slot of ['regular', 'bold', 'italic', 'boldItalic']) {
        const els = lst.getElementsByTagName(`p:${slot}`)
        for (let i = 0; i < els.length; i++) {
          const rid = els.item(i)?.getAttribute('r:id')
          const found = fontRels.some((r) => r.id === rid)
          ok(found, `embeddedFontLst 引用的 r:id=${rid} 在 rels 里不存在`)
        }
      }
    }
  }

  // 4) presentation.xml：embeddedFontLst 位置（notesSz 之后、defaultTextStyle 之前）
  {
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(parts['ppt/presentation.xml']), 'application/xml')
    const root = doc.documentElement
    if (!root) {
      failures.push('presentation.xml 无 documentElement')
    } else {
      const elems: string[] = []
      for (let i = 0; i < root.childNodes.length; i++) {
        const n = root.childNodes.item(i)
        if (n && n.nodeType === 1) elems.push(n.nodeName)
      }
      const iNotes = elems.indexOf('p:notesSz')
      const iLst = elems.indexOf('p:embeddedFontLst')
      const iDef = elems.indexOf('p:defaultTextStyle')
      ok(iLst >= 0, 'p:embeddedFontLst 未找到')
      if (iNotes >= 0) ok(iLst > iNotes, `embeddedFontLst(${iLst}) 须在 notesSz(${iNotes}) 之后`)
      if (iDef >= 0) ok(iLst < iDef, `embeddedFontLst(${iLst}) 须在 defaultTextStyle(${iDef}) 之前`)
      ok(root.getAttribute('embedTrueTypeFonts') === '1', 'embedTrueTypeFonts 应为 "1"')
      const subsets = root.getAttribute('saveSubsetFonts')
      ok(subsets === '1' || subsets === '0', `saveSubsetFonts 应为 "0"/"1"（实际 ${subsets}）`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`字体嵌入自检失败（${failures.length} 项）：\n  - ${failures.join('\n  - ')}`)
  }
}

/** 字符串字面量便于 fixture 构造 */
export const SLOT_LABELS: Record<FontSlot, string> = {
  regular: 'regular',
  bold: 'bold',
  italic: 'italic',
  boldItalic: 'boldItalic'
}
