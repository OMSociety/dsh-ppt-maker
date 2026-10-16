/**
 * Reverse-engineering types. Pure data contracts shared across
 * the read / map / writeback layers. No @office-kit/pptx imports here.
 */
import type { Presentation, Page } from '../pptd/schema.js'

/* ------------------------------------------------------------------ *
 * Import report (spec §10) — two-level degradation ledger
 * ------------------------------------------------------------------ */

export type DroppedOriginalType =
  | 'chart'
  | 'smartArt'
  | 'group'
  | 'media'
  | 'ole'
  | 'object3d'
  | 'unknown'

export interface ReportDroppedEntry {
  /** 1-based source slide number. */
  page: number
  /** Source shape id (`<p:cNvPr id>`), 0 when not attributable to one shape. */
  shapeId: number
  originalName?: string
  originalType: DroppedOriginalType
  reason: string
  /** The placeholder that stands in for this element (when one was inserted). */
  placeholder?: { elementId: string; bounds: [number, number, number, number] }
}

export interface ReportDegradedEntry {
  /** 1-based source slide number. */
  page: number
  /** PPTD elementId this degradation attaches to; null for page-level losses. */
  elementId: string | null
  /** Degradation feature token (spec §10.1 词表；表外情形用 'unknown' 并必填 detail). */
  feature:
    | 'animation.preset'
    | 'animation.step'
    | 'transition.effect'
    | 'theme.colorTransform'
    | 'shape.strokeSketch'
    | 'shape.pictureStyle'
    | 'image.artisticEffect'
    | 'image.biLevel'
    | 'image.compressionState'
    | 'text.bodyRotation'
    | 'text.columns'
    | 'text.autoFit'
    | 'background.patternFill'
    | 'table.styleId'
    | 'notes.richText'
    | 'hyperlink.clickAction'
    | 'unknown'
  detail: string
  originalValue?: string
  fallbackValue?: string
}

export interface ImportReport {
  profile: 'reverse'
  source: {
    path: string
    sha1: string
    slideCount: number
    size: [number, number]
    app?: string
  }
  summary: {
    pages: number
    elements: number
    placeholders: number
    dropped: number
    degraded: number
    unmodeledParts: string[]
  }
  dropped: ReportDroppedEntry[]
  degraded: ReportDegradedEntry[]
}

/* ------------------------------------------------------------------ *
 * Intermediate read model
 * ------------------------------------------------------------------ */

/**
 * One source shape after read-side resolution. All geometry is EMU at this
 * stage; `map/` converts to px. Sub-shapes of a group are flattened by the
 * reader into this same flat list (group container itself dropped per §10.1).
 */
export interface ReverseShapeRecord {
  /** 1-based source slide index. */
  slideIndex: number
  shapeId: number
  originalName: string
  kind: 'shape' | 'picture' | 'group' | 'graphicFrame' | 'connector'
  placeholderType: string | null
  /** Resolved absolute bounds in EMU (null only when even the fallback chain gave nothing). */
  bounds: { x: number; y: number; w: number; h: number } | null
  rotationDeg: number
  flip: { horizontal: boolean; vertical: boolean }
  opacity: number | null
  text: string
  /** Raw library shape handle — only `map/` touches this. */
  raw: unknown
  /** True when this record came from flattening a parent group. */
  fromGroup: boolean
}

export interface ReverseSlideRecord {
  slideIndex: number
  partName: string
  title: string | null
  hidden: boolean
  notes: string | null
  layoutRef: {
    partName: string
    name?: string
    type?: string | null
    masterPartName?: string
  } | null
  sectionName: string | null
  shapes: ReverseShapeRecord[]
  /** Raw slide handle for animation / transition / background probes. */
  raw: unknown
}

export interface ReverseReadResult {
  pres: unknown
  slides: ReverseSlideRecord[]
  slideSize: { width: number; height: number } | null
  fonts: {
    majorLatin: string | null
    majorEastAsian: string | null
    majorComplexScript: string | null
    minorLatin: string | null
    minorEastAsian: string | null
    minorComplexScript: string | null
  } | null
  sourceApp: string | null
}

/* ------------------------------------------------------------------ *
 * Map output
 * ------------------------------------------------------------------ */

/** Media asset collected during mapping: sha1 dedup happens in `writeProject`. */
export interface ReverseMediaAsset {
  /** Content bytes. */
  bytes: Uint8Array
  /** Preferred extension (e.g. '.png'); the final file name is `<sha1><ext>`. */
  ext: string
  /** Source package part name, for the report / Image.partName field. */
  partName: string
}

export interface ReverseMapResult {
  deck: Presentation
  /** Page objects in deck order; their file names are pages/NN.page. */
  pages: Page[]
  media: ReverseMediaAsset[]
  report: ImportReport
}

/* ------------------------------------------------------------------ *
 * Write-back (project materialization)
 * ------------------------------------------------------------------ */

export interface ReverseWriteResult {
  projectDir: string
  pageCount: number
  mediaCount: number
  revision: number
  dropped: ReportDroppedEntry[]
  degraded: ReportDegradedEntry[]
}
