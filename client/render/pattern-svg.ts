/**
 * PPTD 图案填充 → SVG `<pattern>` 图元（无 React、无 DOM）。
 *
 * 工作台用 SVG 直渲图表，CSS 渐变不能作 SVG 填充，所以图案按 OOXML 预设名
 * 还原成瓦片：背景块 + 前景线条（或点阵）。与 `patternToCss` 同一套预设语义。
 */

export interface PatternTile {
  /** 瓦片边长（用户单位）。 */
  size: number
  /** 前景线条，坐标在瓦片内；`width` 为线宽。 */
  lines: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }>
  /** 前景圆点。 */
  dots: Array<{ cx: number; cy: number; r: number }>
}

function strokeOf(preset: string): { width: number; step: number } {
  const heavy = /^(dk|wd)/.test(preset)
  const light = /^(lt|nar|dash)/.test(preset)
  const width = heavy ? 3 : light ? 1 : 2
  const step = /^(nar|lt|dk|dash)/.test(preset) ? 4 : /^wd/.test(preset) ? 8 : 8
  return { width, step }
}

/** 预设名 → 瓦片几何；无法识别的预设按 25% 网点处理。 */
export function patternTileOf(preset: string): PatternTile {
  const { width, step } = strokeOf(preset)
  const tile = step * 2
  // OOXML 的 UpDiag 自左下向右上（"/"），DnDiag 自左上向右下（"\"）；线长跨满整块瓦片并外延，拼接无断口。
  const diag = (up: boolean) => {
    const lines: PatternTile['lines'] = []
    for (let offset = -tile; offset <= tile; offset += step) {
      lines.push(
        up
          ? { x1: offset, y1: tile, x2: offset + tile, y2: 0, width }
          : { x1: offset, y1: 0, x2: offset + tile, y2: tile, width }
      )
    }
    return lines
  }
  const horiz = (): PatternTile['lines'] =>
    Array.from({ length: Math.floor(tile / step) }, (_v, i) => ({
      x1: 0, y1: i * step + step / 2, x2: tile, y2: i * step + step / 2, width
    }))
  const vert = (): PatternTile['lines'] =>
    Array.from({ length: Math.floor(tile / step) }, (_v, i) => ({
      x1: i * step + step / 2, y1: 0, x2: i * step + step / 2, y2: tile, width
    }))
  const dots = (radius: number, spacing: number): PatternTile['dots'] => {
    const out: PatternTile['dots'] = []
    for (let y = spacing / 2; y < tile; y += spacing) {
      for (let x = spacing / 2; x < tile; x += spacing) out.push({ cx: x, cy: y, r: radius })
    }
    return out
  }

  if (/Horz$/.test(preset)) return { size: tile, lines: horiz(), dots: [] }
  if (/Vert$/.test(preset)) return { size: tile, lines: vert(), dots: [] }
  if (/UpDiag$/.test(preset)) return { size: tile, lines: diag(true), dots: [] }
  if (/DnDiag$/.test(preset)) return { size: tile, lines: diag(false), dots: [] }
  if (preset === 'cross' || /Grid$/.test(preset)) {
    return { size: tile, lines: [...horiz(), ...vert()], dots: [] }
  }
  if (preset === 'diagCross') return { size: tile, lines: [...diag(true), ...diag(false)], dots: [] }
  if (/^(smCheck|lgCheck)/.test(preset)) {
    return { size: tile, lines: [...diag(true), ...diag(false)], dots: [] }
  }
  const pct = /^pct(\d+)$/.exec(preset)
  if (pct) {
    const share = Number(pct[1]) / 100
    const spacing = share >= 0.5 ? 4 : share >= 0.2 ? 7 : 10
    return { size: tile, lines: [], dots: dots(Math.max(0.8, spacing * share * 0.5), spacing) }
  }
  return { size: tile, lines: [], dots: dots(2, 8) }
}
