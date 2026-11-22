/** 字体用量扫描覆盖母版与版式装饰元素。 */
import { describe, expect, it } from 'vitest'
import { collectFontUsage } from '../src/core/fonts/usage.js'
import type { Presentation } from '../src/core/pptd/schema.js'

describe('collectFontUsage', () => {
  it('母版与版式里的文字参与字体与字符集统计', () => {
    const deck = {
      profile: 'generate',
      size: [960, 540],
      pages: [],
      masters: [
        {
          name: 'Main',
          shapes: [
            { elementId: 'm-foot', elementType: 'text', bounds: [0, 500, 960, 40], content: { text: '页脚署名', fontFamily: 'Master Serif' } }
          ],
          layouts: [
            {
              name: 'Cover',
              shapes: [
                { elementId: 'l-tag', elementType: 'text', bounds: [0, 0, 200, 40], content: { text: '版式角标', fontFamily: 'Layout Sans' } }
              ]
            }
          ]
        }
      ]
    } as unknown as Presentation
    const usage = collectFontUsage(deck, [])
    expect([...usage.typefaces.keys()]).toEqual(expect.arrayContaining(['Master Serif', 'Layout Sans']))
    for (const ch of '页脚署名版式角标') expect(usage.charset).toContain(ch)
  })
})
