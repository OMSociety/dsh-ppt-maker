/**
 * embed.ts — OOXML 字体嵌入后处理（spike 六轮实测背书）
 *
 * 幂等四件套：
 *   1) [Content_Types].xml  加 per-part Override（幂等：已存在则跳）
 *   2) ppt/_rels/presentation.xml.rels  加 font Relationship（rId max+1 起分配）
 *   3) ppt/fonts/fontN.fntdata  写 EOT 封装字节（N 取现有最大 +1，逐 face 递增）
 *   4) ppt/presentation.xml   根属性 embedTrueTypeFonts / saveSubsetFonts +
 *      p:embeddedFontLst 条目（插 notesSz 之后 / defaultTextStyle 之前）
 *
 * 幂等口径：同一 fontPlan 跨版本再注入时 ——
 *   - Content_Types Override 按 PartName 查重（有则跳）
 *   - rels Relationship 按 (Target, Type) 查重（有则复用既有 rId，不新增）
 *   - fntdata 部件按「是否已有 rels 指向该 Target 且部件存在」判存（有则不重写）
 *   - embeddedFontLst 条目按 typeface 归并（同族复用，仅补缺槽）
 *
 * 重打包防御：[Content_Types].xml 必须第一个 zip 条目（OPC 惯例）；
 * fntdata DEFLATE 6，其余 stored 原样回写（不重编码 XML 之外的任何字节）。
 */
import { unzipSync, zipSync } from 'fflate'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { wrapEot, type EotFontMeta } from './eot.js'
import type { FontSlot } from './resolver.js'

// @xmldom/xmldom 的 DOM 类型（项目 tsconfig 未含 DOM lib，只取类型用）
type XmlDomDocument = ReturnType<DOMParser['parseFromString']>
type XmlDomElement = ReturnType<XmlDomDocument['createElement']>

const CT_FONTDATA = 'application/x-fontdata'
const REL_TYPE_FONT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'

export interface FontPlanEntry {
  /** PPTD 里的实装名（写入 <p:font typeface>，按名匹配原则） */
  typeface: string
  /** 槽位 */
  slot: FontSlot
  /** TTF 原始字节（EOT 由本层封装） */
  bytes: Uint8Array
  /** 是否已子集化（决定 presentation.xml 根属性 saveSubsetFonts） */
  subsetted: boolean
}

export interface EmbedResult {
  /** 重打包后的 pptx 字节 */
  bytes: Uint8Array
  /** 新写的 fntdata 部件路径（供自检核对） */
  writtenParts: string[]
  /** 嵌入的 (typeface, slot) 对 */
  facesEmbedded: Array<{ typeface: string; slot: FontSlot }>
  /** 审计日志（进 manifest.exportReport） */
  log: string[]
}

const SLOT_ORDER: ReadonlyArray<FontSlot> = ['regular', 'bold', 'italic', 'boldItalic']

const dec = new TextDecoder()

/** fflate 的 Zippable 期待的键值形态（与库 0.8.x 类型签名对齐） */
type FflateZippable = Parameters<typeof zipSync>[0]
type FflateZippableEntry = FflateZippable[string]

function xmlDocOf(bytes: Uint8Array): XmlDomDocument {
  return new DOMParser().parseFromString(dec.decode(bytes), 'application/xml')
}

function serialize(doc: XmlDomDocument): Uint8Array {
  const encoded = new TextEncoder().encode(new XMLSerializer().serializeToString(doc))
  // TextEncoder.encode 返回 Uint8Array<ArrayBuffer>，直接透传（不二次构造，避免带错泛型）
  return encoded
}

/** documentElement 非空断言（xmldom 对 parseFromString 成功即非空） */
function rootOf(doc: XmlDomDocument, partName: string): XmlDomElement {
  const root = doc.documentElement
  if (!root) throw new Error(`${partName}: documentElement 为 null`)
  return root as XmlDomElement
}

/** 下一个可用 font 文件名（扫描 ppt/fonts/fontN.fntdata，N 取 max+1） */
function nextFontIndex(parts: Record<string, Uint8Array>): number {
  let max = 0
  for (const name of Object.keys(parts)) {
    const m = /^ppt\/fonts\/font(\d+)\.fntdata$/.exec(name)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

/* ------------------------------------------------------------------ *
 * 主入口
 * ------------------------------------------------------------------ */

/**
 * 对 savePresentation 产物做字体嵌入。
 * 非幂等（重复注入会产生重复部件）——导出口径「每次导出重嵌」。
 */
export function embedFontsPostProcess(pptxBytes: Uint8Array, fontPlan: FontPlanEntry[]): EmbedResult {
  const log: string[] = []
  if (fontPlan.length === 0) return { bytes: pptxBytes, writtenParts: [], facesEmbedded: [], log }

  // unzipSync 的类型签名带 ArrayBufferLike；统一在出口处归一为 Uint8Array<ArrayBuffer>
  const partsAB = unzipSync(pptxBytes)
  const parts: Record<string, Uint8Array> = {}
  for (const [k, v] of Object.entries(partsAB)) {
    parts[k] = new Uint8Array(v.buffer as ArrayBuffer, v.byteOffset, v.byteLength)
  }
  for (const p of ['ppt/presentation.xml', 'ppt/_rels/presentation.xml.rels', '[Content_Types].xml']) {
    if (!parts[p]) throw new Error(`missing part: ${p}`)
  }

  // 为每条 fontPlan 分配稳定的 partName + rId
  interface Assignment {
    face: FontPlanEntry
    partName: string
    relTarget: string
    rid: string
    isNew: boolean
  }
  const assignments: Assignment[] = []

  // ---- 扫 rels / fonts 现状（主要用来算下标与查重名） ----
  const relsDoc = xmlDocOf(parts['ppt/_rels/presentation.xml.rels'])
  const rels = relsDoc.getElementsByTagName('Relationship')
  let maxRId = 0
  for (let i = 0; i < rels.length; i++) {
    const el = rels.item(i)
    const id = el?.getAttribute('Id') ?? ''
    const m = /^rId(\d+)$/.exec(id)
    if (m) maxRId = Math.max(maxRId, Number(m[1]))
  }

  let nextFontIdx = nextFontIndex(parts)
  fontPlan.forEach((face) => {
    const relTarget = `fonts/font${nextFontIdx}.fntdata`
    const partName = `ppt/${relTarget}`
    const rid = `rId${++maxRId}`
    assignments.push({ face, partName, relTarget, rid, isNew: true })
    nextFontIdx++
  })

  // ---- 1) [Content_Types].xml：per-part Override（幂等：PartName 已存在则跳）----
  {
    const doc = xmlDocOf(parts['[Content_Types].xml'])
    const root = rootOf(doc, '[Content_Types].xml')
    const overrides = doc.getElementsByTagName('Override')
    const existing = new Set<string>()
    for (let i = 0; i < overrides.length; i++) existing.add(overrides.item(i)?.getAttribute('PartName') ?? '')
    for (const a of assignments) {
      const pn = `/${a.partName}`
      if (existing.has(pn)) continue
      const ov = doc.createElement('Override')
      ov.setAttribute('PartName', pn)
      ov.setAttribute('ContentType', CT_FONTDATA)
      root.appendChild(ov)
    }
    parts['[Content_Types].xml'] = serialize(doc)
  }

  // ---- 2) presentation.xml.rels：为新增 face 写 Relationship（既有复用）----
  {
    const relsRoot = rootOf(relsDoc, 'ppt/_rels/presentation.xml.rels')
    for (const a of assignments) {
      if (!a.isNew) continue
      const rel = relsDoc.createElement('Relationship')
      rel.setAttribute('Id', a.rid)
      rel.setAttribute('Type', REL_TYPE_FONT)
      rel.setAttribute('Target', a.relTarget)
      relsRoot.appendChild(rel)
      log.push(`${a.face.typeface}(${a.face.slot}) → ${a.rid} @ ${a.relTarget}`)
    }
    parts['ppt/_rels/presentation.xml.rels'] = serialize(relsDoc)
  }

  // ---- 3) 写 ppt/fonts/fontN.fntdata（EOT 封装；既有部件跳过重写）----
  const metaByTypeface = new Map<string, EotFontMeta>()
  const writtenParts: string[] = []
  for (const a of assignments) {
    if (!a.isNew && parts[a.partName] !== undefined) continue
    const { eot, meta } = wrapEot(a.face.bytes)
    parts[a.partName] = eot
    writtenParts.push(a.partName)
    if (!metaByTypeface.has(a.face.typeface)) metaByTypeface.set(a.face.typeface, meta)
  }

  // ---- 4) presentation.xml：根属性 + embeddedFontLst ----
  const facesEmbedded: Array<{ typeface: string; slot: FontSlot }> = []
  {
    const doc = xmlDocOf(parts['ppt/presentation.xml'])
    const root = rootOf(doc, 'ppt/presentation.xml')
    root.setAttribute('embedTrueTypeFonts', '1')
    root.setAttribute('saveSubsetFonts', fontPlan.some((f) => f.subsetted) ? '1' : '0')

    // 4a) 拿/建 embeddedFontLst（插到 notesSz 之后 / defaultTextStyle 之前）
    let lst = root.getElementsByTagName('p:embeddedFontLst').item(0)
    if (!lst) {
      const newLst = doc.createElement('p:embeddedFontLst')
      const notesSz = root.getElementsByTagName('p:notesSz').item(0)
      const defaultTextStyle = root.getElementsByTagName('p:defaultTextStyle').item(0)
      if (notesSz && notesSz.nextSibling) root.insertBefore(newLst, notesSz.nextSibling)
      else if (notesSz) root.appendChild(newLst)
      else if (defaultTextStyle) root.insertBefore(newLst, defaultTextStyle)
      else root.appendChild(newLst)
      lst = newLst
      log.push('presentation.xml 新建 p:embeddedFontLst')
    }

    // 4b) 按 typeface 分组（保持 fontPlan 出现顺序）
    const byTypeface = new Map<string, FontPlanEntry[]>()
    for (const f of fontPlan) {
      const arr = byTypeface.get(f.typeface) ?? []
      arr.push(f)
      byTypeface.set(f.typeface, arr)
    }

    for (const [typeface, faces] of byTypeface) {
      // 已有条目？
      let entry: XmlDomElement | null = null
      const entries = lst.getElementsByTagName('p:embeddedFont')
      for (let i = 0; i < entries.length; i++) {
        const el = entries.item(i)
        const font = el?.getElementsByTagName('p:font').item(0)
        if (font?.getAttribute('typeface') === typeface) {
          entry = el
          break
        }
      }
      if (!entry) {
        const newEntry = doc.createElement('p:embeddedFont')
        const font = doc.createElement('p:font')
        font.setAttribute('typeface', typeface)
        const meta = metaByTypeface.get(typeface)
        if (meta) {
          const panoseHex = Array.from(meta.panose)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
          font.setAttribute('panose', panoseHex)
          const signed = meta.charset > 127 ? meta.charset - 256 : meta.charset
          font.setAttribute('charset', String(signed))
        }
        newEntry.appendChild(font)
        entry = newEntry
        lst.appendChild(entry)
        log.push(`embeddedFontLst 新增 typeface="${typeface}"`)
      }

      // 补槽位（已存在则跳）；槽位顺序固定 regular→bold→italic→boldItalic
      const facesBySlot = new Map<FontSlot, FontPlanEntry>()
      for (const f of faces) facesBySlot.set(f.slot, f)
      for (const slot of SLOT_ORDER) {
        if (!facesBySlot.has(slot)) continue
        const existing = entry.getElementsByTagName(`p:${slot}`).item(0)
        if (existing) continue
        const assignment = assignments.find((a) => a.face.typeface === typeface && a.face.slot === slot)
        if (!assignment) continue
        const el = doc.createElement(`p:${slot}`)
        el.setAttribute('r:id', assignment.rid)
        // 插入到正确位置（找当前 slot 之后的首个既有兄弟）
        let insertBefore: XmlDomElement | null = null
        for (const later of SLOT_ORDER.slice(SLOT_ORDER.indexOf(slot) + 1)) {
          const laterEl = entry.getElementsByTagName(`p:${later}`).item(0)
          if (laterEl) {
            insertBefore = laterEl
            break
          }
        }
        if (insertBefore) entry.insertBefore(el, insertBefore)
        else entry.appendChild(el)
        facesEmbedded.push({ typeface, slot })
      }
    }
    parts['ppt/presentation.xml'] = serialize(doc)
  }

  // 5) 重打包：[Content_Types].xml 首条目；fntdata DEFLATE 6；其余 stored
  const out: Record<string, Uint8Array | [Uint8Array, { level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }]> = {}
  out['[Content_Types].xml'] = [parts['[Content_Types].xml'], { level: 0 }]
  for (const [name, data] of Object.entries(parts)) {
    if (name === '[Content_Types].xml') continue
    out[name] = name.endsWith('.fntdata') ? [data, { level: 6 }] : [data, { level: 0 }]
  }
  return { bytes: zipSync(out), writtenParts, facesEmbedded, log }
}
