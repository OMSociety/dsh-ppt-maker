/**
 * src/core/pptd/schema-v2.ts — schema 2 vocabulary.
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

export interface SvgSource {
  /** project-relative SVG file, e.g. `media/svg/cover.svg` */
  ref: string
  viewBox?: [number, number]
}
