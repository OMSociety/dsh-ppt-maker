/**
 * core/fonts/embed-pipeline.ts — 导出端字体嵌入编排（一条链出口）
 *
 * 组装三张异质输入为统一的 fontPlan，交付 fontEmbed 决策落点：
 *   buildDeck 产物 (fontsUsed) + projectDir + exportConfig
 *       → collectFontUsage(typefaces+charset) ∪ built.fontsUsed
 *       → 逐 typeface 解析 (resolver) + fsType 闸（TTC 先抽单 face）
 *       → 子集化（默认）或整字体直通
 *       → EOT 封装 → 四件套注入 → selfCheckEmbedded
 *
 * 失败口径：单个 face 的提取 / 子集 / EOT 前置条件不满足一律「跳过 + 警告」，
 * 不中断整次导出（selfCheckEmbedded 的产物自检仍然失败即抛）。
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
import { readFontMeta } from './eot.js'
import { extractTtcFace, isTtcContainer } from './ttc-extract.js'
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

  // build 期引擎记下的族名（不含 slot 信息）并入扫描结果：usage 只覆盖 PPTD 声明面，
  // 引擎实际写出过的字体若漏收，导出的 pptx 会在目标机上回落系统字体。
  for (const name of built.fontsUsed) {
    if (typeof name !== 'string' || name === '' || usage.typefaces.has(name)) continue
    usage.typefaces.set(name, new Set<FontSlot>(['regular']))
  }

  // 1) 逐 (typeface, slot) 解析 + fsType 闸
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
      // resolver 在请求槽位缺字时会回落 regular/首个 face（见 resolver.ts:482-483）。
      // 这张 face 的槽位与请求不符，按请求槽位写进 embeddedFontLst 等于谎报字重，跳过并记账。
      if (face.slot !== slot) {
        const reason = `实际解析到 ${face.slot} 槽位（${face.path}#${face.faceIndex}），与请求的 ${slot} 不符`
        skipList.push({ typeface, slot, reason })
        warnings.push(`${typeface}(${slot})：${reason}`)
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

      // 2) TTC：face.bytes 是整个容器，EOT 封装与 hb-subset 都只认单 face sfnt，
      //     先按 faceIndex 把该 face 抽成独立 sfnt；face#0 同样是容器字节，一并提取。
      let faceBytes: Uint8Array = face.bytes
      if (isTtcContainer(face.bytes) || face.faceIndex > 0) {
        try {
          faceBytes = extractTtcFace(face.bytes, face.faceIndex)
        } catch (err) {
          const reason = `TTC face#${face.faceIndex} 提取失败：${(err as Error).message}`
          skipList.push({ typeface, slot: face.slot, reason })
          warnings.push(`${typeface}(${face.slot})：${reason}`)
          continue
        }
      }

      // 3) 子集化（按 mode + license.NoSubset）。subset.ts 内部把失败降级成「整字体 + warning」；
      //     这里的 catch 兜住该函数自身异常，保证本链不因单个 face 抛出去。
      let sub: SubsetResult
      try {
        sub = await subsetIfNeeded(faceBytes, usage.charset, mode, face.license)
      } catch (err) {
        const reason = `子集化异常：${(err as Error).message}`
        skipList.push({ typeface, slot: face.slot, reason })
        warnings.push(`${typeface}(${face.slot})：${reason}`)
        continue
      }
      if (sub.degradedReason) {
        warnings.push(`${typeface}(${face.slot})：${sub.degradedReason}`)
      }

      // 4) EOT 只封装 glyf 轮廓的 TTF。先按 wrapEot 的读头前置条件判一次（CFF/OTTO 报
      //     「非 TrueType 轮廓」，缺 head/OS2/name 同样报），失败降级成跳过+警告，
      //     不让它冒到 embedFontsPostProcess 里中断整次导出。
      try {
        readFontMeta(sub.bytes)
      } catch (err) {
        const reason = isOttoCff(sub.bytes)
          ? 'CFF 轮廓（OTTO）无法做 EOT 嵌入'
          : `EOT 封装前置条件不满足：${(err as Error).message}`
        skipList.push({ typeface, slot: face.slot, reason })
        warnings.push(`${typeface}(${face.slot})：${reason}，已跳过嵌入；建议改用 TTF 版字体或 deck.export.fontEmbed=off`)
        continue
      }
      if (sub.subsetted) {
        subsetAudit.push({ typeface, slot: face.slot, beforeBytes: sub.beforeBytes, afterBytes: sub.afterBytes })
      }
      plan.push({ typeface, slot: face.slot, bytes: sub.bytes, subsetted: sub.subsetted })
    }
  }

  if (plan.length === 0) {
    return {
      bytes: pptxBytes,
      summary: { facesEmbedded: [], skipped: skipList, warnings, finalBytes: rawBytes, rawBytes, mode, subset: subsetAudit }
    }
  }

  // 5) EOT 封装 + 四件套注入
  const embedded = embedFontsPostProcess(pptxBytes, plan)

  // 6) 自检（失败即导出失败）
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

/** 头 4 字节是否为 'OTTO'（CFF/OpenType 轮廓；EOT 只封装 glyf） */
function isOttoCff(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 4) return false
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0) === 0x4f54544f
}

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

