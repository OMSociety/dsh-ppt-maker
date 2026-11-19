/** PPTD chart 元素 → 工作台图表视图模型（无 React、无 DOM）。 */
import type { ThemeLike } from './resolve'
import { resolveColor } from './resolve'

export const CHART_PALETTE = ['#2456c4', '#c8102e', '#f2b705', '#2e7d5b', '#7a4ca3', '#d56a2d']

export interface ChartPoint {
  category: string
  value: number
}

export interface ChartDataLabelModel {
  show: boolean
  color?: string
  fontSize?: number
  fontFamily?: string
}

export interface ChartSeriesModel {
  kind: string
  name: string
  color: string
  categories: string[]
  points: ChartPoint[]
  stack?: string
  dataLabels?: ChartDataLabelModel
}

function colorOf(fill: unknown, index: number, theme?: ThemeLike | null): string {
  const first = Array.isArray(fill) ? fill[0] : fill
  if (typeof first === 'string') return resolveColor(first, theme) ?? CHART_PALETTE[index % CHART_PALETTE.length]
  if (first && typeof first === 'object') {
    const rec = first as Record<string, unknown>
    const solid = resolveColor(rec.color, theme)
    if (solid) return solid
    const stops = Array.isArray(rec.stops) ? rec.stops : []
    const stop = stops[0] as Record<string, unknown> | undefined
    const gradient = resolveColor(stop?.color, theme)
    if (gradient) return gradient
  }
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

function columnIndex(cols: unknown[], name: unknown, fallback: number): number {
  if (typeof name === 'number' && Number.isInteger(name)) return name
  if (typeof name === 'string') {
    const index = cols.findIndex((col) => String(col) === name)
    if (index >= 0) return index
  }
  return fallback
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
  return {
    show: merged.show === true,
    ...(typeof merged.fontSize === 'number' ? { fontSize: merged.fontSize } : {}),
    ...(typeof merged.fontFamily === 'string' ? { fontFamily: merged.fontFamily } : {}),
    ...(resolveColor(merged.color, theme) ? { color: resolveColor(merged.color, theme)! } : {}),
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
    const points = rows.flatMap((row) => {
      const rawValue = row[valueIndex]
      if (rawValue === null || rawValue === undefined || (typeof rawValue === 'string' && rawValue.trim() === '')) return []
      const value = Number(rawValue)
      if (!Number.isFinite(value)) return []
      return [{ category: String(row[categoryIndex] ?? ''), value }]
    })
    if (!points.length) return []
    const dataLabels = dataLabelModelOf(content.dataLabels, spec.dataLabels, theme)
    return [{
      kind: typeof spec.type === 'string' ? spec.type : 'bar',
      name: typeof spec.name === 'string' ? spec.name : `系列 ${seriesIndex + 1}`,
      color: colorOf(spec.fill, seriesIndex, theme),
      categories,
      points,
      ...(typeof spec.stack === 'string' ? { stack: spec.stack } : {}),
      ...(dataLabels ? { dataLabels } : {}),
    }]
  })
}
