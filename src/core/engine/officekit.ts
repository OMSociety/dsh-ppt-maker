/**
 * @office-kit/pptx implementation of the deck engine.
 *
 * This is the ONLY file that imports @office-kit/pptx. Swapping engines means
 * replacing this file; PPTD types and tool code never see the library API.
 *
 * Mapping rules worth knowing:
 *  - PPTD px → EMU: 1 px = 1 pt = 12700 EMU (spec §1.2); fontSize passes
 *    through as pt unchanged; letterSpacing px → 1/100 pt (×100).
 *  - Slides are created via `addBlankSlide` + `clearSlideShapes`, so layout
 *    placeholders never leak into generated output.
 *  - `theme.colors` `$key` references are resolved by this file (the engine
 *    owns the theme tables); `scheme:` references pass through as engine
 *    scheme tokens.
 *  - Element order = z-order: the library appends in document order, which
 *    matches PPTD's "later elements are higher" rule without extra work.
 */
import {
  addBlankSlide,
  addSlideChart,
  addSlideImage,
  addSlideLayout,
  addSlideLayoutPlaceholder,
  addSlideLine,
  addSlideMaster,
  addSlideShape,
  addSlideTable,
  addSlideTextBox,
  clearSlideShapes,
  copyShape,
  createPresentation,
  emu,
  getPresentationFonts,
  getShapeFill,
  getShapeFillOpacity,
  getShapeGradientFill,
  getShapeStroke,
  getGroupChildren,
  getShapeId,
  getShapeKind,
  getSlideIndex,
  getSlideLayoutPartName,
  getSlideLayouts,
  getSlideShapes,
  getSlides,
  getTableCell,
  groupShapes,
  hasShapeImage,
  importSlide,
  loadPresentation,
  mergeTableCells,
  moveSlide,
  removeSlide,
  renameShape,
  savePresentation,
  setParagraphBullet,
  setParagraphIndent,
  setParagraphLineSpacing,
  setPresentationFonts,
  setPresentationTheme,
  setShapeAnimation,
  setShapeBounds,
  setShapeCustomGeometry,
  setShapeFill,
  setShapeFlip,
  setShapeGradientFill,
  setShapeImageCrop,
  setShapeImageFill,
  setShapeImageOpacity,
  setShapeParagraphs,
  setShapePreset,
  setShapeRotation,
  setShapeShadow,
  setShapeStroke,
  setShapeStrokeArrow,
  setShapeStrokeDash,
  setShapeTextAnchor,
  setShapeTextDirection,
  setShapeAdjustValues,
  setShapeTextMargins,
  setShapeTextWrap,
  setSlideBackground,
  setSlideBackgroundGradientFill,
  setSlideBackgroundImage,
  setSlideHidden,
  setSlideLayout,
  setSlideLayoutName,
  setSlideMasterName,
  setSlideNotes,
  setSlideSize,
  setSlideTransition,
  setTableCellAnchor,
  setTableCellBorders,
  setTableStyleId,
  setTableCellFill,
  setTableCellText,
  setShapeText,
  setTableCellParagraphs,
  ungroupShapes,
  type ChartSpec,
  type Color,
  type ColorTransform,
  type CustomGeometryInput,
  type Emu,
  type GeomCommand,
  type GradientFillOptions,
  type LineEndType,
  type ParagraphSpec,
  type PresentationData,
  type PresentationFontsInput,
  type SlideData,
  type SlideLayoutData,
  type SlideShapeData,
  type TableCellData,
  type TextFormat,
  type TransitionOptions
} from '@office-kit/pptx'
import { PRESET_ADJUST_GUIDES } from './preset-adjust-guides.js'
import type { Animation, ElementBase, MasterSpec, Page, PageTransition, Presentation, Theme } from '../pptd/schema.js'
import { PLACEHOLDER_DEFAULT_LABELS } from '../pptd/schema.js'
import { SVG_PAGE_TYPE } from '../pptd/schema-v2.js'
import { compileSvgPage, themeHashOf } from '../svg/compiler.js'
import { planSourceRestore } from '../reverse/restore.js'
import { parseRichText, type RichParagraph, type RichRun } from './richtext.js'
import type { BuildContext, DeckBuildResult, DeckEngine } from './types.js'

/* ------------------------------------------------------------------ *
 * Units
 * ------------------------------------------------------------------ */

const PX_TO_EMU = 12700

/**
 * Element groups (spec §6.0): elements sharing `group[d]` are combined into
 * one group shape, innermost level first, so nested groups wrap their inner
 * groups. A level with a single member stays ungrouped.
 */
function applyElementGroups(
  elements: readonly Record<string, unknown>[],
  shapeMap: Map<string, SlideShapeData>,
  warnings: string[],
  pageLabel: string
): void {
  const levels: { id: string; depth: number }[] = []
  const seen = new Set<string>()
  for (const el of elements) {
    const path = Array.isArray(el.group) ? (el.group as unknown[]) : []
    path.forEach((id, depth) => {
      if (typeof id === 'string' && !seen.has(id)) {
        seen.add(id)
        levels.push({ id, depth })
      }
    })
  }
  if (levels.length === 0) return
  const top = new Map<string, SlideShapeData>()
  for (const [id, shape] of shapeMap) top.set(id, shape)
  levels.sort((a, b) => b.depth - a.depth)
  for (const { id, depth } of levels) {
    const memberIds = elements
      .filter((el) => Array.isArray(el.group) && (el.group as unknown[])[depth] === id && top.has(String(el.elementId)))
      .map((el) => String(el.elementId))
    const shapes = [...new Set(memberIds.map((m) => top.get(m)!))]
    if (shapes.length < 2) continue
    try {
      const group = groupShapes(shapes, { name: id })
      for (const m of memberIds) top.set(m, group)
    } catch (err) {
      warnings.push(`${pageLabel}：组合 ${id} 未能还原（${(err as Error).message}），成员按独立元素落盘`)
    }
  }
}

/** Depth-first search for a shape by id, descending into groups. */
function findShapeById(shapes: readonly SlideShapeData[], id: number): SlideShapeData | null {
  for (const shape of shapes) {
    if (getShapeId(shape) === id) return shape
    if (getShapeKind(shape) === 'group') {
      const hit = findShapeById(getGroupChildren(shape), id)
      if (hit) return hit
    }
  }
  return null
}

/**
 * Placeholder passthrough (spec §10.4): a reverse placeholder whose source
 * shape is still in the archive is replaced by a copy of that original object
 * (chart, SmartArt, OLE, media …) at the placeholder's bounds. Group wrappers
 * kept by `preserveGroupTransform` are dissolved so the copy lands in slide
 * coordinates, exactly as the importer flattened it.
 */
function copyArchivedOriginal(
  slide: SlideData,
  element: Record<string, unknown>,
  archiveSlides: readonly SlideData[],
  ctx: { warnings: string[] },
  pageLabel: string
): SlideShapeData | null {
  const ref = element.sourceRef as { slideIndex?: unknown; shapeId?: unknown } | undefined
  if (!ref || typeof ref.slideIndex !== 'number' || typeof ref.shapeId !== 'number') return null
  const sourceSlide = archiveSlides[ref.slideIndex - 1]
  if (!sourceSlide) return null
  const source = findShapeById(getSlideShapes(sourceSlide), ref.shapeId)
  if (!source) return null
  try {
    let copied = copyShape(slide, source, { preserveGroupTransform: true })
    while (getShapeKind(copied) === 'group' && getShapeKind(source) !== 'group') {
      const children = ungroupShapes(copied)
      if (children.length !== 1) break
      copied = children[0]
    }
    const [x, y, w, h] = element.bounds as [number, number, number, number]
    setShapeBounds(copied, { x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) })
    return copied
  } catch (err) {
    ctx.warnings.push(`${pageLabel}：占位 ${String(element.elementId)} 的源对象拷贝失败（${(err as Error).message}），按占位框落盘`)
    return null
  }
}

function toEmu(px: number): Emu {
  return emu(Math.round(px * PX_TO_EMU))
}

/* ------------------------------------------------------------------ *
 * Theme resolution
 * ------------------------------------------------------------------ */

class ThemeResolver {
  private readonly colors: Record<string, string>

  constructor(theme: Theme | undefined) {
    this.colors = (theme?.colors ?? {}) as Record<string, string>
  }

  /** Resolve a PPTD color to an engine Color; unknown $keys stay as-is (validation already flagged them). */
  color(value: unknown): Color | undefined {
    if (typeof value !== 'string') return undefined
    if (value.startsWith('$')) {
      const hit = this.colors[value.slice(1)]
      return (hit ?? value) as Color
    }
    return value as Color
  }

  /** Resolve a possibly-{latin,ea} font family into engine font fields. */
  fontFamily(value: unknown): { font?: string; fontEastAsian?: string } {
    if (typeof value === 'string') {
      // A comma stack is the CSS-style latin,ea pair the reverse map writes
      // (e.g. "Liter, MiSans"); OOXML has two separate slots, so the stack
      // must be split — writing it whole produces an illegal typeface name.
      const parts = splitFontStack(value)
      if (parts.length === 0) return {}
      return { font: parts[0], fontEastAsian: parts.length > 1 ? parts[1] : parts[0] }
    }
    if (value && typeof value === 'object') {
      const rec = value as { latin?: unknown; ea?: unknown }
      const out: { font?: string; fontEastAsian?: string } = {}
      if (typeof rec.latin === 'string') out.font = rec.latin
      if (typeof rec.ea === 'string') out.fontEastAsian = rec.ea
      return out
    }
    return {}
  }

  /** Record a font family string into fontsUsed. */
  static collectFont(into: Set<string>, value: unknown): void {
    if (typeof value === 'string') {
      for (const part of splitFontStack(value)) into.add(part)
    } else if (value && typeof value === 'object') {
      const rec = value as { latin?: unknown; ea?: unknown }
      if (typeof rec.latin === 'string') into.add(rec.latin)
      if (typeof rec.ea === 'string') into.add(rec.ea)
    }
  }
}

/** CSS generic family keywords never map onto an OOXML typeface slot. */
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'default'])

/** Split a CSS-style font stack ("Liter, MiSans") into plain family names. */
function splitFontStack(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim().replace(/^["']+|["']+$/g, ''))
    .filter((s) => s !== '' && !GENERIC_FAMILIES.has(s.toLowerCase()))
}

/* ------------------------------------------------------------------ *
 * TextContent resolution (six-level chain, collapsed to one record)
 * ------------------------------------------------------------------ */

interface ResolvedContent {
  fontSize?: number
  color?: Color
  font: { font?: string; fontEastAsian?: string }
  bold?: boolean
  italic?: boolean
  backgroundColor?: string
  lineHeight?: number
  lineHeightPx?: number
  letterSpacing?: number
  marginTop?: number
  align: [string, string]
  wrap: boolean
  textDirection?: string
  padding?: [number, number, number, number]
  gradient?: unknown
  shadow?: unknown
}

const ALIGN_MAP: Record<string, 'left' | 'center' | 'right' | 'justify' | 'distribute'> = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
  distributed: 'distribute'
}

function resolveContent(
  content: Record<string, unknown>,
  theme: Theme | undefined,
  resolver: ThemeResolver,
  fonts: Set<string>,
  warnings: string[],
  where: string
): ResolvedContent {
  const styleKey = typeof content.style === 'string' && content.style.startsWith('$') ? content.style.slice(1) : null
  const styleRef = (styleKey ? (theme?.textStyles?.[styleKey] as Record<string, unknown> | undefined) : undefined) ?? {}

  const pick = <T>(key: string): T | undefined =>
    (content[key] !== undefined ? content[key] : styleRef[key]) as T | undefined

  const fontFamily = pick<unknown>('fontFamily')
  if (fontFamily !== undefined) ThemeResolver.collectFont(fonts, fontFamily)
  const colorRaw = pick<unknown>('color')
  const out: ResolvedContent = {
    fontSize: pick<number>('fontSize'),
    color: resolver.color(colorRaw),
    font: resolver.fontFamily(fontFamily),
    bold: pick<boolean>('bold'),
    italic: pick<boolean>('italic'),
    lineHeight: pick<number>('lineHeight'),
    lineHeightPx: pick<number>('lineHeightPx'),
    letterSpacing: pick<number>('letterSpacing'),
    marginTop: pick<number>('marginTop'),
    align: (pick<[string, string]>('align') ?? ['left', 'top']),
    wrap: pick<boolean>('wrap') ?? true,
    textDirection: pick<string>('textDirection')
  }
  const padding = pick<unknown>('padding')
  if (Array.isArray(padding) && padding.length === 4 && padding.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0)) {
    out.padding = padding as [number, number, number, number]
  }
  const bgRaw = pick<unknown>('backgroundColor')
  if (bgRaw !== undefined) {
    const resolved = resolver.color(bgRaw)
    if (resolved !== undefined) out.backgroundColor = String(resolved)
  }
  if (content.gradient !== undefined || styleRef.gradient !== undefined) {
    warnings.push(`${where}：文字渐变（gradient）暂不支持，已按纯色处理`)
  }
  const shadow = content.shadow ?? styleRef.shadow
  if (shadow !== undefined) out.shadow = shadow
  if (content.textDirection === 'vertical') {
    // handled by caller via setShapeTextDirection
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Rich text → ParagraphSpec[]
 * ------------------------------------------------------------------ */

function richRunsToSpecs(
  paragraphs: RichParagraph[],
  base: ResolvedContent,
  resolver: ThemeResolver,
  fonts: Set<string>
): ParagraphSpec[] {
  const specs: ParagraphSpec[] = []
  for (const para of paragraphs) {
    // Paragraph-level align (from markup) wins; otherwise the element's
    // horizontal content.align applies to every paragraph.
    const alignToken = ALIGN_MAP[para.props.align ?? base.align[0]]
    const runs = para.runs.flatMap((run) => runToSpecs(run, base, resolver, fonts))
    const spec: ParagraphSpec = {
      ...(alignToken !== undefined ? { align: alignToken } : {}),
      runs,
      // endFormat keeps empty paragraphs' height stable.
      ...(runs.length === 0 && base.fontSize !== undefined
        ? { endFormat: { size: base.fontSize, ...(base.color !== undefined ? { color: base.color } : {}) } }
        : {})
    }
    specs.push(spec)
  }
  return specs
}

/**
 * UTF-16 offsets of every in-run '\n' (from `<br>`) in the text the library
 * reports for these paragraphs (paragraphs are joined by one '\n' as well).
 */
function lineBreakOffsets(specs: ReadonlyArray<ParagraphSpec>): number[] {
  const out: number[] = []
  let offset = 0
  specs.forEach((spec, index) => {
    if (index > 0) offset += 1
    for (const run of spec.runs) {
      for (let i = 0; i < run.text.length; i++) if (run.text[i] === '\n') out.push(offset + i)
      offset += run.text.length
    }
  })
  return out
}

/**
 * ParagraphSpec runs carry `<br>` as a literal '\n'; DrawingML needs `<a:br>`.
 * Each newline is replaced in place with a paragraph-internal break, which
 * keeps run formats and paragraph properties (alignment, spacing) intact.
 */
function writeLineBreaks(
  target: { shape: SlideShapeData } | { cell: TableCellData },
  specs: ReadonlyArray<ParagraphSpec>
): void {
  for (const start of lineBreakOffsets(specs).reverse()) {
    const range = { start, end: start + 1 }
    if ('cell' in target) setTableCellText(target.cell, '\n', { range, newlines: 'break' })
    else setShapeText(target.shape, '\n', { range, newlines: 'break' })
  }
}

function runToSpecs(run: RichRun, base: ResolvedContent, resolver: ThemeResolver, fonts: Set<string>): ParagraphSpec['runs'] {
  // A run containing '\n' (<br/>) splits into several runs; the library keeps
  // a CR LF inside a run as a line break, which is exactly the upstream semantics.
  const format: TextFormat = {}
  const size = run.style.fontSize ?? base.fontSize
  if (size !== undefined) format.size = size
  const colorRaw = run.style.color !== undefined ? run.style.color : base.color
  const color = typeof colorRaw === 'string' ? resolver.color(colorRaw) : colorRaw
  if (color !== undefined) format.color = color
  if (run.style.fontFamily !== undefined) {
    ThemeResolver.collectFont(fonts, run.style.fontFamily)
    Object.assign(format, resolver.fontFamily(run.style.fontFamily))
  } else {
    Object.assign(format, base.font)
  }
  if (run.bold === true || base.bold === true) format.bold = true
  if (run.italic === true || base.italic === true) format.italic = true
  if (run.underline) format.underline = true
  if (run.strike) format.strike = true
  if (run.superscript) format.baseline = 0.3
  if (run.subscript) format.baseline = -0.25
  if (run.style.backgroundColor !== undefined) {
    const bg = resolver.color(run.style.backgroundColor)
    if (bg !== undefined) format.highlight = bg
  } else if (base.backgroundColor !== undefined) {
    format.highlight = base.backgroundColor as Color
  }
  if (base.letterSpacing !== undefined) format.spc = Math.round(base.letterSpacing * 100)
  return [{ text: run.text, format }]
}

/** Apply paragraph-level spacing (lineHeight / marginTop) that ParagraphSpec cannot carry. */
function applyParagraphMetrics(
  shape: SlideShapeData,
  paragraphs: RichParagraph[],
  base: ResolvedContent
): void {
  paragraphs.forEach((para, index) => {
    const lh = para.props.lineHeight ?? base.lineHeight
    const lhPx = para.props.lineHeightPx ?? base.lineHeightPx
    if (lhPx !== undefined) {
      setParagraphLineSpacing(shape, index, { kind: 'pts', value: lhPx })
    } else if (lh !== undefined) {
      setParagraphLineSpacing(shape, index, { kind: 'pct', value: lh })
    }
  })
}

/**
 * Consume parsed list markup: per-paragraph bullet + hanging indent.
 * The 27px(=pt) hanging indent mirrors the reference desktop app's level-0
 * list default and is what the reverse map reads back from real decks.
 */
function applyParagraphBullets(shape: SlideShapeData | TableCellData, paragraphs: RichParagraph[]): void {
  paragraphs.forEach((para, index) => {
    const bullet = para.props.bullet
    if (bullet === undefined || bullet === null) return
    try {
      setParagraphBullet(shape, index, bullet === 'number' ? 'number' : 'bullet')
      const left = para.props.marginLeft !== undefined ? para.props.marginLeft : 27
      setParagraphIndent(shape, index, { leftEmu: toEmu(left), firstLineEmu: toEmu(-left) })
    } catch {
      // Bullet/indent failure must not drop the paragraph text already written.
    }
  })
}

/** Vertical anchor + wrap + direction shared by text boxes and shapes. */
function applyTextBodyProps(
  shape: SlideShapeData,
  base: ResolvedContent,
  warnings: string[],
  where: string
): void {
  const vertical = base.align[1]
  // TextAnchor is the plain-English union 'top' | 'center' | 'bottom'.
  if (vertical === 'middle') setShapeTextAnchor(shape, 'center')
  else if (vertical === 'bottom') setShapeTextAnchor(shape, 'bottom')
  else setShapeTextAnchor(shape, 'top')
  if (!base.wrap) setShapeTextWrap(shape, 'none')
  if (base.padding) {
    const [top, right, bottom, left] = base.padding.map((v) => Math.round(v * PX_TO_EMU))
    setShapeTextMargins(shape, { top, right, bottom, left })
  }
  if (base.textDirection === 'vertical') {
    try {
      setShapeTextDirection(shape, 'eaVert')
    } catch {
      warnings.push(`${where}：竖排文字设置失败，已按横排处理`)
    }
  }
}

/* ------------------------------------------------------------------ *
 * Fill / border / shadow
 * ------------------------------------------------------------------ */

function applyFill(
  shape: SlideShapeData,
  fill: Record<string, unknown> | undefined,
  resolver: ThemeResolver,
  ctx: BuildContext,
  where: string
): void {
  if (fill === undefined) return
  const type = fill.type
  if (type === 'solid') {
    const color = resolver.color(fill.color)
    if (color === undefined) { ctx.warnings.push(`${where}：solid 填充缺 color`); return }
    setShapeFill(shape, color)
  } else if (type === 'gradient') {
    const options = gradientOptionsOf(fill, resolver)
    if (!options) { ctx.warnings.push(`${where}：gradient 填充至少需要 2 个色标`); return }
    if (fill.gradientType === 'radial') {
      ctx.warnings.push(`${where}：径向渐变（radial）暂不支持，已按线性渐变处理`)
    }
    setShapeGradientFill(shape, options)
  } else if (type === 'image') {
    // Synchronous fill application can't await — media bytes are preloaded by the caller.
    const bytes = (fill as { __bytes?: Uint8Array }).__bytes
    if (bytes) {
      setShapeImageFill(shape, bytes)
    } else {
      ctx.warnings.push(`${where}：image 填充未能加载素材（${String(fill.src)}），已跳过填充`)
    }
  } else {
    ctx.warnings.push(`${where}：未知填充类型 ${String(type)}，已跳过`)
  }
}

/** PPTD GradientFill → 库的渐变参数；有效色标不足 2 个时返回 null。 */
function gradientOptionsOf(fill: Record<string, unknown>, resolver: ThemeResolver): GradientFillOptions | null {
  const stops = Array.isArray(fill.stops) ? fill.stops : []
  const mapped = stops
    .map((stop) => {
      const s = stop as { position?: unknown; color?: unknown }
      const color = resolver.color(s.color)
      if (typeof s.position !== 'number' || color === undefined) return null
      // HEX8 的末两位是透明度：库的色标把颜色与 opacity 分开传。
      const hex8 = /^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})$/.exec(color)
      return hex8
        ? { offset: s.position, color: `#${hex8[1]}` as Color, opacity: parseInt(hex8[2], 16) / 255 }
        : { offset: s.position, color }
    })
    .filter((s): s is { offset: number; color: Color; opacity?: number } => s !== null)
  if (mapped.length < 2) return null
  return { stops: mapped, angleDeg: typeof fill.angle === 'number' ? fill.angle : 0 }
}

function applyBorder(shape: SlideShapeData, border: Record<string, unknown> | undefined, resolver: ThemeResolver): void {
  if (border === undefined) return
  const color = resolver.color(border.color) ?? ('#000000' as Color)
  const width = typeof border.width === 'number' ? border.width : 1
  const gradient = border.gradient && typeof border.gradient === 'object'
    ? gradientOptionsOf(border.gradient as Record<string, unknown>, resolver)
    : null
  setShapeStroke(shape, gradient
    ? { widthEmu: toEmu(width) as unknown as number, fill: { kind: 'gradient', ...gradient } }
    : { color, widthEmu: toEmu(width) as unknown as number })
  const style = border.style
  if (style === 'dash') setShapeStrokeDash(shape, 'dash')
  else if (style === 'dot') setShapeStrokeDash(shape, 'sysDot')
}

function applyShadow(shape: SlideShapeData, shadow: Record<string, unknown> | undefined, resolver: ThemeResolver): void {
  if (shadow === undefined) return
  const resolved = String(resolver.color(shadow.color) ?? '#000000')
  // HEX8 carries the shadow's alpha; the library takes colour and opacity apart.
  const hex8 = /^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})$/.exec(resolved)
  const color = (hex8 ? `#${hex8[1]}` : resolved) as Color
  const blur = typeof shadow.blur === 'number' ? shadow.blur : 0
  const offset = Array.isArray(shadow.offset) ? (shadow.offset as number[]) : [0, 0]
  const [ox, oy] = [offset[0] ?? 0, offset[1] ?? 0]
  const dist = Math.sqrt(ox * ox + oy * oy)
  const angle = dist === 0 ? 0 : (Math.atan2(oy, ox) * 180) / Math.PI
  setShapeShadow(shape, {
    color,
    ...(hex8 ? { opacity: parseInt(hex8[2], 16) / 255 } : {}),
    blurEmu: toEmu(blur) as unknown as number,
    offsetEmu: toEmu(dist) as unknown as number,
    angleDeg: Math.round(angle),
    alignment: 'ctr'
  })
}

/** Common element geometry: bounds (required), rotation, flip, opacity. */
function applyCommonGeometry(
  shape: SlideShapeData,
  element: ElementBase,
  ctx: BuildContext,
  where: string
): void {
  if (Array.isArray(element.bounds) && element.bounds.length === 4) {
    const [x, y, w, h] = element.bounds
    setShapeBounds(shape, { x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) })
  }
  if (typeof element.rotation === 'number' && element.rotation !== 0) setShapeRotation(shape, element.rotation)
  if (Array.isArray(element.flip) && (element.flip[0] || element.flip[1])) {
    setShapeFlip(shape, { horizontal: element.flip[0] === true, vertical: element.flip[1] === true })
  }
  if (typeof element.opacity === 'number' && element.opacity < 1) {
    applyElementOpacity(shape, Math.max(0, element.opacity), ctx, where)
  }
  renameShape(shape, element.elementId)
}

/**
 * OOXML has no element-level opacity: alpha lives on each paint (picture,
 * solid fill, gradient stops, outline, run colour). Text runs are handled in
 * buildText; this writes the shape-level paints and reports what it skipped.
 */
function applyElementOpacity(shape: SlideShapeData, opacity: number, ctx: BuildContext, where: string): void {
  const skipped: string[] = []
  let picture = false
  try {
    picture = hasShapeImage(shape)
  } catch {
    picture = false
  }
  if (picture) {
    try {
      setShapeImageOpacity(shape, opacity)
    } catch {
      skipped.push('图片')
    }
  }
  try {
    const fill = getShapeFill(shape)
    if (fill.kind === 'solid') {
      setShapeFill(shape, { opacity: (getShapeFillOpacity(shape) ?? 1) * opacity })
    } else if (fill.kind === 'gradient') {
      const gradient = getShapeGradientFill(shape)
      if (gradient) {
        setShapeGradientFill(shape, {
          ...gradient,
          stops: gradient.stops.map(({ resolvedColor: _resolved, ...stop }) => ({
            ...stop,
            color: stop.color as Color,
            opacity: (stop.opacity ?? 1) * opacity
          }))
        })
      } else {
        skipped.push('渐变填充')
      }
    } else if (fill.kind === 'pattern' || (fill.kind === 'image' && !picture)) {
      skipped.push(fill.kind === 'pattern' ? '图案填充' : '图片填充')
    }
  } catch {
    skipped.push('填充')
  }
  try {
    const stroke = getShapeStroke(shape)
    if (stroke.kind === 'solid') setShapeStroke(shape, { opacity })
    else if (stroke.kind === 'gradient') skipped.push('渐变描边')
  } catch {
    skipped.push('描边')
  }
  if (skipped.length > 0) {
    ctx.warnings.push(`${where}：opacity 无法写入${skipped.join('、')}，这些部分保持不透明`)
  }
}

/** Adds an alpha transform to every run that carries an explicit colour. */
function applyRunOpacity(specs: ParagraphSpec[], opacity: number): number {
  let uncoloured = 0
  for (const spec of specs) {
    for (const run of spec.runs) {
      const format = run.format as TextFormat | undefined
      if (!format || format.color === undefined || format.color === null) {
        uncoloured += 1
        continue
      }
      const transforms = (format.colorTransforms ?? []).filter((t) => t.kind !== 'alpha')
      ;(run as { format?: TextFormat }).format = { ...format, colorTransforms: [...transforms, { kind: 'alpha', value: opacity }] }
    }
  }
  return uncoloured
}

/* ------------------------------------------------------------------ *
 * Elements
 * ------------------------------------------------------------------ */

async function preloadImageBytes(src: unknown, ctx: BuildContext, where: string): Promise<Uint8Array | null> {
  if (typeof src !== 'string' || src === '') return null
  try {
    return await ctx.loadMedia(src)
  } catch (err) {
    ctx.warnings.push(`${where}：素材加载失败 ${src}：${(err as Error).message}`)
    return null
  }
}

function buildText(
  slide: SlideData,
  element: Record<string, unknown>,
  resolver: ThemeResolver,
  theme: Theme | undefined,
  ctx: BuildContext,
  fonts: Set<string>
): SlideShapeData | null {
  const where = `元素 ${String(element.elementId)}`
  const content = (element.content ?? {}) as Record<string, unknown>
  const base = resolveContent(content, theme, resolver, fonts, ctx.warnings, where)
  const [x, y, w, h] = (element.bounds as number[]) ?? [0, 0, 100, 20]
  const text = typeof content.text === 'string' ? content.text : ''
  if (/\\\(([\s\S]*?)\\\)/.test(text)) {
    ctx.warnings.push(`${where}：LaTeX 公式在 TS 导出链路暂不支持，已按纯文本保留`)
  }
  const parsed = parseRichText(text)
  ctx.warnings.push(...parsed.warnings.map((m) => `${where}：${m}`))

  const shape = addSlideTextBox(slide, { x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h), text: '' })
  const specs = richRunsToSpecs(parsed.paragraphs, base, resolver, fonts)
  if (typeof element.opacity === 'number' && element.opacity < 1) {
    const uncoloured = applyRunOpacity(specs, Math.max(0, element.opacity))
    if (uncoloured > 0) {
      ctx.warnings.push(`${where}：${uncoloured} 段文字未指定颜色，opacity 无法写入，按不透明导出`)
    }
  }
  setShapeParagraphs(shape, specs)
  writeLineBreaks({ shape }, specs)
  applyParagraphMetrics(shape, parsed.paragraphs, base)
  applyParagraphBullets(shape, parsed.paragraphs)
  // marginTop → per-paragraph space-before is not exposed by the library's
  // public API; approximate with paragraph line spacing already applied and
  // record the degradation once.
  if (base.marginTop !== undefined && base.marginTop > 0) {
    ctx.warnings.push(`${where}：marginTop（段前距）暂不支持，已忽略`)
  }
  applyTextBodyProps(shape, base, ctx.warnings, where)
  applyCommonGeometry(shape, element as ElementBase, ctx, where)
  return shape
}

function buildShape(
  slide: SlideData,
  element: Record<string, unknown>,
  resolver: ThemeResolver,
  ctx: BuildContext
): SlideShapeData | null {
  const where = `元素 ${String(element.elementId)}`
  const shapeName = typeof element.shapeName === 'string' ? element.shapeName : 'rect'
  const [x, y, w, h] = (element.bounds as number[]) ?? [0, 0, 100, 100]
  const shape = addSlideShape(slide, { preset: shapeName === 'custom' ? 'rect' : shapeName, x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) })

  if (shapeName === 'custom') {
    const viewBox = element.viewBox as [number, number] | undefined
    const pathData = element.path as string | undefined
    if (viewBox && pathData) {
      const geometry = svgPathToCustomGeometry(pathData, viewBox, ctx, where)
      if (geometry) {
        try {
          setShapeCustomGeometry(shape, geometry)
        } catch (err) {
          ctx.warnings.push(`${where}：自定义几何写入失败：${(err as Error).message}`)
        }
      }
    } else {
      ctx.warnings.push(`${where}：custom 形状缺 viewBox/path，已按 rect 处理`)
    }
  } else if (Array.isArray(element.adjustments) && element.adjustments.length > 0) {
    // PPTD adjustments 按 OOXML 参数序；guide 名（adj / adj1… / hf、vf…）取自预设定义表。
    const names = PRESET_ADJUST_GUIDES[shapeName]?.map(([name]) => name)
    if (!names) {
      ctx.warnings.push(`${where}：形状 ${shapeName} 没有可调参数，adjustments 已忽略`)
    } else {
      const values: Record<string, number> = {}
      element.adjustments.slice(0, names.length).forEach((v, i) => {
        if (typeof v === 'number' && Number.isFinite(v)) values[names[i]] = Math.round(v)
      })
      if (element.adjustments.length > names.length) {
        ctx.warnings.push(`${where}：形状 ${shapeName} 只有 ${names.length} 个调整值，多余的已忽略`)
      }
      try {
        setShapeAdjustValues(shape, values)
      } catch (err) {
        ctx.warnings.push(`${where}：调整值写入失败：${(err as Error).message}`)
      }
    }
  }

  applyFill(shape, element.fill as Record<string, unknown> | undefined, resolver, ctx, where)
  applyBorder(shape, element.border as Record<string, unknown> | undefined, resolver)
  applyShadow(shape, element.shadow as Record<string, unknown> | undefined, resolver)
  applyCommonGeometry(shape, element as ElementBase, ctx, where)
  return shape
}

function buildPlaceholder(
  slide: SlideData,
  element: Record<string, unknown>,
  resolver: ThemeResolver,
  ctx: BuildContext,
  fonts: Set<string>
): SlideShapeData | null {
  const where = `占位元素 ${String(element.elementId)}`
  const shapeName = typeof element.shapeName === 'string' ? element.shapeName : 'rect'
  const [x, y, w, h] = (element.bounds as number[]) ?? [0, 0, 100, 100]
  const shape = addSlideShape(slide, { preset: shapeName, x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) })

  const fill = (element.fill as Record<string, unknown> | undefined) ?? { type: 'solid', color: '#E5E7EB' }
  applyFill(shape, fill, resolver, ctx, where)
  const border = (element.border as Record<string, unknown> | undefined) ?? { style: 'dash', width: 1, color: '#9CA3AF' }
  applyBorder(shape, border, resolver)

  const originalType = typeof element.originalType === 'string' ? element.originalType : 'unknown'
  const label = typeof element.label === 'string' ? element.label : PLACEHOLDER_DEFAULT_LABELS[originalType] ?? PLACEHOLDER_DEFAULT_LABELS.unknown
  const labelStyle = (element.labelStyle ?? {}) as Record<string, unknown>
  const fontSize = typeof labelStyle.fontSize === 'number' ? labelStyle.fontSize : 14
  // 默认标签色 #4B5563：对默认底 #E5E7EB 对比度约 6.1:1，过 WCAG AA 4.5:1
  const color = resolver.color(labelStyle.color) ?? ('#4B5563' as Color)
  const alignPair: [string, string] = Array.isArray(labelStyle.align) ? (labelStyle.align as [string, string]) : ['center', 'middle']

  // Text-body properties come first on purpose: `addSlideShape` gives an
  // autoshape no `<p:txBody>`, and the library only creates one through
  // setShapeTextAnchor / setShapeTextWrap (its internal ensureTxBody) — calling
  // setShapeParagraphs first throws `shape "…" has no <p:txBody>` and the whole
  // placeholder (label included) is dropped from the export.
  applyTextBodyProps(
    shape,
    { align: alignPair, wrap: true, font: {} },
    ctx.warnings,
    where
  )
  setShapeParagraphs(shape, [
    {
      align: ALIGN_MAP[alignPair[0]] ?? 'center',
      runs: [{ text: label, format: { size: fontSize, color } }]
    }
  ])
  applyCommonGeometry(shape, element as ElementBase, ctx, where)
  return shape
}

function buildImage(
  slide: SlideData,
  element: Record<string, unknown>,
  resolver: ThemeResolver,
  ctx: BuildContext,
  bytes: Uint8Array | null
): SlideShapeData | null {
  const where = `元素 ${String(element.elementId)}`
  const [x, y, w, h] = (element.bounds as number[]) ?? [0, 0, 100, 100]
  if (!bytes) {
    ctx.warnings.push(`${where}：图片素材不可用，落为灰底占位`)
    return buildPlaceholder(
      slide,
      {
        ...element,
        originalType: 'unknown',
        label: `图片缺失：${String(element.src)}`
      },
      resolver,
      ctx,
      new Set()
    )
  }
  const fit = (element.fit as { mode?: string } | undefined)?.mode
  const engineFit = fit === 'contain' ? 'contain' : 'fill'
  if (fit === 'cover' || fit === undefined) {
    // cover ≈ fill unless crop given; cover needs intrinsic size the library
    // only reads for PNG/JPEG — approximate with fill + crop.
  }
  const shape = addSlideImage(slide, bytes, { x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h), fit: engineFit })
  const crop = element.crop as { left?: number; top?: number; right?: number; bottom?: number } | undefined
  if (crop) {
    setShapeImageCrop(shape, {
      left: crop.left ?? 0,
      top: crop.top ?? 0,
      right: crop.right ?? 0,
      bottom: crop.bottom ?? 0
    })
  }
  const cropShape = element.cropShape as Record<string, unknown> | undefined
  if (cropShape && typeof cropShape.shapeName === 'string' && cropShape.shapeName !== 'rect') {
    if (cropShape.shapeName === 'custom') {
      ctx.warnings.push(`${where}：cropShape custom 暂不支持，已按矩形裁剪`)
    } else {
      try {
        setShapePreset(shape, cropShape.shapeName as never)
      } catch {
        ctx.warnings.push(`${where}：cropShape ${String(cropShape.shapeName)} 不是合法预设形状`)
      }
    }
  }
  if (typeof element.opacity === 'number' && element.opacity < 1) {
    try {
      setShapeImageOpacity(shape, Math.max(0, Math.min(1, element.opacity)))
    } catch {
      ctx.warnings.push(`${where}：图片透明度设置失败`)
    }
  }
  applyBorder(shape, element.border as Record<string, unknown> | undefined, resolver)
  applyShadow(shape, element.shadow as Record<string, unknown> | undefined, resolver)
  applyCommonGeometry(shape, element as ElementBase, ctx, where)
  return shape
}

function buildLine(
  slide: SlideData,
  element: Record<string, unknown>,
  resolver: ThemeResolver,
  ctx: BuildContext
): SlideShapeData | null {
  const where = `元素 ${String(element.elementId)}`
  const pointsRaw = typeof element.points === 'string' ? element.points : ''
  const pts = pointsRaw
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((p) => p.length === 2 && p.every(Number.isFinite))
  if (pts.length < 2) {
    ctx.warnings.push(`${where}：line 至少需要 2 个点，已跳过`)
    return null
  }
  const viewBox = (element.viewBox as [number, number] | undefined) ?? [100, 100]
  const [x, y, w, h] = (element.bounds as number[]) ?? [0, 0, viewBox[0], viewBox[1]]
  const sx = w / (viewBox[0] || 1)
  const sy = h / (viewBox[1] || 1)
  const first = pts[0]
  const last = pts[pts.length - 1]
  const shape = addSlideLine(slide, {
    from: { x: toEmu(x + first[0] * sx), y: toEmu(y + first[1] * sy) },
    to: { x: toEmu(x + last[0] * sx), y: toEmu(y + last[1] * sy) }
  })
  if (pts.length > 2) {
    ctx.warnings.push(`${where}：多段/曲线 line 暂以首尾直线近似（${pts.length} 点 → 2 点）`)
  }
  const border = element.border as Record<string, unknown> | undefined
  if (border) applyBorder(shape, border, resolver)
  const arrows = Array.isArray(element.arrow) ? (element.arrow as Array<string | null>) : null
  if (arrows) {
    // PPTD ArrowType = arrow|stealth|diamond|oval; engine LineEndType is a
    // superset (adds 'triangle' | 'none'). PPTD 'arrow' = OOXML 'triangle'.
    const map: Record<string, LineEndType> = { arrow: 'triangle', stealth: 'stealth', diamond: 'diamond', oval: 'oval' }
    const [head, tail] = [arrows[0] ?? null, arrows[1] ?? null]
    if (head && map[head]) setShapeStrokeArrow(shape, 'head', { type: map[head] })
    if (tail && map[tail]) setShapeStrokeArrow(shape, 'tail', { type: map[tail] })
  }
  applyShadow(shape, element.shadow as Record<string, unknown> | undefined, resolver)
  applyCommonGeometry(shape, element as ElementBase, ctx, where)
  return shape
}

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */

interface CellData {
  text?: string
  textStyle?: string
  rowSpan?: number
  colSpan?: number
  fill?: Record<string, unknown>
  border?: unknown
  align?: [string, string]
  [key: string]: unknown
}

function buildTable(
  slide: SlideData,
  element: Record<string, unknown>,
  resolver: ThemeResolver,
  theme: Theme | undefined,
  ctx: BuildContext,
  fonts: Set<string>
): SlideShapeData | null {
  const where = `元素 ${String(element.elementId)}`
  const rowsRaw = Array.isArray(element.rows) ? (element.rows as CellData[][]) : []
  if (rowsRaw.length === 0) {
    ctx.warnings.push(`${where}：表格无行，已跳过`)
    return null
  }
  const columnWidths = Array.isArray(element.columnWidths) ? (element.columnWidths as number[]) : null
  const rowHeights = Array.isArray(element.rowHeights) ? (element.rowHeights as number[]) : null
  const cols = columnWidths?.length ?? Math.max(...rowsRaw.map((r) => r.length))
  const [x, y, w, h] = (element.bounds as number[]) ?? [0, 0, 400, 200]

  const tableStyle = resolveTableStyle(element.style, theme)
  const placed = placeTableCells(rowsRaw, cols, ctx, where)

  const shape = addSlideTable(slide, {
    x: toEmu(x),
    y: toEmu(y),
    w: toEmu(w),
    h: toEmu(h),
    rows: placed.grid.map((row) => row.map((cell) => cellTextOf(cell))),
    colWidths: (columnWidths ?? new Array(cols).fill(1 / cols)).map((f) => toEmu(w * f)),
    rowHeights: (rowHeights ?? new Array(rowsRaw.length).fill(1 / rowsRaw.length)).map((f) => toEmu(h * f)),
    firstRow: tableStyle?.firstRowStyle !== undefined,
    bandRow: tableStyle?.bandRow === true
  })
  // PPTD 表格样式全部按单元格显式写出；OOXML 表格样式必须是「无样式、无网格」，
  // 否则 PowerPoint / WPS 会把内置样式的白色网格线与填充叠到未写线条的边上。
  setTableStyleId(shape, 'No Style, No Grid')

  applyTableCells(shape, placed, tableStyle, resolver, theme, ctx, fonts, where)
  // Native tables cannot rotate (spec §6.6): geometry is applied without rotation.
  const { rotation, ...unrotated } = element as ElementBase
  applyCommonGeometry(shape, unrotated as ElementBase, ctx, where)
  if (typeof rotation === 'number' && rotation !== 0) {
    ctx.warnings.push(`${where}：PPT 原生表格不支持旋转，已忽略 rotation`)
  }
  return shape
}

function cellTextOf(cell: CellData | null | undefined): string {
  if (!cell) return ''
  return typeof cell.text === 'string' ? cell.text : ''
}

interface ResolvedTableStyle {
  firstRowStyle?: Record<string, unknown>
  lastRowStyle?: Record<string, unknown>
  firstColumnStyle?: Record<string, unknown>
  lastColumnStyle?: Record<string, unknown>
  bodyStyles?: Array<Record<string, unknown>>
  cellStyle?: Record<string, unknown>
  rowOverColumn?: boolean
  bandRow?: boolean
}

function resolveTableStyle(style: unknown, theme: Theme | undefined): ResolvedTableStyle | null {
  if (typeof style === 'string' && style.startsWith('$')) {
    const hit = theme?.tableStyles?.[style.slice(1)]
    return (hit as ResolvedTableStyle | undefined) ?? null
  }
  if (style && typeof style === 'object') return style as ResolvedTableStyle
  return null
}

interface PlacedTable {
  /** Full rows × cols grid; covered positions are null. */
  grid: Array<Array<CellData | null>>
  /** Authored cells with their grid position, in reading order. */
  cells: Array<{ r: number; c: number; cell: CellData }>
  cols: number
}

/**
 * `rows` omits cells covered by a merge (spec §6.6), so a cell's grid column
 * is the next column its row has not yet filled or had covered from above.
 */
function placeTableCells(rows: CellData[][], cols: number, ctx: BuildContext, where: string): PlacedTable {
  const grid: Array<Array<CellData | null>> = rows.map(() => new Array<CellData | null>(cols).fill(null))
  const occupied = rows.map(() => new Array<boolean>(cols).fill(false))
  const cells: PlacedTable['cells'] = []
  let overflow = 0
  rows.forEach((row, r) => {
    let c = 0
    for (const cell of row) {
      while (c < cols && occupied[r][c]) c += 1
      if (c >= cols) {
        overflow += 1
        continue
      }
      const rowSpan = Math.max(1, Math.min(cell?.rowSpan ?? 1, rows.length - r))
      const colSpan = Math.max(1, Math.min(cell?.colSpan ?? 1, cols - c))
      for (let dr = 0; dr < rowSpan; dr++) for (let dc = 0; dc < colSpan; dc++) occupied[r + dr][c + dc] = true
      const normalized = cell ? { ...cell, rowSpan, colSpan } : ({ text: '' } as CellData)
      grid[r][c] = normalized
      cells.push({ r, c, cell: normalized })
      c += colSpan
    }
  })
  if (overflow > 0) {
    ctx.warnings.push(`${where}：${overflow} 个单元格超出列数（被合并覆盖的格须从 rows 省略），已忽略`)
  }
  return { grid, cells, cols }
}

function applyTableCells(
  table: SlideShapeData,
  placed: PlacedTable,
  style: ResolvedTableStyle | null,
  resolver: ThemeResolver,
  theme: Theme | undefined,
  ctx: BuildContext,
  fonts: Set<string>,
  where: string
): void {
  for (const { r, c, cell } of placed.cells) {
    if ((cell.rowSpan ?? 1) > 1 || (cell.colSpan ?? 1) > 1) {
      const merge = { row: r, col: c, rowSpan: cell.rowSpan ?? 1, colSpan: cell.colSpan ?? 1 }
      try {
        mergeTableCells(table, merge, { coveredText: 'keep' })
      } catch (err) {
        ctx.warnings.push(`${where}：合并单元格 (${r},${c}) 失败：${(err as Error).message}`)
      }
    }
  }

  const lastRow = placed.grid.length - 1
  const lastCol = placed.cols - 1
  for (const { r, c, cell } of placed.cells) {
    const handle = getTableCell(table, r, c)

    // Style chain (9 levels): category styles → cellStyle → bodyStyles → inline
    const category = categoryStyleOf(style, r, c, lastRow, lastCol)
    const baseStyle = { ...(style?.cellStyle ?? {}), ...(category ?? {}) }
    const textStyleRef =
      typeof cell.textStyle === 'string' && cell.textStyle.startsWith('$')
        ? (theme?.textStyles?.[cell.textStyle.slice(1)] as Record<string, unknown> | undefined)
        : undefined

    // fill
    const fill = (cell.fill ?? baseStyle.fill) as Record<string, unknown> | undefined
    if (fill && fill.type === 'solid') {
      const color = resolver.color(fill.color)
      if (color) setTableCellFill(handle, color)
    }

    // text paragraphs
    const text = typeof cell.text === 'string' ? cell.text : ''
    // 规格 §1.3.2：textStyle 只取文本字段；单元格 align 默认 [center, middle]。
    const { fill: _tf, border: _tb, align: _ta, ...textOnly } = textStyleRef ?? {}
    const merged: Record<string, unknown> = { align: CELL_DEFAULT_ALIGN, ...baseStyle, ...textOnly, ...cell }
    const content = resolveContent(merged, theme, resolver, fonts, ctx.warnings, `${where} 单元格(${r},${c})`)
    const parsed = parseRichText(text)
    const specs = richRunsToSpecs(parsed.paragraphs, content, resolver, fonts)
    setTableCellParagraphs(handle, specs)
    writeLineBreaks({ cell: handle }, specs)
    applyParagraphBullets(handle, parsed.paragraphs)
    const anchor = (content.align[1] ?? 'middle') as string
    setTableCellAnchor(handle, anchor === 'top' ? 'top' : anchor === 'bottom' ? 'bottom' : 'center')

    // borders
    applyCellBorders(handle, cell.border ?? baseStyle.border, resolver, ctx, `${where} 单元格(${r},${c})`)
  }
}

function categoryStyleOf(
  style: ResolvedTableStyle | null,
  r: number,
  c: number,
  lastRow: number,
  lastCol: number
): Record<string, unknown> | null {
  if (!style) return null
  const bodyStyle = r > 0 ? style.bodyStyles?.[(r - 1) % (style.bodyStyles.length || 1)] : undefined
  const rowStyle = r === 0
    ? style.firstRowStyle
    : r === lastRow && style.lastRowStyle !== undefined
      ? style.lastRowStyle
      : bodyStyle
  const colStyle = c === 0 ? style.firstColumnStyle : c === lastCol ? style.lastColumnStyle : null
  const rowOverColumn = style.rowOverColumn !== false
  const merged: Record<string, unknown> = rowOverColumn
    ? { ...(colStyle ?? {}), ...(rowStyle ?? {}) }
    : { ...(rowStyle ?? {}), ...(colStyle ?? {}) }
  return Object.keys(merged).length > 0 ? merged : null
}

/** 规格 §1.3.2 单元格默认对齐。 */
const CELL_DEFAULT_ALIGN: [string, string] = ['center', 'middle']

/** 规格 §1.3.2 单元格默认边框；BorderSpec 里写 null 的边无线。 */
const DEFAULT_CELL_BORDER = { style: 'solid', width: 1, color: '#000000' } as const

function applyCellBorders(
  handle: unknown,
  spec: unknown,
  resolver: ThemeResolver,
  ctx: BuildContext,
  where: string
): void {
  const cell = handle as Parameters<typeof setTableCellBorders>[0]
  if (spec === null) {
    setTableCellBorders(cell, null)
    return
  }
  const one = (side: unknown): { color: string; widthEmu: number; dash: string } | null => {
    const b = side === undefined ? DEFAULT_CELL_BORDER : side
    if (!b || typeof b !== 'object') return null
    const rec = b as Record<string, unknown>
    const color = resolver.color(rec.color) ?? ('#000000' as Color)
    const width = typeof rec.width === 'number' ? rec.width : 1
    const dash = rec.style === 'dash' ? 'dash' : rec.style === 'dot' ? 'sysDot' : 'solid'
    return { color: String(color), widthEmu: toEmu(width) as unknown as number, dash }
  }
  try {
    if (Array.isArray(spec)) {
      const [tb, lr, b2, l2] = [spec[0], spec[1], spec[2], spec[3]]
      if (spec.length === 2) {
        setTableCellBorders(cell, { top: one(tb), bottom: one(tb), left: one(lr), right: one(lr) })
      } else if (spec.length === 4) {
        setTableCellBorders(cell, { top: one(tb), right: one(lr), bottom: one(b2), left: one(l2) })
      } else {
        ctx.warnings.push(`${where}：BorderSpec 数组长度须为 2 或 4`)
      }
    } else {
      const b = one(spec)
      setTableCellBorders(cell, { top: b, right: b, bottom: b, left: b })
    }
  } catch (err) {
    ctx.warnings.push(`${where}：单元格边框设置失败：${(err as Error).message}`)
  }
}

/* ------------------------------------------------------------------ *
 * Chart (minimal: bar/column/line/area/pie via ComboChartSpec / PieChartSpec)
 * ------------------------------------------------------------------ */

function buildChart(
  slide: SlideData,
  element: Record<string, unknown>,
  resolver: ThemeResolver,
  ctx: BuildContext
): SlideShapeData | null {
  const where = `元素 ${String(element.elementId)}`
  const data = element.data as { cols?: string[]; rows?: Array<Array<number | string | null>> } | undefined
  const series = Array.isArray(element.series) ? (element.series as Array<Record<string, unknown>>) : []
  if (!data?.cols || !Array.isArray(data.rows) || series.length === 0) {
    ctx.warnings.push(`${where}：图表缺 data/series，已跳过`)
    return null
  }
  const [x, y, w, h] = (element.bounds as number[]) ?? [0, 0, 400, 300]

  const supported = new Set(['bar', 'line', 'area', 'pie'])
  const firstType = String(series[0]?.type ?? '')
  if (!supported.has(firstType)) {
    ctx.warnings.push(`${where}：图表类型 ${firstType} 暂不支持（最小集只覆盖 bar/line/area/pie），落为占位`)
    return buildPlaceholder(slide, { ...element, originalType: 'chart' }, resolver, ctx, new Set())
  }

  const spec = chartSpecOf(element, data as { cols: string[]; rows: Array<Array<number | string | null>> }, series, resolver, ctx, where)
  if (!spec) return null
  const shape = addSlideChart(slide, { spec: spec as ChartSpec, x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) })
  applyCommonGeometry(shape, element as ElementBase, ctx, where)
  return shape
}

function chartRecordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function chartTextStyleOf(value: unknown, resolver: ThemeResolver): Record<string, unknown> | undefined {
  const style = chartRecordOf(value)
  const out: Record<string, unknown> = {}
  if (typeof style.fontFamily === 'string') out.font = style.fontFamily
  if (typeof style.fontSize === 'number' && Number.isFinite(style.fontSize)) out.sizePt = style.fontSize
  if (typeof style.color === 'string') {
    const color = resolver.color(style.color)
    if (color !== undefined) out.color = String(color)
  }
  return Object.keys(out).length ? out : undefined
}

function chartDataLabelsOf(
  chartValue: unknown,
  seriesValue: unknown,
  resolver: ThemeResolver
): Record<string, unknown> | undefined {
  const chart = chartRecordOf(chartValue)
  const series = chartRecordOf(seriesValue)
  if (!Object.keys(chart).length && !Object.keys(series).length) return undefined
  const config = { ...chart, ...series }
  const show = config.show === true
  const content = config.content
  const out: Record<string, unknown> = {
    showValue: show && (content === undefined || content === 'value'),
    showCategory: show && content === 'category',
    showSeriesName: false,
    showPercent: show && content === 'percentage',
  }
  if (typeof config.numberFormat === 'string') out.numberFormat = config.numberFormat
  const textStyle = chartTextStyleOf(config, resolver)
  if (textStyle) out.textStyle = textStyle
  return out
}

function applyCartesianChartOptions(
  spec: Record<string, unknown>,
  element: Record<string, unknown>,
  series: Array<Record<string, unknown>>,
  horizontal: boolean,
  resolver: ThemeResolver
): void {
  const categoryAxis = chartRecordOf(horizontal ? element.yAxis : element.xAxis)
  const valueAxis = chartRecordOf(horizontal ? element.xAxis : element.yAxis)
  const valueLabel = chartRecordOf(valueAxis.label)
  const scaling: Record<string, unknown> = {}
  if (typeof valueAxis.min === 'number' && Number.isFinite(valueAxis.min)) scaling.min = valueAxis.min
  if (typeof valueAxis.max === 'number' && Number.isFinite(valueAxis.max)) scaling.max = valueAxis.max
  if (typeof valueLabel.numberFormat === 'string') scaling.numberFormat = valueLabel.numberFormat
  if (Object.keys(scaling).length) spec.valueAxis = scaling

  if (categoryAxis.show === false) spec.categoryAxisHidden = true
  if (valueAxis.show === false) spec.valueAxisHidden = true
  if (categoryAxis.label === false) spec.categoryAxisTickLabelPos = 'none'
  if (valueAxis.label === false) spec.valueAxisTickLabelPos = 'none'
  if (categoryAxis.axisLine === false) spec.categoryAxisLineHidden = true
  if (valueAxis.axisLine === false) spec.valueAxisLineHidden = true
  if (categoryAxis.gridLine === false) spec.categoryAxisMajorGridlines = false
  if (valueAxis.gridLine === false) spec.valueAxisMajorGridlines = false

  const categoryLabelStyle = chartTextStyleOf(categoryAxis.label, resolver)
  const valueLabelStyle = chartTextStyleOf(valueAxis.label, resolver)
  if (categoryLabelStyle) spec.categoryAxisLabelStyle = categoryLabelStyle
  if (valueLabelStyle) spec.valueAxisLabelStyle = valueLabelStyle
  if (horizontal || categoryAxis.reverse === true) {
    spec.categoryAxisOrientation = horizontal
      ? (categoryAxis.reverse === true ? 'minMax' : 'maxMin')
      : 'maxMin'
  }
  if (valueAxis.reverse === true) spec.valueAxisOrientation = 'maxMin'

  const legend = element.legend
  if (legend === false || chartRecordOf(legend).show === false) spec.legend = { position: null }

  const stack = series.find((item) => item.type === 'bar' && (item.stack === 'value' || item.stack === 'percent'))?.stack
  if (stack) {
    spec.grouping = stack === 'percent' ? 'percentStacked' : 'stacked'
    spec.overlapPct = 100
  }
  const barWidth = element.barWidth
  if (typeof barWidth === 'number' && Number.isFinite(barWidth) && barWidth > 0 && barWidth <= 1) {
    spec.gapWidthPct = Math.round((1 - barWidth) / barWidth * 100)
  }

  const dataLabels = chartDataLabelsOf(element.dataLabels, undefined, resolver)
  if (dataLabels) spec.dataLabels = dataLabels
}

function chartSpecOf(
  element: Record<string, unknown>,
  data: { cols: string[]; rows: Array<Array<number | string | null>> },
  series: Array<Record<string, unknown>>,
  resolver: ThemeResolver,
  ctx: BuildContext,
  where: string
): unknown {
  const cols = data.cols
  const colIndex = (name: unknown): number => (typeof name === 'string' ? cols.indexOf(name) : -1)

  const firstType = String(series[0]?.type ?? '')
  if (firstType === 'pie') {
    const s0 = series[0]
    const encode = (s0.encode ?? {}) as Record<string, unknown>
    const catIdx = colIndex(encode.category)
    const valIdx = colIndex(encode.value)
    if (catIdx < 0 || valIdx < 0) {
      ctx.warnings.push(`${where}：pie 图表 encode.category/value 未命中 data.cols`)
      return null
    }
    const innerRadius = typeof s0.innerRadius === 'number' ? s0.innerRadius : 0
    const fills = Array.isArray(s0.fill) ? s0.fill : typeof s0.fill === 'string' ? [s0.fill] : []
    const pointColors = fills.length > 0
      ? data.rows.map((_r, i) => (resolver.color(fills[i % fills.length]) as string | undefined) ?? null)
      : undefined
    const pieLabels = chartDataLabelsOf(element.dataLabels, s0.dataLabels, resolver)
    return {
      ...(pieLabels ? { dataLabels: pieLabels } : {}),
      kind: innerRadius > 0 ? 'doughnut' : 'pie',
      categories: data.rows.map((r) => String(r[catIdx] ?? '')),
      ...(innerRadius > 0 ? { holeSizePct: Math.round(Math.min(0.9, innerRadius) * 100) } : {}),
      ...(typeof s0.startAngle === 'number' ? { firstSliceAngleDeg: ((Math.round(s0.startAngle) % 360) + 360) % 360 } : {}),
      series: [
        {
          name: typeof s0.name === 'string' ? s0.name : String(encode.value ?? ''),
          values: data.rows.map((r) => numOrNull(r[valIdx])),
          ...(pointColors && pointColors.some((c) => c !== null) ? { pointColors } : {})
        }
      ]
    }
  }

  const horizontal = firstType === 'bar' && chartRecordOf(element.yAxis).type === 'category'
  const kind = firstType === 'bar' ? (horizontal ? 'bar' : 'column') : firstType
  const mappedSeries = series.map((s) => {
    const encode = (s.encode ?? {}) as Record<string, unknown>
    const xIdx = colIndex(encode.x)
    const yIdx = colIndex(encode.y)
    if (xIdx < 0 || yIdx < 0) {
      ctx.warnings.push(`${where}：系列 ${String(s.name ?? '?')} 的 encode 未命中 data.cols`)
      return null
    }
    const valueIdx = horizontal ? xIdx : yIdx
    const categoryIdx = horizontal ? yIdx : xIdx
    const out: Record<string, unknown> = {
      name: typeof s.name === 'string' ? s.name : String((horizontal ? encode.x : encode.y) ?? ''),
      values: data.rows.map((r) => numOrNull(r[valueIdx]))
    }
    const fill = typeof s.fill === 'string' ? resolver.color(s.fill) : undefined
    if (fill !== undefined) out.color = String(fill)
    if (firstType === 'line' || firstType === 'area') out.chartKind = firstType
    if (s.dataLabels !== undefined) {
      const dataLabels = chartDataLabelsOf(element.dataLabels, s.dataLabels, resolver)
      if (dataLabels) out.dataLabels = dataLabels
    }
    return { out, categoryIdx }
  })
  if (mappedSeries.some((s) => s === null)) return null
  const categoryIdx = mappedSeries[0]!.categoryIdx
  const spec: Record<string, unknown> = {
    kind,
    categories: data.rows.map((r) => String(r[categoryIdx] ?? '')),
    series: mappedSeries.map((s) => s!.out)
  }
  applyCartesianChartOptions(spec, element, series, horizontal, resolver)
  return spec
}

function numOrNull(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

/* ------------------------------------------------------------------ *
 * SVG path → CustomGeometryInput (custom shapes, spec §5 Shape.custom)
 * ------------------------------------------------------------------ */

const PATH_SCALE = 1000

function svgPathToCustomGeometry(
  path: string,
  viewBox: [number, number],
  ctx: BuildContext,
  where: string
): CustomGeometryInput | null {
  const tokens = path.match(/[MmLlHhVvCcSsQqZzAa]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g)
  if (!tokens) return null
  // CustomGeometryInput.paths — each path carries its own w/h (viewBox space).
  const paths: CustomGeometryInput['paths'][number][] = []
  let commands: GeomCommand[] = []
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0
  // Second control point of the previous C/S segment, for S reflection.
  let lastCubic: { x: number; y: number } | null = null
  let nextCubic: { x: number; y: number } | null = null
  let i = 0
  let cmd = ''
  const num = () => Number(tokens[i++])
  const pushMove = (x: number, y: number) => commands.push({ kind: 'moveTo', pt: { x, y } })
  const pushLine = (x: number, y: number) => commands.push({ kind: 'lnTo', pt: { x, y } })
  const pushCubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) =>
    commands.push({ kind: 'cubicBezTo', pts: [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x, y }] })
  // DrawingML 路径坐标是整数：按 PATH_SCALE 放大 viewBox 与全部点，保住小数精度。
  const scalePt = (p: { x: number; y: number }) => ({ x: Math.round(p.x * PATH_SCALE), y: Math.round(p.y * PATH_SCALE) })
  const flush = () => {
    if (commands.length > 0) {
      const scaled = commands.map((c): GeomCommand => {
        if (c.kind === 'moveTo' || c.kind === 'lnTo') return { kind: c.kind, pt: scalePt(c.pt) }
        if (c.kind === 'cubicBezTo') return { kind: 'cubicBezTo', pts: [scalePt(c.pts[0]), scalePt(c.pts[1]), scalePt(c.pts[2])] }
        return c
      })
      paths.push({ w: Math.round(viewBox[0] * PATH_SCALE), h: Math.round(viewBox[1] * PATH_SCALE), commands: scaled })
    }
    commands = []
  }

  while (i < tokens.length) {
    const t = tokens[i]
    if (/^[A-Za-z]$/.test(t)) {
      cmd = t
      i++
      if (cmd === 'Z' || cmd === 'z') {
        commands.push({ kind: 'close' })
        cx = startX
        cy = startY
        lastCubic = null
        continue
      }
    }
    const rel = cmd === cmd.toLowerCase()
    const op = cmd.toUpperCase()
    nextCubic = null
    try {
      if (op === 'M') {
        const x = num()
        const y = num()
        cx = rel ? cx + x : x
        cy = rel ? cy + y : y
        // Subpaths stay in one <a:path>: DrawingML fills a path's subpaths with the
        // even-odd rule, so an inner ring cuts a hole as it does in the icon source.
        pushMove(cx, cy)
        startX = cx
        startY = cy
        cmd = rel ? 'l' : 'L' // implicit lineTo after M
      } else if (op === 'L') {
        const x = num()
        const y = num()
        cx = rel ? cx + x : x
        cy = rel ? cy + y : y
        pushLine(cx, cy)
      } else if (op === 'H') {
        const x = num()
        cx = rel ? cx + x : x
        pushLine(cx, cy)
      } else if (op === 'V') {
        const y = num()
        cy = rel ? cy + y : y
        pushLine(cx, cy)
      } else if (op === 'C') {
        const x1 = num()
        const y1 = num()
        const x2 = num()
        const y2 = num()
        const x = num()
        const y = num()
        const p1 = rel ? { x: cx + x1, y: cy + y1 } : { x: x1, y: y1 }
        const p2 = rel ? { x: cx + x2, y: cy + y2 } : { x: x2, y: y2 }
        const p = rel ? { x: cx + x, y: cy + y } : { x, y }
        pushCubic(p1.x, p1.y, p2.x, p2.y, p.x, p.y)
        cx = p.x
        cy = p.y
        nextCubic = p2
      } else if (op === 'S') {
        const x2 = num()
        const y2 = num()
        const x = num()
        const y = num()
        const p1 = lastCubic ? { x: 2 * cx - lastCubic.x, y: 2 * cy - lastCubic.y } : { x: cx, y: cy }
        const p2 = rel ? { x: cx + x2, y: cy + y2 } : { x: x2, y: y2 }
        const p = rel ? { x: cx + x, y: cy + y } : { x, y }
        pushCubic(p1.x, p1.y, p2.x, p2.y, p.x, p.y)
        cx = p.x
        cy = p.y
        nextCubic = p2
      } else if (op === 'Q') {
        const x1 = num()
        const y1 = num()
        const x = num()
        const y = num()
        const q = rel ? { x: cx + x1, y: cy + y1 } : { x: x1, y: y1 }
        const p = rel ? { x: cx + x, y: cy + y } : { x, y }
        // Quadratic → cubic: both control points sit 2/3 of the way toward q.
        pushCubic(cx + (2 / 3) * (q.x - cx), cy + (2 / 3) * (q.y - cy), p.x + (2 / 3) * (q.x - p.x), p.y + (2 / 3) * (q.y - p.y), p.x, p.y)
        cx = p.x
        cy = p.y
      } else if (op === 'A') {
        const rx = num()
        const ry = num()
        const rot = num()
        const large = num() !== 0
        const sweep = num() !== 0
        const x = num()
        const y = num()
        const p = rel ? { x: cx + x, y: cy + y } : { x, y }
        for (const seg of arcToCubics(cx, cy, rx, ry, rot, large, sweep, p.x, p.y)) pushCubic(...seg)
        cx = p.x
        cy = p.y
      } else {
        break
      }
      lastCubic = nextCubic
    } catch {
      ctx.warnings.push(`${where}：SVG 路径解析中断`)
      break
    }
  }
  flush()
  if (paths.length === 0) return null
  return { paths }
}

type CubicSegment = [number, number, number, number, number, number]

/**
 * SVG elliptical arc (endpoint parameterization, SVG 1.1 Appendix F.6) →
 * cubic Bézier segments of at most 90° each. Out-of-range radii are scaled up
 * per F.6.6; a zero radius degenerates to a straight line.
 */
export function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  rotationDeg: number,
  large: boolean,
  sweep: boolean,
  x2: number,
  y2: number
): CubicSegment[] {
  if (x1 === x2 && y1 === y2) return []
  let rx = Math.abs(rxIn)
  let ry = Math.abs(ryIn)
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]]
  const phi = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const x1p = cos * dx + sin * dy
  const y1p = -sin * dx + cos * dy
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s
    ry *= s
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den))
  const cxp = (coef * rx * y1p) / ry
  const cyp = (-coef * ry * x1p) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    return a
  }
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!sweep && delta > 0) delta -= 2 * Math.PI
  if (sweep && delta < 0) delta += 2 * Math.PI
  const count = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9))
  const step = delta / count
  const k = (4 / 3) * Math.tan(step / 4)
  const point = (t: number) => ({
    x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
    y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos
  })
  const deriv = (t: number) => ({
    x: -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin,
    y: -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos
  })
  const out: CubicSegment[] = []
  for (let n = 0; n < count; n++) {
    const a = theta1 + n * step
    const b = a + step
    const pa = point(a)
    const pb = n === count - 1 ? { x: x2, y: y2 } : point(b)
    const da = deriv(a)
    const db = deriv(b)
    out.push([pa.x + k * da.x, pa.y + k * da.y, pb.x - k * db.x, pb.y - k * db.y, pb.x, pb.y])
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Animations & transitions
 * ------------------------------------------------------------------ */

/**
 * Spec §3.2 `export.transition: "auto"` 的策展词表：逐页轮换，避免 AI 生成
 * 的 deck 页与页之间全是同一种淡入。页级 `Page.transition` 记录（逆向方言）
 * 仍然以页级为准，不受此表影响。
 */
const AUTO_TRANSITION_CURATED: ReadonlyArray<{ effect: string; direction?: string }> = [
  { effect: 'fade' },
  { effect: 'push', direction: 'r' },
  { effect: 'wipe', direction: 'r' }
]

function applyAnimations(
  slide: SlideData,
  page: Page,
  shapes: Map<string, SlideShapeData>,
  animationsMode: 'auto' | 'off',
  ctx: BuildContext,
  pageLabel: string
): { written: number; skipped: number } {
  if (animationsMode === 'off' || !Array.isArray(page.animations)) return { written: 0, skipped: 0 }
  let written = 0
  let skipped = 0
  const triggerMap = { onClick: 'click', withPrevious: 'withPrevious', afterPrevious: 'afterPrevious' } as const
  for (const anim of page.animations as Animation[]) {
    if (anim.effect === null || anim.effect === undefined) {
      skipped++
      ctx.warnings.push(`${pageLabel}：未建模动画步骤（${String(anim.originalEffect ?? 'unknown')}）导出时跳过`)
      continue
    }
    const shape = shapes.get(anim.elementId)
    if (!shape) {
      skipped++
      ctx.warnings.push(`${pageLabel}：动画目标 ${anim.elementId} 未建出形状，跳过`)
      continue
    }
    try {
      setShapeAnimation(shape, {
        effect: anim.effect as never,
        start: triggerMap[anim.trigger ?? 'onClick'],
        ...(anim.durationMs != null ? { durationMs: anim.durationMs } : {}),
        ...(anim.delayMs != null ? { delayMs: anim.delayMs } : {}),
        ...(anim.build !== undefined ? { build: anim.build } : {}),
        ...(anim.direction !== undefined ? { direction: anim.direction as never } : {}),
        ...(anim.orientation !== undefined ? { orientation: anim.orientation as never } : {}),
        ...(anim.inOut !== undefined ? { inOut: anim.inOut as never } : {}),
        ...(anim.shape !== undefined ? { shape: anim.shape as never } : {}),
        ...(anim.spokes !== undefined ? { spokes: anim.spokes } : {}),
        ...(anim.spinDirection !== undefined ? { spinDirection: anim.spinDirection as never } : {}),
        ...(anim.spinDegrees !== undefined ? { spinDegrees: anim.spinDegrees } : {}),
        ...(anim.scaleDirection !== undefined ? { scaleDirection: anim.scaleDirection as never } : {}),
        ...(anim.scalePercent !== undefined ? { scalePercent: anim.scalePercent } : {}),
        ...(anim.transparencyPercent !== undefined ? { transparencyPercent: anim.transparencyPercent } : {}),
        ...(anim.color !== undefined ? { color: animColorOf(anim.color) as never } : {})
      })
      written++
    } catch (err) {
      skipped++
      ctx.warnings.push(`${pageLabel}：动画 ${anim.effect}@${anim.elementId} 写入失败：${(err as Error).message}`)
    }
  }
  return { written, skipped }
}

function animColorOf(color: unknown): unknown {
  if (typeof color === 'string') return color
  if (color && typeof color === 'object' && 'color' in color) {
    const rec = color as { color: unknown; colorTransforms?: unknown }
    return { color: rec.color, ...(Array.isArray(rec.colorTransforms) ? { colorTransforms: rec.colorTransforms as ColorTransform[] } : {}) }
  }
  return undefined
}

function applyTransition(slide: SlideData, transition: PageTransition, ctx: BuildContext, pageLabel: string): boolean {
  if (transition.unmodeled === true) {
    ctx.warnings.push(`${pageLabel}：未建模转场 ${transition.effect}，导出时跳过`)
    return false
  }
  const options: TransitionOptions = {
    effect: transition.effect as never,
    ...(transition.speed !== undefined ? { speed: transition.speed } : {}),
    ...(transition.durationMs !== undefined ? { durationMs: transition.durationMs } : {}),
    ...(transition.direction !== undefined ? { direction: transition.direction } : {}),
    ...(transition.spokes !== undefined ? { spokes: transition.spokes } : {}),
    ...(transition.orientation !== undefined ? { orientation: transition.orientation } : {}),
    ...(transition.thruBlack !== undefined ? { thruBlack: transition.thruBlack } : {}),
    ...(transition.pattern !== undefined ? { pattern: transition.pattern as 'diamond' | 'hexagon' | 'strip' | 'rectangle' } : {}),
    ...(transition.isContent !== undefined ? { isContent: transition.isContent } : {}),
    ...(transition.isInverted !== undefined ? { isInverted: transition.isInverted } : {}),
    ...(transition.hasBounce !== undefined ? { hasBounce: transition.hasBounce } : {}),
    ...(transition.preset !== undefined ? { preset: transition.preset as never } : {}),
    ...(transition.invertX !== undefined ? { invertX: transition.invertX } : {}),
    ...(transition.invertY !== undefined ? { invertY: transition.invertY } : {}),
    ...(transition.morphOption !== undefined ? { morphOption: transition.morphOption as never } : {}),
    ...(transition.advanceOnClick !== undefined ? { advanceOnClick: transition.advanceOnClick } : {}),
    ...(transition.advanceAfterMs !== undefined ? { advanceAfterMs: transition.advanceAfterMs } : {})
  }
  try {
    setSlideTransition(slide, options)
    return true
  } catch (err) {
    ctx.warnings.push(`${pageLabel}：转场 ${transition.effect} 写入失败：${(err as Error).message}`)
    return false
  }
}

/* ------------------------------------------------------------------ *
 * Background
 * ------------------------------------------------------------------ */

async function applyBackground(
  slide: SlideData,
  background: unknown,
  resolver: ThemeResolver,
  ctx: BuildContext,
  where: string
): Promise<void> {
  if (background === undefined || background === null) return
  if (!background || typeof background !== 'object') {
    ctx.warnings.push(`${where}：background 必须是 Fill 对象`)
    return
  }
  const fill = background as Record<string, unknown>
  if (fill.type === 'solid') {
    const color = resolver.color(fill.color)
    if (color) setSlideBackground(slide, color)
  } else if (fill.type === 'gradient') {
    const stops = (Array.isArray(fill.stops) ? fill.stops : [])
      .map((s) => {
        const rec = s as { position?: unknown; color?: unknown }
        const color = resolver.color(rec.color)
        return typeof rec.position === 'number' && color !== undefined ? { offset: rec.position, color } : null
      })
      .filter((s): s is { offset: number; color: Color } => s !== null)
    if (stops.length >= 2) {
      if (fill.gradientType === 'radial') ctx.warnings.push(`${where}：径向渐变背景暂不支持，按线性处理`)
      setSlideBackgroundGradientFill(slide, {
        stops,
        angleDeg: typeof fill.angle === 'number' ? fill.angle : 0
      })
    } else {
      ctx.warnings.push(`${where}：渐变背景至少需要 2 个色标`)
    }
  } else if (fill.type === 'image') {
    const bytes = await preloadImageBytes(fill.src, ctx, where)
    if (bytes) setSlideBackgroundImage(slide, bytes)
  } else {
    ctx.warnings.push(`${where}：未知背景类型 ${String(fill.type)}`)
  }
}

/* ------------------------------------------------------------------ *
 * Deck theme → pptx theme part
 * ------------------------------------------------------------------ */

/** OOXML clrScheme slot names that may appear verbatim in theme.colors. */
const THEME_COLOR_SLOTS = [
  'dark1', 'light1', 'dark2', 'light2',
  'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6',
  'hyperlink', 'followedHyperlink'
] as const

/**
 * Brand the output package with the deck's theme instead of the library's
 * Office default (Calibri + Office palette):
 *  - title/body textStyles' fontFamily → major/minor font scheme;
 *  - theme.colors entries under canonical clrScheme slot names → clrScheme.
 * Both setters throw when the package has no theme part; failures degrade
 * to a warning, never abort the build.
 */
function applyDeckTheme(pres: PresentationData, theme: Theme | undefined, warnings: string[]): void {
  if (theme === undefined) return

  const familyOf = (key: string): { latin?: string; ea?: string } => {
    const fam = theme.textStyles?.[key]?.fontFamily as unknown
    if (typeof fam === 'string') {
      const parts = splitFontStack(fam)
      return parts.length > 0 ? { latin: parts[0], ea: parts.length > 1 ? parts[1] : parts[0] } : {}
    }
    if (fam && typeof fam === 'object') {
      const rec = fam as { latin?: unknown; ea?: unknown }
      return {
        ...(typeof rec.latin === 'string' ? { latin: rec.latin } : {}),
        ...(typeof rec.ea === 'string' ? { ea: rec.ea } : {})
      }
    }
    return {}
  }
  const title = familyOf('title')
  const body = familyOf('body')
  const fontsInput: PresentationFontsInput = {
    ...(title.latin !== undefined ? { majorLatin: title.latin } : {}),
    ...(title.ea !== undefined ? { majorEastAsian: title.ea } : {}),
    ...(body.latin !== undefined ? { minorLatin: body.latin } : {}),
    ...(body.ea !== undefined ? { minorEastAsian: body.ea } : {})
  }
  if (Object.keys(fontsInput).length > 0) {
    try {
      setPresentationFonts(pres, fontsInput)
    } catch (err) {
      warnings.push(`主题字体方案写入失败：${(err as Error).message}`)
    }
  }

  const colors = (theme.colors ?? {}) as Record<string, unknown>
  const slots: Record<string, string> = {}
  for (const key of THEME_COLOR_SLOTS) {
    const value = colors[key]
    if (value === undefined) continue
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) slots[key] = value
    else warnings.push(`主题色 ${key} 不是 #RRGGBB，已被忽略：${JSON.stringify(value)}`)
  }
  if (Object.keys(slots).length > 0) {
    try {
      setPresentationTheme(pres, slots)
    } catch (err) {
      warnings.push(`主题色方案写入失败：${(err as Error).message}`)
    }
  }
}

/* ------------------------------------------------------------------ *
 * Masters & layouts (spec §3.4, generate dialect)
 * ------------------------------------------------------------------ */

/**
 * 从 deck.masters 建真实 OOXML 母版/版式。
 *
 * 装饰图形直接画在母版/版式上（addSlideShape 等接受 SlideData；SlideLayoutData
 * 与 SlideData 在库里同构——都是包内一张 slide-like 部件，占位框单独走
 * addSlideLayoutPlaceholder）。页侧按 layoutRef.name 挂版式（setSlideLayout），
 * 之后 clearSlideShapes 只清页自身的形状，不动版式继承来的装饰。
 *
 * 失败口径：母版/版式是显式声明的结构，建不出来要让人知道——单个装饰元素
 * 失败降级为 warning（与页内元素同口径），版式本身建不出来抛错（fail-closed）。
 */
function buildMasters(
  pres: PresentationData,
  masters: MasterSpec[],
  resolver: ThemeResolver,
  ctx: BuildContext
): Map<string, SlideLayoutData> {
  const byName = new Map<string, SlideLayoutData>()
  for (const master of masters) {
    const partName = addSlideMaster(pres)
    setSlideMasterName(pres, partName, master.name)
    for (const spec of master.layouts) {
      const layout = addSlideLayout(pres, partName)
      setSlideLayoutName(layout, spec.name)
      if (byName.has(spec.name)) {
        throw new Error(`版式名重复：${spec.name}（deck.masters[*].layouts[*].name 必须唯一）`)
      }
      byName.set(spec.name, layout)
      // 装饰图形：母版级 + 版式级共用同一个绘制通道（slide-like 部件）。
      const draw = (elements: ElementBase[] | undefined, owner: string): void => {
        for (const el of elements ?? []) {
          const record = el as Record<string, unknown>
          const where = `${owner} 装饰 ${String(record.elementId)}`
          try {
            switch (record.elementType) {
              case 'shape':
                buildShape(layout as unknown as SlideData, record, resolver, ctx)
                break
              case 'text':
                buildText(layout as unknown as SlideData, record, resolver, undefined, ctx, new Set())
                break
              case 'line':
                buildLine(layout as unknown as SlideData, record, resolver, ctx)
                break
              default:
                ctx.warnings.push(`${where}：母版/版式装饰只支持 shape/text/line，${String(record.elementType)} 已跳过`)
            }
          } catch (err) {
            ctx.warnings.push(`${where}：装饰绘制失败：${(err as Error).message}`)
          }
        }
      }
      if (spec === master.layouts[0]) draw(master.shapes, `母版 ${master.name}`)
      draw(spec.shapes, `版式 ${spec.name}`)
      for (const ph of spec.placeholders ?? []) {
        const [x, y, w, h] = ph.bounds
        const kind = ph.kind === 'title' ? 'content' : ph.kind === 'body' ? 'text' : ph.kind
        addSlideLayoutPlaceholder(layout, kind as never, {
          x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h)
        })
      }
    }
  }
  return byName
}

/* ------------------------------------------------------------------ *
 * The engine
 * ------------------------------------------------------------------ */

export function createOfficeKitEngine(): DeckEngine {
  return {
    async buildDeck(model, ctx: BuildContext): Promise<DeckBuildResult> {
      const { deck, pages } = model
      const warnings: string[] = ctx.warnings
      const fonts = new Set<string>()
      const resolver = new ThemeResolver(deck.theme)

      const size = Array.isArray(deck.size) ? deck.size : [960, 540]
      const exportCfg = deck.export ?? {}
      const transitionMode = exportCfg.transition ?? 'fade'
      const animationsMode = exportCfg.animations ?? 'auto'
      const profile = deck.profile ?? 'generate'

      // 逆向保真（spec §10.4）：存档可用时以 source/original.pptx 为骨架——
      // 主题、母版、版式与字体表原样沿用；指纹未变的页直接沿用源页，其余页
      // 挂回源页版式后按 PPTD 重建。存档不可用时从空白文档重建。
      const restore = await planSourceRestore(deck, pages, ctx.projectDir)
      for (const note of restore.notes) warnings.push(note)
      const archive = restore.archiveReady && restore.bytes ? restore.bytes : null

      let pres: PresentationData
      let archiveSlides: SlideData[] = []
      const layoutByPart = new Map<string, SlideLayoutData>()
      if (archive) {
        pres = await loadPresentation(archive)
        archiveSlides = [...getSlides(pres)]
        for (const layout of getSlideLayouts(pres)) layoutByPart.set(getSlideLayoutPartName(layout), layout)
        try {
          const srcFonts = getPresentationFonts(pres)
          if (srcFonts) {
            for (const f of [srcFonts.majorLatin, srcFonts.majorEastAsian, srcFonts.majorComplexScript,
              srcFonts.minorLatin, srcFonts.minorEastAsian, srcFonts.minorComplexScript]) {
              if (f) fonts.add(f)
            }
          }
        } catch {
          // 字体表缺失不阻断导出。
        }
      } else {
        // createPresentation only offers 16:9 / 4:3 canvases; we immediately
        // override with the exact deck size via setSlideSize.
        const ratio = size[0] / (size[1] || 1)
        pres = createPresentation({ size: Math.abs(ratio - 4 / 3) < 0.01 ? '4:3' : '16:9' })
        setSlideSize(pres, { width: toEmu(size[0]), height: toEmu(size[1]) })
        applyDeckTheme(pres, deck.theme, warnings)
      }

      const slides: SlideData[] = []
      const shapesPerPage = new Map<number, Map<string, unknown>>()
      const reused = new Set<SlideData>()
      const stats = {
        transitionPages: 0,
        animationsWritten: 0,
        animationsSkipped: 0
      }

      // 母版/版式轨（§3.4）：页循环之前建好，页侧按 layoutRef.name 挂接。
      // 仅生成方言；逆向工程的母版与版式来自源存档骨架。
      const layoutByName =
        profile === 'generate' && Array.isArray(deck.masters) && deck.masters.length > 0
          ? buildMasters(pres, deck.masters, resolver, ctx)
          : new Map<string, SlideLayoutData>()

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex]
        const pageLabel = `第 ${pageIndex + 1} 页`

        // 指纹未变的页：直接沿用存档里的源页（同一文档内，无需复制）。
        const from = restore.restoreFrom[pageIndex]
        if (archive && from !== null && from !== undefined && archiveSlides[from]) {
          const slide = archiveSlides[from]
          reused.add(slide)
          slides.push(slide)
          shapesPerPage.set(pageIndex, new Map())
          continue
        }

        // svg 页：整页经 vendored 编译器编成单页 pptx，再 importSlide 并入主 deck。
        // 新页一律追加在末尾，页循环结束后统一按 PPTD 页序排列。
        // fail-closed：编译失败/产物异常直接抛错，不产空白占位页。
        if (page.pageType === SVG_PAGE_TYPE) {
          const svgRef = page.svgSource?.ref
          if (!svgRef) {
            throw new Error(`${pageLabel}：svg 页缺少 svgSource.ref`)
          }
          const compiled = await compileSvgPage({
            projectDir: ctx.projectDir,
            svgRef,
            themeHash: themeHashOf(deck.theme)
          })
          const srcPres = await loadPresentation(compiled.bytes)
          // 编译器按 CSS px（9525 EMU）产出页面；主 deck 按 pt（12700 EMU）。
          // importSlide 保留源坐标，因此先在源文档内等比缩放到主画布。
          setSlideSize(srcPres, { width: toEmu(size[0]), height: toEmu(size[1]) }, { content: 'fit' })
          const srcSlides = getSlides(srcPres)
          if (srcSlides.length !== 1) {
            throw new Error(`${pageLabel}：svg 编译产物页数异常（${srcSlides.length}）`)
          }
          const slide = importSlide(pres, srcSlides[0])
          slides.push(slide)
          shapesPerPage.set(pageIndex, new Map())
          for (const family of compiled.fonts) fonts.add(family)
          if (typeof page.notes === 'string' && page.notes !== '') setSlideNotes(slide, page.notes)
          // deck 级转场对 svg 页同样生效（页内动画 svg 页不支持，见规格 §4）。
          if (transitionMode !== 'none') {
            const curated =
              transitionMode === 'auto'
                ? AUTO_TRANSITION_CURATED[pageIndex % AUTO_TRANSITION_CURATED.length]
                : { effect: 'fade' }
            try {
              setSlideTransition(slide, {
                effect: curated.effect as never,
                ...(curated.direction !== undefined ? { direction: curated.direction } : {}),
                speed: 'fast',
                advanceOnClick: true
              })
              stats.transitionPages++
            } catch (err) {
              warnings.push(`${pageLabel}：deck 级转场 ${curated.effect} 写入失败：${(err as Error).message}`)
            }
          }
          continue
        }

        const slide = addBlankSlide(pres)
        // 挂版式（§3.4）：版式带来装饰图形与占位框；clearSlideShapes 只清
        // 页自身的形状，不动版式继承。未知版式名 fail-closed（与校验层一致）。
        if (profile === 'generate' && page.layoutRef?.name) {
          const layout = layoutByName.get(page.layoutRef.name)
          if (!layout) throw new Error(`${pageLabel}：未知版式 ${page.layoutRef.name}（deck.masters 里没有）`)
          setSlideLayout(slide, layout)
        }
        // 逆向重建页挂回源页所用的存档版式，母版与版式装饰随之回来。
        if (archive && page.layoutRef?.partName) {
          const layout = layoutByPart.get(page.layoutRef.partName)
          if (layout) setSlideLayout(slide, layout)
          else warnings.push(`${pageLabel}：源存档里没有版式 ${page.layoutRef.partName}，按默认版式重建`)
        }
        clearSlideShapes(slide)
        slides.push(slide)
        const shapeMap = new Map<string, SlideShapeData>()
        shapesPerPage.set(pageIndex, shapeMap)

        await applyBackground(slide, page.background, resolver, ctx, pageLabel)

        // Preload image fill bytes referenced by solid/gradient-less fills.
        for (const element of page.elements) {
          await preloadFillBytes(element as Record<string, unknown>, ctx)
        }

        for (const element of page.elements) {
          const record = element as Record<string, unknown>
          const type = record.elementType
          let shape: SlideShapeData | null = null
          try {
            switch (type) {
              case 'text':
                shape = buildText(slide, record, resolver, deck.theme, ctx, fonts)
                break
              case 'shape':
                shape = buildShape(slide, record, resolver, ctx)
                break
              case 'placeholder':
                shape =
                  (archive ? copyArchivedOriginal(slide, record, archiveSlides, ctx, pageLabel) : null) ??
                  buildPlaceholder(slide, record, resolver, ctx, fonts)
                break
              case 'image': {
                const bytes = await preloadImageBytes(record.src, ctx, `元素 ${String(record.elementId)}`)
                shape = buildImage(slide, record, resolver, ctx, bytes)
                break
              }
              case 'line':
                shape = buildLine(slide, record, resolver, ctx)
                break
              case 'table':
                shape = buildTable(slide, record, resolver, deck.theme, ctx, fonts)
                break
              case 'chart':
                shape = buildChart(slide, record, resolver, ctx)
                break
              case 'icon':
                warnings.push(`${pageLabel}：icon 元素（${String(record.iconName)}）暂不支持，落为占位`)
                shape = buildPlaceholder(slide, { ...record, originalType: 'unknown', label: `图标：${String(record.iconName)}` }, resolver, ctx, fonts)
                break
              default:
                warnings.push(`${pageLabel}：未知元素类型 ${String(type)}，已跳过`)
            }
          } catch (err) {
            warnings.push(`${pageLabel}：元素 ${String(record.elementId)}（${String(type)}）构建失败：${(err as Error).message}`)
            shape = null
          }
          if (shape) shapeMap.set(String(record.elementId), shape)
        }

        applyElementGroups(page.elements as Record<string, unknown>[], shapeMap, warnings, pageLabel)
        if (typeof page.notes === 'string' && page.notes !== '') setSlideNotes(slide, page.notes)
        if (profile === 'reverse' && page.hidden === true) setSlideHidden(slide, true)

        // Transitions: page-level record wins. Reverse decks only write the
        // transitions the source actually had — a page without one stays
        // without one, instead of being dressed up with a deck-level fade.
        if (transitionMode !== 'none') {
          if (profile === 'reverse') {
            if (page.transition && applyTransition(slide, page.transition, ctx, pageLabel)) stats.transitionPages++
          } else {
            const curated =
              transitionMode === 'auto'
                ? AUTO_TRANSITION_CURATED[pageIndex % AUTO_TRANSITION_CURATED.length]
                : { effect: 'fade' }
            try {
              setSlideTransition(slide, {
                effect: curated.effect as never,
                ...(curated.direction !== undefined ? { direction: curated.direction } : {}),
                speed: 'fast',
                advanceOnClick: true
              })
              stats.transitionPages++
            } catch (err) {
              warnings.push(`${pageLabel}：deck 级转场 ${curated.effect} 写入失败：${(err as Error).message}`)
            }
          }
        }

        const anim = applyAnimations(slide, page, shapeMap, animationsMode, ctx, pageLabel)
        stats.animationsWritten += anim.written
        stats.animationsSkipped += anim.skipped
      }

      if (archive) {
        // 未被沿用的源页移除，其余按 PPTD 页序排列。
        for (const slide of archiveSlides) if (!reused.has(slide)) removeSlide(pres, slide)
        slides.forEach((slide, index) => {
          if (getSlideIndex(pres, slide) !== index) moveSlide(pres, slide, index)
        })
        const kept = reused.size
        warnings.push(
          kept === pages.length
            ? `全部 ${kept} 页内容自导入后未变，直接沿用源存档页（图表、SmartArt、动画等原样保留）`
            : `沿用源存档：${kept} 页原样保留，${pages.length - kept} 页按 PPTD 重建（主题、母版与版式来自源文件）`
        )
      }

      return {
        native: pres,
        slides,
        shapes: shapesPerPage,
        warnings,
        fontsUsed: [...fonts]
      }
    },

    async saveDeck(native: unknown): Promise<Uint8Array> {
      return savePresentation(native as PresentationData)
    }
  }
}

/** Image fills carry a src, not bytes; resolve them into __bytes before applyFill runs. */
async function preloadFillBytes(element: Record<string, unknown>, ctx: BuildContext): Promise<void> {
  const candidates: Array<Record<string, unknown> | undefined> = [element.fill as Record<string, unknown> | undefined]
  for (const fill of candidates) {
    if (fill && fill.type === 'image' && typeof fill.src === 'string' && fill.__bytes === undefined) {
      try {
        fill.__bytes = await ctx.loadMedia(fill.src)
      } catch (err) {
        ctx.warnings.push(`元素 ${String(element.elementId)}：填充素材加载失败 ${fill.src}：${(err as Error).message}`)
      }
    }
  }
}
