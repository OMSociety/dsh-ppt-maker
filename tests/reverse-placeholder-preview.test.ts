/**
 * 占位预览图（spec §10.2）：媒体海报帧等预览图随占位落进 media/；
 * 源存档不可用时导出按预览图落成图片。
 */
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addBlankSlide,
  addSlideMedia,
  createPresentation,
  emu,
  getSlideShapes,
  getSlides,
  hasShapeImage,
  loadPresentation,
  savePresentation
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/index.js'
import { loadProject } from '../src/core/project/store.js'
import { buildProjectDeck, saveRawProjectPptx } from '../src/core/export-pipeline.js'
import { PNG_1PX } from './__fixtures__/pptx-fixtures.js'

let cwd: string
beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-preview-'))
})
afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe('reverse：占位预览图', () => {
  it('媒体占位带海报帧预览；源存档缺失时导出按预览图落成图片', async () => {
    const pres = createPresentation({ size: '16:9' })
    const slide = addBlankSlide(pres)
    addSlideMedia(slide, {
      kind: 'audio',
      data: new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]),
      format: 'mp3',
      poster: PNG_1PX,
      x: emu(100 * 12700),
      y: emu(80 * 12700),
      w: emu(200 * 12700),
      h: emu(120 * 12700)
    })
    const bytes = await savePresentation(pres)

    const { projectDir } = await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's' })
    const loaded = await loadProject(cwd, 'proj')
    const ph = loaded.pages.get(String(loaded.deck.pages[0]))!.elements.find((e) => e.elementType === 'placeholder') as
      | { preview?: string; previewPartName?: string }
      | undefined
    expect(ph?.preview).toMatch(/^media\/.+\.png$/)
    expect(ph?.previewPartName).toBeUndefined()
    expect((await stat(path.join(projectDir, ph!.preview!))).size).toBe(PNG_1PX.length)

    await rm(path.join(projectDir, 'source', 'original.pptx'), { force: true })
    const pipeline = await buildProjectDeck(cwd, 'proj')
    const built = await loadPresentation(await saveRawProjectPptx(pipeline))
    const shapes = getSlideShapes(getSlides(built)[0])
    expect(shapes.some((s) => hasShapeImage(s))).toBe(true)
    expect(new Uint8Array(await readFile(path.join(projectDir, ph!.preview!)))).toEqual(PNG_1PX)
  })
})
