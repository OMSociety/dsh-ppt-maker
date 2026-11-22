/**
 * 规划契约透传与 SVG 媒体白名单的宿主路由冒烟：
 *   - GET /project 响应带 plan/brief 字段（loadProject 顺带读的）；
 *   - GET /media 接受 media/svg/*.svg（SVG 页预览 <img> 的数据面）；
 *   - GET /plan 透传同一份 plan/brief。
 * 直接调 createApiHandler 返回的 handle(req,res)，不起 HTTP 服务；
 * sessionStore 用内存桩（resolveProject 指回种子工程），core 只给路由真正触达的成员。
 */
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// 无类型声明的 .mjs 宿主路由（与 src/index.ts 同一入口）；无声明时按 any 处理。
// @ts-ignore
import { createApiHandler } from '../plugin/host/routes.mjs'
// @ts-ignore
import { mimeFor } from '../plugin/host/store.mjs'
import { createProject, loadProject } from '../src/core/project/store.js'
import { ProjectError } from '../src/core/project/store.js'

const SESSION = 's-plan-route'
const KEY = 'deck'

function mockRes() {
  const out: { status: number; body: unknown; raw?: Buffer } = { status: 200, body: null }
  const res = {
    out,
    statusCode: 200,
    writeHead(code: number) {
      out.status = code
      res.statusCode = code
      return res
    },
    status(code: number) {
      out.status = code
      res.statusCode = code
      return res
    },
    set() {
      return res
    },
    json(payload: unknown) {
      out.body = payload
      return res
    },
    send(payload: unknown) {
      out.body = payload
      return res
    },
    end(payload?: unknown) {
      if (payload !== undefined) {
        out.raw = payload as Buffer
        // json() 走 res.end(JSON.stringify(...))：这里解出 body 供断言。
        if (typeof payload === 'string') {
          try {
            out.body = JSON.parse(payload)
          } catch {
            out.body = payload
          }
        }
      }
      return res
    },
  }
  return res
}

function mockReq(method: string, route: string, query: Record<string, string> = {}) {
  const qs = new URLSearchParams({ sessionId: SESSION, ...query }).toString()
  return {
    method,
    url: `/ppt-maker/api${route}?${qs}`,
    headers: { host: 'localhost:3000' },
  }
}

async function seedProject() {
  const cwd = await mkdtemp(join(tmpdir(), 'ppt-plan-route-'))
  await createProject(cwd, { dir: 'deck', title: '规划路由冒烟' })
  const abs = join(cwd, 'deck')
  await writeFile(join(abs, 'brief.md'), '# 简报\n\n- **audience**：评审专家\n', 'utf8')
  await writeFile(
    join(abs, 'plan.yml'),
    'status: confirmed\npages:\n  - page: pages/01.page\n    title: 封面\n    type: native\n',
    'utf8',
  )
  await mkdir(join(abs, 'media', 'svg'), { recursive: true })
  await writeFile(
    join(abs, 'media', 'svg', 'cover.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" fill="#123"/></svg>',
    'utf8',
  )
  return { cwd, abs }
}

function makeHandler(cwd: string, abs: string, overrides: Record<string, unknown> = {}) {
  const ss = {
    ensureSession() {},
    listSessionProjects: () => [],
    activeKey: () => KEY,
    pendingOpenRequests: () => [],
    resolveProject: (_s: string, _c: string, key: string) =>
      key === KEY ? { dir: 'deck', abs } : null,
    mimeFor,
  }
  // core 只给本测试触达的成员；REQUIRED_CORE 装配期校验要求全部函数，未用到的给 noop。
  const noop = async () => ({})
  const core = {
    loadProject: (c: string, d: string) => loadProject(c, d),
    editProject: noop,
    undoProject: noop,
    redoProject: noop,
    projectUndoState: async () => ({ canUndo: false, canRedo: false }),
    listProjectHistory: noop,
    readHistorySnapshot: noop,
    restoreProject: noop,
    releaseProject: noop,
    checkProject: noop,
    writeQaReport: noop,
    computeProjectFingerprint: noop,
    ProjectError,
    ...overrides,
  }
  return createApiHandler({ resolveCwd: () => cwd, requestRejection: () => undefined, core, sessionStore: ss })
}

describe('宿主路由：规划透传与 svg 媒体白名单', () => {
  it('GET /project 带 plan/brief；GET /media 接受 .svg；GET /plan 透传', async () => {
    const { cwd, abs } = await seedProject()
    const handle = makeHandler(cwd, abs)

    const res1 = mockRes()
    await handle(mockReq('GET', '/project', { key: KEY }), res1)
    expect(res1.out.status).toBe(200)
    const project = res1.out.body as { plan?: { status?: string }; brief?: string }
    expect(project.plan?.status).toBe('confirmed')
    expect(project.brief).toContain('audience')

    const res2 = mockRes()
    await handle(mockReq('GET', '/plan', { key: KEY }), res2)
    expect(res2.out.status).toBe(200)
    expect((res2.out.body as { plan?: { pages?: unknown[] } }).plan?.pages).toHaveLength(1)

    const res3 = mockRes()
    await handle(mockReq('GET', '/media', { key: KEY, src: 'media/svg/cover.svg' }), res3)
    expect(res3.out.status).toBe(200)
    expect(mimeFor('cover.svg')).toBe('image/svg+xml')
    expect(String(res3.out.raw)).toContain('<svg')

    // 路径逃逸仍然 400
    const res4 = mockRes()
    await handle(mockReq('GET', '/media', { key: KEY, src: 'media/../../outside.svg' }), res4)
    expect(res4.out.status).toBe(400)
  })
})

describe('宿主路由：内部错误映射', () => {
  it('未知内部异常回 500 固定文案，不把异常原文（含宿主路径）回给浏览器', async () => {
    const { cwd, abs } = await seedProject()
    const handle = makeHandler(cwd, abs, {
      loadProject: async () => {
        throw new TypeError('boom at D:\\secret\\workspace\\deck.pptd')
      },
    })
    const res = mockRes()
    await handle(mockReq('GET', '/project', { key: KEY }), res)
    expect(res.out.status).toBe(500)
    expect(JSON.stringify(res.out.body)).not.toContain('secret')
    expect((res.out.body as { error?: string }).error).toBe('插件内部错误，详情见宿主日志')
  })

  it('ENOENT 映射为 404，同样不回传路径', async () => {
    const { cwd, abs } = await seedProject()
    const handle = makeHandler(cwd, abs, {
      loadProject: async () => {
        throw Object.assign(new Error("ENOENT: no such file or directory, open 'D:\\secret\\deck.pptd'"), { code: 'ENOENT' })
      },
    })
    const res = mockRes()
    await handle(mockReq('GET', '/project', { key: KEY }), res)
    expect(res.out.status).toBe(404)
    expect(JSON.stringify(res.out.body)).not.toContain('secret')
  })
})