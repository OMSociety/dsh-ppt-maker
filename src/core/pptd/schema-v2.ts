/**
 * src/core/pptd/schema-v2.ts — schema extensions introduced with `schema: 2`.
 *
 * Vocabulary: `pageType: 'svg'` marks a page whose design source is an SVG
 * file under `media/svg/`; the compiled DrawingML page lives in the build
 * cache (not in the project) and is merged into the deck at release time.
 *
 * A page is either native (`elements`) or svg (`sourceRef`) — never both.
 */
export const SCHEMA_VERSION = 2 as const
export const SUPPORTED_SCHEMA_VERSIONS: ReadonlySet<number> = new Set([2])
export const SVG_PAGE_TYPE = 'svg' as const
export const SVG_MEDIA_DIR = 'media/svg'

export type BriefMode = 'deck' | 'poster' | 'infographic'
export interface Brief {
  purpose?: string
  audience?: string
  coreMessage?: string
  tone?: string
  mode?: BriefMode
  /** user-approved page count estimate */
  pageCount?: number
}

export interface PlanPage {
  page: string
  title?: string
  type?: 'native' | 'svg'
  svgRef?: string
  /** communication trace: what the page argues / shows */
  intent?: string
  /** thumbnail label / module hint */
  module?: string
}
export interface Plan {
  version?: 1
  status?: 'draft' | 'confirmed'
  pages: PlanPage[]
}

export interface SvgSource {
  /** project-relative SVG file, e.g. `media/svg/cover.svg` */
  ref: string
  viewBox?: [number, number]
}
