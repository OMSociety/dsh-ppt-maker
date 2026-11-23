/**
 * 图表的轻量 SVG 直渲。
 *
 * PPTD 图表契约是 data:{cols, rows 二维数组} + series[{type, encode:{x,y}}]，不是任意
 * {x,y} 对象数组。这里直接消费同一份契约，支持柱状/条形、折线、面积与饼图的工作台预览；
 * 复杂 Excel 图表的最终精确外观仍以「导出 .pptx」的 LibreOffice 渲染为准。
 */
import * as React from 'react'
import type { ThemeLike } from '../render/resolve'
import { CHART_PALETTE, chartModelOf, niceScale, type ChartPatternModel, type ChartSeriesModel } from '../render/chart-model'
import {
  type ChartLegendModel,
  type ChartTitleModel,
  type RadarChartModel,
  type XYChartModel,
  bubbleModelOf,
  chartKindOf,
  candlestickModelOf,
  type CandlestickChartModel,
  markerGeometry,
  radarModelOf,
  scatterModelOf,
} from '../render/chart-xy-model'
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

function lineProps(style: { color?: string; width?: number; dash?: string } | undefined, color: string, width = 1) {
  return {
    stroke: style?.color ?? color,
    strokeWidth: style?.width ?? width,
    ...(style?.dash ? { strokeDasharray: style.dash } : {}),
  }
}

function ChartTitleAndLegend({ title, legend }: { title?: ChartTitleModel; legend?: ChartLegendModel }) {
  return (
    <>
      {title && (
        <text
          x={title.x}
          y={title.y}
          textAnchor="middle"
          fontSize={title.fontSize}
          fontWeight={600}
          fill={title.color ?? '#333'}
          {...(title.fontFamily ? { fontFamily: title.fontFamily } : {})}
        >{title.text}</text>
      )}
      {legend?.items.map((item, index) => (
        <g key={`legend:${index}`}>
          <rect x={item.swatchX} y={item.swatchY} width={10} height={10} rx={2} fill={item.color} />
          <text
            x={item.textX}
            y={item.textY}
            fontSize={legend.fontSize}
            fill={legend.color ?? LABEL}
            {...(legend.fontFamily ? { fontFamily: legend.fontFamily } : {})}
          >{item.name}</text>
        </g>
      ))}
    </>
  )
}

function XYChart({ model }: { model: XYChartModel }) {
  const clipId = `pptd-xy-clip-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const { plot, xAxis, yAxis } = model
  const xText = { fontSize: xAxis.fontSize ?? 9, fill: xAxis.color ?? LABEL, ...(xAxis.fontFamily ? { fontFamily: xAxis.fontFamily } : {}) }
  const yText = { fontSize: yAxis.fontSize ?? 9, fill: yAxis.color ?? LABEL, ...(yAxis.fontFamily ? { fontFamily: yAxis.fontFamily } : {}) }
  const tickLabel = (value: number, format?: string) => format ? formatLabel(value, format) : tickText(value)
  return (
    <svg width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} style={{ display: 'block' }}>
      <defs>
        <clipPath id={clipId}><rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} /></clipPath>
      </defs>
      <ChartTitleAndLegend title={model.title} legend={model.legend} />
      {xAxis.ticks.map((tick) => (
        <g key={`x:${tick.value}`}>
          {xAxis.gridLine && <line x1={tick.pos} y1={plot.top} x2={tick.pos} y2={plot.top + plot.height} {...lineProps(xAxis.gridStyle, GRID)} />}
          {xAxis.label && <text x={tick.pos} y={plot.top + plot.height + 14} textAnchor="middle" {...xText}>{tickLabel(tick.value, xAxis.numberFormat)}</text>}
        </g>
      ))}
      {yAxis.ticks.map((tick) => (
        <g key={`y:${tick.value}`}>
          {yAxis.gridLine && <line x1={plot.left} y1={tick.pos} x2={plot.left + plot.width} y2={tick.pos} {...lineProps(yAxis.gridStyle, GRID)} />}
          {yAxis.label && <text x={plot.left - 5} y={tick.pos + 3} textAnchor="end" {...yText}>{tickLabel(tick.value, yAxis.numberFormat)}</text>}
        </g>
      ))}
      {xAxis.axisLine && <line x1={plot.left} y1={plot.top + plot.height} x2={plot.left + plot.width} y2={plot.top + plot.height} {...lineProps(xAxis.axisStyle, 'rgba(0,0,0,0.45)')} />}
      {yAxis.axisLine && <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.top + plot.height} {...lineProps(yAxis.axisStyle, 'rgba(0,0,0,0.45)')} />}
      <g clipPath={`url(#${clipId})`}>
        {model.series.map((series, seriesIndex) => {
          // 大气泡先画，小气泡留在上层。
          const points = series.kind === 'bubble'
            ? [...series.points].sort((a, b) => (b.r ?? 0) - (a.r ?? 0))
            : series.points
          return (
            <g key={`${series.name}:${seriesIndex}`}>
              {points.map((point, index) => {
                const common = {
                  fill: series.color,
                  fillOpacity: series.opacity,
                  ...(series.border ? lineProps(series.border, '#000') : {}),
                }
                if (series.kind === 'bubble') {
                  return <circle key={index} cx={point.px} cy={point.py} r={point.r ?? 0} {...common} />
                }
                const geo = markerGeometry(series.marker!.shape, point.px, point.py, series.marker!.size)
                return geo.type === 'circle'
                  ? <circle key={index} cx={geo.cx} cy={geo.cy} r={geo.r} {...common} />
                  : <polygon key={index} points={geo.points} {...common} />
              })}
            </g>
          )
        })}
      </g>
      {model.series.map((series, seriesIndex) => {
        const labels = series.dataLabels
        if (!labels?.show) return null
        const fontSize = labels.fontSize ?? 10
        return series.points.map((point, index) => (
          <text
            key={`label:${seriesIndex}:${index}`}
            x={point.labelX}
            y={series.labelPlacement === 'center' ? point.labelY + fontSize / 3 : point.labelY}
            textAnchor="middle"
            fontSize={fontSize}
            fill={labels.color ?? LABEL}
            {...(labels.fontFamily ? { fontFamily: labels.fontFamily } : {})}
          >{formatLabel(point.value, labels.numberFormat)}</text>
        ))
      })}
    </svg>
  )
}

function RadarChart({ model }: { model: RadarChartModel }) {
  const { axis } = model
  const ringText = { fontSize: axis.fontSize ?? 9, fill: axis.color ?? LABEL, ...(axis.fontFamily ? { fontFamily: axis.fontFamily } : {}) }
  return (
    <svg width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} style={{ display: 'block' }}>
      <ChartTitleAndLegend title={model.title} legend={model.legend} />
      {axis.gridLine && model.rings.map((ring) => (
        <polygon key={`ring:${ring.value}`} points={ring.points} fill="none" {...lineProps(axis.gridStyle, GRID)} />
      ))}
      {axis.axisLine && model.spokes.map((spoke) => (
        <line key={`spoke:${spoke.index}`} x1={model.cx} y1={model.cy} x2={spoke.x} y2={spoke.y} {...lineProps(axis.axisStyle, GRID)} />
      ))}
      {model.spokes.map((spoke) => (
        <text key={`label:${spoke.index}`} x={spoke.labelX} y={spoke.labelY} textAnchor={spoke.anchor} fontSize={10} fill={LABEL}>{spoke.label}</text>
      ))}
      {axis.label && model.rings.map((ring) => (
        <text key={`tick:${ring.value}`} x={ring.labelX} y={ring.labelY} {...ringText}>
          {axis.numberFormat ? formatLabel(ring.value, axis.numberFormat) : tickText(ring.value)}
        </text>
      ))}
      {model.series.map((series, seriesIndex) => (
        <g key={`${series.name}:${seriesIndex}`}>
          {series.area !== false && series.fills.map((d, index) => (
            <path key={`fill:${index}`} d={d} fill={series.area ? series.area.color : 'none'} fillOpacity={series.area ? series.area.opacity : 0} stroke="none" />
          ))}
          {series.outlines.map((d, index) => (
            <path
              key={`line:${index}`}
              d={d}
              fill="none"
              stroke={series.color}
              strokeWidth={series.width}
              strokeLinejoin="round"
              strokeLinecap="round"
              {...(series.dash ? { strokeDasharray: series.dash } : {})}
            />
          ))}
          {series.marker && series.points.map((point, index) => {
            if (!point) return null
            const geo = markerGeometry(series.marker!.shape, point.x, point.y, series.marker!.size)
            const common = { fill: series.marker!.color, ...(series.marker!.border ? lineProps(series.marker!.border, '#000') : {}) }
            return geo.type === 'circle'
              ? <circle key={`m:${index}`} cx={geo.cx} cy={geo.cy} r={geo.r} {...common} />
              : <polygon key={`m:${index}`} points={geo.points} {...common} />
          })}
          {series.dataLabels?.show && series.points.map((point, index) => point && (
            <text
              key={`v:${index}`}
              x={point.labelX}
              y={point.labelY + (series.dataLabels!.fontSize ?? 10) / 3}
              textAnchor="middle"
              fontSize={series.dataLabels!.fontSize ?? 10}
              fill={series.dataLabels!.color ?? LABEL}
              {...(series.dataLabels!.fontFamily ? { fontFamily: series.dataLabels!.fontFamily } : {})}
            >{formatLabel(point.value, series.dataLabels!.numberFormat)}</text>
          ))}
        </g>
      ))}
    </svg>
  )
}
function CandlestickChart({ model }: { model: CandlestickChartModel }) {
  const { plot } = model
  const w = (l: { color?: string; width?: number; dash?: string } | undefined, c: string) => ({ stroke: l?.color ?? c, strokeWidth: l?.width ?? 1, ...(l?.dash ? { strokeDasharray: l.dash } : {}) })
  return (
    <svg width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} style={{ display: 'block' }}>
      {model.title && <text x={model.title.x} y={model.title.y} textAnchor="middle" fontSize={model.title.fontSize} fontWeight={600} fill={model.title.color ?? '#333'}>{model.title.text}</text>}
      {model.yAxis.ticks.map((t) => (
        <g key={`y:${t.value}`}>
          <line x1={plot.left} y1={t.pos} x2={plot.left + plot.width} y2={t.pos} stroke={GRID} strokeWidth={1} />
          <text x={plot.left - 5} y={t.pos + 3} textAnchor="end" fontSize={9} fill={LABEL}>{tickText(t.value)}</text>
        </g>
      ))}
      {model.xLabels.map((l, i) => <text key={`x:${i}`} x={l.x} y={plot.top + plot.height + 14} textAnchor="middle" fontSize={9} fill={LABEL}>{l.text}</text>)}
      {model.bars.map((b, i) => (
        <g key={i}>
          <line x1={b.cx} y1={b.highY} x2={b.cx} y2={b.lowY} {...w(model.wick, b.color)} />
          {b.body
            ? <rect x={b.body.x} y={b.body.y} width={b.body.width} height={b.body.height} fill={b.color} {...(b.up ? (model.upBorder ? w(model.upBorder, b.color) : {}) : (model.downBorder ? w(model.downBorder, b.color) : {}))} />
            : <line x1={b.tickX1} y1={b.closeY} x2={b.tickX2} y2={b.closeY} {...w(model.wick, b.color)} />}
        </g>
      ))}
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
  const kind = chartKindOf(content)
  const { ref, width, height } = useElementSize()
  const model = React.useMemo(
    () => kind === 'classic' || kind === 'mixed' ? chartModelOf(content, theme) : [],
    [content, theme, kind]
  )
  const paints = React.useMemo(
    () => model.flatMap((series) => [series.pattern, ...series.points.map((point) => point.paint?.pattern)]),
    [model]
  )
  const patterns = usePatternDefs(paints)
  const note = (text: string) => <div style={{ fontSize: 12, color: '#6b7280', padding: 8 }}>{text}</div>
  const wrap = (body: React.ReactNode) => (
    <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{body}</div>
  )
  if (kind === 'scatter' || kind === 'bubble') {
    const xy = (kind === 'scatter' ? scatterModelOf : bubbleModelOf)(content, theme, { width, height })
    return wrap(xy ? <XYChart model={xy} /> : note('图表无有效数据'))
  }
  if (kind === 'candlestick') {
    const k = candlestickModelOf(content, theme, { width, height })
    return wrap(k ? <CandlestickChart model={k} /> : note('图表无有效数据'))
  }
  if (kind === 'radar') {
    const radar = radarModelOf(content, theme, { width, height })
    return wrap(radar ? <RadarChart model={radar} /> : note('图表无有效数据'))
  }
  if (!model.length) return note('图表无有效数据')
  const first = model[0].kind
  const isPie = first === 'pie' || first === 'doughnut'
  const supported = isPie || model.every((series) => ['bar', 'line', 'area'].includes(series.kind))
  const fillOf = (paint: ChartPatternModel | undefined, color: string) => {
    const id = paint ? patterns.idOf(paint) : undefined
    return id ? `url(#${id})` : color
  }
  return wrap(
    isPie ? (
      <PieChart series={model[0]} width={width} height={height} fillOf={fillOf} defs={<PatternDefs defs={patterns.defs} />} />
    ) : supported ? (
      <CartesianChart model={model} content={content} width={width} height={height} fillOf={fillOf} defs={<PatternDefs defs={patterns.defs} />} />
    ) : (
      note(`${first} 图请在导出后查看精确外观`)
    )
  )
}