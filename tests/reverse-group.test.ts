/**
 * 组合关系（spec §6.0）：逆向把源组合拆平为成员并在 `group` 记下组合路径，
 * 逐页重建时按路径还原嵌套组合。
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addBlankSlide,
  addSlideShape,
  createPresentation,
  emu,
  getGroupChildren,
  getShapeKind,
  getSlideShapes,
  getSlides,
  groupShapes,
  loadPresentation,
  savePresentation
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/index.js'
import { PAGE_FINGERPRINTS_FILE } from '../src/core/reverse/restore.js'
import { loadProject } from '../src/core/project/store.js'
import { buildProjectDeck, saveRawProjectPptx } from '../src/core/export-pipeline.js'
import { parseProject } from '../src/core/pptd/parse.js'

let cwd: string
beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-group-'))
})
afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

const box = (x: number) => ({ preset: 'rect' as const, x: emu(x * 12700), y: emu(50 * 12700), w: emu(40 * 12700), h: emu(40 * 12700) })

describe('reverse：组合关系', () => {
  it('嵌套组合拆平后记 group 路径，逐页重建还原为嵌套组合', async () => {
    const pres = createPresentation({ size: '16:9' })
    const slide = addBlankSlide(pres)
    const a = addSlideShape(slide, box(50))
    const b = addSlideShape(slide, box(100))
    const c = addSlideShape(slide, box(200))
    addSlideShape(slide, box(400))
    const inner = groupShapes([a, b], { name: 'inner' })
    groupShapes([inner, c], { name: 'outer' })
    const bytes = await savePresentation(pres)

    const { projectDir } = await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's' })
    const loaded = await loadProject(cwd, 'proj')
    const els = loaded.pages.get(String(loaded.deck.pages[0]))!.elements as { group?: string[] }[]
    const grouped = els.filter((e) => e.group)
    expect(grouped).toHaveLength(3)
    expect(grouped.filter((e) => e.group!.length === 2)).toHaveLength(2)
    expect(new Set(grouped.map((e) => e.group![0])).size).toBe(1)
    expect(els.filter((e) => !e.group)).toHaveLength(1)

    await rm(path.join(projectDir, 'source', PAGE_FINGERPRINTS_FILE), { force: true })
    const built = await loadPresentation(await saveRawProjectPptx(await buildProjectDeck(cwd, 'proj')))
    // getSlideShapes lists nested shapes too; the outer group is the one holding a group.
    const all = getSlideShapes(getSlides(built)[0])
    const groups = all.filter((s) => getShapeKind(s) === 'group')
    expect(groups).toHaveLength(2)
    const outer = groups.find((g) => getGroupChildren(g).some((s) => getShapeKind(s) === 'group'))!
    expect(getGroupChildren(outer)).toHaveLength(2)
    const innerGroup = getGroupChildren(outer).find((s) => getShapeKind(s) === 'group')!
    expect(getGroupChildren(innerGroup)).toHaveLength(2)
    expect(all.filter((s) => getShapeKind(s) !== 'group')).toHaveLength(4)
  })

  it('group 须为非空字符串数组', () => {
    const deck = 'schema: 2\nprofile: generate\nsize: [960, 540]\npages: [pages/01.page]\n'
    const page = 'elements:\n  - elementId: a\n    elementType: shape\n    shapeName: rect\n    bounds: [0, 0, 10, 10]\n    group: []\n'
    const result = parseProject(deck, [{ path: 'pages/01.page', text: page }])
    expect(result.issues.some((i) => i.code === 'SchemaError' && String(i.path).endsWith('#group'))).toBe(true)
  })
})
