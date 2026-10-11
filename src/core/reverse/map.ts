/**
 * Reverse map layer (PR 2 plan §1 step 2): turn the read model into PPTD v3
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
  getShapeAdjustValues,
  getShapeAnimation,
  getShapeCustomGeometry,
  getShapeFill,
  getShapeImageBytes,
  getShapeImageCrop,
  getShapeImageFillBytes,
  getShapeImageOpacity,
  getShapePreset,
  getShapeStroke,
  getShapeStrokeDash,
  getShapeTextDirection,
  getShapeTextWrap,
  getSlideAnimations,
  getSlideBackground,
  getSlideBackgroundGradientFill,
  getSlideBackgroundImageBytes,
  getSlideTransition,
  getTableCellParagraphs,
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

function mapText(rec: ReverseShapeRecord, fonts: ReverseReadResult['fonts']): Record<string, unknown> {
  const shape = rec.raw as SlideShapeData
  const content: Record<string, unknown> = {
    text: rec.text,
    align: ['left', 'top'],
    wrap: (() => {
      try {
        return getShapeTextWrap(shape) !== 'none'
      } catch {
        return true
      }
    })()
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
        detail: '内置表格样式 id 记入 builtinStyle，渲染以 rows 字面量为准',
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
 * Page-level assembly
 * ------------------------------------------------------------------ */

function mapPage(
  slide: ReverseSlideRecord,
  pres: PresentationData,
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

  // background
  const rawSlide = slide.raw as Parameters<typeof getSlideBackground>[0]
  try {
    const bg = getSlideBackground(rawSlide)
    if (bg.kind === 'solid') {
      page.background = { type: 'solid', color: asLiteralColor(bg.color) }
    } else if (bg.kind === 'gradient') {
      const g = getSlideBackgroundGradientFill(rawSlide)
      if (g) {
        page.background = {
          type: 'gradient',
          gradientType: 'linear',
          stops: g.stops.map((s) => ({ position: s.offset, color: asLiteralColor(String(s.color)) }))
        }
      }
    } else if (bg.kind === 'image') {
      const bytes = getSlideBackgroundImageBytes(rawSlide)
      if (bytes) {
        const partName = `ppt/media/bg-${slide.slideIndex}.png`
        media.push({ bytes, ext: '.png', partName })
        page.background = { type: 'image', src: `media/${partName.split('/').pop()}` }
      }
    }
  } catch {
    /* fall back to implicit white */
  }

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
            page.elements.push(mapText(rec, null) as Page['elements'][number])
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
        case 'picture':
          page.elements.push(mapImage(rec, media, report) as Page['elements'][number])
          break
        case 'connector':
          page.elements.push(mapLine(rec) as Page['elements'][number])
          break
        default: {
          const textBox = isShapeTextBox(rawShape)
          if (textBox || rec.text !== '') {
            page.elements.push(mapText(rec, null) as Page['elements'][number])
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
    version: 'v3',
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
    pages.push(mapPage(slide, pres, media, report))
  }

  const deck: Presentation = {
    version: 'v3',
    profile: 'reverse',
    size: sizePx,
    export: { fontEmbed: 'subset', transition: 'fade', animations: 'auto' },
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
