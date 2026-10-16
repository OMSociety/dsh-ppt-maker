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
  addSlideLine,
  addSlideShape,
  addSlideTable,
  addSlideTextBox,
  clearSlideShapes,
  createPresentation,
  emu,
  getTableCell,
  mergeTableCells,
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
  setShapeTextWrap,
  setSlideBackground,
  setSlideBackgroundGradientFill,
  setSlideBackgroundImage,
  setSlideHidden,
  setSlideNotes,
  setSlideSize,
  setSlideTransition,
  setTableCellAnchor,
  setTableCellBorders,
  setTableCellFill,
  setTableCellParagraphs,
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
  type SlideShapeData,
  type TableCellData,
  type TextFormat,
  type TransitionOptions
} from '@office-kit/pptx'
import type { Animation, ElementBase, Page, PageTransition, Presentation, Theme } from '../pptd/schema.js'
import { PLACEHOLDER_DEFAULT_LABELS } from '../pptd/schema.js'
import { parseRichText, type RichParagraph, type RichRun } from './richtext.js'
import type { BuildContext, DeckBuildResult, DeckEngine } from './types.js'

/* ------------------------------------------------------------------ *
 * Units
 * ------------------------------------------------------------------ */

const PX_TO_EMU = 12700

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
    const alignToken = para.props.align !== undefined ? ALIGN_MAP[para.props.align] : undefined
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
    const stops = Array.isArray(fill.stops) ? fill.stops : []
    const mapped = stops
      .map((stop) => {
        const s = stop as { position?: unknown; color?: unknown }
        const color = resolver.color(s.color)
        return typeof s.position === 'number' && color !== undefined ? { offset: s.position, color } : null
      })
      .filter((s): s is { offset: number; color: Color } => s !== null)
    if (mapped.length < 2) { ctx.warnings.push(`${where}：gradient 填充至少需要 2 个色标`); return }
    if (fill.gradientType === 'radial') {
      ctx.warnings.push(`${where}：径向渐变（radial）暂不支持，已按线性渐变处理`)
    }
    const angle = typeof fill.angle === 'number' ? fill.angle : 0
    const options: GradientFillOptions = { stops: mapped, angleDeg: angle }
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

function applyBorder(shape: SlideShapeData, border: Record<string, unknown> | undefined, resolver: ThemeResolver): void {
  if (border === undefined) return
  const color = resolver.color(border.color) ?? ('#000000' as Color)
  const width = typeof border.width === 'number' ? border.width : 1
  setShapeStroke(shape, { color, widthEmu: toEmu(width) as unknown as number })
  const style = border.style
  if (style === 'dash') setShapeStrokeDash(shape, 'dash')
  else if (style === 'dot') setShapeStrokeDash(shape, 'sysDot')
}

function applyShadow(shape: SlideShapeData, shadow: Record<string, unknown> | undefined, resolver: ThemeResolver): void {
  if (shadow === undefined) return
  const color = resolver.color(shadow.color) ?? ('#000000' as Color)
  const blur = typeof shadow.blur === 'number' ? shadow.blur : 0
  const offset = Array.isArray(shadow.offset) ? (shadow.offset as number[]) : [0, 0]
  const [ox, oy] = [offset[0] ?? 0, offset[1] ?? 0]
  const dist = Math.sqrt(ox * ox + oy * oy)
  const angle = dist === 0 ? 0 : (Math.atan2(oy, ox) * 180) / Math.PI
  setShapeShadow(shape, {
    color,
    blurEmu: toEmu(blur) as unknown as number,
    offsetEmu: toEmu(dist) as unknown as number,
    angleDeg: Math.round(angle)
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
    // No setShapeOpacity in the library: route through fill/stroke opacity.
    setShapeFill(shape, { opacity: Math.max(0, Math.min(1, element.opacity)) })
    ctx.warnings.push(`${where}：元素 opacity 经填充透明度近似实现（文字/描边不透明度未级联）`)
  }
  renameShape(shape, element.elementId)
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
  setShapeParagraphs(shape, specs)
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
    // Preset adjust values (<a:avLst>) are not exposed by the library's write
    // API; shapes render at preset defaults. Degrade loudly, never silently.
    ctx.warnings.push(`${where}：形状 adjustments 暂不支持，按预设默认值绘制`)
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
  fonts.add('default')
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

  const shape = addSlideTable(slide, {
    x: toEmu(x),
    y: toEmu(y),
    w: toEmu(w),
    h: toEmu(h),
    rows: rowsRaw.map((row) => row.map((cell) => cellTextOf(cell))),
    colWidths: (columnWidths ?? new Array(cols).fill(1 / cols)).map((f) => toEmu(w * f)),
    rowHeights: (rowHeights ?? new Array(rowsRaw.length).fill(1 / rowsRaw.length)).map((f) => toEmu(h * f)),
    firstRow: tableStyle?.firstRowStyle !== undefined,
    bandRow: tableStyle?.bandRow === true
  })

  applyTableCells(shape, rowsRaw, tableStyle, resolver, theme, ctx, fonts, where)
  applyCommonGeometry(shape, element as ElementBase, ctx, where)
  if (typeof element.rotation === 'number' && element.rotation !== 0) {
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

function applyTableCells(
  table: SlideShapeData,
  rows: CellData[][],
  style: ResolvedTableStyle | null,
  resolver: ThemeResolver,
  theme: Theme | undefined,
  ctx: BuildContext,
  fonts: Set<string>,
  where: string
): void {
  const merges: Array<{ row: number; col: number; rowSpan: number; colSpan: number }> = []
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const cell = rows[r][c]
      if (!cell) continue
      if ((cell.rowSpan ?? 1) > 1 || (cell.colSpan ?? 1) > 1) {
        merges.push({ row: r, col: c, rowSpan: cell.rowSpan ?? 1, colSpan: cell.colSpan ?? 1 })
      }
    }
  }
  for (const merge of merges) {
    try {
      mergeTableCells(table, merge, { coveredText: 'keep' })
    } catch (err) {
      ctx.warnings.push(`${where}：合并单元格 (${merge.row},${merge.col}) 失败：${(err as Error).message}`)
    }
  }

  const { getTableCell } = tableApi
  const lastRow = rows.length - 1
  for (let r = 0; r < rows.length; r++) {
    const lastCol = rows[r].length - 1
    for (let c = 0; c < rows[r].length; c++) {
      const cell = rows[r][c]
      if (!cell) continue
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
      const merged: Record<string, unknown> = { ...baseStyle, ...(textStyleRef ?? {}), ...cell }
      const content = resolveContent(merged, theme, resolver, fonts, ctx.warnings, `${where} 单元格(${r},${c})`)
      const parsed = parseRichText(text)
      const specs = richRunsToSpecs(parsed.paragraphs, content, resolver, fonts)
      setTableCellParagraphs(handle, specs)
      applyParagraphBullets(handle, parsed.paragraphs)
      const anchor = (content.align[1] ?? 'middle') as string
      setTableCellAnchor(handle, anchor === 'top' ? 'top' : anchor === 'bottom' ? 'bottom' : 'center')

      // borders
      applyCellBorders(handle, cell.border ?? baseStyle.border, resolver, ctx, `${where} 单元格(${r},${c})`)
    }
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
  const rowStyle = r === 0 ? style.firstRowStyle : r === lastRow ? style.lastRowStyle : style.bodyStyles?.[(r - 1) % (style.bodyStyles.length || 1)]
  const colStyle = c === 0 ? style.firstColumnStyle : c === lastCol ? style.lastColumnStyle : null
  const rowOverColumn = style.rowOverColumn !== false
  const merged: Record<string, unknown> = rowOverColumn
    ? { ...(colStyle ?? {}), ...(rowStyle ?? {}) }
    : { ...(rowStyle ?? {}), ...(colStyle ?? {}) }
  return Object.keys(merged).length > 0 ? merged : null
}

function applyCellBorders(
  handle: unknown,
  spec: unknown,
  resolver: ThemeResolver,
  ctx: BuildContext,
  where: string
): void {
  if (spec === undefined) return
  const cell = handle as Parameters<typeof setTableCellBorders>[0]
  if (spec === null) {
    setTableCellBorders(cell, null)
    return
  }
  const one = (b: unknown): { color: string; widthEmu: number; dash: string } | null => {
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
    } else if (typeof spec === 'object' && spec !== null) {
      const b = one(spec)
      if (b) setTableCellBorders(cell, { top: b, right: b, bottom: b, left: b })
    }
  } catch (err) {
    ctx.warnings.push(`${where}：单元格边框设置失败：${(err as Error).message}`)
  }
}

const tableApi = { getTableCell }

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
  const shape = addSlideChartSafe(slide, { spec: spec as ChartSpec, x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) })
  applyCommonGeometry(shape, element as ElementBase, ctx, where)
  return shape
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
    return {
      kind: 'pie',
      categories: data.rows.map((r) => String(r[catIdx] ?? '')),
      series: [
        {
          name: typeof s0.name === 'string' ? s0.name : String(encode.value ?? ''),
          values: data.rows.map((r) => numOrNull(r[valIdx]))
        }
      ]
    }
  }

  const kind = firstType === 'bar' ? 'column' : firstType // PPTD bar=vertical bars; engine column
  const mappedSeries = series.map((s) => {
    const encode = (s.encode ?? {}) as Record<string, unknown>
    const xIdx = colIndex(encode.x)
    const yIdx = colIndex(encode.y)
    if (xIdx < 0 || yIdx < 0) {
      ctx.warnings.push(`${where}：系列 ${String(s.name ?? '?')} 的 encode 未命中 data.cols`)
      return null
    }
    const out: Record<string, unknown> = {
      name: typeof s.name === 'string' ? s.name : String(encode.y ?? ''),
      values: data.rows.map((r) => numOrNull(r[yIdx]))
    }
    const fill = typeof s.fill === 'string' ? resolver.color(s.fill) : undefined
    if (fill !== undefined) out.color = String(fill)
    if (firstType === 'line' || firstType === 'area') out.chartKind = firstType
    return { out, xIdx }
  })
  if (mappedSeries.some((s) => s === null)) return null
  const xIdx = mappedSeries[0]!.xIdx
  return {
    kind,
    categories: data.rows.map((r) => String(r[xIdx] ?? '')),
    series: mappedSeries.map((s) => s!.out)
  }
}

function numOrNull(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

const addSlideChartSafe = addSlideChart

/* ------------------------------------------------------------------ *
 * SVG path → CustomGeometryInput (custom shapes, spec §5 Shape.custom)
 * ------------------------------------------------------------------ */

function svgPathToCustomGeometry(
  path: string,
  viewBox: [number, number],
  ctx: BuildContext,
  where: string
): CustomGeometryInput | null {
  const tokens = path.match(/[MmLlHhVvCcSsQqZzAa]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)
  if (!tokens) return null
  // CustomGeometryInput.paths — each path carries its own w/h (viewBox space).
  const paths: CustomGeometryInput['paths'][number][] = []
  let commands: GeomCommand[] = []
  let cx = 0
  let cy = 0
  let i = 0
  let cmd = ''
  const num = () => Number(tokens[i++])
  const pushMove = (x: number, y: number) => commands.push({ kind: 'moveTo', pt: { x, y } })
  const pushLine = (x: number, y: number) => commands.push({ kind: 'lnTo', pt: { x, y } })
  const pushCubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) =>
    commands.push({ kind: 'cubicBezTo', pts: [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x, y }] })
  const flush = () => {
    if (commands.length > 0) paths.push({ w: viewBox[0], h: viewBox[1], commands })
    commands = []
  }

  while (i < tokens.length) {
    const t = tokens[i]
    if (/^[A-Za-z]$/.test(t)) {
      cmd = t
      i++
      if (cmd === 'Z' || cmd === 'z') {
        commands.push({ kind: 'close' })
        continue
      }
      if (cmd === 'A' || cmd === 'a') {
        ctx.warnings.push(`${where}：SVG 弧线命令 A 暂不支持，该段已跳过`)
      }
    }
    const rel = cmd === cmd.toLowerCase()
    const op = cmd.toUpperCase()
    try {
      if (op === 'M') {
        const x = num()
        const y = num()
        cx = rel ? cx + x : x
        cy = rel ? cy + y : y
        if (commands.length > 0) flush() // new subpath starts here
        pushMove(cx, cy)
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
      } else if (op === 'S' || op === 'Q') {
        ctx.warnings.push(`${where}：SVG 命令 ${op} 暂不支持，已中断路径解析`)
        break
      } else if (op === 'A') {
        // rx ry rot large sweep x y — consume and skip
        i += 7
      } else {
        break
      }
    } catch {
      ctx.warnings.push(`${where}：SVG 路径解析中断`)
      break
    }
  }
  flush()
  if (paths.length === 0) return null
  return { paths }
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
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) slots[key] = value
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
      // createPresentation only offers 16:9 / 4:3 canvases; we immediately
      // override with the exact deck size via setSlideSize.
      const ratio = size[0] / (size[1] || 1)
      const pres: PresentationData = createPresentation({ size: Math.abs(ratio - 4 / 3) < 0.01 ? '4:3' : '16:9' })
      setSlideSize(pres, { width: toEmu(size[0]), height: toEmu(size[1]) })
      applyDeckTheme(pres, deck.theme, warnings)

      const exportCfg = deck.export ?? {}
      const transitionMode = exportCfg.transition ?? 'fade'
      const animationsMode = exportCfg.animations ?? 'auto'
      const profile = deck.profile ?? 'generate'

      const slides: SlideData[] = []
      const shapesPerPage = new Map<number, Map<string, unknown>>()
      const stats = {
        transitionPages: 0,
        animationsWritten: 0,
        animationsSkipped: 0
      }

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex]
        const pageLabel = `第 ${pageIndex + 1} 页`
        const slide = addBlankSlide(pres)
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
                shape = buildPlaceholder(slide, record, resolver, ctx, fonts)
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

        if (typeof page.notes === 'string' && page.notes !== '') setSlideNotes(slide, page.notes)
        if (profile === 'reverse' && page.hidden === true) setSlideHidden(slide, true)

        // Transitions: page-level record wins; deck-level fade fills the rest.
        if (transitionMode !== 'none') {
          if (profile === 'reverse' && page.transition) {
            if (applyTransition(slide, page.transition, ctx, pageLabel)) stats.transitionPages++
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

      return {
        native: pres,
        slides,
        shapes: shapesPerPage,
        warnings,
        fontsUsed: [...fonts].filter((f) => f !== 'default')
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
