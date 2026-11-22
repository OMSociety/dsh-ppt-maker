/** 原生表格主体样式与逐边边框的真实 PPTX 往返回归。 */
import { describe, expect, it } from 'vitest'
import {
  getShapeXmlString,
  getSlideTables,
  getSlides,
  getTableCell,
  getTableCellBorders,
  getTableCellFill,
  getTableCellText,
  loadPresentation,
} from '@office-kit/pptx'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import type { Page, Presentation } from '../src/core/pptd/schema.js'

function ctx(): BuildContext {
  return {
    projectDir: '/tmp/pptd-table-style-test',
    loadMedia: async () => { throw new Error('no media in tests') },
    warnings: [],
  }
}

function deck(): Presentation {
  return {
    profile: 'generate',
    size: [960, 540],
    theme: { colors: {}, textStyles: {} },
    export: { fontEmbed: 'off', transition: 'none', animations: 'off' },
    pages: ['pages/01.page'],
  }
}

describe('office-kit 表格样式契约', () => {
  it('未覆盖的末行继续使用 bodyStyles，并保留逐边边框', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [{
        elementId: 'duty-table',
        elementType: 'table',
        bounds: [70, 100, 500, 240],
        columnWidths: [1],
        rowHeights: [0.34, 0.33, 0.33],
        rows: [
          [{ text: '阶段' }],
          [{ text: '创作' }],
          [{ text: '交付' }],
        ],
        style: {
          firstRowStyle: { fill: { type: 'solid', color: '#151515' } },
          bodyStyles: [{
            fill: { type: 'solid', color: '#fffdfa' },
            border: [null, null, { color: '#d8d2c4', style: 'solid', width: 1 }, null],
          }],
        },
      }],
    }
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    expect(built.warnings).toEqual([])
    const back = await loadPresentation(await engine.saveDeck(built.native))
    const tables = getSlideTables(getSlides(back)[0])
    expect(tables).toHaveLength(1)
    const first = getTableCell(tables[0], 0, 0)
    const middle = getTableCell(tables[0], 1, 0)
    const last = getTableCell(tables[0], 2, 0)
    expect(getTableCellFill(first)).toBe('#151515')
    expect(getTableCellFill(middle)).toBe('#FFFDFA')
    expect(getTableCellFill(last)).toBe('#FFFDFA')
    const borders = getTableCellBorders(back, last)
    expect(borders.top).toBeNull()
    expect(borders.left).toBeNull()
    expect(borders.right).toBeNull()
    expect(borders.bottom?.color).toBe('#D8D2C4')
  })

  it('rows 省略被合并覆盖的格：后续格按网格列落位', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [{
        elementId: 'merge-table',
        elementType: 'table',
        bounds: [70, 100, 300, 120],
        columnWidths: [0.34, 0.33, 0.33],
        rowHeights: [0.5, 0.5],
        rows: [
          [{ text: '跨两行', rowSpan: 2 }, { text: '横跨两列', colSpan: 2 }],
          [{ text: 'B2' }, { text: 'C2' }],
        ],
      }],
    }
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    expect(built.warnings).toEqual([])
    const back = await loadPresentation(await engine.saveDeck(built.native))
    const table = getSlideTables(getSlides(back)[0])[0]
    expect(getTableCellText(getTableCell(table, 0, 0))).toBe('跨两行')
    expect(getTableCellText(getTableCell(table, 0, 1))).toBe('横跨两列')
    expect(getTableCellText(getTableCell(table, 1, 1))).toBe('B2')
    expect(getTableCellText(getTableCell(table, 1, 2))).toBe('C2')
  })

  it('表格 rotation 被忽略：产物无 rot 属性，并给出告警', async () => {
    const engine = createOfficeKitEngine()
    const page: Page = {
      elements: [{
        elementId: 'rot-table',
        elementType: 'table',
        bounds: [70, 100, 300, 120],
        rotation: 15,
        columnWidths: [1],
        rowHeights: [1],
        rows: [[{ text: '旋转' }]],
      }],
    }
    const built = await engine.buildDeck({ deck: deck(), pages: [page] }, ctx())
    expect(built.warnings.some((w) => w.includes('已忽略 rotation'))).toBe(true)
    const back = await loadPresentation(await engine.saveDeck(built.native))
    const table = getSlideTables(getSlides(back)[0])[0]
    expect(getShapeXmlString(table)).not.toMatch(/\brot="/)
  })
})
