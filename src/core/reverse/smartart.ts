/**
 * SmartArt expansion (spec §10.6).
 *
 * A SmartArt graphic frame stores its rendered look in a drawing part
 * (`ppt/diagrams/drawingN.xml`, `dsp:` namespace) that PowerPoint keeps in
 * sync with the diagram data. Before mapping, every SmartArt frame whose
 * drawing part is present is rewritten — in a working copy of the package —
 * into a `<p:grpSp>` holding the cached shapes, so the ordinary shape mapper
 * turns them into editable elements and the group path keeps them together.
 *
 * Drawing coordinates are relative to the frame, so the group's child extent
 * equals the frame extent. Picture relationships of the drawing part are
 * re-registered on the slide. Frames without a drawing part stay untouched and
 * fall to the placeholder path.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

export interface ExpandedSmartArt {
  /** 1-based slide number. */
  slideIndex: number
  /** Shape id of the SmartArt frame; the group keeps it (`g-{slideIndex}-{shapeId}`). */
  shapeId: number
  name: string
  shapeCount: number
}

const DIAGRAM_URI = 'http://schemas.openxmlformats.org/drawingml/2006/diagram'
const DRAWING_REL_TYPE = 'http://schemas.microsoft.com/office/2007/relationships/diagramDrawing'

function resolvePart(baseDir: string, target: string): string {
  const segments = (target.startsWith('/') ? target.slice(1) : `${baseDir}/${target}`).split('/')
  const out: string[] = []
  for (const seg of segments) {
    if (seg === '..') out.pop()
    else if (seg !== '.' && seg !== '') out.push(seg)
  }
  return out.join('/')
}

function relsOf(xml: string): { id: string; type: string; target: string; external: boolean }[] {
  return [...xml.matchAll(/<Relationship\b[^>]*\/?>/g)].map((m) => {
    const tag = m[0]
    return {
      id: /\bId="([^"]+)"/.exec(tag)?.[1] ?? '',
      type: /\bType="([^"]+)"/.exec(tag)?.[1] ?? '',
      target: /\bTarget="([^"]+)"/.exec(tag)?.[1] ?? '',
      external: /TargetMode="External"/.test(tag)
    }
  })
}

/** Converts a drawing-part shape tree body into presentationML shapes with fresh ids. */
function convertShapes(body: string, nextId: () => number, ridMap: Map<string, string>): { xml: string; count: number } | null {
  let count = 0
  let xml = body
    .replace(/<dsp:txXfrm>[\s\S]*?<\/dsp:txXfrm>|<dsp:txXfrm\b[^>]*\/>/g, '')
    .replace(/<dsp:sp\b[^>]*>/g, () => {
      count += 1
      return '<p:sp>'
    })
    .replace(/<dsp:grpSp\b[^>]*>/g, '<p:grpSp>')
    .replace(/<(\/?)dsp:/g, '<$1p:')
    .replace(/<p:cNvPr\b[^>]*?(\/?)>/g, (_m, close: string) => `<p:cNvPr id="${nextId()}" name="SmartArt ${count}"${close}>`)
    .replace(/<p:cNvSpPr\/>/g, '<p:cNvSpPr/><p:nvPr/>')
    .replace(/<\/p:cNvSpPr>/g, '</p:cNvSpPr><p:nvPr/>')
    .replace(/<p:cNvGrpSpPr\/>/g, '<p:cNvGrpSpPr/><p:nvPr/>')
    .replace(/<\/p:cNvGrpSpPr>/g, '</p:cNvGrpSpPr><p:nvPr/>')
  let missing = false
  xml = xml.replace(/\br:(embed|link)="([^"]+)"/g, (m, attr: string, rid: string) => {
    const mapped = ridMap.get(rid)
    if (!mapped) {
      missing = true
      return m
    }
    return `r:${attr}="${mapped}"`
  })
  if (missing || count === 0) return null
  return { xml, count }
}

/**
 * Returns a working copy of the package with every expandable SmartArt frame
 * replaced by a group of its cached shapes, plus the list of expanded frames.
 * The input bytes are returned unchanged when nothing was expanded.
 */
export function expandSmartArt(bytes: Uint8Array): { bytes: Uint8Array; expanded: ExpandedSmartArt[] } {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    return { bytes, expanded: [] }
  }
  const expanded: ExpandedSmartArt[] = []
  const slideNames = Object.keys(files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
  const presentation = files['ppt/presentation.xml'] ? strFromU8(files['ppt/presentation.xml']) : ''
  const presRels = files['ppt/_rels/presentation.xml.rels'] ? relsOf(strFromU8(files['ppt/_rels/presentation.xml.rels'])) : []
  const slideOrder = [...presentation.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map((m) => {
    const rel = presRels.find((r) => r.id === m[1])
    return rel ? resolvePart('ppt', rel.target) : ''
  })

  for (const slideName of slideNames) {
    const slideIndex = slideOrder.indexOf(slideName) + 1
    if (slideIndex === 0) continue
    let slideXml = strFromU8(files[slideName])
    if (!slideXml.includes(DIAGRAM_URI)) continue
    const relsName = slideName.replace(/^ppt\/slides\//, 'ppt/slides/_rels/') + '.rels'
    let relsXml = files[relsName] ? strFromU8(files[relsName]) : ''
    const slideRels = relsOf(relsXml)
    let maxId = Math.max(0, ...[...slideXml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map((m) => Number(m[1])))
    const nextId = () => ++maxId
    let relSeq = 0
    let changed = false

    slideXml = slideXml.replace(/<p:graphicFrame\b[\s\S]*?<\/p:graphicFrame>/g, (frame) => {
      if (!frame.includes(DIAGRAM_URI)) return frame
      const idAttr = /<p:cNvPr\b[^>]*\bid="(\d+)"/.exec(frame)
      const name = /<p:cNvPr\b[^>]*\bname="([^"]*)"/.exec(frame)?.[1] ?? ''
      const off = /<p:xfrm>\s*<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(frame)
      const dmRid = /\br:dm="([^"]+)"/.exec(frame)?.[1]
      if (!idAttr || !off || !dmRid) return frame
      const dm = slideRels.find((r) => r.id === dmRid)
      if (!dm || dm.external) return frame
      const dataName = resolvePart('ppt/slides', dm.target)
      const dataXml = files[dataName] ? strFromU8(files[dataName]) : ''
      const drawingRid = /<dsp:dataModelExt\b[^>]*\brelId="([^"]+)"/.exec(dataXml)?.[1]
      const drawingRel =
        (drawingRid && slideRels.find((r) => r.id === drawingRid)) ||
        slideRels.find((r) => r.type === DRAWING_REL_TYPE && r.target.includes(dataName.replace(/^.*data(\d+)\.xml$/, 'drawing$1.xml')))
      if (!drawingRel) return frame
      const drawingName = resolvePart('ppt/slides', drawingRel.target)
      const drawingXml = files[drawingName] ? strFromU8(files[drawingName]) : ''
      const tree = /<dsp:spTree>([\s\S]*)<\/dsp:spTree>/.exec(drawingXml)?.[1]
      if (!tree) return frame
      const body = tree.replace(/^\s*<dsp:nvGrpSpPr>[\s\S]*?<\/dsp:nvGrpSpPr>\s*(<dsp:grpSpPr\/>|<dsp:grpSpPr>[\s\S]*?<\/dsp:grpSpPr>)/, '')

      // Picture relationships of the drawing part, re-registered on the slide.
      const drawingRelsName = drawingName.replace(/^(.*)\/([^/]+)$/, '$1/_rels/$2.rels')
      const ridMap = new Map<string, string>()
      const addedRels: string[] = []
      if (files[drawingRelsName]) {
        for (const r of relsOf(strFromU8(files[drawingRelsName]))) {
          const newId = `rIdSmartArt${++relSeq}`
          ridMap.set(r.id, newId)
          const target = r.external ? r.target : `../${resolvePart('ppt/diagrams', r.target).replace(/^ppt\//, '')}`
          addedRels.push(`<Relationship Id="${newId}" Type="${r.type}" Target="${target}"${r.external ? ' TargetMode="External"' : ''}/>`)
        }
      }
      const converted = convertShapes(body, nextId, ridMap)
      if (!converted) return frame

      const xmlns = [...(/<dsp:drawing\b([^>]*)>/.exec(drawingXml)?.[1] ?? '').matchAll(/\s(xmlns:(\w+)="[^"]+")/g)]
        .filter((m) => m[2] !== 'dsp' && !new RegExp(`\\sxmlns:${m[2]}=`).test(slideXml.slice(0, slideXml.indexOf('>') + 1)))
        .map((m) => ` ${m[1]}`)
        .join('')
      relsXml = relsXml.replace('</Relationships>', `${addedRels.join('')}</Relationships>`)
      changed = true
      expanded.push({ slideIndex, shapeId: Number(idAttr[1]), name, shapeCount: converted.count })
      const [, x, y, cx, cy] = off
      return (
        `<p:grpSp${xmlns}><p:nvGrpSpPr><p:cNvPr id="${idAttr[1]}" name="${name}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
        `<p:grpSpPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/><a:chOff x="0" y="0"/><a:chExt cx="${cx}" cy="${cy}"/></a:xfrm></p:grpSpPr>` +
        `${converted.xml}</p:grpSp>`
      )
    })

    if (changed) {
      files[slideName] = strToU8(slideXml)
      files[relsName] = strToU8(relsXml)
    }
  }

  if (expanded.length === 0) return { bytes, expanded }
  return { bytes: zipSync(files), expanded }
}
