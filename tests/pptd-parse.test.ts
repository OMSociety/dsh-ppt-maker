import { describe, expect, it } from 'vitest'
import { parseProject, type Issue } from '../src/core/pptd/parse.js'

const DECK_BASIC = `schema: 2
size: [960, 540]
pages:
  - pages/01.page
`

const PAGE_BASIC = `elements:
  - elementType: text
    elementId: t1
    bounds: [10, 10, 200, 50]
    content:
      text: '# Hello'
`

function codes(issues: Issue[]): string[] {
  return issues.map((i) => i.code)
}

describe('parseProject（PPTD）', () => {
  it('解析合法 generate 工程：无 blocker，尺寸与页表正确', () => {
    const r = parseProject(DECK_BASIC, [{ path: 'pages/01.page', text: PAGE_BASIC }])
    expect(r.deck).not.toBeNull()
    expect(r.deck?.size).toEqual([960, 540])
    expect(r.profile).toBe('generate')
    expect([...r.pages.keys()]).toEqual(['pages/01.page'])
    expect(r.issues.filter((i) => i.level === 'blocker')).toEqual([])
  })

  it('未知 profile → UnknownProfileError', () => {
    const r = parseProject('schema: 2\nprofile: sideways\npages: []\n', [])
    expect(codes(r.issues)).toContain('UnknownProfileError')
  })

  it('export.fontEmbed 越值 → ExportFieldValueError', () => {
    const r = parseProject('schema: 2\nexport: { fontEmbed: bogus }\npages: []\n', [])
    expect(codes(r.issues)).toContain('ExportFieldValueError')
  })

  it('错型字段报阻断而非静默取默认：fill 写成字符串、content 写成字符串', () => {
    const page = `pageType: content
elements:
  - elementId: s1
    elementType: shape
    shapeName: rect
    bounds: [0, 0, 100, 100]
    fill: "#3366cc"
  - elementId: t2
    elementType: text
    bounds: [0, 0, 100, 40]
    content: 验收冒烟 A
`
    const r = parseProject(DECK_BASIC, [{ path: 'pages/01.page', text: page }])
    const fill = r.issues.find((i) => i.path?.endsWith('#fill'))
    expect(fill?.level).toBe('blocker')
    expect(fill?.message).toContain('{type: "solid", color: "#3366cc"}')
    const content = r.issues.find((i) => i.path?.endsWith('#content'))
    expect(content?.level).toBe('blocker')
  })

  it('未知动画效果 → UnknownAnimationEffectError', () => {
    const page = `${PAGE_BASIC}animations:
  - target: t1
    effect: not-a-real-effect
`
    const r = parseProject(DECK_BASIC, [{ path: 'pages/01.page', text: page }])
    expect(codes(r.issues)).toContain('UnknownAnimationEffectError')
  })

  it('appear/disappear 禁带 durationMs → AnimationDurationNotAllowedError', () => {
    const page = `${PAGE_BASIC}animations:
  - target: t1
    effect: appear
    durationMs: 400
`
    const r = parseProject(DECK_BASIC, [{ path: 'pages/01.page', text: page }])
    expect(codes(r.issues)).toContain('AnimationDurationNotAllowedError')
  })

  it('动画指向不存在的元素 → AnimationTargetError', () => {
    const page = `${PAGE_BASIC}animations:
  - target: ghost
    effect: fade
`
    const r = parseProject(DECK_BASIC, [{ path: 'pages/01.page', text: page }])
    expect(codes(r.issues)).toContain('AnimationTargetError')
  })

  it('未知转场效果 → UnknownTransitionEffectError', () => {
    const page = `transition:
  effect: warp9
elements: []
`
    const r = parseProject(DECK_BASIC, [{ path: 'pages/01.page', text: page }])
    expect(codes(r.issues)).toContain('UnknownTransitionEffectError')
  })

  it('generate 方言禁用 placeholder → PlaceholderNotAllowedError', () => {
    const page = `elements:
  - elementType: placeholder
    elementId: p1
    bounds: [0, 0, 100, 100]
    originalType: chart
`
    const r = parseProject(DECK_BASIC, [{ path: 'pages/01.page', text: page }])
    expect(codes(r.issues)).toContain('PlaceholderNotAllowedError')
  })

  it('引用未定义 theme key → UnknownThemeKeyError', () => {
    const deck = `schema: 2
size: [960, 540]
theme:
  colors:
    brand: '#112233'
pages:
  - pages/01.page
`
    const page = `elements:
  - elementType: text
    elementId: t1
    bounds: [0, 0, 10, 10]
    color: $nosuch
`
    const r = parseProject(deck, [{ path: 'pages/01.page', text: page }])
    expect(codes(r.issues)).toContain('UnknownThemeKeyError')
  })

  it('正文、备注、表格文字与图表数据里的 $ 开头字符串按字面处理', () => {
    const deck = `schema: 2
size: [960, 540]
theme:
  colors:
    brand: '#112233'
pages:
  - pages/01.page
`
    const page = `notes: '$100 起'
elements:
  - elementType: text
    elementId: t1
    bounds: [0, 0, 200, 40]
    content:
      text: '$100 起'
      color: $brand
  - elementType: table
    elementId: tb
    bounds: [0, 60, 200, 80]
    columnWidths: [1]
    rowHeights: [1]
    rows:
      - - text: '$5'
  - elementType: chart
    elementId: c1
    bounds: [0, 160, 200, 120]
    data:
      cols: ['$项目', '值']
      rows: [['$A', 1]]
    series:
      - type: bar
        name: '$营收'
        encode: { x: '$项目', y: '值' }
`
    const r = parseProject(deck, [{ path: 'pages/01.page', text: page }])
    expect(r.issues.filter((i) => i.code === 'UnknownThemeKeyError')).toEqual([])
    // 颜色位上的 $key 仍按主题引用校验
    const bad = parseProject(deck, [{ path: 'pages/01.page', text: page.replace('color: $brand', 'color: $nosuch') }])
    expect(bad.issues.filter((i) => i.code === 'UnknownThemeKeyError')).toHaveLength(1)
  })

  it('缺失的页文件 → SchemaError（pages 列表声明但读不到）', () => {
    const r = parseProject(DECK_BASIC, [])
    expect(codes(r.issues)).toContain('SchemaError')
    expect(r.issues.some((i) => i.code === 'SchemaError' && i.level === 'blocker')).toBe(true)
  })

  it('缺少 schema 字段 → UnsupportedSchemaError（v1 工程被拒）', () => {
    const r = parseProject('size: [960, 540]\npages: []\n', [])
    expect(codes(r.issues)).toContain('UnsupportedSchemaError')
    expect(r.issues.find((i) => i.code === 'UnsupportedSchemaError')?.level).toBe('blocker')
  })

  it('schema: 1 → UnsupportedSchemaError', () => {
    const r = parseProject('schema: 1\nsize: [960, 540]\npages: []\n', [])
    expect(codes(r.issues)).toContain('UnsupportedSchemaError')
  })

  it('pageType: svg 合法形态通过；缺 svgSource 或混入 elements 被拦', () => {
    const ok = parseProject(DECK_BASIC, [
      { path: 'pages/01.page', text: 'pageType: svg\nsvgSource: { ref: media/svg/cover.svg }\nelements: []\n' }
    ])
    expect(ok.issues.filter((i) => i.level === 'blocker')).toEqual([])

    const noRef = parseProject(DECK_BASIC, [{ path: 'pages/01.page', text: 'pageType: svg\nelements: []\n' }])
    expect(codes(noRef.issues)).toContain('SchemaError')

    const mixed = parseProject(DECK_BASIC, [
      {
        path: 'pages/01.page',
        text: 'pageType: svg\nsvgSource: { ref: media/svg/cover.svg }\nelements:\n  - elementType: text\n    elementId: t1\n    bounds: [0, 0, 10, 10]\n'
      }
    ])
    expect(codes(mixed.issues)).toContain('SchemaError')

    const badRef = parseProject(DECK_BASIC, [
      { path: 'pages/01.page', text: 'pageType: svg\nsvgSource: { ref: ../escape.svg }\nelements: []\n' }
    ])
    expect(codes(badRef.issues)).toContain('SchemaError')
  })
it('deck 写 customFonts 报 SchemaError，指向 assets/fonts/', () => {
    const result = parseProject(
      'schema: 2\nsize: [960, 540]\ncustomFonts:\n  - { family: Inter }\npages: [pages/01.page]\n',
      [{ path: 'pages/01.page', text: 'elements: []\n' }]
    )
    const issue = result.issues.find((i: Issue) => i.path?.endsWith('#customFonts'))
    expect(issue?.code).toBe('SchemaError')
    expect(issue?.level).toBe('blocker')
    expect(issue?.message).toContain('assets/fonts/')
  })
})
