/** PPTD chart 元素 → 工作台图表视图模型（无 React、无 DOM）。 */
import type { ThemeLike } from './resolve'
import { resolveColor } from './resolve'

export const CHART_PALETTE = ['#2456c4', '#c8102e', '#f2b705', '#2e7d5b', '#7a4ca3', '#d56a2d']

/** 图案填充（§6.0 PatternFill），工作台按预设名画成 SVG 瓦片。 */
export interface ChartPatternModel {
  preset: string
  foreground: string
  background: string
}

/** 一处填充：纯色，或图案（`color` 为图案回落色，供不支持图案时使用）。 */
export interface ChartPaintModel {
  color: string
  pattern?: ChartPatternModel
}

export interface ChartPoint {
  category: string
  value: number
  paint?: ChartPaintModel
}

export interface ChartDataLabelModel {
  show: boolean
  color?: string
  fontSize?: number
  fontFamily?: string
  /** Excel 数字格式串子集（§6.7），如 `0%`。 */
  numberFormat?: string
  /** 逐点覆盖（§6.7 DataLabelPoint）；索引与 points 对齐。 */
  points?: Array<ChartDataLabelPointModel | null>
}

export interface ChartDataLabelPointModel {
  show: boolean
  /** 相对默认位置偏移，占图表宽高的比例。 */
  offset?: { x: number; y: number }
  color?: string
  fontSize?: number
  bold?: boolean
}

export interface ChartSeriesModel {
  kind: string
  name: string
  color: string
  pattern?: ChartPatternModel
  categories: string[]
  points: ChartPoint[]
  stack?: string
  /** 饼图内孔占半径的比例；0 为实心饼。 */
  innerRadius?: number
  /** 起始角，度；0 = 12 点方向，顺时针为正。 */
  startAngle?: number
  dataLabels?: ChartDataLabelModel
}

function patternOf(fill: unknown, theme?: ThemeLike | null): ChartPatternModel | undefined {
  if (!fill || typeof fill !== 'object') return undefined
  const rec = fill as Record<string, unknown>
  if (rec.type !== 'pattern' || typeof rec.preset !== 'string') return undefined
  const foreground = resolveColor(rec.foreground, theme)
  const background = resolveColor(rec.background, theme)
  if (!foreground || !background) return undefined
  return { preset: rec.preset, foreground, background }
}

function paintOf(fill: unknown, index: number, theme?: ThemeLike | null): ChartPaintModel {
  const first = Array.isArray(fill) ? fill[0] : fill
  const pattern = patternOf(first, theme)
  if (pattern) return { color: pattern.foreground, pattern }
  if (typeof first === 'string') {
    return { color: resolveColor(first, theme) ?? CHART_PALETTE[index % CHART_PALETTE.length] }
  }
  if (first && typeof first === 'object') {
    const rec = first as Record<string, unknown>
    const solid = resolveColor(rec.color, theme)
    if (solid) return { color: solid }
    const stops = Array.isArray(rec.stops) ? rec.stops : []
    const stop = stops[0] as Record<string, unknown> | undefined
    const gradient = resolveColor(stop?.color, theme)
    if (gradient) return { color: gradient }
  }
  return { color: CHART_PALETTE[index % CHART_PALETTE.length] }
}

function columnIndex(cols: unknown[], name: unknown, fallback: number): number {
  if (typeof name === 'number' && Number.isInteger(name)) return name
  if (typeof name === 'string') {
    const index = cols.findIndex((col) => String(col) === name)
    if (index >= 0) return index
  }
  return fallback
}

function labelPointOf(value: unknown, theme?: ThemeLike | null): ChartDataLabelPointModel | null {
  if (!value || typeof value !== 'object') return null
  const rec = value as Record<string, unknown>
  const offset = rec.offset && typeof rec.offset === 'object' ? rec.offset as Record<string, unknown> : {}
  const out: ChartDataLabelPointModel = { show: rec.show !== false }
  if (typeof offset.x === 'number' && typeof offset.y === 'number') out.offset = { x: offset.x, y: offset.y }
  if (typeof rec.fontSize === 'number') out.fontSize = rec.fontSize
  if (rec.bold === true) out.bold = true
  const color = resolveColor(rec.color, theme)
  if (color) out.color = color
  return out
}

function dataLabelModelOf(
  chartValue: unknown,
  seriesValue: unknown,
  theme?: ThemeLike | null
): ChartDataLabelModel | undefined {
  const chart = chartValue && typeof chartValue === 'object' ? chartValue as Record<string, unknown> : {}
  const series = seriesValue && typeof seriesValue === 'object' ? seriesValue as Record<string, unknown> : {}
  if (!Object.keys(chart).length && !Object.keys(series).length) return undefined
  const merged = { ...chart, ...series }
  const rawPoints = Array.isArray(merged.points) ? merged.points : undefined
  return {
    show: merged.show === true,
    ...(typeof merged.fontSize === 'number' ? { fontSize: merged.fontSize } : {}),
    ...(typeof merged.fontFamily === 'string' ? { fontFamily: merged.fontFamily } : {}),
    ...(typeof merged.numberFormat === 'string' ? { numberFormat: merged.numberFormat } : {}),
    ...(resolveColor(merged.color, theme) ? { color: resolveColor(merged.color, theme)! } : {}),
    ...(rawPoints ? { points: rawPoints.map((point) => labelPointOf(point, theme)) } : {}),
  }
}

/** 从 data:{cols, rows 二维数组} 与 series[].encode 构造绘图序列。 */
export function chartModelOf(content: Record<string, unknown>, theme?: ThemeLike | null): ChartSeriesModel[] {
  const data = content.data && typeof content.data === 'object'
    ? content.data as Record<string, unknown>
    : {}
  const cols = Array.isArray(data.cols) ? data.cols : []
  const rows = Array.isArray(data.rows) ? data.rows.filter(Array.isArray) : []
  const specs = Array.isArray(content.series) ? content.series : []
  const first = specs.find((raw) => raw && typeof raw === 'object') as Record<string, unknown> | undefined
  const yAxis = content.yAxis && typeof content.yAxis === 'object'
    ? content.yAxis as Record<string, unknown>
    : {}
  const horizontal = first?.type === 'bar' && yAxis.type === 'category'
  return specs.flatMap((raw, seriesIndex) => {
    if (!raw || typeof raw !== 'object') return []
    const spec = raw as Record<string, unknown>
    const encode = spec.encode && typeof spec.encode === 'object'
      ? spec.encode as Record<string, unknown>
      : {}
    const categoryIndex = columnIndex(cols, horizontal ? encode.y : encode.x, horizontal ? 1 : 0)
    const valueIndex = columnIndex(cols, horizontal ? encode.x : encode.y, horizontal ? 0 : 1)
    const categories = rows.map((row) => String(row[categoryIndex] ?? ''))
    const fills = Array.isArray(spec.fill) ? spec.fill : undefined
    const paint = paintOf(spec.fill, seriesIndex, theme)
    const points = rows.flatMap((row, rowIndex) => {
      const rawValue = row[valueIndex]
      if (rawValue === null || rawValue === undefined || (typeof rawValue === 'string' && rawValue.trim() === '')) return []
      const value = Number(rawValue)
      if (!Number.isFinite(value)) return []
      const slice = fills && fills.length > 0 ? paintOf(fills[rowIndex % fills.length], rowIndex, theme) : undefined
      return [{
        category: String(row[categoryIndex] ?? ''),
        value,
        ...(slice ? { paint: slice } : {}),
      }]
    })
    if (!points.length) return []
    const dataLabels = dataLabelModelOf(content.dataLabels, spec.dataLabels, theme)
    const innerRadius = typeof spec.innerRadius === 'number' && Number.isFinite(spec.innerRadius)
      ? Math.max(0, Math.min(0.9, spec.innerRadius))
      : 0
    return [{
      kind: typeof spec.type === 'string' ? spec.type : 'bar',
      name: typeof spec.name === 'string' ? spec.name : `系列 ${seriesIndex + 1}`,
      color: paint.color,
      ...(paint.pattern ? { pattern: paint.pattern } : {}),
      categories,
      points,
      ...(typeof spec.stack === 'string' ? { stack: spec.stack } : {}),
      ...(innerRadius > 0 ? { innerRadius } : {}),
      ...(typeof spec.startAngle === 'number' ? { startAngle: spec.startAngle } : {}),
      ...(dataLabels ? { dataLabels } : {}),
    }]
  })
}
