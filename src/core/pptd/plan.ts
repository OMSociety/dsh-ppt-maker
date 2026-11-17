/**
 * src/core/pptd/plan.ts — PPTD protocol: `schema` gate + brief.md / plan.yml.
 *
 * Schema gate (`validateDeckSchemaVersion`): a project stamps `schema: 2` on
 * deck.pptd; any deck without it is refused with `UnsupportedSchemaError` —
 * v1 decks are not opened by this tool layer (clean break, spec §2.0).
 *
 * brief.md (Markdown, agent-written, human-reviewable) and plan.yml (YAML,
 * machine-checked) are the planning contract: brief records purpose /
 * audience / core message; plan fixes the page list up front so the agent
 * thinks structure before decorating slides. Neither is required by schema,
 * but SKILL.md's generate workflow mandates them for non-trivial decks.
 */
import { Document, isScalar, parse as parseYaml, visit } from 'yaml'
import { ERROR_CODES, type Issue, type Presentation } from './schema.js'
import {
  SUPPORTED_SCHEMA_VERSIONS,
  SVG_MEDIA_DIR,
  SVG_PAGE_TYPE,
  type Brief,
  type Plan,
  type PlanPage
} from './schema-v2.js'

/** Same emitter conventions as parse.ts (plain style, numeric flow seqs). */
function stringifyYaml(value: unknown): string {
  const doc = new Document(value)
  visit(doc, {
    Seq: (_key, node) => {
      if (node.items.length > 0 && node.items.every((item) => isScalar(item) && typeof item.value === 'number')) {
        node.flow = true
      }
    }
  })
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false })
}

export function stringifyPlan(plan: Plan): string {
  return stringifyYaml(plan)
}

// Consumers of the plan layer work with these contract types — re-export so
// they never import schema-v2.js directly.
export type { Brief, Plan, PlanPage } from './schema-v2.js'

/* ------------------------------------------------------------------ *
 * Schema-version gate
 * ------------------------------------------------------------------ */

export function validateDeckSchemaVersion(deck: Record<string, unknown>, path = 'deck.pptd'): Issue[] {
  const raw = deck.schema
  if (raw === undefined || raw === null) {
    return [
      blockerLike(
        ERROR_CODES.UnsupportedSchemaError,
        '此工程缺少 `schema` 字段：工具链只打开 `schema: 2` 的 PPTD 工程；v1 工程请用 dsh-ppt-maker 1.x，或按 docs/pptd-spec.md §2.0 手动迁移',
        `${path}#schema`
      )
    ]
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return [
      blockerLike(ERROR_CODES.SchemaError, `schema 必须是整数（实际：${JSON.stringify(raw)}）`, `${path}#schema`, { actual: raw })
    ]
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.has(raw)) {
    return [
      blockerLike(
        ERROR_CODES.UnsupportedSchemaError,
        `schema 版本不受支持（实际：${raw}；本工具链支持：${[...SUPPORTED_SCHEMA_VERSIONS].join(', ')}）`,
        `${path}#schema`,
        { actual: raw, supported: [...SUPPORTED_SCHEMA_VERSIONS] }
      )
    ]
  }
  return []
}

/* ------------------------------------------------------------------ *
 * brief.md
 * ------------------------------------------------------------------ */

export const BRIEF_FILE = 'brief.md'

export function briefToMarkdown(brief: Brief, title?: string): string {
  const lines: string[] = [`# ${title?.trim() || '演示文稿简报'}`]
  const rows: Array<[string, string | undefined]> = [
    ['目的', brief.purpose],
    ['受众', brief.audience],
    ['核心信息', brief.coreMessage],
    ['语气', brief.tone],
    ['形态', brief.mode],
    ['页数', brief.pageCount !== undefined ? String(brief.pageCount) : undefined]
  ]
  for (const [k, v] of rows) if (v && v.length > 0) lines.push(`- **${k}**：${v}`)
  return `${lines.join('\n')}\n`
}

/** Tolerant reader: brief.md is prose-first; only the `- **k**：v` rows parse. */
export function briefFromMarkdown(text: string): Brief {
  const out: Brief = {}
  const map: Record<string, keyof Brief> = { 目的: 'purpose', 受众: 'audience', 核心信息: 'coreMessage', 语气: 'tone', 形态: 'mode' }
  for (const line of text.split(/\r?\n/)) {
    const m = /^-\s+\*\*([^*：:]+)\*\*\s*[：:]\s*(.+?)\s*$/.exec(line)
    if (!m) continue
    const key = map[m[1]]
    if (key === 'mode') out.mode = m[2] as Brief['mode']
    else if (key) (out as Record<string, unknown>)[key] = m[2]
    else if (m[1] === '页数') {
      const n = Number(m[2])
      if (Number.isFinite(n) && n > 0) out.pageCount = Math.round(n)
    }
  }
  return out
}

export function validateBrief(raw: unknown, path = BRIEF_FILE): Issue[] {
  const issues: Issue[] = []
  if (raw === undefined) return issues
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return [blockerLike(ERROR_CODES.SchemaError, 'brief 必须是映射对象', path)]
  }
  const b = raw as Record<string, unknown>
  for (const f of ['purpose', 'audience', 'coreMessage', 'tone'] as const) {
    if (b[f] !== undefined && typeof b[f] !== 'string') {
      issues.push(blockerLike(ERROR_CODES.SchemaError, `brief.${f} 必须是字符串`, `${path}#${f}`))
    }
  }
  if (b.mode !== undefined && b.mode !== 'deck' && b.mode !== 'poster' && b.mode !== 'infographic') {
    issues.push(blockerLike(ERROR_CODES.SchemaError, `brief.mode 取值必须是 deck / poster / infographic（实际：${JSON.stringify(b.mode)}）`, `${path}#mode`))
  }
  if (b.pageCount !== undefined && (typeof b.pageCount !== 'number' || !(b.pageCount > 0))) {
    issues.push(blockerLike(ERROR_CODES.SchemaError, 'brief.pageCount 必须是 > 0 的数', `${path}#pageCount`))
  }
  return issues
}

/* ------------------------------------------------------------------ *
 * plan.yml
 * ------------------------------------------------------------------ */

export const PLAN_FILE = 'plan.yml'

export function parsePlanText(text: string, path = PLAN_FILE): { plan: Plan | null; issues: Issue[] } {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (err) {
    return { plan: null, issues: [blockerLike(ERROR_CODES.SchemaError, `${PLAN_FILE} 不是合法 YAML：${(err as Error).message}`, path)] }
  }
  const issues = validatePlan(raw, path)
  return { plan: raw as Plan, issues }
}

export function validatePlan(raw: unknown, path = PLAN_FILE): Issue[] {
  const issues: Issue[] = []
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return [blockerLike(ERROR_CODES.SchemaError, `${PLAN_FILE} 顶层必须是映射对象`, path)]
  }
  const p = raw as Record<string, unknown>
  if (p.version !== undefined && p.version !== 1) {
    issues.push(blockerLike(ERROR_CODES.SchemaError, `plan.version 目前只支持 1（实际：${JSON.stringify(p.version)}）`, `${path}#version`))
  }
  if (p.status !== undefined && p.status !== 'draft' && p.status !== 'confirmed') {
    issues.push(blockerLike(ERROR_CODES.SchemaError, `plan.status 取值必须是 draft / confirmed（实际：${JSON.stringify(p.status)}）`, `${path}#status`))
  }
  if (!Array.isArray(p.pages) || p.pages.length === 0) {
    issues.push(blockerLike(ERROR_CODES.SchemaError, 'plan.pages 必填且至少一项', `${path}#pages`))
  } else {
    const seen = new Set<string>()
    ;(p.pages as unknown[]).forEach((entry, i) => {
      const at = `${path}#pages[${i}]`
      if (typeof entry === 'string') {
        issues.push(warningLike(ERROR_CODES.SchemaError, 'plan.pages 条目建议是映射对象（含 page/title/type），纯字符串仅作页路径解释', at))
        if (seen.has(entry)) issues.push(blockerLike(ERROR_CODES.SchemaError, `plan.pages 页路径重复：${entry}`, at))
        seen.add(entry)
        return
      }
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        issues.push(blockerLike(ERROR_CODES.SchemaError, 'plan.pages 条目必须是映射对象或页路径字符串', at))
        return
      }
      const pg = entry as Record<string, unknown>
      if (typeof pg.page !== 'string' || pg.page.length === 0) {
        issues.push(blockerLike(ERROR_CODES.SchemaError, 'plan.pages[].page 必填（页文件相对路径）', `${at}#page`))
      } else {
        if (seen.has(pg.page)) issues.push(blockerLike(ERROR_CODES.SchemaError, `plan.pages 页路径重复：${pg.page}`, `${at}#page`))
        seen.add(pg.page)
      }
      if (pg.type !== undefined && pg.type !== 'native' && pg.type !== SVG_PAGE_TYPE) {
        issues.push(
          blockerLike(ERROR_CODES.SchemaError, `plan.pages[].type 取值必须是 native / svg（实际：${JSON.stringify(pg.type)}）`, `${at}#type`)
        )
      }
      if (pg.type === SVG_PAGE_TYPE && (typeof pg.svgRef !== 'string' || pg.svgRef.length === 0)) {
        issues.push(blockerLike(ERROR_CODES.SchemaError, `type: svg 的页必须给 svgRef（${SVG_MEDIA_DIR}/<file>.svg）`, `${at}#svgRef`))
      }
      if (pg.type !== SVG_PAGE_TYPE && pg.svgRef !== undefined) {
        issues.push(blockerLike(ERROR_CODES.SchemaError, '只有 type: svg 的页才能带 svgRef', `${at}#svgRef`))
      }
      if (pg.title !== undefined && typeof pg.title !== 'string') issues.push(blockerLike(ERROR_CODES.SchemaError, 'plan.pages[].title 必须是字符串', `${at}#title`))
    })
  }
  return issues
}

/** Cross-check plan page paths against `deck.pages`; mismatch is a warning, not a blocker. */
export function crossCheckPlan(plan: Plan, deck: Presentation, path = PLAN_FILE): Issue[] {
  const issues: Issue[] = []
  const deckPages = new Set(deck.pages)
  const planned = new Set(plan.pages.map((p: PlanPage | string) => (typeof p === 'string' ? p : p.page)))
  for (const p of planned) {
    if (!deckPages.has(p)) {
      issues.push(warningLike(ERROR_CODES.SchemaError, `plan 声明的页 ${p} 不在 deck.pages 中（计划领先于执行，属常态；若已废弃请从 plan 删除）`, `${path}#pages`))
    }
  }
  for (const p of deck.pages) {
    if (!planned.has(p)) {
      issues.push(warningLike(ERROR_CODES.SchemaError, `deck.pages 中的页 ${p} 未列入 plan（请先 update_plan 再动手做页）`, `${path}#pages`))
    }
  }
  return issues
}

/* ------------------------------------------------------------------ *
 * helpers (local mirrors of parse.ts's private constructors)
 * ------------------------------------------------------------------ */

function blockerLike(code: string, message: string, path?: string, detail?: Record<string, unknown>): Issue {
  return { code, level: 'blocker', message, ...(path ? { path } : {}), ...(detail ? { detail } : {}) }
}
function warningLike(code: string, message: string, path?: string, detail?: Record<string, unknown>): Issue {
  return { code, level: 'warning', message, ...(path ? { path } : {}), ...(detail ? { detail } : {}) }
}
