/**
 * 图表的轻量 SVG 直渲。
 *
 * PPTD 图表契约是 data:{cols, rows 二维数组} + series[{type, encode:{x,y}}]，不是任意
 * {x,y} 对象数组。这里直接消费同一份契约，支持柱状/条形、折线、面积与饼图的工作台预览；
 * 复杂 Excel 图表的最终精确外观仍以「导出 .pptx」的 LibreOffice 渲染为准。
 */
import * as React from 'react'
import type { ThemeLike } from '../render/resolve'
import { CHART_PALETTE, chartModelOf, type ChartSeriesModel } from '../render/chart-model'
const GRID = 'rgba(60,60,60,0.16)'
const LABEL = '#5c5c5c'

function niceScale(values: number[]) {
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = Math.max(1, max - min)
  const rough = span / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const ratio = rough / power
  const step = (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power
  const low = Math.floor(min / step) * step
  const high = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = low; value <= high + step * 0.001; value += step) ticks.push(Number(value.toFixed(10)))
  return { min: low, max: high, ticks }
}

function tickText(value: number): string {
  return Math.abs(value) >= 1000 ? value.toLocaleString('zh-CN') : String(value)
}

function CartesianChart({
  model,
  content,
  width,
  height,
}: {
  model: ChartSeriesModel[]
  content: Record<string, unknown>
  width: number
  height: number
}) {
  const categories = Array.from(new Set(model.flatMap((series) => series.points.map((point) => point.category))))
  const horizontal = content.xAxis && typeof content.xAxis === 'object'
    && (content.xAxis as Record<string, unknown>).type === 'category'
  const scale = niceScale(model.flatMap((series) => series.points.map((point) => point.value)))
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
  const zero = valuePosition(0)
  const labelEvery = Math.max(1, Math.ceil(categories.length / 8))

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {scale.ticks.map((tick) => {
        const pos = valuePosition(tick)
        return horizontal ? (
          <g key={tick}>
            <line x1={pos} y1={top} x2={pos} y2={top + plotH} stroke={GRID} strokeWidth={1} />
            <text x={pos} y={height - 10} textAnchor="middle" fontSize={9} fill={LABEL}>{tickText(tick)}</text>
          </g>
        ) : (
          <g key={tick}>
            <line x1={left} y1={pos} x2={left + plotW} y2={pos} stroke={GRID} strokeWidth={1} />
            <text x={left - 5} y={pos + 3} textAnchor="end" fontSize={9} fill={LABEL}>{tickText(tick)}</text>
          </g>
        )
      })}
      <line
        x1={horizontal ? zero : left}
        y1={horizontal ? top : zero}
        x2={horizontal ? zero : left + plotW}
        y2={horizontal ? top + plotH : zero}
        stroke="rgba(0,0,0,0.45)"
      />
      {categories.map((category, categoryIndex) => {
        const slot = (horizontal ? plotH : plotW) / Math.max(1, categories.length)
        const center = (horizontal ? top : left) + slot * (categoryIndex + 0.5)
        const groupSize = slot * Math.min(0.72, Math.max(0.35, Number(content.barWidth) || 0.62))
        const bars = model.filter((series) => series.kind === 'bar')
        return (
          <g key={`${category}:${categoryIndex}`}>
            {model.map((series) => {
              const point = series.points.find((item) => item.category === category)
              if (!point) return null
              if (series.kind === 'bar') {
                const barIndex = bars.indexOf(series)
                const thickness = groupSize / Math.max(1, bars.length)
                const start = center - groupSize / 2 + barIndex * thickness + 1
                const band = Math.max(1, thickness - 2)
                const valuePos = valuePosition(point.value)
                return horizontal ? (
                  <rect
                    key={series.name}
                    x={Math.min(zero, valuePos)}
                    y={start}
                    width={Math.max(1, Math.abs(valuePos - zero))}
                    height={band}
                    rx={2}
                    fill={series.color}
                  />
                ) : (
                  <rect
                    key={series.name}
                    x={start}
                    y={Math.min(zero, valuePos)}
                    width={band}
                    height={Math.max(1, Math.abs(valuePos - zero))}
                    rx={2}
                    fill={series.color}
                  />
                )
              }
              return null
            })}
            {categoryIndex % labelEvery === 0 && (
              horizontal ? (
                <text x={left - 7} y={center + 3} textAnchor="end" fontSize={10} fill={LABEL}>{category}</text>
              ) : (
                <text x={center} y={height - 10} textAnchor="middle" fontSize={10} fill={LABEL}>{category}</text>
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

function PieChart({ series, width, height }: { series: ChartSeriesModel; width: number; height: number }) {
  const total = series.points.reduce((sum, point) => sum + Math.max(0, point.value), 0) || 1
  const cx = width / 2
  const cy = Math.max(35, (height - 24) / 2)
  const radius = Math.max(12, Math.min(width / 3, height / 3))
  let angle = -Math.PI / 2
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {series.points.map((point, index) => {
        const next = angle + (Math.max(0, point.value) / total) * Math.PI * 2
        const x1 = cx + radius * Math.cos(angle)
        const y1 = cy + radius * Math.sin(angle)
        const x2 = cx + radius * Math.cos(next)
        const y2 = cy + radius * Math.sin(next)
        const large = next - angle > Math.PI ? 1 : 0
        const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} Z`
        angle = next
        return <path key={`${point.category}:${index}`} d={path} fill={index === 0 ? series.color : CHART_PALETTE[index % CHART_PALETTE.length]} stroke="#fff" strokeWidth={1.5} />
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
  if (!model.length) {
    return <div style={{ fontSize: 12, color: '#6b7280', padding: 8 }}>图表无有效数据</div>
  }
  const kind = model[0].kind
  const supported = kind === 'pie' || model.every((series) => ['bar', 'line', 'area'].includes(series.kind))
  return (
    <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {kind === 'pie' ? (
        <PieChart series={model[0]} width={width} height={height} />
      ) : supported ? (
        <CartesianChart model={model} content={content} width={width} height={height} />
      ) : (
        <div style={{ fontSize: 12, color: '#6b7280', padding: 8 }}>{kind} 图请在导出后查看精确外观</div>
      )}
    </div>
  )
}
