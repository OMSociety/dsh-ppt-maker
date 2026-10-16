/**
 * Reverse read layer: pull a PresentationData from pptx
 * bytes and walk every slide/shape into a flat Reverse*Record model.
 *
 * This is the second sanctioned `@office-kit/pptx` import point in the repo
 * (the first is `core/engine/officekit.ts` for the write path). Keeping read
 * and write behind separate modules is what lets either half evolve without
 * dragging the other across each library release.
 *
 * Nothing in this file writes to disk or builds PPTD AST nodes; that lives in
 * `map.ts`. The reader's only judgment calls are:
 *   - which library shape kinds we can still say something useful about
 *     (`group` containers are flattened via `ungroupShapes` and marked
 *     `fromGroup`, so downstream mapping sees only leaf shapes);
 *   - which shapes fail even the flattened-resolved-bounds fallback and must
 *     be handed to `map.ts` as `bounds: null` (those become dropped +
 *     placeholder).
 */
import {
  getExtendedProperties,
  getPresentationFonts,
  getShapeBoundsResolved,
  getShapeFlip,
  getShapeId,
  getShapeKind,
  getShapeName,
  getShapeRotation,
  getShapeText,
  getSlideAt,
  getSlideCount,
  getSlideLayout,
  getSlideLayoutName,
  getSlideLayoutPartName,
  getSlideLayoutType,
  getSlideNotes,
  getSlidePartName,
  getSlideShapes,
  getSlideSize,
  getSlideTitle,
  getSlides,
  isSlideHidden,
  ungroupShapes,
  type PresentationData,
  type SlideData,
  type SlideShapeData
} from '@office-kit/pptx'
import type {
  ReverseReadResult,
  ReverseShapeRecord,
  ReverseSlideRecord
} from './types.js'

/**
 * Load pptx bytes and produce the read model. Throws whatever the library
 * throws for corrupt input — the caller (`apply.ts`) converts that into a
 * tool-level error with mode:'surgical' fallback guidance.
 */
export async function loadReverseModel(bytes: Uint8Array): Promise<ReverseReadResult> {
  const { loadPresentation } = await import('@office-kit/pptx')
  const pres: PresentationData = await loadPresentation(bytes)
  const slideSize = getSlideSize(pres)
  const fonts = getPresentationFonts(pres)
  const core = getExtendedProperties(pres)
  const slides: ReverseSlideRecord[] = []
  const count = getSlideCount(pres)
  const slideHandles = getSlides(pres)

  for (let i = 0; i < count; i++) {
    const slide: SlideData = slideHandles[i] ?? getSlideAt(pres, i)
    const slideIndex = i + 1
    const layout = getSlideLayout(slide)
    const shapes: ReverseShapeRecord[] = []
    for (const shape of getSlideShapes(slide)) {
      collectShape(pres, shape, slideIndex, shapes, /* fromGroup */ false)
    }
    slides.push({
      slideIndex,
      partName: getSlidePartName(slide),
      title: getSlideTitle(slide),
      hidden: isSlideHidden(slide),
      notes: getSlideNotes(slide),
      layoutRef: layout
        ? {
            partName: getSlideLayoutPartName(layout),
            name: getSlideLayoutName(layout),
            type: getSlideLayoutType(layout)
          }
        : null,
      sectionName: null, // sections are presentation-level; recorded per-slide in map.ts when it matters
      shapes,
      raw: slide
    })
  }

  return {
    pres,
    slides,
    slideSize: slideSize ? { width: Number(slideSize.width), height: Number(slideSize.height) } : null,
    fonts: fonts
      ? {
          majorLatin: fonts.majorLatin,
          majorEastAsian: fonts.majorEastAsian,
          majorComplexScript: fonts.majorComplexScript,
          minorLatin: fonts.minorLatin,
          minorEastAsian: fonts.minorEastAsian,
          minorComplexScript: fonts.minorComplexScript
        }
      : null,
    sourceApp: core?.application ?? null
  }
}

function collectShape(
  pres: PresentationData,
  shape: SlideShapeData,
  slideIndex: number,
  into: ReverseShapeRecord[],
  fromGroup: boolean
): void {
  const kind = getShapeKind(shape)
  if (kind === 'group') {
    // Spec §10.1: flatten when every child maps; the container itself never
    // becomes an element. ungroupShapes on a group returns its children.
    try {
      const children = ungroupShapes(shape)
      if (children.length === 0) {
        into.push(baseRecord(pres, shape, slideIndex, kind, fromGroup, 'group'))
      }
      for (const child of children) {
        collectShape(pres, child, slideIndex, into, true)
      }
      return
    } catch {
      into.push(baseRecord(pres, shape, slideIndex, kind, fromGroup, 'group'))
      return
    }
  }
  into.push(baseRecord(pres, shape, slideIndex, kind, fromGroup))
}

function baseRecord(
  pres: PresentationData,
  shape: SlideShapeData,
  slideIndex: number,
  kind: ReverseShapeRecord['kind'],
  fromGroup: boolean,
  forceKind?: ReverseShapeRecord['kind']
): ReverseShapeRecord {
  let bounds: ReverseShapeRecord['bounds'] = null
  try {
    const resolved = getShapeBoundsResolved(pres, shape)
    if (resolved) {
      bounds = { x: Number(resolved.x), y: Number(resolved.y), w: Number(resolved.w), h: Number(resolved.h) }
    }
  } catch {
    bounds = null
  }
  return {
    slideIndex,
    shapeId: getShapeId(shape),
    originalName: getShapeName(shape),
    kind: (forceKind ?? kind) as ReverseShapeRecord['kind'],
    placeholderType: (shape as { placeholderType?: string | null }).placeholderType ?? null,
    bounds,
    rotationDeg: (() => {
      try {
        return getShapeRotation(shape)
      } catch {
        return 0
      }
    })(),
    flip: (() => {
      try {
        const f = getShapeFlip(shape) as { horizontal?: boolean; vertical?: boolean } | boolean
        if (f && typeof f === 'object') {
          return { horizontal: f.horizontal === true, vertical: f.vertical === true }
        }
        return { horizontal: false, vertical: false }
      } catch {
        return { horizontal: false, vertical: false }
      }
    })(),
    opacity: (() => {
      try {
        const o = (shape as { opacity?: number | null }).opacity
        return typeof o === 'number' ? o : null
      } catch {
        return null
      }
    })(),
    text: (() => {
      try {
        return getShapeText(shape)
      } catch {
        return ''
      }
    })(),
    raw: shape,
    fromGroup
  }
}
