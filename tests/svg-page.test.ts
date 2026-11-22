/**
 * SVG 页轨道端到端：media/svg/*.svg → vendored 编译器 → importSlide 混合合并。
 *
 * 依赖 vendor/.venv（scripts/prepare-vendor-env.mjs；CI 在测试前执行）。
 * 就绪判据统一见 tests/__fixtures__/venv.ts；未就绪时用例 skipped 并打印缺项。
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getShapePosition, getShapeSize, getShapeText, getShapeTextAutoFit, getShapeTextWrap, getSlideCount, getSlideShapes, getSlideSize, getSlideText, getSlides, loadPresentation, validatePresentation } from '@office-kit/pptx'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { compileSvgPage, themeHashOf } from '../src/core/svg/compiler.js'
import { createProject, editProject, loadProject } from '../src/core/project/store.js'
import { buildProjectDeck, renderPptxImages, saveRawProjectPptx } from '../src/core/export-pipeline.js'
import { probeVenv } from './__fixtures__/venv.js'

const hasVenv = probeVenv().ready

const SPIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
  <rect x="0" y="0" width="960" height="540" fill="#123456"/>
  <rect x="60" y="60" width="840" height="420" rx="24" fill="#ffffff" opacity="0.92"/>
  <text x="120" y="200" font-family="Microsoft YaHei" font-size="48" font-weight="bold" fill="#123456">研究问题与核心结论</text>
  <text x="120" y="260" font-family="Microsoft YaHei" font-size="20" fill="#555555">SVG 页轨道端到端测试页</text>
  <circle cx="700" cy="330" r="60" fill="#ff8800" opacity="0.85"/>
  <circle cx="780" cy="330" r="60" fill="#22aa66" opacity="0.85"/>
</svg>
`

const RATIO_43_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="0" y="0" width="800" height="600" fill="#f5f2ea"/>
  <rect x="40" y="50" width="120" height="70" fill="#d42b1e"/>
  <text x="80" y="120" font-family="Microsoft YaHei" font-size="42" fill="#1a1a1a">4:3 SVG 页面</text>
</svg>
`

let tmp: string
beforeAll(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'ppt-svg-e2e-'))
})
afterAll(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe.skipIf(!hasVenv)('svg 页轨道', () => {
  it('compileSvgPage：编译产物是单页 pptx，字体清单含微软雅黑；缓存二跑命中', async () => {
    const projectDir = path.join(tmp, 'compile-only')
    await mkdir(path.join(projectDir, 'media', 'svg'), { recursive: true })
    await writeFile(path.join(projectDir, 'media', 'svg', 'page.svg'), SPIKE_SVG)

    const first = await compileSvgPage({ projectDir, svgRef: 'media/svg/page.svg', themeHash: themeHashOf(undefined) })
    expect(first.bytes.byteLength).toBeGreaterThan(1000)
    expect(first.cached).toBe(false)
    expect(first.fonts).toContain('Microsoft YaHei')

    const src = await loadPresentation(first.bytes)
    expect(getSlideCount(src)).toBe(1)
    expect(getSlideText(getSlides(src)[0])).toContain('研究问题与核心结论')
    const titleShape = getSlideShapes(getSlides(src)[0]).find((shape) => getShapeText(shape) === '研究问题与核心结论')
    expect(getShapeTextWrap(titleShape!)).toBe('none')
    expect(getShapeTextAutoFit(titleShape!)).toBe('none')

    const second = await compileSvgPage({ projectDir, svgRef: 'media/svg/page.svg', themeHash: themeHashOf(undefined) })
    expect(second.cached).toBe(true)
    expect(second.fonts).toContain('Microsoft YaHei')
  }, 120_000)

  it('buildDeck：native 页与 svg 页混合合并，页序保持，validate 零 error', async () => {
    const dir = 'svg-mixed'
    const abs = path.join(tmp, dir)
    await mkdir(path.join(abs, 'media', 'svg'), { recursive: true })
    await writeFile(path.join(abs, 'media', 'svg', 'cover.svg'), SPIKE_SVG)

    await createProject(tmp, { dir, title: 'svg 混合', size: [960, 540] })
    await editProject(tmp, {
      dir,
      ops: [
        {
          op: 'add_page',
          page: 'pages/p1.page',
          content: {
            elements: [
              {
                elementId: 't1',
                elementType: 'text',
                bounds: [60, 60, 840, 80],
                content: { text: 'Native 页' }
              }
            ]
          }
        },
        { op: 'add_page', page: 'pages/p2.page', content: { pageType: 'svg', svgSource: { ref: 'media/svg/cover.svg' }, elements: [] } },
        {
          op: 'add_page',
          page: 'pages/p3.page',
          content: {
            elements: [
              {
                elementId: 't2',
                elementType: 'text',
                bounds: [60, 60, 840, 80],
                content: { text: '尾页' }
              }
            ]
          }
        }
      ]
    })

    const loaded = await loadProject(tmp, dir)
    expect(loaded.issues.filter((i) => i.level === 'blocker')).toEqual([])

    const pipeline = await buildProjectDeck(tmp, dir)
    const bytes = await saveRawProjectPptx(pipeline)
    const pres = await loadPresentation(bytes)
    expect(getSlideCount(pres)).toBe(3)

    const slides = getSlides(pres)
    expect(getSlideText(slides[0])).toContain('Native 页')
    expect(getSlideText(slides[1])).toContain('研究问题与核心结论')
    expect(getSlideText(slides[2])).toContain('尾页')
    expect(getShapePosition(getSlideShapes(slides[1])[0])).toEqual({ x: 60 * 12700, y: 60 * 12700 })
    expect(getShapeSize(getSlideShapes(slides[1])[0])).toEqual({ w: 840 * 12700, h: 420 * 12700 })

    const validation = validatePresentation(pres)
    expect(validation.filter((i) => i.severity === 'error')).toEqual([])
  }, 120_000)

  it('buildDeck：4:3 原生页与 SVG 页共用 800×600 画布', async () => {
    const dir = 'svg-4x3'
    const abs = path.join(tmp, dir)
    await mkdir(path.join(abs, 'media', 'svg'), { recursive: true })
    await writeFile(path.join(abs, 'media', 'svg', 'page.svg'), RATIO_43_SVG)
    await createProject(tmp, { dir, title: '4:3 混合', size: [800, 600] })
    await editProject(tmp, {
      dir,
      ops: [
        {
          op: 'add_page',
          page: 'pages/p1.page',
          content: { elements: [{ elementId: 'title', elementType: 'text', bounds: [80, 60, 640, 80], content: { text: '4:3 Native 页' } }] }
        },
        { op: 'add_page', page: 'pages/p2.page', content: { pageType: 'svg', svgSource: { ref: 'media/svg/page.svg' }, elements: [] } }
      ]
    })

    const pipeline = await buildProjectDeck(tmp, dir)
    const pres = await loadPresentation(await saveRawProjectPptx(pipeline))
    expect(getSlideSize(pres)).toMatchObject({ width: 800 * 12700, height: 600 * 12700 })
    const slides = getSlides(pres)
    expect(getSlideText(slides[0])).toContain('4:3 Native 页')
    expect(getSlideText(slides[1])).toContain('4:3 SVG 页面')
    expect(getShapePosition(getSlideShapes(slides[1])[0])).toEqual({ x: 40 * 12700, y: 50 * 12700 })
    expect(getShapeSize(getSlideShapes(slides[1])[0])).toEqual({ w: 120 * 12700, h: 70 * 12700 })

    const rendered = await renderPptxImages(await saveRawProjectPptx(pipeline), { pages: [1, 2], dpi: 96 })
    try {
      expect(rendered.result.images).toHaveLength(2)
      for (const image of rendered.result.images) {
        const png = await readFile(image.path)
        const width = png.readUInt32BE(16)
        const height = png.readUInt32BE(20)
        expect(width / height).toBeCloseTo(4 / 3, 2)
      }
    } finally {
      await rendered.cleanup()
    }
  }, 120_000)

  it('buildDeck：svg 源缺失时 fail-closed（抛 SvgSourceMissing）', async () => {
    const dir = 'svg-missing'
    await createProject(tmp, { dir, title: 'svg 缺失', size: [960, 540] })
    await editProject(tmp, {
      dir,
      ops: [{ op: 'add_page', page: 'pages/p1.page', content: { pageType: 'svg', svgSource: { ref: 'media/svg/nope.svg' }, elements: [] } }]
    })
    await expect(buildProjectDeck(tmp, dir)).rejects.toMatchObject({ code: 'SvgSourceMissing' })
  }, 60_000)

  it('update_svg_source op 触发重编译（不同内容 → 不同缓存键）', async () => {
    const projectDir = path.join(tmp, 'svg-resrc')
    await mkdir(path.join(projectDir, 'media', 'svg'), { recursive: true })
    await writeFile(path.join(projectDir, 'media', 'svg', 'a.svg'), SPIKE_SVG)
    await writeFile(path.join(projectDir, 'media', 'svg', 'b.svg'), SPIKE_SVG.replace('研究问题与核心结论', '换源后的标题'))

    const first = await compileSvgPage({ projectDir, svgRef: 'media/svg/a.svg', themeHash: themeHashOf(undefined) })
    const second = await compileSvgPage({ projectDir, svgRef: 'media/svg/b.svg', themeHash: themeHashOf(undefined) })
    expect(first.cached).toBe(false)
    expect(second.cached).toBe(false)

    const src = await loadPresentation(second.bytes)
    const slides = getSlides(src)
    expect(getSlideText(slides[0])).toContain('换源后的标题')
  }, 120_000)
})
