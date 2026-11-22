/** 画布 contain 适配：缩放比与偏移都对齐到设备像素。 */

export interface CanvasFit {
  scale: number
  x: number
  y: number
}

function gcd(a: number, b: number): number {
  let p = Math.abs(Math.round(a))
  let q = Math.abs(Math.round(b))
  while (q) [p, q] = [q, p % q]
  return p || 1
}

/**
 * 缩放后画布四边都落在整数设备像素上。画布边缘若落在半个像素上，贴边的满版色块与
 * 画布底色会在边缘那一行各自抗锯齿，混出一条底色细线（深色色块贴边时尤其明显）。
 * 缩放比取 n / (gcd(宽, 高) × dpr)，使宽、高的设备像素数都是整数；偏移量取整到设备像素。
 */
export function fitCanvas(cw: number, ch: number, w: number, h: number, dpr: number): CanvasFit | null {
  if (!(cw > 0) || !(w > 0) || !(h > 0)) return null
  const ratio = dpr > 0 ? dpr : 1
  const raw = Math.min(cw / w, ch > 0 ? ch / h : cw / w)
  const unit = gcd(w, h) * ratio
  const steps = Math.floor(raw * unit + 1e-6)
  const scale = steps > 0 ? steps / unit : raw
  const snap = (v: number) => Math.round(v * ratio) / ratio
  return { scale, x: snap((cw - w * scale) / 2), y: snap((ch - h * scale) / 2) }
}
