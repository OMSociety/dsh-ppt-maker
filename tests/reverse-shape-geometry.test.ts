/**
 * Reverse mapping of shape geometry and paint: custGeom → PPTD custom shape,
 * gradient and picture fills on ordinary shapes.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addBlankSlide,
  addSlideShape,
  createPresentation,
  emu,
  savePresentation,
  setShapeCustomGeometry,
  setShapeGradientFill,
  setShapeImageFill
} from '@office-kit/pptx'
import { reverseImport } from '../src/core/reverse/index.js'
import { loadProject } from '../src/core/project/store.js'
import type { Page } from '../src/core/pptd/parse.js'

const PT = 12700
const PNG_1PX = Uint8Array.from(
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
)

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-reverse-geom-'))
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

type AnyElement = Page['elements'][number] & Record<string, unknown>

async function importSingle(bytes: Uint8Array): Promise<AnyElement[]> {
  await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's1' })
  const loaded = await loadProject(cwd, 'proj')
  expect(loaded.issues.filter((i) => i.level === 'blocker')).toEqual([])
  return (loaded.pages.get('pages/01.page') as Page).elements as AnyElement[]
}

/** Every coordinate pair after a command letter, as numbers. */
function points(pathText: string): number[][] {
  return [...pathText.matchAll(/[MLCQA]([^MLCQAZ]+)/g)].map((m) => m[1].trim().split(/\s+/).map(Number))
}

describe('reverse：自定义几何与形状填充', () => {
  it('custGeom 换算成 custom 形状：viewBox 等于 bounds，路径按 path 坐标空间缩放，arcTo 转 SVG 弧', async () => {
    const pres = createPresentation({ size: '16:9' })
    const slide = addBlankSlide(pres)
    const shape = addSlideShape(slide, { preset: 'rect', x: emu(100 * PT), y: emu(50 * PT), w: emu(200 * PT), h: emu(100 * PT) })
    // path 坐标空间 1000×500：三角形 + 从 (500,0) 起顺时针 180° 的半椭圆
    setShapeCustomGeometry(shape, {
      paths: [
        {
          w: 1000,
          h: 500,
          commands: [
            { kind: 'moveTo', pt: { x: 0, y: 500 } },
            { kind: 'lnTo', pt: { x: 1000, y: 500 } },
            { kind: 'lnTo', pt: { x: 500, y: 0 } },
            { kind: 'close' }
          ]
        },
        {
          w: 1000,
          h: 500,
          commands: [
            { kind: 'moveTo', pt: { x: 1000, y: 250 } },
            { kind: 'arcTo', wR: 500, hR: 250, stAng: 0, swAng: 180 * 60000 }
          ]
        }
      ]
    })
    const [el] = await importSingle(await savePresentation(pres))
    expect(el.shapeName).toBe('custom')
    expect(el.viewBox).toEqual([200, 100])
    expect(el.bounds).toEqual([100, 50, 200, 100])
    const pathText = String(el.path)
    expect(pathText.startsWith('M0 100 L200 100 L100 0 Z M200 50 A')).toBe(true)
    const arc = points(pathText).at(-1)!
    // A rx ry rot large sweep x y：半径 100×50，小弧、顺时针，终点 (0,50)
    expect(arc).toEqual([100, 50, 0, 0, 1, 0, 50])
  })

  it('渐变与图片填充原样带回：渐变色标与角度、图片填充落 media 并可被工程读回', async () => {
    const pres = createPresentation({ size: '16:9' })
    const slide = addBlankSlide(pres)
    const grad = addSlideShape(slide, { preset: 'rect', x: emu(0), y: emu(0), w: emu(100 * PT), h: emu(100 * PT) })
    setShapeGradientFill(grad, {
      stops: [
        { offset: 0, color: '#FF0000' },
        { offset: 1, color: '#0000FF', opacity: 0.5 }
      ],
      angleDeg: 90
    })
    const pic = addSlideShape(slide, { preset: 'ellipse', x: emu(200 * PT), y: emu(0), w: emu(100 * PT), h: emu(100 * PT) })
    setShapeImageFill(pic, PNG_1PX)
    const elements = await importSingle(await savePresentation(pres))
    const g = elements.find((e) => e.elementId?.toString().endsWith(`-${2}`) || (e.fill as { type?: string })?.type === 'gradient')!
    expect(g.fill).toEqual({
      type: 'gradient',
      gradientType: 'linear',
      stops: [
        { position: 0, color: '#FF0000' },
        { position: 1, color: '#0000FF80' }
      ],
      angle: 90
    })
    const p = elements.find((e) => (e.fill as { type?: string })?.type === 'image')!
    const fill = p.fill as { src: string; fit: string; partName?: string }
    expect(fill.fit).toBe('fill')
    expect(fill.partName).toBeUndefined()
    expect(fill.src).toMatch(/^media\/.+\.png$/)
    const bytes = await readFile(path.join(cwd, 'proj', fill.src))
    expect(new Uint8Array(bytes)).toEqual(PNG_1PX)
  })
})
