/**
 * eot.ts — TTF → EOT (Embedded OpenType) 封装
 *
 * 实测依据（spike 六轮攻坚，每轮都由本机自编的 headless 裁决器调 t2embed 验证）：
 *  - fntdata 必须是 EOT 封装；裸 TTF/CFF 均被 t2embed!TTLoadEmbeddedFont 拒载（「一般错误」根因）
 *  - EOT Version 必须是 0x00020001；真件 0x00020002 是 MicroType 压缩通道版本号，配未压缩数据必死（0x0102）
 *  - flags=0（不子集、不压缩、不加密）对整字体与 hb-subset 产物均通过
 *  - fsType 不设卡：0x0000/0x0004/0x0008 均成功加载，仅 privStatus 不同（P&P 只读提示属预期）
 *
 * 依据出自 spike 期暂存区的纯 JS 原型（19/19 断言），原型与裁决器均不在本仓。
 */

const EOT_VERSION = 0x00020001
const EOT_MAGIC = 0x504c // "LP"

export interface EotFontMeta {
  checkSumAdjustment: number
  headOffset: number
  panose: Uint8Array
  charset: number
  italic: number
  weight: number
  fsType: number
  unicodeRange: [number, number, number, number]
  codePageRange: [number, number]
  familyName: string
  styleName: string
  fullName: string
  versionName: string
}

export interface EotWrapResult {
  eot: Uint8Array
  meta: EotFontMeta
}

/** 从 TTF 字节解析 EOT 头所需的全部元数据 */
export function readFontMeta(ttf: Uint8Array): EotFontMeta {
  const dv = new DataView(ttf.buffer, ttf.byteOffset, ttf.byteLength)
  const sfnt = dv.getUint32(0)
  if (sfnt !== 0x00010000) {
    throw new Error(`非 TrueType 轮廓（sfnt=0x${sfnt.toString(16)}），EOT 仅封装 glyf TTF`)
  }
  const numTables = dv.getUint16(4)
  const tables: Record<string, { offset: number; length: number }> = {}
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16
    const tag = String.fromCharCode(ttf[o], ttf[o + 1], ttf[o + 2], ttf[o + 3])
    tables[tag] = { offset: dv.getUint32(o + 8), length: dv.getUint32(o + 12) }
  }
  for (const t of ['head', 'OS/2', 'name']) {
    if (!tables[t]) throw new Error(`缺少 ${t} 表`)
  }
  const head = tables['head'].offset
  const os2 = tables['OS/2'].offset

  // name 表：取 (platform 3, encoding 1, lang 0x409) 优先，退回任意可读记录
  const nameOff = tables['name'].offset
  const count = dv.getUint16(nameOff + 2)
  const strBase = nameOff + dv.getUint16(nameOff + 4)
  const pickName = (id: number): string => {
    let fallback: string | null = null
    for (let i = 0; i < count; i++) {
      const r = nameOff + 6 + i * 12
      const pid = dv.getUint16(r)
      const lid = dv.getUint16(r + 4)
      const nid = dv.getUint16(r + 6)
      if (nid !== id) continue
      const len = dv.getUint16(r + 8)
      const off = dv.getUint16(r + 10)
      const raw = ttf.subarray(strBase + off, strBase + off + len)
      if (pid === 3) {
        // UTF-16BE → 转码
        let s = ''
        for (let j = 0; j + 1 < raw.length; j += 2) s += String.fromCharCode((raw[j] << 8) | raw[j + 1])
        if (lid === 0x0409) return s
        fallback ??= s
      } else if (pid === 1 && fallback === null) {
        fallback = String.fromCharCode(...raw)
      }
    }
    return fallback ?? ''
  }

  const cp1 = dv.getUint32(os2 + 78)
  // Charset 字节推导（与真件 font5 微软雅黑 0x86 印证）：codepage 位 → Windows charset
  let charset = 0 // ANSI_CHARSET
  if (cp1 & 0x00040000) charset = 134 // GBK 936 → GB2312_CHARSET
  else if (cp1 & 0x00020000) charset = 128 // 932 JIS → SHIFTJIS_CHARSET
  else if (cp1 & 0x00080000) charset = 129 // 949 → HANGEUL_CHARSET
  else if (cp1 & 0x00200000) charset = 136 // 950 Big5 → CHINESEBIG5_CHARSET

  const fsSelection = dv.getUint16(os2 + 62)
  return {
    checkSumAdjustment: dv.getUint32(head + 8),
    headOffset: head,
    panose: ttf.subarray(os2 + 32, os2 + 42),
    charset,
    italic: fsSelection & 0x01 ? 1 : 0,
    weight: dv.getUint16(os2 + 4),
    fsType: dv.getUint16(os2 + 8),
    unicodeRange: [0, 1, 2, 3].map((i) => dv.getUint32(os2 + 42 + i * 4)) as [number, number, number, number],
    codePageRange: [cp1, dv.getUint32(os2 + 82)],
    familyName: pickName(1),
    styleName: pickName(2),
    fullName: pickName(4),
    versionName: pickName(5)
  }
}

function utf16leNull(s: string): Uint8Array {
  const b = new Uint8Array((s.length + 1) * 2)
  const dv = new DataView(b.buffer)
  for (let i = 0; i < s.length; i++) dv.setUint16(i * 2, s.charCodeAt(i), true)
  return b // 含 null 终止（真件 FamilyNameSize 含终止符，已印证）
}

/**
 * TTF → EOT 0x00020001（flags=0，整字体或子集产物均不压缩不加密）
 * @param ttfBytes 裸 TTF（或 hb-subset 产物的 sfnt TTF）
 */
export function wrapEot(ttfBytes: Uint8Array): EotWrapResult {
  const meta = readFontMeta(ttfBytes)
  // FontData：head.checkSumAdjustment 置零（原值存入 EOT 头）
  const fontData = new Uint8Array(ttfBytes)
  fontData.fill(0, meta.headOffset + 8, meta.headOffset + 12)

  const names = [meta.familyName, meta.styleName, meta.versionName, meta.fullName].map(utf16leNull)
  const fixed = 80 // 固定段 80B；Padding1(2B) 随首个 name 段写入
  const namesLen = names.reduce((a, n) => a + 4 + n.length, 0) // 每段：pad2 + size2 + bytes
  const v2tail = 24 // pad2+rootSize2+rootCrc4+eudcCP4+pad2+sigSize2+eudcFlags4+eudcFontSize4
  const eotSize = fixed + namesLen + v2tail + fontData.length

  const out = new Uint8Array(eotSize)
  const dv = new DataView(out.buffer)
  let p = 0
  const u16 = (v: number) => {
    dv.setUint16(p, v & 0xffff, true)
    p += 2
  }
  const u32 = (v: number) => {
    dv.setUint32(p, v >>> 0, true)
    p += 4
  }

  u32(eotSize)
  u32(fontData.length)
  u32(EOT_VERSION)
  u32(0) // EOTSize/FontDataSize/Version/Flags
  out.set(meta.panose, p)
  p += 10
  out[p++] = meta.charset
  out[p++] = meta.italic
  u32(meta.weight)
  u16(meta.fsType)
  u16(EOT_MAGIC)
  for (const v of meta.unicodeRange) u32(v)
  for (const v of meta.codePageRange) u32(v)
  u32(meta.checkSumAdjustment)
  u32(0)
  u32(0)
  u32(0)
  u32(0) // Reserved1-4
  for (const n of names) {
    u16(0)
    u16(n.length)
    out.set(n, p)
    p += n.length
  }
  u16(0)
  u16(0) // Padding5 + RootStringSize（空）
  u32(0) // RootStringCheckSum（空串 = 0）
  u32(0) // EUDCCodePage
  u16(0)
  u16(0) // Padding6 + SignatureSize（无签名）
  u32(0) // EUDCFlags
  u32(0) // EUDCFontSize
  out.set(fontData, p)
  p += fontData.length
  if (p !== eotSize) throw new Error(`EOT 长度算错: wrote ${p} != ${eotSize}`)
  return { eot: out, meta }
}
