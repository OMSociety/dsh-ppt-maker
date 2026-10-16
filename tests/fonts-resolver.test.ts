/**
 * 字体解析：族名索引与 slot 判定
 *
 * 回归案例（真实缺陷）：Typeface 声明为中文族名时，索引里只有
 *  - fontkit 取到的 en 族名（Alimama ShuHeiTi），以及
 *  - 注册表值名键（「阿里妈妈数黑体 Bold (TrueType)」）下的**占位条目**（无 fsType/slot/outline）
 * 于是中文族名查到的 face `fsType === null` → 被判为「OS/2 表读不到，保守跳过」→ 导出时静默不嵌。
 * 修法：① name 表全部语言变体都进索引；② 注册表族名键指向同一文件的真实 face，不再造占位条目。
 *
 * 用例取系统已装的中文字体（中英族名成对；Windows 自带 simhei / Deng / msyh 等）；
 * 一个可用候选都不在位时显式跳过并在运行日志里打印原因。
 */
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readFsTypeAll } from '../src/core/fonts/fsType.js'
import { resolveTypeface } from '../src/core/fonts/resolver.js'

interface FontCase {
  /** 声明形态：中文族名 */
  zh: string
  /** 声明形态：英文族名 */
  en: string
  file: string
  /** 该族另装的 bold 文件；null 表示只装了 regular */
  boldFile: string | null
}

const CASES: FontCase[] = [
  { zh: '微软雅黑', en: 'Microsoft YaHei', file: 'C:\\Windows\\Fonts\\msyh.ttc', boldFile: 'C:\\Windows\\Fonts\\msyhbd.ttc' },
  { zh: '等线', en: 'DengXian', file: 'C:\\Windows\\Fonts\\Deng.ttf', boldFile: 'C:\\Windows\\Fonts\\Dengb.ttf' },
  { zh: '黑体', en: 'SimHei', file: 'C:\\Windows\\Fonts\\simhei.ttf', boldFile: null },
  { zh: '楷体', en: 'KaiTi', file: 'C:\\Windows\\Fonts\\simkai.ttf', boldFile: null }
]

const paired = CASES.filter((c) => existsSync(c.file) && (c.boldFile === null || existsSync(c.boldFile)))
const withBold = paired.find((c) => c.boldFile !== null) ?? null
const withoutBold = paired.find((c) => c.boldFile === null) ?? null

if (paired.length === 0) {
  console.warn(`[fonts-resolver] 用例跳过：未找到系统已装中文字体（候选 ${CASES.map((c) => `${c.zh}/${c.file}`).join(' / ')}）`)
}

describe('font resolver：族名索引', () => {
  it.skipIf(paired.length === 0)('中文族名 / 英文族名解析到同一真实 face，且带 fsType 与轮廓信息', async () => {
    for (const c of paired) {
      const zh = await resolveTypeface(c.zh, 'regular')
      const en = await resolveTypeface(c.en, 'regular')

      expect(zh, c.zh).not.toBeNull()
      expect(en, c.en).not.toBeNull()
      expect(zh!.path).toBe(en!.path)
      expect(zh!.path.toLowerCase()).toBe(c.file.toLowerCase())

      // 占位条目的两个特征：familyName 是注册表值名（带 "(TrueType)"），fsType 为 null
      expect(zh!.familyName).not.toContain('(TrueType)')
      expect(zh!.license.fsType).not.toBeNull()
      expect(zh!.license.embeddable).toBe(true)
      expect(zh!.outline).toBe('glyf')
      expect(zh!.familyNameZh).toBe(c.zh)
      // 逐 face 交叉：解析结果与直接从字节读出的一致（TTC 表目录 offset 的回归点）
      expect(zh!.license.fsType).toBe(readFsTypeAll(zh!.bytes)[zh!.faceIndex] ?? null)
    }
  })

  it.skipIf(withBold === null)('该族同时装了 regular 与 bold：两个槽位解析到各自文件', async () => {
    const c = withBold!
    const reg = await resolveTypeface(c.zh, 'regular')
    const bold = await resolveTypeface(c.zh, 'bold')

    expect(reg).not.toBeNull()
    expect(bold).not.toBeNull()
    expect(reg!.path.toLowerCase()).toBe(c.file.toLowerCase())
    expect(bold!.path.toLowerCase()).toBe(c.boldFile!.toLowerCase())
    expect(reg!.path).not.toBe(bold!.path)
    expect(reg!.slot).toBe('regular')
    expect(bold!.slot).toBe('bold')
    expect(bold!.license.embeddable).toBe(true)
  })

  it.skipIf(withoutBold === null)('该族只装了 regular：bold 请求回落到同一文件', async () => {
    const c = withoutBold!
    const bold = await resolveTypeface(c.zh, 'bold')

    expect(bold).not.toBeNull()
    expect(bold!.path.toLowerCase()).toBe(c.file.toLowerCase())
    expect(bold!.slot).toBe('regular')
    expect(bold!.license.embeddable).toBe(true)
  })
})
