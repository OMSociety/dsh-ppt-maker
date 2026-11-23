/**
 * 图表部件补丁：引擎的图表规格只收实色，图案填充与逐点数据标签版式在保存后的
 * zip 里就地写入 chart XML。
 * 补丁由 buildChart 记在 PresentationData 上（WeakMap，按演示文稿实例隔离），
 * 记录的是页对象 + 图形名（= elementId），保存时按页序与图形名定位到图表部件。
 * 引擎构建时已用实色回落，补丁缺失或定位失败时产物仍是完整可读的图表。
 */
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'

export interface PatternPaint {
  preset: string
  /** 6 位十六进制（无 #） */
  foreground: string
  background: string
}

export interface PointLabelPatch {
  index: number
  show: boolean
  offset?: { x: number; y: number }
  /** 标签文本框宽高，占图表宽 / 高的比例（c15:layout）；不给则由渲染器自动撑开。 */
  size?: { w: number; h: number }
  fontSize?: number
  bold?: boolean
  color?: string
  /** 内容开关，沿用系列级 */
  showValue: boolean
  showCategory: boolean
  showPercent: boolean
  numberFormat?: string
}

export interface GradientPaint {
  stops: Array<{ position: number; color: string; opacity?: number }>
  angleDeg: number
}

export interface ChartPatch {
  slide: object
  elementId: string
  container?: PatternPaint | GradientPaint
  /** 系列级标签内容开关；逐点标签块新建 dLbls 时用作其余点的默认 */
  labelDefault?: { showValue: boolean; showCategory: boolean; showPercent: boolean }
  series: Array<{ index: number; fill?: PatternPaint; points?: Record<number, PatternPaint> }>
  pointLabels?: PointLabelPatch[]
}

const patches = new WeakMap<object, ChartPatch[]>()

export function recordChartPatch(presentation: object, patch: ChartPatch): void {
  const list = patches.get(presentation) ?? []
  list.push(patch)
  patches.set(presentation, list)
}

export function chartPatchesOf(presentation: object): ChartPatch[] {
  return patches.get(presentation) ?? []
}

function resolveTarget(relsName: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  const sourceDir = relsName.replace(/(^|\/)_rels\/[^/]*$/, '$1').replace(/\/$/, '')
  const parts = (sourceDir ? sourceDir.split('/') : []).concat(target.split('/'))
  const out: string[] = []
  for (const part of parts) {
    if (part === '..') out.pop()
    else if (part !== '.' && part !== '') out.push(part)
  }
  return out.join('/')
}

function relsNameOf(part: string): string {
  const slash = part.lastIndexOf('/')
  return `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`
}

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(tag)?.[1]
}

function relationships(xml: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], 'Id')
    const target = attr(m[0], 'Target')
    if (id && target && !/TargetMode\s*=\s*"External"/i.test(m[0])) map.set(id, target)
  }
  return map
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function gradFillXml(g: GradientPaint): string {
  const stops = g.stops
    .map((s) => {
      const alpha = s.opacity !== undefined && s.opacity < 1 ? `<a:alpha val="${Math.round(s.opacity * 100000)}"/>` : ''
      return `<a:gs pos="${Math.round(s.position * 100000)}"><a:srgbClr val="${s.color}">${alpha}</a:srgbClr></a:gs>`
    })
    .join('')
  return `<a:gradFill rotWithShape="1"><a:gsLst>${stops}</a:gsLst><a:lin ang="${Math.round((((g.angleDeg % 360) + 360) % 360) * 60000)}" scaled="0"/></a:gradFill>`
}

function containerFillXml(p: PatternPaint | GradientPaint): string {
  return 'stops' in p ? gradFillXml(p) : pattFillXml(p)
}

function pattFillXml(p: PatternPaint): string {
  return (
    `<a:pattFill prst="${escapeXml(p.preset)}">` +
    `<a:fgClr><a:srgbClr val="${p.foreground}"/></a:fgClr>` +
    `<a:bgClr><a:srgbClr val="${p.background}"/></a:bgClr></a:pattFill>`
  )
}

const FILL_TAG = /<a:(solidFill|gradFill|pattFill|noFill|blipFill|grpFill)\b[^>]*?(?:\/>|>[\s\S]*?<\/a:\1>)/

/** 把 spPr 内部的填充换成给定填充，保留线条等其它子元素。 */
function setSpPrFill(spPrInner: string, fill: string): string {
  const lnAt = spPrInner.search(/<a:ln\b/)
  const head = lnAt < 0 ? spPrInner : spPrInner.slice(0, lnAt)
  const tail = lnAt < 0 ? '' : spPrInner.slice(lnAt)
  const cleaned = head.replace(new RegExp(FILL_TAG.source, 'g'), '')
  const geomEnd = /<\/a:prstGeom>|<a:prstGeom\b[^>]*\/>|<\/a:custGeom>/.exec(cleaned)
  if (!geomEnd) return fill + cleaned + tail
  const at = geomEnd.index + geomEnd[0].length
  return cleaned.slice(0, at) + fill + cleaned.slice(at) + tail
}

function withFillInSpPr(xml: string, fill: string, fallbackInsert: (xml: string, spPr: string) => string): string {
  const m = /<c:spPr\b[^>]*?(?:\/>|>([\s\S]*?)<\/c:spPr>)/.exec(xml)
  if (m) {
    const inner = m[1] ?? ''
    return xml.slice(0, m.index) + `<c:spPr>${setSpPrFill(inner, fill)}</c:spPr>` + xml.slice(m.index + m[0].length)
  }
  return fallbackInsert(xml, `<c:spPr>${fill}</c:spPr>`)
}

function splitSeries(chartXml: string): Map<number, { start: number; end: number }> {
  const out = new Map<number, { start: number; end: number }>()
  let order = 0
  for (const m of chartXml.matchAll(/<c:ser\b[^>]*>[\s\S]*?<\/c:ser>/g)) {
    const idx = Number(/<c:idx val="(\d+)"/.exec(m[0])?.[1] ?? order)
    out.set(idx, { start: m.index!, end: m.index! + m[0].length })
    order++
  }
  return out
}

/** ser 内容里，不含 dPt / dLbls / cat / val 的头部 spPr 要放在 tx 或 order 之后。 */
function insertSerSpPr(ser: string, spPr: string): string {
  const at = /<\/c:tx>|<c:order\b[^>]*\/>/.exec(ser)
  if (!at) return ser
  const pos = at.index + at[0].length
  return ser.slice(0, pos) + spPr + ser.slice(pos)
}

function serHeadEnd(ser: string): number {
  const stops = [ser.search(/<c:dPt\b/), ser.search(/<c:dLbls\b/), ser.search(/<c:cat\b/), ser.search(/<c:val\b/)].filter((n) => n >= 0)
  return stops.length ? Math.min(...stops) : ser.length
}

function patchSeriesFill(ser: string, fill: string): string {
  const headEnd = serHeadEnd(ser)
  const head = ser.slice(0, headEnd)
  const patched = withFillInSpPr(head, fill, insertSerSpPr)
  return patched + ser.slice(headEnd)
}

function patchPoint(ser: string, index: number, fill: string): string {
  const dpt = new RegExp(`<c:dPt>(?:(?!</c:dPt>)[\\s\\S])*?<c:idx val="${index}"/>[\\s\\S]*?</c:dPt>`).exec(ser)
  if (dpt) {
    const next = withFillInSpPr(dpt[0], fill, (x, spPr) => x.replace('</c:dPt>', `${spPr}</c:dPt>`))
    return ser.slice(0, dpt.index) + next + ser.slice(dpt.index + dpt[0].length)
  }
  const created = `<c:dPt><c:idx val="${index}"/><c:bubble3D val="0"/><c:spPr>${fill}</c:spPr></c:dPt>`
  const lastDpt = [...ser.matchAll(/<\/c:dPt>/g)].pop()
  if (lastDpt) {
    const pos = lastDpt.index! + lastDpt[0].length
    return ser.slice(0, pos) + created + ser.slice(pos)
  }
  const stop = [ser.search(/<c:dLbls\b/), ser.search(/<c:cat\b/), ser.search(/<c:val\b/)].filter((n) => n >= 0)
  const pos = stop.length ? Math.min(...stop) : ser.length
  return ser.slice(0, pos) + created + ser.slice(pos)
}

function dLblXml(p: PointLabelPatch): string {
  if (!p.show) return `<c:dLbl><c:idx val="${p.index}"/><c:delete val="1"/></c:dLbl>`
  const layout = p.offset
    ? `<c:layout><c:manualLayout><c:x val="${p.offset.x}"/><c:y val="${p.offset.y}"/></c:manualLayout></c:layout>`
    : ''
  // 标签框尺寸走 c15:layout，且必须包在 c:extLst 里、用 OOXML 指定的扩展 URI；直接挂在 dLbl 下会被忽略。
  const size = p.size
    ? `<c:extLst><c:ext uri="{CE6537A1-D6FC-4f65-9D91-7224C49458BB}" xmlns:c15="http://schemas.microsoft.com/office/drawing/2012/chart">` +
      `<c15:layout><c:manualLayout><c:w val="${p.size.w}"/><c:h val="${p.size.h}"/></c:manualLayout></c15:layout></c:ext></c:extLst>`
    : ''
  const numFmt = p.numberFormat ? `<c:numFmt formatCode="${escapeXml(p.numberFormat)}" sourceLinked="0"/>` : ''
  let txPr = ''
  if (p.fontSize !== undefined || p.bold !== undefined || p.color !== undefined || p.size) {
    const sz = p.fontSize !== undefined ? ` sz="${Math.round(p.fontSize * 100)}"` : ''
    const b = p.bold !== undefined ? ` b="${p.bold ? 1 : 0}"` : ''
    const color = p.color ? `<a:solidFill><a:srgbClr val="${p.color}"/></a:solidFill>` : ''
    // 定尺寸的标签框要有显式对齐与内边距，否则渲染器按最小宽度逐字折行。
    const body = p.size
      ? '<a:bodyPr rot="0" spcFirstLastPara="1" vertOverflow="ellipsis" vert="horz" wrap="square" lIns="38100" tIns="19050" rIns="38100" bIns="19050" anchor="ctr" anchorCtr="1"><a:noAutofit/></a:bodyPr>'
      : '<a:bodyPr/>'
    txPr = `<c:txPr>${body}<a:lstStyle/><a:p><a:pPr><a:defRPr${sz}${b}>${color}</a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`
  }
  const flag = (v: boolean): string => (v ? '1' : '0')
  const spPr = p.size ? '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln><a:effectLst/></c:spPr>' : ''
  return (
    `<c:dLbl><c:idx val="${p.index}"/>${layout}${numFmt}${spPr}${txPr}` +
    `<c:showLegendKey val="0"/><c:showVal val="${flag(p.showValue)}"/><c:showCatName val="${flag(p.showCategory)}"/>` +
    `<c:showSerName val="0"/><c:showPercent val="${flag(p.showPercent)}"/><c:showBubbleSize val="0"/>${size}</c:dLbl>`
  )
}

function patchLabels(
  ser: string,
  labels: PointLabelPatch[],
  base: { showValue: boolean; showCategory: boolean; showPercent: boolean }
): string {
  const sorted = [...labels].sort((a, b) => a.index - b.index)
  const items = sorted.map(dLblXml).join('')
  const open = /<c:dLbls>/.exec(ser)
  if (open) {
    const pos = open.index + open[0].length
    return ser.slice(0, pos) + items + ser.slice(pos)
  }
  const group =
    `<c:showLegendKey val="0"/><c:showVal val="${base.showValue ? 1 : 0}"/><c:showCatName val="${base.showCategory ? 1 : 0}"/>` +
    `<c:showSerName val="0"/><c:showPercent val="${base.showPercent ? 1 : 0}"/><c:showBubbleSize val="0"/>`
  const block = `<c:dLbls>${items}${group}</c:dLbls>`
  const stop = [ser.search(/<c:cat\b/), ser.search(/<c:val\b/)].filter((n) => n >= 0)
  const pos = stop.length ? Math.min(...stop) : ser.length
  return ser.slice(0, pos) + block + ser.slice(pos)
}

function patchContainer(xml: string, fill: string): string {
  const chartEnd = xml.indexOf('</c:chart>')
  if (chartEnd < 0) return xml
  const after = chartEnd + '</c:chart>'.length
  const rest = xml.slice(after)
  const m = /^\s*<c:spPr\b[^>]*?(?:\/>|>([\s\S]*?)<\/c:spPr>)/.exec(rest)
  if (m) {
    return xml.slice(0, after) + `<c:spPr>${setSpPrFill(m[1] ?? '', fill)}</c:spPr>` + rest.slice(m[0].length)
  }
  return xml.slice(0, after) + `<c:spPr>${fill}</c:spPr>` + rest
}

export function patchChartXml(chartXml: string, patch: ChartPatch): string {
  let xml = chartXml
  const ranges = splitSeries(xml)
  const edits = new Map<number, (ser: string) => string>()
  for (const s of patch.series) {
    edits.set(s.index, (ser) => {
      let out = ser
      for (const [idx, paint] of Object.entries(s.points ?? {})) out = patchPoint(out, Number(idx), pattFillXml(paint))
      if (s.fill) out = patchSeriesFill(out, pattFillXml(s.fill))
      return out
    })
  }
  if (patch.pointLabels?.length) {
    const prior = edits.get(0)
    const base = patch.labelDefault ?? { showValue: false, showCategory: false, showPercent: false }
    edits.set(0, (ser) => patchLabels(prior ? prior(ser) : ser, patch.pointLabels!, base))
  }
  const order = [...edits.keys()].filter((i) => ranges.has(i)).sort((a, b) => ranges.get(b)!.start - ranges.get(a)!.start)
  for (const i of order) {
    const { start, end } = ranges.get(i)!
    xml = xml.slice(0, start) + edits.get(i)!(xml.slice(start, end)) + xml.slice(end)
  }
  if (patch.container) xml = patchContainer(xml, containerFillXml(patch.container))
  return xml
}

interface SlideRef {
  part: string
  xml: string
}

function orderedSlideParts(files: Record<string, Uint8Array>): string[] {
  const pres = files['ppt/presentation.xml']
  const rels = files['ppt/_rels/presentation.xml.rels']
  if (!pres || !rels) return []
  const map = relationships(strFromU8(rels))
  const out: string[] = []
  for (const m of strFromU8(pres).matchAll(/<p:sldId\b[^>]*>/g)) {
    const rid = attr(m[0], 'r:id')
    const target = rid ? map.get(rid) : undefined
    out.push(target ? resolveTarget('ppt/_rels/presentation.xml.rels', target) : '')
  }
  return out
}

function chartPartOf(files: Record<string, Uint8Array>, slide: SlideRef, elementId: string): string | undefined {
  const rels = files[relsNameOf(slide.part)]
  if (!rels) return undefined
  const map = relationships(strFromU8(rels))
  for (const frame of slide.xml.matchAll(/<p:graphicFrame\b[\s\S]*?<\/p:graphicFrame>/g)) {
    const name = /<p:cNvPr\b[^>]*\bname="([^"]*)"/.exec(frame[0])?.[1]
    if (name === undefined || name !== escapeXml(elementId)) continue
    const rid = /<c:chart\b[^>]*\br:id="([^"]*)"/.exec(frame[0])?.[1]
    const target = rid ? map.get(rid) : undefined
    if (target) return resolveTarget(relsNameOf(slide.part), target)
  }
  return undefined
}

/**
 * 按补丁清单改写已保存的 pptx 字节。slideIndexOf 给出补丁所属页在最终页序里的下标。
 * 解析或定位异常时跳过该补丁。
 */
export function applyChartPatches(
  bytes: Uint8Array,
  patches: ChartPatch[],
  slideIndexOf: (slide: object) => number
): Uint8Array {
  if (patches.length === 0) return bytes
  try {
    const files = unzipSync(bytes)
    const slideParts = orderedSlideParts(files)
    let changed = false
    for (const patch of patches) {
      const part = slideParts[slideIndexOf(patch.slide)]
      const slideBytes = part ? files[part] : undefined
      if (!part || !slideBytes) continue
      const chartPart = chartPartOf(files, { part, xml: strFromU8(slideBytes) }, patch.elementId)
      const chartBytes = chartPart ? files[chartPart] : undefined
      if (!chartPart || !chartBytes) continue
      files[chartPart] = strToU8(patchChartXml(strFromU8(chartBytes), patch))
      changed = true
    }
    return changed ? zipSync(files as Zippable) : bytes
  } catch {
    return bytes
  }
}
