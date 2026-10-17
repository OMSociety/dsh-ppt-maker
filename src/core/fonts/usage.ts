/**
 * usage.ts — 扫 deck 收集①用到的字体清单（typeface → slot 集合）②子集化字符集
 *
 * 覆盖范围：
 *  - deck.pptd.theme.textStyles[*].fontFamily（string 或 {latin, ea}）
 *  - pages/* 各元素 content.fontFamily（text/shape 内文本）
 *  - content.text / richText 富文本里的 <span style="font-family:…">（按 regular 槽记）
 *  - table cell 的 textStyle 内联 fontFamily
 *  - chart 子组件 fontFamily（TitleConfig/LegendConfig/DataLabelConfig/AxisConfig.label 等）
 *  - 元素内联 textStyle.fontFamily（reverse 方言特有）
 *
 * slot 判定：粗出现 → 需 bold 槽；粗+斜 → boldItalic；斜 → italic
 * 文本收集：deck 全部文本去重（含备注/标签/表格内容）→ 给 subset.ts 作为子集字符集
 */

import type { Page, Presentation } from '../pptd/schema.js'
import type { FontSlot } from './resolver.js'

export interface FontUsage {
  /** typeface → 实际用到的 slot 集（缺 slot 的 face 不嵌入） */
  typefaces: Map<string, Set<FontSlot>>
  /** deck 全集去重字符（子集化的字符源） */
  charset: string
}

/* ------------------------------------------------------------------ *
 * fontFamily 字段取名字
 * ------------------------------------------------------------------ */

function collectFontFamily(value: unknown, into: Set<string>): void {
  if (typeof value === 'string' && value !== '') into.add(value)
  else if (value !== null && typeof value === 'object') {
    const rec = value as Record<string, unknown>
    if (typeof rec.latin === 'string') into.add(rec.latin)
    if (typeof rec.ea === 'string') into.add(rec.ea)
  }
}

function slotFrom(bold: boolean | undefined, italic: boolean | undefined): FontSlot {
  if (bold === true && italic === true) return 'boldItalic'
  if (bold === true) return 'bold'
  if (italic === true) return 'italic'
  return 'regular'
}

/** 记一个 (字体, 槽位)；非 regular 也保底收 regular（合成仿粗/仿斜的依据） */
function addFont(fonts: Map<string, Set<FontSlot>>, name: string, slot: FontSlot): void {
  let slots = fonts.get(name)
  if (!slots) {
    slots = new Set()
    fonts.set(name, slots)
  }
  slots.add(slot)
  if (slot !== 'regular') slots.add('regular')
}

/* ------------------------------------------------------------------ *
 * 富文本内联字体
 * ------------------------------------------------------------------ */

/** 起始 <span> 标签（PPTD 的内联样式只允许写在 span 上，见 reference/pptd.md「Inline styles」） */
const SPAN_TAG_RE = /<span\b[^>]*>/gi
/** 标签内的 style 属性（双引号或单引号） */
const STYLE_ATTR_RE = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i

/**
 * 收集富文本串里 <span style="font-family:…"> 声明的字体。
 * 这层声明覆盖不到 content.fontFamily（元素级）上，漏收会导致该字体不被嵌入。
 * span 的内联样式只允许 color / font-size / font-family / background-color，
 * 没有粗斜体，因此一律按 regular 槽记。
 */
function scanRichTextFonts(html: string, fonts: Map<string, Set<FontSlot>>): void {
  if (!/font-family/i.test(html)) return
  for (const tag of html.match(SPAN_TAG_RE) ?? []) {
    const attr = STYLE_ATTR_RE.exec(tag)
    if (!attr) continue
    for (const decl of (attr[1] ?? attr[2] ?? '').split(';')) {
      const colon = decl.indexOf(':')
      if (colon < 0) continue
      if (decl.slice(0, colon).trim().toLowerCase() !== 'font-family') continue
      // 值形如 "Arial, 微软雅黑"：去引号后按逗号拆（与 fontFamily:{latin, ea} 同口径）
      for (const part of decl.slice(colon + 1).split(',')) {
        const name = part.trim().replace(/^["']|["']$/g, '').trim()
        if (name) addFont(fonts, name, 'regular')
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 深扫描：theme → pages → cell → chart 子组件
 * ------------------------------------------------------------------ */

function scanStyle(style: Record<string, unknown>, into: Map<string, Set<FontSlot>>): void {
  const ff = style.fontFamily
  if (ff === undefined) return
  const tmp = new Set<string>()
  collectFontFamily(ff, tmp)
  const slot = slotFrom(style.bold === true, style.italic === true)
  for (const name of tmp) addFont(into, name, slot)
}

function scanText(text: unknown, chars: Set<string>): void {
  if (typeof text !== 'string') return
  for (const ch of text) {
    // 跳过 ASCII 控制字符与空白分隔（留白算字体的一个 glyph，但 hb-subset 自己处理）
    if (ch < ' ' && ch !== '\n' && ch !== '\t') continue
    chars.add(ch)
  }
}

function scanElement(el: Record<string, unknown>, fonts: Map<string, Set<FontSlot>>, chars: Set<string>): void {
  // content 子树
  if (el.content && typeof el.content === 'object') {
    const content = el.content as Record<string, unknown>
    scanStyle(content, fonts)
    for (const field of ['text', 'richText'] as const) {
      const html = content[field]
      if (typeof html !== 'string') continue
      scanText(html, chars)
      scanRichTextFonts(html, fonts)
    }
  }
  // textStyle 内联（reverse 方言元素级）
  if (el.textStyle && typeof el.textStyle === 'object') scanStyle(el.textStyle as Record<string, unknown>, fonts)
  // chart 子组件 fontFamily
  if (el.elementType === 'chart') scanChart(el, fonts, chars)
  // 表格 cell
  if (el.elementType === 'table' && Array.isArray(el.rows)) scanTable(el.rows as unknown[][], fonts, chars)
  // 备注
  if (typeof el.notes === 'string') scanText(el.notes, chars)
}

function scanTable(rows: unknown[][], fonts: Map<string, Set<FontSlot>>, chars: Set<string>): void {
  for (const row of rows) {
    if (!Array.isArray(row)) continue
    for (const cell of row) {
      if (!cell || typeof cell !== 'object') continue
      const c = cell as Record<string, unknown>
      if (c.textStyle && typeof c.textStyle === 'object') scanStyle(c.textStyle as Record<string, unknown>, fonts)
      scanText(c.text, chars)
    }
  }
}

function scanChart(el: Record<string, unknown>, fonts: Map<string, Set<FontSlot>>, chars: Set<string>): void {
  // 常见 chart 字体槽位：title / legend / dataLabel / axis.label / tooltip（对齐 reference/pptd.md 优先级链）
  const scanConfig = (cfg: unknown): void => {
    if (!cfg || typeof cfg !== 'object') return
    const rec = cfg as Record<string, unknown>
    scanStyle(rec, fonts)
    scanText(rec.text, chars)
    if (rec.label && typeof rec.label === 'object') scanConfig(rec.label)
  }
  scanConfig(el.title)
  scanConfig(el.legend)
  scanConfig(el.dataLabel)
  if (Array.isArray(el.axes)) el.axes.forEach(scanConfig)
  scanConfig(el.tooltip)
  // series/data 标签
  if (el.data && typeof el.data === 'object') {
    const d = el.data as Record<string, unknown>
    if (Array.isArray(d.rows)) for (const row of d.rows) if (Array.isArray(row)) row.forEach((v) => scanText(String(v ?? ''), chars))
    if (Array.isArray(d.cols)) d.cols.forEach((c) => scanText(String(c ?? ''), chars))
  }
}

/* ------------------------------------------------------------------ *
 * 主入口
 * ------------------------------------------------------------------ */

export function collectFontUsage(deck: Presentation, pages: Page[]): FontUsage {
  const typefaces = new Map<string, Set<FontSlot>>()
  const chars = new Set<string>()

  // 1) deck.theme.textStyles
  const textStyles = deck.theme?.textStyles
  if (textStyles && typeof textStyles === 'object') {
    for (const style of Object.values(textStyles)) {
      if (style && typeof style === 'object') scanStyle(style as Record<string, unknown>, typefaces)
    }
  }

  // 2) pages 元素
  for (const page of pages) {
    if (typeof page.notes === 'string') scanText(page.notes, chars)
    for (const el of page.elements ?? []) {
      scanElement(el as Record<string, unknown>, typefaces, chars)
    }
  }

  // 字符集 → 字符串（去重已天然完成）
  const charset = [...chars].join('')

  return { typefaces, charset }
}
