/**
 * 统一发布管线：模型导出（ppt_export）与面板导出（POST /export）
 * 唯一的出口。流程：load+validate（buildProjectDeck）→ QA 指纹门禁 →
 * 构建 + 字体嵌入 → postflight（ZIP 回读 + validatePresentation）→ 落盘 +
 * manifest.exportReport 落账（含 sha256 与 postflight 结果）。
 *
 * QA 门禁：manifest.qaReport 必须存在、pass=true、且 fingerprint 与当前工程
 * 内容一致（见 fingerprint.ts）；缺失/未过/过期一律拒导出。skipCheck 绕过
 * 门禁但 postflight 强制执行——「没检过」与「发出去的文件是坏的」是两回事。
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getSlides, loadPresentation, validatePresentation } from '@office-kit/pptx'
import { buildProjectDeck, convertPptxToPdf, saveProjectPptx, type PipelineResult } from '../export-pipeline.js'
import { ProjectError, writeExportReport } from '../project/store.js'
import type { FontEmbedSummary } from '../fonts/embed-pipeline.js'
import { computeProjectFingerprint } from './fingerprint.js'

export interface ReleaseOptions {
  /** 落盘路径（相对 cwd 或绝对路径，必须位于 cwd 内）；缺省只回字节不落盘。 */
  out?: string
  /** 同时把成品 .pptx 转成 PDF 落到此路径（相对 cwd 或绝对路径，必须位于 cwd 内）。 */
  pdf?: string
  /** 跳过 QA 指纹门禁（postflight 仍然强制执行）。 */
  skipCheck?: boolean
  /** 追加进 manifest.exportReport 的调用方字段（如 kind: 'panel-export'）。 */
  reportExtra?: Record<string, unknown>
}

export interface PostflightResult {
  ok: boolean
  slides: number
  errors: string[]
}

export interface ReleaseResult {
  dir: string
  revision: number
  bytes: Uint8Array
  /** out 落盘后的 cwd 相对路径（未落盘为 null）。 */
  out: string | null
  /** PDF 落盘结果（未请求为 null）。 */
  pdf: { path: string; bytes: number } | null
  fontsUsed: string[]
  buildWarnings: string[]
  fontEmbed: FontEmbedSummary | null
  sha256: string
  postflight: PostflightResult
  check: { pass: true; fingerprint: string } | { skipped: true }
}

/** 回读最终字节：库级校验 + 页数清点。任何 error 都视为发布失败。 */
async function postflight(bytes: Uint8Array): Promise<PostflightResult> {
  const pres = await loadPresentation(bytes)
  const errors = validatePresentation(pres)
    .filter((i) => i.severity === 'error')
    .map((i) => `${i.partName ?? 'package'}: ${i.message}`)
  return { ok: errors.length === 0, slides: getSlides(pres).length, errors }
}

export async function releaseProject(cwd: string, dir: string, options: ReleaseOptions = {}): Promise<ReleaseResult> {
  const pipeline: PipelineResult = await buildProjectDeck(cwd, dir)
  const fingerprint = await computeProjectFingerprint(cwd, dir)

  let check: ReleaseResult['check']
  if (options.skipCheck === true) {
    check = { skipped: true }
  } else {
    const qa = pipeline.manifest.qaReport as { pass?: boolean; fingerprint?: string; pages?: number[] | null } | undefined
    if (!qa || qa.pass !== true) {
      throw new ProjectError('QaReportMissing', '导出前需要先跑 ppt_check 并通过规则质检（当前没有有效的质检落账）', {
        status: 409,
        detail: { hint: 'ppt_check(dir) → 修完 blocker → ppt_export(dir, out)' }
      })
    }
    // 证据覆盖：只检过部分页的落账不能放行整份导出——未检页的质量是未知数。
    if (Array.isArray(qa.pages) && qa.pages.length > 0) {
      const total = pipeline.pages.length
      const checked = new Set(qa.pages)
      const uncovered: number[] = []
      for (let p = 1; p <= total; p += 1) if (!checked.has(p)) uncovered.push(p)
      if (uncovered.length > 0) {
        throw new ProjectError(
          'QaCoverageIncomplete',
          `质检证据未覆盖全部页面：第 ${uncovered.join('、')} 页未检（共 ${total} 页）。请不带 pages 参数跑 ppt_check 做全页质检`,
          { status: 409, detail: { total, checkedPages: qa.pages, uncovered } }
        )
      }
    }
    if (qa.fingerprint !== fingerprint) {
      throw new ProjectError('StaleQaReport', '质检落账已过期：工程在上次 ppt_check 之后又有改动，请重新质检后再导出', {
        status: 409,
        detail: { qaFingerprint: qa.fingerprint ?? null, currentFingerprint: fingerprint }
      })
    }
    check = { pass: true, fingerprint }
  }

  const saved = await saveProjectPptx(pipeline)
  const pf = await postflight(saved.bytes)
  if (!pf.ok) {
    throw new ProjectError('PostflightFailed', `发布前回读校验失败（${pf.errors.length} 项），已阻止落盘`, {
      status: 500,
      detail: pf.errors
    })
  }
  const sha256 = createHash('sha256').update(saved.bytes).digest('hex')

  const absPdf = typeof options.pdf === 'string' && options.pdf.length > 0 ? insideCwd(cwd, options.pdf) : null
  let outRel: string | null = null
  if (typeof options.out === 'string' && options.out.length > 0) {
    const absOut = insideCwd(cwd, options.out)
    await mkdir(path.dirname(absOut), { recursive: true })
    await writeFile(absOut, saved.bytes)
    outRel = path.relative(cwd, absOut).replace(/\\/g, '/')
  }
  let pdf: ReleaseResult['pdf'] = null
  if (absPdf) {
    try {
      const bytes = await convertPptxToPdf(saved.bytes, absPdf)
      pdf = { path: path.relative(cwd, absPdf).replace(/\\/g, '/'), bytes }
    } catch (err) {
      throw new ProjectError('PdfExportFailed', `PDF 转换失败：${(err as Error).message}`, { status: 500 })
    }
  }

  const report = {
    revision: pipeline.revision,
    exportedAt: new Date().toISOString(),
    out: outRel,
    ...(pdf ? { pdf } : {}),
    bytes: saved.bytes.byteLength,
    sha256,
    postflight: pf,
    fontsUsed: pipeline.fontsUsed,
    transition: pipeline.deck.export?.transition ?? 'fade',
    animations: pipeline.deck.export?.animations ?? 'auto',
    fontEmbed: saved.fontEmbed
      ? {
          mode: saved.fontEmbed.mode,
          facesEmbedded: saved.fontEmbed.facesEmbedded.length,
          skipped: saved.fontEmbed.skipped.length,
          rawBytes: saved.fontEmbed.rawBytes,
          finalBytes: saved.fontEmbed.finalBytes,
          warnings: saved.fontEmbed.warnings,
          subset: saved.fontEmbed.subset,
          skippedDetail: saved.fontEmbed.skipped
        }
      : { mode: 'off' as const },
    buildWarnings: pipeline.buildWarnings,
    check,
    ...(options.reportExtra ?? {})
  }
  await writeExportReport(cwd, dir, report)

  return {
    dir: pipeline.dir,
    revision: pipeline.revision,
    bytes: saved.bytes,
    out: outRel,
    pdf,
    fontsUsed: pipeline.fontsUsed,
    buildWarnings: pipeline.buildWarnings,
    fontEmbed: saved.fontEmbed,
    sha256,
    postflight: pf,
    check
  }
}

/** Resolves an output path and rejects anything outside the session cwd. */
function insideCwd(cwd: string, target: string): string {
  const abs = path.resolve(cwd, target)
  const rel = path.relative(cwd, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new ProjectError('PathOutsideCwd', `导出路径必须位于会话 cwd 内：${target}`, { status: 400 })
  }
  return abs
}
