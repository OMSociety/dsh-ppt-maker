/**
 * check:build — 守 `lib/` 产物与源码同步。
 *
 * lib/ 是包发布的边界（`dsh plugin add` 不构建）：源码改了而产物没跟上，装好的
 * 用户就拿到旧代码。用法是先 `npm run build` 再跑本脚本；CI 在 windows-latest 与
 * ubuntu-latest 上都按这个顺序执行。
 *
 * 判定按内容：对每个随包产物，比对工作区文件与 HEAD 版本的 SHA-256（换行统一成
 * LF 后再算，跨平台检出不误报），不一致即列出两侧大小与哈希前 12 位并失败；
 * lib/ 下出现未跟踪文件同样失败。构建本身是确定性的（同一源码两次构建字节一致），
 * 所以哈希不同只可能是源码与产物不同步。
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARTIFACTS = ['lib/index.js', 'lib/client.js']

const git = (args, encoding = 'utf8') => execFileSync('git', args, { cwd: root, encoding, maxBuffer: 64 * 1024 * 1024 })
const digest = (buf) => {
  const lf = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
  return { size: lf.length, sha: createHash('sha256').update(lf).digest('hex').slice(0, 12) }
}

const problems = []
try {
  for (const rel of ARTIFACTS) {
    const local = digest(readFileSync(path.join(root, rel)))
    let committed
    try {
      committed = digest(git(['show', `HEAD:${rel}`], 'buffer'))
    } catch {
      problems.push(`${rel}：HEAD 中没有该文件`)
      continue
    }
    if (local.sha !== committed.sha) {
      problems.push(`${rel}：重建 ${local.size}B ${local.sha} ≠ HEAD ${committed.size}B ${committed.sha}`)
    }
  }
  const untracked = git(['ls-files', '--others', '--exclude-standard', '--', 'lib/']).trim()
  if (untracked) problems.push(`lib/ 有未跟踪文件：${untracked.split('\n').join('、')}`)
} catch (err) {
  console.error(`[check-build] 读取 lib/ 的 git 状态失败：${err?.message ?? err}`)
  process.exit(1)
}

if (problems.length > 0) {
  console.error('[check-build] lib/ 与 HEAD 不一致：')
  for (const p of problems) console.error(`  - ${p}`)
  console.error('[check-build] 请先 `npm run build` 并把产物一起提交')
  process.exit(1)
}
console.log(`[check-build] lib/ 与 HEAD 一致（${ARTIFACTS.join('、')}）`)
