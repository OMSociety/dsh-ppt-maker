/**
 * PPTD scatter / bubble / radar 图表 → 工作台图表视图模型（无 React、无 DOM）。
 *
 * 数据→像素、辐条角度、气泡半径、图例与标题的排版都在这里算好，组件层只负责画。
 * 契约见 docs/pptd-spec.md §6.7：data:{cols, rows 二维数组} + series[].encode 引用列名。
 */
import type { ThemeLike } from './resolve'
import { resolveColor } from './resolve'
import {
  columnIndex,
  dataLabelModelOf,
  niceScale,
  numberOf,
  paintOf,
  type ChartDataLabelModel,
  type NiceScale,
} from './chart-model'

type Rec = Record<string, unknown>

function recOf(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Rec : {}
}

/** 图表元素的绘制尺寸，单位 px。 */
export interface ChartSize {
  width: number
  height: number
}

export type XYKind = 'scatter' | 'bubble'

/** 图表族：纯 scatter / 纯 bubble / 纯 radar / 其余（bar、line、area、pie…）/ 含 scatter·bubble·radar 的不支持混排。 */
export type ChartKind = XYKind | 'radar' | 'classic' | 'mixed'

export function chartKindOf(content: Rec): ChartKind {
  const specs = Array.isArray(content.series) ? content.series : []
  const types = new Set<string>()
  for (const raw of specs) {
    if (raw && typeof raw === 'object') types.add(typeof (raw as Rec).type === 'string' ? (raw as Rec).type as string : 'bar')
  }
  const special = ['scatter', 'bubble', 'radar'].filter((type) => types.has(type))
  if (!special.length) return 'classic'
  return types.size === 1 ? special[0] as ChartKind : 'mixed'
}

// ---------------------------------------------------------------- 公共：线条、边框、图例、标题

export interface ChartLineModel {
  color?: string
  width?: number
  /** SVG stroke-dasharray；实线省略。 */
  dash?: string
}

function lineOf(value: unknown, theme?: ThemeLike | null, fallbackColor?: string): ChartLineModel | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const rec = value as Rec
  const stops = recOf(rec.gradient).stops
  const color = resolveColor(rec.color, theme)
    ?? resolveColor(recOf(Array.isArray(stops) ? stops[0] : undefined).color, theme)
    ?? fallbackColor
  return {
    ...(color ? { color } : {}),
    ...(typeof rec.width === 'number' && rec.width > 0 ? { width: rec.width } : {}),
    ...(rec.style === 'dash' ? { dash: '4 3' } : rec.style === 'dot' ? { dash: '1.5 2.5' } : {}),
  }
}

/** 估算文本宽度：CJK 全角按字号，其余按 0.56 字号。 */
export function textWidthOf(text: string, fontSize: number): number {
  let width = 0
  for (const ch of text) width += (ch.codePointAt(0) ?? 0) > 255 ? fontSize : fontSize * 0.56
  return width
}

export interface PlotRect {
  left: number
  top: number
  width: number
  height: number
}

export interface ChartTitleModel {
  text: string
  /** 水平居中点。 */
  x: number
  /** 文字基线。 */
  y: number
  fontSize: number
  color?: string
  fontFamily?: string
}

export interface ChartLegendItemModel {
  name: string
  color: string
  /** 10×10 色块左上角。 */
  swatchX: number
  swatchY: number
  textX: number
  textY: number
}

export interface ChartLegendModel {
  position: 'top' | 'bottom' | 'left' | 'right'
  fontSize: number
  color?: string
  fontFamily?: string
  items: ChartLegendItemModel[]
}

export interface ChartFrameModel {
  title?: ChartTitleModel
  legend?: ChartLegendModel
  plot: PlotRect
}

const LEGEND_ROW = 18
const LEGEND_GAP = 14
const LEGEND_SWATCH = 14

/**
 * 标题 + 图例 + 绘图区。`insets` 是绘图区自身需要的四边留白（轴标签等），
 * 标题与图例在其基础上再占位。
 */
export function chartFrameOf(
  content: Rec,
  size: ChartSize,
  items: Array<{ name: string; color: string }>,
  insets: { left: number; right: number; top: number; bottom: number },
  theme?: ThemeLike | null
): ChartFrameModel {
  const { width, height } = size
  let { left, right, top, bottom } = insets

  const titleRaw = content.title
  const titleCfg = recOf(titleRaw)
  const titleText = typeof titleRaw === 'string' ? titleRaw : typeof titleCfg.text === 'string' ? titleCfg.text : ''
  let title: ChartTitleModel | undefined
  if (titleText) {
    const fontSize = typeof titleCfg.fontSize === 'number' ? titleCfg.fontSize : 14
    const color = resolveColor(titleCfg.color, theme)
    title = {
      text: titleText,
      x: width / 2,
      y: 6 + fontSize,
      fontSize,
      ...(color ? { color } : {}),
      ...(typeof titleCfg.fontFamily === 'string' ? { fontFamily: titleCfg.fontFamily } : {}),
    }
    top += fontSize + 12
  }

  const legendRaw = content.legend
  const legendCfg = recOf(legendRaw)
  const showLegend = legendRaw !== false && legendCfg.show !== false && items.length > 0
  let legend: ChartLegendModel | undefined
  if (showLegend) {
    const position = (['top', 'bottom', 'left', 'right'] as const).find((p) => p === legendCfg.position) ?? 'bottom'
    const fontSize = typeof legendCfg.fontSize === 'number' ? legendCfg.fontSize : 10
    const widths = items.map((item) => LEGEND_SWATCH + textWidthOf(item.name, fontSize))
    const place = (name: string, color: string, x: number, y: number): ChartLegendItemModel => ({
      name,
      color,
      swatchX: x,
      swatchY: y + 4,
      textX: x + LEGEND_SWATCH,
      textY: y + 4 + fontSize * 0.85,
    })
    const placed: ChartLegendItemModel[] = []
    if (position === 'top' || position === 'bottom') {
      const maxRow = Math.max(40, width - 16)
      const rows: number[][] = [[]]
      let used = 0
      widths.forEach((w, index) => {
        const row = rows[rows.length - 1]
        if (row.length && used + LEGEND_GAP + w > maxRow) {
          rows.push([index])
          used = w
        } else {
          used += (row.length ? LEGEND_GAP : 0) + w
          row.push(index)
        }
      })
      const blockH = rows.length * LEGEND_ROW + 6
      const y0 = position === 'bottom' ? height - blockH + 3 : top + 2
      rows.forEach((row, rowIndex) => {
        const total = row.reduce((sum, index) => sum + widths[index], 0) + LEGEND_GAP * (row.length - 1)
        let x = (width - total) / 2
        for (const index of row) {
          placed.push(place(items[index].name, items[index].color, x, y0 + rowIndex * LEGEND_ROW))
          x += widths[index] + LEGEND_GAP
        }
      })
      if (position === 'bottom') bottom += blockH
      else top += blockH
    } else {
      const colW = Math.max(...widths) + 8
      const blockH = items.length * LEGEND_ROW
      const x0 = position === 'left' ? 8 : width - colW - 4
      const y0 = top + Math.max(0, (height - top - bottom - blockH) / 2)
      items.forEach((item, index) => placed.push(place(item.name, item.color, x0, y0 + index * LEGEND_ROW)))
      if (position === 'left') left += colW + 8
      else right += colW + 8
    }
    const color = resolveColor(legendCfg.color, theme)
    legend = {
      position,
      fontSize,
      ...(color ? { color } : {}),
      ...(typeof legendCfg.fontFamily === 'string' ? { fontFamily: legendCfg.fontFamily } : {}),
      items: placed,
    }
  }

  return {
    ...(title ? { title } : {}),
    ...(legend ? { legend } : {}),
    plot: {
      left,
      top,
      width: Math.max(10, width - left - right),
      height: Math.max(10, height - top - bottom),
    },
  }
}

// ---------------------------------------------------------------- 取数

interface ChartTable {
  cols: unknown[]
  rows: unknown[][]
}

function tableOf(content: Rec): ChartTable {
  const data = recOf(content.data)
  return {
    cols: Array.isArray(data.cols) ? data.cols : [],
    rows: Array.isArray(data.rows) ? data.rows.filter(Array.isArray) as unknown[][] : [],
  }
}

/** seriesDefaults 一层深合并：标量以系列为准，对象浅合并，数组整体替换（§1.3.3）。 */
function withDefaults(content: Rec, spec: Rec): Rec {
  const type = typeof spec.type === 'string' ? spec.type : ''
  const defaults = recOf(recOf(content.seriesDefaults)[type])
  const merged: Rec = { ...defaults, ...spec }
  for (const key of Object.keys(defaults)) {
    const base = defaults[key]
    const own = spec[key]
    if (base && own && typeof base === 'object' && typeof own === 'object' && !Array.isArray(base) && !Array.isArray(own)) {
      merged[key] = { ...(base as Rec), ...(own as Rec) }
    }
  }
  return merged
}

function filteredRows(table: ChartTable, spec: Rec): unknown[][] {
  const filter = recOf(spec.dataFilter)
  if (typeof filter.col !== 'string' || filter.value === undefined) return table.rows
  const index = table.cols.findIndex((col) => String(col) === filter.col)
  if (index < 0) return table.rows
  return table.rows.filter((row) => String(row[index]) === String(filter.value))
}

function axisOf(value: unknown): Rec {
  return Array.isArray(value) ? recOf(value[0]) : recOf(value)
}

// ---------------------------------------------------------------- 散点 / 气泡

export type MarkerShape = 'circle' | 'rect' | 'diamond' | 'triangle'

export type MarkerGeometry =
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'polygon'; points: string }

/** 标记几何：`size` 为标记外接直径（px）。 */
export function markerGeometry(shape: MarkerShape, cx: number, cy: number, size: number): MarkerGeometry {
  const h = size / 2
  const fmt = (pairs: Array<[number, number]>) => pairs.map(([x, y]) => `${x},${y}`).join(' ')
  if (shape === 'rect') return { type: 'polygon', points: fmt([[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]]) }
  if (shape === 'diamond') return { type: 'polygon', points: fmt([[cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]]) }
  if (shape === 'triangle') return { type: 'polygon', points: fmt([[cx, cy - h], [cx + h, cy + h], [cx - h, cy + h]]) }
  return { type: 'circle', cx, cy, r: h }
}

export interface XYPointModel {
  /** 数据值。 */
  x: number
  y: number
  /** 像素坐标。 */
  px: number
  py: number
  /** 气泡：原始 size 通道（负值已按 0）与像素半径。 */
  size?: number
  r?: number
  /** 数值标签文本取值（y 通道）与锚点。 */
  value: number
  labelX: number
  labelY: number
}

export interface XYSeriesModel {
  kind: XYKind
  name: string
  color: string
  opacity: number
  /** 散点标记；气泡无。 */
  marker?: { shape: MarkerShape; size: number }
  border?: ChartLineModel
  /** above：标签在标记上方；center：落在气泡中心（组件再按字号取基线）。 */
  labelPlacement: 'above' | 'center'
  points: XYPointModel[]
  dataLabels?: ChartDataLabelModel
}

export interface XYAxisModel {
  show: boolean
  gridLine: boolean
  label: boolean
  axisLine: boolean
  gridStyle?: ChartLineModel
  axisStyle?: ChartLineModel
  fontSize?: number
  color?: string
  fontFamily?: string
  numberFormat?: string
  min: number
  max: number
  reverse: boolean
  ticks: Array<{ value: number; pos: number }>
}

export interface XYChartModel {
  kind: XYKind
  width: number
  height: number
  plot: PlotRect
  xAxis: XYAxisModel
  yAxis: XYAxisModel
  series: XYSeriesModel[]
  title?: ChartTitleModel
  legend?: ChartLegendModel
}

export type BubbleScale = 'linear' | 'sqrt' | 'log'

/**
 * 气泡半径（px）。size 负按 0；`range` 为 [最小半径, 最大半径]：
 * sqrt（默认）半径 ∝ √size，最小半径为 0 时面积与 size 成正比；linear 半径 ∝ size；log 取 ln(1+size)。
 * `maxSize` 为全图 size 最大值，保证多系列之间可比。
 */
export function bubbleRadius(size: number, maxSize: number, scale: BubbleScale, range: [number, number]): number {
  const s = Math.max(0, size)
  const m = Math.max(0, maxSize)
  if (m <= 0) return range[0]
  const t = scale === 'linear' ? s / m : scale === 'log' ? Math.log1p(s) / Math.log1p(m) : Math.sqrt(s / m)
  return range[0] + (range[1] - range[0]) * Math.min(1, t)
}

function sizeRangeOf(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined
  const a = numberOf(value[0])
  const b = numberOf(value[1])
  if (a === undefined || b === undefined || a < 0 || b < 0) return undefined
  return [Math.min(a, b), Math.max(a, b)]
}

function axisModelOf(
  axis: Rec,
  scale: NiceScale,
  position: (value: number) => number,
  theme?: ThemeLike | null
): XYAxisModel {
  const show = axis.show !== false
  const label = recOf(axis.label)
  const color = resolveColor(label.color, theme)
  const gridStyle = lineOf(axis.gridLine, theme)
  const axisStyle = lineOf(axis.axisLine, theme)
  return {
    show,
    gridLine: show && axis.gridLine !== false,
    label: show && axis.label !== false,
    axisLine: show && axis.axisLine !== false,
    ...(gridStyle ? { gridStyle } : {}),
    ...(axisStyle ? { axisStyle } : {}),
    ...(typeof label.fontSize === 'number' ? { fontSize: label.fontSize } : {}),
    ...(color ? { color } : {}),
    ...(typeof label.fontFamily === 'string' ? { fontFamily: label.fontFamily } : {}),
    ...(typeof label.numberFormat === 'string' ? { numberFormat: label.numberFormat } : {}),
    min: scale.min,
    max: scale.max,
    reverse: axis.reverse === true,
    ticks: scale.ticks.map((value) => ({ value, pos: position(value) })),
  }
}

interface RawXYSeries {
  spec: Rec
  seriesIndex: number
  name: string
  color: string
  rows: Array<{ x: number; y: number; size?: number }>
}

function xyModelOf(content: Rec, theme: ThemeLike | null | undefined, size: ChartSize, kind: XYKind): XYChartModel | null {
  if (chartKindOf(content) !== kind) return null
  const table = tableOf(content)
  const specs = Array.isArray(content.series) ? content.series : []
  const raws: RawXYSeries[] = []
  specs.forEach((rawSpec, seriesIndex) => {
    if (!rawSpec || typeof rawSpec !== 'object') return
    const spec = withDefaults(content, rawSpec as Rec)
    if (spec.type !== kind) return
    const encode = recOf(spec.encode)
    const xi = columnIndex(table.cols, encode.x, 0)
    const yi = columnIndex(table.cols, encode.y, 1)
    const si = columnIndex(table.cols, encode.size, 2)
    const rows = filteredRows(table, spec).flatMap((row) => {
      const x = numberOf(row[xi])
      const y = numberOf(row[yi])
      if (x === undefined || y === undefined) return []
      if (kind === 'bubble') {
        const s = numberOf(row[si])
        if (s === undefined) return []
        return [{ x, y, size: Math.max(0, s) }]
      }
      return [{ x, y }]
    })
    if (!rows.length) return
    const marker = recOf(spec.marker)
    const paint = paintOf(kind === 'scatter' && marker.fill !== undefined ? marker.fill : spec.fill, seriesIndex, theme)
    raws.push({
      spec,
      seriesIndex,
      name: typeof spec.name === 'string' ? spec.name : String(table.cols[yi] ?? `系列 ${seriesIndex + 1}`),
      color: paint.color,
      rows,
    })
  })
  if (!raws.length) return null

  const frame = chartFrameOf(content, size, raws.map((raw) => ({ name: raw.name, color: raw.color })),
    { left: 44, right: 14, top: 14, bottom: 30 }, theme)
  const { plot } = frame
  const short = Math.min(plot.width, plot.height)

  const maxSize = Math.max(0, ...raws.flatMap((raw) => raw.rows.map((row) => row.size ?? 0)))
  const defaultRange: [number, number] = [0, Math.max(8, Math.round(short * 0.12))]
  const ranges = raws.map((raw) => sizeRangeOf(raw.spec.sizeRange) ?? defaultRange)
  const rMax = kind === 'bubble' ? Math.max(0, ...ranges.map((range) => range[1])) : 0

  const xAxisRaw = axisOf(content.xAxis)
  const yAxisRaw = axisOf(content.yAxis)
  const scaleOf = (values: number[], axis: Rec, plotPx: number) => {
    const min = numberOf(axis.min)
    const max = numberOf(axis.max)
    let padded = values
    if (rMax > 0 && values.length) {
      const lo = Math.min(...values)
      const hi = Math.max(...values)
      const pad = (hi - lo) * rMax / Math.max(1, plotPx - 2 * rMax)
      if (pad > 0) padded = [lo - pad, hi + pad]
    }
    return niceScale(padded, min, max, true)
  }
  const xScale = scaleOf(raws.flatMap((raw) => raw.rows.map((row) => row.x)), xAxisRaw, plot.width)
  const yScale = scaleOf(raws.flatMap((raw) => raw.rows.map((row) => row.y)), yAxisRaw, plot.height)
  const xReverse = xAxisRaw.reverse === true
  const yReverse = yAxisRaw.reverse === true
  const frac = (value: number, scale: NiceScale, reverse: boolean) => {
    const span = scale.max - scale.min || 1
    return reverse ? (scale.max - value) / span : (value - scale.min) / span
  }
  const xPos = (value: number) => plot.left + frac(value, xScale, xReverse) * plot.width
  const yPos = (value: number) => plot.top + plot.height - frac(value, yScale, yReverse) * plot.height

  const defaultMarker = Math.max(6, Math.min(12, Math.round(short * 0.03)))
  const series = raws.map((raw, index): XYSeriesModel => {
    const { spec } = raw
    const marker = recOf(spec.marker)
    const shape = (['circle', 'rect', 'diamond', 'triangle'] as const).find((s) => s === marker.shape) ?? 'circle'
    const markerSize = typeof marker.size === 'number' && marker.size > 0 ? marker.size : defaultMarker
    const scale = (['linear', 'sqrt', 'log'] as const).find((s) => s === spec.sizeScale) ?? 'sqrt'
    const border = lineOf(kind === 'scatter' && marker.border !== undefined ? marker.border : spec.border, theme, '#000000')
    const dataLabels = dataLabelModelOf(content.dataLabels, spec.dataLabels, theme)
    return {
      kind,
      name: raw.name,
      color: raw.color,
      opacity: kind === 'bubble' ? 0.7 : 1,
      ...(kind === 'scatter' ? { marker: { shape, size: markerSize } } : {}),
      ...(border ? { border } : {}),
      labelPlacement: kind === 'scatter' ? 'above' : 'center',
      points: raw.rows.map((row) => {
        const px = xPos(row.x)
        const py = yPos(row.y)
        const r = kind === 'bubble' ? bubbleRadius(row.size ?? 0, maxSize, scale, ranges[index]) : undefined
        return {
          x: row.x,
          y: row.y,
          px,
          py,
          ...(kind === 'bubble' ? { size: row.size ?? 0, r } : {}),
          value: row.y,
          labelX: px,
          labelY: kind === 'scatter' ? py - markerSize / 2 - 4 : py,
        }
      }),
      ...(dataLabels ? { dataLabels } : {}),
    }
  })

  return {
    kind,
    width: size.width,
    height: size.height,
    plot,
    xAxis: axisModelOf(xAxisRaw, xScale, xPos, theme),
    yAxis: axisModelOf(yAxisRaw, yScale, yPos, theme),
    series,
    ...(frame.title ? { title: frame.title } : {}),
    ...(frame.legend ? { legend: frame.legend } : {}),
  }
}

/** 全部系列都是 scatter 时的散点图模型；混排或无有效数据返回 null。 */
export function scatterModelOf(content: Rec, theme: ThemeLike | null | undefined, size: ChartSize): XYChartModel | null {
  return xyModelOf(content, theme, size, 'scatter')
}

/** 全部系列都是 bubble 时的气泡图模型；混排或无有效数据返回 null。 */
export function bubbleModelOf(content: Rec, theme: ThemeLike | null | undefined, size: ChartSize): XYChartModel | null {
  return xyModelOf(content, theme, size, 'bubble')
}

// ---------------------------------------------------------------- 雷达

export interface RadarSpokeModel {
  index: number
  label: string
  /** 度，0 = 12 点方向，顺时针为正。 */
  angle: number
  /** 辐条外端。 */
  x: number
  y: number
  labelX: number
  labelY: number
  anchor: 'start' | 'middle' | 'end'
}

export interface RadarRingModel {
  value: number
  radius: number
  /** SVG polygon points：连接各辐条在该刻度处的点。 */
  points: string
  labelX: number
  labelY: number
}

export interface RadarPointModel {
  x: number
  y: number
  value: number
  labelX: number
  labelY: number
}

export interface RadarSeriesModel {
  name: string
  color: string
  width: number
  dash?: string
  smooth: boolean
  nullHandling: 'zero' | 'gap' | 'connect'
  /** 仅 marker 配置存在时才画点。 */
  marker?: { shape: MarkerShape; size: number; color: string; border?: ChartLineModel }
  /** false = 只画轮廓；否则按 color + opacity 填充（缺省由系列色派生，半透明）。 */
  area: false | { color: string; opacity: number }
  /** 与辐条对齐的点；null 值（nullHandling 为 connect / gap 时）为 null。 */
  points: Array<RadarPointModel | null>
  /** 轮廓路径（gap 模式下每段连续数据一条）。 */
  outlines: string[]
  /** 填充路径（area 为 false 时为空）。 */
  fills: string[]
  dataLabels?: ChartDataLabelModel
}

export interface RadarAxisModel {
  show: boolean
  axisLine: boolean
  gridLine: boolean
  label: boolean
  axisStyle?: ChartLineModel
  gridStyle?: ChartLineModel
  fontSize?: number
  color?: string
  fontFamily?: string
  numberFormat?: string
}

export interface RadarChartModel {
  width: number
  height: number
  plot: PlotRect
  cx: number
  cy: number
  radius: number
  spokes: RadarSpokeModel[]
  rings: RadarRingModel[]
  scale: NiceScale
  axis: RadarAxisModel
  series: RadarSeriesModel[]
  title?: ChartTitleModel
  legend?: ChartLegendModel
}

type NullHandling = 'zero' | 'gap' | 'connect'

function nullHandlingOf(value: unknown): NullHandling | undefined {
  return value === 'zero' || value === 'gap' || value === 'connect' ? value : undefined
}

type Pt = [number, number]

function polyPath(points: Pt[], closed: boolean): string {
  const body = points.map(([x, y], index) => `${index ? 'L' : 'M'}${round2(x)},${round2(y)}`).join(' ')
  return closed ? `${body} Z` : body
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Catmull-Rom → 三次贝塞尔；closed 时首尾相接。 */
function smoothPath(points: Pt[], closed: boolean): string {
  const n = points.length
  if (n < 3) return polyPath(points, closed && n > 1)
  const at = (i: number): Pt => closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]
  let d = `M${round2(points[0][0])},${round2(points[0][1])}`
  const segments = closed ? n : n - 1
  for (let i = 0; i < segments; i += 1) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${round2(c1[0])},${round2(c1[1])} ${round2(c2[0])},${round2(c2[1])} ${round2(p2[0])},${round2(p2[1])}`
  }
  return closed ? `${d} Z` : d
}

/** 把与辐条对齐的点切成连续段；closed 表示一圈完整闭合。 */
function runsOf(points: Array<RadarPointModel | null>, handling: NullHandling): Array<{ pts: RadarPointModel[]; closed: boolean }> {
  const valid = points.filter((p): p is RadarPointModel => p !== null)
  if (!valid.length) return []
  if (handling !== 'gap' || valid.length === points.length) return [{ pts: valid, closed: valid.length >= 3 }]
  const runs: RadarPointModel[][] = []
  let current: RadarPointModel[] = []
  for (const point of points) {
    if (point) current.push(point)
    else if (current.length) {
      runs.push(current)
      current = []
    }
  }
  if (current.length) runs.push(current)
  if (runs.length > 1 && points[0] && points[points.length - 1]) {
    const last = runs.pop()!
    runs[0] = [...last, ...runs[0]]
  }
  return runs.map((pts) => ({ pts, closed: false }))
}

export function radarModelOf(content: Rec, theme: ThemeLike | null | undefined, size: ChartSize): RadarChartModel | null {
  if (chartKindOf(content) !== 'radar') return null
  const table = tableOf(content)
  const specs = Array.isArray(content.series) ? content.series : []
  const merged: Array<{ spec: Rec; seriesIndex: number }> = []
  specs.forEach((raw, seriesIndex) => {
    if (raw && typeof raw === 'object') merged.push({ spec: withDefaults(content, raw as Rec), seriesIndex })
  })
  if (!merged.length || !table.rows.length) return null

  // 所有 radar 系列共用同一组辐条标签：取第一个系列的 category 列。
  const categoryIndex = columnIndex(table.cols, recOf(merged[0].spec.encode).category, 0)
  const labels = table.rows.map((row) => String(row[categoryIndex] ?? ''))
  const n = labels.length
  const handling = merged.map(({ spec }) => nullHandlingOf(spec.nullHandling)).find((value) => value !== undefined) ?? 'connect'

  interface RawRadar {
    spec: Rec
    name: string
    color: string
    values: Array<number | null>
  }
  const raws: RawRadar[] = merged.flatMap(({ spec, seriesIndex }) => {
    const yi = columnIndex(table.cols, recOf(spec.encode).y, 1)
    const values = table.rows.map((row): number | null => {
      const value = numberOf(row[yi])
      return value === undefined ? (handling === 'zero' ? 0 : null) : value
    })
    if (values.every((value) => value === null)) return []
    return [{
      spec,
      name: typeof spec.name === 'string' ? spec.name : String(table.cols[yi] ?? `系列 ${seriesIndex + 1}`),
      color: paintOf(spec.lineColor, seriesIndex, theme).color,
      values,
    }]
  })
  if (!raws.length) return null

  const frame = chartFrameOf(content, size, raws.map((raw) => ({ name: raw.name, color: raw.color })),
    { left: 12, right: 12, top: 12, bottom: 12 }, theme)
  const { plot } = frame
  const cx = plot.left + plot.width / 2
  const cy = plot.top + plot.height / 2
  const labelW = Math.min(Math.max(...labels.map((text) => textWidthOf(text, 10))) + 8, plot.width * 0.3)
  const radius = Math.max(10, Math.min(plot.width / 2 - labelW, plot.height / 2 - 22))

  const spokeCfg = recOf(content.spokeAxis)
  const scale = niceScale(
    raws.flatMap((raw) => raw.values.filter((value): value is number => value !== null)),
    numberOf(spokeCfg.min) ?? 0,
    numberOf(spokeCfg.max),
    true
  )
  const span = scale.max - scale.min || 1
  const radiusOf = (value: number) => Math.max(0, Math.min(1, (value - scale.min) / span)) * radius
  const direction = (index: number) => {
    const angle = (360 * index) / n
    const rad = (angle * Math.PI) / 180
    return { angle, dx: Math.sin(rad), dy: -Math.cos(rad) }
  }

  const spokes = labels.map((label, index): RadarSpokeModel => {
    const { angle, dx, dy } = direction(index)
    const labelR = radius + 10
    return {
      index,
      label,
      angle,
      x: cx + dx * radius,
      y: cy + dy * radius,
      labelX: cx + dx * labelR,
      labelY: cy + dy * labelR + (dy > 0.2 ? 8 : dy < -0.2 ? -2 : 4),
      anchor: dx > 0.2 ? 'start' : dx < -0.2 ? 'end' : 'middle',
    }
  })
  const rings = scale.ticks.filter((tick) => tick > scale.min + span * 1e-9).map((value): RadarRingModel => {
    const r = radiusOf(value)
    return {
      value,
      radius: r,
      points: labels.map((_, index) => {
        const { dx, dy } = direction(index)
        return `${round2(cx + dx * r)},${round2(cy + dy * r)}`
      }).join(' '),
      labelX: cx + 3,
      labelY: cy - r - 2,
    }
  })

  const axisLabel = recOf(spokeCfg.label)
  const show = spokeCfg.show !== false
  const axisColor = resolveColor(axisLabel.color, theme)
  const axisStyle = lineOf(spokeCfg.axisLine, theme)
  const gridStyle = lineOf(spokeCfg.gridLine, theme)
  const axis: RadarAxisModel = {
    show,
    axisLine: show && spokeCfg.axisLine !== false,
    gridLine: show && spokeCfg.gridLine !== false,
    label: show && spokeCfg.label !== false,
    ...(axisStyle ? { axisStyle } : {}),
    ...(gridStyle ? { gridStyle } : {}),
    ...(typeof axisLabel.fontSize === 'number' ? { fontSize: axisLabel.fontSize } : {}),
    ...(axisColor ? { color: axisColor } : {}),
    ...(typeof axisLabel.fontFamily === 'string' ? { fontFamily: axisLabel.fontFamily } : {}),
    ...(typeof axisLabel.numberFormat === 'string' ? { numberFormat: axisLabel.numberFormat } : {}),
  }

  const series = raws.map((raw): RadarSeriesModel => {
    const { spec } = raw
    const points = raw.values.map((value, index): RadarPointModel | null => {
      if (value === null) return null
      const { dx, dy } = direction(index)
      const r = radiusOf(value)
      return { x: cx + dx * r, y: cy + dy * r, value, labelX: cx + dx * (r + 9), labelY: cy + dy * (r + 9) }
    })
    const smooth = spec.smooth === true
    const runs = runsOf(points, handling)
    const toPath = (pts: RadarPointModel[], closed: boolean) => {
      const coords = pts.map((p): Pt => [p.x, p.y])
      return smooth ? smoothPath(coords, closed) : polyPath(coords, closed)
    }
    let area: RadarSeriesModel['area']
    if (spec.areaColor === false) area = false
    else if (spec.areaColor === undefined || spec.areaColor === null) area = { color: raw.color, opacity: 0.25 }
    else area = { color: paintOf(spec.areaColor, 0, theme).color, opacity: 1 }
    const markerRaw = spec.marker
    let marker: RadarSeriesModel['marker']
    if (markerRaw === true || (markerRaw && typeof markerRaw === 'object' && !Array.isArray(markerRaw))) {
      const cfg = recOf(markerRaw)
      const fillColor = cfg.fill !== undefined ? paintOf(cfg.fill, 0, theme).color : raw.color
      const border = lineOf(cfg.border, theme, '#000000')
      marker = {
        shape: (['circle', 'rect', 'diamond', 'triangle'] as const).find((s) => s === cfg.shape) ?? 'circle',
        size: typeof cfg.size === 'number' && cfg.size > 0 ? cfg.size : 6,
        color: fillColor,
        ...(border ? { border } : {}),
      }
    }
    const lineStyle = spec.lineStyle === 'dash' ? '6 4' : spec.lineStyle === 'dot' ? '2 3' : undefined
    const dataLabels = dataLabelModelOf(content.dataLabels, spec.dataLabels, theme)
    return {
      name: raw.name,
      color: raw.color,
      width: typeof spec.width === 'number' && spec.width > 0 ? spec.width : 2,
      ...(lineStyle ? { dash: lineStyle } : {}),
      smooth,
      nullHandling: handling,
      ...(marker ? { marker } : {}),
      area,
      points,
      outlines: runs.map((run) => toPath(run.pts, run.closed)),
      fills: area === false ? [] : runs.filter((run) => run.pts.length >= 3).map((run) => toPath(run.pts, true)),
      ...(dataLabels ? { dataLabels } : {}),
    }
  })

  return {
    width: size.width,
    height: size.height,
    plot,
    cx,
    cy,
    radius,
    spokes,
    rings,
    scale,
    axis,
    series,
    ...(frame.title ? { title: frame.title } : {}),
    ...(frame.legend ? { legend: frame.legend } : {}),
  }
}
