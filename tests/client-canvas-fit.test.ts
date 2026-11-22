/** 画布适配对齐设备像素：贴边满版色块不会在画布边缘混出底色细线。 */
import { describe, expect, it } from 'vitest'
import { fitCanvas } from '../client/render/canvas-fit'

const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-6

describe('fitCanvas', () => {
  it.each([
    [180, 101, 1],
    [180, 101, 1.5],
    [1123, 640, 1.25],
    [237, 133, 2],
    [96, 54, 1.5],
  ])('容器 %d×%d、dpr %d：画布四边落在整数设备像素', (cw, ch, dpr) => {
    const fit = fitCanvas(cw, ch, 960, 540, dpr)!
    expect(fit.scale).toBeLessThanOrEqual(Math.min(cw / 960, ch / 540) + 1e-9)
    for (const edge of [fit.x, fit.y, fit.x + 960 * fit.scale, fit.y + 540 * fit.scale]) {
      expect(isInt(edge * dpr)).toBe(true)
    }
  })

  it('完整可见且居中：偏移误差不超过一个设备像素', () => {
    const fit = fitCanvas(1123, 640, 960, 540, 1.25)!
    const visW = 960 * fit.scale
    const visH = 540 * fit.scale
    expect(fit.x).toBeGreaterThanOrEqual(0)
    expect(fit.y).toBeGreaterThanOrEqual(0)
    expect(Math.abs(fit.x - (1123 - visW) / 2)).toBeLessThanOrEqual(1 / 1.25)
    expect(Math.abs(fit.y - (640 - visH) / 2)).toBeLessThanOrEqual(1 / 1.25)
  })

  it('4:3 画布同样整像素对齐；容器为 0 时返回 null', () => {
    const fit = fitCanvas(300, 260, 800, 600, 1.5)!
    expect(isInt(800 * fit.scale * 1.5)).toBe(true)
    expect(isInt(600 * fit.scale * 1.5)).toBe(true)
    expect(fitCanvas(0, 100, 960, 540, 1)).toBeNull()
  })
})
