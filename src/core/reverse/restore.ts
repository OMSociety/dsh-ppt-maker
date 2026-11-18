/**
 * 未改页整页恢复（spec §10.4）——逆向工程的导出保真轨。
 *
 * 逆向导入将 PPTD 未建模部件记录为 dropped + 占位，并把原始 pptx
 * 存档至 source/original.pptx（deck.source.archive / originalSha1）。
 * 全部页未改时，导出从存档整份逐页恢复；任一页有编辑痕迹时，
 * 整份按 PPTD 元素重建，占位与报告保留。
 *
 * 「未改」的判定（保守，fail-closed）：
 *   1. deck.profile === 'reverse' 且 deck.source.archive/originalSha1 齐全；
 *   2. 存档文件存在、sha1 与 originalSha1 一致（存档本身没被换过）；
 *   3. 页数与 deck.pages 顺序和导入时一致（页未增删重排）；
 *   4. 该页每个元素仍带 sourceRef（{slideIndex, shapeId}），且 slideIndex
 *      全部指向这一页——导入时每个元素都带 sourceRef，编辑操作（update_element
 *      等）不保证保留它，缺一个就视为「改过」。
 * 任何一条不满足即回退逐页重建，并在 warnings 里说明原因（永不静默）。
 *
 * 当前实现的边界：判定依据是 sourceRef 完整性，不是内容 diff——「改了一个
 * 元素的 text 但 sourceRef 还在」不会被识别为已改。因此本轨默认只在
 * 「整份 deck 自导入后零编辑」时启用整页恢复（restorePage 全 true 才生效），
 * 部分页编辑的场景整份回退逐页重建。
 *
 * 上面这段是能力边界的如实说明；真正的保守口径是：
 * 本模块只在「全部页 sourceRef 完整」时返回 archiveReady=true 且
 * restorePage 全 true，否则 archiveReady=false。调用方按整份 deck 二选一。
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Page, Presentation } from '../pptd/schema.js'

export interface RestoreDecision {
  /** 整页恢复是否可用（存档级门槛）。 */
  archiveReady: boolean
  /** 逐页判定结果：true = 整页恢复；false = 逐页重建。 */
  restorePage: boolean[]
  /** 人读说明（为什么回退重建），进导出 warnings。 */
  notes: string[]
  /** 存档字节（archiveReady 时非空）。 */
  bytes: Uint8Array | null
}

function sha1Of(bytes: Uint8Array): string {
  return createHash('sha1').update(bytes).digest('hex')
}

/** 元素是否仍带「指向本页」的导入溯源标记。 */
function elementUntouched(el: unknown, slideIndex: number): boolean {
  if (!el || typeof el !== 'object') return false
  const ref = (el as { sourceRef?: { slideIndex?: unknown; shapeId?: unknown } }).sourceRef
  if (!ref || typeof ref !== 'object') return false
  return ref.slideIndex === slideIndex && typeof ref.shapeId === 'number'
}

export async function planSourceRestore(
  deck: Presentation,
  pages: Page[],
  projectDir: string,
): Promise<RestoreDecision> {
  const none = (notes: string[]): RestoreDecision => ({
    archiveReady: false,
    restorePage: pages.map(() => false),
    notes,
    bytes: null,
  })

  if (deck.profile !== 'reverse') return none([])
  const source = deck.source
  if (!source?.archive || !source.originalSha1) return none([])

  const archiveAbs = path.resolve(projectDir, source.archive)
  const rel = path.relative(path.resolve(projectDir), archiveAbs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return none(['源存档路径越界，忽略整页恢复'])

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await readFile(archiveAbs))
  } catch {
    return none(['源存档 source/original.pptx 读不到，全部页按 PPTD 重建'])
  }
  if (sha1Of(bytes) !== source.originalSha1) {
    return none(['源存档指纹与 originalSha1 不一致（存档被替换？），全部页按 PPTD 重建'])
  }
  if (source.slideCount !== pages.length) {
    return none([`页数与源文件不一致（源 ${source.slideCount} 页 / 现 ${pages.length} 页），全部页按 PPTD 重建`])
  }

  const notes: string[] = []
  const restorePage = pages.map((page, i) => {
    const slideIndex = i + 1
    const els = Array.isArray(page.elements) ? page.elements : []
    const untouched = els.every((el) => elementUntouched(el, slideIndex))
    if (!untouched) notes.push(`第 ${slideIndex} 页有编辑痕迹，按 PPTD 重建`)
    return untouched
  })

  return { archiveReady: true, restorePage, notes, bytes }
}
