/**
 * subset.ts — 字体子集化包装（spike 实测背书 subset-font 四款全过）
 *
 * 策略：
 *  - fontEmbed=full → 直通不子集
 *  - fsType 带 NoSubset 位 → 直通不子集（许可要求）
 *  - fontEmbed=subset（默认） → subset-font（HarfBuzz WASM）子集 + 保底字符集
 *
 * 保底字符集：ASCII 可打印 + 常用中/英文标点 + 数字全半角 + 当前 deck 去重字集
 * （防空页/后补字符豆腐块；文档已声明「新增字符会出现豆腐块」）。
 *
 * 失败回退：subsetFont 抛错 → 返回原字体 + warning（镶嵌调用方记账）。
 */

import type { FontLicense } from './fsType.js'

export type FontEmbedMode = 'subset' | 'full' | 'off'

export interface SubsetResult {
  /** 子集产物字节；直通/失败时为原字体字节 */
  bytes: Uint8Array
  /** 是否实际走了子集化 */
  subsetted: boolean
  /** 子集前字节数；直通时为 0 */
  beforeBytes: number
  /** 子集后字节数；直通时为原值 */
  afterBytes: number
  /** 失败/降级原因（用于 warnings 记账） */
  degradedReason?: string
}

/** ASCII 可打印 + 常用中英文标点保底（防空页/后补） */
const MIN_CHARSET = (() => {
  const out: string[] = []
  // ASCII 32..126
  for (let i = 32; i <= 126; i++) out.push(String.fromCharCode(i))
  // 常用中文标点
  out.push('　', '。', '，', '、', '；', '：', '？', '！', '「', '」', '『', '』', '（', '）', '《', '》', '【', '】',
    '—', '–', '…', '·', '〈', '〉')
  // 全角数字与全角字母（少量）
  for (let i = 0; i < 10; i++) out.push(String.fromCharCode(0xff10 + i))
  return out.join('')
})()

let subsetFontCache: ((buf: Uint8Array, text: string, opts: { targetFormat: string }) => Promise<Uint8Array>) | null = null

type SubsetFontFn = (buf: Uint8Array, text: string, opts: { targetFormat: string }) => Promise<Uint8Array>

async function loadSubset(): Promise<SubsetFontFn> {
  if (subsetFontCache) return subsetFontCache
  const { createRequire } = await import('node:module')
  const req = createRequire(import.meta.url)
  // subset-font 是 main.CJS 且直接 module.exports = async function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = req('subset-font') as any
  subsetFontCache = (typeof mod === 'function' ? mod : (mod?.default ?? mod?.subsetFont)) as SubsetFontFn
  return subsetFontCache
}

/**
 * 对单 face 字体字节做子集化（按 mode + license 判定）。
 * @param bytes 字体原始字节（TTF/OTF；TTC 先由调用方提取 face）
 * @param charset deck 全集去重字符（一段字符串；内部自动并保底字符集）
 * @param mode 用户配置（'subset' | 'full' | 'off'）
 * @param license fsType 处置（NoSubset 位强制 full）
 */
export async function subsetIfNeeded(
  bytes: Uint8Array,
  charset: string,
  mode: FontEmbedMode,
  license: FontLicense
): Promise<SubsetResult> {
  const before = bytes.byteLength
  if (mode === 'off' || mode === 'full' || license.noSubset) {
    return { bytes, subsetted: false, beforeBytes: before, afterBytes: before }
  }
  if (!license.embeddable) {
    // 调用方在简历阶段已按许可过滤；这里保守直通
    return { bytes, subsetted: false, beforeBytes: before, afterBytes: before }
  }
  try {
    const subset = await loadSubset()
    const merged = `${charset}${MIN_CHARSET}`
    // subset-font 内部走 harfbuzzjs，对 Uint8Array 的签名检查严格 —— 必须传 Buffer
    const { Buffer } = await import('node:buffer')
    const bufIn = Buffer.from(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength)
    const out = (await subset(bufIn, merged, { targetFormat: 'sfnt' })) as unknown as Uint8Array
    return { bytes: new Uint8Array(out.buffer as ArrayBuffer, out.byteOffset, out.byteLength), subsetted: true, beforeBytes: before, afterBytes: out.byteLength }
  } catch (err) {
    return {
      bytes,
      subsetted: false,
      beforeBytes: before,
      afterBytes: before,
      degradedReason: `子集化失败（${(err as Error).message}），已整字体嵌入`
    }
  }
}
