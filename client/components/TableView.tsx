/**
 * 表格的轻量 DOM 直渲：直接消费 PPTD 元素顶层的 rows / columnWidths / rowHeights / style。
 * 合并单元格用显式 gridRow/gridColumn 定位，避免稀疏 rows 被自动排版到错误位置。
 */
import * as React from 'react'
import type { ThemeLike } from '../render/resolve'
import {
  tableCategoryStyleOf,
  tableCellViewModel,
  tableModelOf,
  tableStyleOf,
  type TableStyleMap,
} from '../render/table-model'

export function TableView({ content, theme }: { content: Record<string, unknown>; theme?: ThemeLike | null }) {
  const model = tableModelOf(content)
  if (!model.rows.length || !model.columns) {
    return <div style={{ fontSize: 12, color: '#6b7280', padding: 8 }}>空表格</div>
  }
  const tableStyle = tableStyleOf(content, theme)
  const baseStyle = tableStyle.cellStyle && typeof tableStyle.cellStyle === 'object'
    ? tableStyle.cellStyle as TableStyleMap
    : {}
  return (
    <div
      className="pptd-table-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: model.columnWidths.map((r) => `${r}fr`).join(' '),
        gridTemplateRows: model.rowHeights.map((r) => `${r}fr`).join(' '),
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderCollapse: 'collapse',
      }}
    >
      {model.cells.map(({ r, c, rowSpan, colSpan, cell }) => {
          const category = tableCategoryStyleOf(tableStyle, r, c, model.rows.length - 1, model.columns - 1)
          const { html, ...style } = tableCellViewModel(cell, { ...baseStyle, ...category }, theme)
          return (
            <div
              key={`${r}:${c}`}
              className="pptd-table-cell"
              style={{
                ...style,
                gridRow: `${r + 1} / span ${rowSpan}`,
                gridColumn: `${c + 1} / span ${colSpan}`,
                boxSizing: 'border-box',
                minWidth: 0,
                minHeight: 0,
                overflow: 'hidden',
                padding: '0 8px',
                display: 'flex',
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        })}
    </div>
  )
}
