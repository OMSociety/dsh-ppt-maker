/** 图案填充的实色回落：前景 / 背景按图案油墨占比混合。 */

/** Linear blend of two `#RRGGBB` colours; `t` = share of `a`. */
export function blendHex(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * t + ch(b, i) * (1 - t)))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** Share of foreground ink a preset pattern paints (pctN = N%; hatches ≈ 25%). */
export function patternInk(preset: string): number {
  const m = /^pct(\d+)$/.exec(preset)
  if (m) return Number(m[1]) / 100
  if (/^(dk|wd|smGrid|lgGrid|smCheck|lgCheck|solidDmnd|shingle|plaid|sphere|weave|trellis)/.test(preset)) return 0.4
  return 0.25
}

/** 图案前景 / 背景（#RRGGBB）混合成单一实色。 */
export function patternFallbackColor(preset: string, foreground: string, background: string): string {
  return blendHex(foreground, background, patternInk(preset))
}
