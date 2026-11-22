/**
 * 文字量测：把工程实际用到的字体注册进 fontkit 量测器，
 * 让 reviewDeck 的文字溢出判定用真实字形宽度（而非启发式估算）。
 *
 * 注册表来源与字体嵌入同一解析链：collectFontUsage 收集 typeface 清单，
 * resolveTypeface 逐个解析到本机/工程 assets/fonts 的具体 face（TTC 容器
 * 由 extractTtcFace 抽单 face 字节）。解析不到的族不注册——量测器对未注册
 * 族回退内置拉丁 face，行为与缺省一致，不会更差。
 *
 * 这是 best-effort 增强：任何一步失败都返回 null（调用方退回启发式量测），
 * 绝不因为量测器建不起来而炸掉整个质检。
 */
import { buildFontkitMeasurer, type RegisteredFont } from '@office-kit/pptx-preview/node'
import type { TextMeasurer } from '@office-kit/pptx-preview'
import type { Presentation, Page } from '../pptd/schema.js'
import { collectFontUsage } from '../fonts/usage.js'
import { resolveTypeface, type FontSlot } from '../fonts/resolver.js'
import { extractTtcFace, isTtcContainer } from '../fonts/ttc-extract.js'

export interface MeasurerBuildResult {
  measureText: TextMeasurer
  /** 成功注册进量测器的族名清单。 */
  registered: string[]
  /** 解析不到、未注册的族名清单（这些族仍用启发式/内置 face 量测）。 */
  unresolved: string[]
  /** 用到粗/斜体但本机只有其它字重的「族 字形」清单：按最近字形量测，宽度可能偏差。 */
  approximated: string[]
}

const SLOT_FLAGS: Record<FontSlot, { bold: boolean; italic: boolean }> = {
  regular: { bold: false, italic: false },
  bold: { bold: true, italic: false },
  italic: { bold: false, italic: true },
  boldItalic: { bold: true, italic: true }
}

export async function buildDeckMeasurer(
  deck: Presentation,
  pages: Page[],
  options: { projectDir?: string } = {}
): Promise<MeasurerBuildResult | null> {
  try {
    const usage = collectFontUsage(deck, pages)
    const fonts: RegisteredFont[] = []
    const registered: string[] = []
    const unresolved: string[] = []
    const approximated: string[] = []
    for (const [typeface, usedSlots] of usage.typefaces) {
      // regular 始终注册：它是该族所有未注册字形的回落。
      const slots = new Set<FontSlot>(['regular', ...usedSlots])
      let any = false
      const registeredSlots = new Set<FontSlot>()
      for (const slot of slots) {
        try {
          const face = await resolveTypeface(typeface, slot, { projectDir: options.projectDir })
          if (!face) continue
          if (face.slot !== slot && slot !== 'regular') approximated.push(`${typeface} ${slot}`)
          any = true
          if (registeredSlots.has(face.slot)) continue
          registeredSlots.add(face.slot)
          const bytes = isTtcContainer(face.bytes) ? extractTtcFace(face.bytes, face.faceIndex) : face.bytes
          fonts.push({ family: typeface, source: bytes, ...SLOT_FLAGS[face.slot] })
        } catch {
          /* 该字形不可用：由 regular 或内置 face 量测 */
        }
      }
      if (any) registered.push(typeface)
      else unresolved.push(typeface)
    }
    return { measureText: buildFontkitMeasurer({ fonts }), registered, unresolved, approximated }
  } catch {
    return null
  }
}