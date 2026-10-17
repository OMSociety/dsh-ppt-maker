/**
 * check:build — 守 `lib/` 产物与源码同步。
 *
 * 为什么单独成脚本：lib/ 是包发布的边界（`dsh plugin add` 不构建），源码改了
 * 而产物没跟上会让装好的用户拿到旧代码。有 CI 时以 `git diff --exit-code` 把
 * 这条钉死；本仓没有 CI，本脚本改用 `git status --porcelain -- lib/` 判漂移
 * （只关心 lib/ 下有没有改动/未跟踪文件，工作区其余部分是否干净不参与判定），
 * 且不依赖 shell（Windows 上 `git` 也只吃 execFile 的 argv）。
 *
 * 用法：`npm run build && node scripts/check-build.mjs`——脚本自己会看 lib/ 在
 * git 里的状态，改完代码忘了重 build 时立刻见红。
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

try {
  const drift = execFileSync('git', ['status', '--porcelain', '--', 'lib/'], { cwd: root, encoding: 'utf8' })
  if (drift.trim() !== '') {
    console.error('[check-build] lib/ 有未提交漂移：')
    console.error(drift.trimEnd())
    console.error('[check-build] 请先 `npm run build` 并把产物一起提交')
    process.exit(1)
  }
  console.log('[check-build] lib/ 与 git 一致')
} catch (err) {
  console.error(`[check-build] 读取 lib/ 的 git 状态失败：${err?.message ?? err}`)
  process.exit(1)
}
