/**
 * ppt_svg 工具契约测试（SVG 页面轨）。
 * ppt_svg 的 compile 动作依赖 vendor/.venv，缺席时整组 skipped（CI 无 venv 不红）。
 */
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.js'
import type { ToolDef } from '../src/tools/shared.js'
import { probeVenv } from './__fixtures__/venv.js'

interface ToolResult {
  ok: boolean
  [key: string]: unknown
}

let cwd: string
let defs: Map<string, ToolDef>
const exec = { agent: { session: { id: 's-svg' } } }

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
      sessions: { get: (id: string) => (id === 's-svg' ? { header: { cwd: cwdDir } } : undefined) },
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
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-svg-'))
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

const venvReady = probeVenv().ready

describe.skipIf(!venvReady)('ppt_svg（需要 SVG 编译器环境）', () => {
  it('put 写源 + 挂 svg 页；compile 早检通过', async () => {
    await call('ppt_create', { dir: 'proj-svg', title: 'SVG' })
    const add = await call('ppt_edit', {
      dir: 'proj-svg',
      baseRevision: 0,
      ops: [{ op: 'add_page', page: 'pages/01.page', content: { pageType: 'svg', svgSource: { ref: 'media/svg/cover.svg' }, elements: [] } }]
    })
    expect(add.ok).toBe(true)
    const put = await call('ppt_svg', { dir: 'proj-svg', action: 'put', name: 'cover.svg', svg: SVG_DOC, page: 'pages/01.page', baseRevision: 1 })
    expect(put.ok).toBe(true)
    expect(put.ref).toBe('media/svg/cover.svg')
    await access(path.join(cwd, 'proj-svg', 'media', 'svg', 'cover.svg'))

    const compiled = await call('ppt_svg', { dir: 'proj-svg', action: 'compile', ref: 'media/svg/cover.svg' })
    // 失败时把工具返回的 error 带进断言信息，区分「环境偶发」与「功能坏了」
    expect(compiled.ok, `compile 失败：${JSON.stringify(compiled.error)}`).toBe(true)
    expect(compiled.compiled).toBe(true)
  }, 180_000)
})

describe('ppt_svg（不依赖编译器环境）', () => {
  it('put 挂到非 svg 页 → 409', async () => {
    await call('ppt_create', { dir: 'proj-svg2', title: 'SVG2' })
    await call('ppt_edit', {
      dir: 'proj-svg2',
      baseRevision: 0,
      ops: [{ op: 'add_page', page: 'pages/01.page', content: { elements: [] } }]
    })
    const r = await call('ppt_svg', { dir: 'proj-svg2', action: 'put', name: 'cover.svg', svg: SVG_DOC, page: 'pages/01.page', baseRevision: 1 })
    expect(r.ok).toBe(false)
    expect((r.error as { code?: string }).code).toBe('SvgSourceInvalid')
  })
})
