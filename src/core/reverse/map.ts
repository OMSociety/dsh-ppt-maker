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
  getParagraphSpacing,
  getShapeAdjustValues,
  getShapeAnimation,
  getShapeCustomGeometry,
  getShapeFill,
  getShapeImageBytes,
  getShapeImageCrop,
  getShapeImageFillBytes,
  getShapeImageOpacity,
  getShapeMedia,
  getShapeParagraphCount,
  getShapeParagraphElements,
  getShapePreset,
  getShapeRunFormatEffective,
  getShapeStroke,
  getShapeStrokeDash,
  getShapeTextAnchor,
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
  type PresentationData,
  type SlideBackground,
  type SlideData,
  type SlideLayoutData,
  type SlideShapeData
} from '@office-kit/pptx'
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

/** elementId generator inside map: stable per source shape so animations can target them. */
function elementIdOf(rec: ReverseShapeRecord): string {
  return `el-${rec.slideIndex}-${rec.shapeId}`
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
 * R1 — run-level rich text mapping (保真度修复计划 R1)
 * ------------------------------------------------------------------ */

const H_ALIGN_MAP: Record<string, string> = {
  l: 'left',
  ctr: 'center',
  r: 'right',
  just: 'justify',
  dist: 'distribute',
  justLow: 'justify',
  thaiDist: 'distribute'
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
  /** 段落是否读过 run 级格式（用于 degraded 判定） */
  runsRead: boolean
}

function readRichParagraphs(
  pres: PresentationData,
  shape: SlideShapeData
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
      parts.push(
        runToHtml(text, {
          font: typeof fmt.font === 'string' ? fmt.font : undefined,
          fontEastAsian: typeof fmt.fontEastAsian === 'string' ? fmt.fontEastAsian : undefined,
          size: typeof fmt.size === 'number' ? fmt.size : undefined,
          color: typeof fmt.color === 'string' ? fmt.color : null,
          bold: fmt.bold === true,
          italic: fmt.italic === true,
          underline: (fmt.underline as boolean | string | undefined) ?? false,
          baseline: typeof fmt.baseline === 'number' ? fmt.baseline : undefined
        })
      )
    }
    let align: string | null = null
    try {
      const a = getParagraphAlignment(shape, p)
      if (a && H_ALIGN_MAP[a]) align = H_ALIGN_MAP[a]
    } catch {
      /* inherit */
    }
    let lineSpacingPct: number | null = null
    let lineSpacingPts: number | null = null
    try {
      const ls = getParagraphLineSpacing(shape, p)
      if (ls?.kind === 'pct') lineSpacingPct = ls.value
      else if (ls?.kind === 'pts') lineSpacingPts = ls.value
    } catch {
      /* inherit */
    }
    let spaceBeforePts: number | null = null
    try {
      const sp = getParagraphSpacing(shape, p)
      if (typeof sp?.beforePts === 'number') spaceBeforePts = sp.beforePts
    } catch {
      /* inherit */
    }
    let bulletKind: 'bullet' | 'number' | null = null
    try {
      const b = getParagraphBullet(shape, p)
      if (b === 'bullet' || (typeof b === 'object' && b !== null && 'char' in b)) bulletKind = 'bullet'
      else if (b === 'number' || (typeof b === 'object' && b !== null && 'autoNum' in b)) bulletKind = 'number'
    } catch {
      /* inherit */
    }
    out.push({ html: parts.join(''), align, lineSpacingPct, lineSpacingPts, spaceBeforePts, bulletKind, runsRead })
  }
  return out
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
  report: ImportReport
): Record<string, unknown> {
  const shape = rec.raw as SlideShapeData
  const rich = readRichParagraphs(pres, shape)
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
  let vAlign = 'top'
  try {
    const anchor = getShapeTextAnchor(shape)
    if (anchor && V_ALIGN_MAP[anchor]) vAlign = V_ALIGN_MAP[anchor]
  } catch {
    /* default top */
  }

  const content: Record<string, unknown> = {
    text: hasRich ? paragraphsToHtml(rich) : rec.text,
    align: [hAlign, vAlign],
    wrap: (() => {
      try {
        return getShapeTextWrap(shape) !== 'none'
      } catch {
        return true
      }
    })()
  }
  if (rich === null && rec.text !== '') {
    // run 级读不到（非文本形状或库不支持）→ 回落纯文本并记账
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
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
    elementType: 'text',
    content
  }
}

function mapShape(rec: ReverseShapeRecord): Record<string, unknown> {
  const shape = rec.raw as SlideShapeData
  const element: Record<string, unknown> = {
    ...baseElement(rec),
    elementType: 'shape'
  }
  try {
    const preset = getShapePreset(shape)
    if (preset && preset !== 'rect') element.shapeName = preset
  } catch {
    /* default rect */
  }
  try {
    const adjustments = getShapeAdjustValues(shape)
    const values = Object.values(adjustments).filter((v): v is number => typeof v === 'number')
    if (values.length > 0) element.adjustments = values
  } catch {
    /* no adjustments */
  }
  try {
    const fill = getShapeFill(shape)
    if (fill.kind === 'solid') {
      element.fill = { type: 'solid', color: asLiteralColor(fill.color) }
    }
  } catch {
    /* degrade into no-fill */
  }
  try {
    const stroke = getShapeStroke(shape)
    if (stroke.kind === 'solid') {
      const border: Record<string, unknown> = {
        style: 'solid',
        width: typeof stroke.widthEmu === 'number' ? emuToPx(stroke.widthEmu) : 1,
        color: asLiteralColor(stroke.color)
      }
      try {
        const dash = getShapeStrokeDash(shape)
        if (dash === 'dash' || dash === 'sysDot') border.style = dash === 'dash' ? 'dash' : 'dot'
      } catch {
        /* leave solid */
      }
      element.border = border
    }
  } catch {
    /* no stroke */
  }
  return element
}

/** Reverse dialect colours are literals only: `#RRGGBB` / `#RRGGBBAA` or `scheme:<token>`. */
function asLiteralColor(raw: string): string {
  if (raw.startsWith('#') || raw.startsWith('scheme:')) return raw
  return `#${raw.replace(/^#/, '')}`.toUpperCase()
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
  const ext = '.png'
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
    for (let r = 0; r < dims.rows; r++) {
      const row: Record<string, unknown>[] = []
      for (let c = 0; c < dims.cols; c++) {
        const cell = getTableCell(shape, r, c)
        const cellObj: Record<string, unknown> = { text: '' }
        try {
          const span = getTableCellSpan(cell)
          if (span.rowSpan && span.rowSpan > 1) cellObj.rowSpan = span.rowSpan
          if (span.gridSpan && span.gridSpan > 1) cellObj.colSpan = span.gridSpan
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

function mapLine(rec: ReverseShapeRecord): Record<string, unknown> {
  return {
    ...baseElement(rec),
    elementType: 'line',
    points: '0,0 100,100'
  }
}

/* ------------------------------------------------------------------ *
 * R3 — 背景继承链（slide → layout → master）
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
    const partName = `ppt/media/bg-${slideIndex}-${src.level}.png`
    media.push({ bytes: src.imageBytes, ext: '.png', partName })
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
 * R2 — graphicFrame 细分识别（SmartArt / OLE / 3D / 未知）
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
  if (slide.title !== null && slide.title !== '') page.title = slide.title

  // background — R3：slide → layout → master 链，取最终生效的背景
  const rawSlide = slide.raw as SlideData
  applyBackgroundChain(rawSlide, pres, slide.slideIndex, page, media, report)

  // transition
  try {
    const transition = getSlideTransition(rawSlide)
    if (transition) {
      page.transition = {
        effect: transition.effect,
        ...(transition.preset !== undefined ? { preset: transition.preset } : {})
      } as Page['transition']
    }
  } catch {
    /* no transition */
  }

  // elements
  for (const rec of slide.shapes) {
    if (rec.bounds === null) {
      ensurePlaceholder(page, rec, 'unknown', report, '形状无可用几何（own / layout / master 三链都缺 <a:xfrm>）')
      continue
    }
    try {
      const rawShape = rec.raw as SlideShapeData
      if (isTableShape(rawShape)) {
        page.elements.push(mapTable(rec, pres, report) as Page['elements'][number])
        continue
      }
      if (isChartShape(rawShape)) {
        ensurePlaceholder(page, rec, 'chart', report, '原生图表部件不映射为 PPTD 元素')
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
          let isCustom = false
          try {
            if (getShapeCustomGeometry(rawShape)) {
              isCustom = true
            }
          } catch {
            /* ignore */
          }
          if (isCustom) {
            report.degraded.push({
              page: rec.slideIndex,
              elementId: elementIdOf(rec),
              feature: 'unknown',
              detail: '自定义几何形状（custGeom）按 rect 落盘，路径数据未保留'
            })
          }
          page.elements.push(mapShape(rec) as Page['elements'][number])
          break
        }
        case 'connector':
          page.elements.push(mapLine(rec) as Page['elements'][number])
          break
        case 'graphicFrame': {
          // R2：表/图已在上面分流；其余 graphicFrame（SmartArt/ole/未知）走 dropped + 占位
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
          // R2：带媒体剪辑的 picture 不进 image 通道，走 dropped + 占位
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
            page.elements.push(mapShape(rec) as Page['elements'][number])
          }
        }
      }
    } catch (err) {
      ensurePlaceholder(page, rec, 'unknown', report, `形状映射抛错：${(err as Error).message}`)
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
        const elementId =
          shapeId !== undefined && shapeId !== null ? `el-${slide.slideIndex}-${shapeId}` : `el-${slide.slideIndex}-0`
        mapped.push({
          elementId,
          effect: effect as Animation['effect'],
          ...(originalEffect !== undefined ? { originalEffect } : {}),
          ...(step.start !== undefined ? { trigger: step.start as Animation['trigger'] } : {}),
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
    // R3：母版 txStyles 不可完整还原；主题字体落到 title/body 两个
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
