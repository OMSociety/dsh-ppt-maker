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

const FILL_TYPES = new Set(['solid', 'gradient', 'image'])

/**
 * Element-level `fill` is a Fill object (spec §5: SolidFill | GradientFill | ImageFill).
 * Chart elements are skipped: their series-level fill is a Color.
 */
function fillIssues(fill: unknown, path: string): Issue[] {
  if (fill === undefined) return []
  const where = `${path}#fill`
  if (!isRecord(fill) || typeof fill.type !== 'string' || !FILL_TYPES.has(fill.type)) {
    const hint = typeof fill === 'string' ? `（写成 {type: "solid", color: ${JSON.stringify(fill)}}）` : ''
    return [blocker(ERROR_CODES.SchemaError, `fill 须为对象且 type 为 solid / gradient / image${hint}`, where)]
  }
  if (fill.type === 'solid' && !nonEmptyString(fill.color)) {
    return [blocker(ERROR_CODES.SchemaError, 'solid 填充必须有 color', where)]
  }
  if (fill.type === 'gradient' && (!Array.isArray(fill.stops) || fill.stops.length < 2)) {
    return [blocker(ERROR_CODES.SchemaError, 'gradient 填充至少需要 2 个 stops', where)]
  }
  if (fill.type === 'image' && !nonEmptyString(fill.src)) {
    return [blocker(ERROR_CODES.SchemaError, 'image 填充必须有 src', where)]
  }
  return []
}

/** Required fields per elementType. Unknown types are reported by parse.ts. */
export function validateElementFields(element: Record<string, unknown>, path: string): Issue[] {
  const issues: Issue[] = []
  if (element.elementType !== 'chart') issues.push(...fillIssues(element.fill, path))
  const border = element.border
  if (isRecord(border) && border.gradient !== undefined) {
    const g = border.gradient
    if (!isRecord(g) || g.type !== 'gradient' || !Array.isArray(g.stops) || g.stops.length < 2) {
      issues.push(blocker(ERROR_CODES.SchemaError, 'border.gradient 须为 GradientFill（type: gradient，至少 2 个 stops）', `${path}#border.gradient`))
    }
  }
  if (element.group !== undefined) {
    const g = element.group
    if (!Array.isArray(g) || g.length === 0 || g.some((id) => typeof id !== 'string' || id === '')) {
      issues.push(blocker(ERROR_CODES.SchemaError, 'group 须为非空字符串数组（外层组合在前）', `${path}#group`))
    }
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
