/** SVG 编译缓存键随被引用媒体字节变化。 */
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { referencedMediaDigest } from '../src/core/svg/compiler.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'ppt-svg-key-'))
  await mkdir(path.join(dir, 'media'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="media/a.png"/><image href="data:image/png;base64,AA=="/><use href="#x"/></svg>'

describe('referencedMediaDigest', () => {
  it('引用的媒体换字节后摘要变化；data:/锚点不参与', async () => {
    await writeFile(path.join(dir, 'media', 'a.png'), Buffer.from([1, 2, 3]))
    const first = await referencedMediaDigest(SVG, dir)
    expect(await referencedMediaDigest(SVG, dir)).toBe(first)
    await writeFile(path.join(dir, 'media', 'a.png'), Buffer.from([4, 5, 6]))
    expect(await referencedMediaDigest(SVG, dir)).not.toBe(first)
  })

  it('工程目录外的引用不读取', async () => {
    const outside = '<svg><image href="../../etc/passwd"/></svg>'
    const a = await referencedMediaDigest(outside, dir)
    const b = await referencedMediaDigest('<svg><image href="../../other"/></svg>', dir)
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
})
