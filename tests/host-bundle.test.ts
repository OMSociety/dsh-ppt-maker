/**
 * 宿主 bundle 行为守卫：lib/index.js 是 tsup 产物、随包提交（`dsh plugin add` 只安装不构建）。
 * 直接装配随包的 lib/index.js（而不是 src），走一遍「技能展开 → ppt_create → 路由读工程 →
 * ppt_edit → 路由撤销」，任何一条 CoreSurface 接线缺失或改空，都会在这里变红。
 * 逐字节新鲜度另由 CI 的 check:build 守着。
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (req: unknown, res: unknown) => Promise<void>
type Tool = { name: string; execute: (args: Record<string, unknown>, exec: unknown) => Promise<Record<string, unknown>> }

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-bundle-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

/** 最小 req/res：GET 无正文，POST 一次性吐出 JSON 正文。 */
async function request(handler: Handler, method: 'GET' | 'POST', url: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const payload = body === undefined ? '' : JSON.stringify(body)
  const listeners = new Map<string, Array<(chunk?: unknown) => void>>()
  const req = {
    method,
    url,
    headers: { host: '127.0.0.1:17507', origin: 'http://127.0.0.1:17507', 'content-type': 'application/json' },
    on(event: string, fn: (chunk?: unknown) => void) {
      listeners.set(event, [...(listeners.get(event) ?? []), fn])
      if (event === 'end') {
        queueMicrotask(() => {
          if (payload) for (const f of listeners.get('data') ?? []) f(Buffer.from(payload))
          for (const f of listeners.get('end') ?? []) f()
        })
      }
      return req
    },
  }
  let text = ''
  const res = {
    statusCode: 200,
    headers: {} as Record<string, unknown>,
    setHeader(k: string, v: unknown) {
      this.headers[k.toLowerCase()] = v
    },
    writeHead(code: number, headers?: Record<string, unknown>) {
      this.statusCode = code
      Object.assign(this.headers, headers ?? {})
      return this
    },
    write(chunk: unknown) {
      text += String(chunk)
      return true
    },
    end(chunk?: unknown) {
      if (chunk !== undefined) text += String(chunk)
    },
  }
  await handler(req, res)
  await vi.waitFor(() => expect(text.length).toBeGreaterThan(0))
  return { status: res.statusCode, json: JSON.parse(text) as Record<string, unknown> }
}

describe('lib/index.js 随包宿主 bundle 的接线行为', () => {
  it('技能展开后工具可用，路由能读工程、撤销编辑', async () => {
    const bundle = (await import('../lib/index.js')) as { apply: (ctx: unknown) => void; inject: string[] }
    expect(bundle.inject).toContain('connection')

    const tools = new Map<string, Tool>()
    const handlers = new Map<string, Array<(...args: unknown[]) => void>>()
    let routeHandler: Handler | undefined
    bundle.apply({
      tools: { register: (def: Tool) => (tools.set(def.name, def), () => tools.delete(def.name)) },
      sessions: { get: (id: string) => (id === 's-bundle' ? { header: { cwd } } : undefined) },
      skills: { register: () => () => {} },
      connection: { requestRejection: () => undefined },
      webServer: {
        register: (spec: { handler: Handler }) => {
          routeHandler = spec.handler
          return () => {}
        },
      },
      logger: { warn: () => {}, info: () => {} },
      on: (event: string, fn: (...args: unknown[]) => void) => {
        handlers.set(event, [...(handlers.get(event) ?? []), fn])
        return () => {}
      },
      effect: (fn: () => void) => fn(),
    })
    for (const fn of handlers.get('tools/result') ?? []) fn({ name: 'skill', arguments: { name: 'ppt-maker' } }, { isError: false })
    expect(tools.size).toBe(12)
    await vi.waitFor(() => expect(routeHandler).toBeTypeOf('function'))

    const exec = { agent: { session: { id: 's-bundle' } } }
    const created = await tools.get('ppt_create')!.execute({ dir: 'deck', title: 'bundle' }, exec)
    expect(created.ok).toBe(true)
    const edited = await tools.get('ppt_edit')!.execute({ dir: 'deck', baseRevision: 0, ops: [{ op: 'add_page' }] }, exec)
    expect(edited).toMatchObject({ ok: true, revision: 1 })
    // ppt_open 经宿主桥把工程登记进面板会话
    const opened = await tools.get('ppt_open')!.execute({ dir: 'deck' }, exec)
    expect(opened.ok).toBe(true)
    expect(opened.requested, 'ppt_open 应经宿主桥发出打开请求').toBe(true)

    const state = await request(routeHandler!, 'GET', '/ppt-maker/api/state?sessionId=s-bundle')
    expect(state.status).toBe(200)
    const projects = state.json.projects as Array<{ key: string; dir: string }>
    const key = projects.find((p) => p.dir === 'deck')?.key
    expect(key, '路由的 listProjects 接线看得见 ppt_create 建的工程').toBeTruthy()

    const project = await request(routeHandler!, 'GET', `/ppt-maker/api/project?sessionId=s-bundle&key=${key}`)
    expect(project.status, JSON.stringify(project.json)).toBe(200)
    expect(project.json.revision).toBe(1)

    const undone = await request(routeHandler!, 'POST', '/ppt-maker/api/undo', { sessionId: 's-bundle', key, baseRevision: 1 })
    expect(undone.status, JSON.stringify(undone.json)).toBe(200)
    expect(undone.json).toMatchObject({ ok: true, revision: 2 })
  }, 60_000)
})
