/**
 * Rule-based quality review: runs against a built native deck,
 * so the object under review is always the final pptx — never an intermediate
 * approximation.
 *
 * Checks (rule layer, blocking by severity):
 *  - text overflow:      @office-kit/pptx-preview auditTextLayout
 *  - out of canvas:      @office-kit/pptx findShapesOutsideCanvas
 *  - shape overlap:      @office-kit/pptx findOverlappingShapePairs
 *  - contrast:           resolveDeckBodyTextColor + getShapeFillColorResolved,
 *                        WCAG relative-luminance ratio against a threshold
 *  - structural sanity:  @office-kit/pptx validatePresentation
 *
 * The check layer is pure: it takes a native deck handle and returns issues.
 * Tool code (ppt_check / ppt_export) owns IO and the blocker gate.
 */
import {
  findOverlappingShapePairs,
  findShapesOutsideCanvas,
  getShapeFillColorResolved,
  getShapeName,
  getShapeText,
  getSlideShapes,
  getSlides,
  resolveDeckBodyTextColor,
  validatePresentation
} from '@office-kit/pptx'
import type { PresentationData, SlideData, SlideShapeData } from '@office-kit/pptx'
import { auditTextLayout, type TextAuditIssue } from '@office-kit/pptx-preview'

export interface ReviewIssue {
  page: number
  severity: 'blocker' | 'warning'
  category: 'text-overflow' | 'out-of-canvas' | 'overlap' | 'contrast' | 'structure' | 'ai-visual'
  elementId?: string
  description: string
  suggestion?: string
}

export interface ReviewResult {
  pass: boolean
  issues: ReviewIssue[]
  /** libreoffice-kit missing-font families, filled by the caller (render step). */
  missingFonts: string[]
}

/** WCAG relative luminance of #RRGGBB. */
export function relativeLuminance(hex: string): number | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel((n >> 16) & 0xff) + 0.7152 * channel((n >> 8) & 0xff) + 0.0722 * channel(n & 0xff)
}

/** WCAG contrast ratio in [1, 21]; null when either color is unparseable. */
export function contrastRatio(foreground: string, background: string): number | null {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  if (l1 === null || l2 === null) return null
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/** Body text on a shape must clear this ratio (WCAG AA large text). */
export const CONTRAST_THRESHOLD = 3

function textAuditCategory(issue: TextAuditIssue): 'text-overflow' {
  return 'text-overflow'
}

function describeTextAudit(issue: TextAuditIssue): string {
  if (issue.kind === 'soft-wrap') {
    return `段落 ${issue.paragraphIndex + 1} 自行换行 ${issue.extraLines} 行（超出显式换行意图）`
  }
  const axis = issue.kind === 'overflow-x' ? '水平' : '垂直'
  return `文字${axis}溢出 ${issue.overflowPx.toFixed(1)}px`
}

export interface ReviewOptions {
  /** Only review these 1-based page numbers; default all. */
  pages?: number[]
  /** Contrast threshold; default CONTRAST_THRESHOLD. */
  contrastThreshold?: number
  /** Report soft-wrap findings (opt-in; body text wraps are normally fine). */
  reportSoftWraps?: boolean
}

export function reviewDeck(pres: PresentationData, options: ReviewOptions = {}): ReviewResult {
  const issues: ReviewIssue[] = []
  const slides = getSlides(pres)
  const pageFilter = options.pages ? new Set(options.pages) : null
  const threshold = options.contrastThreshold ?? CONTRAST_THRESHOLD

  // Structural sanity (whole-deck, not per-page).
  for (const v of validatePresentation(pres)) {
    issues.push({
      page: 0,
      severity: v.severity === 'error' ? 'blocker' : 'warning',
      category: 'structure',
      description: v.message,
      ...(v.partName !== undefined ? { elementId: String(v.partName) } : {})
    })
  }

  // Text overflow via pptx-preview (default heuristic measurer; approximate
  // results are still useful as blockers only when the overflow is gross).
  const audits = auditTextLayout(pres, { reportSoftWraps: options.reportSoftWraps === true })
  for (const issue of audits) {
    const page = issue.slideIndex + 1
    if (pageFilter && !pageFilter.has(page)) continue
    const gross = issue.kind === 'soft-wrap' ? issue.extraLines >= 2 : issue.overflowPx >= 4
    issues.push({
      page,
      severity: issue.approximate && !gross ? 'warning' : 'blocker',
      category: textAuditCategory(issue),
      ...(issue.shapeName !== null ? { elementId: issue.shapeName } : {}),
      description: describeTextAudit(issue),
      suggestion: '缩短文字、加大文本框，或调小字号'
    })
  }

  slides.forEach((slide: SlideData, index: number) => {
    const page = index + 1
    if (pageFilter && !pageFilter.has(page)) return

    for (const shape of findShapesOutsideCanvas(slide, pres)) {
      issues.push({
        page,
        severity: 'blocker',
        category: 'out-of-canvas',
        elementId: getShapeName(shape),
        description: '形状超出画布边界',
        suggestion: '把元素移回画布内或调整 bounds'
      })
    }

    for (const [a, b] of findOverlappingShapePairs(slide)) {
      issues.push({
        page,
        severity: 'warning',
        category: 'overlap',
        elementId: `${getShapeName(a)} / ${getShapeName(b)}`,
        description: '两个形状的包围盒重叠',
        suggestion: '确认是否为有意层叠；否则错开位置'
      })
    }

    // Contrast: shape fill vs deck body text color. Only solid-filled shapes
    // with text are meaningful targets; the check is deliberately conservative.
    const bodyColor = bodyTextColorOf(slide)
    if (bodyColor) {
      for (const shape of shapesWithText(slide)) {
        const fill = getShapeFillColorResolved(pres, shape)
        if (!fill) continue
        const ratio = contrastRatio(bodyColor, fill)
        if (ratio !== null && ratio < threshold) {
          issues.push({
            page,
            severity: 'warning',
            category: 'contrast',
            elementId: getShapeName(shape),
            description: `文字与形状填充对比度 ${ratio.toFixed(2)}（阈值 ${threshold}）`,
            suggestion: '加深文字颜色或减淡填充色'
          })
        }
      }
    }
  })

  return {
    pass: !issues.some((i) => i.severity === 'blocker'),
    issues,
    missingFonts: []
  }
}

function bodyTextColorOf(slide: SlideData): string | null {
  // resolveDeckBodyTextColor reads the master's body style; null means the
  // deck has no theme (shouldn't happen for generated decks).
  try {
    return resolveDeckBodyTextColor(slide)
  } catch {
    return null
  }
}

function shapesWithText(slide: SlideData): SlideShapeData[] {
  try {
    return getSlideShapes(slide).filter((s) => hasText(s))
  } catch {
    return []
  }
}

function hasText(shape: SlideShapeData): boolean {
  try {
    return getShapeText(shape).trim() !== ''
  } catch {
    return false
  }
}
