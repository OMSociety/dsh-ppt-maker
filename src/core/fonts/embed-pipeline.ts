/**
 * core/fonts/embed-pipeline.ts — 导出端字体嵌入编排（一条链出口）
 *
 * 组装三张异质输入为统一的 fontPlan，交付 fontEmbed 决策落点：
 *   buildDeck 产物 (fontsUsed) + projectDir + exportConfig
 *       → collectFontUsage(typefaces+charset)
 *       → 逐 typeface 解析 (resolver) + fsType 闸
 *       → 子集化（默认）或整字体直通
 *       → EOT 封装 → 幂等注入四件套 → selfCheckEmbedded
 *
 * 调用方（export.ts / export-pipeline.ts / check.ts）不需要知道字型内部。
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Page, Presentation } from '../pptd/schema.js'
import type { DeckBuildResult } from '../engine/types.js'
import { collectFontUsage } from './usage.js'
import { resolveTypeface, type FontSlot } from './resolver.js'
import { subsetIfNeeded, type FontEmbedMode, type SubsetResult } from './subset.js'
import { embedFontsPostProcess, type FontPlanEntry } from './embed.js'
import { selfCheckEmbedded } from './selfcheck.js'

export interface FontEmbedSummary {
  /** 嵌入的 (typeface, slot) 对 */
  facesEmbedded: Array<{ typeface: string; slot: FontSlot }>
  /** 跳过项：{typeface, slot?, reason, licenseLabel?} */
  skipped: Array<{ typeface: string; slot?: FontSlot; reason: string; licenseLabel?: string }>
  /** 子集化审计（仅 subset 模式有） */
  subset?: Array<{ typeface: string; slot: FontSlot; beforeBytes: number; afterBytes: number }>
  /** 全部警告（含 fsType readonly / NoSubset / 解析失败），进 manifest.exportReport */
  warnings: string[]
  /** 后处理产物最终字节数 */
  finalBytes: number
  /** 原始 pptx 字节数（未嵌字体） */
  rawBytes: number
  /** 模式 */
  mode: FontEmbedMode
}

export interface FontEmbedOptions {
  /** 项目绝对路径（assets/fonts/ 解析根） */
  projectDir: string
  /** export.fontEmbed 模式 */
  mode: FontEmbedMode
}

/**
 * 对 saveDeck 产物做字体嵌入（off 直通；subset/full 走完整链路）。
 */
export async function embedFontsForPptx(
  pptxBytes: Uint8Array,
  built: DeckBuildResult,
  deck: Presentation,
  pages: Page[],
  options: FontEmbedOptions
): Promise<{ bytes: Uint8Array; summary: FontEmbedSummary }> {
  const mode = options.mode
  const rawBytes = pptxBytes.byteLength
  if (mode === 'off') {
    return {
      bytes: pptxBytes,
      summary: { facesEmbedded: [], skipped: [], warnings: [], finalBytes: rawBytes, rawBytes, mode }
    }
  }

  const warnings: string[] = []
  const usage = collectFontUsage(deck, pages)

  // 1) 逐 (typeface, slot) 解析 + fsType 闸 + 子集化
  const plan: FontPlanEntry[] = []
  const skipList: FontEmbedSummary['skipped'] = []
  const subsetAudit: NonNullable<FontEmbedSummary['subset']> = []

  for (const [typeface, slots] of usage.typefaces) {
    for (const slot of slots) {
      let face: Awaited<ReturnType<typeof resolveTypeface>> | null = null
      try {
        face = await resolveTypeface(typeface, slot, { projectDir: options.projectDir })
      } catch (err) {
        skipList.push({ typeface, slot, reason: `解析异常：${(err as Error).message}` })
        continue
      }
      if (!face) {
        skipList.push({ typeface, slot, reason: '未在 assets/fonts/、系统字体与显式路径找到' })
        continue
      }
      if (!face.license.embeddable) {
        skipList.push({ typeface, slot, reason: face.license.label, licenseLabel: face.license.label })
        warnings.push(`fsType=${face.license.fsType ?? 'null'} ${typeface}: ${face.license.label}`)
        continue
      }
      if (face.license.readonly) {
        warnings.push(`fsType=0x${face.license.fsType?.toString(16).padStart(4, '0') ?? '?'} ${typeface}: ${face.license.label}`)
      }
      if (face.license.noSubset) {
        warnings.push(`fsType=${face.license.fsType} ${typeface}: ${face.license.label}`)
      }

      // TTC 单 face 提取：fontkit 侧未实测独立 sfnt 输出 API；保守整容器嵌入（体积大但可靠）
      let faceBytes: Uint8Array = face.bytes
      if (face.faceIndex > 0) {
        warnings.push(`${typeface} 是 TTC face#${face.faceIndex}，当前版本嵌入整个 TTC 容器（体积偏大）`)
      }

      // 2) 子集化（按 mode + license.NoSubset）
      const sub: SubsetResult = await subsetIfNeeded(faceBytes, usage.charset, mode, face.license)
      if (sub.degradedReason) {
        warnings.push(`${typeface}(${slot})：${sub.degradedReason}`)
      }
      if (sub.subsetted) {
        subsetAudit.push({ typeface, slot, beforeBytes: sub.beforeBytes, afterBytes: sub.afterBytes })
      }
      plan.push({ typeface, slot, bytes: sub.bytes, subsetted: sub.subsetted })
    }
  }

  if (plan.length === 0) {
    return {
      bytes: pptxBytes,
      summary: { facesEmbedded: [], skipped: skipList, warnings, finalBytes: rawBytes, rawBytes, mode, subset: subsetAudit }
    }
  }

  // 3) EOT 封装 + 四件套注入
  const embedded = embedFontsPostProcess(pptxBytes, plan)

  // 4) 自检（失败即导出失败）
  selfCheckEmbedded(embedded.bytes, { fontPlan: plan })

  return {
    bytes: embedded.bytes,
    summary: {
      facesEmbedded: embedded.facesEmbedded,
      skipped: skipList,
      subset: subsetAudit,
      warnings: [...warnings, ...embedded.log],
      finalBytes: embedded.bytes.byteLength,
      rawBytes,
      mode
    }
  }
}

export type { FontPlanEntry, FontSlot }
export { selfCheckEmbedded }

/** 供 export.ts 用：deck.export.fontEmbed 转本层模式 */
export function modeOfExportConfig(deck: Presentation): FontEmbedMode {
  const raw = deck.export?.fontEmbed
  if (raw === 'off' || raw === 'full' || raw === 'subset') return raw
  return 'subset'
}

/** 读 assets/fonts/<name>（测试与工具备用） */
export async function readAssetFont(projectDir: string, fileName: string): Promise<Uint8Array | null> {
  try {
    const buf = await readFile(path.join(projectDir, 'assets', 'fonts', fileName))
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

