/**
 * 客户端与宿主的接口层：全部走 `/ppt-maker/api/*`（同源 fetch）。
 *
 * 对齐 task-2 的宿主路由（plugin/host/routes.mjs）实回包形状：
 *   GET  /state       → {projects[{key,dir}], activeKey, openRequests[], manifest?, cwd, canUndo?, canRedo?}
 *   GET  /project     → {key, dir, revision, manifest, deck, pages[], issues, checksumMismatch}
 *   GET  /page        → {path, page, revision}
 *   GET  /media       → image bytes（?src=media/xx.png）
 *   POST /edit        → {ok, revision, appliedOps, warnings, merged}；409 → ConflictError
 *   POST /undo|redo   → {ok, revision, undoneOps}
 *   POST /media/upload → {ok, src, path, bytes}
 *   POST /export      → pptx 二进制流（走 exportPptx 专门处理，不走 call()）
 *   POST /active      → {ok, key}
 *   POST /tab-opened  → {ok}
 *
 * 409 冲突是**正常返回值**而不是异常（修订号竞争）。
 */

export interface ConflictInfo {
  revision: number
  error?: string
}

export class ConflictError extends Error {
  constructor(
    readonly revision: number,
    message?: string,
  ) {
    super(message || `revision 冲突：服务端是 ${revision}`)
    this.name = 'ConflictError'
  }
}

/** per-session store 登记的「key → 相对/工程目录」条目。 */
export interface ProjectEntry {
  key: string
  dir: string
}

/** /state 回包里的 manifest 轮廓（宿主只挑这几栏快速返回）。 */
export interface ManifestOutline {
  revision: number
  title?: string | null
  designSystem?: string | null
  theme?: string | null
  pageCount?: number
  checksumMismatch?: boolean
  /** 撤销/重做可用性（工作台工具栏按钮态；宿主经 core.projectUndoState 给出）。 */
  canUndo?: boolean
  canRedo?: boolean
}

export interface StatePayload {
  cwd: string
  projects: ProjectEntry[]
  activeKey: string | null
  openRequests: Array<{ key: string; at: number }>
  manifest: ManifestOutline | null
  canUndo?: boolean
  canRedo?: boolean
}

export interface ProjectPayload {
  key: string
  dir: string
  revision: number
  manifest: unknown
  /** 整棵 deck；细节由 PPTD 规格兜底（面板只用其中的 size 与 pages[]）。 */
  deck: {
    version: string
    profile?: string
    title?: string
    size: [number, number]
    pages: string[]
    source?: unknown
  }
  pages: Array<{ path: string }>
  issues?: unknown[]
  checksumMismatch?: boolean
}

export interface PagePayload {
  path: string
  /** 单个 .page 解析结果（elements[] / background / layoutRef …）。 */
  page: unknown
  revision: number
}

export interface EditResult {
  revision: number
  appliedOps: string[]
  warnings?: string[]
  merged?: boolean
}

export interface UndoRedoResult {
  revision: number
  undoneOps: string[]
  warnings?: string[]
}

export interface MediaUploadResult {
  src: string
  path: string
  bytes: number
}

const PREFIX = '/ppt-maker/api'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PREFIX}${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json', ...(init?.headers || {}) } : init?.headers,
  })
  let payload: Record<string, unknown> | null = null
  try {
    payload = (await res.json()) as Record<string, unknown> | null
  } catch {
    payload = null
  }
  if (res.status === 409) {
    const info = (payload as { conflict?: ConflictInfo } | null)?.conflict
    const rev = Number(info?.revision ?? payload?.revision ?? 0) || 0
    throw new ConflictError(rev, String(payload?.error ?? ''))
  }
  if (!res.ok || !payload || payload.ok === false) {
    throw new Error(String((payload && payload.error) || `请求失败（HTTP ${res.status}）`))
  }
  return payload as T
}

const q = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

export const api = {
  state: (sessionId: string) => call<{ ok: true } & StatePayload>(`/state?${q({ sessionId })}`),

  tabOpened: (sessionId: string, key: string) =>
    call<{ ok: true }>(`/tab-opened`, { method: 'POST', body: JSON.stringify({ sessionId, key }) }),

  setActive: (sessionId: string, key: string) =>
    call<{ ok: true }>(`/active`, { method: 'POST', body: JSON.stringify({ sessionId, key }) }),

  project: (sessionId: string, key: string) =>
    call<{ ok: true } & ProjectPayload>(`/project?${q({ sessionId, key })}`),

  page: (sessionId: string, key: string, page: string) =>
    call<{ ok: true } & PagePayload>(`/page?${q({ sessionId, key, page })}`),

  edit: (sessionId: string, key: string, baseRevision: number, ops: unknown[]) =>
    call<{ ok: true } & EditResult>(`/edit`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, key, baseRevision, ops }),
    }),

  undo: (sessionId: string, key: string, steps = 1) =>
    call<{ ok: true } & UndoRedoResult>(`/undo`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, key, steps }),
    }),

  redo: (sessionId: string, key: string, steps = 1) =>
    call<{ ok: true } & UndoRedoResult>(`/redo`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, key, steps }),
    }),

  uploadMedia: (sessionId: string, key: string, payload: { name?: string; mime?: string; data: string }) =>
    call<{ ok: true } & MediaUploadResult>(`/media/upload`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, key, ...payload }),
    }),

  mediaUrl: (sessionId: string, key: string, src: string) => `${PREFIX}/media?${q({ sessionId, key, src })}`,

  /**
   * 导出：宿主回的是 .pptx **二进制流**（content-disposition attachment），
   * 不能走 call()——那只会把响应体当 JSON。成功返回 Blob + 可能带上的 X-Revision 头。
   */
  async exportPptx(sessionId: string, key: string): Promise<{ blob: Blob; revision: string | null }> {
    const res = await fetch(`${PREFIX}/export`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, key }),
    })
    if (res.status === 409) {
      const payload = (await res.json().catch(() => null)) as { conflict?: ConflictInfo; error?: string } | null
      throw new ConflictError(Number(payload?.conflict?.revision ?? 0) || 0, payload?.error || '')
    }
    if (!res.ok) {
      let message = `导出失败（HTTP ${res.status}）`
      try {
        const payload = (await res.json()) as { error?: string }
        if (payload?.error) message = payload.error
      } catch {
        /* 无 JSON 用默认文案 */
      }
      throw new Error(message)
    }
    return { blob: await res.blob(), revision: res.headers.get('x-pt-revision') || res.headers.get('x-revision') }
  },
}
