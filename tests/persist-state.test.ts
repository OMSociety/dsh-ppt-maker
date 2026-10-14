/**
 * 「记住上次打开的工程」持久化测试：
 *  - registerProject / setActive 会把会话状态落盘（DSH_HOME 指向临时目录，不碰真实状态）
 *  - 内存清空（模拟宿主重启）后，首次访问该会话即从磁盘恢复 activeKey + projects
 *  - 恢复的 key 能 resolveProject 找回目录
 *  - setActive(null) 持久化「无当前工程」，重启后不再自动打开
 *  - state.json 损坏时 loadState 按空起步，不炸
 */
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as sessionStore from '../plugin/host/store.mjs'
import { loadSession, loadState, saveSession, stateFile } from '../plugin/host/state-store.mjs'

const SESSION = 's-persist'
let home: string
let cwd: string

beforeEach(async () => {
  home = await mkdtemp(path.join(tmpdir(), 'ppt-persist-home-'))
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-persist-cwd-'))
  vi.stubEnv('DSH_HOME', home)
  sessionStore.__clearAllSessionsForTest()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(home, { recursive: true, force: true })
  await rm(cwd, { recursive: true, force: true })
})

describe('state-store.mjs 读写', () => {
  it('saveSession/loadSession 往返一致', () => {
    saveSession(SESSION, { activeKey: 'k1', projects: { k1: 'proj-a', k2: 'proj-b' } })
    const got = loadSession(SESSION)
    expect(got).toEqual({ activeKey: 'k1', projects: { k1: 'proj-a', k2: 'proj-b' } })
  })

  it('activeKey 为 null 也落盘', () => {
    saveSession(SESSION, { activeKey: null, projects: { k1: 'proj-a' } })
    expect(loadSession(SESSION)?.activeKey).toBeNull()
  })

  it('文件损坏 / 不存在时按空状态起步', async () => {
    expect(loadState()).toEqual({ sessions: {} })
    await mkdir(path.dirname(stateFile()), { recursive: true })
    await writeFile(stateFile(), '{ not json !!!', 'utf8')
    expect(loadState()).toEqual({ sessions: {} })
    expect(loadSession(SESSION)).toBeNull()
  })
})

describe('store.mjs 跨重启恢复', () => {
  it('registerProject 落盘 → 清空内存 → 再次访问自动恢复', () => {
    const a = sessionStore.registerProject(SESSION, cwd, 'proj-a')
    const b = sessionStore.registerProject(SESSION, cwd, 'proj-b')

    // 模拟重启：进程内会话全清
    sessionStore.__clearAllSessionsForTest()

    // 首次经登记入口访问 → 恢复出两个工程，当前是最后登记的 proj-b
    const again = sessionStore.registerProject(SESSION, cwd, 'proj-b')
    const projects = sessionStore.listSessionProjects(SESSION)
    expect(projects.map((p) => p.key).sort()).toEqual([a.key, b.key].sort())
    expect(sessionStore.activeKey(SESSION)).toBe(again.key)
  })

  it('恢复的 key 能 resolveProject 找回目录', () => {
    const a = sessionStore.registerProject(SESSION, cwd, 'proj-a')
    sessionStore.__clearAllSessionsForTest()
    // setActive 是 ensureSession 系入口：触发恢复且不动 projects
    sessionStore.setActive(SESSION, a.key)
    const hit = sessionStore.resolveProject(SESSION, cwd, a.key)
    expect(hit).not.toBeNull()
    expect(hit!.dir).toBe('proj-a')
    expect(sessionStore.activeKey(SESSION)).toBe(a.key)
  })

  it('setActive(null) 落盘「关闭当前工程」', () => {
    sessionStore.registerProject(SESSION, cwd, 'proj-a')
    sessionStore.setActive(SESSION, null)
    const saved = loadSession(SESSION)
    expect(saved?.activeKey).toBeNull()
    // projects 表仍在——重开工程不用重新登记
    expect(Object.values(saved?.projects ?? {})).toContain('proj-a')
  })

  it('内存已有会话时不被磁盘旧记录覆盖（以内存为准）', () => {
    sessionStore.registerProject(SESSION, cwd, 'proj-a')
    // 磁盘被外部改成指向 proj-b
    saveSession(SESSION, { activeKey: 'fake', projects: { fake: 'proj-b' } })
    expect(sessionStore.activeKey(SESSION)).not.toBe('fake')
  })
})
