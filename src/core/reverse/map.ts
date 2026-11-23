/**
 * Reverse map layer: turn the read model into PPTD
 * AST nodes in the *reverse* dialect, plus the two-level degradation report
 * and the media asset pool.
 *
 * Hard rules from the spec (§2.3 R1–R7) this module enforces:
 *   - geometry, colors, fonts, styles are always explicit literals;
 *   - every mapped element carries `bounds` and provenance (`sourceRef`,
 *     `originalName`);
 *   - elements the model cannot host fall to `dropped` + a placeholder;
 *   - mappable-but-lossy features fall to `degraded`.
 *
 * This module does no disk I/O; `writeProject.ts` materialises.
 */
import {
  getParagraphAlignment,
  getParagraphBullet,
  getParagraphLineSpacing,
  getParagraphPropertiesEffective,
  getParagraphSpacing,
  type ParagraphProperties,
  getShapeAdjustValues,
  getShapeChartSpec,
  getShapeBodyPrEffective,
  getShapeAnimation,
  getShapeCustomGeometry,
  getShapeEffectsEffective,
  getShapeFill,
  getShapeFillColorResolved,
  getShapeFillEffective,
  getShapeFillOpacity,
  getShapePatternFill,
  getShapeImageBytes,
  getShapeImageCrop,
  getShapeImagePartName,
  getShapeGradientFill,
  getShapeGradientFillEffective,
  getShapeImageFillBytes,
  getShapeImageOpacity,
  getShapeMedia,
  getShapeParagraphCount,
  getShapeParagraphElements,
  getShapePreset,
  getShapeRunFormatEffective,
  getShapeStroke,
  getShapeStrokeEffective,
  getShapeStrokeGradient,
  getShapeStrokeArrow,
  getShapeStrokeDash,
  getShapeTextAnchor,
  getShapeTextAutoFitParams,
  getShapeTextDirection,
  getShapeTextWrap,
  getShapeXmlString,
  getSlideAnimations,
  getSlideBackground,
  getSlideBackgroundGradientFill,
  getSlideBackgroundImageBytes,
  getSlideLayout,
  getSlideLayoutBackground,
  getSlideLayoutBackgroundGradientFill,
  getSlideLayoutBackgroundImageBytes,
  getSlideMasterBackground,
  getSlideMasterBackgroundGradientFill,
  getSlideMasterBackgroundImageBytes,
  getSlideTransition,
  getPresentationTheme,
  getTableCellParagraphs,
  getTableCellAlignment,
  getTableCellAnchor,
  getTableCellFill,
  getTableCellSpan,
  getTableCellText,
  getTableColumnWidths,
  getTableDimensions,
  getTableRowHeights,
  getTableCell,
  getTableStyleId,
  isChartShape,
  isShapeTextBox,
  isTableShape,
  readPackagePart,
  type PresentationData,
  type SlideBackground,
  type SlideData,
  type SlideLayoutData,
  type SlideShapeData
} from '@office-kit/pptx'
import { PRESET_ADJUST_GUIDES } from '../engine/preset-adjust-guides.js'
import { drawingColorOf } from './read.js'
import {
  PLACEHOLDER_DEFAULT_LABELS,
  type Animation,
  type Page,
  type Presentation
} from '../pptd/schema.js'
import type {
  ImportReport,
  ReverseMapResult,
  ReverseMediaAsset,
  ReverseReadResult,
  ReverseShapeRecord,
  ReverseSlideRecord
} from './types.js'

const EMU_PER_PX = 12700
const DEFAULT_SIZE: [number, number] = [960, 540]

function emuToPx(emu: number): number {
  return Math.round((emu / EMU_PER_PX) * 100) / 100
}

function pxBounds(b: { x: number; y: number; w: number; h: number }): [number, number, number, number] {
  return [emuToPx(b.x), emuToPx(b.y), emuToPx(b.w), emuToPx(b.h)]
}

function slideIndexLabel(n: number): string {
  return String(n).padStart(2, '0')
}

function placeholderFor(
  rec: ReverseShapeRecord,
  originalType: 'chart' | 'smartArt' | 'group' | 'media' | 'ole' | 'object3d' | 'unknown',
  label?: string
): Page['elements'][number] {
  const boundsPx = rec.bounds
    ? pxBounds(rec.bounds)
    : ([0, 0, DEFAULT_SIZE[0] / 4, DEFAULT_SIZE[1] / 4] as [number, number, number, number])
  return {
    elementId: `ph-${rec.slideIndex}-${rec.shapeId}`,
    elementType: 'placeholder',
    bounds: boundsPx,
    originalType,
    originalName: rec.originalName,
    label: label ?? PLACEHOLDER_DEFAULT_LABELS[originalType],
    sourceRef: { slideIndex: rec.slideIndex, shapeId: rec.shapeId }
  } as unknown as Page['elements'][number]
}

function ensurePlaceholder(
  page: Page,
  rec: ReverseShapeRecord,
  originalType: 'chart' | 'smartArt' | 'group' | 'media' | 'ole' | 'object3d' | 'unknown',
  report: ImportReport,
  reason: string
): void {
  const placeholder = placeholderFor(rec, originalType)
  page.elements.push(placeholder)
  report.dropped.push({
    page: rec.slideIndex,
    shapeId: rec.shapeId,
    originalName: rec.originalName,
    originalType,
    reason,
    placeholder: {
      elementId: placeholder.elementId,
      bounds: placeholder.bounds as [number, number, number, number]
    }
  })
}

/** Base elementId; page assembly appends a suffix when source shape ids repeat. */
function elementIdOf(rec: ReverseShapeRecord): string {
  return `el-${rec.slideIndex}-${rec.shapeId}`
}

function uniquePageElementId(baseId: string, used: Set<string>): string {
  if (!used.has(baseId)) {
    used.add(baseId)
    return baseId
  }
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${baseId}-${suffix}`
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
  }
}

/* ------------------------------------------------------------------ *
 * Per-kind mapping
 * ------------------------------------------------------------------ */

function baseElement(rec: ReverseShapeRecord): Record<string, unknown> {
  return {
    elementId: elementIdOf(rec),
    bounds: rec.bounds ? pxBounds(rec.bounds) : [0, 0, 100, 100],
    rotation: rec.rotationDeg,
    opacity: rec.opacity ?? 1,
    flip: [rec.flip.horizontal, rec.flip.vertical] as [boolean, boolean],
    sourceRef: { slideIndex: rec.slideIndex, shapeId: rec.shapeId },
    originalName: rec.originalName
  }
}

/* ------------------------------------------------------------------ *
 * Run-level rich text mapping
 * ------------------------------------------------------------------ */

const H_ALIGN_MAP: Record<string, string> = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
  distribute: 'distributed',
  l: 'left',
  ctr: 'center',
  r: 'right',
  just: 'justify',
  dist: 'distributed',
  justLow: 'justify',
  thaiDist: 'distributed'
}

// getShapeTextAnchor 返回库词汇（top/center/bottom）与 OOXML token（t/ctr/b）都可能出现，两种都收。
const V_ALIGN_MAP: Record<string, string> = {
  top: 'top',
  center: 'middle',
  bottom: 'bottom',
  t: 'top',
  ctr: 'middle',
  b: 'bottom',
  just: 'middle',
  dist: 'middle'
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}

/** px 值保留两位小数，去掉多余的尾零。 */
function fmtPx(v: number): string {
  const r = Math.round(v * 100) / 100
  return String(r)
}

/**
 * 把单个 run 的 ReadTextFormat + 文本编成 PPTD 富文本片段。
 * 标签顺序：span 在外（承载字体/字号/颜色），strong/em/u 在内。
 */
function runToHtml(text: string, fmt: {
  font?: string
  fontEastAsian?: string
  size?: number
  color?: string | null
  bold?: boolean
  italic?: boolean
  underline?: boolean | string
  baseline?: number
}): string {
  let inner = escapeHtml(text)
  if (fmt.bold) inner = `<strong>${inner}</strong>`
  if (fmt.italic) inner = `<em>${inner}</em>`
  if (fmt.underline === true || (typeof fmt.underline === 'string' && fmt.underline !== 'none')) {
    inner = `<u>${inner}</u>`
  }
  if (typeof fmt.baseline === 'number' && fmt.baseline !== 0) {
    inner = fmt.baseline > 0 ? `<sup>${inner}</sup>` : `<sub>${inner}</sub>`
  }
  const styles: string[] = []
  if (typeof fmt.size === 'number' && fmt.size > 0) {
    // PPTD 富文本的 font-size 以 px 为事实单位（richtext.ts 解析 px/pt 同一数值）
    styles.push(`font-size:${fmtPx(fmt.size)}px`)
  }
  if (typeof fmt.color === 'string' && fmt.color !== '') {
    styles.push(`color:${asLiteralColor(fmt.color)}`)
  }
  const families: string[] = []
  if (fmt.font) families.push(fmt.font)
  if (fmt.fontEastAsian && fmt.fontEastAsian !== fmt.font) families.push(fmt.fontEastAsian)
  if (families.length > 0) {
    styles.push(`font-family:${families.join(', ')}`)
  }
  if (styles.length > 0) {
    inner = `<span style="${escapeAttr(styles.join(';'))}">${inner}</span>`
  }
  return inner
}

interface RichParagraph {
  html: string
  align: string | null
  lineSpacingPct: number | null
  lineSpacingPts: number | null
  spaceBeforePts: number | null
  bulletKind: 'bullet' | 'number' | null
  /** 各文字 run 的字间距（spc，1/100 pt），未写为 null */
  spacings: Array<number | null>
  /** 段落是否读过 run 级格式（用于 degraded 判定） */
  runsRead: boolean
}

/** `<a:normAutofit>` 记录的缩放：字号乘 fontScale，行距减 lnSpcReduction。 */
interface TextFit {
  fontScale: number
  lnSpcReduction: number
}

const NO_FIT: TextFit = { fontScale: 1, lnSpcReduction: 0 }

function readTextFit(shape: SlideShapeData): TextFit {
  try {
    const params = getShapeTextAutoFitParams(shape)
    if (!params) return NO_FIT
    const fontScale = Number.isFinite(params.fontScale) && params.fontScale > 0 && params.fontScale <= 1 ? params.fontScale : 1
    const lnSpcReduction =
      Number.isFinite(params.lnSpcReduction) && params.lnSpcReduction > 0 && params.lnSpcReduction < 1 ? params.lnSpcReduction : 0
    return { fontScale, lnSpcReduction }
  } catch {
    return NO_FIT
  }
}

function readRichParagraphs(
  pres: PresentationData,
  shape: SlideShapeData,
  fit: TextFit = NO_FIT,
  onFillFlattened?: (kind: string) => void
): RichParagraph[] | null {
  let paraCount = 0
  try {
    paraCount = getShapeParagraphCount(shape)
  } catch {
    return null
  }
  if (paraCount === 0) return null
  let elements: ReadonlyArray<ReadonlyArray<{ kind: string; text?: string; format?: Record<string, unknown> | null }>>
  try {
    elements = getShapeParagraphElements(shape) as unknown as typeof elements
  } catch {
    return null
  }
  const out: RichParagraph[] = []
  for (let p = 0; p < paraCount; p++) {
    const parts: string[] = []
    let runsRead = false
    const spacings: Array<number | null> = []
    const els = elements[p] ?? []
    let runIndex = -1 // effective format 的索引只数常规 run（d.ts: numeric indices count only regular runs）
    for (const el of els) {
      if (el.kind === 'br') {
        parts.push('<br>')
        continue
      }
      runIndex += 1
      const text = typeof el.text === 'string' ? el.text : ''
      if (text === '') continue
      let fmt: Record<string, unknown> = (el.format ?? {}) as Record<string, unknown>
      try {
        const eff = getShapeRunFormatEffective(pres, shape, p, runIndex)
        if (eff) {
          fmt = { ...eff }
          runsRead = true
        }
      } catch {
        if (el.format) runsRead = true
      }
      spacings.push(typeof fmt.spc === 'number' ? fmt.spc : null)
      parts.push(
        runToHtml(text, {
          font: typeof fmt.font === 'string' ? fmt.font : undefined,
          fontEastAsian: typeof fmt.fontEastAsian === 'string' ? fmt.fontEastAsian : undefined,
          size: typeof fmt.size === 'number' ? fmt.size * fit.fontScale : undefined,
          color: runColorOf(fmt, onFillFlattened),
          bold: fmt.bold === true,
          italic: fmt.italic === true,
          underline: (fmt.underline as boolean | string | undefined) ?? false,
          baseline: typeof fmt.baseline === 'number' ? fmt.baseline : undefined
        })
      )
    }
    // 段落属性取 slide → layout → master 继承链上的有效值（spec §2.3 R4）：
    // 占位符的居中、行距、项目符号多半写在版式/母版里，只读字面 <a:pPr> 会丢。
    let eff: ParagraphProperties | null = null
    try {
      eff = getParagraphPropertiesEffective(pres, shape, p)
    } catch {
      eff = null
    }
    let align: string | null = null
    try {
      const a = eff?.align ?? getParagraphAlignment(shape, p)
      if (a && H_ALIGN_MAP[a]) align = H_ALIGN_MAP[a]
    } catch {
      /* inherit */
    }
    let lineSpacingPct: number | null = null
    let lineSpacingPts: number | null = null
    try {
      const ls = eff?.lineSpacing ?? getParagraphLineSpacing(shape, p)
      if (ls?.kind === 'pct') lineSpacingPct = ls.value
      else if (ls?.kind === 'pts') lineSpacingPts = ls.value
    } catch {
      /* inherit */
    }
    if (fit.lnSpcReduction > 0) {
      if (lineSpacingPts !== null) lineSpacingPts = lineSpacingPts * (1 - fit.lnSpcReduction)
      else lineSpacingPct = Math.round(((lineSpacingPct ?? 1) - fit.lnSpcReduction) * 1000) / 1000
    }
    let spaceBeforePts: number | null = null
    try {
      if (typeof eff?.spcBefPts === 'number') spaceBeforePts = eff.spcBefPts
      else {
        const sp = getParagraphSpacing(shape, p)
        if (typeof sp?.beforePts === 'number') spaceBeforePts = sp.beforePts
      }
    } catch {
      /* inherit */
    }
    let bulletKind: 'bullet' | 'number' | null = null
    try {
      const b = eff?.bullet ?? getParagraphBullet(shape, p)
      if (b === 'bullet' || (typeof b === 'object' && b !== null && 'char' in b)) bulletKind = 'bullet'
      else if (b === 'number' || (typeof b === 'object' && b !== null && 'autoNum' in b)) bulletKind = 'number'
    } catch {
      /* inherit */
    }
    out.push({ html: parts.join(''), align, lineSpacingPct, lineSpacingPts, spaceBeforePts, bulletKind, spacings, runsRead })
  }
  return out
}

/**
 * Run colour: the solid colour when there is one; a gradient or pattern text
 * fill (PPTD runs only carry a colour) contributes its first stop / foreground.
 */
function runColorOf(fmt: Record<string, unknown>, onFlattened?: (kind: string) => void): string | null {
  if (typeof fmt.color === 'string') return fmt.color
  const fill = fmt.textFill as { kind?: string; stops?: Array<{ offset?: number; color?: string; resolvedColor?: string }>; foreground?: string } | undefined
  if (fill?.kind === 'gradient' && fill.stops && fill.stops.length > 0) {
    // 渐变停靠点可乱序书写，取轴起点（offset 最小）那一档作为整段文字色。
    const stop = [...fill.stops].sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))[0]
    const color = stop.resolvedColor ?? stop.color
    if (typeof color !== 'string') return null
    onFlattened?.('gradient')
    return color
  }
  if (fill?.kind === 'pattern' && typeof fill.foreground === 'string') {
    onFlattened?.('pattern')
    return fill.foreground
  }
  return null
}

/** 段落数组 → PPTD content.text 富文本字符串。 */
function paragraphsToHtml(paras: RichParagraph[]): string {
  const chunks: string[] = []
  let listTag: 'ul' | 'ol' | null = null
  const closeList = (): void => {
    if (listTag) {
      chunks.push(`</${listTag}>`)
      listTag = null
    }
  }
  for (const para of paras) {
    const styles: string[] = []
    if (para.align) styles.push(`text-align:${para.align}`)
    if (para.lineSpacingPct !== null) styles.push(`line-height:${para.lineSpacingPct}`)
    else if (para.lineSpacingPts !== null) styles.push(`line-height:${fmtPx(para.lineSpacingPts)}px`)
    if (para.spaceBeforePts !== null) styles.push(`margin-top:${fmtPx(para.spaceBeforePts)}px`)
    const styleAttr = styles.length > 0 ? ` style="${escapeAttr(styles.join(';'))}"` : ''
    if (para.bulletKind) {
      const tag = para.bulletKind === 'number' ? 'ol' : 'ul'
      if (listTag !== tag) {
        closeList()
        chunks.push(`<${tag}>`)
        listTag = tag
      }
      chunks.push(`<li${styleAttr}>${para.html}</li>`)
    } else {
      closeList()
      chunks.push(`<p${styleAttr}>${para.html}</p>`)
    }
  }
  closeList()
  return chunks.join('')
}

function mapText(
  rec: ReverseShapeRecord,
  pres: PresentationData,
  fonts: ReverseReadResult['fonts'],
  report: ImportReport,
  elementId: string = elementIdOf(rec)
): Record<string, unknown> {
  const shape = rec.raw as SlideShapeData
  const fit = readTextFit(shape)
  const flattened = new Set<string>()
  const rich = readRichParagraphs(pres, shape, fit, (kind) => flattened.add(kind))
  if (flattened.size > 0) {
    report.degraded.push({
      page: rec.slideIndex,
      elementId,
      feature: 'text.gradientFill',
      detail: '文字的渐变/图案填充按首个色标（或前景色）写成纯色',
      originalValue: [...flattened].join(',')
    })
  }
  if (rich !== null && (fit.fontScale < 1 || fit.lnSpcReduction > 0)) {
    report.degraded.push({
      page: rec.slideIndex,
      elementId,
      feature: 'text.autoFit',
      detail: '源文本框为缩字适配（normAutofit），字号与行距按显示效果写入，适配开关本身不保留',
      originalValue: `fontScale=${fit.fontScale};lnSpcReduction=${fit.lnSpcReduction}`
    })
  }
  const hasRich =
    rich !== null && rich.some((p) => p.html !== '' || p.align !== null || p.lineSpacingPct !== null || p.lineSpacingPts !== null)

  // 水平对齐取首个显式段落；垂直对齐取文本框 anchor。
  let hAlign = 'left'
  if (rich) {
    for (const p of rich) {
      if (p.align) {
        hAlign = p.align
        break
      }
    }
  }
  // 文本框属性同样走继承链：占位符的锚点与换行多半写在版式/母版的 <a:bodyPr> 里。
  let body: ReturnType<typeof getShapeBodyPrEffective> | null = null
  try {
    body = getShapeBodyPrEffective(pres, shape)
  } catch {
    body = null
  }
  let vAlign = 'top'
  try {
    const anchor = body?.anchor ?? getShapeTextAnchor(shape)
    if (anchor && V_ALIGN_MAP[anchor]) vAlign = V_ALIGN_MAP[anchor]
  } catch {
    /* default top */
  }

  const content: Record<string, unknown> = {
    text: hasRich ? paragraphsToHtml(rich) : rec.text,
    align: [hAlign, vAlign],
    wrap: (() => {
      try {
        return (body?.wrap ?? getShapeTextWrap(shape)) !== 'none'
      } catch {
        return true
      }
    })()
  }
  // 内边距（bodyPr l/t/r/bIns，EMU）：任一边与 Office 默认不同才写，缺失边取默认。
  const margins = body?.margins
  if (margins) {
    const DEFAULT_PAD: [number, number, number, number] = [3.6, 7.2, 3.6, 7.2]
    const sides = [margins.top, margins.right, margins.bottom, margins.left]
    const padding = sides.map((v, i) => (typeof v === 'number' ? Math.round((v / 12700) * 100) / 100 : DEFAULT_PAD[i]))
    if (padding.some((v, i) => Math.abs(v - DEFAULT_PAD[i]) > 0.01)) content.padding = padding
  }
  // 字间距在 PPTD 里是元素级（content.letterSpacing，单位与 spc/100 一致）；
  // 全部文字 run 同值时整体写入，不一致时取出现最多的非零值并记降级。
  const spacings = (rich ?? []).flatMap((p) => p.spacings)
  const nonZero = spacings.filter((v): v is number => typeof v === 'number' && v !== 0)
  if (nonZero.length > 0) {
    const counts = new Map<number, number>()
    for (const v of nonZero) counts.set(v, (counts.get(v) ?? 0) + 1)
    const [dominant] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    content.letterSpacing = Math.round(dominant) / 100
    if (counts.size > 1 || nonZero.length < spacings.length) {
      report.degraded.push({
        page: rec.slideIndex,
        elementId,
        feature: 'text.letterSpacing',
        originalValue: [...new Set(spacings.map((v) => v ?? 0))].join(','),
        fallbackValue: String(content.letterSpacing),
        detail: '各段字间距不一致，PPTD 字间距为元素级，按出现最多的值统一'
      })
    }
  }
  if (rich === null && rec.text !== '') {
    // run 级读不到（非文本形状或库不支持）→ 回落纯文本并记账
    report.degraded.push({
      page: rec.slideIndex,
      elementId,
      feature: 'unknown',
      detail: 'run 级格式读取失败，文本按纯文本落盘（字体/字号/加粗/对齐继承主题默认）'
    })
  }
  try {
    const direction = getShapeTextDirection(shape)
    if (direction === 'eaVert' || direction === 'vert') content.textDirection = 'vertical'
  } catch {
    /* ignore */
  }
  if (fonts) {
    content.fontFamily = {
      latin: fonts.minorLatin ?? fonts.majorLatin ?? 'Calibri',
      ea: fonts.minorEastAsian ?? fonts.majorEastAsian ?? 'Microsoft YaHei'
    }
  }
  return {
    ...baseElement(rec),
    elementId,
    elementType: 'text',
    content
  }
}

function mapShape(
  rec: ReverseShapeRecord,
  pres: PresentationData,
  media: ReverseMediaAsset[],
  report: ImportReport
): Record<string, unknown> {
  const shape = rec.raw as SlideShapeData
  const element: Record<string, unknown> = {
    ...baseElement(rec),
    elementType: 'shape'
  }
  element.shapeName = 'rect'
  const squash = orthographicSquash(shape)
  if (squash) {
    // 正交相机绕 x / y 轴旋转后，平面图形在投影里只是被压扁：按 cos 缩放包围盒（中心不动）。
    const [x, y, w, h] = element.bounds as [number, number, number, number]
    const nw = w * squash.sx
    const nh = h * squash.sy
    element.bounds = [fmtNum(x + (w - nw) / 2), fmtNum(y + (h - nh) / 2), fmtNum(nw), fmtNum(nh)]
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
      feature: 'shape.scene3d',
      detail: '三维旋转（正交相机）按投影压扁包围盒落盘',
      originalValue: squash.raw
    })
  }
  const custom = rec.bounds ? customGeometryOf(shape, rec.bounds.w, rec.bounds.h) : null
  if (custom) {
    element.shapeName = 'custom'
    element.viewBox = custom.viewBox
    element.path = custom.path
  } else {
    try {
      const preset = getShapePreset(shape)
      if (preset) element.shapeName = preset
    } catch {
      /* rect */
    }
  }
  try {
    // 按预设定义的参数序排列；源文件没写的那一项补该预设的默认值。
    const adjustments = getShapeAdjustValues(shape)
    const guides = typeof element.shapeName === 'string' ? PRESET_ADJUST_GUIDES[element.shapeName] : undefined
    if (guides && Object.keys(adjustments).length > 0) {
      element.adjustments = guides.map(([name, fallback]) => (typeof adjustments[name] === 'number' ? adjustments[name] : fallback))
    }
  } catch {
    /* no adjustments */
  }
  const fill = readShapeFill(rec, pres, media, report)
  if (fill) element.fill = fill
  const border = readBorder(shape, pres)
  if (border) element.border = border
  const shadow = readShadow(shape, pres)
  if (shadow) element.shadow = shadow
  return element
}

/**
 * DrawingML custGeom → PPTD custom shape (spec §6.2): every `<a:path>` is scaled from
 * its own coordinate space (`w`/`h`, defaulting to the shape's EMU size) into a viewBox
 * equal to the shape's px size, so the viewBox aspect always matches the bounds.
 * `arcTo` follows ECMA-376 §20.1.9.3: the pen sits on the ellipse at `stAng`, sweeping
 * `swAng` (60000ths of a degree, clockwise in y-down space).
 */
export function customGeometryOf(
  shape: SlideShapeData,
  widthEmu: number,
  heightEmu: number
): { viewBox: [number, number]; path: string } | null {
  let geometry: ReturnType<typeof getShapeCustomGeometry>
  try {
    geometry = getShapeCustomGeometry(shape)
  } catch {
    return null
  }
  if (!geometry || geometry.paths.length === 0 || widthEmu <= 0 || heightEmu <= 0) return null
  const vbW = fmtNum(emuToPx(widthEmu))
  const vbH = fmtNum(emuToPx(heightEmu))
  if (vbW <= 0 || vbH <= 0) return null
  const out: string[] = []
  const n = (v: number): string => String(Math.round(v * 100) / 100)
  for (const geomPath of geometry.paths) {
    const sx = vbW / (geomPath.w && geomPath.w > 0 ? geomPath.w : widthEmu)
    const sy = vbH / (geomPath.h && geomPath.h > 0 ? geomPath.h : heightEmu)
    let cx = 0
    let cy = 0
    let startX = 0
    let startY = 0
    for (const cmd of geomPath.commands) {
      switch (cmd.kind) {
        case 'moveTo':
          cx = startX = cmd.pt.x
          cy = startY = cmd.pt.y
          out.push(`M${n(cx * sx)} ${n(cy * sy)}`)
          break
        case 'lnTo':
          cx = cmd.pt.x
          cy = cmd.pt.y
          out.push(`L${n(cx * sx)} ${n(cy * sy)}`)
          break
        case 'quadBezTo':
          out.push(`Q${n(cmd.pts[0].x * sx)} ${n(cmd.pts[0].y * sy)} ${n(cmd.pts[1].x * sx)} ${n(cmd.pts[1].y * sy)}`)
          cx = cmd.pts[1].x
          cy = cmd.pts[1].y
          break
        case 'cubicBezTo':
          out.push(
            `C${n(cmd.pts[0].x * sx)} ${n(cmd.pts[0].y * sy)} ${n(cmd.pts[1].x * sx)} ${n(cmd.pts[1].y * sy)} ${n(cmd.pts[2].x * sx)} ${n(cmd.pts[2].y * sy)}`
          )
          cx = cmd.pts[2].x
          cy = cmd.pts[2].y
          break
        case 'arcTo': {
          if (cmd.wR <= 0 || cmd.hR <= 0 || cmd.swAng === 0) break
          const st = (cmd.stAng / 60000) * (Math.PI / 180)
          const sw = (cmd.swAng / 60000) * (Math.PI / 180)
          const centerX = cx - cmd.wR * Math.cos(st)
          const centerY = cy - cmd.hR * Math.sin(st)
          const emit = (from: number, span: number): void => {
            const end = from + span
            const ex = centerX + cmd.wR * Math.cos(end)
            const ey = centerY + cmd.hR * Math.sin(end)
            const large = Math.abs(span) > Math.PI ? 1 : 0
            const sweep = span > 0 ? 1 : 0
            out.push(`A${n(cmd.wR * sx)} ${n(cmd.hR * sy)} 0 ${large} ${sweep} ${n(ex * sx)} ${n(ey * sy)}`)
            cx = ex
            cy = ey
          }
          // A full ellipse cannot be one SVG arc (start = end); split it in two.
          if (Math.abs(sw) >= 2 * Math.PI - 1e-9) {
            emit(st, sw / 2)
            emit(st + sw / 2, sw / 2)
          } else {
            emit(st, sw)
          }
          break
        }
        case 'close':
          out.push('Z')
          cx = startX
          cy = startY
          break
      }
    }
  }
  if (out.length === 0) return null
  return { viewBox: [vbW, vbH], path: out.join(' ') }
}

/** `#RRGGBB` + opacity (0–1) → `#RRGGBB` or `#RRGGBBAA`. */
/**
 * 渐变色标颜色。带透明度时须是字面 HEX8：主题色引用（scheme:accent1）无法携带 alpha，
 * 改用读取侧解析出的实际颜色。
 */
function gradientStopColor(stop: { color: string; resolvedColor?: string; opacity?: number }): string {
  const literal = asLiteralColor(stop.color)
  if (typeof stop.opacity !== 'number' || stop.opacity >= 1 || /^#[0-9A-Fa-f]{6}$/.test(literal)) {
    return withAlpha(literal, stop.opacity)
  }
  const resolved = stop.resolvedColor ? asLiteralColor(stop.resolvedColor) : ''
  return /^#[0-9A-Fa-f]{6}$/.test(resolved) ? withAlpha(resolved, stop.opacity) : literal
}

function withAlpha(color: string, opacity: number | null | undefined): string {
  if (typeof opacity !== 'number' || opacity >= 1 || !/^#[0-9A-Fa-f]{6}$/.test(color)) return color
  return `${color}${Math.round(Math.max(0, opacity) * 255).toString(16).padStart(2, '0').toUpperCase()}`
}

/** Linear blend of two `#RRGGBB` colours; `t` = share of `a`. */
function blendHex(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * t + ch(b, i) * (1 - t)))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** Share of foreground ink a preset pattern paints (pctN = N%; hatches ≈ 25%). */
function patternInk(preset: string): number {
  const m = /^pct(\d+)$/.exec(preset)
  if (m) return Number(m[1]) / 100
  if (/^(dk|wd|smGrid|lgGrid|smCheck|lgCheck|solidDmnd|shingle|plaid|sphere|weave|trellis)/.test(preset)) return 0.4
  return 0.25
}

/**
 * The fill the shape actually paints (spec §2.3 R4 effective values): own fill,
 * then theme style reference and placeholder cascade (`getShapeFillEffective`),
 * then `<a:grpFill/>` from the enclosing group. Pattern fills have no PPTD
 * counterpart and become the solid colour they average to (recorded as degraded).
 */
function readShapeFill(
  rec: ReverseShapeRecord,
  pres: PresentationData,
  media: ReverseMediaAsset[],
  report: ImportReport
): Record<string, unknown> | null {
  const shape = rec.raw as SlideShapeData
  let kind: string
  try {
    kind = getShapeFillEffective(pres, shape).kind
  } catch {
    return null
  }
  if (kind === 'inherit' && rec.groupFill) return { type: 'solid', color: rec.groupFill }
  if (kind === 'solid') {
    let color: string | null = null
    try {
      color = getShapeFillColorResolved(pres, shape)
    } catch {
      color = null
    }
    if (!color) {
      try {
        const own = getShapeFill(shape)
        if (own.kind === 'solid') color = asLiteralColor(own.color)
      } catch {
        color = null
      }
    }
    if (!color) return null
    let opacity: number | null = null
    try {
      opacity = getShapeFillOpacity(shape, pres)
    } catch {
      opacity = null
    }
    return { type: 'solid', color: withAlpha(color, opacity) }
  }
  if (kind === 'gradient') {
    try {
      const gradient = getShapeGradientFillEffective(pres, shape) ?? getShapeGradientFill(shape)
      if (!gradient || gradient.stops.length < 2) return null
      const radial = gradient.path !== undefined && gradient.path !== 'linear'
      return {
        type: 'gradient',
        gradientType: radial ? 'radial' : 'linear',
        stops: gradient.stops.map((stop) => ({
          position: Math.min(1, Math.max(0, stop.offset)),
          color: gradientStopColor(stop)
        })),
        ...(!radial && typeof gradient.angleDeg === 'number' ? { angle: ((gradient.angleDeg % 360) + 360) % 360 } : {})
      }
    } catch {
      return null
    }
  }
  if (kind === 'pattern') {
    try {
      const pattern = getShapePatternFill(pres, shape)
      if (!pattern || !/^#[0-9A-Fa-f]{6}$/.test(pattern.foreground) || !/^#[0-9A-Fa-f]{6}$/.test(pattern.background)) return null
      report.degraded.push({
        page: rec.slideIndex,
        elementId: elementIdOf(rec),
        feature: 'shape.patternFill',
        detail: '图案填充按前景与背景的平均色写成纯色',
        originalValue: `${pattern.preset} ${pattern.foreground}/${pattern.background}`
      })
      return { type: 'solid', color: blendHex(pattern.foreground, pattern.background, patternInk(pattern.preset)) }
    } catch {
      return null
    }
  }
  if (kind === 'image') {
    let bytes: Uint8Array | null = null
    try {
      bytes = getShapeImageFillBytes(shape)
    } catch {
      bytes = null
    }
    if (!bytes) return null
    const ext = imageExtOf(bytes)
    const partName = `ppt/media/fill-${rec.slideIndex}-${rec.shapeId}${ext}`
    media.push({ bytes, ext, partName })
    return { type: 'image', src: `media/${partName.split('/').pop()}`, fit: 'fill', partName }
  }
  return null
}

/** The outline the shape actually paints: own `<a:ln>`, then style reference / placeholder cascade. */
function readBorder(shape: SlideShapeData, pres?: PresentationData): Record<string, unknown> | null {
  try {
    const stroke = pres ? getShapeStrokeEffective(pres, shape) : getShapeStroke(shape)
    if (stroke.kind !== 'solid' && stroke.kind !== 'gradient') return null
    const width = typeof stroke.widthEmu === 'number' ? emuToPx(stroke.widthEmu) : 1
    let border: Record<string, unknown>
    if (stroke.kind === 'gradient') {
      const gradient = getShapeStrokeGradient(shape, pres)
      if (!gradient || gradient.stops.length < 2) return null
      const stops = [...gradient.stops].sort((a, b) => a.offset - b.offset)
      border = {
        style: 'solid',
        width,
        color: asLiteralColor(stops[0].color),
        gradient: {
          type: 'gradient',
          gradientType: 'linear',
          stops: stops.map((stop) => ({
            position: Math.min(1, Math.max(0, stop.offset)),
            color: gradientStopColor(stop)
          })),
          ...(typeof gradient.angleDeg === 'number' ? { angle: ((gradient.angleDeg % 360) + 360) % 360 } : {})
        }
      }
    } else {
      border = { style: 'solid', width, color: asLiteralColor(stroke.color) }
    }
    try {
      const dash = getShapeStrokeDash(shape)
      if (dash === 'dash' || dash === 'sysDot') border.style = dash === 'dash' ? 'dash' : 'dot'
    } catch {
      /* leave solid */
    }
    return border
  } catch {
    return null
  }
}

/**
 * `<a:scene3d>` 正交相机（orthographic*）的旋转：平面图形投影后只沿 x / y 方向按 cos 压缩。
 * 无旋转、带 rev 或透视相机时返回 null（透视需要真正的三维投影，不做近似）。
 */
function orthographicSquash(shape: SlideShapeData): { sx: number; sy: number; raw: string } | null {
  let xml = ''
  try {
    xml = getShapeXmlString(shape)
  } catch {
    return null
  }
  const camera = /<a:camera\s+prst="(orthographic\w*)"[^>]*>\s*<a:rot\s+([^>]*)\/>/.exec(xml)
  if (!camera) return null
  const attr = (name: string): number => Number(new RegExp(`${name}="(-?\\d+)"`).exec(camera[2])?.[1] ?? 0)
  const lat = attr('lat') / 60000
  const lon = attr('lon') / 60000
  if (attr('rev') !== 0 || (lat === 0 && lon === 0)) return null
  const sy = Math.abs(Math.cos((lat * Math.PI) / 180))
  const sx = Math.abs(Math.cos((lon * Math.PI) / 180))
  if (sx < 0.05 || sy < 0.05) return null
  return { sx, sy, raw: `${camera[1]} lat=${fmtNum(lat)} lon=${fmtNum(lon)}` }
}

/** First outer shadow the shape paints (own effects or theme effect style), as a PPTD Shadow. */
function readShadow(shape: SlideShapeData, pres: PresentationData): Record<string, unknown> | null {
  try {
    const outer = getShapeEffectsEffective(pres, shape).find((e) => e.kind === 'outerShdw')
    if (!outer || outer.kind !== 'outerShdw') return null
    const rad = (outer.angleDeg * Math.PI) / 180
    const dist = emuToPx(outer.distEmu)
    const round = (n: number): number => Math.round(n * 100) / 100
    const color = asLiteralColor(outer.color)
    return {
      blur: emuToPx(outer.blurEmu),
      color: withAlpha(color, outer.opacity),
      ...(dist > 0 ? { offset: [round(Math.cos(rad) * dist), round(Math.sin(rad) * dist)] } : {})
    }
  } catch {
    return null
  }
}

/** True when the shape paints a fill or an outline of its own. */
function hasVisibleSurface(rec: ReverseShapeRecord, pres: PresentationData): boolean {
  const shape = rec.raw as SlideShapeData
  try {
    const kind = getShapeFillEffective(pres, shape).kind
    if (kind !== 'none' && kind !== 'inherit') return true
    if (kind === 'inherit' && rec.groupFill) return true
  } catch {
    return true
  }
  try {
    return getShapeStrokeEffective(pres, shape).kind === 'solid'
  } catch {
    return true
  }
}
/** Reverse dialect colours are literals only: `#RRGGBB` / `#RRGGBBAA` or `scheme:<token>`. */
function asLiteralColor(raw: string): string {
  if (raw.startsWith('#') || raw.startsWith('scheme:')) return raw
  return `#${raw.replace(/^#/, '')}`.toUpperCase()
}

/** File extension from the image's magic bytes; the source part name is the fallback. */
export function imageExtOf(bytes: Uint8Array, partName: string | null = null): string {
  const at = (i: number): number => bytes[i] ?? -1
  const ascii = (start: number, text: string): boolean => [...text].every((ch, i) => at(start + i) === ch.charCodeAt(0))
  if (at(0) === 0x89 && ascii(1, 'PNG')) return '.png'
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return '.jpg'
  if (ascii(0, 'GIF8')) return '.gif'
  if (ascii(0, 'BM')) return '.bmp'
  if ((ascii(0, 'II') && at(2) === 0x2a && at(3) === 0) || (ascii(0, 'MM') && at(2) === 0 && at(3) === 0x2a)) return '.tiff'
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return '.webp'
  if (at(0) === 0x01 && at(1) === 0 && at(2) === 0 && at(3) === 0 && ascii(40, ' EMF')) return '.emf'
  if ((at(0) === 0xd7 && at(1) === 0xcd && at(2) === 0xc6 && at(3) === 0x9a) || (at(0) === 0x01 && at(1) === 0 && at(2) === 0x09 && at(3) === 0)) {
    return '.wmf'
  }
  const head = new TextDecoder().decode(bytes.subarray(0, 256)).trimStart()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return '.svg'
  const fromPart = partName ? /\.[A-Za-z0-9]{2,5}$/.exec(partName)?.[0]?.toLowerCase() : undefined
  return fromPart ?? '.bin'
}

function mapImage(
  rec: ReverseShapeRecord,
  media: ReverseMediaAsset[],
  report: ImportReport
): Record<string, unknown> | Page['elements'][number] {
  const shape = rec.raw as SlideShapeData
  const bytes = (() => {
    try {
      return getShapeImageBytes(shape) ?? getShapeImageFillBytes(shape)
    } catch {
      return null
    }
  })()
  if (!bytes) {
    return placeholderFor(rec, 'unknown', `图片缺失：${rec.originalName || '未命名'}`)
  }
  const ext = imageExtOf(bytes, (() => {
    try {
      return getShapeImagePartName(shape)
    } catch {
      return null
    }
  })())
  const partName = `ppt/media/image-${rec.slideIndex}-${rec.shapeId}${ext}`
  media.push({ bytes, ext, partName })
  const element: Record<string, unknown> = {
    ...baseElement(rec),
    elementType: 'image',
    src: `media/${partName.split('/').pop()}`,
    partName
  }
  try {
    const crop = getShapeImageCrop(shape)
    if (crop) {
      element.crop = {
        left: crop.left ?? 0,
        top: crop.top ?? 0,
        right: crop.right ?? 0,
        bottom: crop.bottom ?? 0
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const opacity = getShapeImageOpacity(shape)
    if (typeof opacity === 'number' && opacity < 1) element.opacity = opacity
  } catch {
    /* ignore */
  }
  return element
}

function mapTable(
  rec: ReverseShapeRecord,
  pres: PresentationData,
  report: ImportReport
): Record<string, unknown> {
  const shape = rec.raw as SlideShapeData
  const element: Record<string, unknown> = {
    ...baseElement(rec),
    elementType: 'table'
  }
  try {
    const dims = getTableDimensions(shape)
    const rowHeights = getTableRowHeights(shape)
    const colWidths = getTableColumnWidths(shape)
    const totalH = rec.bounds?.h ?? rowHeights.reduce((a, b) => a + b, 0)
    const totalW = rec.bounds?.w ?? colWidths.reduce((a, b) => a + b, 0)
    element.columnWidths = colWidths.map((w) => (totalW > 0 ? w / totalW : 1 / colWidths.length))
    element.rowHeights = rowHeights.map((h) => (totalH > 0 ? h / totalH : 1 / rowHeights.length))
    const rows: Record<string, unknown>[][] = []
    // Cells covered by a merge anchor are omitted from `rows` (spec §6.6).
    const covered = new Set<string>()
    for (let r = 0; r < dims.rows; r++) {
      const row: Record<string, unknown>[] = []
      for (let c = 0; c < dims.cols; c++) {
        if (covered.has(`${r},${c}`)) continue
        const cell = getTableCell(shape, r, c)
        const cellObj: Record<string, unknown> = { text: '' }
        try {
          const span = getTableCellSpan(cell)
          const rowSpan = span.rowSpan && span.rowSpan > 1 ? span.rowSpan : 1
          const colSpan = span.gridSpan && span.gridSpan > 1 ? span.gridSpan : 1
          if (rowSpan > 1) cellObj.rowSpan = rowSpan
          if (colSpan > 1) cellObj.colSpan = colSpan
          for (let dr = 0; dr < rowSpan; dr++) {
            for (let dc = 0; dc < colSpan; dc++) {
              if (dr !== 0 || dc !== 0) covered.add(`${r + dr},${c + dc}`)
            }
          }
        } catch {
          /* ignore */
        }
        try {
          cellObj.text = getTableCellText(cell)
        } catch {
          /* ignore */
        }
        try {
          const paras = getTableCellParagraphs(cell)
          if (paras.length > 0) {
            const parts: string[] = []
            for (const el of paras[0].elements) {
              if (el.kind === 'r' || el.kind === 'fld') parts.push(el.text ?? '')
            }
            if (parts.length > 0) cellObj.text = parts.join('')
          }
        } catch {
          /* keep flat text */
        }
        // 显式单元格填充（表头实色块等）：导出端消费 cell.fill 还原
        try {
          const fill = getTableCellFill(cell)
          if (fill) {
            cellObj.fill = { type: 'solid', color: fill.startsWith('scheme:') || fill.startsWith('#') ? fill : `#${fill}` }
          }
        } catch {
          /* ignore */
        }
        // 显式对齐：水平经 <p style="text-align">（richtext → ParagraphSpec.align），
        // 垂直经 cell.align[1]（导出端 setTableCellAnchor）
        try {
          const algn = getTableCellAlignment(cell)
          const anchor = getTableCellAnchor(cell)
          const hMap: Record<string, string> = { l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'distributed', justLow: 'justify', thaiDist: 'distributed' }
          const h = algn ? hMap[algn] : undefined
          const v = anchor === 'center' ? 'middle' : anchor === 'bottom' ? 'bottom' : anchor === 'top' ? 'top' : undefined
          if (h && h !== 'left' && typeof cellObj.text === 'string' && cellObj.text !== '' && !cellObj.text.includes('<')) {
            cellObj.text = `<p style="text-align:${h}">${escapeHtml(cellObj.text)}</p>`
          }
          if (h || v) cellObj.align = [h ?? 'left', v ?? 'middle']
        } catch {
          /* ignore */
        }
        row.push(cellObj)
      }
      rows.push(row)
    }
    element.rows = rows
  } catch (err) {
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
      feature: 'unknown',
      detail: `表格几何/单元格读取失败：${(err as Error).message}`
    })
  }
  try {
    const styleId = getTableStyleId(shape)
    if (styleId) {
      element.builtinStyle = { id: styleId }
      report.degraded.push({
        page: rec.slideIndex,
        elementId: elementIdOf(rec),
        feature: 'table.styleId',
        detail: '内置表格样式 id 记入 builtinStyle；显式单元格填充/对齐已按字面量还原，样式表派生的条纹与首行强调不还原',
        originalValue: styleId
      })
    }
  } catch {
    /* ignore */
  }
  void pres
  return element
}

const ARROW_MAP: Record<string, string> = { triangle: 'arrow', arrow: 'arrow', stealth: 'stealth', diamond: 'diamond', oval: 'oval' }

/**
 * Connector → straight PPTD line. The endpoints follow the bounds diagonal
 * selected by the flip flags; flip is folded into `points` so the engine
 * does not apply it twice.
 */
function mapLine(rec: ReverseShapeRecord, pres: PresentationData, report: ImportReport): Record<string, unknown> {
  const shape = rec.raw as SlideShapeData
  const base = baseElement(rec)
  const [, , w, h] = base.bounds as [number, number, number, number]
  const vw = Math.max(w, 1)
  const vh = Math.max(h, 1)
  const fx = rec.flip.horizontal
  const fy = rec.flip.vertical
  const start = [fx ? w : 0, fy ? h : 0]
  const end = [fx ? 0 : w, fy ? 0 : h]
  const element: Record<string, unknown> = {
    ...base,
    flip: [false, false],
    elementType: 'line',
    viewBox: [fmtNum(vw), fmtNum(vh)],
    points: `${fmtNum(start[0])},${fmtNum(start[1])} ${fmtNum(end[0])},${fmtNum(end[1])}`
  }
  const border = readBorder(shape, pres)
  if (border) element.border = border
  const arrows: Array<string | null> = []
  for (const end of ['head', 'tail'] as const) {
    try {
      const arrow = getShapeStrokeArrow(shape, end)
      arrows.push(arrow && ARROW_MAP[arrow.type] ? ARROW_MAP[arrow.type] : null)
    } catch {
      arrows.push(null)
    }
  }
  if (arrows.some((a) => a !== null)) element.arrow = arrows
  let preset: string | null = null
  try {
    preset = getShapePreset(shape)
  } catch {
    preset = null
  }
  if (preset && preset !== 'line' && preset !== 'straightConnector1') {
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
      feature: 'unknown',
      detail: '折线/曲线连接线按首尾直线落盘',
      originalValue: preset
    })
  }
  return element
}

const CHART_KINDS = new Set(['bar', 'column', 'line', 'area', 'pie', 'doughnut'])

interface ChartPaint {
  series: Array<{ color?: string; points: Map<number, string>; formatCode?: string }>
}

/** Paint of one `<c:spPr>`: solid, pattern (blended to the ink share), or the first gradient stop. */
function chartPaintOf(pres: PresentationData, spPr: string | undefined): string | undefined {
  if (!spPr) return undefined
  const body = spPr.replace(/<a:ln\b[\s\S]*?<\/a:ln>/g, '')
  const solid = /<a:solidFill>([\s\S]*?)<\/a:solidFill>/.exec(body)?.[1]
  if (solid) return drawingColorOf(pres, solid)
  const pattern = /<a:pattFill\b[^>]*prst="(\w+)"[^>]*>([\s\S]*?)<\/a:pattFill>/.exec(body)
  if (pattern) {
    const fg = drawingColorOf(pres, /<a:fgClr>([\s\S]*?)<\/a:fgClr>/.exec(pattern[2])?.[1] ?? '')
    const bg = drawingColorOf(pres, /<a:bgClr>([\s\S]*?)<\/a:bgClr>/.exec(pattern[2])?.[1] ?? '')
    if (fg && bg) return blendHex(fg, bg, patternInk(pattern[1]))
    return fg ?? bg
  }
  const stop = /<a:gradFill\b[\s\S]*?<a:gs\b[^>]*>([\s\S]*?)<\/a:gs>/.exec(body)?.[1]
  return stop ? drawingColorOf(pres, stop) : undefined
}

/**
 * Series and data-point paints read from the chart part itself: theme colours
 * with transforms, pattern fills and gradients the parsed chart spec leaves
 * unresolved. Returns null when the part cannot be located.
 */
function chartPaintsOf(pres: PresentationData, slidePart: string, shape: SlideShapeData): ChartPaint | null {
  try {
    const rid = /<c:chart\b[^>]*\br:id="([^"]+)"/.exec(getShapeXmlString(shape))?.[1]
    if (!rid) return null
    const part = slidePart.startsWith('/') ? slidePart : `/${slidePart}`
    const dir = part.slice(0, part.lastIndexOf('/'))
    const relsBytes = readPackagePart(pres, `${dir}/_rels/${part.slice(dir.length + 1)}.rels`)
    if (!relsBytes) return null
    const rels = new TextDecoder().decode(relsBytes)
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${rid}"`))
    const target = rel ? /Target="([^"]+)"/.exec(rel)?.[1] : undefined
    if (!target) return null
    const segments = (target.startsWith('/') ? target : `${dir}/${target}`).split('/')
    const resolved: string[] = []
    for (const seg of segments) {
      if (seg === '..') resolved.pop()
      else if (seg !== '.' && seg !== '') resolved.push(seg)
    }
    const chartBytes = readPackagePart(pres, `/${resolved.join('/')}`)
    if (!chartBytes) return null
    const xml = new TextDecoder().decode(chartBytes)
    const series = [...xml.matchAll(/<c:ser>([\s\S]*?)<\/c:ser>/g)].map((m) => {
      const ser = m[1]
      const points = new Map<number, string>()
      for (const pt of ser.matchAll(/<c:dPt>([\s\S]*?)<\/c:dPt>/g)) {
        const idx = Number(/<c:idx val="(\d+)"/.exec(pt[1])?.[1])
        const color = chartPaintOf(pres, /<c:spPr>([\s\S]*?)<\/c:spPr>/.exec(pt[1])?.[1])
        if (Number.isInteger(idx) && color) points.set(idx, color)
      }
      const own = ser.replace(/<c:dPt>[\s\S]*?<\/c:dPt>/g, '').replace(/<c:dLbls>[\s\S]*?<\/c:dLbls>/g, '')
      const color = chartPaintOf(pres, /<c:spPr>([\s\S]*?)<\/c:spPr>/.exec(own)?.[1])
      const formatCode = /<c:val>[\s\S]*?<c:formatCode>([^<]*)<\/c:formatCode>/.exec(ser)?.[1]
      return { ...(color ? { color } : {}), points, ...(formatCode ? { formatCode } : {}) }
    })
    return { series }
  } catch {
    return null
  }
}

/** Excel number format subset (§6.7 numberFormat) a label format code maps to. */
function labelNumberFormat(code: string | undefined): string | undefined {
  if (!code) return undefined
  const trimmed = code.trim()
  return ['0', '0.0', '0%', '0.0%', '#,##0', '0.0E+00'].includes(trimmed) ? trimmed : undefined
}

/**
 * 原生图表 → PPTD chart（§6.7）。覆盖柱 / 条 / 折线 / 面积（含组合与堆叠）、饼与环形；
 * 其余类型（散点、雷达、股价、曲面、三维等）返回 null，由调用方落占位。
 * 类目列名固定为「类别」，系列列名取系列名（重名追加序号）。
 */
function mapChart(
  rec: ReverseShapeRecord,
  pres: PresentationData,
  slidePart: string,
  report: ImportReport
): Record<string, unknown> | null {
  let spec: ReturnType<typeof getShapeChartSpec> = null
  try {
    spec = getShapeChartSpec(rec.raw as SlideShapeData)
  } catch {
    return null
  }
  if (!spec || !CHART_KINDS.has(spec.kind) || spec.series.length === 0) return null
  const s = spec as typeof spec & {
    grouping?: string
    gapWidthPct?: number
    holeSizePct?: number
    firstSliceAngleDeg?: number
    legend?: { position: string | null }
    view3D?: unknown
    valueAxisHidden?: boolean
    categoryAxisHidden?: boolean
    valueAxisMajorGridlines?: boolean
  }
  if (s.view3D) return null
  const src = spec
  const paints = chartPaintsOf(pres, slidePart, rec.raw as SlideShapeData)
  const seriesColor = (i: number): string | undefined => {
    const own = src.series[i]?.color
    return paints?.series[i]?.color ?? (own ? asLiteralColor(own) : undefined)
  }
  const categoryCol = '类别'
  const used = new Set([categoryCol])
  const colNames = src.series.map((series, i) => {
    const base = series.name.trim() || `系列${i + 1}`
    let name = base
    for (let n = 2; used.has(name); n++) name = `${base}${n}`
    used.add(name)
    return name
  })
  const rows = src.categories.map((category, r) => [
    category,
    ...src.series.map((series) => {
      const v = series.values[r]
      return typeof v === 'number' && Number.isFinite(v) ? v : null
    })
  ])
  const element: Record<string, unknown> = {
    ...baseElement(rec),
    elementType: 'chart',
    data: { cols: [categoryCol, ...colNames], rows }
  }
  const labels = src.series[0]?.dataLabels ?? src.dataLabels
  const hiddenPointLabels = src.series.some((series) =>
    (series.pointDataLabels ?? []).some((p) => p !== null && !p.showValue && !p.showPercent && !p.showCategory)
  )
  const showLabels = labels && !hiddenPointLabels ? labels.showValue || labels.showPercent || labels.showCategory : false
  const labelConfig = (content?: string): Record<string, unknown> => {
    const out: Record<string, unknown> = { show: true }
    if (content) out.content = content
    const style = (labels as { textStyle?: { sizePt?: number; color?: string; bold?: boolean } } | undefined)?.textStyle
    if (typeof style?.sizePt === 'number') out.fontSize = fmtNum(style.sizePt)
    if (style?.bold) out.bold = true
    const format = labelNumberFormat(paints?.series[0]?.formatCode)
    if (format) out.numberFormat = format
    return out
  }
  if (hiddenPointLabels) {
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
      feature: 'unknown',
      detail: '数据标签逐点显隐无法表达，标签未落盘'
    } as ImportReport['degraded'][number])
  }
  if (src.kind === 'pie' || src.kind === 'doughnut') {
    const first = src.series[0]
    const pie: Record<string, unknown> = {
      type: 'pie',
      name: colNames[0],
      encode: { category: categoryCol, value: colNames[0] }
    }
    if (src.kind === 'doughnut') pie.innerRadius = Math.min(0.9, Math.max(0.1, (s.holeSizePct ?? 50) / 100))
    if (typeof s.firstSliceAngleDeg === 'number' && s.firstSliceAngleDeg !== 0) pie.startAngle = s.firstSliceAngleDeg
    const base = seriesColor(0)
    const points = src.categories.map((_c, i) => {
      const own = first.pointColors?.[i]
      return paints?.series[0]?.points.get(i) ?? (typeof own === 'string' ? asLiteralColor(own) : undefined)
    })
    if (points.every((c) => c !== undefined)) pie.fill = points
    else if (points.some((c) => c !== undefined)) pie.fill = points.map((c) => c ?? base ?? '#808080')
    else if (base) pie.fill = base
    if (labels && showLabels) {
      pie.dataLabels = labelConfig(
        labels.showPercent ? 'percentage' : labels.showCategory && !labels.showValue ? 'category' : 'value'
      )
    }
    element.series = [pie]
  } else {
    const horizontal = src.kind === 'bar'
    const stack = s.grouping === 'stacked' ? 'value' : s.grouping === 'percentStacked' ? 'percent' : undefined
    element.series = src.series.map((series, i) => {
      const kind = series.chartKind ?? src.kind
      const type = kind === 'bar' || kind === 'column' ? 'bar' : kind
      const out: Record<string, unknown> = {
        type,
        name: colNames[i],
        encode: horizontal ? { x: colNames[i], y: categoryCol } : { x: categoryCol, y: colNames[i] }
      }
      const color = seriesColor(i)
      if (color) out[type === 'bar' ? 'fill' : 'lineColor'] = color
      if (stack && type !== 'line') out.stack = stack
      if (type !== 'bar' && series.smooth) out.smooth = true
      const own = series.dataLabels ?? src.dataLabels
      if (!hiddenPointLabels && own && (own.showValue || own.showPercent || own.showCategory)) out.dataLabels = labelConfig()
      return out
    })
    const category: Record<string, unknown> = { type: 'category' }
    if (s.categoryAxisHidden) category.show = false
    const value: Record<string, unknown> = {}
    const axis = src.valueAxis
    if (typeof axis?.min === 'number') value.min = axis.min
    if (typeof axis?.max === 'number') value.max = axis.max
    if (s.valueAxisHidden) value.show = false
    if (s.valueAxisMajorGridlines === false) value.gridLine = false
    const categoryAxis = horizontal || Object.keys(category).length > 1 ? category : undefined
    const valueAxis = Object.keys(value).length > 0 ? value : undefined
    if (horizontal) {
      if (categoryAxis) element.yAxis = categoryAxis
      if (valueAxis) element.xAxis = valueAxis
    } else {
      if (categoryAxis) element.xAxis = categoryAxis
      if (valueAxis) element.yAxis = valueAxis
    }
    if (typeof s.gapWidthPct === 'number' && s.gapWidthPct >= 0) {
      element.barWidth = fmtNum(Math.min(1, 100 / (100 + s.gapWidthPct)))
    }
  }
  if (src.title) element.title = src.title
  element.legend = s.legend ? s.legend.position !== null : false
  if (src.series.some((series) => series.secondaryAxis)) {
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
      feature: 'unknown',
      detail: '次坐标轴系列并入主坐标轴落盘'
    } as ImportReport['degraded'][number])
  }
  return element
}

function fmtNum(v: number): number {
  return Math.round(v * 100) / 100
}

/* ------------------------------------------------------------------ *
 * 背景继承链（slide → layout → master）
 * ------------------------------------------------------------------ */

interface BackgroundSource {
  bg: SlideBackground
  solidColor: string | null
  gradient: { stops: ReadonlyArray<{ offset: number; color: string }> } | null
  imageBytes: Uint8Array | null
  level: 'slide' | 'layout' | 'master'
}

/** 取 slide → layout → master 链上第一个显式背景；inherit 或未设置继续往上走。 */
function resolveEffectiveBackground(rawSlide: SlideData, pres: PresentationData): BackgroundSource | null {
  let layout: SlideLayoutData | null = null
  try {
    layout = getSlideLayout(rawSlide)
  } catch {
    layout = null
  }

  const slideBg = (() => {
    try {
      return getSlideBackground(rawSlide)
    } catch {
      return { kind: 'inherit' } as SlideBackground
    }
  })()

  const readLevel = (
    bg: SlideBackground,
    gradient: BackgroundSource['gradient'],
    imageBytes: Uint8Array | null,
    level: BackgroundSource['level']
  ): BackgroundSource | null => {
    if (bg.kind === 'solid') {
      return { bg, solidColor: bg.color, gradient, imageBytes, level }
    }
    if (bg.kind === 'gradient') {
      if (gradient && gradient.stops.length > 0) {
        return { bg, solidColor: null, gradient, imageBytes, level }
      }
      return null // 读不出 stops 的渐变当未设置，继续往上
    }
    if (bg.kind === 'image') {
      if (imageBytes) return { bg, solidColor: null, gradient, imageBytes, level }
      return null
    }
    return null // inherit / pattern / unknown → 往上
  }

  // slide 层
  if (slideBg.kind !== 'inherit') {
    let gradient: BackgroundSource['gradient'] = null
    let imageBytes: Uint8Array | null = null
    try {
      if (slideBg.kind === 'gradient') {
        const g = getSlideBackgroundGradientFill(rawSlide)
        if (g) gradient = { stops: g.stops.map((s) => ({ offset: s.offset, color: String(s.color) })) }
      } else if (slideBg.kind === 'image') {
        imageBytes = getSlideBackgroundImageBytes(rawSlide)
      }
    } catch {
      /* fall through */
    }
    const src = readLevel(slideBg, gradient, imageBytes, 'slide')
    if (src) return src
  }

  // layout 层
  if (layout) {
    let layoutBg: SlideBackground | null = null
    try {
      layoutBg = getSlideLayoutBackground(layout)
    } catch {
      layoutBg = null
    }
    if (layoutBg && layoutBg.kind !== 'inherit') {
      let gradient: BackgroundSource['gradient'] = null
      let imageBytes: Uint8Array | null = null
      try {
        if (layoutBg.kind === 'gradient') {
          const g = getSlideLayoutBackgroundGradientFill(layout)
          if (g) gradient = { stops: g.stops.map((s) => ({ offset: s.offset, color: String(s.color) })) }
        } else if (layoutBg.kind === 'image') {
          imageBytes = getSlideLayoutBackgroundImageBytes(pres, layout)
        }
      } catch {
        /* fall through */
      }
      const src = readLevel(layoutBg, gradient, imageBytes, 'layout')
      if (src) return src
    }

    // master 层
    let masterBg: SlideBackground | null = null
    try {
      masterBg = getSlideMasterBackground(pres, layout)
    } catch {
      masterBg = null
    }
    if (masterBg && masterBg.kind !== 'inherit') {
      let gradient: BackgroundSource['gradient'] = null
      let imageBytes: Uint8Array | null = null
      try {
        if (masterBg.kind === 'gradient') {
          const g = getSlideMasterBackgroundGradientFill(pres, layout)
          if (g) gradient = { stops: g.stops.map((s) => ({ offset: s.offset, color: String(s.color) })) }
        } else if (masterBg.kind === 'image') {
          imageBytes = getSlideMasterBackgroundImageBytes(pres, layout)
        }
      } catch {
        /* fall through */
      }
      const src = readLevel(masterBg, gradient, imageBytes, 'master')
      if (src) return src
    }
  }
  return null
}

function applyBackgroundChain(
  rawSlide: SlideData,
  pres: PresentationData,
  slideIndex: number,
  page: Page,
  media: ReverseMediaAsset[],
  report: ImportReport
): void {
  let src: BackgroundSource | null = null
  try {
    src = resolveEffectiveBackground(rawSlide, pres)
  } catch {
    src = null
  }
  if (!src) return
  if (src.solidColor !== null) {
    page.background = { type: 'solid', color: asLiteralColor(src.solidColor) }
  } else if (src.gradient) {
    page.background = {
      type: 'gradient',
      gradientType: 'linear',
      stops: src.gradient.stops.map((s) => ({ position: s.offset, color: asLiteralColor(s.color) }))
    }
  } else if (src.imageBytes) {
    const ext = imageExtOf(src.imageBytes)
    const partName = `ppt/media/bg-${slideIndex}-${src.level}${ext}`
    media.push({ bytes: src.imageBytes, ext, partName })
    page.background = { type: 'image', src: `media/${partName.split('/').pop()}`, partName }
  }
  if (src.level !== 'slide') {
    report.degraded.push({
      page: slideIndex,
      elementId: null,
      feature: 'unknown',
      detail: `页面背景继承自${src.level === 'layout' ? '版式' : '母版'}（slide 未显式设置），已按最终生效值落盘`
    })
  }
}

/* ------------------------------------------------------------------ *
 * graphicFrame 细分识别（SmartArt / OLE / 3D / 未知）
 * ------------------------------------------------------------------ */

/** ECMA-376 a:graphicData URI → dropped 通道的 originalType。 */
const GRAPHIC_DATA_URI_TYPES: ReadonlyArray<[uriFragment: string, type: 'smartArt' | 'chart' | 'ole' | 'object3d']> = [
  ['drawingml/2006/diagram', 'smartArt'],
  ['drawingml/2006/chart', 'chart'],
  ['oleobject', 'ole'],
  ['drawingml/2006/3d', 'object3d']
]

/**
 * 从 graphicFrame（或非表/图的形状）XML 里读出 graphicData 的 URI，
 * 归类到 dropped 通道；oleObj / p:oleObj 与 picture 内的 media 也在这里分流。
 * 返回 null 表示识别不出（调用方走 unknown）。
 */
function classifyUnhandledShape(shape: SlideShapeData, kind: ReverseShapeRecord['kind']): {
  originalType: 'chart' | 'smartArt' | 'group' | 'media' | 'ole' | 'object3d' | 'unknown'
  reason: string
} | null {
  let xml = ''
  try {
    xml = getShapeXmlString(shape)
  } catch {
    xml = ''
  }
  if (xml !== '') {
    const uriMatch = /a:graphicData[^>]*\suri="([^"]+)"/.exec(xml)
    if (uriMatch) {
      const uri = uriMatch[1]
      for (const [fragment, type] of GRAPHIC_DATA_URI_TYPES) {
        if (uri.includes(fragment)) {
          return { originalType: type, reason: `graphicData URI ${uri} 不映射为 PPTD 元素` }
        }
      }
      return { originalType: 'unknown', reason: `graphicData URI ${uri} 未建模` }
    }
    if (/<p:oleObj[\s>]|<p:graphicFrame[^>]*>[\s\S]*oleObj/.test(xml)) {
      return { originalType: 'ole', reason: 'OLE 嵌入对象不映射为 PPTD 元素' }
    }
    if (/<p:sp[^>]*>[\s\S]*scene3d|sp3d/.test(xml)) {
      return { originalType: 'object3d', reason: '三维图形不映射为 PPTD 元素' }
    }
  }
  try {
    const media = getShapeMedia(shape)
    if (media) {
      return { originalType: 'media', reason: `媒体剪辑（${media.kind}）不映射为 PPTD 元素` }
    }
  } catch {
    /* not media */
  }
  if (kind === 'graphicFrame') {
    return { originalType: 'unknown', reason: 'graphicFrame 无 graphicData URI，无法归类' }
  }
  return null
}

/* ------------------------------------------------------------------ *
 * Page-level assembly
 * ------------------------------------------------------------------ */

function animationTriggerOf(value: unknown): Animation['trigger'] | undefined {
  if (value === 'click' || value === 'onClick') return 'onClick'
  if (value === 'withPrevious' || value === 'afterPrevious') return value
  return undefined
}

function mapPage(
  slide: ReverseSlideRecord,
  pres: PresentationData,
  fonts: ReverseReadResult['fonts'],
  media: ReverseMediaAsset[],
  report: ImportReport
): Page {
  const page: Page = {
    elements: []
  }
  if (slide.hidden) page.hidden = true
  if (slide.layoutRef) {
    page.layoutRef = {
      partName: slide.layoutRef.partName,
      ...(slide.layoutRef.name !== undefined ? { name: slide.layoutRef.name } : {}),
      ...(slide.layoutRef.type !== undefined ? { type: slide.layoutRef.type } : {})
    }
  }
  if (slide.notes !== null && slide.notes !== '') page.notes = slide.notes

  // background — slide → layout → master 链，取最终生效的背景
  const rawSlide = slide.raw as SlideData
  applyBackgroundChain(rawSlide, pres, slide.slideIndex, page, media, report)

  // transition
  try {
    const transition = getSlideTransition(rawSlide)
    if (transition && transition.effect !== 'none') {
      page.transition = {
        effect: transition.effect,
        ...(transition.preset !== undefined ? { preset: transition.preset } : {})
      } as Page['transition']
    }
  } catch {
    /* no transition */
  }

  // elements
  const usedElementIds = new Set<string>()
  const animationTargets = new Map<number, string>()
  for (const rec of slide.shapes) {
    const elementStart = page.elements.length
    const droppedStart = report.dropped.length
    const degradedStart = report.degraded.length
    try {
      if (rec.bounds === null) {
        ensurePlaceholder(page, rec, 'unknown', report, '形状无可用几何（own / layout / master 三链都缺 <a:xfrm>）')
        continue
      }
      const rawShape = rec.raw as SlideShapeData
      if (isTableShape(rawShape)) {
        page.elements.push(mapTable(rec, pres, report) as Page['elements'][number])
        continue
      }
      if (isChartShape(rawShape)) {
        const chart = mapChart(rec, pres, slide.partName, report)
        if (chart) page.elements.push(chart as Page['elements'][number])
        else ensurePlaceholder(page, rec, 'chart', report, '该类型的原生图表不映射为 PPTD 元素')
        continue
      }
      switch (rec.kind) {
        case 'shape': {
          // Distinguish preset shapes from text boxes: both come back with
          // kind='shape' from getShapeKind; only the latter maps to PPTD `text`.
          if (isShapeTextBox(rawShape)) {
            page.elements.push(mapText(rec, pres, fonts, report) as Page['elements'][number])
            break
          }
          let customLost = false
          try {
            customLost = getShapeCustomGeometry(rawShape) !== null &&
              (rec.bounds === null || customGeometryOf(rawShape, rec.bounds.w, rec.bounds.h) === null)
          } catch {
            customLost = false
          }
          if (customLost) {
            report.degraded.push({
              page: rec.slideIndex,
              elementId: elementIdOf(rec),
              feature: 'unknown',
              detail: '自定义几何形状（custGeom）路径无法换算，按 rect 落盘'
            })
          }
          // PPTD shape carries no text (spec §6.2): a preset shape with text
          // becomes Shape + an overlaid Text sharing the same bounds.
          if (rec.text.trim() !== '') {
            const textId = `${elementIdOf(rec)}-text`
            if (hasVisibleSurface(rec, pres)) {
              page.elements.push(mapShape(rec, pres, media, report) as Page['elements'][number])
              report.degraded.push({
                page: rec.slideIndex,
                elementId: textId,
                feature: 'unknown',
                detail: '形状内嵌文字拆为 Shape + 叠放 Text（同一 bounds），二者在 PPTD 中各自独立编辑'
              })
            }
            page.elements.push(mapText(rec, pres, fonts, report, textId) as Page['elements'][number])
            break
          }
          page.elements.push(mapShape(rec, pres, media, report) as Page['elements'][number])
          break
        }
        case 'connector':
          page.elements.push(mapLine(rec, pres, report) as Page['elements'][number])
          break
        case 'graphicFrame': {
          // 表/图已在上面分流；其余 graphicFrame（SmartArt/ole/未知）走 dropped + 占位
          const cls = classifyUnhandledShape(rawShape, rec.kind)
          ensurePlaceholder(
            page,
            rec,
            cls?.originalType ?? 'unknown',
            report,
            cls?.reason ?? 'graphicFrame 无法归类'
          )
          break
        }
        case 'picture': {
          // 带媒体剪辑的 picture 不进 image 通道，走 dropped + 占位
          const cls = classifyUnhandledShape(rawShape, rec.kind)
          if (cls && cls.originalType === 'media') {
            ensurePlaceholder(page, rec, 'media', report, cls.reason)
          } else {
            page.elements.push(mapImage(rec, media, report) as Page['elements'][number])
          }
          break
        }
        default: {
          const textBox = isShapeTextBox(rawShape)
          if (textBox || rec.text !== '') {
            page.elements.push(mapText(rec, pres, fonts, report) as Page['elements'][number])
          } else {
            page.elements.push(mapShape(rec, pres, media, report) as Page['elements'][number])
          }
        }
      }
    } catch (err) {
      ensurePlaceholder(page, rec, 'unknown', report, `形状映射抛错：${(err as Error).message}`)
    } finally {
      for (let index = elementStart; index < page.elements.length; index += 1) {
        const element = page.elements[index]
        const baseId = element.elementId
        const elementId = uniquePageElementId(baseId, usedElementIds)
        element.elementId = elementId
        if (rec.groups && rec.groups.length > 0) (element as Record<string, unknown>).group = [...rec.groups]
        for (let reportIndex = droppedStart; reportIndex < report.dropped.length; reportIndex += 1) {
          const dropped = report.dropped[reportIndex]
          if (dropped.placeholder?.elementId === baseId) dropped.placeholder.elementId = elementId
        }
        for (let reportIndex = degradedStart; reportIndex < report.degraded.length; reportIndex += 1) {
          const degraded = report.degraded[reportIndex]
          if (degraded.elementId === baseId) degraded.elementId = elementId
        }
        if (element.elementType !== 'placeholder' && !animationTargets.has(rec.shapeId)) {
          animationTargets.set(rec.shapeId, elementId)
        }
      }
    }
  }

  // animations
  try {
    const animations = getSlideAnimations(rawSlide)
    if (animations && animations.length > 0) {
      const mapped: Animation[] = []
      for (const step of animations) {
        const target = (step as { target?: { kind?: string; shapeId?: number } }).target
        const shapeId = target?.shapeId
        const effect = (step as { effect?: string | null }).effect ?? null
        const originalEffect = (step as { originalEffect?: string }).originalEffect
        const elementId = shapeId !== undefined && shapeId !== null ? animationTargets.get(shapeId) : undefined
        const trigger = animationTriggerOf(step.start)
        if (!elementId) continue
        mapped.push({
          elementId,
          effect: effect as Animation['effect'],
          ...(originalEffect !== undefined ? { originalEffect } : {}),
          ...(trigger !== undefined ? { trigger } : {}),
          ...(step.durationMs !== undefined && step.durationMs !== null ? { durationMs: step.durationMs } : {}),
          ...(step.delayMs !== undefined && step.delayMs !== null ? { delayMs: step.delayMs } : {})
        })
      }
      page.animations = mapped
    }
  } catch {
    /* no animations */
  }

  return page
}

/* ------------------------------------------------------------------ *
 * Deck assembly
 * ------------------------------------------------------------------ */

export function mapReverseModel(
  read: ReverseReadResult,
  options: { sourcePath: string; sourceSha1: string }
): ReverseMapResult {
  const pres = read.pres as PresentationData
  const slideCount = read.slides.length
  const sizePx: [number, number] = read.slideSize
    ? [emuToPx(read.slideSize.width), emuToPx(read.slideSize.height)]
    : DEFAULT_SIZE
  const pages: Page[] = []
  const media: ReverseMediaAsset[] = []
  const report: ImportReport = {
    profile: 'reverse',
    source: {
      path: options.sourcePath,
      sha1: options.sourceSha1,
      slideCount,
      size: sizePx,
      ...(read.sourceApp !== null ? { app: read.sourceApp } : {})
    },
    summary: {
      pages: slideCount,
      elements: 0,
      placeholders: 0,
      dropped: 0,
      degraded: 0,
      unmodeledParts: []
    },
    dropped: [],
    degraded: []
  }

  for (const slide of read.slides) {
    pages.push(mapPage(slide, pres, read.fonts, media, report))
  }

  // clrScheme 12 槽原样落 theme.colors 规范键（accent1 等），导出端据此
  // 回写主题色方案（setPresentationTheme），避免成品被重置成 Office 默认色板。
  const themeColors = getPresentationTheme(pres)

  const deck: Presentation = {
    profile: 'reverse',
    size: sizePx,
    // 母版 txStyles 不可完整还原；主题字体落到 title/body 两个
    // textStyles 槽位，作为占位符未显式设字体时的默认（render 端 run 级
    // 富文本已逐字携带字体，textStyles 只兜底空文本与新建文本框）。
    // 导出端同时用它们回写 major/minor 字体方案（setPresentationFonts）。
    ...(read.fonts || themeColors
      ? {
          theme: {
            ...(themeColors
              ? {
                  colors: {
                    dark1: themeColors.dark1,
                    light1: themeColors.light1,
                    dark2: themeColors.dark2,
                    light2: themeColors.light2,
                    accent1: themeColors.accent1,
                    accent2: themeColors.accent2,
                    accent3: themeColors.accent3,
                    accent4: themeColors.accent4,
                    accent5: themeColors.accent5,
                    accent6: themeColors.accent6,
                    hyperlink: themeColors.hyperlink,
                    followedHyperlink: themeColors.followedHyperlink
                  }
                }
              : {}),
            ...(read.fonts
              ? {
                  textStyles: {
                    title: {
                      fontFamily: {
                        latin: read.fonts.majorLatin ?? 'Calibri',
                        ea: read.fonts.majorEastAsian ?? read.fonts.majorLatin ?? 'Calibri'
                      }
                    },
                    body: {
                      fontFamily: {
                        latin: read.fonts.minorLatin ?? 'Calibri',
                        ea: read.fonts.minorEastAsian ?? read.fonts.minorLatin ?? 'Calibri'
                      }
                    }
                  }
                }
              : {})
          }
        }
      : {}),
    export: { fontEmbed: 'subset', animations: 'auto' },
    pages: pages.map((_, i) => `pages/${slideIndexLabel(i + 1)}.page`),
    source: {
      path: options.sourcePath,
      sha1: options.sourceSha1,
      slideCount,
      size: sizePx,
      // 源存档契约（spec §10）：writeProject 把原始字节落到 source/original.pptx；
      // originalSha1 是「整轮导入的原子单位」——导出侧据此判定未改页可否整页恢复。
      archive: 'source/original.pptx',
      originalSha1: options.sourceSha1,
      ...(read.sourceApp !== null ? { app: read.sourceApp } : {})
    }
  }

  report.summary.elements = pages.reduce((sum, p) => sum + p.elements.length, 0)
  report.summary.placeholders = pages.reduce(
    (sum, p) => sum + p.elements.filter((e) => e?.elementType === 'placeholder').length,
    0
  )
  report.summary.dropped = report.dropped.length
  report.summary.degraded = report.degraded.length

  // Silence unused-import lint for getShapeAnimation (kept for future per-shape
  // animation probes; the page-level getSlideAnimations covers the common case).
  void getShapeAnimation

  return { deck, pages, media, report }
}
