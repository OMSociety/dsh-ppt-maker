/**
 * Per-type required fields (spec §6) and chart data integrity (spec §11.6).
 * Element-base checks (elementId / elementType / bounds) live in parse.ts.
 */
import { ERROR_CODES, type Issue } from './schema.js'

function blocker(code: string, message: string, path: string, detail?: Record<string, unknown>): Issue {
  return { code, level: 'blocker', message, path, ...(detail === undefined ? {} : { detail }) }
}

function warning(code: string, message: string, path: string, detail?: Record<string, unknown>): Issue {
  return { code, level: 'warning', message, path, ...(detail === undefined ? {} : { detail }) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'number' && Number.isFinite(v))
}

const RATIO_TOLERANCE = 0.01

function ratioIssues(field: string, value: unknown, path: string): Issue[] {
  if (!isNumberArray(value)) {
    return [blocker(ERROR_CODES.SchemaError, `table.${field} 必填，且为非空数字数组`, `${path}#${field}`)]
  }
  const sum = value.reduce((a, b) => a + b, 0)
  if (value.some((v) => v < 0 || v > 1) || Math.abs(sum - 1) > RATIO_TOLERANCE) {
    return [
      blocker(ERROR_CODES.SchemaError, `table.${field} 各项须在 [0, 1] 内且和为 1（当前和 ${sum.toFixed(3)}）`, `${path}#${field}`, {
        actual: value
      })
    ]
  }
  return []
}

const FILL_TYPES = new Set(['solid', 'gradient', 'pattern', 'image'])

/** ECMA-376 ST_PresetPatternVal tokens accepted by PatternFill.preset (spec §5). */
export const PATTERN_PRESETS: ReadonlySet<string> = new Set([
  'pct5', 'pct10', 'pct20', 'pct25', 'pct30', 'pct40', 'pct50', 'pct60', 'pct70', 'pct75', 'pct80', 'pct90',
  'horz', 'vert', 'ltHorz', 'ltVert', 'dkHorz', 'dkVert', 'narHorz', 'narVert', 'dashHorz', 'dashVert',
  'cross', 'dnDiag', 'upDiag', 'ltDnDiag', 'ltUpDiag', 'dkDnDiag', 'dkUpDiag', 'wdDnDiag', 'wdUpDiag',
  'dashDnDiag', 'dashUpDiag', 'diagCross', 'smCheck', 'lgCheck', 'smGrid', 'lgGrid', 'dotGrid',
  'smConfetti', 'lgConfetti', 'horzBrick', 'diagBrick', 'solidDmnd', 'openDmnd', 'dotDmnd', 'plaid',
  'sphere', 'weave', 'divot', 'shingle', 'wave', 'trellis', 'zigZag'
])

/**
 * Element-level `fill` and page `background` are Fill objects
 * (spec §5: SolidFill | GradientFill | PatternFill | ImageFill).
 * A chart element's `fill` paints the chart container; series fills are checked in validateChartData.
 */
function fillIssues(fill: unknown, path: string): Issue[] {
  if (fill === undefined) return []
  const where = `${path}#fill`
  if (!isRecord(fill) || typeof fill.type !== 'string' || !FILL_TYPES.has(fill.type)) {
    const hint = typeof fill === 'string' ? `（写成 {type: "solid", color: ${JSON.stringify(fill)}}）` : ''
    return [blocker(ERROR_CODES.SchemaError, `fill 须为对象且 type 为 solid / gradient / pattern / image${hint}`, where)]
  }
  if (fill.type === 'solid' && !nonEmptyString(fill.color)) {
    return [blocker(ERROR_CODES.SchemaError, 'solid 填充必须有 color', where)]
  }
  if (fill.type === 'gradient' && (!Array.isArray(fill.stops) || fill.stops.length < 2)) {
    return [blocker(ERROR_CODES.SchemaError, 'gradient 填充至少需要 2 个 stops', where)]
  }
  if (fill.type === 'pattern') {
    if (typeof fill.preset !== 'string' || !PATTERN_PRESETS.has(fill.preset)) {
      return [blocker(ERROR_CODES.SchemaError, `pattern 填充的 preset 须为 OOXML 预设图案（如 pct50、dkUpDiag、smGrid），收到 ${JSON.stringify(fill.preset)}`, where)]
    }
    if (!nonEmptyString(fill.foreground) || !nonEmptyString(fill.background)) {
      return [blocker(ERROR_CODES.SchemaError, 'pattern 填充必须有 foreground 与 background 颜色', where)]
    }
  }
  if (fill.type === 'image' && !nonEmptyString(fill.src)) {
    return [blocker(ERROR_CODES.SchemaError, 'image 填充必须有 src', where)]
  }
  return []
}

/** Required fields per elementType. Unknown types are reported by parse.ts. */
export function validateElementFields(element: Record<string, unknown>, path: string): Issue[] {
  const issues: Issue[] = []
  issues.push(...fillIssues(element.fill, path))
  const border = element.border
  if (isRecord(border) && border.gradient !== undefined) {
    const g = border.gradient
    if (!isRecord(g) || g.type !== 'gradient' || !Array.isArray(g.stops) || g.stops.length < 2) {
      issues.push(blocker(ERROR_CODES.SchemaError, 'border.gradient 须为 GradientFill（type: gradient，至少 2 个 stops）', `${path}#border.gradient`))
    }
  }
  const content = element.content
  if (isRecord(content) && content.gradient !== undefined) {
    const g = content.gradient
    if (!isRecord(g) || g.type !== 'gradient' || !Array.isArray(g.stops) || g.stops.length < 2) {
      issues.push(blocker(ERROR_CODES.SchemaError, 'content.gradient 须为 GradientFill（type: gradient，至少 2 个 stops）', `${path}#content.gradient`))
    }
  }
  if (isRecord(content) && content.outline !== undefined) {
    const o = content.outline
    if (!isRecord(o) || typeof o.width !== 'number' || !(o.width > 0) || typeof o.color !== 'string' || o.color === '') {
      issues.push(blocker(ERROR_CODES.SchemaError, 'content.outline 须为 { width: 正数（px）, color }', `${path}#content.outline`))
    }
  }
  if (element.group !== undefined) {
    const g = element.group
    if (!Array.isArray(g) || g.length === 0 || g.some((id) => typeof id !== 'string' || id === '')) {
      issues.push(blocker(ERROR_CODES.SchemaError, 'group 须为非空字符串数组（外层组合在前）', `${path}#group`))
    }
  }
  if (element.elementType === 'placeholder' && element.preview !== undefined && !nonEmptyString(element.preview)) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'placeholder.preview 须为非空的工程内路径', `${path}#preview`))
  }
  switch (element.elementType) {
    case 'text': {
      const content = element.content
      if (!isRecord(content) || typeof content.text !== 'string') {
        issues.push(blocker(ERROR_CODES.SchemaError, 'text 元素必须有 content.text（字符串）', `${path}#content`))
      }
      if (isRecord(content) && content.padding !== undefined) {
        const pad = content.padding
        const ok = Array.isArray(pad) && pad.length === 4 && pad.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0)
        if (!ok) {
          issues.push(
            blocker(ERROR_CODES.SchemaError, 'content.padding 须为 4 个非负数 [上, 右, 下, 左]（px）', `${path}#content.padding`)
          )
        }
      }
      break
    }
    case 'shape':
      if (!nonEmptyString(element.shapeName)) {
        issues.push(blocker(ERROR_CODES.SchemaError, 'shape 元素必须有 shapeName（矩形写 "rect"）', `${path}#shapeName`))
      } else if (element.shapeName === 'custom' && (!Array.isArray(element.viewBox) || !nonEmptyString(element.path))) {
        issues.push(blocker(ERROR_CODES.SchemaError, 'shapeName: custom 必须同时给出 viewBox 与 path', `${path}#path`))
      }
      break
    case 'line': {
      const viewBox = element.viewBox
      if (!Array.isArray(viewBox) || viewBox.length !== 2 || !viewBox.every((v) => typeof v === 'number' && v > 0)) {
        issues.push(blocker(ERROR_CODES.SchemaError, 'line 元素必须有 viewBox（[宽, 高]，均为正数）', `${path}#viewBox`))
      }
      const points = typeof element.points === 'string' ? element.points.trim().split(/\s+/).filter(Boolean) : []
      const valid = points.every((pair) => {
        const xy = pair.split(',').map(Number)
        return xy.length === 2 && xy.every(Number.isFinite)
      })
      if (points.length < 2 || !valid) {
        issues.push(blocker(ERROR_CODES.SchemaError, 'line 元素必须有 points（"x1,y1 x2,y2 ..."，至少 2 个点）', `${path}#points`))
      }
      break
    }
    case 'image':
      if (!nonEmptyString(element.src)) {
        issues.push(blocker(ERROR_CODES.SchemaError, 'image 元素必须有 src', `${path}#src`))
      }
      break
    case 'icon':
      if (!nonEmptyString(element.iconName) || !/^[a-z]+:[\w-]+$/.test(element.iconName)) {
        issues.push(blocker(ERROR_CODES.SchemaError, 'icon 元素必须有 iconName（"style:name"，如 "fas:house"）', `${path}#iconName`))
      }
      break
    case 'table': {
      issues.push(...ratioIssues('columnWidths', element.columnWidths, path))
      issues.push(...ratioIssues('rowHeights', element.rowHeights, path))
      const rows = element.rows
      if (!Array.isArray(rows) || rows.length === 0 || !rows.every(Array.isArray)) {
        issues.push(blocker(ERROR_CODES.SchemaError, 'table.rows 必填，且为单元格二维数组', `${path}#rows`))
      } else if (Array.isArray(element.rowHeights) && element.rowHeights.length !== rows.length) {
        issues.push(
          blocker(ERROR_CODES.SchemaError, `table.rows 行数 ${rows.length} 与 rowHeights 项数 ${element.rowHeights.length} 不一致`, `${path}#rows`)
        )
      }
      break
    }
    case 'chart':
      issues.push(...validateChartData(element, path))
      break
    default:
      break
  }
  return issues
}

/* ------------------------------------------------------------------ *
 * Chart data integrity (spec §11.6)
 * ------------------------------------------------------------------ */

const NUMERIC_CHANNELS = new Set(['y', 'value', 'open', 'high', 'low', 'close', 'size', 'flow'])

const DATA_LABEL_CONTENT: Record<string, readonly string[]> = {
  pie: ['value', 'percentage', 'category'],
  radar: ['value'],
  waterfall: ['value', 'category'],
  treemap: ['value', 'category'],
  sunburst: ['value', 'category'],
  sankey: ['value', 'category']
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function validateChartData(element: Record<string, unknown>, path: string): Issue[] {
  const issues: Issue[] = []
  const data = element.data
  if (!isRecord(data) || !Array.isArray(data.cols) || !Array.isArray(data.rows)) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'chart 元素必须有 data（{ cols, rows }）', `${path}#data`))
    return issues
  }
  const series = element.series
  if (!Array.isArray(series) || series.length === 0) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'chart.series 必填，且至少 1 个系列', `${path}#series`))
  }
  if (element.plotLayout !== undefined) {
    const layout = element.plotLayout
    const frac = (v: unknown, min: number): boolean => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= 1
    const ok =
      isRecord(layout) &&
      frac(layout.x, 0) && frac(layout.y, 0) && frac(layout.w, Number.MIN_VALUE) && frac(layout.h, Number.MIN_VALUE) &&
      (layout.target === undefined || layout.target === 'inner' || layout.target === 'outer')
    if (!ok) {
      issues.push(blocker(ERROR_CODES.SchemaError, 'chart.plotLayout 须为 { x, y, w, h }（0..1 的比例，w / h > 0），target 可选 inner 或 outer', `${path}#plotLayout`))
    }
  }

  const cols = data.cols as unknown[]
  const seen = new Set<string>()
  cols.forEach((col, i) => {
    if (typeof col !== 'string' || col.trim() === '') {
      issues.push(blocker(ERROR_CODES.EmptyColumnError, `data.cols[${i}] 为空列名`, `${path}#data.cols[${i}]`))
    } else if (seen.has(col)) {
      issues.push(blocker(ERROR_CODES.DuplicateColumnError, `data.cols 中列名 "${col}" 重复`, `${path}#data.cols[${i}]`))
    } else {
      seen.add(col)
    }
  })
  const rows = data.rows as unknown[]
  rows.forEach((row, i) => {
    if (!Array.isArray(row) || row.length !== cols.length) {
      issues.push(
        blocker(ERROR_CODES.RowLengthError, `data.rows[${i}] 长度应为 ${cols.length}`, `${path}#data.rows[${i}]`, {
          actual: Array.isArray(row) ? row.length : null
        })
      )
    }
  })
  if (!Array.isArray(series)) return issues

  const columnIndex = (name: string): number => cols.indexOf(name)
  const columnValues = (name: string): unknown[] => {
    const idx = columnIndex(name)
    return idx < 0 ? [] : rows.map((row) => (Array.isArray(row) ? row[idx] : undefined))
  }
  const yAxis = isRecord(element.yAxis) ? element.yAxis : undefined
  const horizontal = yAxis?.type === 'category'
  const stackModes = new Map<string, Set<string>>()
  const radarCategories = new Set<string>()

  series.forEach((raw, s) => {
    const sp = `${path}#series[${s}]`
    if (!isRecord(raw)) {
      issues.push(blocker(ERROR_CODES.SchemaError, '系列必须是映射对象', sp))
      return
    }
    const type = typeof raw.type === 'string' ? raw.type : ''
    const encode = raw.encode
    if (!isRecord(encode)) {
      issues.push(blocker(ERROR_CODES.SchemaError, '系列必须有 encode', `${sp}.encode`))
      return
    }
    for (const [channel, column] of Object.entries(encode)) {
      if (typeof column !== 'string') continue
      if (columnIndex(column) < 0) {
        issues.push(blocker(ERROR_CODES.UnknownColumnError, `encode.${channel} 引用的列 "${column}" 不在 data.cols 中`, `${sp}.encode.${channel}`))
        continue
      }
      let numeric = NUMERIC_CHANNELS.has(channel)
      if ((type === 'bar' || type === 'waterfall') && horizontal) numeric = channel === 'x'
      if ((type === 'scatter' || type === 'bubble') && channel === 'x') numeric = true
      if (type === 'heatmap' && (channel === 'x' || channel === 'y')) numeric = false
      if (!numeric) continue
      const bad = columnValues(column).findIndex((v) => v !== null && v !== undefined && toNumber(v) === null)
      if (bad >= 0) {
        issues.push(
          blocker(ERROR_CODES.NonNumericValueError, `数值通道 encode.${channel} 的列 "${column}" 第 ${bad + 1} 行无法解析为数字`, `${sp}.encode.${channel}`)
        )
      }
    }
    if (typeof raw.stack === 'string') {
      const modes = stackModes.get(type) ?? new Set<string>()
      modes.add(raw.stack)
      stackModes.set(type, modes)
    }
    if (type === 'radar' && typeof encode.category === 'string') radarCategories.add(encode.category)
    const labels = raw.dataLabels
    const allowedContent = DATA_LABEL_CONTENT[type]
    if (isRecord(labels) && labels.content !== undefined && allowedContent && !allowedContent.includes(String(labels.content))) {
      issues.push(
        blocker(ERROR_CODES.InvalidValueError, `${type} 的 dataLabels.content 只能取 ${allowedContent.join(' / ')}`, `${sp}.dataLabels.content`)
      )
    }
    issues.push(...seriesPaintIssues(raw, type, sp))
    issues.push(...dataLabelPointIssues(labels, sp))
    if (type === 'waterfall') issues.push(...waterfallIssues(encode, columnValues, sp))
    if (type === 'sankey') issues.push(...sankeyIssues(encode, columnValues, sp))
  })

  for (const [type, modes] of stackModes) {
    if (modes.size > 1) {
      issues.push(
        blocker(ERROR_CODES.StackModeMismatchError, `同一图表内 ${type} 系列的 stack 取值不一致（${[...modes].join(' / ')}）`, `${path}#series`)
      )
    }
  }
  if (radarCategories.size > 1) {
    issues.push(blocker(ERROR_CODES.SchemaError, '同一图表内所有 radar 系列必须引用同一个 encode.category 列', `${path}#series`))
  }
  return issues
}

/** Series fills that may be a pattern: bar / area / pie (pie also as an array). */
function seriesPaintIssues(raw: Record<string, unknown>, type: string, sp: string): Issue[] {
  const fields = type === 'bar' ? ['fill'] : type === 'area' ? ['areaColor'] : type === 'pie' ? ['fill'] : []
  const issues: Issue[] = []
  for (const key of fields) {
    const value = raw[key]
    const items = type === 'pie' && Array.isArray(value) ? value : [value]
    items.forEach((item, i) => {
      if (isRecord(item) && item.type === 'pattern') {
        const where = Array.isArray(value) ? `${sp}.${key}[${i}]` : `${sp}.${key}`
        const bad = fillIssues(item, where)
        issues.push(...bad.map((issue) => ({ ...issue, path: where })))
      }
    })
  }
  return issues
}

/** dataLabels.points: sparse array of { show, offset{x,y}, fontSize, color, bold } | null. */
function dataLabelPointIssues(labels: unknown, sp: string): Issue[] {
  if (!isRecord(labels) || labels.points === undefined) return []
  const where = `${sp}.dataLabels.points`
  if (!Array.isArray(labels.points)) {
    return [blocker(ERROR_CODES.SchemaError, 'dataLabels.points 须为数组（null 槽沿用系列级设置）', where)]
  }
  const issues: Issue[] = []
  labels.points.forEach((point, i) => {
    if (point === null) return
    const at = `${where}[${i}]`
    const finite = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v)
    const ok =
      isRecord(point) &&
      (point.show === undefined || typeof point.show === 'boolean') &&
      (point.bold === undefined || typeof point.bold === 'boolean') &&
      (point.fontSize === undefined || (finite(point.fontSize) && (point.fontSize as number) > 0)) &&
      (point.color === undefined || nonEmptyString(point.color)) &&
      (point.offset === undefined || (isRecord(point.offset) && finite(point.offset.x) && finite(point.offset.y))) &&
      (point.size === undefined ||
        (isRecord(point.size) && finite(point.size.w) && (point.size.w as number) > 0 && finite(point.size.h) && (point.size.h as number) > 0))
    if (!ok) {
      issues.push(blocker(ERROR_CODES.SchemaError, 'dataLabels.points 的元素须为 null 或 { show?: boolean, offset?: { x, y }, size?: { w, h }, fontSize?: 正数, color?: Color, bold?: boolean }', at))
    }
  })
  return issues
}

function waterfallIssues(encode: Record<string, unknown>, columnValues: (name: string) => unknown[], sp: string): Issue[] {
  if (typeof encode.isTotal !== 'string' || typeof encode.y !== 'string') return []
  const totals = columnValues(encode.isTotal)
  const ys = columnValues(encode.y).map(toNumber)
  const issues: Issue[] = []
  let running: number | null = null
  totals.forEach((flag, i) => {
    if (flag !== true && flag !== false && flag !== null && flag !== undefined) {
      issues.push(blocker(ERROR_CODES.InvalidValueError, `isTotal 列第 ${i + 1} 行只能是 true / false / null`, `${sp}.encode.isTotal`))
      return
    }
    const y = ys[i]
    if (flag === true) {
      if (running !== null && y !== null && Math.abs(running - y) > 1e-6) {
        issues.push(
          warning(ERROR_CODES.WaterfallTotalMismatchWarning, `第 ${i + 1} 行总计柱 ${y} ≠ 累计值 ${running}`, `${sp}.encode.y`, { expected: running, actual: y })
        )
      }
      running = y
    } else if (y !== null) {
      running = (running ?? 0) + y
    }
  })
  return issues
}

function sankeyIssues(encode: Record<string, unknown>, columnValues: (name: string) => unknown[], sp: string): Issue[] {
  if (typeof encode.source !== 'string' || typeof encode.target !== 'string') return []
  const sources = columnValues(encode.source)
  const targets = columnValues(encode.target)
  const edges = new Map<string, Set<string>>()
  sources.forEach((source, i) => {
    const target = targets[i]
    if (source === null || source === undefined || target === null || target === undefined) return
    const from = String(source)
    const next = edges.get(from) ?? new Set<string>()
    next.add(String(target))
    edges.set(from, next)
  })
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (node: string): boolean => {
    const mark = state.get(node)
    if (mark === 'visiting') return true
    if (mark === 'done') return false
    state.set(node, 'visiting')
    for (const next of edges.get(node) ?? []) if (visit(next)) return true
    state.set(node, 'done')
    return false
  }
  for (const node of edges.keys()) {
    if (visit(node)) {
      return [blocker(ERROR_CODES.CyclicGraphError, 'sankey 的 source/target 构成环（须为有向无环图）', `${sp}.encode`)]
    }
  }
  return []
}
