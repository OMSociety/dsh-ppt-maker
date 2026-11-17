/**
 * ppt_plan / ppt_svg 工具契约测试（v2 规划契约 + SVG 页面轨）。
 * ppt_svg 的 compile 动作依赖 vendor/.venv，缺席时整组 skipped（CI 无 venv 不红）。
 */
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.js'
import type { ToolDef } from '../src/tools/shared.js'
import { existsSync } from 'node:fs'

interface ToolResult {
  ok: boolean
  [key: string]: unknown
}

let cwd: string
let defs: Map<string, ToolDef>
const exec = { agent: { session: { id: 's-plan-svg' } } }

function makeCtx(cwdDir: string) {
  defs = new Map()
  const handlers = new Map<string, Array<(...args: never[]) => void>>()
  const fire = (event: string, ...args: never[]) => {
    for (const h of handlers.get(event) ?? []) h(...args)
  }
  return {
    fire,
    ctx: {
      tools: {
        register(def: ToolDef) {
          defs.set(def.name, def)
          return () => defs.delete(def.name)
        }
      },
      sessions: { get: (id: string) => (id === 's-plan-svg' ? { header: { cwd: cwdDir } } : undefined) },
      skills: { register: () => () => {} },
      logger: { warn: () => {} },
      on: (event: string, handler: (...args: never[]) => void) => {
        const list = handlers.get(event) ?? []
        list.push(handler)
        handlers.set(event, list)
        return () => {}
      },
      effect: (fn: () => void | (() => void)) => {
        fn()
      }
    }
  }
}

async function call(tool: string, args: Record<string, unknown>): Promise<ToolResult> {
  const def = defs.get(tool)
  expect(def, `工具 ${tool} 已注册`).toBeDefined()
  return (await def!.execute(args, exec)) as ToolResult
}

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-plan-svg-'))
  const bundle = makeCtx(cwd)
  apply(bundle.ctx)
  bundle.fire('tools/result', { name: 'skill', arguments: { name: 'ppt-maker' } } as never, { isError: false } as never)
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

const SVG_DOC =
  '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">' +
  '<rect width="960" height="540" fill="#0b1f3a"/>' +
  '<text x="80" y="120" font-size="40" fill="#ffffff">封面</text></svg>'

describe('ppt_plan', () => {
  it('setBrief → get 往返；setPlan 写 plan.yml 且进乐观锁', async () => {
    await call('ppt_create', { dir: 'proj-plan', title: '规划' })
    const brief = { purpose: '汇报', audience: '导师', coreMessage: '结论先行', mode: 'deck', pageCount: 8 }
    const r1 = await call('ppt_plan', { dir: 'proj-plan', action: 'setBrief', brief })
    expect(r1.ok).toBe(true)
    const raw = await readFile(path.join(cwd, 'proj-plan', 'brief.md'), 'utf8')
    expect(raw).toContain('汇报')

    const r2 = await call('ppt_plan', { dir: 'proj-plan', action: 'setPlan', plan: { status: 'draft', pages: [{ page: 'pages/01.page', title: '封面' }] } })
    expect(r2.ok).toBe(true)
    expect(typeof r2.revision).toBe('number')
    await access(path.join(cwd, 'proj-plan', 'plan.yml'))

    const r3 = await call('ppt_plan', { dir: 'proj-plan', action: 'get' })
    expect(r3.ok).toBe(true)
    expect((r3.brief as { audience?: string }).audience).toBe('导师')
    expect(((r3.plan as { pages?: unknown[] }).pages ?? []).length).toBe(1)
  })

  it('setPlan 缺 pages → OpError；plan 里 svg 页缺 svgRef → OpError', async () => {
    await call('ppt_create', { dir: 'proj-plan2', title: '规划2' })
    const bad = await call('ppt_plan', { dir: 'proj-plan2', action: 'setPlan', plan: { status: 'draft' } })
    expect(bad.ok).toBe(false)
    expect((bad.error as { name?: string; message?: string })?.name ?? (bad.error as { message?: string })?.message).toMatch(/OpError|pages/)
    const bad2 = await call('ppt_plan', { dir: 'proj-plan2', action: 'setPlan', plan: { pages: [{ page: 'pages/01.page', type: 'svg' }] } })
    expect(bad2.ok).toBe(false)
  })
})

const venvReady = existsSync(
  path.join(__dirname, '..', 'skills', 'ppt-maker', 'vendor', '.venv-ready.json')
)

describe.skipIf(!venvReady)('ppt_svg', () => {
  it('put 写源 + 挂 svg 页；compile 早检通过', async () => {
    await call('ppt_create', { dir: 'proj-svg', title: 'SVG' })
    const add = await call('ppt_edit', {
      dir: 'proj-svg',
      ops: [{ op: 'add_page', page: 'pages/01.page', content: { pageType: 'svg', svgSource: { ref: 'media/svg/cover.svg' }, elements: [] } }]
    })
    expect(add.ok).toBe(true)
    const put = await call('ppt_svg', { dir: 'proj-svg', action: 'put', name: 'cover.svg', svg: SVG_DOC, page: 'pages/01.page' })
    expect(put.ok).toBe(true)
    expect(put.ref).toBe('media/svg/cover.svg')
    await access(path.join(cwd, 'proj-svg', 'media', 'svg', 'cover.svg'))

    const compiled = await call('ppt_svg', { dir: 'proj-svg', action: 'compile', ref: 'media/svg/cover.svg' })
    expect(compiled.ok).toBe(true)
    expect(compiled.compiled).toBe(true)
  }, 180_000)

  it('put 挂到非 svg 页 → 409', async () => {
    await call('ppt_create', { dir: 'proj-svg2', title: 'SVG2' })
    await call('ppt_edit', {
      dir: 'proj-svg2',
      ops: [{ op: 'add_page', page: 'pages/01.page', content: 'elements: []\n' }]
    })
    const r = await call('ppt_svg', { dir: 'proj-svg2', action: 'put', name: 'cover.svg', svg: SVG_DOC, page: 'pages/01.page' })
    expect(r.ok).toBe(false)
    expect((r.error as { code?: string }).code).toBe('SvgSourceInvalid')
  })
})
