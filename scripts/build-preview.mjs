/**
 * 生成 README 的工作台预览 HTML。
 *
 * 默认使用 docs/preview/fixture.json；传入 --project <PPTD目录> 时，先从真实工程
 * 重新采集 deck / pages / plan / SVG，再打包正式 client 组件。产物自包含，可直接打开。
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURE = path.join(ROOT, 'docs', 'preview', 'fixture.json')
const ENTRY = path.join(ROOT, 'scripts', 'preview', 'main.tsx')
const OUT = path.join(ROOT, 'docs', 'preview', 'workbench.html')

function projectArgument() {
  const index = process.argv.indexOf('--project')
  if (index < 0) return null
  const value = process.argv[index + 1]
  if (!value) throw new Error('--project 需要 PPTD 工程目录')
  return path.resolve(ROOT, value)
}

function sanitizePreviewPaths(value) {
  if (typeof value === 'string') {
    // 盘符前不能紧跟字母/数字/协议字符：否则 `http://` 的 `p://` 会被当成 P 盘路径。
    return value.replace(/(?<![A-Za-z0-9+.\-])[A-Za-z]:[\\/](?![\\/])[^\s"'<>，），\]】]+/g, '本机路径')
  }
  if (Array.isArray(value)) return value.map(sanitizePreviewPaths)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizePreviewPaths(item)]))
  }
  return value
}

function captureFixture(projectDir) {
  const deck = parseYaml(fs.readFileSync(path.join(projectDir, 'deck.pptd'), 'utf8'))
  const manifest = JSON.parse(fs.readFileSync(path.join(projectDir, 'manifest.json'), 'utf8'))
  if (manifest.exportReport) manifest.exportReport.out = `${path.basename(projectDir)}.pptx`
  const planPath = path.join(projectDir, 'plan.yml')
  const briefPath = path.join(projectDir, 'brief.md')
  const plan = fs.existsSync(planPath) ? parseYaml(fs.readFileSync(planPath, 'utf8')) : null
  const brief = fs.existsSync(briefPath) ? fs.readFileSync(briefPath, 'utf8') : null
  const key = 'preview'
  const revision = Number(manifest.revision || 0)
  const pages = {}
  const media = {}

  for (const pagePath of deck.pages) {
    const page = parseYaml(fs.readFileSync(path.join(projectDir, pagePath), 'utf8'))
    pages[pagePath] = { path: pagePath, page, revision }
    const svgRef = page?.svgSource?.ref
    if (typeof svgRef === 'string') {
      if (!svgRef.startsWith('media/') || !svgRef.endsWith('.svg')) {
        throw new Error(`预览采集器只接受 media/*.svg：${svgRef}`)
      }
      media[svgRef] = fs.readFileSync(path.join(projectDir, svgRef), 'utf8')
    }
  }

  const outline = {
    revision,
    title: deck.title,
    designSystem: manifest.designSystem ?? null,
    theme: manifest.theme ?? null,
    pageCount: deck.pages.length,
    checksumMismatch: false,
    canUndo: true,
    canRedo: false,
  }
  return sanitizePreviewPaths({
    key,
    state: {
      cwd: path.basename(projectDir),
      projects: [{ key, dir: 'demo-deck' }],
      activeKey: key,
      openRequests: [],
      manifest: outline,
      canUndo: true,
      canRedo: false,
    },
    project: {
      key,
      dir: 'demo-deck',
      revision,
      manifest,
      deck,
      pages: deck.pages.map((pagePath) => ({ path: pagePath })),
      issues: [],
      checksumMismatch: false,
      plan,
      brief,
    },
    pages,
    media,
  })
}

const projectDir = projectArgument()
if (projectDir) {
  const fixture = captureFixture(projectDir)
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true })
  fs.writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
  console.log(`[build-preview] 已从真实工程采集 ${Object.keys(fixture.pages).length} 页`)
}
if (!fs.existsSync(FIXTURE)) throw new Error('缺少 docs/preview/fixture.json；请用 --project 采集')

const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  charset: 'utf8',
  minify: true,
  legalComments: 'none',
  logLevel: 'warning',
})
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DSH-PPT-Maker · 工作台</title>
</head>
<body>
  <div id="root"></div>
  <script>${script}</script>
</body>
</html>
`
fs.writeFileSync(OUT, html, 'utf8')
console.log(`[build-preview] 正式 client 组件 → docs/preview/workbench.html（${(Buffer.byteLength(html) / 1024).toFixed(1)} KB）`)
