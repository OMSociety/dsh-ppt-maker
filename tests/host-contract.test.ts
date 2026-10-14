/**
 * 宿主注册契约严格桩。
 *
 * 这里不模拟「一个能装东西的 tools.register」，而是照抄宿主真实实现的两道
 * 校验，让任何一次契约漂移在 CI 里当场变成红，而不是等到用户重启宿主后
 * 看见「技能注册成功、工具一个都没有」。
 *
 * 校验来源（宿主 app.asar 内 @deepseek-ai/dsh-tools/lib/index.js）：
 *   - register()：`tool "X" must declare output { schema, render, presentationMeta? }`
 *     然后 `assertSupportedJsonSchema(output.schema)`（index.js:2881-2882）。
 *   - 关键词子集：CONSTRAINT_KEYWORDS / ANNOTATION_KEYWORDS（index.js:34-49），
 *     越界关键词报 `is not a supported keyword`（index.js:206）。
 *   - `schema must be a schema object`（index.js:184）、`cannot declare both type
 *     and oneOf`（index.js:213）、`oneOf ... at least two`（index.js:227）、
 *     `required must be an array of strings`（index.js:155）、`required names "x"
 *     which is not in properties`（index.js:158）、`additionalProperties must be a
 *     boolean`（index.js:160）。
 *   - createSuccessResult()：先按 output.schema 校验值，再 `output.render(args,
 *     value)`，返回值经 snapshotProjection 要求 lossless JSON（index.js:3543-3552）。
 *     官方 dsh-tool-calculator 是 `render: (_args, value) => [{ type: 'text', text }]`。
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.js'
import type { ToolDef } from '../src/tools/shared.js'

const CONSTRAINT_KEYWORDS = new Set([
  'type',
  'oneOf',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const'
])
const ANNOTATION_KEYWORDS = new Set(['description', 'title', 'default', 'examples'])
const SCHEMA_TYPES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'])
const ONE_OF_SIBLING_KEYWORDS = ['properties', 'required', 'additionalProperties', 'items', 'enum', 'const']

interface Json {
  [key: string]: unknown
}

function isPlainRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 宿主 checkSchemaNode 的忠实移植（保留违规文案，便于比对）。 */
function collectViolations(root: unknown): string[] {
  const violations: string[] = []
  const tasks: Array<{ kind: 'enter' | 'leave' | 'one-of-tail' | 'object-tail'; node: unknown; path: string; properties?: Json }> = [
    { kind: 'enter', node: root, path: 'schema' }
  ]
  const seen = new Set<unknown>()

  while (tasks.length > 0) {
    const task = tasks.pop()!
    if (task.kind === 'leave') {
      seen.delete(task.node)
      continue
    }
    if (task.kind === 'one-of-tail') {
      for (const key of ONE_OF_SIBLING_KEYWORDS) {
        if (Object.hasOwn(task.node as Json, key)) violations.push(`${task.path}.${key} is not supported beside oneOf`)
      }
      continue
    }
    if (task.kind === 'object-tail') {
      const node = task.node as Json
      const hasRequired = Object.hasOwn(node, 'required')
      if (hasRequired) {
        const required = node.required
        if (!Array.isArray(required) || required.some((entry) => typeof entry !== 'string')) {
          violations.push(`${task.path}.required must be an array of strings`)
        } else {
          const declared = isPlainRecord(node.properties) ? node.properties : {}
          for (const key of required) {
            if (!Object.hasOwn(declared, key)) violations.push(`${task.path}.required names "${key}" which is not in properties`)
          }
        }
      }
      if (Object.hasOwn(node, 'additionalProperties') && typeof node.additionalProperties !== 'boolean') {
        violations.push(`${task.path}.additionalProperties must be a boolean`)
      }
      continue
    }

    const { path: nodePath } = task
    if (!isPlainRecord(task.node)) {
      violations.push(`${nodePath} must be a schema object`)
      continue
    }
    const node = task.node
    if (seen.has(node)) {
      violations.push(`${nodePath} is circular`)
      continue
    }
    seen.add(node)
    tasks.push({ kind: 'leave', node, path: nodePath })

    for (const key of Object.keys(node)) {
      if (CONSTRAINT_KEYWORDS.has(key)) continue
      if (ANNOTATION_KEYWORDS.has(key)) continue
      violations.push(
        `${nodePath}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`
      )
    }
    if (Object.hasOwn(node, 'description') && typeof node.description !== 'string') violations.push(`${nodePath}.description must be a string`)
    if (Object.hasOwn(node, 'title') && typeof node.title !== 'string') violations.push(`${nodePath}.title must be a string`)

    const hasType = Object.hasOwn(node, 'type')
    const hasOneOf = Object.hasOwn(node, 'oneOf')
    if (hasType && hasOneOf) {
      violations.push(`${nodePath} cannot declare both type and oneOf`)
      continue
    }
    if (!hasType && !hasOneOf) {
      for (const key of ONE_OF_SIBLING_KEYWORDS) {
        if (Object.hasOwn(node, key)) violations.push(`${nodePath}.${key} requires type or oneOf`)
      }
      continue
    }
    if (hasOneOf) {
      tasks.push({ kind: 'one-of-tail', node, path: nodePath })
      const oneOf = node.oneOf
      if (!Array.isArray(oneOf) || oneOf.length < 2) violations.push(`${nodePath}.oneOf must be an array of at least two schemas`)
      else {
        for (let index = oneOf.length - 1; index >= 0; index--) {
          tasks.push({ kind: 'enter', node: oneOf[index], path: `${nodePath}.oneOf[${index}]` })
        }
      }
      continue
    }

    const type = node.type
    if (typeof type !== 'string' || !SCHEMA_TYPES.has(type)) {
      violations.push(`${nodePath}.type must be one of ${[...SCHEMA_TYPES].join('/')}`)
      continue
    }
    if (type === 'object') {
      const properties = node.properties
      if (properties !== undefined && !isPlainRecord(properties)) violations.push(`${nodePath}.properties must be a schema object map`)
      tasks.push({ kind: 'object-tail', node, path: nodePath, properties: isPlainRecord(properties) ? properties : {} })
      if (isPlainRecord(properties)) {
        for (const [name, child] of Object.entries(properties)) {
          tasks.push({ kind: 'enter', node: child, path: `${nodePath}.properties.${name}` })
        }
      }
      continue
    }
    if (type === 'array') {
      if (!Object.hasOwn(node, 'items')) violations.push(`${nodePath}.items is required for type array`)
      else tasks.push({ kind: 'enter', node: node.items, path: `${nodePath}.items` })
    }
  }
  return violations
}

/** 宿主 assertSupportedJsonSchema 的抛错形态。 */
function assertSupportedJsonSchema(schema: unknown): void {
  const violations = collectViolations(schema)
  if (violations.length > 0) throw new Error(`unsupported JSON schema: ${violations.join('; ')}`)
}

/** 宿主 register() 的第一道校验。 */
function assertRegistrable(def: ToolDef): void {
  const output = (def as { output?: { schema?: unknown; render?: unknown } }).output
  if (output === undefined || typeof output !== 'object' || typeof output.render !== 'function' || output.schema === undefined) {
    throw new TypeError(`tool "${def.name}" must declare output { schema, render, presentationMeta? }`)
  }
  assertSupportedJsonSchema(output.schema)
}

/** 宿主对每个成功结果做的事：按 schema 校验值 + render 必须回 lossless JSON。 */
function assertRenderable(def: ToolDef, value: unknown): unknown {
  const output = def.output as { render: (args: unknown, result: never) => unknown }
  const rendered = output.render({}, value as never)
  if (rendered === undefined) throw new Error('render returned non-lossless JSON')
  JSON.stringify(rendered)
  return rendered
}

let cwd: string
let defs: Map<string, ToolDef>
let registered: string[]

function strictCtx(cwdDir: string) {
  defs = new Map()
  registered = []
  const handlers = new Map<string, Array<(...args: never[]) => void>>()
  const fire = (event: string, ...args: never[]) => {
    for (const h of handlers.get(event) ?? []) h(...args)
  }
  return {
    fire,
    ctx: {
      tools: {
        register(def: ToolDef) {
          assertRegistrable(def) // 宿主在这里就抛，绝不静默
          defs.set(def.name, def)
          registered.push(def.name)
          return () => defs.delete(def.name)
        }
      },
      sessions: { get: (id: string) => (id === 's-contract' ? { header: { cwd: cwdDir } } : undefined) },
      skills: { register: () => () => {} },
      logger: { warn: () => {} },
      on: (event: string, handler: (...args: never[]) => void) => {
        const list = handlers.get(event) ?? []
        list.push(handler)
        handlers.set(event, list)
        return () => {
          const i = (handlers.get(event) ?? []).indexOf(handler)
          if (i >= 0) handlers.get(event)!.splice(i, 1)
        }
      },
      effect: (fn: () => void | (() => void)) => {
        const cleanup = fn()
        return () => void cleanup
      }
    }
  }
}

function reveal(fire: (event: string, ...args: never[]) => void): void {
  fire('tools/result', { name: 'skill', arguments: { name: 'ppt-maker' } } as never, { isError: false } as never)
}

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-contract-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe('宿主注册契约（严格桩，照抄 dsh-tools register/createSuccessResult）', () => {
  it('11 个 ppt_* 工具全部满足 output { schema, render } 契约，一个都不许静默丢失', () => {
    const { ctx, fire } = strictCtx(cwd)
    apply(ctx)
    reveal(fire)
    // 关键判据：数量 + 名字集合，缺一个即红。曾经的 P0 正是这里从 11 变 0。
    expect([...defs.keys()].sort()).toEqual([
      'ppt_check',
      'ppt_create',
      'ppt_edit',
      'ppt_export',
      'ppt_import',
      'ppt_open',
      'ppt_patch',
      'ppt_redo',
      'ppt_render',
      'ppt_themes',
      'ppt_undo'
    ])
    expect(registered).toHaveLength(11)
  })

  it('output.schema 必须落在宿主支持的子集内；parameters 只要求 lossless JSON', () => {
    // 两者的门槛不同，这是实测出来的（app.asar 内 dsh-tools/lib/index.js）：
    //   - register() 只对 output.schema 调 assertSupportedJsonSchema（:2882），
    //     所以 output.schema 越界关键词即注册失败。
    //   - parameters 在 register() 不被校验，只在 schemaOf()/schema projection
    //     时过 snapshotJsonValue（:3041-3042），要求是 lossless JSON，不设子集限制。
    // 我们的 parameters 用了 minItems/maxItems/minLength，合法；但若照抄进
    // output.schema 就会当场炸——这条测试把这个边界钉住。
    const { ctx, fire } = strictCtx(cwd)
    apply(ctx)
    reveal(fire)
    for (const [name, def] of defs) {
      // parameters：宿主不设子集限制，只要求能无损 JSON 投影。
      expect(isPlainRecord(def.parameters), `${name}.parameters 是对象根`).toBe(true)
      expect(() => JSON.parse(JSON.stringify(def.parameters))).not.toThrow()
      const out = (def as { output: { schema: unknown } }).output
      expect(() => assertSupportedJsonSchema(out.schema), `${name}.output.schema`).not.toThrow()
    }
    // 边界自检：子集外的关键词（如 minLength）在 parameters 位置合法、
    // 在 output.schema 位置必炸——两条路门槛不同，别把两者当成一回事。
    const outsideSubset = { type: 'object', properties: { a: { type: 'string', minLength: 1 } } }
    expect(() => JSON.parse(JSON.stringify(outsideSubset))).not.toThrow()
    expect(() => assertSupportedJsonSchema(outsideSubset)).toThrow(/minLength is not a supported keyword/)
  })

  it('output.schema 必须是对象根且必含 ok:boolean（统一信封）', () => {
    const { ctx, fire } = strictCtx(cwd)
    apply(ctx)
    reveal(fire)
    for (const [name, def] of defs) {
      const schema = (def as { output: { schema: Record<string, unknown> } }).output.schema
      expect(schema.type, `${name}.output.schema.type`).toBe('object')
      expect(schema.required, `${name}.output.schema.required`).toContain('ok')
      expect((schema.properties as Json).ok).toMatchObject({ type: 'boolean' })
    }
  })

  it('render 返回宿主可直接投影的 lossless JSON（成功与失败两条路径）', () => {
    const { ctx, fire } = strictCtx(cwd)
    apply(ctx)
    reveal(fire)
    for (const [name, def] of defs) {
      // 成功信封
      const okValue = { ok: true }
      const okRendered = assertRenderable(def, okValue)
      expect(Array.isArray(okRendered), `${name} 成功 render 必须是内容块数组`).toBe(true)
      expect((okRendered as Array<{ type: string }>)[0].type).toBe('text')
      // 失败信封（toolError 的统一形状）
      const failRendered = assertRenderable(def, { ok: false, error: { code: 'X', message: 'y' } })
      expect(Array.isArray(failRendered), `${name} 失败 render 必须是内容块数组`).toBe(true)
    }
  })

  it('严格桩自身有效：缺 output.schema 的定义会被当场拒收（回归护栏自检）', () => {
    // 若这条不红，说明严格桩退化成无校验的空壳，上面的契约测试就都是假的。
    const naked = { name: 'ppt_naked', description: '', parameters: { type: 'object' }, execute: async () => ({}) } as unknown as ToolDef
    expect(() => assertRegistrable(naked)).toThrow(/must declare output/)
    const noSchema = {
      name: 'ppt_no_schema',
      description: '',
      parameters: { type: 'object' },
      output: { render: () => [{ type: 'text', text: '' }] },
      execute: async () => ({})
    } as unknown as ToolDef
    expect(() => assertRegistrable(noSchema)).toThrow(/must declare output/)
    // 宿主子集的越界关键词也要能抓到（如 JSON Schema 的 minLength 不在子集内）。
    const outOfSubset = {
      name: 'ppt_bad',
      description: '',
      parameters: { type: 'object' },
      output: { schema: { type: 'object', properties: { a: { type: 'string', minLength: 1 } } }, render: () => [] },
      execute: async () => ({})
    } as unknown as ToolDef
    expect(() => assertRegistrable(outOfSubset)).toThrow(/minLength is not a supported keyword/)
  })
})
