/**
 * fontLicense.ts — 字体许可预检（ppt_check 不动导出也可见的预检）
 *
 * 覆盖口径（与 fsType.ts / resolver.ts 同源）：
 *  - 收集 deck 用到的全部 typeface
 *  - 逐 typeface 走 resolver（assets/fonts/ → 系统字体）
 *  - 按 fsType 位分级：
 *      Restricted (0x0002) / BitmapOnly (0x0200) → blocker（导不出也用不上）
 *      Preview&Print (0x0004) → warning（目标机只读提示）
 *      NoSubset (0x0100) → warning（将整字体嵌入，体积大）
 *  - 解析不到（缺字体）→ warning + 替代建议（ALTERNATIVES）
 *
 * 与 review/index.ts 集成：独立于「布局/结构」类，按每条 typeface 一条 issue。
 */
import type { Page, Presentation } from '../pptd/schema.js'
import { collectFontUsage } from '../fonts/usage.js'
import { findAlternatives, resolveTypeface } from '../fonts/resolver.js'
import type { FontSlot } from '../fonts/resolver.js'
import type { ReviewIssue } from './index.js'

/** 预检一个 deck 的字体许可，返回 ReviewIssue[]（挂在 page:0 区） */
export async function reviewFontLicenses(
  deck: Presentation,
  pages: Page[],
  options: { projectDir?: string } = {}
): Promise<ReviewIssue[]> {
  const usage = collectFontUsage(deck, pages)
  const issues: ReviewIssue[] = []
  // 每个 typeface 只取第一次见到的 slot 做检查（同一族的字幕格位许可位理应一致）
  const seen = new Set<string>()
  for (const [typeface, slots] of usage.typefaces) {
    if (seen.has(typeface)) continue
    seen.add(typeface)
    const firstSlot: FontSlot = slots.has('regular') ? 'regular' : ([...slots][0] ?? 'regular')

    let face: Awaited<ReturnType<typeof resolveTypeface>> | null = null
    try {
      face = await resolveTypeface(typeface, firstSlot, { projectDir: options.projectDir })
    } catch (err) {
      issues.push({
        page: 0,
        severity: 'warning',
        category: 'structure',
        description: `字体 ${typeface} 解析异常：${(err as Error).message}`,
        suggestion: '检查本机字体安装与 assets/fonts/ 目录'
      })
      continue
    }
    if (!face) {
      const alts = findAlternatives(typeface)
      issues.push({
        page: 0,
        severity: 'warning',
        category: 'structure',
        description: `字体未安装：${typeface}（缺失将无法嵌入，导出后目标机可能回落系统字体）`,
        ...(alts.length > 0 ? { suggestion: `建议安装该字体，或改用本地替代：${alts.join(' / ')}` } : { suggestion: '建议安装该字体' })
      })
      continue
    }
    const lic = face.license
    if (lic.fsType === null) {
      issues.push({
        page: 0,
        severity: 'warning',
        category: 'structure',
        description: `字体 ${typeface} 无 OS/2 表（读不到 fsType），无法判定许可`,
        suggestion: '换可靠渠道获取该字体，或在 deck.export.fontEmbed 设为 off 跳过嵌入'
      })
      continue
    }
    if ((lic.fsType & 0x0002) !== 0 || (lic.fsType & 0x0200) !== 0) {
      issues.push({
        page: 0,
        severity: 'blocker',
        category: 'structure',
        description: `字体 ${typeface} 许可禁止嵌入（fsType=0x${lic.fsType.toString(16).padStart(4, '0')}，${lic.label}）`,
        suggestion: '改换可嵌入字体（如思源/MiSans/阿里妈妈/站酷/LXGW 等 fsType=0x0000/0x0008 项），或在 deck.export.fontEmbed 设为 off'
      })
      continue
    }
    if ((lic.fsType & 0x0004) !== 0) {
      issues.push({
        page: 0,
        severity: 'warning',
        category: 'structure',
        description: `字体 ${typeface} 为只读嵌入（Preview & Print，fsType=0x${lic.fsType.toString(16).padStart(4, '0')}）：目标机将看到「只读嵌入式字体」提示`,
        suggestion: lic.label
      })
    }
    if ((lic.fsType & 0x0100) !== 0) {
      issues.push({
        page: 0,
        severity: 'warning',
        category: 'structure',
        description: `字体 ${typeface} 禁止子集化（No Subset）：将整字体嵌入（体积大）`,
        suggestion: lic.label
      })
    }
  }
  return issues
}
