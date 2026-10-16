/**
 * Engine interface layer — the seam between the PPTD AST and
 * the concrete pptx library.
 *
 * PPTD types (schema.ts) never leak library API shapes; engine implementations
 * never see YAML or file paths. Everything crosses this boundary as plain data.
 * Units at the boundary:
 *   - geometry: px (1 px = 1 pt = 12700 EMU, spec §1.2)
 *   - fontSize: pt (same number as px in PPTD)
 *   - angle: degrees clockwise
 * The implementation converts to EMU internally.
 */
import type { ElementBase, Page, Presentation } from '../pptd/schema.js'

/* ------------------------------------------------------------------ *
 * Resolved styles
 *
 * The six-level text inheritance chain (上游 §1) is collapsed by the engine
 * implementation (it owns the theme tables) into these literal records.
 * ------------------------------------------------------------------ */

export interface ResolvedTextStyle {
  color?: string
  fontSize?: number
  fontFamily?: { latin: string; ea: string }
  bold?: boolean
  italic?: boolean
  backgroundColor?: string
  lineHeight?: number
  lineHeightPx?: number
  letterSpacing?: number
  marginTop?: number
  align?: [string, string]
  wrap?: boolean
}

/** Engine-side fill, theme references already resolved to literals. */
export type ResolvedFill =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; gradientType: 'linear' | 'radial'; stops: Array<{ position: number; color: string }>; angle?: number }
  | { type: 'image'; bytes: Uint8Array; opacity?: number }

export interface ResolvedBorder {
  style?: 'solid' | 'dash' | 'dot'
  width?: number
  color?: string
}

export interface ResolvedShadow {
  blur: number
  color: string
  offset?: [number, number]
}

export interface BuildContext {
  /** Project dir on disk (media/ resolution root). */
  readonly projectDir: string
  /** Async media loader: project-relative path or http(s) URL → bytes. */
  readonly loadMedia: (src: string) => Promise<Uint8Array>
  /** Collects human-readable capability degradations (plan §5: never silent). */
  readonly warnings: string[]
}

/* ------------------------------------------------------------------ *
 * Deck build result
 * ------------------------------------------------------------------ */

export interface DeckBuildResult {
  /** Opaque native deck handle (engine-specific; @office-kit/pptx PresentationData). */
  native: unknown
  /** Per-page native slide handles, in deck order. */
  slides: unknown[]
  /** elementId → native shape handle, per page index. */
  shapes: Map<number, Map<string, unknown>>
  /** Capabilities the engine could not honor (e.g. icon without FA assets). */
  warnings: string[]
  /** Fonts actually referenced by the deck (family names, deduped). */
  fontsUsed: string[]
}

/* ------------------------------------------------------------------ *
 * Engine interface
 * ------------------------------------------------------------------ */

export interface DeckEngine {
  /** Build a native deck from the parsed PPTD model. */
  buildDeck(model: { deck: Presentation; pages: Page[] }, ctx: BuildContext): Promise<DeckBuildResult>
  /** Serialize a native deck to pptx bytes. */
  saveDeck(native: unknown): Promise<Uint8Array>
}

/* ------------------------------------------------------------------ *
 * Structural validation (engine-level, save-time sanity)
 * ------------------------------------------------------------------ */

export interface EngineValidationIssue {
  severity: 'error' | 'warning'
  message: string
  partName?: string
}

export type { ElementBase, Page, Presentation }
