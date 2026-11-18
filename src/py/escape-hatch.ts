/**
 * Python escape hatch — interface only.
 *
 * This seam describes best-effort repair of third-party `.pptd` files that the
 * strict YAML parser rejects. The current factory reports the unavailable
 * escape hatch through EscapeHatchUnavailableError.
 */
import type { Issue } from '../core/pptd/parse.js'

export interface EscapeHatchRequest {
  /** Project-relative file name being repaired, e.g. `deck.pptd`. */
  fileName: string
  /** Raw text the strict parser rejected. */
  brokenText: string
  /** Issues the strict parser produced — the repair hint. */
  issues: Issue[]
}

export interface EscapeHatchResult {
  ok: boolean
  /** Repaired text when ok; callers re-run the strict parser on it. */
  text?: string
  error?: string
}

export interface EscapeHatch {
  /** Best-effort repair of one broken .pptd/.page file. Never throws. */
  repair(request: EscapeHatchRequest): Promise<EscapeHatchResult>
}

export class EscapeHatchUnavailableError extends Error {
  readonly code = 'EscapeHatchUnavailable'

  constructor() {
    super('Python 逃生舱不可用')
    this.name = 'EscapeHatchUnavailableError'
  }
}

/** Report the unavailable Python escape hatch. */
export function createEscapeHatch(): EscapeHatch {
  throw new EscapeHatchUnavailableError()
}
