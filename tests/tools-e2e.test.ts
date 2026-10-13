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
  const handlers = new Map<string, Array<(...args: never[]) => void>>()
  const fire = (event: string, ...args: never[]) => {
    for (const h of handlers.get(event) ?? []) h(...args)
  }
  return {
    skillDefs,
    fire,
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
        if (typeof cleanup === 'function') {
          const original = cleanup
          // wrap so teardown counts
          void original
        }
      }
    }
  }
}

/** 模拟宿主广播：技能 invoke 成功的 tools/result → 触发懒展开。 */
function revealTools(fire: (event: string, ...args: never[]) => void): void {
  fire('tools/result', { name: 'skill', arguments: { name: 'ppt-maker' } } as never, { isError: false } as never)
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
  it('inject 只声明装载上下文保证存在的服务（llm/attachments 懒取，禁入 inject）', () => {
    // llm / attachments 一旦进 inject：Cordis 对注入但缺席的服务把 apply() 静默
    // 挂起——实测症状为技能注册成功而全部 ppt_* 工具消失（P0 事故，见 CHANGELOG）。
    expect(inject).toEqual(['tools', 'sessions', 'skills', 'webServer'])
    expect(inject).not.toContain('llm')
    expect(inject).not.toContain('attachments')
    expect(pluginName).toBe('dsh-ppt-maker')
  })

  it('ctx.get 在场或缺席都不影响注册（llm/attachments 走调用时懒取）', () => {
    // 带 get 的宿主：llm/attachments 在注册期与展开后执行前都不得被读
    // （getter 必须懒）；sessions 的读是懒展开扫描的合法行为，不在此限。
    const getNames: string[] = []
    const withGet = makeCtx(cwd)
    const ctxWithGet = {
      ...withGet.ctx,
      get: (name: string) => {
        getNames.push(name)
        return { sentinel: true }
      }
    }
    apply(ctxWithGet)
    expect(defs.size).toBe(0)
    revealTools(withGet.fire)
    expect(defs.size).toBe(11)
    expect(getNames.filter((n) => n === 'llm' || n === 'attachments')).toEqual([])
    // 无 get 的宿主（默认 makeCtx）：同样必须全量注册，不抛。
    const plain = makeCtx(cwd)
    apply(plain.ctx)
    revealTools(plain.fire)
    expect(defs.size).toBe(11)
  })

  it('apply 常驻只注册 1 个技能；invoke ppt-maker 技能成功后懒展开 11 个工具', () => {
    const { ctx, skillDefs, fire } = makeCtx(cwd)
    apply(ctx)
    expect(skillDefs).toHaveLength(1)
    expect((skillDefs[0] as { name?: string }).name).toBe('ppt-maker')
    // 懒展开：技能未 invoke 时工具不进表
    expect(defs.size).toBe(0)
    // 别的技能被 invoke 不触发
    fire('tools/result', { name: 'skill', arguments: { name: 'fishpai' } } as never, { isError: false } as never)
    expect(defs.size).toBe(0)
    // 技能 invoke 失败不触发
    fire('tools/result', { name: 'skill', arguments: { name: 'ppt-maker' } } as never, { isError: true } as never)
    expect(defs.size).toBe(0)
    // 成功 invoke → 整组进场（幂等：再触发不重复注册）
    revealTools(fire)
    revealTools(fire)
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
  })
})

describe('ppt_* 工具全链（e2e stub）', () => {
  it('create → edit×3 → undo → redo', async () => {
    const { ctx, fire } = makeCtx(cwd)
    apply(ctx)
    revealTools(fire)

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

    // export（质检通过 → 产物落盘 + exportReport 落账）
    const exported = await call('ppt_export', { dir: 'deck', out: 'deck/out.pptx' })
    expect(exported.ok).toBe(true)
    expect(await fileExists('deck/out.pptx')).toBe(true)
    expect((exported.check as { pass: boolean }).pass).toBe(true)

    // render（最终 pptx → PNG 预览）
    const rendered = await call('ppt_render', { dir: 'deck' })
    expect(rendered.ok).toBe(true)
    const images = rendered.images as Array<{ page: number; path: string }>
    expect(images.length).toBe(1)
    expect(await fileExists(images[0].path)).toBe(true)

    // check（规则质检：无 blocker）
    const checked = await call('ppt_check', { dir: 'deck' })
    expect(checked.ok).toBe(true)
    expect(checked.pass).toBe(true)
  })

  it('错误路径：缺会话 / 越界目录 / 工程不存在', async () => {
    const { ctx, fire } = makeCtx(cwd)
    apply(ctx)
    revealTools(fire)

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
