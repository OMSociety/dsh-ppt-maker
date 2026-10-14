/**
 * 工作台「记住上次打开的工程」的磁盘状态。
 *
 * 形态：`~/.dsh/dsh-ppt-maker/state.json`
 *   { "sessions": { "<sessionId>": { "activeKey": "…", "projects": { "<key>": "<dir>" } } } }
 *
 * 设计要点：
 *   - 原子写（tmp + rename）：宿主崩溃不会留半截 JSON。
 *   - 读损坏容忍：JSON 坏了按空状态起步，不炸启动。
 *   - 目录不存在则惰性建。写失败只 log 不影响主流程（状态记忆是锦上添花）。
 *   - 只记「会话登记过哪些工程 + 当前活动工程」；revision / openRequests 等易变
 *     状态刻意不持久化——重启后 revision 以磁盘 manifest 为准，openRequests
 *     是 TTL 60s 的推送通道，本就不该跨重启存活。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

function stateDir() {
  const base = process.env.DSH_HOME || path.join(homedir(), '.dsh')
  return path.join(base, 'dsh-ppt-maker')
}

export function stateFile() {
  return path.join(stateDir(), 'state.json')
}

/** @returns {{ sessions: Record<string, { activeKey: string|null, projects: Record<string, string> }> }} */
export function loadState() {
  try {
    const raw = readFileSync(stateFile(), 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.sessions || typeof parsed.sessions !== 'object') {
      return { sessions: {} }
    }
    return { sessions: parsed.sessions }
  } catch {
    // 不存在 / 损坏 / 权限问题：一律按空起步
    return { sessions: {} }
  }
}

/** 原子落盘；失败抛给调用方（调用方决定 log 还是吞）。 */
export function saveState(state) {
  mkdirSync(stateDir(), { recursive: true })
  const tmp = stateFile() + '.tmp'
  writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8')
  renameSync(tmp, stateFile())
}

/** 取某会话的持久化记录；没有返回 null。 */
export function loadSession(sessionId) {
  const rec = loadState().sessions[String(sessionId || '')]
  if (!rec || typeof rec !== 'object') return null
  return {
    activeKey: typeof rec.activeKey === 'string' && rec.activeKey ? rec.activeKey : null,
    projects:
      rec.projects && typeof rec.projects === 'object'
        ? Object.fromEntries(Object.entries(rec.projects).filter(([, v]) => typeof v === 'string'))
        : {},
  }
}

/** 写某会话记录（merge 进整体再落盘）。activeKey 为 null 时也写（表达「清空当前工程」）。 */
export function saveSession(sessionId, { activeKey, projects }) {
  const state = loadState()
  state.sessions[String(sessionId || '')] = { activeKey: activeKey ?? null, projects: { ...projects } }
  saveState(state)
}
