/**
 * TTC 单 face 提取（src/core/fonts/ttc-extract.ts）与导出链路的 TTC 路径。
 *
 * 真件取系统已装 TTC（msyh.ttc 优先）；候选都不在位时用 it.skip 跳过并在文件顶层打印原因。
 *
 * 判据：
 *  - 提取产物不再是 'ttcf'，头部 sfnt 版本与源 face 一致
 *  - readFontMeta 能读出族名与 fsType（head / OS/2 / name 三表都在，且偏移对）
 *  - 产物每张表的数据与容器里该 face 的表数据逐字节相同（证明取的是第 i 个 face）
 *  - 导出链路遇到容器字节时先抽 face 再嵌：不再整容器进 EOT
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { createPresentation, addBlankSlide, savePresentation, addSlideTextBox, emu } from '@office-kit/pptx'
import { extractTtcFace, isTtcContainer } from '../src/core/fonts/ttc-extract.js'
import { readFontMeta } from '../src/core/fonts/eot.js'
import { readFsTypeAll } from '../src/core/fonts/fsType.js'
import { resolveTypeface } from '../src/core/fonts/resolver.js'
import { embedFontsForPptx } from '../src/core/fonts/embed-pipeline.js'
import type { Presentation } from '../src/core/pptd/schema.js'

/** 候选真件 TTC（多 face 容器，两个都是 glyf 轮廓） */
const TTC_CANDIDATES = ['C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\simsun.ttc']

function hasFile(p: string): boolean {
  try {
    return existsSync(p) && readFileSync(p).length > 0
  } catch {
    return false
  }
}

const REAL_TTC = TTC_CANDIDATES.find(hasFile) ?? null
const TTC_BYTES = REAL_TTC === null ? null : new Uint8Array(readFileSync(REAL_TTC))
if (REAL_TTC === null) {
  console.warn(`[fonts-ttc] 真件用例跳过：未找到系统 TTC（候选 ${TTC_CANDIDATES.join(' / ')}）`)
}
const itTtc = REAL_TTC === null ? it.skip : it

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

/** 零拷贝 Buffer 视图（大字体表逐字节比较用 Buffer.compare，避免逐元素深比较的开销） */
function bufOf(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function sameSlice(a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.compare(bufOf(a), bufOf(b)) === 0
}

interface TableEntry {
  tag: string
  offset: number
  length: number
}

/** 读 sfnt/face 表目录（faceOffset 对 TTC 是容器内绝对位置，对独立 sfnt 是 0） */
function tableDirOf(bytes: Uint8Array, faceOffset: number): TableEntry[] {
  const dv = viewOf(bytes)
  const numTables = dv.getUint16(faceOffset + 4)
  const out: TableEntry[] = []
  for (let i = 0; i < numTables; i++) {
    const rec = faceOffset + 12 + i * 16
    out.push({
      tag: String.fromCharCode(bytes[rec], bytes[rec + 1], bytes[rec + 2], bytes[rec + 3]),
      offset: dv.getUint32(rec + 8),
      length: dv.getUint32(rec + 12)
    })
  }
  return out
}

/** 用 fontkit 读容器里第 faceIndex 个 face 的族名（与 resolver 的索引同源） */
function familyNameOf(ttc: Uint8Array, faceIndex: number): string | null {
  try {
    const req = createRequire(import.meta.url)
    const kit = req('fontkit') as { create: (buf: Uint8Array) => { fonts?: Array<{ familyName?: unknown }> } }
    const opened = kit.create(ttc)
    const raw = opened.fonts?.[faceIndex]?.familyName
    if (typeof raw === 'string') return raw
    if (raw !== null && typeof raw === 'object') {
      const rec = raw as Record<string, unknown>
      if (typeof rec.en === 'string') return rec.en
      for (const v of Object.values(rec)) if (typeof v === 'string') return v
    }
    return null
  } catch {
    return null
  }
}

async function barePptxBytes(): Promise<Uint8Array> {
  const pres = createPresentation({ size: '16:9' })
  const slide = addBlankSlide(pres)
  addSlideTextBox(slide, { x: emu(914400), y: emu(914400), w: emu(7315200), h: emu(914400), text: 'TTC 提取测试 ABCabc0123' })
  return savePresentation(pres)
}

describe('TTC 单 face 提取 · 纯函数边界', () => {
  it('isTtcContainer 只看头 4 字节', () => {
    expect(isTtcContainer(new Uint8Array([0x74, 0x74, 0x63, 0x66, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))).toBe(true)
    expect(isTtcContainer(new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))).toBe(false)
    expect(isTtcContainer(new Uint8Array([0x74, 0x74]))).toBe(false)
  })

  it('非 TTC 输入与越界 face 序号一律抛错', () => {
    const notTtc = new Uint8Array(12)
    notTtc.set([0x00, 0x01, 0x00, 0x00], 0) // 单 face sfnt 版本
    expect(() => extractTtcFace(notTtc, 0)).toThrow(/不是 TTC 容器/)
    expect(() => extractTtcFace(new Uint8Array(4), 0)).toThrow(/不足 12 字节/)
  })
})

describe('TTC 单 face 提取 · 真件容器', () => {
  itTtc('提取首尾 face：产物为独立 sfnt，表数据与容器内该 face 逐字节一致', () => {
    const ttc = TTC_BYTES!
    const dv = viewOf(ttc)
    const numFaces = dv.getUint32(8)
    expect(numFaces).toBeGreaterThanOrEqual(2)
    const fsTypes = readFsTypeAll(ttc)
    const cases = [0, numFaces - 1]

    for (const faceIndex of cases) {
      const extracted = extractTtcFace(ttc, faceIndex)
      // 头 4 字节不再是 'ttcf'，且是 TrueType sfnt（EOT 只收 0x00010000）
      expect(isTtcContainer(extracted)).toBe(false)
      expect(viewOf(extracted).getUint32(0)).toBe(0x00010000)
      expect(extracted.byteLength).toBeLessThan(ttc.byteLength)
      // head / OS/2 / name 齐 → readFontMeta 能出族名与 fsType（偏移重建正确的判据）
      const meta = readFontMeta(extracted)
      expect(meta.familyName.length).toBeGreaterThan(0)
      expect(meta.fsType).toBe(fsTypes[faceIndex])

      // 表数据与容器里该 face 的表数据一致（证明按 faceIndex 取的是对应目录）；
      // head 是唯一例外：checkSumAdjustment（表内 +8）按提取后布局重算，其余字节照抄。
      const srcDir = new Map(tableDirOf(ttc, dv.getUint32(12 + faceIndex * 4)).map((t) => [t.tag, t]))
      const outDir = tableDirOf(extracted, 0)
      expect(outDir.length).toBe(srcDir.size)
      for (const t of outDir) {
        const src = srcDir.get(t.tag)
        expect(src, `缺表 ${t.tag}`).toBeDefined()
        expect(t.length).toBe(src!.length)
        const got = extracted.subarray(t.offset, t.offset + t.length)
        const want = ttc.subarray(src!.offset, src!.offset + src!.length)
        if (t.tag === 'head') {
          expect(sameSlice(got.subarray(0, 8), want.subarray(0, 8))).toBe(true)
          expect(sameSlice(got.subarray(12), want.subarray(12))).toBe(true)
        } else {
          expect(sameSlice(got, want), `表 ${t.tag} 数据不一致`).toBe(true)
        }
      }
    }
  })

  itTtc('越界 face 序号抛错', () => {
    const numFaces = viewOf(TTC_BYTES!).getUint32(8)
    expect(() => extractTtcFace(TTC_BYTES!, numFaces)).toThrow(/越界/)
    expect(() => extractTtcFace(TTC_BYTES!, -1)).toThrow(/越界/)
  })
})

describe('导出链路 · 容器字节先抽 face 再嵌', () => {
  itTtc('assets/fonts 里的 TTC 命中 face 后走完子集 + EOT，不再整容器进 EOT', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'ppt-ttc-pipeline-'))
    const fontsDir = path.join(tmp, 'assets', 'fonts')
    mkdirSync(fontsDir, { recursive: true })
    copyFileSync(REAL_TTC!, path.join(fontsDir, 'collection.ttc'))

    const family = familyNameOf(TTC_BYTES!, 0)
    expect(family).not.toBeNull()
    // 先解析一次拿到实际槽位：声明与解析必须同槽，否则链路会按 CORE-06 跳过
    const resolved = await resolveTypeface(family!, 'regular', { projectDir: tmp })
    expect(resolved).not.toBeNull()
    expect(isTtcContainer(resolved!.bytes)).toBe(true)

    const deck: Presentation = {
      size: [960, 540],
      theme: { textStyles: { body: { fontFamily: family!, fontSize: 24 } } },
      export: { fontEmbed: 'subset', transition: 'none', animations: 'off' },
      pages: []
    }
    const built = { native: null, slides: [], shapes: new Map(), warnings: [], fontsUsed: [] }
    const bare = await barePptxBytes()
    const r = await embedFontsForPptx(bare, built, deck, [], { projectDir: tmp, mode: 'subset' })

    expect(r.summary.facesEmbedded.some((f) => f.typeface === family)).toBe(true)
    expect(r.summary.skipped).toEqual([])
    expect(r.bytes.byteLength).not.toBe(bare.byteLength)
    const fontParts = Object.keys(unzipSync(r.bytes)).filter((n) => n.startsWith('ppt/fonts/') && n.endsWith('.fntdata'))
    expect(fontParts.length).toBeGreaterThan(0)
  }, 120_000)
})
