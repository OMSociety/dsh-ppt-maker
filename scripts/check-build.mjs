/**
 * check:build — 守 `lib/` 产物与源码同步。
 *
 * 为什么单独成脚本：lib/ 是包发布的边界（`dsh plugin add` 不构建），源码改了
 * 而产物没跟上会让装好的用户拿到旧代码。CI 用 `git diff --exit-code` 把这条
 * 钉死；本脚本只是把那条命令改写成跨平台（Windows 上 `git`  Args 也只吃
 * execFile 的 argv，不依赖 shell）。
 *
 * 用法：`npm run build && node scripts/check-build.mjs`（CI 顺序如此；开发
 * 期改了代码忘了重 build 时，这条会让你立刻看到漂移）。
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

try {
  execFileSync('git', ['diff', '--exit-code', '--', 'lib/'], { cwd: root, stdio: 'inherit' })
  console.log('[check-build] lib/ 与 git 一致')
} catch {
  console.error('[check-build] lib/ 有未提交漂移，请先 `npm run build` 并把产物一起提交')
  process.exit(1)
}
