/**
 * 表格视图的结构助手（Inspector 的 TableGrid 用；纯函数，可单测）。
 *
 * PPTD 的 table.rows 是稀疏二维数组：合并区域按「被占位的单元格直接省略」存放
 * （reference/pptd.md Merged-cell rules），单元格可以是 {text, ...} 对象或简写标量。
 */

export type TableCell = Record<string, unknown>

/** rows 归一：字符串/数字简写单元格包成 {text} 对象，对象单元格原样保留（rowSpan/colSpan 等）。 */
export function normTableRows(rows: unknown): TableCell[][] {
  if (!Array.isArray(rows)) return []
  return rows.map((r) =>
    Array.isArray(r) ? r.map((c) => (c && typeof c === 'object' ? (c as TableCell) : { text: c ?? '' })) : [],
  )
}

/** n 等分比例（columnWidths / rowHeights 的结构变更回写；约定每项 ∈ [0,1] 且和为 1）。 */
export function equalRatios(n: number): number[] {
  return n > 0 ? Array.from({ length: n }, () => 1 / n) : []
}
