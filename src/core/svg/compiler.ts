/**
 * SVG 页编译桥：把 media/svg/*.svg 编译成单页 .pptx（DrawingML 原生形状），
 * 供 OfficeKit 引擎 importSlide 合并进成品 deck。
 *
 * 编译器是 vendored 的 ppt-master 转换器（skills/ppt-maker/vendor/），
 * Python 环境由 scripts/prepare-vendor-env.mjs 准备（vendor/.venv）。
 * 失败一律 fail-closed：抛 ProjectError，不产出占位页。
 *
 * 缓存：.cache/svg/<key>.pptx，key = sha256(svg 字节 | 转换器版本 | 主题 hash)。
 * 缓存目录不进指纹（release/fingerprint.ts 只覆盖 media/），也不进快照。
 */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { PACKAGE_ROOT } from '../../root.js'
import { ProjectError } from '../project/store.js'

const execFileAsync = promisify(execFile)

/** SVG 转换器契约版本；转换行为变化时递增，使编译缓存与既有 QA 指纹失效。 */
export const SVG_COMPILER_VERSION = 'dsh-svg-compiler@1'

const VENDOR_DIR = path.join(PACKAGE_ROOT, 'skills', 'ppt-maker', 'vendor')
const DRIVER = path.join(VENDOR_DIR, 'compile_svg_page.py')
const COMPILE_TIMEOUT_MS = 120_000

function venvPython(): string {
  return process.platform === 'win32'
    ? path.join(VENDOR_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(VENDOR_DIR, '.venv', 'bin', 'python')
}

export interface CompileSvgPageOptions {
  /** 工程目录（resource-root：svg 内的媒体引用相对它解析）。 */
  projectDir: string
  /** 工程相对路径，必须落在 media/svg/ 下（parse 层已校验，此处防御性复查）。 */
  svgRef: string
  /** 主题序列化 hash：主题变化会让同一份 svg 重编译。 */
  themeHash: string
}

export interface CompiledSvgPage {
  /** 单页 .pptx 字节。 */
  bytes: Uint8Array
  /** 是否命中缓存。 */
  cached: boolean
  /** 编译产物 slide XML 里实际出现的 run 级字体（供字体嵌入）。 */
  fonts: string[]
}

/** 编译一页 SVG 为单页 pptx；命中缓存直接返回。失败抛 ProjectError。 */
export async function compileSvgPage(opts: CompileSvgPageOptions): Promise<CompiledSvgPage> {
  const { projectDir, svgRef, themeHash } = opts
  const rel = svgRef.replace(/\\/g, '/')
  if (!/^media\/svg\/[^/]+\.svg$/i.test(rel)) {
    throw new ProjectError('SvgSourceInvalid', `SVG 源必须位于 media/svg/ 下：${svgRef}`, { status: 409 })
  }
  const svgAbs = path.resolve(projectDir, rel)
  if (!existsSync(svgAbs)) {
    throw new ProjectError('SvgSourceMissing', `SVG 源文件不存在：${rel}`, { status: 409 })
  }
  const svgBytes = await readFile(svgAbs)

  const key = createHash('sha256')
    .update(svgBytes)
    .update('|')
    .update(SVG_COMPILER_VERSION)
    .update('|')
    .update(themeHash)
    .digest('hex')
    .slice(0, 32)
  const cacheDir = path.join(projectDir, '.cache', 'svg')
  const outAbs = path.join(cacheDir, `${key}.pptx`)
  const sidecarAbs = path.join(cacheDir, `${key}.json`)
  if (existsSync(outAbs) && existsSync(sidecarAbs)) {
    const sidecar = JSON.parse(await readFile(sidecarAbs, 'utf8')) as { fonts?: string[] }
    return { bytes: new Uint8Array(await readFile(outAbs)), cached: true, fonts: sidecar.fonts ?? [] }
  }
  // 缓存必须同时包含 pptx 与 sidecar；缺任一件即重编译，保证字体清单完整。

  const python = venvPython()
  if (!existsSync(python)) {
    throw new ProjectError(
      'SvgCompilerMissing',
      'SVG 编译器环境未安装：请先运行 node scripts/prepare-vendor-env.mjs',
      { status: 500 }
    )
  }
  await mkdir(cacheDir, { recursive: true })

  let stdout: string
  try {
    const res = await execFileAsync(python, [DRIVER, svgAbs, outAbs, projectDir], {
      timeout: COMPILE_TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    })
    stdout = res.stdout
  } catch (err) {
    const e = err as { message?: string; stderr?: string }
    const detail = (e.stderr ?? e.message ?? String(err)).trim().slice(-800)
    throw new ProjectError('SvgCompileFailed', `SVG 编译失败（${rel}）：${detail}`, { status: 500 })
  }
  // 驱动脚本最后一行是 JSON 回执；前面可能有转换器的诊断输出。
  const lastLine = stdout.trim().split(/\r?\n/).filter(Boolean).pop() ?? ''
  let receipt: { ok?: boolean; error?: string; fonts?: string[] }
  try {
    receipt = JSON.parse(lastLine) as { ok?: boolean; error?: string; fonts?: string[] }
  } catch {
    throw new ProjectError('SvgCompileFailed', `SVG 编译器回执无法解析（${rel}）：${lastLine.slice(0, 300)}`, { status: 500 })
  }
  if (receipt.ok !== true || !existsSync(outAbs)) {
    throw new ProjectError('SvgCompileFailed', `SVG 编译失败（${rel}）：${receipt.error ?? '未知错误'}`, { status: 500 })
  }
  const fonts = Array.isArray(receipt.fonts) ? receipt.fonts.filter((f) => typeof f === 'string') : []
  await writeFile(sidecarAbs, JSON.stringify({ fonts }, null, 2) + '\n')
  return { bytes: new Uint8Array(await readFile(outAbs)), cached: false, fonts }
}

/** deck.theme 的缓存键分量：主题变化触发重编译。 */
export function themeHashOf(theme: unknown): string {
  const text = theme === undefined || theme === null ? '' : JSON.stringify(theme)
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}
