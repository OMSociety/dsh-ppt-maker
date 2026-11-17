/**
 * ChartView — chart 元素的 SVG 直渲（工作台预览用）。
 *
 * 替代原先的灰底占位：渲染真实数据图形。
 * PPTD chart 方言（docs/pptd-spec.md §图表）：
 *   content = { type:'bar'|'column'|'line'|'area'|'pie'|'donut'|...,
 *               data:{cols, rows}, series:[{x,y,color?}], showLegend? }
 * 预览是「数据形状」近似：柱/条/折线/面积/饼用 SVG 画，
 * 坐标轴、网格线、数据标签的精确样式以导出端（原生 Chart）为准。
 * 配色默认取 theme.colors.primary / accent 轮换，series.color 可覆盖。
 */

import type { CSSProperties } from 'react'
import { resolveColor, type ThemeLike } from '../render/resolve'

interface Pt {
  x: string | number
  y: number
  color?: string
}

function pointsOf(content: Record<string, unknown>): Pt[] {
  // 两种合法来源：data.rows 的对象数组 或 series[{x,y}]。
  const data = content.data as { cols?: string[]; rows?: unknown[] } | undefined
  if (data && Array.isArray(data.rows) && data.rows.length) {
    const cols = Array.isArray(data.cols) ? data.cols : []
    const xKey = cols[0] ?? 'x'
    const yKey = cols[1] ?? 'y'
    return (data.rows as Record<string, unknown>[]).map((r) => ({
      x: (r[xKey] ?? r.x ?? '') as string | number,
      y: Number(r[yKey] ?? r.y ?? 0),
    }))
  }
  const series = content.series as { x?: unknown; y?: unknown; color?: string }[] | undefined
  if (Array.isArray(series)) {
    return series.map((s) => ({ x: (s.x ?? '') as string | number, y: Number(s.y ?? 0), color: s.color }))
  }
  return []
}

export function ChartView({
  content,
  theme,
}: {
  content: Record<string, unknown>
  theme?: ThemeLike | null
}) {
  const kind = typeof content.type === 'string' ? content.type : 'column'
  const pts = pointsOf(content)
  if (!pts.length) return <div style={fallbackStyle()}>图表无数据</div>

  const primary = resolveColor('$primary', theme) ?? '#2563eb'
  const accent = resolveColor('$accent', theme) ?? '#f59e0b'
  const muted = resolveColor('$muted', theme) ?? '#94a3b8'
  const ink = resolveColor('$ink', theme) ?? '#334155'

  const W = 100
  const H = 100
  const padL = 6
  const padB = 12
  const padT = 4

  if (kind === 'pie' || kind === 'donut') {
    const total = pts.reduce((s, p) => s + Math.max(0, p.y), 0) || 1
    let acc = 0
    const slices = pts.map((p, i) => {
      const frac = Math.max(0, p.y) / total
      const start = acc
      acc += frac
      return { ...p, start, frac, color: p.color ?? (i % 2 ? accent : primary) }
    })
    return (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
        {slices.map((s, i) => (
          <Slice key={i} cx={50} cy={44} r={34} start={s.start} frac={s.frac} color={s.color} donut={kind === 'donut'} />
        ))}
        <text x={50} y={96} textAnchor="middle" fontSize={6} fill={muted}>
          {pts.map((p) => String(p.x)).join(' · ').slice(0, 40)}
        </text>
      </svg>
    )
  }

  const maxY = Math.max(...pts.map((p) => p.y), 1)
  const n = pts.length
  const innerW = W - padL - 2
  const innerH = H - padB - padT

  if (kind === 'line' || kind === 'area') {
    const step = n > 1 ? innerW / (n - 1) : 0
    const coords = pts.map((p, i) => [padL + i * step, padT + innerH * (1 - p.y / maxY)] as const)
    const linePath = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    const areaPath = `${linePath} L${padL + (n - 1) * step},${padT + innerH} L${padL},${padT + innerH} Z`
    return (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <line x1={padL} y1={padT + innerH} x2={W - 2} y2={padT + innerH} stroke={muted} strokeWidth={0.4} />
        {kind === 'area' && <path d={areaPath} fill={primary} opacity={0.25} />}
        <path d={linePath} fill="none" stroke={primary} strokeWidth={1.2} />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.4} fill={accent} />
        ))}
        <Labels pts={pts} padL={padL} innerW={innerW} y={H - 3} fill={ink} />
      </svg>
    )
  }

  // bar / column（含 engine 的 bar→column 归一）：柱形
  const horizontal = kind === 'bar'
  const band = (horizontal ? innerH : innerW) / n
  const barSize = Math.min(band * 0.62, horizontal ? 8 : 12)
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      <line x1={padL} y1={padT + innerH} x2={W - 2} y2={padT + innerH} stroke={muted} strokeWidth={0.4} />
      {pts.map((p, i) => {
        const frac = Math.max(0, p.y) / maxY
        const color = p.color ?? (i % 2 ? accent : primary)
        if (horizontal) {
          const y = padT + i * band + (band - barSize) / 2
          return <rect key={i} x={padL} y={y} width={innerW * frac} height={barSize} fill={color} rx={0.6} />
        }
        const x = padL + i * band + (band - barSize) / 2
        const h = innerH * frac
        return <rect key={i} x={x} y={padT + innerH - h} width={barSize} height={h} fill={color} rx={0.6} />
      })}
      {!horizontal && <Labels pts={pts} padL={padL} innerW={innerW} y={H - 3} fill={ink} />}
    </svg>
  )
}

function Labels({ pts, padL, innerW, y, fill }: { pts: Pt[]; padL: number; innerW: number; y: number; fill: string }) {
  const n = pts.length
  const step = n > 1 ? innerW / n : innerW
  return (
    <>
      {pts.map((p, i) => (
        <text key={i} x={padL + i * step + step / 2} y={y} textAnchor="middle" fontSize={4.5} fill={fill}>
          {String(p.x).slice(0, 6)}
        </text>
      ))}
    </>
  )
}

function Slice({
  cx,
  cy,
  r,
  start,
  frac,
  color,
  donut,
}: {
  cx: number
  cy: number
  r: number
  start: number
  frac: number
  color: string
  donut: boolean
}) {
  const a0 = start * Math.PI * 2 - Math.PI / 2
  const a1 = (start + frac) * Math.PI * 2 - Math.PI / 2
  const large = frac > 0.5 ? 1 : 0
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const inner = donut ? r * 0.55 : 0
  const d =
    frac >= 0.999
      ? `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.01},${cy - r} Z`
      : `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`
  return (
    <g>
      <path d={d} fill={color} stroke="#fff" strokeWidth={0.5} />
      {donut && <circle cx={cx} cy={cy} r={inner} fill="#fff" />}
    </g>
  )
}

function fallbackStyle(): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.04)',
    color: '#94a3b8',
    fontSize: 12,
  }
}
