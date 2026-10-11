/**
 * `/ppt-maker/api/*` HTTP 路由：浏览器侧唯一的读写入口（PR2 计划 §7，轨迹对齐
 * fishpai 的 plugin/host/routes.mjs——那份是本任务口径的仲裁参考）。
 *
 * 安全边界（浏览器与文件系统之间唯一的一道门）：
 *   1. **同源校验**（sameOrigin，逐字口径对齐 fishpai）：拒 `sec-fetch-site: cross-site`、
 *      `Host` 归一后必须环路字面量、拒 `Origin: null`、比 `Origin.host === Host.host`。
 *      写方法额外要求 `content-type: application/json`（415）。
 *   2. **只认 key，不认路径**：客户端传 per-session store 登记过的工程 key，宿主自己
 *      查出工程目录，再交给 `src/core/project/store.ts` 的 `resolveProjectDir` 复检
 *      ——必须落在 `sessions.get(sessionId).header.cwd` 内，缺失报错、绝不回落 `process.cwd()`。
 *   3. **revision 守卫**：写必须带 `baseRevision`（数字），缺/非法 400、不匹配 409
 *      （`ProjectError.status` 的归一映射）；绝不静默覆盖人的手改。
 *   4. **MAX_BODY = 8MB 流式**：超限回 413（超限后继续把流读干，413 才回得出去）。
 *
 * 状态码：413 请求体超限 / 404 找不到（工程、页、素材）/ 409 `ProjectError.status`
 * 覆盖层（RevisionMismatch / SnapshotUnavailable / SchemaBlockers / …）/
 * 415 写方法没带 `application/json` / 403 跨站 / 400 其余参数与状态错误。
 * 二进制一律 `res.writeHead(200, {content-type}) + res.end(bytes)`。
 */
import fsp from 'node:fs/promises'
import path from 'node:path'

import * as sessionStore from './store.mjs'

export const API_PREFIX = '/ppt-maker/api'

const MAX_BODY = 8 * 1024 * 1024

/** 上传素材的单张上限（口径对齐 fishpai 的 MAX_ASSET_BYTES）。 */
export const MAX_ASSET_BYTES = 5 * 1024 * 1024

/* ------------------------------------------------------------------ *
 * Core 依赖注入（PR1 冻结面由 src/index.ts 接线时传入；路由层自己不 import lib）
 *
 * PR2 纪律：路由工厂只接受 `deps.core`——那一份由整合任务（task-6）在
 * `src/index.ts` `apply(ctx)` 里接 src/core/project/store.ts / export-pipeline.ts
 * 的命名出口。宿主路由层绝不打开 `lib/` 产物（依赖打包形态、违背 PR1 的"工具层层
 * 面透明"契约）；测试里直接注入 src 的命名导入，由 vite-node 跑 ts。
 * ------------------------------------------------------------------ */

/**
 * @typedef {object} CoreSurface
 * @property {(cwd: string, dir: string) => Promise<import('../../src/core/project/store.js').LoadedProject>} loadProject
 * @property {(cwd: string, options: object) => Promise<object>} editProject
 * @property {(cwd: string, dir: string, steps?: number) => Promise<object>} undoProject
 * @property {(cwd: string, dir: string, steps?: number) => Promise<object>} redoProject
 * @property {(cwd: string, dir: string) => Promise<object>} buildProjectDeck
 * @property {(pipeline: object) => Promise<Uint8Array>} saveProjectPptx
 * @property {(cwd: string, dir: string, report: unknown) => Promise<void>} writeExportReport
 * @property {new (...args: unknown[]) => Error & { status?: number }} ProjectError
 */

/* ------------------------------------------------------------------ *
 * libreoffice-kit：/thumb 默认用 createConverter；测试里可经 deps.createConverter 换桩
 * ------------------------------------------------------------------ */

let lazyLibreOfficeKit = null

async function libreofficeKit() {
  if (lazyLibreOfficeKit) return lazyLibreOfficeKit
  lazyLibreOfficeKit = await import('@deepseek-ai/libreoffice-kit')
  return lazyLibreOfficeKit
}

/* ------------------------------------------------------------------ *
 * 通用响应帮手
 * ------------------------------------------------------------------ */

function json(res, code, payload) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

function fail(res, code, message) {
  json(res, code, { ok: false, error: message })
}

/* ------------------------------------------------------------------ *
 * sameOrigin —— 逐字口径照抄 fishpai
 * ------------------------------------------------------------------ */

function parseAuthority(authority) {
  try {
    return new URL(`http://${authority}`)
  } catch {
    return undefined
  }
}

function isLoopbackHostname(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4 && parts[0] === '127' && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
}

export function sameOrigin(req) {
  const host = req.headers && req.headers.host
  if (!host) return false
  if (String(req.headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') return false
  const hostUrl = parseAuthority(host)
  if (hostUrl === undefined) return false
  if (!isLoopbackHostname(hostUrl.hostname)) return false
  const origin = req.headers.origin
  if (origin === undefined) return true
  if (origin === 'null') return false
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ *
 * readBody —— 8MB 上限、流式；超限继续读干，好让 413 回得出去（fishpai 口径）
 * ------------------------------------------------------------------ */

export class OversizeError extends Error {
  constructor() {
    super(`请求体超过 ${Math.round(MAX_BODY / 1024 / 1024)}MB 上限`)
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let overflowed = false
    req.on('data', (c) => {
      if (overflowed) return // 超限后继续把流读干，好让 413 有机会回出去
      size += c.length
      if (size > MAX_BODY) {
        overflowed = true
        chunks.length = 0
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (overflowed) return reject(new OversizeError())
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(new Error(`请求体不是合法 JSON：${error.message}`))
      }
    })
    req.on('error', reject)
  })
}

/* ------------------------------------------------------------------ *
 * 工程键 → 工程出处
 * ------------------------------------------------------------------ */

function missingKeyError(key) {
  const err = new Error(`没有这个工程：${key}`)
  err.status = 404
  return err
}

/** key → { dir, abs }；key 不存在由路由层归一到 404（`error.status` 被接住）。 */
function projectOf(ss, sessionId, cwd, key) {
  if (!key) {
    const err = new Error('缺少 key')
    err.status = 400
    throw err
  }
  const hit = ss.resolveProject(sessionId, cwd, key)
  if (!hit) throw missingKeyError(key)
  return hit
}

/* ------------------------------------------------------------------ *
 * createApiHandler
 * ------------------------------------------------------------------ */

/**
 * @param {{
 *   resolveCwd: (sessionId: string) => string | null,
 *   log?: (msg: string) => void,
 *   core: CoreSurface,
 *   createConverter?: () => Promise<{ renderImages(req: object): Promise<object>, dispose(): Promise<void> }>,
 *   sessionStore?: typeof sessionStore,
 * }} deps
 */
export function createApiHandler({ resolveCwd, log = () => {}, core, createConverter, sessionStore: storeOverride } = {}) {
  if (!core || typeof core.editProject !== 'function' || typeof core.loadProject !== 'function') {
    throw new Error('createApiHandler 需要 deps.core（{ loadProject, editProject, undoProject, redoProject, buildProjectDeck, saveProjectPptx, writeExportReport, ProjectError }）')
  }
  const { editProject, loadProject, undoProject, redoProject, buildProjectDeck, saveProjectPptx, writeExportReport, ProjectError } = core
  const ss = storeOverride || sessionStore

  function sessionOf(source, url) {
    const sessionId = String(source.sessionId || url.searchParams.get('sessionId') || '')
    if (!sessionId) {
      const err = new Error('缺少 sessionId')
      err.status = 400
      throw err
    }
    const cwd = resolveCwd(sessionId)
    if (!cwd) {
      const err = new Error(`无法解析会话工作目录：${sessionId}`)
      err.status = 400
      throw err
    }
    return { sessionId, cwd }
  }

  const thumbDir = (abs, revision) => path.join(abs, '.thumb-cache', `r${String(revision).padStart(4, '0')}`)

  return async function handle(req, res) {
    if (!sameOrigin(req)) return fail(res, 403, '拒绝跨站请求')
    const url = new URL(req.url || '/', 'http://localhost')
    const route = `${req.method} ${url.pathname.slice(API_PREFIX.length)}`

    try {
      if (route === 'GET /state') {
        const { sessionId, cwd } = sessionOf({}, url)
        const projects = ss.listSessionProjects(sessionId)
        const activeKey = ss.activeKey(sessionId)
        let manifest = null
        if (activeKey) {
          const hit = ss.resolveProject(sessionId, cwd, activeKey)
          if (hit) {
            try {
              const loaded = await loadProject(cwd, hit.dir)
              manifest = {
                revision: loaded.manifest.revision,
                title: loaded.deck.title ?? null,
                designSystem: loaded.manifest.designSystem ?? null,
                theme: loaded.manifest.theme ?? null,
                pageCount: loaded.deck.pages.length,
                checksumMismatch: loaded.checksumMismatch,
              }
            } catch {
              manifest = null
            }
          }
        }
        return json(res, 200, {
          ok: true,
          cwd,
          activeKey,
          projects,
          openRequests: ss.pendingOpenRequests(sessionId),
          manifest,
        })
      }

      if (route === 'GET /project') {
        const { sessionId, cwd } = sessionOf({}, url)
        const key = String(url.searchParams.get('key') || '')
        const { dir } = projectOf(ss, sessionId, cwd, key)
        const loaded = await loadProject(cwd, dir)
        return json(res, 200, {
          ok: true,
          key,
          dir,
          revision: loaded.manifest.revision,
          manifest: loaded.manifest,
          deck: loaded.deck,
          pages: loaded.deck.pages.map((rel) => ({ path: rel })),
          issues: loaded.issues,
          checksumMismatch: loaded.checksumMismatch,
        })
      }

      if (route === 'GET /page') {
        const { sessionId, cwd } = sessionOf({}, url)
        const key = String(url.searchParams.get('key') || '')
        const { dir } = projectOf(ss, sessionId, cwd, key)
        const pagePath = String(url.searchParams.get('page') || '')
        if (!pagePath) return fail(res, 400, '缺少 page')
        const loaded = await loadProject(cwd, dir)
        const page = loaded.pages.get(pagePath.replace(/\\/g, '/'))
        if (!page) return fail(res, 404, `页不存在：${pagePath}`)
        return json(res, 200, { ok: true, path: pagePath, page, revision: loaded.manifest.revision })
      }

      if (route === 'GET /thumb') {
        const { sessionId, cwd } = sessionOf({}, url)
        const hit = projectOf(ss, sessionId, cwd, String(url.searchParams.get('key') || ''))
        const relDir = path.relative(cwd, path.resolve(cwd, hit.dir)).replace(/\\/g, '/')
        const abs = path.resolve(cwd, hit.dir)
        const page = Number(url.searchParams.get('page') || '')
        const revQ = Number(url.searchParams.get('rev') || '')
        if (!Number.isInteger(page) || page < 1) return fail(res, 400, 'page 必须是 ≥1 的整数')
        if (!Number.isInteger(revQ) || revQ < 0) return fail(res, 400, 'rev 必须是 ≥0 的整数')
        const cacheDir = thumbDir(abs, revQ)
        const cached = path.join(cacheDir, `page-${page}.png`)
        try {
          const bytes = await fsp.readFile(cached)
          res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-cache' })
          return res.end(bytes)
        } catch {
          /* 没命中 → 现渲染 */
        }
        const pipeline = await buildProjectDeck(cwd, relDir)
        const bytes = await saveProjectPptx(pipeline)
        const tmpRoot = path.join(abs, '.thumb-cache')
        const tmp = await fsp.mkdtemp(path.join(tmpRoot, 'tmp-'))
        const inputPath = path.join(tmp, 'deck.pptx')
        const outDir = path.join(tmp, 'out')
        await fsp.writeFile(inputPath, bytes)
        const conv = await (createConverter ? createConverter() : (await libreofficeKit()).createConverter())
        try {
          const result = await conv.renderImages({ inputPath, outputDir: outDir, pages: [page], dpi: 96 })
          const img = result.images && result.images[0]
          if (!img) return fail(res, 404, `页 ${page} 渲染不出来`)
          const out = await fsp.readFile(img.path)
          await fsp.mkdir(cacheDir, { recursive: true })
          await fsp.writeFile(cached, out)
          res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-cache' })
          return res.end(out)
        } finally {
          try { await conv.dispose() } catch { /* dispose must not throw */ }
          await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {})
        }
      }

      if (route === 'GET /media') {
        const { sessionId, cwd } = sessionOf({}, url)
        const { abs } = projectOf(ss, sessionId, cwd, String(url.searchParams.get('key') || ''))
        const src = String(url.searchParams.get('src') || '')
        if (!src) return fail(res, 400, '缺少 src')
        const norm = src.replace(/\\/g, '/')
        const absPath = path.resolve(abs, norm)
        const rel = path.relative(abs, absPath)
        if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return fail(res, 400, `越界：${src}`)
        const ext = path.extname(norm).toLowerCase()
        if (!norm.startsWith('media/')) return fail(res, 400, `素材必须在 media/ 下：${src}`)
        if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) {
          return fail(res, 400, `扩展名不在白名单：${ext || '(无)'}`)
        }
        let bytes
        try {
          bytes = await fsp.readFile(absPath)
        } catch {
          return fail(res, 404, `素材不可读：${src}`)
        }
        const mime = sessionStore.mimeFor(norm) || 'application/octet-stream'
        res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-cache' })
        return res.end(bytes)
      }

      /* ── 写方法：先卡内容类型 ─────────────────────────────── */
      const type = String(req.headers['content-type'] || '')
      if (!type.includes('application/json')) return fail(res, 415, '写操作必须使用 application/json')
      const body = await readBody(req)

      if (route === 'POST /edit') {
        const { sessionId, cwd } = sessionOf(body, url)
        const key = String(body.key || '')
        const { dir } = projectOf(ss, sessionId, cwd, key)
        // 版本号在路由层先卡类型：缺失或不合理是调用方的编程错误，给 400 比进 409 更好读。
        // 真正的不覆盖保证在 src/core/project/store.ts 的 editProject（baseRevision 不匹配就 409）。
        if (body.baseRevision === undefined || body.baseRevision === null) {
          return fail(res, 400, '写入必须带 baseRevision（面板版本过旧时刷新页面）')
        }
        if (typeof body.baseRevision !== 'number' || !Number.isFinite(body.baseRevision)) {
          return fail(res, 400, 'baseRevision 必须是数字')
        }
        const result = await editProject(cwd, {
          dir,
          ops: Array.isArray(body.ops) ? body.ops : [],
          baseRevision: body.baseRevision,
          sessionId,
        })
        ss.markSeenRevision(sessionId, key, result.revision)
        return json(res, 200, {
          ok: true,
          revision: result.revision,
          appliedOps: result.appliedOps,
          warnings: result.warnings,
          merged: result.merged,
        })
      }

      if (route === 'POST /undo' || route === 'POST /redo') {
        const { sessionId, cwd } = sessionOf(body, url)
        const key = String(body.key || '')
        const { dir } = projectOf(ss, sessionId, cwd, key)
        const steps = Number(body.steps ?? 1)
        const fn = route === 'POST /undo' ? undoProject : redoProject
        const result = await fn(cwd, dir, steps)
        ss.markSeenRevision(sessionId, key, result.revision)
        return json(res, 200, { ok: true, revision: result.revision, undoneOps: result.undoneOps, warnings: result.warnings })
      }

      if (route === 'POST /media/upload') {
        const { sessionId, cwd } = sessionOf(body, url)
        const key = String(body.key || '')
        const { abs } = projectOf(ss, sessionId, cwd, key)
        return saveMedia({ abs, key, body, res })
      }

      if (route === 'POST /export') {
        const { sessionId, cwd } = sessionOf(body, url)
        const key = String(body.key || '')
        const { dir } = projectOf(ss, sessionId, cwd, key)
        const pipeline = await buildProjectDeck(cwd, dir)
        const bytes = await saveProjectPptx(pipeline)
        await writeExportReport(cwd, dir, {
          kind: 'browser-export',
          at: new Date().toISOString(),
          revision: pipeline.revision,
          issues: pipeline.issues ?? pipeline.buildWarnings ?? null,
        })
        ss.markSeenRevision(sessionId, key, pipeline.revision)
        res.writeHead(200, {
          'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'content-disposition': 'attachment; filename="deck.pptx"',
          'cache-control': 'no-store',
        })
        return res.end(Buffer.from(bytes))
      }

      if (route === 'POST /active') {
        const { sessionId, cwd } = sessionOf(body, url)
        const key = String(body.key || '')
        if (!ss.resolveProject(sessionId, cwd, key)) return fail(res, 404, `没有这个工程：${key}`)
        ss.setActive(sessionId, key)
        return json(res, 200, { ok: true, key })
      }

      if (route === 'POST /tab-opened') {
        const { sessionId, cwd } = sessionOf(body, url)
        const key = String(body.key || '')
        if (!ss.resolveProject(sessionId, cwd, key)) return fail(res, 404, `没有这个工程：${key}`)
        ss.consumeOpenRequest(sessionId, key)
        ss.setActive(sessionId, key)
        return json(res, 200, { ok: true })
      }

      return fail(res, 404, `未知接口：${route}`)
    } catch (error) {
      const message = error && error.message ? error.message : String(error)
      log(`[ppt-maker] ${route} 失败: ${message}`)
      if (error instanceof OversizeError) return fail(res, 413, message)
      if (error instanceof ProjectError && typeof error.status === 'number') return fail(res, error.status, error.message)
      if (typeof error === 'object' && error !== null && typeof error.status === 'number' && error.status >= 400 && error.status < 600) {
        return fail(res, error.status, message)
      }
      return fail(res, 400, message)
    }
  }
}

/**
 * POST /media/upload 的实现（口径对齐 fishpai 的 saveAsset）：
 * 文件名由宿主按 MIME 白名单 + 时间戳生成；客户端给的名字只当一段可读词、不参与路径拼接。
 * 落点在工程目录的 `media/`；守卫必须在落盘之前（resolveInCwd 等价物的 cwd 内白名单判）。
 */
async function saveMedia({ abs, key, body, res }) {
  const buf = Buffer.from(String(body.data || ''), 'base64')
  if (!buf.length) return fail(res, 400, '素材内容为空')
  if (buf.length > MAX_ASSET_BYTES) {
    return fail(res, 413, `素材 ${(buf.length / 1024 / 1024).toFixed(1)}MB，超过 ${Math.round(MAX_ASSET_BYTES / 1024 / 1024)}MB 上限`)
  }
  const mime = String(body.mime || '').toLowerCase()
  const extByMime =
    mime === 'image/png' ? '.png'
    : mime === 'image/jpeg' || mime === 'image/jpg' ? '.jpg'
    : mime === 'image/gif' ? '.gif'
    : mime === 'image/webp' ? '.webp'
    : mime === 'image/bmp' ? '.bmp'
    : null
  const UPLOAD_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']
  const ext = extByMime || (UPLOAD_EXTS.includes(path.extname(String(body.name || '')).toLowerCase()) ? path.extname(String(body.name || '')).toLowerCase() : null)
  if (!ext) return fail(res, 415, '只支持 PNG / JPEG / GIF / WebP / BMP 图片')
  const stem = String(body.name || 'paste')
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|#\s -\u007f]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'paste'
  const stamp = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const base = `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}-${stem}`
  const target = path.join(abs, 'media', `${base}${ext}`)
  const rel = path.relative(abs, target).replace(/\\/g, '/')
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    return fail(res, 400, '落盘路径越界')
  }
  await fsp.mkdir(path.dirname(target), { recursive: true })
  await fsp.writeFile(target, buf)
  return json(res, 200, { ok: true, key, src: `media/${path.basename(target)}`, path: target, bytes: buf.length })
}
