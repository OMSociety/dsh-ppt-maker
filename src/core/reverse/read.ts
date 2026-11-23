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
  getPresentationTheme,
  getShapeBoundsResolved,
  getShapeFlip,
  getShapeId,
  getShapeKind,
  getShapeName,
  getShapeRotation,
  getShapeText,
  getShapeXmlString,
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
  type PresentationTheme,
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
  fromGroup: boolean,
  groupFill?: string
): void {
  const kind = getShapeKind(shape)
  if (kind === 'group') {
    // Spec §10.1: flatten when every child maps; the container itself never
    // becomes an element. ungroupShapes on a group returns its children.
    // The group's own fill is read first: children marked <a:grpFill/> paint
    // with it, and the container disappears once ungrouped.
    const ownFill = groupSolidFill(pres, shape) ?? groupFill
    try {
      const children = ungroupShapes(shape)
      if (children.length === 0) {
        into.push(withGroupFill(baseRecord(pres, shape, slideIndex, kind, fromGroup, 'group'), groupFill))
      }
      for (const child of children) {
        collectShape(pres, child, slideIndex, into, true, ownFill)
      }
      return
    } catch {
      into.push(withGroupFill(baseRecord(pres, shape, slideIndex, kind, fromGroup, 'group'), groupFill))
      return
    }
  }
  into.push(withGroupFill(baseRecord(pres, shape, slideIndex, kind, fromGroup), groupFill))
}

function withGroupFill(rec: ReverseShapeRecord, groupFill: string | undefined): ReverseShapeRecord {
  if (groupFill) rec.groupFill = groupFill
  return rec
}

const THEME_SLOT: Record<string, keyof PresentationTheme> = {
  dk1: 'dark1', lt1: 'light1', dk2: 'dark2', lt2: 'light2',
  accent1: 'accent1', accent2: 'accent2', accent3: 'accent3',
  accent4: 'accent4', accent5: 'accent5', accent6: 'accent6',
  hlink: 'hyperlink', folHlink: 'followedHyperlink'
}
const DEFAULT_CLR_MAP: Record<string, string> = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' }

/** lumMod / lumOff / shade / tint applied to `#RRGGBB` (ECMA-376 §20.1.2.3, HSL luminance). */
function applyTransforms(hex: string, transforms: Array<[string, number]>): string {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  for (const [name, raw] of transforms) {
    const v = raw / 100000
    if (name === 'shade') [r, g, b] = [r * v, g * v, b * v]
    else if (name === 'tint') [r, g, b] = [r + (1 - r) * v, g + (1 - g) * v, b + (1 - b) * v]
    else if (name === 'lumMod' || name === 'lumOff') {
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      let l = (max + min) / 2
      const d = max - min
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
      let h = 0
      if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
      }
      l = name === 'lumMod' ? l * v : l + v
      l = Math.min(1, Math.max(0, l))
      const c = (1 - Math.abs(2 * l - 1)) * s
      const x = c * (1 - Math.abs((h % 2) - 1))
      const m = l - c / 2
      const sector = Math.floor(((h % 6) + 6) % 6)
      const rgb = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][sector]
      ;[r, g, b] = [rgb[0] + m, rgb[1] + m, rgb[2] + m]
    }
  }
  return `#${[r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/**
 * Solid fill of a group container, read from its own `<p:grpSpPr>`: children
 * filled with `<a:grpFill/>` paint with it. Theme colours resolve through the
 * deck theme and the default colour map; transforms apply in document order.
 */
function groupSolidFill(pres: PresentationData, group: SlideShapeData): string | undefined {
  let xml: string
  try {
    xml = getShapeXmlString(group)
  } catch {
    return undefined
  }
  const grpSpPr = /<p:grpSpPr\b[^>]*>([\s\S]*?)<\/p:grpSpPr>/.exec(xml)?.[1]
  const solid = grpSpPr ? /<a:solidFill>([\s\S]*?)<\/a:solidFill>/.exec(grpSpPr)?.[1] : undefined
  if (!solid) return undefined
  const transforms = [...solid.matchAll(/<a:(lumMod|lumOff|shade|tint)\s+val="(\d+)"/g)].map(
    (m) => [m[1], Number(m[2])] as [string, number]
  )
  const srgb = /<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/.exec(solid)?.[1]
  if (srgb) return applyTransforms(`#${srgb.toUpperCase()}`, transforms)
  const scheme = /<a:schemeClr\s+val="(\w+)"/.exec(solid)?.[1]
  if (!scheme) return undefined
  const theme = getPresentationTheme(pres)
  const slot = THEME_SLOT[DEFAULT_CLR_MAP[scheme] ?? scheme]
  const base = theme && slot ? theme[slot] : null
  if (!base || !/^#?[0-9A-Fa-f]{6}$/.test(base)) return undefined
  return applyTransforms(base.startsWith('#') ? base.toUpperCase() : `#${base.toUpperCase()}`, transforms)
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
