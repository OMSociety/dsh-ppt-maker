/**
 * 未改页整页恢复（spec §10.4）——逆向工程的导出保真轨。
 *
 * 逆向导入将 PPTD 未建模部件记录为 dropped + 占位，把原始 pptx 存档至
 * source/original.pptx（deck.source.archive / originalSha1），并把导入完成时
 * 每页内容的指纹写进 source/page-fingerprints.json。全部页未改时，导出从
 * 存档整份逐页恢复；任一页有改动时，整份按 PPTD 元素重建，占位与报告保留。
 *
 * 「未改」的判定（fail-closed）：
 *   1. deck.profile === 'reverse' 且 deck.source.archive/originalSha1 齐全；
 *   2. 存档文件存在、sha1 与 originalSha1 一致（存档本身没被换过）；
 *   3. 页数与导入时一致；
 *   4. 每页当前内容的指纹（pageFingerprint：按键排序的规范 JSON 的 sha1）
 *      与导入时记录的指纹一致——元素增删、字段改动、删空整页都会改变指纹。
 * 任何一条不满足即回退逐页重建，并在 notes 里说明原因（永不静默）。
 * 调用方按整份 deck 二选一：archiveReady 且 restorePage 全 true 才整页恢复。
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Page, Presentation } from '../pptd/schema.js'

/** 页指纹文件：与存档同目录，不参与 manifest.checksum。 */
export const PAGE_FINGERPRINTS_FILE = 'page-fingerprints.json'

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

function sha1Of(bytes: Uint8Array | string): string {
  return createHash('sha1').update(bytes).digest('hex')
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key]
      if (v !== undefined) out[key] = canonical(v)
    }
    return out
  }
  return value
}

/** 页内容指纹：键序无关、忽略 undefined 字段。 */
export function pageFingerprint(page: Page): string {
  return sha1Of(JSON.stringify(canonical(page)))
}

async function readFingerprints(archiveAbs: string): Promise<string[] | null> {
  try {
    const raw = JSON.parse(await readFile(path.join(path.dirname(archiveAbs), PAGE_FINGERPRINTS_FILE), 'utf8')) as { pages?: unknown }
    return Array.isArray(raw.pages) && raw.pages.every((p) => typeof p === 'string') ? (raw.pages as string[]) : null
  } catch {
    return null
  }
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
  const fingerprints = await readFingerprints(archiveAbs)
  if (!fingerprints || fingerprints.length !== pages.length) {
    return none([`页指纹 source/${PAGE_FINGERPRINTS_FILE} 缺失或页数不符，全部页按 PPTD 重建`])
  }

  const notes: string[] = []
  const restorePage = pages.map((page, i) => {
    const untouched = pageFingerprint(page) === fingerprints[i]
    if (!untouched) notes.push(`第 ${i + 1} 页内容与导入时不同，按 PPTD 重建`)
    return untouched
  })

  return { archiveReady: true, restorePage, notes, bytes }
}