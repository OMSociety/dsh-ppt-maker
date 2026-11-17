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
import { resolveTypeface } from '../fonts/resolver.js'
import { extractTtcFace, isTtcContainer } from '../fonts/ttc-extract.js'

export interface MeasurerBuildResult {
  measureText: TextMeasurer
  /** 成功注册进量测器的族名清单。 */
  registered: string[]
  /** 解析不到、未注册的族名清单（这些族仍用启发式/内置 face 量测）。 */
  unresolved: string[]
}

export async function buildDeckMeasurer(
  deck: Presentation,
  pages: Page[],
  options: { projectDir?: string } = {}
): Promise<MeasurerBuildResult | null> {
  try {
    const usage = collectFontUsage(deck, pages)
    const typefaces = [...usage.typefaces.keys()]
    const fonts: RegisteredFont[] = []
    const registered: string[] = []
    const unresolved: string[] = []
    for (const typeface of typefaces) {
      try {
        const face = await resolveTypeface(typeface, 'regular', { projectDir: options.projectDir })
        if (!face) {
          unresolved.push(typeface)
          continue
        }
        const bytes = isTtcContainer(face.bytes) ? extractTtcFace(face.bytes, face.faceIndex) : face.bytes
        fonts.push({ family: typeface, source: bytes })
        registered.push(typeface)
      } catch {
        unresolved.push(typeface)
      }
    }
    return { measureText: buildFontkitMeasurer({ fonts }), registered, unresolved }
  } catch {
    return null
  }
}
