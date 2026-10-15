/**
 * 宿主 bundle 新鲜度守卫：lib/index.js 是 tsup 产物、随包提交（`dsh plugin add` 只安装不构建），
 * 但「src/index.ts 改了接线、忘了重跑 npm run build」这一类失修不会有任何报错——
 * 路由在运行时拿到的 core 缺函数（listProjectHistory is not a function 事故）。
 * client 侧有 esbuild 逐字节比对的守卫（tests/client-bundle.test.ts），宿主侧用这个
 * 轻量哨兵：接线契约里的每个 CoreSurface 成员必须能在 lib/index.js 里找到标识符。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const bundle = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')

describe('lib/index.js 宿主 bundle 与 src/index.ts 接线同步', () => {
  it('CoreSurface 接线成员全部出现在 bundle 里（防「改了 src 忘了 build」）', () => {
    const markers = [
      // plugin/host/routes.mjs CoreSurface 的宿主接线（src/index.ts 的 core: {...}）
      'listProjectHistory',
      'readHistorySnapshot',
      'restoreProject',
      'buildProjectDeck',
      'saveProjectPptx',
      'writeExportReport',
    ]
    for (const marker of markers) {
      expect(bundle.includes(marker), `lib/index.js 缺少 ${marker}——src/index.ts 改了接线但没跑 npm run build？`).toBe(true)
    }
  })
})
