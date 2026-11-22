/** 字体许可预检按 deck.export.fontEmbed 分档。 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/core/fonts/usage.js', () => ({
  collectFontUsage: () => ({ typefaces: new Map([['Restricted Sans', new Set(['regular'])]]) })
}))
vi.mock('../src/core/fonts/resolver.js', () => ({
  findAlternatives: () => [],
  resolveTypeface: async () => ({ license: { fsType: 0x0002, label: 'Restricted License' }, outline: 'TrueType' })
}))

const { reviewFontLicenses } = await import('../src/core/review/fontLicense.js')

function deck(fontEmbed: 'subset' | 'off') {
  return { profile: 'generate', size: [960, 540], pages: [], export: { fontEmbed } } as never
}

describe('reviewFontLicenses', () => {
  it('嵌入开启时禁嵌字体是 blocker', async () => {
    const issues = await reviewFontLicenses(deck('subset'), [])
    expect(issues.map((i) => i.severity)).toEqual(['blocker'])
  })

  it('fontEmbed: off 时降为 warning，不阻断导出', async () => {
    const issues = await reviewFontLicenses(deck('off'), [])
    expect(issues.map((i) => i.severity)).toEqual(['warning'])
    expect(issues[0].description).toContain('fontEmbed: off')
  })
})
