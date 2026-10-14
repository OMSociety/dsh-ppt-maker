/**
 * client/render/text-markup.ts 的单元测试：
 * 属性面板「纯文字 / 标记」两种模式之间必须无损往返（简单 markup），
 * 含行内格式的文本要被 hasRichMarkup 认出来（调用方据此回退标记模式）。
 */
import { describe, expect, it } from 'vitest'
import { hasRichMarkup, markupToPlain, plainToMarkup } from '../client/render/text-markup'

describe('text-markup', () => {
  it('markupToPlain：单段去标签', () => {
    expect(markupToPlain('<p>塔特林 · 罗德琴柯 · 利西茨基</p>')).toBe('塔特林 · 罗德琴柯 · 利西茨基')
  })

  it('markupToPlain：段间隔与 <br> 都变行', () => {
    expect(markupToPlain('<p>a</p><p>b</p>')).toBe('a\nb')
    expect(markupToPlain('<p>a<br>b</p>')).toBe('a\nb')
  })

  it('markupToPlain：剥掉行内标签，实体解码', () => {
    expect(markupToPlain('<p><strong>a</strong>b</p>')).toBe('ab')
    expect(markupToPlain('<p>a &amp; b &lt;c&gt;</p>')).toBe('a & b <c>')
  })

  it('plainToMarkup：一行一段', () => {
    expect(plainToMarkup('a\nb')).toBe('<p>a</p><p>b</p>')
    expect(plainToMarkup('单段')).toBe('<p>单段</p>')
  })

  it('plainToMarkup：转义特殊字符，末尾空行不落空段', () => {
    expect(plainToMarkup('a < b')).toBe('<p>a &lt; b</p>')
    expect(plainToMarkup('a\n')).toBe('<p>a</p>')
    expect(plainToMarkup('a\n\n')).toBe('<p>a</p>')
  })

  it('往返无损（纯文字方向）', () => {
    // 注意：markup 侧的 <br> 与 </p><p> 在纯文字里都是换行，所以只保证
    // 「纯文字 → markup → 纯文字」这一步稳定（用户在面板里看到的字不变）。
    for (const plain of ['a', 'a\nb', '一段\n换行\n第三段', '带 < 和 & 的字']) {
      expect(markupToPlain(plainToMarkup(plain))).toBe(plain)
    }
  })

  it('hasRichMarkup：只有 p/br 时为 false，含行内格式时为 true', () => {
    expect(hasRichMarkup('<p>a</p>')).toBe(false)
    expect(hasRichMarkup('<p>a<br>b</p>')).toBe(false)
    expect(hasRichMarkup('')).toBe(false)
    expect(hasRichMarkup('<p><strong>a</strong></p>')).toBe(true)
    expect(hasRichMarkup('<p>a</p><span style="color:#f00">b</span>')).toBe(true)
  })
})
