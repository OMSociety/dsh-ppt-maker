/**
 * Export/render pipeline shared by ppt_export, ppt_render and ppt_check:
 * load project → build native deck → (save pptx | render PNG |
 * review). One path, three entry points — render and check never approximate
 * the final artifact, they always go through the same engine build.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createConverter, type Converter, type RenderImagesResult } from '@deepseek-ai/libreoffice-kit'
import { loadProject, ProjectError } from './project/store.js'
import { createOfficeKitEngine } from './engine/officekit.js'
import type { BuildContext, DeckBuildResult } from './engine/types.js'
import { reviewDeck, type ReviewIssue } from './review/index.js'
import { aiIssuesAsReviewIssues, runAiReview, type AiReviewDeps, type AiReviewResult } from './review/ai.js'
import { getSlides, type PresentationData } from '@office-kit/pptx'
import { embedFontsForPptx, modeOfExportConfig, type FontEmbedSummary } from './fonts/embed-pipeline.js'
import type { Page, Presentation } from './pptd/schema.js'
import { reviewFontLicenses } from './review/fontLicense.js'

export interface PipelineResult {
  dir: string
  revision: number
  built: DeckBuildResult
  buildWarnings: string[]
  fontsUsed: string[]
  /** 供 saveProjectPptx 嵌字体用：deck + pages 再次递进来 */
  deck: Presentation
  pages: Page[]
}

/** Build the native deck for a project. Shared by all three tools. */
export async function buildProjectDeck(cwd: string, dir: string): Promise<PipelineResult> {
  const loaded = await loadProject(cwd, dir)
  const blockers = loaded.issues.filter((i) => i.level === 'blocker')
  if (blockers.length > 0) {
    throw new ProjectError('SchemaBlockers', `工程存在 ${blockers.length} 个阻断级问题，先修复再导出/渲染`, {
      status: 409,
      detail: blockers.map((b) => `${b.code}: ${b.message}${b.path ? `（${b.path}）` : ''}`)
    })
  }

  const pages = loaded.deck.pages.map((rel) => {
    const key = rel.replace(/\\/g, '/')
    const page = loaded.pages.get(key)
    if (!page) throw new ProjectError('PageMissing', `页文件未加载：${key}`, { status: 409 })
    return page
  })

  const warnings: string[] = []
  const engine = createOfficeKitEngine()
  const ctx: BuildContext = {
    projectDir: loaded.dir,
    loadMedia: (src) => loadMediaBytes(loaded.dir, src),
    warnings
  }
  const built = await engine.buildDeck({ deck: loaded.deck, pages }, ctx)
  return {
    dir: loaded.dir,
    revision: loaded.manifest.revision,
    built,
    buildWarnings: warnings,
    fontsUsed: built.fontsUsed,
    deck: loaded.deck,
    pages
  }
}

/**
 * 不嵌字体的裸保存——供预览/质检渲染用。
 * 实测：LibreOffice 对嵌入的子集 EOT 字体会误用（字形张冠李戴），
 * 预览渲染必须走嵌字体之前的字节，由系统字体承担渲染。
 */
export async function saveRawProjectPptx(pipeline: PipelineResult): Promise<Uint8Array> {
  const engine = createOfficeKitEngine()
  return engine.saveDeck(pipeline.built.native)
}

/** Save the built deck to pptx bytes ( fonts embedded按 deck.export.fontEmbed 模式 ) */
export async function saveProjectPptx(pipeline: PipelineResult): Promise<{ bytes: Uint8Array; fontEmbed: FontEmbedSummary | null }> {
  const engine = createOfficeKitEngine()
  const rawBytes = await engine.saveDeck(pipeline.built.native)
  const mode = modeOfExportConfig(pipeline.deck)
  if (mode === 'off') {
    return { bytes: rawBytes, fontEmbed: null }
  }
  const { bytes, summary } = await embedFontsForPptx(rawBytes, pipeline.built, pipeline.deck, pipeline.pages, {
    projectDir: pipeline.dir,
    mode
  })
  return { bytes, fontEmbed: summary }
}

/** Media loader: project-relative path or http(s) URL → bytes. */
async function loadMediaBytes(projectDir: string, src: string): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return new Uint8Array(await res.arrayBuffer())
  }
  const abs = path.resolve(projectDir, src)
  const rel = path.relative(projectDir, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`素材路径越出工程目录：${src}`)
  }
  return new Uint8Array(await readFile(abs))
}

/* ------------------------------------------------------------------ *
 * LibreOffice rendering (ppt_render + missing-font diagnostics)
 * ------------------------------------------------------------------ */

export interface RenderedImages {
  result: RenderImagesResult
  outputDir: string
  /** Caller must dispose the converter + clean outputDir when done. */
  cleanup: () => Promise<void>
}

export async function renderPptxImages(
  pptxBytes: Uint8Array,
  options: { pages?: number[]; dpi?: number } = {}
): Promise<RenderedImages> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'ppt-maker-render-'))
  const inputPath = path.join(tmp, 'deck.pptx')
  // libreoffice-kit owns outputDir: it creates the directory itself and
  // deletes it whole on failure — pre-creating it trips EEXIST.
  const outputDir = path.join(tmp, 'out')
  await writeFile(inputPath, pptxBytes)

  let conv: Converter | null = null
  try {
    conv = await createConverter()
    const result = await conv.renderImages({
      inputPath,
      outputDir,
      pages: options.pages && options.pages.length > 0 ? options.pages : 'all',
      dpi: options.dpi ?? 96
    })
    return {
      result,
      outputDir,
      cleanup: async () => {
        try {
          await conv?.dispose()
        } catch {
          /* dispose must not throw */
        }
        await rm(tmp, { recursive: true, force: true })
      }
    }
  } catch (err) {
    await conv?.dispose().catch(() => {})
    await rm(tmp, { recursive: true, force: true }).catch(() => {})
    throw err
  }
}

/* ------------------------------------------------------------------ *
 * Check (rule layer over the built deck)
 * ------------------------------------------------------------------ */

export interface CheckResult {
  pass: boolean
  issues: ReviewIssue[]
  missingFonts: string[]
  buildWarnings: string[]
  /** ai:true 时携带 AI 层结果（performed:false 表示降级及原因）。 */
  ai?: AiReviewResult
}

export interface CheckOptions {
  pages?: number[]
  withMissingFonts?: boolean
 /** AI 按需深检：给了 deps 才跑，只出建议不阻断。 */
  ai?: { deps: AiReviewDeps; cwd: string }
}

export async function checkProject(cwd: string, dir: string, options: CheckOptions = {}): Promise<CheckResult> {
  const pipeline = await buildProjectDeck(cwd, dir)
  const pres = pipeline.built.native as PresentationData
  const review = reviewDeck(pres, { pages: options.pages })

 // 字体许可预检（不动导出也可见）——收集 fsType 位与缺字体清单
  const fontLicenseIssues = await reviewFontLicenses(pipeline.deck, pipeline.pages, { projectDir: pipeline.dir })

  let missingFonts: string[] = []
  let ai: AiReviewResult | undefined

  const needsRender = options.withMissingFonts !== false || options.ai !== undefined
  let pptxBytes: Uint8Array | null = null
  if (needsRender) {
    try {
      // 预览/质检渲染用未嵌字体的裸字节：LibreOffice 会误用嵌入的子集
      // EOT（字形张冠李戴），系统字体渲染才是版面的诚实快照。
      pptxBytes = await saveRawProjectPptx(pipeline)
    } catch {
      pptxBytes = null
    }
  }

  if (options.withMissingFonts !== false && pptxBytes !== null) {
    try {
      const rendered = await renderPptxImages(pptxBytes, { pages: options.pages, dpi: 24 })
      missingFonts = rendered.result.missingFonts
      await rendered.cleanup()
    } catch {
      // libreoffice-kit unavailable → missingFonts stays empty; the caller
      // distinguishes "no missing fonts" from "diagnostic unavailable" by the
      // absence of the fontsUsed list in the result payload.
    }
  }

  // AI 层：渲染最终 pptx 的成品页 PNG 作为审查对象（不是中间格式模拟图）。
  if (options.ai !== undefined && pptxBytes !== null) {
    const { deps } = options.ai
    const pageNumbers = resolvedPageNumbers(pres, options.pages)
    try {
      const rendered = await renderPptxImages(pptxBytes, { pages: pageNumbers, dpi: 96 })
      try {
        const images = rendered.result.images.map((img) => ({
          page: img.page ?? img.index + 1,
          absPath: img.path
        }))
        ai = await runAiReview(
          { images, pres, pages: pageNumbers },
          { ...deps, toDisplayPath: (abs) => path.relative(options.ai!.cwd, abs).replace(/\\/g, '/') }
        )
      } finally {
        await rendered.cleanup()
      }
    } catch (err) {
      // 渲染失败/调用失败一律降级成 performed:false + 原因，不炸规则层结果。
      ai = { performed: false, reason: `AI 质检未执行：${(err as Error).message}` }
    }
  }

  const issues: ReviewIssue[] = [...fontLicenseIssues, ...review.issues]
  for (const family of missingFonts) {
    issues.push({
      page: 0,
      severity: 'warning',
      category: 'structure',
      description: `目标环境缺少字体：${family}`,
      suggestion: '在导出时启用字体嵌入（export.fontEmbed），或在目标机安装该字体'
    })
  }
  if (ai !== undefined) {
    issues.push(...aiIssuesAsReviewIssues(ai))
  }

  return {
    pass: !issues.some((i) => i.severity === 'blocker'),
    issues,
    missingFonts,
    buildWarnings: pipeline.buildWarnings,
    ...(ai !== undefined ? { ai } : {})
  }
}

/** 质检页码：显式给了 pages 就用，否则全页（1..N，以 getSlides 的真实长度为准）。 */
function resolvedPageNumbers(pres: PresentationData, pages?: number[]): number[] {
  if (pages !== undefined && pages.length > 0) return [...pages].sort((a, b) => a - b)
  const count = getSlides(pres).length
  return Array.from({ length: count }, (_, i) => i + 1)
}
