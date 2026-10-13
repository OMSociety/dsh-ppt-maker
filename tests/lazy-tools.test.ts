/**
 * lazy-tools 单测：懒展开的三条进场通道（tools/result 直挂、session/event
 * 逐事件折叠、session/created + 启动全量扫描）、失败重试与拆卸。
 * 宿主全部为结构型 stub，不碰真实 cordis。
 */
import { describe, expect, it } from 'vitest'
import { armLazyTools, skillNameOf } from '../src/lazy-tools.js'

type Handler = (...args: never[]) => void

function makeHost(sessions: unknown[] = []) {
  const handlers = new Map<string, Handler[]>()
  const registered: string[] = []
  const fire = (event: string, ...args: never[]) => {
    for (const h of [...(handlers.get(event) ?? [])]) h(...args)
  }
  const ctx = {
    on: (event: string, handler: Handler) => {
      const list = handlers.get(event) ?? []
      list.push(handler)
      handlers.set(event, list)
      return () => {
        const i = (handlers.get(event) ?? []).indexOf(handler)
        if (i >= 0) handlers.get(event)!.splice(i, 1)
      }
    },
    get: (name: string) => (name === 'sessions' ? { list: () => sessions } : undefined),
    logger: { warn: () => {} }
  }
  return { ctx, fire, registered }
}

const skillOk = { name: 'skill', arguments: { name: 'ppt-maker' } }

describe('skillNameOf', () => {
  it('对象与 JSON 串两种参数形态都解析', () => {
    expect(skillNameOf({ name: 'ppt-maker' })).toBe('ppt-maker')
    expect(skillNameOf('{"name":"ppt-maker"}')).toBe('ppt-maker')
    expect(skillNameOf('not json')).toBeUndefined()
    expect(skillNameOf({})).toBeUndefined()
  })
})

describe('armLazyTools', () => {
  it('tools/result：目标技能成功才展开；失败/别的技能不展开；幂等', () => {
    const { ctx, fire, registered } = makeHost()
    armLazyTools(ctx, registerSuiteStub(registered))
    fire('tools/result', { name: 'skill', arguments: { name: 'other' } } as never, { isError: false } as never)
    expect(registered).toEqual([])
    fire('tools/result', skillOk as never, { isError: true } as never)
    expect(registered).toEqual([])
    fire('tools/result', skillOk as never, { isError: false } as never)
    fire('tools/result', skillOk as never, { isError: false } as never)
    expect(registered).toEqual(['suite'])
  })

  it('session/event：tool/call→tool/result 成对折叠后展开', () => {
    const { ctx, fire, registered } = makeHost()
    armLazyTools(ctx, registerSuiteStub(registered))
    const session = { events: [] }
    fire('session/created', session as never)
    expect(registered).toEqual([])
    fire('session/event', session as never, { type: 'tool/call', data: { name: 'skill', arguments: '{"name":"ppt-maker"}', callId: 'c1' } } as never)
    expect(registered).toEqual([])
    fire(
      'session/event',
      session as never,
      { type: 'tool/result', data: { message: { callId: 'c1', isError: false } } } as never
    )
    expect(registered).toEqual(['suite'])
  })

  it('session/event：user/message 的 skill-invocation 直接展开', () => {
    const { ctx, fire, registered } = makeHost()
    armLazyTools(ctx, registerSuiteStub(registered))
    fire(
      'session/event',
      null as never,
      { type: 'user/message', data: { source: { kind: 'skill-invocation', name: 'ppt-maker' } } } as never
    )
    expect(registered).toEqual(['suite'])
  })

  it('启动全量扫描：历史里已成功 invoke 的老会话 → 立即展开', () => {
    const session = {
      snapshotEvents: () => [
        { type: 'user/message', data: { source: { kind: 'skill-invocation', name: 'ppt-maker' } } }
      ]
    }
    const { ctx, registered } = makeHost([session])
    armLazyTools(ctx, registerSuiteStub(registered))
    expect(registered).toEqual(['suite'])
  })

  it('注册失败置 revealPending：下个 turn/start 重试', () => {
    const { ctx, fire, registered } = makeHost()
    let fail = true
    armLazyTools(ctx, () => {
      if (fail) throw new Error('boom')
      registered.push('suite')
      return () => {}
    })
    fire('tools/result', skillOk as never, { isError: false } as never)
    expect(registered).toEqual([])
    fail = false
    fire('session/event', null as never, { type: 'turn/start' } as never)
    expect(registered).toEqual(['suite'])
  })

  it('disposer：拆监听器并注销已展开的工具组', () => {
    const { ctx, fire, registered } = makeHost()
    const disarm = armLazyTools(ctx, registerSuiteStub(registered))
    fire('tools/result', skillOk as never, { isError: false } as never)
    expect(registered).toEqual(['suite'])
    disarm()
    expect(registered).toEqual(['suite', 'disposed'])
    disarm()
    fire('tools/result', skillOk as never, { isError: false } as never)
    expect(registered).toEqual(['suite', 'disposed'])
  })
})

function registerSuiteStub(registered: string[]) {
  return () => {
    registered.push('suite')
    return () => {
      registered.push('disposed')
    }
  }
}
