/** 自定义形状路径：弧线 A 转三次贝塞尔的几何正确性（spec §6.2 custom 路径指令）。 */
import { describe, expect, it } from 'vitest'
import { arcToCubics } from '../src/core/engine/officekit.js'

/** 三次贝塞尔在 t 处的点。 */
function at(p0: [number, number], seg: number[], t: number): [number, number] {
  const [x1, y1, x2, y2, x3, y3] = seg
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
    u * u * u * p0[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
  ]
}

function radiusErrors(start: [number, number], segs: number[][], cx: number, cy: number, r: number): number {
  let worst = 0
  let p0 = start
  for (const seg of segs) {
    for (let t = 0; t <= 1; t += 0.125) {
      const [x, y] = at(p0, seg, t)
      worst = Math.max(worst, Math.abs(Math.hypot(x - cx, y - cy) - r))
    }
    p0 = [seg[4], seg[5]]
  }
  return worst
}

describe('arcToCubics', () => {
  it('半圆 sweep=1：两段、终点精确、始终贴着圆周、经过上方顶点', () => {
    const segs = arcToCubics(0, 0, 1, 1, 0, false, true, 2, 0)
    expect(segs).toHaveLength(2)
    expect(segs[1].slice(4)).toEqual([2, 0])
    expect(segs[0][4]).toBeCloseTo(1, 6)
    expect(segs[0][5]).toBeCloseTo(-1, 6)
    expect(radiusErrors([0, 0], segs, 1, 0, 1)).toBeLessThan(0.001)
  })

  it('sweep=0 走另一侧', () => {
    const segs = arcToCubics(0, 0, 1, 1, 0, false, false, 2, 0)
    expect(segs[0][5]).toBeCloseTo(1, 6)
  })

  it('大弧标志选中超过 180° 的那条弧', () => {
    // 圆心 (810,140) r=235 被画布上边与右边裁切后的那段弧
    const small = arcToCubics(960, 320.9, 235, 235, 0, false, true, 621.3, 0)
    const big = arcToCubics(960, 320.9, 235, 235, 0, true, true, 621.3, 0)
    expect(small.length).toBe(2)
    expect(big.length).toBe(3)
    expect(radiusErrors([960, 320.9], small, 810, 140, 235)).toBeLessThan(0.5)
    expect(radiusErrors([960, 320.9], big, 810, 140, 235)).toBeGreaterThan(1)
  })

  it('半径过小时按规范放大；零半径退化为直线；同点为空', () => {
    const scaled = arcToCubics(0, 0, 0.1, 0.1, 0, false, true, 2, 0)
    expect(radiusErrors([0, 0], scaled, 1, 0, 1)).toBeLessThan(0.001)
    expect(arcToCubics(0, 0, 0, 5, 0, false, true, 3, 4)).toEqual([[0, 0, 3, 4, 3, 4]])
    expect(arcToCubics(1, 1, 5, 5, 0, false, true, 1, 1)).toEqual([])
  })

  it('椭圆旋转 90° 等价于交换半径', () => {
    const a = arcToCubics(0, 0, 2, 1, 90, false, true, 0, 4)
    const b = arcToCubics(0, 0, 1, 2, 0, false, true, 0, 4)
    expect(a.length).toBe(b.length)
    a.forEach((seg, n) => seg.forEach((v, k) => expect(v).toBeCloseTo(b[n][k], 6)))
  })
})
