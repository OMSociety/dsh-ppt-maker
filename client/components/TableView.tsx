/**
 * TableView — table 元素的 DOM 直渲（工作台预览用）。
 *
 * 替代原先的灰底占位：按 normTableRows 的稀疏归一规则渲染真实表格。
 * 布局语义与导出端对齐（docs/pptd-spec.md §表格）：
 *   - width/height 落在 cols/rows 声明上；colWidths/rowHeights 比例归一。
 *   - 单元格 backgroundColor/color/fontSize 经 resolveColor 解析（$ref 生效）。
 *   - style 简写（{headerRow:true}）映射表头底色 = theme.colors.primary。
 * 这是预览近似：单元格文字溢出、合并单元格与导出端可能有差异，
 * 最终成品以导出渲染（renderPptxImages）为准。
 */

import type { CSSProperties, ReactNode } from 'react'
import { normTableRows, type TableCell } from '../render/table-rows'
import { resolveColor, type ThemeLike } from '../render/resolve'

/** 归一后的表格视图模型（本文件内部使用）。 */
interface TableModel {
  rows: TableCell[][]
  nR: number
  nC: number
  colWidths?: number[]
  rowHeights?: number[]
}

function tableModelOf(content: Record<string, unknown>): TableModel | null {
  const rows = normTableRows(content.rows)
  if (!rows.length) return null
  const nR = rows.length
  const nC = Math.max(1, ...rows.map((r) => r.length))
  const colWidths = Array.isArray(content.colWidths) ? (content.colWidths as number[]) : undefined
  const rowHeights = Array.isArray(content.rowHeights) ? (content.rowHeights as number[]) : undefined
  return { rows, nR, nC, colWidths, rowHeights }
}

export function TableView({
  content,
  theme,
}: {
  content: Record<string, unknown>
  theme?: ThemeLike | null
}) {
  const model = tableModelOf(content)
  if (!model) {
    return <div style={fallbackStyle()}>表格数据无法解析</div>
  }
  const { rows, nR, nC, colWidths, rowHeights } = model

  // 比例 → fr：CSS grid 的 fr 单位本身就是「剩余空间按比例分配」，
  // 与 PPTD colWidths/rowHeights 的归一语义天然一致。
  const colTemplate = (Array.isArray(colWidths) && colWidths.length === nC
    ? (colWidths as number[])
    : Array(nC).fill(1)
  ).map((w) => `${w}fr`).join(' ')
  const rowTemplate = (Array.isArray(rowHeights) && rowHeights.length === nR
    ? (rowHeights as number[])
    : Array(nR).fill(1)
  ).map((h) => `${h}fr`).join(' ')

  const primary = resolveColor('$primary', theme) ?? '#1f2937'
  const paper = resolveColor('$paper', theme) ?? '#ffffff'
  const ink = resolveColor('$ink', theme) ?? '#1f2937'

  const cells: ReactNode[] = []
  for (let r = 0; r < nR; r++) {
    const row = rows[r] ?? []
    for (let c = 0; c < nC; c++) {
      const cell: TableCell | undefined = row[c]
      if (!cell) continue
      const isHeader = r === 0 && content.style !== undefined
      const colSpan = typeof cell.colSpan === 'number' ? cell.colSpan : 1
      const rowSpan = typeof cell.rowSpan === 'number' ? cell.rowSpan : 1
      const style: CSSProperties = {
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        display: 'flex',
        alignItems: cell.valign === 'top' ? 'flex-start' : cell.valign === 'bottom' ? 'flex-end' : 'center',
        justifyContent:
          cell.align === 'center' ? 'center' : cell.align === 'right' ? 'flex-end' : 'flex-start',
        padding: 4,
        overflow: 'hidden',
        fontSize: typeof cell.fontSize === 'number' ? cell.fontSize : 12,
        color: resolveColor(cell.color, theme) ?? (isHeader ? paper : ink),
        backgroundColor:
          resolveColor(cell.backgroundColor, theme) ?? (isHeader ? primary : 'transparent'),
        fontWeight: isHeader ? 700 : 400,
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: 1.3,
      }
      cells.push(
        <div key={`${r}:${c}`} style={style}>
          {typeof cell.text === 'string' || typeof cell.text === 'number' ? String(cell.text) : ''}
        </div>,
      )
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: colTemplate,
        gridTemplateRows: rowTemplate,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.4)',
      }}
    >
      {cells}
    </div>
  )
}

function fallbackStyle(): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.05)',
    color: '#94a3b8',
    fontSize: 12,
  }
}
