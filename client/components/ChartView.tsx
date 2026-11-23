/**
 * 图表的轻量 SVG 直渲。
 *
 * PPTD 图表契约是 data:{cols, rows 二维数组} + series[{type, encode:{x,y}}]，不是任意
 * {x,y} 对象数组。这里直接消费同一份契约，支持柱状/条形、折线、面积与饼图的工作台预览；
 * 复杂 Excel 图表的最终精确外观仍以「导出 .pptx」的 LibreOffice 渲染为准。
 */
import * as React from 'react'
import type { ThemeLike } from '../render/resolve'
import { CHART_PALETTE, chartModelOf, type ChartPatternModel, type ChartSeriesModel } from '../render/chart-model'
import { patternTileOf } from '../render/pattern-svg'
const GRID = 'rgba(60,60,60,0.16)'
const LABEL = '#5c5c5c'

/** 本次渲染用到的图案瓦片，按前景 / 背景 / 预设去重后分配 SVG id。 */
function usePatternDefs(paints: Array<ChartPatternModel | undefined>) {
  return React.useMemo(() => {
    const ids = new Map<string, string>()
    const defs: Array<{ id: string; pattern: ChartPatternModel }> = []
    for (const paint of paints) {
      if (!paint) continue
      const key = `${paint.preset}|${paint.foreground}|${paint.background}`
      if (ids.has(key)) continue
      const id = `pptd-pat-${ids.size}`
      ids.set(key, id)
      defs.push({ id, pattern: paint })
    }
    return { idOf: (paint: ChartPatternModel) => ids.get(`${paint.preset}|${paint.foreground}|${paint.background}`), defs }
  }, [paints])
}

function PatternDefs({ defs }: { defs: Array<{ id: string; pattern: ChartPatternModel }> }) {
  if (!defs.length) return null
  return (
    <defs>
      {defs.map(({ id, pattern }) => {
        const tile = patternTileOf(pattern.preset)
        return (
          <pattern key={id} id={id} width={tile.size} height={tile.size} patternUnits="userSpaceOnUse">
            <rect width={tile.size} height={tile.size} fill={pattern.background} />
            {tile.lines.map((line, index) => (
              <line
                key={index}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={pattern.foreground}
                strokeWidth={line.width}
              />
            ))}
            {tile.dots.map((dot, index) => (
              <circle key={index} cx={dot.cx} cy={dot.cy} r={dot.r} fill={pattern.foreground} />
            ))}
          </pattern>
        )
      })}
    </defs>
  )
}

/** 图案填充引用：有瓦片时指向 `url(#id)`，否则回落实色。 */
export type FillOf = (paint: ChartPatternModel | undefined, color: string) => string

function niceScale(values: number[], minOverride?: number, maxOverride?: number) {
  const min = minOverride ?? Math.min(0, ...values)
  const max = maxOverride ?? Math.max(0, ...values)
  const span = Math.max(1, max - min)
  const rough = span / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const ratio = rough / power
  const step = (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power
  const low = minOverride ?? Math.floor(min / step) * step
  const high = maxOverride ?? Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = low; value <= high + step * 0.001; value += step) ticks.push(Number(value.toFixed(10)))
  return { min: low, max: high, ticks }
}

function tickText(value: number): string {
  return Math.abs(value) >= 1000 ? value.toLocaleString('zh-CN') : String(value)
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function axisTextStyle(axis: Record<string, unknown>, defaultSize: number) {
  const label = recordOf(axis.label)
  return {
    fontSize: typeof label.fontSize === 'number' ? label.fontSize : defaultSize,
    fill: typeof label.color === 'string' ? label.color : LABEL,
    ...(typeof label.fontFamily === 'string' ? { fontFamily: label.fontFamily } : {}),
  }
}

function CartesianChart({
  model,
  content,
  width,
  height,
  fillOf,
  defs,
}: {
  model: ChartSeriesModel[]
  content: Record<string, unknown>
  width: number
  height: number
  fillOf: FillOf
  defs: React.ReactNode
}) {
  const categories = Array.from(new Set(model.flatMap((series) => series.categories)))
  const horizontal = model[0]?.kind === 'bar' && recordOf(content.yAxis).type === 'category'
  const categoryAxis = recordOf(horizontal ? content.yAxis : content.xAxis)
  const valueAxis = recordOf(horizontal ? content.xAxis : content.yAxis)
  const bars = model.flatMap((series, seriesIndex) => series.kind === 'bar' ? [{
    series,
    key: series.stack ? `stack:${series.stack}` : `series:${seriesIndex}`,
  }] : [])
  const slotKeys = Array.from(new Set(bars.map((bar) => bar.key)))
  const stackKeys = Array.from(new Set(bars.filter((bar) => bar.series.stack).map((bar) => bar.key)))
  const scaleValues = model.flatMap((series) => series.points.map((point) => point.value))
  for (const category of categories) {
    for (const key of stackKeys) {
      let positive = 0
      let negative = 0
      for (const bar of bars.filter((item) => item.key === key)) {
        const value = bar.series.points.find((point) => point.category === category)?.value
        if (value === undefined) continue
        if (value >= 0) positive += value
        else negative += value
      }
      scaleValues.push(positive, negative)
    }
  }
  const minOverride = typeof valueAxis.min === 'number' && Number.isFinite(valueAxis.min) ? valueAxis.min : undefined
  const maxOverride = typeof valueAxis.max === 'number' && Number.isFinite(valueAxis.max) ? valueAxis.max : undefined
  const scale = niceScale(scaleValues, minOverride, maxOverride)
  const left = horizontal ? 76 : 38
  const right = 12
  const top = 14
  const bottom = 30
  const plotW = Math.max(10, width - left - right)
  const plotH = Math.max(10, height - top - bottom)
  const valueSpan = Math.max(1, scale.max - scale.min)
  const valuePosition = (value: number) => horizontal
    ? left + ((value - scale.min) / valueSpan) * plotW
    : top + plotH - ((value - scale.min) / valueSpan) * plotH
  const zero = valuePosition(Math.max(scale.min, Math.min(0, scale.max)))
  const labelEvery = Math.max(1, Math.ceil(categories.length / 8))
  const valueGrid = valueAxis.show !== false && valueAxis.gridLine !== false
  const valueLabels = valueAxis.show !== false && valueAxis.label !== false
  const categoryLabels = categoryAxis.show !== false && categoryAxis.label !== false
  const categoryAxisLine = categoryAxis.show !== false && categoryAxis.axisLine !== false
  const valueLabelStyle = axisTextStyle(valueAxis, 9)
  const categoryLabelStyle = axisTextStyle(categoryAxis, 10)
  const requestedBarWidth = Number(content.barWidth)
  const barWidth = Number.isFinite(requestedBarWidth) && requestedBarWidth > 0 && requestedBarWidth <= 1
    ? requestedBarWidth
    : 0.62

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {defs}
      {scale.ticks.map((tick) => {
        if (!valueGrid && !valueLabels) return null
        const pos = valuePosition(tick)
        return horizontal ? (
          <g key={tick}>
            {valueGrid && <line x1={pos} y1={top} x2={pos} y2={top + plotH} stroke={GRID} strokeWidth={1} />}
            {valueLabels && <text x={pos} y={height - 10} textAnchor="middle" {...valueLabelStyle}>{tickText(tick)}</text>}
          </g>
        ) : (
          <g key={tick}>
            {valueGrid && <line x1={left} y1={pos} x2={left + plotW} y2={pos} stroke={GRID} strokeWidth={1} />}
            {valueLabels && <text x={left - 5} y={pos + 3} textAnchor="end" {...valueLabelStyle}>{tickText(tick)}</text>}
          </g>
        )
      })}
      {categoryAxisLine && (
        <line
          x1={horizontal ? zero : left}
          y1={horizontal ? top : zero}
          x2={horizontal ? zero : left + plotW}
          y2={horizontal ? top + plotH : zero}
          stroke="rgba(0,0,0,0.45)"
        />
      )}
      {categories.map((category, categoryIndex) => {
        const slot = (horizontal ? plotH : plotW) / Math.max(1, categories.length)
        const center = (horizontal ? top : left) + slot * (categoryIndex + 0.5)
        const groupSize = slot * barWidth
        const offsets: Record<string, { positive: number; negative: number }> = {}
        return (
          <g key={`${category}:${categoryIndex}`}>
            {model.map((series, seriesIndex) => {
              const point = series.points.find((item) => item.category === category)
              if (!point) return null
              if (series.kind === 'bar') {
                const bar = bars.find((item) => item.series === series)!
                const barIndex = slotKeys.indexOf(bar.key)
                const thickness = groupSize / Math.max(1, slotKeys.length)
                const start = center - groupSize / 2 + barIndex * thickness + 1
                const band = Math.max(1, thickness - 2)
                const offset = offsets[bar.key] ?? { positive: 0, negative: 0 }
                const base = series.stack ? (point.value >= 0 ? offset.positive : offset.negative) : 0
                const end = base + point.value
                if (series.stack) {
                  if (point.value >= 0) offset.positive = end
                  else offset.negative = end
                  offsets[bar.key] = offset
                }
                const valuePos = valuePosition(end)
                const basePos = valuePosition(base)
                const labels = series.dataLabels
                const dataLabel = labels?.show ? (
                  horizontal ? (
                    <text
                      x={series.stack ? (basePos + valuePos) / 2 : valuePos + (point.value >= 0 ? 5 : -5)}
                      y={start + band / 2 + (labels.fontSize ?? 10) / 3}
                      textAnchor={series.stack ? 'middle' : point.value >= 0 ? 'start' : 'end'}
                      fontSize={labels.fontSize ?? 10}
                      fill={labels.color ?? LABEL}
                      {...(labels.fontFamily ? { fontFamily: labels.fontFamily } : {})}
                    >{point.value}</text>
                  ) : (
                    <text
                      x={start + band / 2}
                      y={valuePos + (point.value >= 0 ? -5 : 12)}
                      textAnchor="middle"
                      fontSize={labels.fontSize ?? 10}
                      fill={labels.color ?? LABEL}
                      {...(labels.fontFamily ? { fontFamily: labels.fontFamily } : {})}
                    >{point.value}</text>
                  )
                ) : null
                return (
                  <g key={`${series.name}:${seriesIndex}`}>
                    {horizontal ? (
                      <rect
                        x={Math.min(basePos, valuePos)}
                        y={start}
                        width={Math.max(1, Math.abs(valuePos - basePos))}
                        height={band}
                        rx={2}
                        fill={fillOf(series.pattern, series.color)}
                      />
                    ) : (
                      <rect
                        x={start}
                        y={Math.min(basePos, valuePos)}
                        width={band}
                        height={Math.max(1, Math.abs(valuePos - basePos))}
                        rx={2}
                        fill={fillOf(series.pattern, series.color)}
                      />
                    )}
                    {dataLabel}
                  </g>
                )
              }
              return null
            })}
            {categoryLabels && categoryIndex % labelEvery === 0 && (
              horizontal ? (
                <text x={left - 7} y={center + 3} textAnchor="end" {...categoryLabelStyle}>{category}</text>
              ) : (
                <text x={center} y={height - 10} textAnchor="middle" {...categoryLabelStyle}>{category}</text>
              )
            )}
          </g>
        )
      })}
      {model.filter((series) => series.kind === 'line' || series.kind === 'area').map((series) => {
        const slot = (horizontal ? plotH : plotW) / Math.max(1, categories.length)
        const points = categories.map((category, index) => {
          const point = series.points.find((item) => item.category === category)
          if (!point) return null
          const categoryPos = (horizontal ? top : left) + slot * (index + 0.5)
          const valuePos = valuePosition(point.value)
          return horizontal ? [valuePos, categoryPos] : [categoryPos, valuePos]
        })
        const valid = points.filter((point): point is number[] => point !== null)
        if (!valid.length) return null
        const path = valid.map((point, index) => `${index ? 'L' : 'M'}${point[0]},${point[1]}`).join(' ')
        return (
          <g key={series.name}>
            {series.kind === 'area' && (
              <path
                d={`${path} L${valid[valid.length - 1][0]},${horizontal ? top + plotH : zero} L${valid[0][0]},${horizontal ? top : zero} Z`}
                fill={series.color}
                opacity={0.25}
              />
            )}
            <path d={path} fill="none" stroke={series.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {valid.map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r={3} fill={series.color} />)}
          </g>
        )
      })}
    </svg>
  )
}

/** Excel 数字格式串子集（§6.7）→ 标签文本。 */
function formatLabel(value: number, format: string | undefined): string {
  if (!format) return String(Math.round(value * 100) / 100)
  const decimals = /\.(0+)/.exec(format)?.[1].length ?? 0
  if (format.includes('%')) return `${(value * 100).toFixed(decimals)}%`
  if (format.includes('E+')) return value.toExponential(decimals).toUpperCase()
  return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, format.includes('#,##0') ? ',' : '')
}

function PieChart({
  series,
  width,
  height,
  fillOf,
  defs,
}: {
  series: ChartSeriesModel
  width: number
  height: number
  fillOf: FillOf
  defs: React.ReactNode
}) {
  const total = series.points.reduce((sum, point) => sum + Math.max(0, point.value), 0) || 1
  const cx = width / 2
  const cy = Math.max(35, (height - 24) / 2)
  const radius = Math.max(12, Math.min(width / 3, height / 3))
  const hole = Math.max(0, Math.min(0.9, series.innerRadius ?? 0))
  let angle = -Math.PI / 2 + ((series.startAngle ?? 0) * Math.PI) / 180
  const labels = series.dataLabels
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {defs}
      {series.points.map((point, index) => {
        const next = angle + (Math.max(0, point.value) / total) * Math.PI * 2
        const x1 = cx + radius * Math.cos(angle)
        const y1 = cy + radius * Math.sin(angle)
        const x2 = cx + radius * Math.cos(next)
        const y2 = cy + radius * Math.sin(next)
        const large = next - angle > Math.PI ? 1 : 0
        const slice = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} Z`
        angle = next
        const paletteColor = index === 0 ? series.color : CHART_PALETTE[index % CHART_PALETTE.length]
        const paint = point.paint
        return (
          <path
            key={`${point.category}:${index}`}
            d={slice}
            fill={fillOf(paint?.pattern, paint?.color ?? paletteColor)}
            stroke="#fff"
            strokeWidth={1.5}
          />
        )
      })}
      {hole > 0 && <circle cx={cx} cy={cy} r={radius * hole} fill="#fff" />}
      {labels?.show && series.points.map((point, index) => {
        const override = labels.points?.[index] ?? null
        if (override && override.show === false) return null
        const offset = override?.offset
        const x = cx + (offset ? offset.x * width : 0)
        const y = cy + (offset ? offset.y * height : 0) + (override?.fontSize ?? labels.fontSize ?? 10) / 3
        return (
          <text
            key={`label:${index}`}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize={override?.fontSize ?? labels.fontSize ?? 10}
            fontWeight={override?.bold ? 600 : undefined}
            fill={override?.color ?? labels.color ?? LABEL}
            {...(labels.fontFamily ? { fontFamily: labels.fontFamily } : {})}
          >
            {formatLabel(point.value, labels.numberFormat)}
          </text>
        )
      })}
      <text x={cx} y={height - 8} textAnchor="middle" fontSize={10} fill={LABEL}>
        {series.points.map((point) => point.category).join(' · ')}
      </text>
    </svg>
  )
}

function useElementSize() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ width: 400, height: 240 })
  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      if (width > 0 && height > 0) setSize({ width, height })
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, ...size }
}

export function ChartView({ content, theme }: { content: Record<string, unknown>; theme?: ThemeLike | null }) {
  const model = chartModelOf(content, theme)
  const { ref, width, height } = useElementSize()
  const paints = React.useMemo(
    () => model.flatMap((series) => [series.pattern, ...series.points.map((point) => point.paint?.pattern)]),
    [model]
  )
  const patterns = usePatternDefs(paints)
  if (!model.length) {
    return <div style={{ fontSize: 12, color: '#6b7280', padding: 8 }}>图表无有效数据</div>
  }
  const kind = model[0].kind
  const isPie = kind === 'pie' || kind === 'doughnut'
  const supported = isPie || model.every((series) => ['bar', 'line', 'area'].includes(series.kind))
  const fillOf = (paint: ChartPatternModel | undefined, color: string) => {
    const id = paint ? patterns.idOf(paint) : undefined
    return id ? `url(#${id})` : color
  }
  return (
    <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {isPie ? (
        <PieChart series={model[0]} width={width} height={height} fillOf={fillOf} defs={<PatternDefs defs={patterns.defs} />} />
      ) : supported ? (
        <CartesianChart model={model} content={content} width={width} height={height} fillOf={fillOf} defs={<PatternDefs defs={patterns.defs} />} />
      ) : (
        <div style={{ fontSize: 12, color: '#6b7280', padding: 8 }}>{kind} 图请在导出后查看精确外观</div>
      )}
    </div>
  )
}


