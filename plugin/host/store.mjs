/**
 * Per-session 工程 store：`/ppt-maker/api/*` 与模型工具（PR2 S3）共用的内存状态。
 *
 * 形态（PR2 计划 §4，逐字口径对齐 fishpai 的 requestOpen / consumeOpenRequest /
 * pendingOpenRequest）：
 *   Map<sessionId, {
 *     projects: Map<key, dir>,   // 本会话登记过的工程（key → 相对/工程目录写法）
 *     activeKey: string|null,
 *     lastSeenRevision: Map<key, number>,  // 该会话各工程最后一次确认过的 revision
 *     openRequests: Map<key, at>,          // 宿主 → 客户端的唯一推送手段（TTL 60s）
 *   }>
 *
 * 工程键：`key = sha1(cwd + 解析后的绝对工程目录)[:12]`——只认 key 不认路径：
 * 客户端传这个会话登记表里的键，宿主自己查出工程目录，再交给 src/core/project/store.ts
 * 的 `resolveProjectDir` 复检（必须落在会话 cwd 内）。跨会话读要先知道对方的
 * sessionId **与** key；本机单用户场景下这条不是授权边界，同源校验才是（见 routes.mjs）。
 *
 * openRequests 的 shape 由整合任务的消费方（/state、/tab-opened）决定，这里照抄
 * fishpai 的三件套：request 写时间戳、consume 读了就删、pending 只认 60s 内未过期的。
 */
import { createHash } from 'node:crypto'
import path from 'node:path'

/** 打开请求的有效期：面板的轮询节奏下 60s 足够，超时等于面板根本没开。 */
export const OPEN_TTL_MS = 60_000

/** 上传素材的扩展名白名单（与 fishpai 的 UPLOAD_EXTS 同口径：只收栅格图，不收 svg）。 */
export const MEDIA_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
}

export function mimeFor(name) {
  return MIME_BY_EXT[path.extname(String(name || '')).toLowerCase()] || null
}

const sessions = new Map()

/** 取（或建）一个会话的登记簿。 */
export function ensureSession(sessionId) {
  const id = String(sessionId || '')
  if (!id) throw new Error('缺少 sessionId')
  let record = sessions.get(id)
  if (!record) {
    record = { projects: new Map(), activeKey: null, lastSeenRevision: new Map(), openRequests: new Map() }
    sessions.set(id, record)
  }
  return record
}

/**
 * 会话 → 工程键。同一会话、同一 cwd 下对同一目录的重复登记落到同一个 key，
 * 于是「打开两次」是幂等的。
 */
export function projectKey(cwd, dir) {
  const abs = path.resolve(String(cwd || ''), String(dir || ''))
  return createHash('sha1').update(`${path.resolve(String(cwd || ''))}\n${abs}`).digest('hex').slice(0, 12)
}

/**
 * 登记一个工程（幂等）：写进该会话的项目表并置为当前。
 * @returns {{key: string, dir: string}}
 */
export function registerProject(sessionId, cwd, dir) {
  const record = ensureSession(sessionId)
  const key = projectKey(cwd, dir)
  record.projects.set(key, String(dir))
  record.activeKey = key
  return { key, dir: String(dir) }
}

/** 按 key 取工程目录；未知会话或未知 key 都返回 null（路由层据此回 404）。 */
export function resolveProject(sessionId, cwd, key) {
  const record = sessions.get(String(sessionId || ''))
  if (!record) return null
  const entry = record.projects.get(String(key || ''))
  if (typeof entry !== 'string' || entry === '') return null
  // 只看登记表还不够：这条路径最终进 resolveProjectDir（src/core/project/store.ts），
  // 那里才是真正的"必须落在会话 cwd 内"守卫。
  return { dir: entry, abs: path.resolve(String(cwd || ''), entry) }
}

/** 列出本会话登记过的工程。 */
export function listSessionProjects(sessionId) {
  const record = sessions.get(String(sessionId || ''))
  if (!record) return []
  return [...record.projects.entries()].map(([key, dir]) => ({ key, dir }))
}

export function setActive(sessionId, key) {
  const record = ensureSession(sessionId)
  record.activeKey = String(key || '') || null
}

export function activeKey(sessionId) {
  const record = sessions.get(String(sessionId || ''))
  return record ? record.activeKey : null
}

/**
 * 「外部已修改」判据的基石：面板每次成功同步后把已见 revision 记在这里；
 * 「有未提交草稿 vs 磁盘 revision 前进」的提示条依据来自它。
 */
export function markSeenRevision(sessionId, key, revision) {
  const record = ensureSession(sessionId)
  record.lastSeenRevision.set(String(key || ''), Number(revision))
}

export function seenRevision(sessionId, key) {
  const record = sessions.get(String(sessionId || ''))
  if (!record) return null
  const rev = record.lastSeenRevision.get(String(key || ''))
  return typeof rev === 'number' ? rev : null
}

// ── 打开请求（宿主 → 客户端的唯一推送手段）─────────────────────

export function requestOpen(sessionId, key) {
  const record = ensureSession(sessionId)
  const at = Date.now()
  record.openRequests.set(String(key || ''), at)
  return at
}

export function consumeOpenRequest(sessionId, key) {
  const record = sessions.get(String(sessionId || ''))
  if (!record) return false
  const k = String(key || '')
  if (!record.openRequests.has(k)) return false
  record.openRequests.delete(k)
  return true
}

/** 未过期的打开请求：回 `[{key, at}]`（与 fishpai 同口径——只认 TTL 60s 内的）。 */
export function pendingOpenRequests(sessionId) {
  const record = sessions.get(String(sessionId || ''))
  if (!record) return []
  const now = Date.now()
  const out = []
  // 顺手清掉过期的，免得登记簿只涨不落
  for (const [key, at] of record.openRequests) {
    if (now - at < OPEN_TTL_MS) out.push({ key, at })
    else record.openRequests.delete(key)
  }
  return out
}

