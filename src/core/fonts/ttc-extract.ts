/**
 * ttc-extract.ts — 从 TTC / OTC 容器里提取单个 face，重建为独立 sfnt
 *
 * 为什么需要：TTC 里每个 face 只是一张表目录（表数据共享在同一文件里），而 EOT 封装
 * （eot.ts 的 readFontMeta）与 hb-subset 都只认单 face 的 sfnt——整容器字节进去会在头 4
 * 字节（'ttcf'）上被判「非 TrueType 轮廓」。
 *
 * 提取规则（OTSpec「Font Collections」）：
 *  - 头：'ttcf' + version(4) + numFonts(4) + offsets[numFonts](4×n)，face 表目录在 offsets[faceIndex]
 *  - 表目录里每张表的 offset 是相对文件起点的**绝对偏移**，不叠加 faceOffset（见 fsType.ts 同款注释）
 *  - 新 sfnt 头重算 searchRange / entrySelector / rangeShift；表记录保留原顺序与原校验和，
 *    只把 offset 改写到新布局
 *  - 表数据按 4 字节对齐复制；head.checkSumAdjustment 按规范重算：先归零该字段求整字体和，
 *    再取 0xB1B0AFBA 与之的差（TTC 里该字段按规范为 0，原样搬进独立 sfnt 校验和不成立）
 *
 * 失败一律抛（不是 TTC、face 序号越界、表目录/表数据越界），由 embed-pipeline 降级成跳过+警告。
 */

const TTC_TAG = 0x74746366 // 'ttcf'
const HEAD_TAG = 0x68656164 // 'head'
const CHECKSUM_MAGIC = 0xb1b0afba

interface TableRecord {
  tag: number
  checksum: number
  offset: number
  length: number
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function align4(n: number): number {
  return (n + 3) & ~3
}

function tagStr(tag: number): string {
  return String.fromCharCode((tag >>> 24) & 0xff, (tag >>> 16) & 0xff, (tag >>> 8) & 0xff, tag & 0xff)
}

/** 头 4 字节是否为 'ttcf'（TTF/OTF 与已提取的单 face 均为 false） */
export function isTtcContainer(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 4 && viewOf(bytes).getUint32(0) === TTC_TAG
}

/** 整字体 32 位大端字和（OpenType 校验和口径；长度已 4 字节对齐） */
function sumUint32(bytes: Uint8Array): number {
  const dv = viewOf(bytes)
  let sum = 0
  for (let o = 0; o < bytes.byteLength; o += 4) sum = (sum + dv.getUint32(o)) >>> 0
  return sum >>> 0
}

/**
 * 提取 TTC 的第 faceIndex 个 face 并重建为独立 sfnt。
 * @param ttc 整个 TTC 容器字节
 * @param faceIndex 容器内的 face 序号（0 起；resolver 的 ResolvedFontFace.faceIndex）
 */
export function extractTtcFace(ttc: Uint8Array, faceIndex: number): Uint8Array {
  const dv = viewOf(ttc)
  const total = ttc.byteLength
  if (total < 12) throw new Error(`TTC 头不足 12 字节（实际 ${total}）`)
  if (dv.getUint32(0) !== TTC_TAG) throw new Error(`不是 TTC 容器（头 tag=0x${dv.getUint32(0).toString(16)}）`)
  const numFaces = dv.getUint32(8)
  if (!Number.isInteger(faceIndex) || faceIndex < 0 || faceIndex >= numFaces) {
    throw new Error(`face 序号越界：${faceIndex}（容器共 ${numFaces} 个 face）`)
  }
  const faceOffset = dv.getUint32(12 + faceIndex * 4)
  if (faceOffset + 12 > total) throw new Error(`face#${faceIndex} 表目录越界：offset=${faceOffset} > 文件长 ${total}`)
  const sfntVersion = dv.getUint32(faceOffset)
  const numTables = dv.getUint16(faceOffset + 4)
  if (numTables === 0) throw new Error(`face#${faceIndex} 表目录为空`)

  const records: TableRecord[] = []
  for (let i = 0; i < numTables; i++) {
    const rec = faceOffset + 12 + i * 16
    if (rec + 16 > total) throw new Error(`face#${faceIndex} 表记录 #${i} 越界`)
    const tag = dv.getUint32(rec)
    const checksum = dv.getUint32(rec + 4)
    const offset = dv.getUint32(rec + 8)
    const length = dv.getUint32(rec + 12)
    if (offset + length > total) {
      throw new Error(`face#${faceIndex} 表 ${tagStr(tag)} 数据越界：${offset}+${length} > ${total}`)
    }
    records.push({ tag, checksum, offset, length })
  }

  // 新布局：12B sfnt 头 + 16B×numTables 目录 + 逐表 4 字节对齐数据
  let cursor = 12 + records.length * 16
  const tableAt = records.map((r) => {
    const at = cursor
    cursor = align4(cursor + r.length)
    return at
  })
  const out = new Uint8Array(cursor)
  const odv = viewOf(out)

  // searchRange / entrySelector / rangeShift（按 OTSpec 计算校验和的同名定义）
  let entrySelector = 0
  while (1 << (entrySelector + 1) <= numTables) entrySelector++
  const searchRange = (1 << entrySelector) * 16
  const rangeShift = numTables * 16 - searchRange

  odv.setUint32(0, sfntVersion)
  odv.setUint16(4, numTables)
  odv.setUint16(6, searchRange)
  odv.setUint16(8, entrySelector)
  odv.setUint16(10, rangeShift)

  records.forEach((r, i) => {
    const rec = 12 + i * 16
    odv.setUint32(rec, r.tag)
    odv.setUint32(rec + 4, r.checksum)
    odv.setUint32(rec + 8, tableAt[i])
    odv.setUint32(rec + 12, r.length)
    out.set(ttc.subarray(r.offset, r.offset + r.length), tableAt[i])
  })

  const headIdx = records.findIndex((r) => r.tag === HEAD_TAG)
  if (headIdx >= 0 && records[headIdx].length >= 12) {
    const adjAt = tableAt[headIdx] + 8
    odv.setUint32(adjAt, 0)
    odv.setUint32(adjAt, (CHECKSUM_MAGIC - sumUint32(out)) >>> 0)
  }
  return out
}
