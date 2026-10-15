/**
 * 字体解析：族名索引完整性
 *
 * 回归案例（真实缺陷）：Typeface 声明为中文族名「阿里妈妈数黑体」时，索引里只有
 *  - fontkit 取到的 en 族名（Alimama ShuHeiTi），以及
 *  - 注册表值名键（「阿里妈妈数黑体 Bold (TrueType)」）下的**占位条目**（无 fsType/slot/outline）
 * 于是中文族名查到的 face `fsType === null` → 被判为「OS/2 表读不到，保守跳过」→ 导出时静默不嵌。
 * 修法：① name 表全部语言变体都进索引；② 注册表族名键指向同一文件的真实 face，不再造占位条目。
 *
 * 依赖本机装有该字体（无则跳过，与 fonts-e2e.test.ts 的 runIf 约定一致）。
 */
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveTypeface } from '../src/core/fonts/resolver.js'

const ALIMAMA = 'C:\\Windows\\Fonts\\阿里妈妈数黑体.ttf'
const hasAlimama = process.platform === 'win32' && existsSync(ALIMAMA)

describe('font resolver：族名索引', () => {
  it.runIf(hasAlimama)('中文族名 / 英文族名解析到同一真实 face，且带 fsType 与轮廓信息', async () => {
    const zh = await resolveTypeface('阿里妈妈数黑体', 'bold')
    const en = await resolveTypeface('Alimama ShuHeiTi', 'bold')

    expect(zh).not.toBeNull()
    expect(en).not.toBeNull()
    expect(zh!.path.toLowerCase()).toBe(ALIMAMA.toLowerCase())
    expect(zh!.path).toBe(en!.path)

    // 占位条目的两个特征：familyName 是注册表值名（带 "(TrueType)"），fsType 为 null
    expect(zh!.familyName).not.toContain('(TrueType)')
    expect(zh!.license.fsType).toBe(8)
    expect(zh!.license.embeddable).toBe(true)
    expect(zh!.outline).toBe('glyf')
    expect(zh!.familyNameZh).toBe('阿里妈妈数黑体')
  })

  it.runIf(hasAlimama)('该字体只装了 Bold face：regular 槽回落同一文件', async () => {
    const r = await resolveTypeface('阿里妈妈数黑体', 'regular')
    expect(r).not.toBeNull()
    expect(r!.path.toLowerCase()).toBe(ALIMAMA.toLowerCase())
    expect(r!.slot).toBe('bold')
    expect(r!.license.embeddable).toBe(true)
  })
})
