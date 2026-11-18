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
  rows: TableCell[][],
): TableStyleMap {
  const lastRow = rows.length - 1
  const lastCol = rows[r]?.length ? rows[r].length - 1 : 0
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

function cellBorderStyle(border: unknown, theme?: ThemeLike | null): Pick<CSSProperties, 'border'> {
  if (border === null) return { border: 'none' }
  if (border && typeof border === 'object' && !Array.isArray(border)) {
    return { border: borderToCss(border, theme) ?? '1px solid rgba(0,0,0,0.15)' }
  }
  return { border: '1px solid rgba(0,0,0,0.15)' }
}

export function tableCellViewModel(
  cell: TableCell,
  base: TableStyleMap,
  theme?: ThemeLike | null,
): CSSProperties & { html: string } {
  const merged: TableStyleMap = { ...base, ...cell }
  const textStyle = resolveTextStyle({ ...merged, style: cell.textStyle }, theme)
  const align = Array.isArray(merged.align) ? merged.align : []
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

export function tableModelOf(content: Record<string, unknown>) {
  const rows = normTableRows(content.rows)
  const columns = Math.max(0, ...rows.map((row) => row.length))
  return {
    rows,
    columns,
    columnWidths: ratioList(content.columnWidths, columns),
    rowHeights: ratioList(content.rowHeights, rows.length),
  }
}
