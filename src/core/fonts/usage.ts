/**
 * usage.ts — 扫 deck 收集①用到的字体清单（typeface → slot 集合）②子集化字符集
 *
 * 覆盖范围：
 *  - deck.pptd.theme.textStyles[*].fontFamily（string 或 {latin, ea}）
 *  - pages/* 各元素 content.fontFamily（text/shape 内文本）
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

/* ------------------------------------------------------------------ *
 * 深扫描：theme → pages → cell → chart 子组件
 * ------------------------------------------------------------------ */

function scanStyle(style: Record<string, unknown>, into: Map<string, Set<FontSlot>>): void {
  const ff = style.fontFamily
  if (ff === undefined) return
  const tmp = new Set<string>()
  collectFontFamily(ff, tmp)
  const bold = style.bold === true
  const italic = style.italic === true
  const slot = slotFrom(bold, italic)
  for (const name of tmp) {
    if (!into.has(name)) into.set(name, new Set())
    into.get(name)!.add(slot)
    // 嵌完带 bold/italic 的内容时，确保至少 regular 槽位也收（合成仿粗/仿斜的依据）
    if (slot !== 'regular') into.get(name)!.add('regular')
  }
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
    scanText(content.text, chars)
    if (content.richText) scanText(typeof content.richText === 'string' ? content.richText : '', chars)
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
