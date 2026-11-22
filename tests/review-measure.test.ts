/** 量测器按用到的字形注册粗/斜体，缺字形时记近似。 */
import { describe, expect, it, vi } from 'vitest'

const resolved: string[] = []
vi.mock('../src/core/fonts/usage.js', () => ({
  collectFontUsage: () => ({ typefaces: new Map([['Body Sans', new Set(['regular', 'bold', 'italic'])]]), charset: '' })
}))
vi.mock('../src/core/fonts/resolver.js', () => ({
  resolveTypeface: async (_family: string, slot: string) => {
    resolved.push(slot)
    // 本机只有 regular 与 bold
    const actual = slot === 'italic' ? 'regular' : slot
    return { slot: actual, bytes: new Uint8Array([0, 1, 0, 0]), faceIndex: 0 }
  }
}))
const registeredFonts: Array<{ family: string; bold?: boolean; italic?: boolean }> = []
vi.mock('@office-kit/pptx-preview/node', () => ({
  buildFontkitMeasurer: (opts: { fonts: typeof registeredFonts }) => {
    registeredFonts.push(...opts.fonts)
    return () => ({ width: 0 })
  }
}))

const { buildDeckMeasurer } = await import('../src/core/review/measure.js')

describe('buildDeckMeasurer', () => {
  it('regular 与 bold 各注册一份；缺 italic 记 approximated', async () => {
    const result = await buildDeckMeasurer({} as never, [])
    expect(resolved).toEqual(expect.arrayContaining(['regular', 'bold', 'italic']))
    expect(registeredFonts.map((f) => [f.family, !!f.bold, !!f.italic])).toEqual([
      ['Body Sans', false, false],
      ['Body Sans', true, false]
    ])
    expect(result?.registered).toEqual(['Body Sans'])
    expect(result?.approximated).toEqual(['Body Sans italic'])
  })
})
