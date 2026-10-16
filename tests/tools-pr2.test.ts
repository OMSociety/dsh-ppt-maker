/**
 * Tool-layer contract tests for ppt_import / ppt_open / ppt_patch.
 *
 * These tests don't drive the DSH host: they stub the minimum `tools` +
 * `sessions` services the registration functions need, then call the
 * `execute` they captured. The host wiring (webServer route + `pptMaker`
 * bridge injection) is task-6's job.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../src/core/project/store.js'
import { registerImportTool } from '../src/tools/import.js'
import { registerOpenTool, type PptMakerHostBridge } from '../src/tools/open.js'
import { registerPatchTool } from '../src/tools/patch.js'
import {
  addBlankSlide,
  addSlideChart,
  addSlideTextBox,
  createPresentation,
  emu,
  getShapeId,
  getShapeKind,
  getShapeText,
  getSlideShapes,
  getSlides,
  loadPresentation,
  savePresentation
} from '@office-kit/pptx'

interface CapturedTool {
  name: string
  execute: (args: Record<string, unknown>, exec: unknown) => Promise<unknown>
}

function toolsStub(): { tools: { register(d: { name: string; execute: CapturedTool['execute'] }): () => void }; lastRef: { current: CapturedTool | null } } {
  const lastRef: { current: CapturedTool | null } = { current: null }
  const tools = {
    register(def: { name: string; execute: CapturedTool['execute'] }): () => void {
      lastRef.current = { name: def.name, execute: def.execute }
      return () => {}
    }
  }
  return { tools, lastRef }
}

function sessionsStub(cwd: string, sessionId: string): { get(id: string): { header: { cwd: string } } | undefined } {
  return {
    get(id: string) {
      return id === sessionId ? { header: { cwd } } : undefined
    }
  }
}

let cwd: string
const SESSION_ID = 'test-session-1'

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-tools-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

async function makeSeedProject(): Promise<string> {
  await createProject(cwd, { dir: 'seed', title: 'seed', sessionId: SESSION_ID })
  return 'seed'
}

describe('ppt_import', () => {
  it('surgical 模式：早退，不动工程目录，只给提示', async () => {
    const { tools, lastRef } = toolsStub()
    registerImportTool({ tools: tools, sessions: sessionsStub(cwd, SESSION_ID) })
    const tool = lastRef.current
    expect(tool?.name).toBe('ppt_import')

    const result = (await tool!.execute(
      { source: 'any.pptx', mode: 'surgical' },
      { agent: { session: { id: SESSION_ID } } }
    )) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.mode).toBe('surgical')
    expect(String(result.guidance)).toContain('ppt_patch')
  })

  it('full 模式：导入真实 fixture，回传 projectDir + dropped/degraded 计数', async () => {
    const { buildFixturePptx } = await import('./__fixtures__/pptx-fixtures.js')
    const bytes = await buildFixturePptx()
    await writeFile(path.join(cwd, 'fixture.pptx'), bytes)

    const bridgeCalls: Array<{ kind: string; sessionId: string; key?: string }> = []
    const bridge: PptMakerHostBridge = {
      registerProject(sessionId, _cwd, dir) {
        bridgeCalls.push({ kind: 'registerProject', sessionId, key: dir })
        return { key: 'k1', dir }
      },
      requestOpen(sessionId, key) {
        bridgeCalls.push({ kind: 'requestOpen', sessionId, key })
      }
    }

    const { tools, lastRef } = toolsStub()
    registerImportTool({ tools: tools, sessions: sessionsStub(cwd, SESSION_ID), pptMaker: bridge })
    const tool = lastRef.current
    const result = (await tool!.execute(
      { source: 'fixture.pptx', targetDir: 'proj', open: true },
      { agent: { session: { id: SESSION_ID } } }
    )) as Record<string, unknown>

    expect(result.ok).toBe(true)
    expect(result.projectDir).toBe('proj')
    expect(result.pageCount).toBe(1)
    expect(result.revision).toBe(1)
    expect(bridgeCalls.some((c) => c.kind === 'registerProject' && c.sessionId === SESSION_ID)).toBe(true)
    expect(bridgeCalls.some((c) => c.kind === 'requestOpen' && c.sessionId === SESSION_ID)).toBe(true)
  })

  it('源文件不存在 → SourceNotFound 404', async () => {
    const { tools, lastRef } = toolsStub()
    registerImportTool({ tools: tools, sessions: sessionsStub(cwd, SESSION_ID) })
    const tool = lastRef.current
    const result = (await tool!.execute(
      { source: 'nope.pptx', targetDir: 'proj' },
      { agent: { session: { id: SESSION_ID } } }
    )) as { ok: false; error: { code: string; status?: number } }
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('SourceNotFound')
    expect(result.error.status).toBe(404)
  })
})

describe('ppt_open', () => {
  it('存在的工程：调 registerProject + requestOpen，回 requested=true', async () => {
    await makeSeedProject()
    const bridgeCalls: Array<{ kind: string; sessionId: string; key?: string }> = []
    const bridge: PptMakerHostBridge = {
      registerProject(sessionId, _cwd, dir) {
        bridgeCalls.push({ kind: 'registerProject', sessionId, key: dir })
        return { key: 'seed-key', dir }
      },
      requestOpen(sessionId, key) {
        bridgeCalls.push({ kind: 'requestOpen', sessionId, key })
      }
    }
    const { tools, lastRef } = toolsStub()
    registerOpenTool({ tools: tools, sessions: sessionsStub(cwd, SESSION_ID), pptMaker: bridge })
    const tool = lastRef.current
    const result = (await tool!.execute({ dir: 'seed' }, { agent: { session: { id: SESSION_ID } } })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.dir).toBe('seed')
    expect(result.requested).toBe(true)
    expect(bridgeCalls).toEqual([
      { kind: 'registerProject', sessionId: SESSION_ID, key: 'seed' },
      { kind: 'requestOpen', sessionId: SESSION_ID, key: 'seed-key' }
    ])
  })

  it('目录不是工程 → ProjectNotFound 404', async () => {
    const { tools, lastRef } = toolsStub()
    registerOpenTool({ tools: tools, sessions: sessionsStub(cwd, SESSION_ID) })
    const tool = lastRef.current
    const result = (await tool!.execute({ dir: 'nope' }, { agent: { session: { id: SESSION_ID } } })) as {
      ok: false
      error: { code: string; status?: number }
    }
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('ProjectNotFound')
    expect(result.error.status).toBe(404)
  })

  it('宿主没接桥时也能返回 requested=false + dir（headless 调用方）', async () => {
    await makeSeedProject()
    const { tools, lastRef } = toolsStub()
    registerOpenTool({ tools: tools, sessions: sessionsStub(cwd, SESSION_ID) })
    const tool = lastRef.current
    const result = (await tool!.execute({ dir: 'seed' }, { agent: { session: { id: SESSION_ID } } })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.requested).toBe(false)
    expect(result.dir).toBe('seed')
  })
})

describe('ppt_patch', () => {
  it('set_text：改字 + L1 未建模部件 0 丢件 + 不原地写源文件', async () => {
    const { buildChartPptx, buildFixturePptx } = await import('./__fixtures__/pptx-fixtures.js')
    // 单页源文件：page-1 是同一份 deck，承载一个文本框（要 patch 的）+ 一个 chart
    // （未建模部件）。L1 passthrough 的检验 = chart 部件在 round-trip 之后还在。
    const combinedPres = createPresentation({ size: '16:9' })
    const combinedSlide = addBlankSlide(combinedPres)

    // 页 1：一个文本框，用来吃 set_text。
    addSlideTextBox(combinedSlide, {
      x: emu(100 * 12700),
      y: emu(80 * 12700),
      w: emu(760 * 12700),
      h: emu(120 * 12700),
      text: '原文字'
    })

    // 页 1 再加一张图表（不建模部件，set_text 不许碰它）。
    addSlideChart(combinedSlide, {
      spec: {
        kind: 'column',
        categories: ['A', 'B'],
        series: [{ name: 'S', values: [1, 2] }]
      },
      x: emu(480 * 12700),
      y: emu(280 * 12700),
      w: emu(320 * 12700),
      h: emu(160 * 12700)
    })

    const bytes = await savePresentation(combinedPres)
    const sourcePath = path.join(cwd, 'deck.pptx')
    await writeFile(sourcePath, bytes)

    // 找页 1 里第一个文本形状（不是 graphicFrame）的 shapeId。
    const slides = getSlides(combinedPres)
    const slideOne = slides[0]
    const shapes = getSlideShapes(slideOne)
    const textShape = shapes.find((s) => getShapeKind(s) === 'shape')!
    const textId = getShapeId(textShape)

    const { tools, lastRef } = toolsStub()
    registerPatchTool({ tools: tools, sessions: sessionsStub(cwd, SESSION_ID) })
    const tool = lastRef.current
    const result = (await tool!.execute(
      { source: 'deck.pptx', ops: [{ op: 'set_text', slide: 1, shapeId: textId, text: '换新标题' }] },
      { agent: { session: { id: SESSION_ID } } }
    )) as Record<string, unknown>

    expect(result.ok).toBe(true)
    expect(typeof result.out).toBe('string')
    // L1 passthrogh 的判据是不可建模部件**全部保留**（lostParts 必须为空），
    // unchangedParts 是保留下来部件的计数。
    expect(result.lostParts).toEqual([])
    expect(typeof result.unchangedParts).toBe('number')
    expect(result.unchangedParts as number).toBeGreaterThan(0)
    expect(result.appliedOps).toBe(1)

    // 源文件未被改写。
    const after = await readFile(sourcePath)
    expect(after.equals(Buffer.from(bytes))).toBe(true)

    // patch 后的 pptx 能再被 load，且新文本出现在第 1 页。
    const patchedBytes = await readFile(path.join(cwd, String(result.out)))
    const patched = await loadPresentation(patchedBytes)
    const patchedShapes = getSlideShapes(getSlides(patched)[0])
    const textContent = patchedShapes.map((s) => getShapeText(s)).join('\n')
    expect(textContent).toContain('换新标题')
  })

  it('ops 空数组 / 未知 op → 400', async () => {
    const { tools, lastRef } = toolsStub()
    registerPatchTool({ tools: tools, sessions: sessionsStub(cwd, SESSION_ID) })
    const tool = lastRef.current
    const empty = (await tool!.execute({ source: 'a.pptx', ops: [] }, { agent: { session: { id: SESSION_ID } } })) as {
      ok: false
      error: { code: string }
    }
    expect(empty.error.code).toBe('OpsEmpty')
  })
})
