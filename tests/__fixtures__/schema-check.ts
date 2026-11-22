/**
 * 工具结果按 output.schema 做值级校验（测试用）。
 *
 * 覆盖宿主 output.schema 允许的关键词子集：type / properties / required / items /
 * enum / const / oneOf / additionalProperties。返回违规路径列表，空数组即通过。
 * 失败信封（ok:false）只校验 ok 与 error 两个字段：成功字段在失败时缺席是契约内行为。
 */

type Json = Record<string, unknown>

function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  return typeof value
}

function typeMatches(expected: unknown, value: unknown): boolean {
  const actual = typeOf(value)
  const list = Array.isArray(expected) ? expected : [expected]
  return list.some((t) => t === actual || (t === 'number' && actual === 'integer'))
}

export function schemaViolations(value: unknown, schema: unknown, at = '$'): string[] {
  if (typeof schema !== 'object' || schema === null) return []
  const s = schema as Json
  const out: string[] = []
  if (Array.isArray(s.oneOf)) {
    const passing = s.oneOf.filter((branch) => schemaViolations(value, branch, at).length === 0)
    if (passing.length !== 1) out.push(`${at}: oneOf 命中 ${passing.length} 个分支`)
    return out
  }
  if (s.type !== undefined && !typeMatches(s.type, value)) {
    return [`${at}: 期望 ${JSON.stringify(s.type)}，实际 ${typeOf(value)}`]
  }
  if (s.const !== undefined && JSON.stringify(value) !== JSON.stringify(s.const)) out.push(`${at}: 期望常量 ${JSON.stringify(s.const)}`)
  if (Array.isArray(s.enum) && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    out.push(`${at}: 不在 enum ${JSON.stringify(s.enum)}`)
  }
  if (typeOf(value) === 'object') {
    const obj = value as Json
    const props = (s.properties ?? {}) as Json
    for (const key of (s.required as string[] | undefined) ?? []) {
      if (!(key in obj) || obj[key] === undefined) out.push(`${at}.${key}: 必填字段缺失`)
    }
    for (const [key, v] of Object.entries(obj)) {
      if (v === undefined) continue
      if (key in props) out.push(...schemaViolations(v, props[key], `${at}.${key}`))
      else if (s.additionalProperties === false) out.push(`${at}.${key}: schema 未声明该字段`)
      else if (typeof s.additionalProperties === 'object') out.push(...schemaViolations(v, s.additionalProperties, `${at}.${key}`))
    }
  }
  if (Array.isArray(value) && s.items !== undefined) {
    value.forEach((item, i) => out.push(...schemaViolations(item, s.items, `${at}[${i}]`)))
  }
  return out
}

/** 工具结果的校验入口：成功信封全量校验；失败信封只看 ok/error。 */
export function resultViolations(result: unknown, schema: unknown): string[] {
  if (typeof result === 'object' && result !== null && (result as Json).ok === false) {
    const r = result as Json
    const error = r.error as Json | undefined
    const out: string[] = []
    if (typeof error !== 'object' || error === null) out.push('$.error: 失败信封缺 error 对象')
    else {
      if (typeof error.code !== 'string') out.push('$.error.code: 必须是字符串')
      if (typeof error.message !== 'string') out.push('$.error.message: 必须是字符串')
    }
    return out
  }
  return schemaViolations(result, schema)
}

/**
 * schema 声明了但真实成功返回从未出现过的顶层字段（跨多次调用累计）。
 * 用来抓「schema 宣称有、实现早已不返回」的漂移。
 */
export function neverReturnedFields(schema: unknown, successes: unknown[]): string[] {
  const props = Object.keys(((schema as Json | null)?.properties ?? {}) as Json)
  const seen = new Set<string>()
  for (const r of successes) {
    for (const [k, v] of Object.entries((r ?? {}) as Json)) if (v !== undefined) seen.add(k)
  }
  return props.filter((p) => !seen.has(p))
}
