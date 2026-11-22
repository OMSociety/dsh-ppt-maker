/** PPTD table 元素 → 工作台表格视图模型（无 React、无 DOM 依赖）。 */
import type { CSSProperties } from 'react'
import type { ThemeLike } from './resolve'
import { borderToCss, fillToCss, resolveColor, resolveTextStyle } from './resolve'
import { sanitizeHtml } from './sanitize'
import { normTableRows, type TableCell } from './table-rows'

export type TableStyleMap = Record<string, unknown>

function ratioList(value: unknown, count: number): number[] {
  const nums = Array.isArray(value)
    ? value.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0)
    : []
  if (nums.length === count && count > 0) {
    const sum = nums.reduce((a, b) => a + b, 0)
    return nums.map((n) => n / sum)
  }
  return Array.from({ length: Math.max(count, 1) }, () => 1 / Math.max(count, 1))
}

export function tableStyleOf(content: Record<string, unknown>, theme?: ThemeLike | null): TableStyleMap {
  const style = content.style
  if (style && typeof style === 'object' && !Array.isArray(style)) return style as TableStyleMap
  if (typeof style === 'string' && style.startsWith('$')) {
    const hit = theme?.tableStyles?.[style.slice(1)]
    if (hit && typeof hit === 'object') return hit
  }
  return {}
}

export function tableCategoryStyleOf(
  style: TableStyleMap,
  r: number,
  c: number,
  lastRow: number,
  lastCol: number,
): TableStyleMap {
  const bodyStyles = Array.isArray(style.bodyStyles) ? style.bodyStyles : []
  const rowStyle = r === 0
    ? style.firstRowStyle
    : r === lastRow
      ? style.lastRowStyle
      : bodyStyles.length
        ? bodyStyles[(r - 1) % bodyStyles.length]
        : undefined
  const colStyle = c === 0 ? style.firstColumnStyle : c === lastCol ? style.lastColumnStyle : undefined
  const row = rowStyle && typeof rowStyle === 'object' ? rowStyle as TableStyleMap : {}
  const col = colStyle && typeof colStyle === 'object' ? colStyle as TableStyleMap : {}
  return style.rowOverColumn === false ? { ...row, ...col } : { ...col, ...row }
}

/** 规格 §1.3.2 单元格默认边框：{style: solid, width: 1, color: #000000}。 */
const DEFAULT_CELL_BORDER = '1px solid #000000'

type CellBorderCss = Pick<CSSProperties, 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft'>

/** 单条边：null 不画，Border 对象画，未写（undefined）用规格默认边框。 */
function sideCss(side: unknown, theme?: ThemeLike | null): string {
  if (side === null) return 'none'
  if (side && typeof side === 'object') return borderToCss(side, theme) ?? DEFAULT_CELL_BORDER
  return DEFAULT_CELL_BORDER
}

/**
 * BorderSpec（规格 §6.7）= null | Border | [上下, 左右] | [上, 右, 下, 左]；
 * 数组内的 null 表示该边不画。
 */
function cellBorderStyle(border: unknown, theme?: ThemeLike | null): CellBorderCss {
  let sides: [unknown, unknown, unknown, unknown]
  if (Array.isArray(border) && border.length === 2) sides = [border[0], border[1], border[0], border[1]]
  else if (Array.isArray(border) && border.length === 4) sides = [border[0], border[1], border[2], border[3]]
  else sides = [border, border, border, border]
  const [top, right, bottom, left] = sides.map((side) => sideCss(side, theme))
  return { borderTop: top, borderRight: right, borderBottom: bottom, borderLeft: left }
}

export function tableCellViewModel(
  cell: TableCell,
  base: TableStyleMap,
  theme?: ThemeLike | null,
): CSSProperties & { html: string } {
  const merged: TableStyleMap = { ...base, ...cell }
  const textStyle = resolveTextStyle({ ...merged, style: cell.textStyle }, theme)
  // 规格 §1.3.2：单元格 align 默认 [center, middle]。
  const align = Array.isArray(merged.align) ? merged.align : ['center', 'middle']
  const fontFamily = typeof textStyle.fontFamily === 'string' ? textStyle.fontFamily : undefined
  const fontSize = typeof textStyle.fontSize === 'number' ? textStyle.fontSize : 14
  return {
    html: sanitizeHtml(String(cell.text ?? '')),
    background: fillToCss(merged.fill, theme),
    color: resolveColor(textStyle.color, theme) ?? '#1f2937',
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    fontSize,
    fontWeight: textStyle.bold ? 700 : 400,
    fontStyle: textStyle.italic ? 'italic' : 'normal',
    lineHeight: typeof textStyle.lineHeight === 'number' ? textStyle.lineHeight : 1.25,
    textAlign: align[0] === 'center' ? 'center' : align[0] === 'right' ? 'right' : 'left',
    justifyContent: align[0] === 'center' ? 'center' : align[0] === 'right' ? 'flex-end' : 'flex-start',
    alignItems: align[1] === 'top' ? 'flex-start' : align[1] === 'bottom' ? 'flex-end' : 'center',
    ...cellBorderStyle(merged.border, theme),
  }
}

export interface PlacedTableCell {
  r: number
  /** Grid column: `rows` omits cells covered by a merge (spec §6.6). */
  c: number
  rowSpan: number
  colSpan: number
  cell: TableCell
}

export function tableModelOf(content: Record<string, unknown>) {
  const rows = normTableRows(content.rows)
  const widestRow = Math.max(
    0,
    ...rows.map((row) => row.reduce((sum, cell) => sum + Math.max(1, Number(cell.colSpan) || 1), 0)),
  )
  const columns = Array.isArray(content.columnWidths) && content.columnWidths.length > 0
    ? content.columnWidths.length
    : widestRow
  const occupied = rows.map(() => new Array<boolean>(columns).fill(false))
  const cells: PlacedTableCell[] = []
  rows.forEach((row, r) => {
    let c = 0
    for (const cell of row) {
      while (c < columns && occupied[r][c]) c += 1
      if (c >= columns) break
      const rowSpan = Math.max(1, Math.min(Number(cell.rowSpan) || 1, rows.length - r))
      const colSpan = Math.max(1, Math.min(Number(cell.colSpan) || 1, columns - c))
      for (let dr = 0; dr < rowSpan; dr++) for (let dc = 0; dc < colSpan; dc++) occupied[r + dr][c + dc] = true
      cells.push({ r, c, rowSpan, colSpan, cell })
      c += colSpan
    }
  })
  return {
    rows,
    cells,
    columns,
    columnWidths: ratioList(content.columnWidths, columns),
    rowHeights: ratioList(content.rowHeights, rows.length),
  }
}