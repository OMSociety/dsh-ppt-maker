/**
 * deck.masters 母版/版式轨（spec §3.5）回归测试。
 *
 * 覆盖：
 *   1. 声明 masters 的 generate 工程可构建，页挂 layoutRef 后产物含真实版式部件
 *   2. 未知版式名 fail-closed（校验层 UnknownLayoutError）
 *   3. 逆向方言出现 masters → ProfileViolationError
 *   4. 版式名重复 → SchemaError
 */
import { afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createProject, loadProject } from '../src/core/project/store.js'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import { parseProject, stringifyDeck, stringifyPage } from '../src/core/pptd/parse.js'
import { readFile } from 'node:fs/promises'

/** 工程目录必须在 cwd 内（store.PathOutsideCwd）；用仓内 .cache 下的临时目录，用例结束即删。 */
const made: string[] = []
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

async function seed(dir: string, masters: unknown, layoutRefName?: string): Promise<void> {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  made.push(dir)
  await createProject(process.cwd(), {
    dir,
    title: 'masters-test',
    size: [960, 540]
  })
  const deckText = stringifyDeck({
    schema: 2,
    profile: 'generate',
    title: 'masters-test',
    size: [960, 540],
    masters,
    pages: ['pages/01.page']
  } as never)
  writeFileSync(join(dir, 'deck.pptd'), deckText, 'utf8')
  const page = {
    pageType: 'content',
    ...(layoutRefName ? { layoutRef: { name: layoutRefName } } : {}),
    elements: [
      {
        elementId: 't1',
        elementType: 'text',
        bounds: [80, 80, 400, 60],
        content: { text: '标题', fontSize: 28 }
      }
    ]
  }
  writeFileSync(join(dir, 'pages', '01.page'), stringifyPage(page as never), 'utf8')
}

describe('deck.masters（spec §3.5）', () => {
  it('声明 masters + 页挂 layoutRef：构建产物含真实版式部件', async () => {
    const dir = join(process.cwd(), '.cache', `test-masters-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    await seed(dir, [
      {
        name: '品牌母版',
        shapes: [
          {
            elementId: 'deco',
            elementType: 'shape',
            bounds: [0, 0, 960, 8],
            shapeName: 'rect',
            fill: { type: 'solid', color: '#2563EB' }
          }
        ],
        layouts: [
          {
            name: '标题页',
            shapes: [],
            placeholders: [{ kind: 'title', bounds: [80, 60, 800, 90] }]
          },
          { name: '内容页', shapes: [] }
        ]
      }
    ], '标题页')
    const loaded = await loadProject(process.cwd(), dir)
    const blockers = loaded.issues.filter((i) => i.level === 'blocker')
    expect(blockers).toEqual([])
    const engine = createOfficeKitEngine()
    const built = await engine.buildDeck(
      { deck: loaded.deck, pages: [...loaded.pages.values()] },
      {
        projectDir: dir,
        loadMedia: async (src: string) => new Uint8Array(await readFile(join(dir, src))),
        warnings: []
      }
    )
    expect(built.native).toBeDefined()
    // 版式部件真实产出：两条声明的版式都在包里，且唯一一页挂在「标题页」上
    const { getSlides, getSlideLayouts, getSlideLayoutName, getSlideLayout } = await import('@office-kit/pptx')
    const pres = built.native as never
    const names = getSlideLayouts(pres).map((l) => getSlideLayoutName(l))
    expect(names).toEqual(expect.arrayContaining(['标题页', '内容页']))
    const slides = getSlides(pres)
    expect(slides.length).toBe(1)
    const layout = getSlideLayout(slides[0])
    expect(layout && getSlideLayoutName(layout)).toBe('标题页')
  })

  it('未知版式名：校验层 UnknownLayoutError（blocker）', () => {
    const deck = {
      schema: 2,
      profile: 'generate',
      title: 'x',
      size: [960, 540],
      masters: [{ name: 'm', layouts: [{ name: 'A' }] }],
      pages: ['pages/01.page']
    } as never
    const page = {
      layoutRef: { name: '不存在的版式' },
      elements: [{ elementId: 't', elementType: 'text', bounds: [0, 0, 10, 10], content: { text: 'x' } }]
    } as never
    const parsed = parseProject(
      stringifyDeck(deck),
      [{ path: 'pages/01.page', text: stringifyPage(page) }]
    )
    const codes = parsed.issues.map((i) => i.code)
    expect(codes).toContain('UnknownLayoutError')
  })

  it('逆向方言出现 masters：ProfileViolationError', () => {
    const deck = {
      schema: 2,
      profile: 'reverse',
      title: 'x',
      size: [960, 540],
      masters: [{ name: 'm', layouts: [{ name: 'A' }] }],
      pages: []
    } as never
    const parsed = parseProject(stringifyDeck(deck), [])
    const codes = parsed.issues.map((i) => i.code)
    expect(codes).toContain('ProfileViolationError')
  })

  it('版式名全 deck 重复：SchemaError', () => {
    const deck = {
      schema: 2,
      profile: 'generate',
      title: 'x',
      size: [960, 540],
      masters: [
        { name: 'm1', layouts: [{ name: 'A' }] },
        { name: 'm2', layouts: [{ name: 'A' }] }
      ],
      pages: []
    } as never
    const parsed = parseProject(stringifyDeck(deck), [])
    const messages = parsed.issues.map((i) => i.message).join('\n')
    expect(messages).toContain('layout.name 全 deck 重复')
  })
})
