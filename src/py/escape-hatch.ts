/**
 * Python escape hatch — interface only.
 *
 * Broken third-party `.pptd` files that the strict YAML parser rejects can be
 * handed to a small Python script (lenient YAML cleanup, encoding fixes) as a
 * last resort. The harness lives in `py/` and is wired up in a later PR; the
 * tool layer must already code against this seam so the integration is a
 * drop-in.
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
    super('Python 逃生舱尚未接线（接口预留，后续 PR 实现）')
    this.name = 'EscapeHatchUnavailableError'
  }
}

/** Factory seam: later PRs return a real implementation here. */
export function createEscapeHatch(): EscapeHatch {
  throw new EscapeHatchUnavailableError()
}
