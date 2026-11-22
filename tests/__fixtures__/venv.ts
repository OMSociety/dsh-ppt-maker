/**
 * SVG 编译器 venv 的统一健康探针（svg-page / tools-plan-svg 共用一份结论）。
 *
 * 就绪 = 三项同时成立：venv python 可执行文件存在、.venv-ready.json 存在、
 * 标记里的 requirementsSha256 与当前 vendor/requirements.txt 一致。
 * 不就绪时只打印一次缺项，用例按 skipIf 跳过；CI 里由 scripts/prepare-vendor-env.mjs 预先备好。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { PACKAGE_ROOT } from '../../src/root.js'

export interface VenvProbe {
  ready: boolean
  missing: string[]
}

let cached: VenvProbe | null = null

export function probeVenv(): VenvProbe {
  if (cached) return cached
  const vendor = path.join(PACKAGE_ROOT, 'skills', 'ppt-maker', 'vendor')
  const python = path.join(
    vendor,
    '.venv',
    process.platform === 'win32' ? path.join('Scripts', 'python.exe') : path.join('bin', 'python')
  )
  const marker = path.join(vendor, '.venv-ready.json')
  const missing: string[] = []
  if (!existsSync(python)) missing.push(`python 不在 ${python}`)
  if (!existsSync(marker)) missing.push(`标记文件不在 ${marker}`)
  else {
    try {
      const want = createHash('sha256').update(readFileSync(path.join(vendor, 'requirements.txt'))).digest('hex')
      const got = (JSON.parse(readFileSync(marker, 'utf8')) as { requirementsSha256?: string }).requirementsSha256
      if (got !== want) missing.push('标记里的 requirements 哈希与当前 requirements.txt 不一致（重跑 prepare-vendor-env）')
    } catch (err) {
      missing.push(`标记文件无法解析：${(err as Error).message}`)
    }
  }
  cached = { ready: missing.length === 0, missing }
  if (!cached.ready) console.warn(`[venv] SVG 编译器环境未就绪，相关用例跳过：${missing.join('；')}`)
  return cached
}
