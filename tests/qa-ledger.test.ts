/**
 * 质检落账（manifest.qaReport）e2e：ppt_check 把质检结果 + 工程指纹写进
 * 工程账本；ppt_export 只读账本（指纹门禁）——质检未过 / 质检过期一律拒导出，
 * 落账由检查侧产生，「当初为什么没过」随 revision 可追溯。
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.js'
import type { ToolDef } from '../src/tools/shared.js'

interface ToolResult {
  ok: boolean
  [key: string]: unknown
}

let cwd: string
let defs: Map<string, ToolDef>

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
      sessions: {
        get: (id: string) => (id === 's-qa' ? { header: { cwd: cwdDir } } : undefined)
      },
      skills: { register: () => () => {} },
      logger: { warn: () => {} },
      on: (event: string, handler: (...args: never[]) => void) => {
        const list = handlers.get(event) ?? []
        list.push(handler)
        handlers.set(event, list)
        return () => {}
      },
      effect: () => {}
    }
  }
}

function revealTools(fire: (event: string, ...args: never[]) => void): void {
  fire('tools/result', { name: 'skill', arguments: { name: 'ppt-maker' } } as never, { isError: false } as never)
}

const exec = { agent: { session: { id: 's-qa' } } }

async function call(tool: string, args: Record<string, unknown>): Promise<ToolResult> {
  const def = defs.get(tool)
  expect(def, `工具 ${tool} 已注册`).toBeDefined()
  return (await def!.execute(args, exec)) as ToolResult
}

interface QaReport {
  revision: number
  checkedAt: string
  tool: string
  pass: boolean
  issueCount: number
  blockerCount: number
  issues: Array<{ severity: string; description: string }>
}

async function readQaReport(): Promise<QaReport> {
  const raw = JSON.parse(await readFile(path.join(cwd, 'deck', 'manifest.json'), 'utf8')) as { qaReport?: QaReport }
  expect(raw.qaReport, 'manifest.qaReport 已落账').toBeDefined()
  return raw.qaReport as QaReport
}

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-qa-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe('质检落账 manifest.qaReport', () => {
  it('check / export 阻断 / export 通过 三条路径都落账，且随 revision 可追溯', async () => {
    const { ctx, fire } = makeCtx(cwd)
    apply(ctx)
    revealTools(fire)

    const created = await call('ppt_create', { dir: 'deck', title: 'QA 落账' })
    expect(created.ok).toBe(true)

    // 加一个出界元素（右缘 1100 > 960 → 出界 blocker）
    const edit = await call('ppt_edit', {
      dir: 'deck',
      baseRevision: 0,
      ops: [
        {
          op: 'add_page',
          page: 'pages/01.page',
          content: {
            elements: [
              {
                elementType: 'shape',
                elementId: 's1',
                bounds: [900, 0, 200, 100],
                shapeName: 'rect',
                fill: { type: 'solid', color: '#1E50A2' }
              }
            ]
          }
        }
      ]
    })
    expect(edit).toMatchObject({ ok: true, revision: 1 })

    // 1) ppt_check：pass:false 落账
    const checked = await call('ppt_check', { dir: 'deck' })
    expect(checked.ok).toBe(true)
    expect(checked.pass).toBe(false)
    let qa = await readQaReport()
    expect(qa.tool).toBe('ppt_check')
    expect(qa.pass).toBe(false)
    expect(qa.blockerCount).toBeGreaterThanOrEqual(1)
    expect(qa.revision).toBe(1)
    expect(qa.issues.some((i) => i.severity === 'blocker')).toBe(true)

    // 2) ppt_export 被门禁阻断：qaReport.pass=false → QaReportMissing 409；
    //    导出侧不覆写账本（落账保持 ppt_check 的结论）
    const blocked = await call('ppt_export', { dir: 'deck', out: 'deck/out.pptx' })
    expect(blocked).toMatchObject({ ok: false, error: { code: 'QaReportMissing', status: 409 } })
    qa = await readQaReport()
    expect(qa.tool).toBe('ppt_check')
    expect(qa.pass).toBe(false)
    expect(qa.blockerCount).toBeGreaterThanOrEqual(1)

    // 3) 修掉出界 → check 通过 → export 通过：exportReport 带指纹化的 check 摘要
    const fixed = await call('ppt_edit', {
      dir: 'deck',
      baseRevision: 1,
      ops: [{ op: 'update_element', page: 'pages/01.page', elementId: 's1', patch: { bounds: [100, 100, 100, 100] } }]
    })
    expect(fixed.ok).toBe(true)

    const rechecked = await call('ppt_check', { dir: 'deck' })
    expect(rechecked.pass).toBe(true)
    qa = await readQaReport()
    expect(qa.tool).toBe('ppt_check')
    expect(qa.pass).toBe(true)

    const exported = await call('ppt_export', { dir: 'deck', out: 'deck/out.pptx' })
    expect(exported.ok).toBe(true)
    const manifest = JSON.parse(await readFile(path.join(cwd, 'deck', 'manifest.json'), 'utf8')) as {
      exportReport?: { check?: { pass?: boolean; fingerprint?: string } | null; sha256?: string; postflight?: { ok?: boolean } }
    }
    expect(manifest.exportReport?.check?.pass).toBe(true)
    expect(typeof manifest.exportReport?.check?.fingerprint).toBe('string')
    expect(manifest.exportReport?.postflight?.ok).toBe(true)

    // 4) skipCheck 导出：exportReport.check 标注 skipped，不伪造质检结论
    const skipped = await call('ppt_export', { dir: 'deck', out: 'deck/out2.pptx', skipCheck: true })
    expect(skipped.ok).toBe(true)
    const manifest2 = JSON.parse(await readFile(path.join(cwd, 'deck', 'manifest.json'), 'utf8')) as {
      exportReport?: { check?: { skipped?: boolean } | null }
    }
    expect(manifest2.exportReport?.check?.skipped).toBe(true)
  })

  it('只检部分页的落账不放行整份导出（QaCoverageIncomplete），全页重检后放行', async () => {
    const { ctx, fire } = makeCtx(cwd)
    apply(ctx)
    revealTools(fire)

    await call('ppt_create', { dir: 'deck', title: '覆盖门禁' })
    // 两页、元素都在画布内（规则层无 blocker）
    const edit = await call('ppt_edit', {
      dir: 'deck',
      baseRevision: 0,
      ops: [
        { op: 'add_page', page: 'pages/01.page', content: { elements: [] } },
        { op: 'add_page', page: 'pages/02.page', content: { elements: [] } }
      ]
    })
    expect(edit.ok).toBe(true)

    // 只检第 1 页：pass=true 落账，但覆盖不全
    const partial = await call('ppt_check', { dir: 'deck', pages: [1] })
    expect(partial.ok).toBe(true)
    expect(partial.pass).toBe(true)

    const blocked = await call('ppt_export', { dir: 'deck', out: 'deck/out.pptx' })
    expect(blocked).toMatchObject({ ok: false, error: { code: 'QaCoverageIncomplete', status: 409 } })

    // 全页重检后放行
    const full = await call('ppt_check', { dir: 'deck' })
    expect(full.pass).toBe(true)
    const exported = await call('ppt_export', { dir: 'deck', out: 'deck/out.pptx' })
    expect(exported.ok).toBe(true)
  })
})
