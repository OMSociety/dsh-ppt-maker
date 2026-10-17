/**
 * 客户端 bundle 的形态守卫（`npm run build` 产物 `lib/client.js` 打架了就红）。
 *
 * 这几条一旦破掉，插件在浏览器里会**整块不加载**，而宿主侧测试全绿也发现不了：
 *   1. 产物必须是 `window.__ModuleLoader__.load({ id, factory })` —— DSH 客户端模块系统的唯一形态；
 *   2. factory 只允许 require **平台种子表**里的裸模块（react 系 + cordis + dsh-client-store /
 *      ui-slots / ui-primitives / ui-dockkit），多一个没被 external 掉的依赖就运行时 MODULE_NOT_FOUND；
 *   3. 必须导出 name / inject / apply（Cordis 靠这三个挂载插件）；
 *   4. 在没有右侧栏服务时 apply 也不能抛，并且注册的东西可收回；
 *   5. openRequest 到达时自动 `sidebarRight.openTab('ppt')` 并回 `/tab-opened`；
 *   6. 产物只由本仓库 `client/` 下的源码打包而成（metafile 核对，防 esbuild 静默内联第三方包）。
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const ROOT = path.resolve(__dirname, '..')
const BUNDLE = path.join(ROOT, 'lib', 'client.js')

const BUILD_CLIENT_URL = new URL('../scripts/build-client.mjs', import.meta.url).href

/**
 * factory 允许 require 的 specifier —— 逐字对齐 rc2 的**平台种子表**（`dsh-client-modules`
 * materialize 的那 9 项）。写成通配等于没守：宿主有 280 多个包名，放行全部之后，将来
 * import 一个没被 external 掉的包，测试照样绿、运行时才炸
 * （`client-modules: require("…") missed the module table … a build-time externals drift`）。
 */
const PLATFORM_SEEDS = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
])

/** 允许出现在产物里的 specifier：种子表，外加种子表内包的子路径。 */
function allowedExternal(spec: string) {
  if (PLATFORM_SEEDS.has(spec)) return true
  return [...PLATFORM_SEEDS].some((seed) => spec.startsWith(`${seed}/`))
}

/** 让 vm 里那些 `void tick()` 的异步链跑完（setInterval 回调返回 undefined，await 它没用）。 */
async function flush(times = 4) {
  for (let i = 0; i < times; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

interface LoadOptions {
  services?: Record<string, unknown>
  fetchImpl?: (url: string, init?: unknown) => unknown
}

/** 在独立的 vm realm 里加载 bundle —— 与浏览器一样，它是「另一份全局环境」。 */
function loadBundle(options: LoadOptions = {}) {
  const source = fs.readFileSync(BUNDLE, 'utf8')
  type Registration = { id: string; factory: (requireFn: (spec: string) => unknown) => Record<string, unknown> }
  // 笔录：TS 的闭包 narrowing 看不到 `registration = reg`（被 runInContext 里调用），用 holder 规避
  const holder: { registration: Registration | null } = { registration: null }
  const setRegistration = (reg: Registration) => {
    holder.registration = reg
  }
  const appended: unknown[] = []
  const timers: Array<() => unknown> = []
  const effects: Array<unknown> = []
  const seatHandles: Array<{ disposed: boolean; dispose: () => Promise<void> }> = []
  const registeredTabs: Array<Record<string, unknown>> = []
  const registeredSlots: Array<{ descriptor: Record<string, string>; component: unknown }> = []
  const opened: string[] = []
  const fetchCalls: Array<{ url: string; init?: unknown }> = []

  const documentStub = {
    querySelector: () => null,
    createElement: () => ({
      dataset: {} as Record<string, string>,
      style: {},
      remove() {},
      textContent: '',
    }),
    head: { appendChild: (el: unknown) => appended.push(el) },
    body: { appendChild: () => {}, removeChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    visibilityState: 'visible',
  }

  const slots = {
    inject: (_seat: string, cb: () => unknown) => {
      const dispose = cb()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    register: (descriptor: Record<string, string>, component: unknown) => {
      registeredSlots.push({ descriptor, component })
      return () => {}
    },
  }
  const sidebarRightTabs = {
    register: (definition: Record<string, unknown>) => {
      registeredTabs.push(definition)
      return () => {}
    },
  }
  const sidebarRight = { openTab: (kind: string) => opened.push(kind) }
  const sessions = { list: { getSnapshot: () => ({ current: 's1' }) } }
  const serviceTable: Record<string, unknown> = {
    slots,
    sessions,
    sidebarRightTabs,
    sidebarRight,
    ...(options.services || {}),
  }

  const fakeFetch = async (url: string, init?: unknown) => {
    fetchCalls.push({ url, init })
    const body = options.fetchImpl ? options.fetchImpl(url, init) : { ok: true }
    return { ok: true, status: 200, json: async () => body }
  }

  const sandbox: Record<string, unknown> = {
    console,
    document: documentStub,
    navigator: {},
    fetch: fakeFetch,
    window: {
      __ModuleLoader__: {
        load: (reg: { id: string; factory: unknown }) => {
          setRegistration(reg as unknown as Registration)
        },
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    setInterval: (fn: () => unknown) => {
      timers.push(fn)
      return { id: timers.length }
    },
    clearInterval: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'lib/client.js' })

  const stub = (spec: string) => {
    if (spec === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null, Fragment: Symbol('f') }
    return {
      createElement: () => null,
      useSyncExternalStore: (_sub: unknown, get: () => unknown) => get(),
      useMemo: (fn: () => unknown) => fn(),
      useEffect: () => {},
      useRef: () => ({ current: null }),
      useState: (v: unknown) => [v, () => {}],
      useCallback: (fn: unknown) => fn,
    }
  }

  const registration = holder.registration
  if (!registration) throw new Error('bundle 里没有 window.__ModuleLoader__.load 注册')
  const exports = registration.factory(stub) as Record<string, unknown>

  const ctx = {
    slots,
    effect: (fn: () => unknown) => {
      effects.push(fn())
    },
    inject: (deps: string[], callback: (injectable: unknown) => unknown) => {
      const available = deps.every((d) => serviceTable[d] !== undefined)
      if (available) {
        queueMicrotask(() => {
          const inner = callback({
            get: (key: string) => serviceTable[key],
            ...serviceTable,
          })
          if (typeof inner === 'function') effects.push(inner)
        })
      }
      // cordis 的 fiber.dispose() 是异步的（(): Promise<void>）：这里也必须异步，
      // 否则插件清理链里的 await seatHandle.dispose() 在测试里等于没写。
      const handle = {
        disposed: false,
        async dispose() {
          await new Promise((resolve) => setTimeout(resolve, 0))
          handle.disposed = true
        },
      }
      seatHandles.push(handle)
      return handle
    },
    get: (key: string) => serviceTable[key],
    sessions,
  }

  return {
    registration,
    exports,
    ctx,
    appended,
    timers,
    effects,
    seatHandles,
    registeredTabs,
    registeredSlots,
    opened,
    fetchCalls,
    apply: () => (exports as { apply: (c: unknown) => void }).apply(ctx),
  }
}

describe('客户端 bundle 形态', () => {
  it('以 __ModuleLoader__.load 注册，且 id 与包名一致', () => {
    const { registration } = loadBundle()
    expect(registration!.id).toBe('dsh-ppt-maker')
    expect(typeof registration!.factory).toBe('function')
  })

  it('只 require 平台种子表里的裸模块（逐字核对）', () => {
    const source = fs.readFileSync(BUNDLE, 'utf8')
    const specifiers = new Set([...source.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]))
    for (const spec of specifiers) {
      expect(allowedExternal(spec), `bundle 里有未被 external 的依赖：${spec}`).toBe(true)
    }
    expect(specifiers.has('react'), '应当 require react，而不是把 React 打进来').toBe(true)
    expect(specifiers.has('react/jsx-runtime'), 'jsx automatic 产物应当 require react/jsx-runtime').toBe(true)
    // rc2 官方禁止客户端 bundle 加载 Harness Client 包（practices.md:35）
    const hostPackages = [...specifiers].filter((s) => s.startsWith('@deepseek-ai/'))
    expect(hostPackages, `不该 require Harness Client 包：${hostPackages.join(', ')}`).toEqual([])
    // 产物不得内联字体/图片路径等绝对路径——硬编码会咬用户（工作目录与包目录不同盘就崩）
    for (const absolute of ['D:\\', 'C:\\', '/Users/', 'dsh-fishpai', 'fishpai']) {
      expect(source.includes(absolute), `产物不得出现与别的插件/本机路径相关的字面量 ${absolute}`).toBe(false)
    }
  })

  it('导出 name / inject / apply', () => {
    const { exports } = loadBundle()
    expect(exports.name).toBe('dsh-ppt-maker')
    expect([...(exports.inject as string[])]).toEqual(['slots', 'sessions'])
    expect(typeof exports.apply).toBe('function')
  })

  it('产物必须提交：lib/client.js 是构建产物，改动后须跑 npm run build（本测试就在守它）', async () => {
    // 这条用 esbuild 再跑一次构建，比对落盘产物——不一致即提醒提交产物。
    // 逐字构造结果会带 banner，所以先剥成可比较的干净交集：
    // 产物 xhr 形状（首尾两行 + id 行稳定）+ 内部必须经过 renderBundle 缩进。
    const { bundleClient, renderBundle } = (await import(BUILD_CLIENT_URL)) as {
      bundleClient: () => Promise<{ outputFiles: Array<{ text: string }> }>
      renderBundle: (code: string) => string
    }
    const result = await bundleClient()
    const expected = renderBundle(result.outputFiles[0].text)
    const actual = fs.readFileSync(BUNDLE, 'utf8')
    expect(actual, 'lib/client.js 与 client/ 源码不同步——跑 npm run build 并提交产物').toBe(expected)
  }, 30000)

  it('产物只由本仓库 client/ 的源码打包而成（metafile 挡住 esbuild 静默内联）', async () => {
    // `external` 只挡得住命中的包：不在列表里的第三方包会被 esbuild 直接**内联**进产物，
    // require 表一条不加、体积只多几百字节，上面所有守卫照样全绿。
    // 所以用 esbuild 自己的 metafile 核对输入清单：任何 node_modules 或仓库外路径都当场变红。
    const { bundleClient } = (await import(BUILD_CLIENT_URL)) as {
      bundleClient: (overrides?: Record<string, unknown>) => Promise<{ metafile: { inputs: Record<string, unknown> } }>
    }
    const result = await bundleClient({ metafile: true })
    const inputs = Object.keys(result.metafile.inputs)
    expect(inputs.length, '测试自身写错了：metafile 里没有输入').toBeGreaterThan(0)
    const outside = inputs.filter((input) => {
      const normalized = input.replace(/\\/g, '/')
      return !normalized.startsWith('client/') || normalized.includes('..')
    })
    expect(outside, `这些输入不在本仓库 client/ 下——external 没拦住，代码被静默内联进产物了：${outside.join(', ')}`).toEqual([])
    const foreign = inputs.filter((input) => input.replace(/\\/g, '/').includes('node_modules'))
    expect(foreign, `产物里混进了 node_modules 的代码：${foreign.join(', ')}`).toEqual([])
  }, 30000)

  it('样式只走 --dsw-alias-* 与 --dsw-shadow-*（产物里不得出现旧名 token）', () => {
    const source = fs.readFileSync(BUNDLE, 'utf8')
    expect(source).toContain('--dsw-alias-label-primary')
    expect(source).toContain('--dsw-alias-bg-layer-1')
    expect(source).toContain('--dsw-alias-border-l2')
    expect(source).toContain('--dsw-alias-interactive-bg-hover')
    for (const legacy of ['--dsw-text-secondary', '--dsw-text-primary', '--dsw-bg-', '--dsw-border-default']) {
      expect(source.includes(legacy), `旧名 token ${legacy} 在当前 DSH 里不存在，会出现白块`).toBe(false)
    }
    expect(source.includes('--dsw-font-family'), '字体只走 --dsw-alias-*，别用宿主字体族变量').toBe(false)
  })

  it('apply() 在右侧栏服务不存在时也安全，注册的东西可收回', async () => {
    const harness = loadBundle({
      services: { sidebarRightTabs: undefined, sidebarRight: undefined },
      fetchImpl: () => ({ ok: true, cwd: '', projects: [], activeKey: null, openRequests: [], canUndo: false, canRedo: false }),
    })
    harness.apply()
    await flush()

    expect(harness.appended.length, '样式应被注入一次').toBeGreaterThanOrEqual(1)
    expect(harness.registeredTabs.length, '没有官方席位就不该注册 tab 类型').toBe(0)
    expect(harness.registeredSlots.length).toBe(0)
    expect(harness.effects.length, '样式 + 轮询两个 effect').toBe(2)
    expect(harness.timers.length, '应挂一个轮询').toBe(1)
    // 清理链要 await 到底：cordis 的 fiber.dispose() 返回 Promise，
    // 漏 await 的话面板槽位注销还排在微任务里，紧接着的重新挂载就会撞上旧席位。
    for (const dispose of harness.effects) if (typeof dispose === 'function') await dispose()
    expect(harness.seatHandles.length, '注入过一次席位').toBe(1)
    expect(harness.seatHandles[0].disposed, '清理时必须等席位 dispose 完成，不能只发起不等待').toBe(true)
  })

  it('官方席位：注册 tab 类型与两个槽位，openRequest 到达时自动打开面板', async () => {
    const harness = loadBundle({
      fetchImpl: (url) => {
        if (String(url).startsWith('/ppt-maker/api/state')) {
          return {
            ok: true,
            cwd: 'C:/ws',
            // /state 的 projects 是 per-session store 的登记项：只有 { key, dir }。
            projects: [{ key: 'k1', dir: 'a' }],
            activeKey: 'k1',
            openRequests: [{ key: 'k1', at: 1 }],
            canUndo: false,
            canRedo: false,
          }
        }
        return { ok: true }
      },
    })
    harness.apply()
    await flush()
    // effect 挂载时会立刻轮询一次；冗余 flush 避免依赖「微任务与 fetch 的先后」
    await flush()

    expect(harness.registeredTabs.length).toBe(1)
    const tab = harness.registeredTabs[0]
    expect(tab.id).toBe('dsh-ppt-maker')
    expect(tab.kind).toBe('ppt')
    expect(tab.priority).toBe('extension')
    expect((tab.title as () => string)()).toBe('PPT 工作台')
    expect(Array.isArray(tab.guide)).toBe(true)
    expect(((tab.guide as Array<{ title: () => string }>)[0].title)()).toMatch(/PPT|工作台/)

    const keys = harness.registeredSlots.map((s) => `${s.descriptor.name}#${s.descriptor.key}`)
    expect(keys).toEqual(['sidebar.right.pane.tab#dsh-ppt-maker', 'sidebar.right.pane.tab.title#dsh-ppt-maker'])
    for (const slot of harness.registeredSlots) expect(typeof slot.component).toBe('function')

    // 主动再驱动一次轮询，免得测试依赖「微任务与 fetch 的先后」。
    harness.timers[0]()
    await flush()
    expect(harness.opened.length, '收到 openRequest 应自动打开面板').toBeGreaterThanOrEqual(1)
    expect(harness.opened.every((k) => k === 'ppt'), `打开的面板类型应始终是 ppt：${JSON.stringify(harness.opened)}`).toBe(true)
    const tabOpened = harness.fetchCalls.find((c) => String(c.url).includes('/tab-opened'))
    expect(tabOpened, '应回调 /tab-opened 清掉打开请求').toBeTruthy()
    expect(String((tabOpened?.init as { body?: string } | undefined)?.body || '')).toMatch(/"key":"k1"/)
  })

  it('无挂载座位时：单会话退到唯一那个，多会话宁可空转也不猜', async () => {
    const single = loadBundle({
      services: {
        sessions: { list: { getSnapshot: () => ({ ids: ['only'], byId: {} }) } },
        sidebarRight: { openTab: () => {} },
      },
      fetchImpl: () => ({ ok: true, projects: [], activeKey: null, openRequests: [], canUndo: false, canRedo: false }),
    })
    single.apply()
    await flush()
    single.timers[0]()
    await flush()
    expect(single.fetchCalls.some((c) => /sessionId=only/.test(String(c.url)))).toBe(true)

    const multi = loadBundle({
      services: {
        sessions: { list: { getSnapshot: () => ({ ids: ['a', 'b'], byId: {} }) } },
        sidebarRight: { openTab: () => {} },
      },
      fetchImpl: () => ({ ok: true }),
    })
    multi.apply()
    await flush()
    multi.timers[0]()
    await flush()
    const polled = multi.fetchCalls.filter((c) => String(c.url).startsWith('/ppt-maker/api/state'))
    expect(polled.length, '猜错会话会把别的会话的打开请求算到当前头上：多会话时读不出当前会话就该空转').toBe(0)
  })
})
