#!/usr/bin/env node
/**
 * 发布物清单自检：`npm pack` 之后，包里到底有哪些文件。
 *
 * CI 一直在源码树里跑，`files` 白名单写漏一项（图标、挂载声明、locale、技能目录）
 * 在源码树里全是绿的——只有发布出去的那一份才会少东西。本脚本把「包里的清单」
 * 与 `package.json` 的声明对一遍，几秒完成，不需要真装一遍依赖。
 *
 * 判据：
 *   1. 入口 `main`、`icon`、`cordis.patch.yml`、`package.json` 必须在包里；
 *   2. `exports` 里指向本仓文件的字面量路径必须在包里；
 *   3. `files` 白名单的每一项至少要有一项落地（目录至少一个文件，glob 至少命中一次，
 *      带 `!` 的负向条目跳过）；
 *   4. 包里不得出现 `node_modules/` 或 `.git/`。
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const ROOT = process.cwd()

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const raw = execSync('npm pack --dry-run --json', { encoding: 'utf8', cwd: ROOT })
const parsed = JSON.parse(raw)
const meta = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0]
const packed = new Set(meta.files.map((f) => f.path.split(sep).join('/')))

const problems = []
const notes = []

function need(path, why) {
  const normalized = path.replace(/^\.\//, '').split(sep).join('/')
  if (!packed.has(normalized)) problems.push(`缺少 ${normalized}（${why}）`)
}

need(pkg.main ?? 'index.js', '入口 main')
if (pkg.icon) need(pkg.icon, '插件图标 icon')
need('cordis.patch.yml', '挂载声明')
need('package.json', '包清单本身')

for (const target of Object.values(pkg.exports ?? {})) {
  const value = typeof target === 'string' ? target : target?.default
  if (typeof value !== 'string' || value.includes('*')) continue
  if (!value.startsWith('./')) continue
  if (!existsSync(join(ROOT, value))) continue
  need(value, 'exports 导出的文件')
}

function globToRegExp(glob) {
  return new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$')
}

for (const entry of pkg.files ?? []) {
  if (entry.startsWith('!')) continue
  const normalized = entry.replace(/[\/\\\\]+$/, '').split(sep).join('/')
  const hasGlob = normalized.includes('*')
  if (hasGlob) {
    const re = globToRegExp(normalized)
    const hit = [...packed].some((p) => re.test(p) || re.test(p.split('/').pop()))
    if (!hit) problems.push(`files 条目 ${entry} 在包里没有任何命中`)
    continue
  }
  const onDisk = join(ROOT, normalized)
  if (!existsSync(onDisk)) {
    notes.push(`files 条目 ${entry} 在本地不存在，跳过`)
    continue
  }
  const isDir = statSync(onDisk).isDirectory()
  const hit = isDir ? [...packed].some((p) => p.startsWith(normalized + '/')) : packed.has(normalized)
  if (!hit) problems.push(`files 条目 ${entry} 未进入包内`)
}

for (const path of packed) {
  if (path.startsWith('node_modules/') || path.startsWith('.git/')) {
    problems.push(`包里不该出现 ${path}`)
  }
}

const total = meta.files.length
if (problems.length) {
  console.error(`[check-pack] ${problems.length} 处不一致（包内 ${total} 个文件）：`)
  for (const p of problems) console.error(`  - ${p}`)
  for (const n of notes) console.log(`  note: ${n}`)
  process.exit(1)
}
console.log(`[check-pack] ok  包内 ${total} 个文件，入口/图标/挂载声明/白名单均在位`)
for (const n of notes) console.log(`  note: ${n}`)
