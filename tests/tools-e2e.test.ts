/**
 * e2e stub：假宿主 ctx（tools/sessions/skills 三个注入服务 + logger + effect），
 * 跑全链 create → edit×3（合并窗内）→ undo → redo，外加 ppt_themes 与错误路径。
 */
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apply, name as pluginName, inject } from '../src/index.js'
import type { ToolDef } from '../src/tools/shared.js'

interface ToolResult {
  ok: boolean
  [key: string]: unknown
}

let cwd: string
let defs: Map<string, ToolDef>
let disposed: number

function makeCtx(cwdDir: string) {
  defs = new Map()
  const skillDefs: unknown[] = []
  return {
    skillDefs,
    ctx: {
      tools: {
        register(def: ToolDef) {
          defs.set(def.name, def)
          return () => defs.delete(def.name)
        }
      },
      sessions: {
        get: (id: string) => (id === 's-e2e' ? { header: { cwd: cwdDir } } : undefined)
      },
      skills: {
        register: (def: unknown) => {
          skillDefs.push(def)
          return () => {}
        }
      },
      logger: { warn: () => {} },
      effect: (fn: () => void | (() => void)) => {
        const cleanup = fn()
        if (typeof cleanup === 'function') {
          const original = cleanup
          // wrap so teardown counts
          void original
        }
      }
    }
  }
}

const exec = { agent: { session: { id: 's-e2e' } } }

async function call(tool: string, args: Record<string, unknown>): Promise<ToolResult> {
  const def = defs.get(tool)
  expect(def, `工具 ${tool} 已注册`).toBeDefined()
  return (await def!.execute(args, exec)) as ToolResult
}

async function fileExists(rel: string): Promise<boolean> {
  try {
    await access(path.join(cwd, rel))
    return true
  } catch {
    return false
  }
}

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-e2e-'))
  disposed = 0
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe('宿主入口', () => {
  it('inject 声明 tools/sessions/skills，无 webServer（PR2）', () => {
    expect(inject).toEqual(['tools', 'sessions', 'skills'])
    expect(pluginName).toBe('dsh-ppt-maker')
  })

  it('apply 注册 1 个技能 + 5 个工具', () => {
    const { ctx, skillDefs } = makeCtx(cwd)
    apply(ctx)
    expect(skillDefs).toHaveLength(1)
    expect((skillDefs[0] as { name?: string }).name).toBe('ppt-maker')
    expect([...defs.keys()].sort()).toEqual(['ppt_create', 'ppt_edit', 'ppt_redo', 'ppt_themes', 'ppt_undo'])
  })
})

describe('ppt_* 工具全链（e2e stub）', () => {
  it('create → edit×3 → undo → redo', async () => {
    const { ctx } = makeCtx(cwd)
    apply(ctx)

    // themes：仓库内自带设计系统
    const themes = await call('ppt_themes', {})
    expect(themes.ok).toBe(true)
    expect((themes.themes as unknown[]).length).toBeGreaterThan(0)
    const family = (themes.themes as Array<{ designSystem: string }>)[0].designSystem
    const filtered = await call('ppt_themes', { designSystem: family })
    expect((filtered.themes as Array<{ designSystem: string }>).every((t) => t.designSystem === family)).toBe(true)

    // create
    const created = await call('ppt_create', { dir: 'deck', title: 'E2E 演示', designSystem: family })
    expect(created.ok).toBe(true)
    expect((created.manifest as { revision: number }).revision).toBe(0)
    expect(await fileExists('deck/deck.pptd')).toBe(true)
    expect(await fileExists('deck/.history/r0000/meta.json')).toBe(true)

    // edit ×3（同会话 30s 合并窗内：第二次起合并，revision 保持 1）
    const e1 = await call('ppt_edit', {
      dir: 'deck',
      baseRevision: 0,
      ops: [{ op: 'add_page', page: 'pages/01.page', content: { elements: [] } }]
    })
    expect(e1).toMatchObject({ ok: true, revision: 1 })
    expect(e1.warnings).toEqual([])
    const e2 = await call('ppt_edit', {
      dir: 'deck',
      baseRevision: 1,
      ops: [{ op: 'add_element', page: 'pages/01.page', element: { elementType: 'text', elementId: 't1', bounds: [0, 0, 100, 50], content: 'hi' } }]
    })
    expect(e2).toMatchObject({ ok: true, revision: 1, merged: true })
    const e3 = await call('ppt_edit', {
      dir: 'deck',
      baseRevision: 1,
      ops: [{ op: 'update_element', page: 'pages/01.page', elementId: 't1', patch: { content: 'hello e2e' } }]
    })
    expect(e3.ok).toBe(true)
    expect(await fileExists('deck/pages/01.page')).toBe(true)

    // baseRevision 过期 → 409
    const stale = await call('ppt_edit', { dir: 'deck', baseRevision: 0, ops: [{ op: 'add_page' }] })
    expect(stale).toMatchObject({ ok: false, error: { code: 'RevisionMismatch', status: 409 } })

    // undo：合并窗内的三次编辑视为一步 → 回锚点
    const undone = await call('ppt_undo', { dir: 'deck', steps: 1 })
    expect(undone).toMatchObject({ ok: true, revision: 0 })
    expect((undone.undoneOps as string[]).length).toBe(3)
    expect(await fileExists('deck/pages/01.page')).toBe(false)

    // redo
    const redone = await call('ppt_redo', { dir: 'deck', steps: 1 })
    expect(redone).toMatchObject({ ok: true, revision: 1 })
    expect((redone.redoneOps as string[]).length).toBe(3)
    expect(await fileExists('deck/pages/01.page')).toBe(true)
  })

  it('错误路径：缺会话 / 越界目录 / 工程不存在', async () => {
    const { ctx } = makeCtx(cwd)
    apply(ctx)

    const noExec = (await defs.get('ppt_create')!.execute({ dir: 'x' }, {})) as ToolResult
    expect(noExec).toMatchObject({ ok: false, error: { code: 'SessionMissing' } })

    const unknownSession = (await defs.get('ppt_create')!.execute({ dir: 'x' }, { agent: { session: { id: 'ghost' } } })) as ToolResult
    expect(unknownSession).toMatchObject({ ok: false, error: { code: 'SessionCwdMissing' } })

    const outside = await call('ppt_create', { dir: '../outside' })
    expect(outside).toMatchObject({ ok: false, error: { code: 'PathOutsideCwd', status: 400 } })

    const missing = await call('ppt_undo', { dir: 'no-such-project' })
    expect(missing).toMatchObject({ ok: false, error: { code: 'ProjectNotFound', status: 404 } })

    const badSteps = await call('ppt_undo', { dir: 'deck', steps: 99 })
    expect(badSteps).toMatchObject({ ok: false, error: { code: 'InvalidSteps', status: 400 } })
  })
})
