/**
 * fsType.ts — OS/2.fsType 许可位读取与嵌入策略判定
 *
 * 位定义按 Microsoft Learn OpenType OS/2 规范（fsType @ OS/2+8）。
 * 判定一律按位与，禁止等值比较（位可组合）。
 * TTC 支持：逐 face 取各自的 OS/2，返回数组；调用方按选定的 face 判定。
 *
 * 处置策略（审查修订第 4 条定案）：
 *  - 0x0000 / 0x0008 (Installable/Editable) → 可嵌入可编辑，直接嵌
 *  - 0x0004 (Preview & Print) → 可嵌入，manifest 记只读警告（PowerPoint 弹「只读嵌入式字体」属预期）
 *  - 0x0100 (No Subset) → 该 face 禁子集化，强制整字体嵌入
 *  - 0x0002 (Restricted) / 0x0200 (Bitmap Only) → 禁嵌入，跳过 + 警告
 *  - 读不到 OS/2 → 保守跳过 + 警告
 */

export interface FontLicense {
  /** OS/2.fsType 原始位值；读不到 OS/2 时为 null */
  fsType: number | null
  /** 可嵌入（技术上看允许 PowerPoint 安装） */
  embeddable: boolean
  /** 只读嵌入（P&P 位）：目标机只能查看/打印，不能编辑 */
  readonly: boolean
  /** 禁子集化：必须整字体写入 */
  noSubset: boolean
  /** 人类可读的处置说明（中文，直接进导出摘要与 manifest 警告） */
  label: string
}

export const FS_RESTRICTED = 0x0002
export const FS_PREVIEW_PRINT = 0x0004
export const FS_EDITABLE = 0x0008
export const FS_NO_SUBSET = 0x0100
export const FS_BITMAP_ONLY = 0x0200

interface TableDir {
  offset: number
  length: number
}

function readUint16BE(dv: DataView, off: number): number {
  return dv.getUint16(off, false)
}

function readUint32BE(dv: DataView, off: number): number {
  return dv.getUint32(off, false)
}

/** 读单个 sfnt face 的 OS/2.fsType；返回 null 表示读不到。
 * @param bytes 全字体字节
 * @param faceOffset 该 face 在容器内的偏移（TTC 用；TTF/OTF 为 0）。
 * 注意（OTSpec 实证，fontkit 交叉验证）：表目录里的 offset 一律是相对文件起点
 * 的绝对偏移——TTF 时 face 起点即文件起点二者重合；TTC 时**不是**相对 face 起点。
 * 此前实现加成 faceOffset 导致 TTC 读串（雅黑 face0 误读 0x0204 拒嵌，实为 0x0000 可嵌）。 */
function fsTypeOfFace(bytes: Uint8Array, faceOffset: number): number | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (faceOffset + 12 > dv.byteLength) return null
  const numTables = readUint16BE(dv, faceOffset + 4)
  for (let i = 0; i < numTables; i++) {
    const rec = faceOffset + 12 + i * 16
    if (rec + 16 > dv.byteLength) break
    const tag = String.fromCharCode(bytes[rec], bytes[rec + 1], bytes[rec + 2], bytes[rec + 3])
    if (tag === 'OS/2') {
      const absOff = readUint32BE(dv, rec + 8)
      if (absOff + 10 > dv.byteLength) return null
      return readUint16BE(dv, absOff + 8)
    }
  }
  return null
}

/**
 * 读取字体字节（TTF / OTF / TTC）每个 face 的 fsType。
 * TTC 返回数组（按 face 顺序）；TTF/OTF 返回单元素数组；读不出 OS/2 的 face 为 null。
 */
export function readFsTypeAll(bytes: Uint8Array): Array<number | null> {
  if (bytes.length < 12) return [null]
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag0 = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  if (tag0 === 'ttcf') {
    // TrueType Collection：头 12B + numFaces×4B 偏移表
    const numFaces = readUint32BE(dv, 8)
    const out: Array<number | null> = []
    for (let i = 0; i < numFaces; i++) {
      const faceOff = readUint32BE(dv, 12 + i * 4)
      out.push(fsTypeOfFace(bytes, faceOff))
    }
    return out
  }
  return [fsTypeOfFace(bytes, 0)]
}

/** 单 face 或 TTC 取 0 号 face 的便捷形态 */
export function readFsType(bytes: Uint8Array): number | null {
  return readFsTypeAll(bytes)[0] ?? null
}

/** 由 fsType 位值给出处置策略（纯函数） */
export function licenseOf(fsType: number | null): FontLicense {
  if (fsType === null) {
    return {
      fsType: null,
      embeddable: false,
      readonly: false,
      noSubset: false,
      label: 'OS/2 表读不到，保守跳过嵌入（需用户排查字体文件完整性）'
    }
  }
  if ((fsType & FS_RESTRICTED) !== 0) {
    return { fsType, embeddable: false, readonly: false, noSubset: false, label: '许可禁止嵌入（Restricted）' }
  }
  if ((fsType & FS_BITMAP_ONLY) !== 0) {
    return { fsType, embeddable: false, readonly: false, noSubset: false, label: '许可仅允许嵌入位图（Bitmap Only，视同禁嵌）' }
  }
  const readonly = (fsType & FS_PREVIEW_PRINT) !== 0
  const noSubset = (fsType & FS_NO_SUBSET) !== 0
  const editable = (fsType & FS_EDITABLE) !== 0
  let label: string
  if (readonly) label = '可嵌入但目标机只读（Preview & Print），PowerPoint 会提示「只读嵌入式字体」'
  else if (noSubset) label = '可嵌入但禁止子集化（No Subset），将整字体嵌入'
  else if (editable) label = '可嵌入可编辑（Editable）'
  else label = '可嵌入可编辑（Installable）'
  return { fsType, embeddable: true, readonly, noSubset, label }
}
