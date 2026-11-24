import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { unzipSync } from 'fflate'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { buildProjectDeck, saveRawProjectPptx } from '../src/core/export-pipeline.js'
import { createProject } from '../src/core/project/store.js'

let cwd: string
const src = 'media/sample.png'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC', 'base64')
const base = { elementId: 'photo', bounds: [20, 20, 100, 100] }
const image = (ref: string) => ({ elements: [{ ...base, elementType: 'image', src: ref }] })

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-project-media-'))
  await createProject(cwd, { dir: 'deck' })
  await writeFile(path.join(cwd, 'deck/deck.pptd'), JSON.stringify({ schema: 2, profile: 'generate', title: '素材测试', size: [960, 540], pages: ['pages/01.page'] }))
})
afterEach(async () => {
  vi.unstubAllGlobals()
  await rm(cwd, { recursive: true, force: true })
})

async function build(page: object) {
  await writeFile(path.join(cwd, 'deck/pages/01.page'), JSON.stringify(page))
  return buildProjectDeck(cwd, 'deck')
}

it('工程中的图片以原始字节进入 PPTX 媒体部件', async () => {
  await writeFile(path.join(cwd, 'deck', src), png)
  const parts = unzipSync(await saveRawProjectPptx(await build(image(src))))
  const media = Object.entries(parts).filter(([name]) => name.startsWith('ppt/media/'))
  expect(media.some(([, bytes]) => png.equals(bytes))).toBe(true)
})

it.each([
  ['图片', image(src)],
  ['形状填充', { elements: [{ ...base, elementType: 'shape', shapeName: 'rect', fill: { type: 'image', src } }] }],
  ['页面背景', { background: { type: 'image', src }, elements: [] }]
])('缺少%s文件时终止构建并指出相对路径', async (_name, page) => {
  await expect(build(page as object)).rejects.toThrow(`工程素材不存在：${src}`)
})

it('在线图片引用要求先放入工程，不调用网络接口', async () => {
  const fetch = vi.fn(() => { throw new Error('网络接口被调用') })
  vi.stubGlobal('fetch', fetch)
  await expect(build(image('https://example.invalid/photo.png'))).rejects.toThrow('工程内相对路径')
  expect(fetch).not.toHaveBeenCalled()
})
