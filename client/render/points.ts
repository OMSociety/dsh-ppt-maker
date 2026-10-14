/**
 * Line 元素的 points + curve → SVG path d（纯函数，可单测）。
 *
 * PPTD Line 契约（reference/pptd.md §Line）：
 *   points: "x1,y1 x2,y2 ..."（viewBox 坐标系；首末点过线，中间点是贝塞尔控制点）
 *   curve:  sharp = 折线连接；round / smooth = 贝塞尔平滑
 */
export function pathFromPoints(pts: Array<[number, number]>, curve: string): string {
  const [x0, y0] = pts[0]
  if (curve === 'sharp' || pts.length === 2) {
    return `M${x0},${y0} ` + pts.slice(1).map(([x, y]) => `L${x},${y}`).join(' ')
  }
  // 贝塞尔：首末点过线，中间点两两作控制点（奇数中间点时最后一个按 Q 处理）
  let d = `M${x0},${y0}`
  let i = 1
  while (i < pts.length - 1) {
    const c1 = pts[i]
    if (i + 1 === pts.length - 1) {
      // 只剩一个中间点 + 终点：二次贝塞尔
      const end = pts[i + 1]
      d += ` Q${c1[0]},${c1[1]} ${end[0]},${end[1]}`
      break
    }
    const c2 = pts[i + 1]
    const end = pts[i + 2]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${end[0]},${end[1]}`
    i += 2
  }
  return d
}
