/**
 * 源存档导出轨（spec §10.4）——逆向工程的导出保真。
 *
 * 逆向导入把原始 pptx 存档至 source/original.pptx（deck.source.archive /
 * originalSha1），并把导入完成时每页内容的指纹写进
 * source/page-fingerprints.json。导出时：
 *
 *   - 存档可用（存在且 sha1 与 originalSha1 一致）→ 以存档为骨架构建：主题、
 *     母版、版式、字体表原样沿用，重建页挂回源页所用的版式（Page.layoutRef）；
 *   - 某页当前内容的指纹与某张源页导入时的指纹相同 → 该页直接沿用源页
 *     （图表、SmartArt、动画、备注等全部原样）；页可以重排、删除、复制，
 *     按指纹逐页匹配，同一张源页最多被沿用一次；
 *   - 其余页按 PPTD 元素重建。
 *
 * 存档不可用时 archiveReady=false，整份按 PPTD 从空白文档重建，并在 notes 里
 * 说明原因（永不静默）。
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Page, Presentation } from '../pptd/schema.js'

/** 页指纹文件：与存档同目录，不参与 manifest.checksum。 */
export const PAGE_FINGERPRINTS_FILE = 'page-fingerprints.json'

export interface RestoreDecision {
  /** 存档骨架是否可用。 */
  archiveReady: boolean
  /** 逐页判定：源页序号（0 起）= 沿用该源页；null = 按 PPTD 重建。 */
  restoreFrom: (number | null)[]
  /** 人读说明（存档不可用的原因、指纹缺失等），进导出 warnings。 */
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
    restoreFrom: pages.map(() => null),
    notes,
    bytes: null,
  })

  if (deck.profile !== 'reverse') return none([])
  const source = deck.source
  if (!source?.archive || !source.originalSha1) return none([])

  const archiveAbs = path.resolve(projectDir, source.archive)
  const rel = path.relative(path.resolve(projectDir), archiveAbs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return none(['源存档路径越界，整份按 PPTD 从空白文档重建'])

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await readFile(archiveAbs))
  } catch {
    return none(['源存档 source/original.pptx 读不到，整份按 PPTD 从空白文档重建（母版与版式装饰不会带回）'])
  }
  if (sha1Of(bytes) !== source.originalSha1) {
    return none(['源存档指纹与 originalSha1 不一致（存档被替换？），整份按 PPTD 从空白文档重建'])
  }

  const fingerprints = await readFingerprints(archiveAbs)
  if (!fingerprints) {
    return {
      archiveReady: true,
      restoreFrom: pages.map(() => null),
      notes: [`页指纹 source/${PAGE_FINGERPRINTS_FILE} 缺失，全部页按 PPTD 重建（沿用源存档的母版与版式）`],
      bytes,
    }
  }

  // 指纹 → 尚未被沿用的源页序号队列（同内容的源页可能不止一张）。
  const pool = new Map<string, number[]>()
  fingerprints.forEach((fp, i) => {
    const queue = pool.get(fp)
    if (queue) queue.push(i)
    else pool.set(fp, [i])
  })
  const restoreFrom = pages.map((page) => pool.get(pageFingerprint(page))?.shift() ?? null)
  return { archiveReady: true, restoreFrom, notes: [], bytes }
}
