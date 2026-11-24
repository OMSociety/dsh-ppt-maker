#!/usr/bin/env node
/** 核对 npm 实际包成员：运行入口、运行时资产、exports 和 files 声明。 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { matchesGlob } from 'node:path/posix'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const raw = execSync('npm pack --offline --dry-run --json', { encoding: 'utf8' })
const [meta] = Object.values(JSON.parse(raw))
const packed = new Set(meta.files.map(({ path }) => path.replaceAll('\\', '/')))
const problems = []

function need(path, why) {
  const name = path.replace(/^\.\//, '')
  if (!packed.has(name)) problems.push(`缺少 ${name}（${why}）`)
}

need(pkg.main ?? 'index.js', '入口 main')
if (pkg.icon) need(pkg.icon, '插件图标 icon')
need(pkg.dsh.bundle.patch, '挂载声明')
need('package.json', '包清单本身')
need('docs/pptd-spec.md', 'PPTD 全量规格')
need('scripts/prepare-vendor-env.mjs', 'SVG 建环境脚本')
need('skills/ppt-maker/vendor/requirements.txt', '建环境脚本读取的依赖')
need('skills/ppt-maker/vendor/compile_svg_page.py', 'SVG 页编译驱动')

function checkExports(target) {
  if (typeof target === 'string' && target.startsWith('./')) {
    if (!target.includes('*')) return need(target, 'exports 导出的文件')
    // Node 的 exports 通配符可以包含斜杠。
    const pattern = target.slice(2).split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
    const re = new RegExp(`^${pattern}$`)
    if (![...packed].some(p => re.test(p))) problems.push(`exports 条目 ${target} 在包里没有任何命中`)
  } else if (target && typeof target === 'object') {
    Object.values(target).forEach(checkExports)
  }
}
checkExports(pkg.exports)

for (const entry of pkg.files ?? []) {
  if (entry.startsWith('!')) continue
  const pattern = entry.replace(/^\.\//, '').replace(/\/+$/, '')
  if (![...packed].some(p => matchesGlob(p, pattern) || matchesGlob(p, `${pattern}/**`))) {
    problems.push(`files 条目 ${entry} 在包里没有任何命中`)
  }
}

for (const p of packed) {
  if (p === 'skills/ppt-maker/vendor/.venv-ready.json' || /^(?:node_modules|\.git)\//.test(p)) {
    problems.push(`包里不该出现 ${p}`)
  }
}

if (problems.length) {
  console.error(`[check-pack] ${problems.length} 处不一致（包内 ${packed.size} 个文件）：`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`[check-pack] ok  包内 ${packed.size} 个文件，入口/图标/挂载声明/白名单均在位`)
