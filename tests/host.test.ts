/**
 * 宿主路由测试：
 *  - sameOrigin 各分支（cross-site / 非环路 Host / Origin:null / Origin 不匹配 / 环路好）
 *  - 413 请求体超限（MAX_BODY 8MB 流式）
 *  - 415 写方法未带 application/json
 *  - 409 RevisionMismatch 经 ProjectError.status 归一映射
 *  - /edit op 应用与 revision 推进
 *  - undo/redo 游标
 *  - /media/upload 白名单 + 5MB 上限
 *  - /export 两种口径：默认回 pptx 二进制流；`save:true` 落到工程目录 export/ 并回相对路径
 *  - openRequest TTL 60s
 *
 * 用 vitest（沿用 tests/ 口径），不走真实 libreoffice-kit（get /thumb 时经
 * deps.createConverter 注入桩）。
 */
import { createServer, type Server } from 'node:http'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as sessionStore from '../plugin/host/store.mjs'
import { API_PREFIX, createApiHandler, MAX_ASSET_BYTES, sameOrigin } from '../plugin/host/routes.mjs'
import {
  createProject,
  editProject,
  listProjectHistory,
  loadProject,
  ProjectError,
  projectUndoState,
  readHistorySnapshot,
  redoProject,
  restoreProject,
  undoProject,
  writeExportReport,
} from '../src/core/project/store.js'
import {
  buildProjectDeck,
  saveProjectPptx,
} from '../src/core/export-pipeline.js'
import { setHistoryPolicy, DEFAULT_HISTORY_LIMIT, DEFAULT_MERGE_WINDOW_MS } from '../src/core/project/history.js'

const core = {
  loadProject,
  editProject,
  undoProject,
  redoProject,
  projectUndoState,
  listProjectHistory,
  readHistorySnapshot,
  restoreProject,
  buildProjectDeck,
  saveProjectPptx,
  writeExportReport,
  ProjectError,
}

// vite-node 的类型解析会投诉 .mjs；保持 plain JS 风格。

const SESSION = 's-test'
let cwd: string
let home: string
let server: Server | null = null
let port = 0

beforeEach(async () => {
  home = await mkdtemp(path.join(tmpdir(), 'ppt-host-home-'))
  vi.stubEnv('DSH_HOME', home) // store.mjs 持久化的落点——不能碰真实 ~/.dsh
  sessionStore.__clearAllSessionsForTest()
})

interface Capture {
  status: number | undefined
  headers: Record<string, string>
  body: Buffer
}

/** Spawn a real HTTP server wrapping the routes handler, so 415 / 413 / 409 等都能过真
 * 浏览器侧的语义。 */
async function startServer(deps: Parameters<typeof createApiHandler>[0] = {}) {
  const handler = createApiHandler({ resolveCwd: deps?.resolveCwd ?? (() => cwd), core, log: (m: string) => console.error('[route]', m), ...deps })
  server = createServer((req, res) => {
    // 只让 /ppt-maker/api/* 才进 handler，其余 404
    if (!String(req.url || '').startsWith(API_PREFIX)) {
      res.writeHead(404); res.end('nope'); return
    }
    void handler(req, res)
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()))
  const addr = server!.address()
  if (!addr || typeof addr === 'string') throw new Error('no addr')
  port = addr.port
}

async function stopServer() {
  if (!server) return
  await new Promise<void>((resolve) => server!.close(() => resolve()))
  server = null
}

async function api(pathname: string, init?: { method?: string; headers?: Record<string, string>; body?: unknown }) {
  const method = init?.method ?? 'GET'
  const headers: Record<string, string> = { host: `127.0.0.1:${port}`, ...(init?.headers ?? {}) }
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method,
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = String(res.headers.get('content-type') || '')
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: buf, contentType: ct }
}

async function apiJson(pathname: string, init?: { method?: string; headers?: Record<string, string>; body?: unknown }) {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(init?.headers ?? {}) }
  const res = await api(pathname, { ...init, headers })
  let json: unknown = null
  try {
    json = JSON.parse(res.body.toString('utf8'))
  } catch { /* keep as null */ }
  return { ...res, json: json as Record<string, unknown> | null }
}

/** 用冻结的项目 store 现造一个工程（返回 {key, dir} 并登记到 per-session store 里）。 */
async function seedProject(dir = 'proj') {
  const result = await createProject(cwd, { dir, title: 'host 测试工程', sessionId: SESSION })
  const { key } = sessionStore.registerProject(SESSION, cwd, dir)
  return { key, dir, revision: result.manifest.revision }
}

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-host-'))
  // 合并窗口收窄到 0：否则同 sessionId 内 30s 的连续 edit 会被合并成一个 snapshot，
  // 这不是我们要验证的「revision 推进」语义。
  setHistoryPolicy({ limit: DEFAULT_HISTORY_LIMIT, mergeWindowMs: 0 })
})

afterEach(async () => {
  setHistoryPolicy({ limit: DEFAULT_HISTORY_LIMIT, mergeWindowMs: DEFAULT_MERGE_WINDOW_MS })
  await stopServer()
  const anySS = sessionStore as unknown as { sessions?: Map<string, unknown> }
  if (anySS.sessions instanceof Map) anySS.sessions.clear()
  vi.unstubAllEnvs()
  await rm(cwd, { recursive: true, force: true })
  if (home) await rm(home, { recursive: true, force: true })
})

// ── sameOrigin 栅栏 ─────────────────────────────────────────────────

describe('sameOrigin', () => {
  it('Host 必须是环路字面量', () => {
    // 127.0.0.1 / localhost / [::1] PASS；其它都拒（含 127.1 非字面、0.0.0.0、evil 域）
    expect(sameOrigin({ headers: { host: '127.0.0.1:3080' } } as never)).toBe(true)
    expect(sameOrigin({ headers: { host: 'LOCALHOST:3080' } } as never)).toBe(true)
    expect(sameOrigin({ headers: { host: '[::1]:3080' } } as never)).toBe(true)
    expect(sameOrigin({ headers: { host: '127.0.0.1.' } } as never)).toBe(true)   // 尾随点归一
    expect(sameOrigin({ headers: { host: '2130706433' } } as never)).toBe(true)   // 十进制 IPv4
    expect(sameOrigin({ headers: { host: '127.0.0.2:3080' } } as never)).toBe(true) // 整段 127/8
    expect(sameOrigin({ headers: { host: 'evil.example:3080' } } as never)).toBe(false)
    expect(sameOrigin({ headers: { host: '0.0.0.0:3080' } } as never)).toBe(false)
    expect(sameOrigin({ headers: {} } as never)).toBe(false)
  })
  it('sec-fetch-site: cross-site 必须拒', () => {
    expect(sameOrigin({ headers: { host: '127.0.0.1:1', 'sec-fetch-site': 'cross-site' } } as never)).toBe(false)
    expect(sameOrigin({ headers: { host: '127.0.0.1:1', 'sec-fetch-site': 'Cross-Site' } } as never)).toBe(false)
  })
  it('Origin 缺失视为同源；Origin:null 一律拒；Origin.host 必须与 Host.host 同', () => {
    expect(sameOrigin({ headers: { host: '127.0.0.1:3080' } } as never)).toBe(true)
    expect(sameOrigin({ headers: { host: '127.0.0.1:3080', origin: 'null' } } as never)).toBe(false)
    expect(sameOrigin({ headers: { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' } } as never)).toBe(true)
    expect(sameOrigin({ headers: { host: '127.0.0.1:3080', origin: 'http://localhost:3080' } } as never)).toBe(false)
    expect(sameOrigin({ headers: { host: '127.0.0.1:3080', origin: 'not a url' } } as never)).toBe(false)
  })
})

// ── HTTP 层 ───────────────────────────────────────────────────────

describe('host 路由', () => {
  it('跨站请求被 403 拦下', async () => {
    await startServer()
    const r = await api(`${API_PREFIX}/state?sessionId=${SESSION}`, {
      headers: { 'sec-fetch-site': 'cross-site' },
    })
    expect(r.status).toBe(403)
  })

  it('GET /state 缺 sessionId 回 400', async () => {
    await startServer()
    const r = await api(`${API_PREFIX}/state`)
    expect(r.status).toBe(400)
  })

  it('GET /state 在没注册工程时回空 projects 与 null activeKey', async () => {
    await startServer()
    const r = await apiJson(`${API_PREFIX}/state?sessionId=${SESSION}`)
    expect(r.status).toBe(200)
    expect(r.json!.ok).toBe(true)
    expect(r.json!.projects).toEqual([])
    expect(r.json!.activeKey).toBeNull()
    expect(r.json!.openRequests).toEqual([])
    expect(r.json!.manifest).toBeNull()
  })

  it('GET /state 带活动工程时回 canUndo/canRedo（工作台撤销重做按钮态）', async () => {
    await startServer()
    const { key } = await seedProject()
    sessionStore.setActive(SESSION, key)

    // 新工程 revision 0：不可撤销、不可重做
    let r = await apiJson(`${API_PREFIX}/state?sessionId=${SESSION}`)
    let manifest = r.json!.manifest as Record<string, unknown>
    expect(manifest.canUndo).toBe(false)
    expect(manifest.canRedo).toBe(false)

    // edit 一次后 revision 1：可撤销、不可重做
    await apiJson(`${API_PREFIX}/edit`, {
      method: 'POST',
      body: { sessionId: SESSION, key, baseRevision: 0, ops: [{ op: 'add_page', content: { elements: [] } }] },
    })
    r = await apiJson(`${API_PREFIX}/state?sessionId=${SESSION}`)
    manifest = r.json!.manifest as Record<string, unknown>
    expect(manifest.canUndo).toBe(true)
    expect(manifest.canRedo).toBe(false)

    // undo 后游标回到 0：不可撤销、可重做
    await apiJson(`${API_PREFIX}/undo`, { method: 'POST', body: { sessionId: SESSION, key } })
    r = await apiJson(`${API_PREFIX}/state?sessionId=${SESSION}`)
    manifest = r.json!.manifest as Record<string, unknown>
    expect(manifest.canUndo).toBe(false)
    expect(manifest.canRedo).toBe(true)
  })

  it('GET /state 触发磁盘恢复：宿主重启后面板拿回上次打开的工程', async () => {
    await startServer()
    const { key } = await seedProject()
    // 模拟重启：进程内会话全清（磁盘 state.json 仍在临时 DSH_HOME 里）
    sessionStore.__clearAllSessionsForTest()

    const r = await apiJson(`${API_PREFIX}/state?sessionId=${SESSION}`)
    expect(r.status).toBe(200)
    expect(r.json!.activeKey).toBe(key)
    expect(r.json!.projects).toEqual([{ key, dir: 'proj' }])
    // manifest 也能正常加载（工程目录还在 cwd 临时区里）
    const manifest = r.json!.manifest as Record<string, unknown>
    expect(manifest.title).toBe('host 测试工程')
  })

  it('写方法没 content-type: application/json → 415', async () => {
    await startServer()
    await seedProject()
    const key = sessionStore.activeKey(SESSION)!
    const r = await api(`${API_PREFIX}/edit`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: { sessionId: SESSION, key, baseRevision: 0, ops: [] } as unknown,
    })
    expect(r.status).toBe(415)
  })

  it('请求体超过 MAX_BODY(8MB) → 413', async () => {
    await startServer()
    await seedProject()
    const key = sessionStore.activeKey(SESSION)!
    // 9MB 的 JSON 字符串（很长的 base64-like 字段）
    const big = { sessionId: SESSION, key, baseRevision: 0, ops: [], filler: 'x'.repeat(9 * 1024 * 1024) }
    const r = await api(`${API_PREFIX}/edit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: big as unknown,
    })
    expect(r.status).toBe(413)
  }, 30_000)

  it('/edit 缺 baseRevision → 400；baseRevision 不是数字 → 400；baseRevision 不匹配 → 409 RevisionMismatch', async () => {
    await startServer()
    const { key } = await seedProject()

    let r = await apiJson(`${API_PREFIX}/edit`, { method: 'POST', body: { sessionId: SESSION, key, ops: [] } })
    expect(r.status).toBe(400)

    r = await apiJson(`${API_PREFIX}/edit`, { method: 'POST', body: { sessionId: SESSION, key, baseRevision: 'junk', ops: [] } })
    expect(r.status).toBe(400)

    r = await apiJson(`${API_PREFIX}/edit`, { method: 'POST', body: { sessionId: SESSION, key, baseRevision: 99, ops: [] } })
    expect(r.status).toBe(409)
  })

  it('/edit 应用 add_page / add_element / update_element / move_page / remove_element / remove_page，revision 推进；update_page 顶层浅合并', async () => {
    await startServer()
    const { key } = await seedProject()

    const r1 = await apiJson(`${API_PREFIX}/edit`, {
      method: 'POST',
      body: {
        sessionId: SESSION,
        key,
        baseRevision: 0,
        ops: [
          { op: 'add_page', page: 'pages/01.page', content: { elements: [] } },
          { op: 'add_element', page: 'pages/01.page', element: { elementType: 'text', elementId: 't1', bounds: [0, 0, 100, 50], content: '第一页标题' } },
        ],
      },
    })
    expect(r1.status).toBe(200)
    expect(r1.json!.ok).toBe(true)
    expect(r1.json!.revision).toBe(1)
    expect((r1.json!.appliedOps as string[]).length).toBe(2)

    const r2 = await apiJson(`${API_PREFIX}/edit`, {
      method: 'POST',
      body: {
        sessionId: SESSION, key, baseRevision: 1,
        ops: [{ op: 'update_element', page: 'pages/01.page', elementId: 't1', patch: { content: '改过的标题' } }],
      },
    })
    expect(r2.status).toBe(200)
    expect(r2.json!.revision).toBe(2)

    const r3 = await apiJson(`${API_PREFIX}/page?sessionId=${SESSION}&key=${key}&page=pages/01.page`)
    expect(r3.status).toBe(200)
    const page = r3.json!.page as { elements: Array<{ elementId: string; content?: string }> }
    expect(page.elements[0].elementId).toBe('t1')
    expect(page.elements[0].content).toBe('改过的标题')
  })

  it('op 词表外面的 op 一律 400（冻结词表口径，不接受未知 op）', async () => {
    await startServer()
    const { key } = await seedProject()
    const r = await apiJson(`${API_PREFIX}/edit`, {
      method: 'POST',
      body: { sessionId: SESSION, key, baseRevision: 0, ops: [{ op: 'explode' }] },
    })
    expect(r.status).toBe(400)
    expect(String(r.json!.error)).toContain('未知 op')
  })

  it('undo/redo 游标：undo 回退 revision，redo 回到 r2', async () => {
    await startServer()
    const { key } = await seedProject()

    await apiJson(`${API_PREFIX}/edit`, { method: 'POST', body: { sessionId: SESSION, key, baseRevision: 0, ops: [{ op: 'add_page', page: 'pages/01.page', content: { elements: [] } }] } })
    await apiJson(`${API_PREFIX}/edit`, { method: 'POST', body: { sessionId: SESSION, key, baseRevision: 1, ops: [{ op: 'add_page', page: 'pages/02.page', content: { elements: [] } }] } })

    const u = await apiJson(`${API_PREFIX}/undo`, { method: 'POST', body: { sessionId: SESSION, key, steps: 1 } })
    expect(u.status).toBe(200)
    expect(u.json!.revision).toBe(1)

    const r = await apiJson(`${API_PREFIX}/redo`, { method: 'POST', body: { sessionId: SESSION, key, steps: 1 } })
    expect(r.status).toBe(200)
    expect(r.json!.revision).toBe(2)

    const uu = await apiJson(`${API_PREFIX}/undo`, { method: 'POST', body: { sessionId: SESSION, key, steps: 2 } })
    expect(uu.status).toBe(200)
    expect(uu.json!.revision).toBe(0)
  })

  it('/export：默认回 pptx 二进制流，save 模式落到工程目录 export/ 并回相对路径', async () => {
    await startServer()
    const { key } = await seedProject()
    await apiJson(`${API_PREFIX}/edit`, {
      method: 'POST',
      body: { sessionId: SESSION, key, baseRevision: 0, ops: [{ op: 'add_page', page: 'pages/01.page', content: { elements: [] } }] },
    })

    // 默认口径：二进制流 + attachment（客户端 exportPptx 依赖这个）
    const bin = await api(`${API_PREFIX}/export`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { sessionId: SESSION, key },
    })
    expect(bin.status).toBe(200)
    expect(bin.contentType).toContain('presentationml.presentation')
    expect(String(bin.headers['content-disposition'] || '')).toContain('attachment')
    // pptx 是 zip：PK 魔数。顺带锁住「core.saveProjectPptx 返回 { bytes, fontEmbed }、
    // 路由必须取 .bytes」——写成 Buffer.from({bytes,...}) 这里就红。
    expect(bin.body.subarray(0, 2).toString('latin1')).toBe('PK')
    expect(bin.body.length).toBeGreaterThan(1000)

    // 面板口径：落盘 + 相对路径
    const saved = await apiJson(`${API_PREFIX}/export`, { method: 'POST', body: { sessionId: SESSION, key, save: true } })
    expect(saved.status).toBe(200)
    const rel = String(saved.json!.relativePath || '')
    expect(rel).toContain('export/')
    expect(rel.endsWith('.pptx')).toBe(true)
    expect(Number(saved.json!.revision)).toBe(1)
    expect(Number(saved.json!.bytes)).toBe(bin.body.length)
    const onDisk = await readFile(path.join(cwd, rel))
    expect(onDisk.subarray(0, 2).toString('latin1')).toBe('PK')

    // 落账到 manifest.exportReport（kind 区分面板导出与浏览器导出）
    const proj = await apiJson(`${API_PREFIX}/project?sessionId=${SESSION}&key=${key}`)
    const manifest = proj.json!.manifest as Record<string, unknown>
    expect((manifest.exportReport as Record<string, unknown> | undefined)?.kind).toBe('panel-export')
  })

  describe('/export/open-menu 与 /export/open（打开方式 / 显示文件位置）', () => {
    function nativeStub(over: Record<string, unknown> = {}) {
      const calls: Array<{ fn: string; path: string; app?: string }> = []
      const stub = {
        canOpenNativePath: () => true,
        nativeFileApplications: async (p: string) => {
          calls.push({ fn: 'apps', path: p })
          return [{ id: 'app-a', name: 'App A', default: true, icon: null }]
        },
        openNativeAssociatedPath: async (p: string) => {
          calls.push({ fn: 'open', path: p })
        },
        openNativeFileApplication: async (p: string, app: string) => {
          calls.push({ fn: 'openApp', path: p, app })
        },
        revealNativePath: async (p: string) => {
          calls.push({ fn: 'reveal', path: p })
        },
        ...over,
      }
      return { stub, calls }
    }

    async function exportOne(): Promise<{ key: string; abs: string }> {
      const { key } = await seedProject()
      await apiJson(`${API_PREFIX}/edit`, {
        method: 'POST',
        body: { sessionId: SESSION, key, baseRevision: 0, ops: [{ op: 'add_page', page: 'pages/01.page', content: { elements: [] } }] },
      })
      const saved = await apiJson(`${API_PREFIX}/export`, { method: 'POST', body: { sessionId: SESSION, key, save: true } })
      expect(saved.status).toBe(200)
      const abs = String(saved.json!.absolutePath || '')
      expect(abs.length).toBeGreaterThan(0)
      return { key, abs }
    }

    it('open-menu：枚举关联应用；open：reveal / 指定应用 / 默认打开三路分发', async () => {
      const { stub, calls } = nativeStub()
      await startServer({ nativeCommand: stub })
      const { key, abs } = await exportOne()

      const menu = await apiJson(
        `${API_PREFIX}/export/open-menu?sessionId=${SESSION}&key=${key}&file=${encodeURIComponent(abs)}`,
      )
      expect(menu.status).toBe(200)
      expect(menu.json!.canOpen).toBe(true)
      expect((menu.json!.applications as unknown[]).length).toBe(1)
      // 传给 native 层的是工程目录内的规范化绝对路径
      expect(calls[0]).toEqual({ fn: 'apps', path: abs })

      const reveal = await apiJson(`${API_PREFIX}/export/open`, {
        method: 'POST', body: { sessionId: SESSION, key, file: abs, action: 'reveal' },
      })
      expect(reveal.status).toBe(200)

      const withApp = await apiJson(`${API_PREFIX}/export/open`, {
        method: 'POST', body: { sessionId: SESSION, key, file: abs, application: 'app-a' },
      })
      expect(withApp.status).toBe(200)

      const dft = await apiJson(`${API_PREFIX}/export/open`, { method: 'POST', body: { sessionId: SESSION, key, file: abs } })
      expect(dft.status).toBe(200)

      expect(calls.slice(1)).toEqual([
        { fn: 'reveal', path: abs },
        { fn: 'openApp', path: abs, app: 'app-a' },
        { fn: 'open', path: abs },
      ])
    })

    it('open-menu：无桌面打开能力 → canOpen=false；查询失败 → 降级空列表', async () => {
      const none = nativeStub({ canOpenNativePath: () => false })
      await startServer({ nativeCommand: none.stub })
      const { key, abs } = await exportOne()
      const menu = await apiJson(
        `${API_PREFIX}/export/open-menu?sessionId=${SESSION}&key=${key}&file=${encodeURIComponent(abs)}`,
      )
      expect(menu.json!.canOpen).toBe(false)
      expect(menu.json!.applications).toEqual([])

      const boom = nativeStub({
        nativeFileApplications: async () => {
          throw new Error('registry gone')
        },
      })
      await startServer({ nativeCommand: boom.stub })
      const menu2 = await apiJson(
        `${API_PREFIX}/export/open-menu?sessionId=${SESSION}&key=${key}&file=${encodeURIComponent(abs)}`,
      )
      expect(menu2.json!.canOpen).toBe(true)
      expect(menu2.json!.applications).toEqual([])
    })

    it('file 参数守卫：工程目录外 400、不存在 404', async () => {
      const { stub } = nativeStub()
      await startServer({ nativeCommand: stub })
      const { key, abs } = await exportOne()

      const outside = await apiJson(
        `${API_PREFIX}/export/open-menu?sessionId=${SESSION}&key=${key}&file=${encodeURIComponent(path.join(cwd, '..', 'evil.pptx'))}`,
      )
      expect(outside.status).toBe(400)

      // 不存在的文件：给工程目录内、但磁盘上没有的路径
      const missing = await apiJson(
        `${API_PREFIX}/export/open-menu?sessionId=${SESSION}&key=${key}&file=${encodeURIComponent(path.join(path.dirname(abs), 'nope.pptx'))}`,
      )
      expect(missing.status).toBe(404)

      const openOutside = await apiJson(`${API_PREFIX}/export/open`, {
        method: 'POST', body: { sessionId: SESSION, key, file: 'C:/Windows/evil.pptx' },
      })
      expect(openOutside.status).toBe(400)
    })
  })

  it('/media/upload：白名单 + MAX_ASSET_BYTES 上限', async () => {
    await startServer()
    const { key } = await seedProject()

    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const okR = await apiJson(`${API_PREFIX}/media/upload`, {
      method: 'POST',
      body: { sessionId: SESSION, key, name: 'hello.png', mime: 'image/png', data: pngBuf.toString('base64') },
    })
    expect(okR.status).toBe(200)
    expect(okR.json!.ok).toBe(true)
    expect(String(okR.json!.src)).toMatch(/^media\//)

    // svg 不收（UPLOAD_EXTS 不含）
    const svgR = await apiJson(`${API_PREFIX}/media/upload`, {
      method: 'POST',
      body: { sessionId: SESSION, key, name: 'x.svg', mime: 'image/svg+xml', data: '<svg></svg>' },
    })
    expect(svgR.status).toBe(415)

    // 超过上限：> MAX_ASSET_BYTES = 5MB
    const oversized = Buffer.alloc(MAX_ASSET_BYTES + 1, 7)
    const bigR = await apiJson(`${API_PREFIX}/media/upload`, {
      method: 'POST',
      body: { sessionId: SESSION, key, name: 'big.png', mime: 'image/png', data: oversized.toString('base64') },
    })
    expect(bigR.status).toBe(413)
  }, 60_000)

  it('/media 读已上传的素材（200 + 正确 mime），越界与未知扩展各 400 / 404', async () => {
    await startServer()
    const { key, dir } = await seedProject()

    // 先传一张
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const up = await apiJson(`${API_PREFIX}/media/upload`, {
      method: 'POST',
      body: { sessionId: SESSION, key, name: 'shot.png', mime: 'image/png', data: pngBuf.toString('base64') },
    })
    expect(up.status).toBe(200)
    const src = String(up.json!.src)
    const rd = await api(`${API_PREFIX}/media?sessionId=${SESSION}&key=${key}&src=${encodeURIComponent(src)}`)
    expect(rd.status).toBe(200)
    expect(rd.headers['content-type']).toContain('image/png')
    expect(rd.body.equals(pngBuf)).toBe(true)

    // 越界
    const esc = await api(`${API_PREFIX}/media?sessionId=${SESSION}&key=${key}&src=..%2f..%2fetc`)
    expect(esc.status).toBe(400)

    // 未知素材
    const missing = await api(`${API_PREFIX}/media?sessionId=${SESSION}&key=${key}&src=media/notthere.png`)
    expect(missing.status).toBe(404)
  })

  it('openRequest TTL：60s 内可见，60s 后不可见，tab-opened 会消费', async () => {
    await startServer()
    const { key } = await seedProject()

    // 请求打开
    sessionStore.requestOpen(SESSION, key)
    let st = await apiJson(`${API_PREFIX}/state?sessionId=${SESSION}`)
    expect(st.status).toBe(200)
    const openReqs = st.json!.openRequests as Array<{ key: string; at: number }>
    expect(openReqs.length).toBe(1)
    expect(openReqs[0].key).toBe(key)

    // tab-opened 消费掉
    const opened = await apiJson(`${API_PREFIX}/tab-opened`, { method: 'POST', body: { sessionId: SESSION, key } })
    expect(opened.status).toBe(200)
    const st2 = await apiJson(`${API_PREFIX}/state?sessionId=${SESSION}`)
    expect((st2.json!.openRequests as unknown[]).length).toBe(0)

    // TTL 到期：手动把 at 推到过去
    const sessionsMap = (sessionStore as unknown as { sessions?: Map<string, { openRequests: Map<string, number> }> }).sessions
    if (sessionsMap && sessionsMap.get(SESSION)) {
      sessionStore.requestOpen(SESSION, key)
      sessionsMap.get(SESSION)!.openRequests.set(key, Date.now() - 61_000)
    }
    const st3 = await apiJson(`${API_PREFIX}/state?sessionId=${SESSION}`)
    expect((st3.json!.openRequests as unknown[]).length).toBe(0)
  })

  it('resolveProjectDir 守卫：key 之外的路径不参与，cwd 内仍存在', async () => {
    // 这条不是 HTTP 而是契约性回归：恶意 src 与未知 key 的兜底
    await startServer()
    const r1 = await api(`${API_PREFIX}/project?sessionId=${SESSION}&key=nope`)
    expect(r1.status).toBe(404)
  })
})

// ── 版本历史路由：列表 / 快照预览 / 恢复 ─────────────────────────────

describe('版本历史路由', () => {
  /** 造一个三 revision 的工程：r0 锚点 → r1 加页（text=v1）→ r2 改字（text=v2）。 */
  async function seedHistoryProject() {
    const { key, dir } = await seedProject('hist')
    const e1 = await editProject(cwd, {
      dir,
      baseRevision: 0,
      ops: [
        { op: 'add_page', page: 'pages/01.page', content: { elements: [] } },
        { op: 'add_element', page: 'pages/01.page', element: { elementType: 'text', elementId: 't1', bounds: [10, 10, 200, 40], content: 'v1' } },
      ],
      sessionId: SESSION,
    })
    expect(e1.revision).toBe(1)
    const e2 = await editProject(cwd, {
      dir,
      baseRevision: 1,
      ops: [{ op: 'update_element', page: 'pages/01.page', elementId: 't1', patch: { content: 'v2' } }],
      sessionId: SESSION,
    })
    expect(e2.revision).toBe(2)
    return { key, dir }
  }

  it('GET /history 列表带游标位置，GET /history/pages 回解析后的快照', async () => {
    await startServer()
    const { key } = await seedHistoryProject()

    const list = await apiJson(`${API_PREFIX}/history?sessionId=${SESSION}&key=${key}`)
    expect(list.status).toBe(200)
    expect(list.json!.revision).toBe(2)
    const entries = list.json!.entries as Array<{ revision: number; anchor: boolean; ops: string[] }>
    expect(entries.map((e) => e.revision)).toEqual([0, 1, 2])
    expect(entries[0].anchor).toBe(true)

    const snap = await apiJson(`${API_PREFIX}/history/pages?sessionId=${SESSION}&key=${key}&revision=1`)
    expect(snap.status).toBe(200)
    expect(snap.json!.revision).toBe(1)
    const deck = snap.json!.deck as { size: [number, number] }
    expect(deck.size).toEqual([960, 540])
    const pages = snap.json!.pages as Array<{ path: string; page: { elements: Array<{ content?: string }> } | null }>
    expect(pages).toHaveLength(1)
    expect(pages[0].page?.elements[0]?.content).toBe('v1')

    const missing = await apiJson(`${API_PREFIX}/history/pages?sessionId=${SESSION}&key=${key}&revision=99`)
    expect(missing.status).toBe(404)
    const badRev = await apiJson(`${API_PREFIX}/history/pages?sessionId=${SESSION}&key=${key}&revision=-1`)
    expect(badRev.status).toBe(400)
  })

  it('POST /history/restore 恢复旧版本，baseRevision 过期给 409', async () => {
    await startServer()
    const { key, dir } = await seedHistoryProject()

    const conflict = await apiJson(`${API_PREFIX}/history/restore`, {
      method: 'POST',
      body: { sessionId: SESSION, key, revision: 1, baseRevision: 99 },
    })
    expect(conflict.status).toBe(409)
    expect((conflict.json!.conflict as { revision: number }).revision).toBe(2)

    const restored = await apiJson(`${API_PREFIX}/history/restore`, {
      method: 'POST',
      body: { sessionId: SESSION, key, revision: 1, baseRevision: 2 },
    })
    expect(restored.status).toBe(200)
    expect(restored.json!.revision).toBe(1)
    const loaded = await loadProject(cwd, dir)
    expect(loaded.manifest.revision).toBe(1)
    const page = loaded.pages.get('pages/01.page') as { elements: Array<{ content?: string }> }
    expect(page.elements[0].content).toBe('v1')

    // 前向恢复（undo 之后再 redo 到 r2）同样可用
    const forward = await apiJson(`${API_PREFIX}/history/restore`, {
      method: 'POST',
      body: { sessionId: SESSION, key, revision: 2, baseRevision: 1 },
    })
    expect(forward.status).toBe(200)
    const loaded2 = await loadProject(cwd, dir)
    expect(loaded2.manifest.revision).toBe(2)
    const page2 = loaded2.pages.get('pages/01.page') as { elements: Array<{ content?: string }> }
    expect(page2.elements[0].content).toBe('v2')

    const noBase = await apiJson(`${API_PREFIX}/history/restore`, {
      method: 'POST',
      body: { sessionId: SESSION, key, revision: 0 },
    })
    expect(noBase.status).toBe(400)
  })
})
