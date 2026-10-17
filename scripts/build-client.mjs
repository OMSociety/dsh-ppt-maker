/**
 * 把 `client/*.tsx` 打成 DSH 客户端 bundle（`lib/client.js`）。
 *
 * 产物形态是 DSH 客户端模块系统的唯一合法形态：
 *   `window.__ModuleLoader__.load({ id, factory: (require) => exports })`
 * 其中 `require` 由模块表提供，所以外部包一律 external，绝不能打进 bundle
 * （打进去会出现两份 React）。
 *
 * 本包实际只 require `react` 与 `react/jsx-runtime`：rc2 官方禁止客户端 bundle 加载
 * Harness Client 包（`dsh-agent-preset/skills/cordis-plugin-development/references/practices.md`），
 * 图标几何因此复制进了 `client/icons.tsx`。`@deepseek-ai/*` 仍留在 external 里是**守卫**：
 * 万一将来有人 import 了宿主包，它不会被打进来静默变成两份，而是变成一条 require，
 * 由 `tests/client-bundle.guard.test.ts` 的种子表核对当场变红。
 *
 * 但 external 只挡得住「命中列表的包」：一个不在列表里的第三方包会被 esbuild **静默内联**
 * 进产物（require 表不变、体积只多几百字节，测试全绿），所以守卫测试另外用 esbuild 的
 * metafile 核对「进产物的只有本仓库 `client/` 下的源码」，见 `bundleClient({ metafile: true })`。
 *
 * 产物必须提交入库：`dsh plugin add dsh-ppt-maker` 只做安装，不跑构建。
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = path.join(ROOT, 'client', 'index.tsx')
const OUT = path.join(ROOT, 'lib', 'client.js')
const PLUGIN_ID = 'dsh-ppt-maker'

/** 打包选项。测试侧复用同一份，免得两处漂移。 */
export const BUILD_OPTIONS = {
  entryPoints: [ENTRY],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'warning',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/*'],
}

/** 跑一次打包（不落盘）。`metafile: true` 时结果里带 `metafile`，供守卫核对输入。 */
export function bundleClient(overrides = {}) {
  return build({ ...BUILD_OPTIONS, ...overrides })
}

/** 拼出可提交的产物文本（banner + 缩进后的 factory 体）。 */
export function renderBundle(code) {
  const indented = code
    .split('\n')
    .map((line) => (line ? `      ${line}` : line))
    .join('\n')

  return `/**
 * 自动生成，请勿手改 —— 源码在 client/，用 \`npm run build\` 重新生成。
 * 改完记得把本文件一起提交：\`dsh plugin add dsh-ppt-maker\` 只安装、不构建。
 */
window.__ModuleLoader__.load({
  id: ${JSON.stringify(PLUGIN_ID)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${indented}
    return module.exports;
  },
});
`
}

/** 打包并写 `lib/client.js`，返回产物字节数。 */
export async function writeBundle() {
  const result = await bundleClient()
  const banner = renderBundle(result.outputFiles[0].text)
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, banner, 'utf8')
  return Buffer.byteLength(banner, 'utf8')
}

// 只在直接运行时构建并落盘；被测试 import 时只提供上面这些导出。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bytes = await writeBundle()
  console.log(`[build-client] client/*.tsx → lib/client.js（${(bytes / 1024).toFixed(1)} KB）`)
}
