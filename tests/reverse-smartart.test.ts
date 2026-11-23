/**
 * SmartArt 展开（spec §10.6）：按绘图缓存把 SmartArt 转成一组可编辑形状，
 * 组合路径保留在 group，导入报告记 smartArt.expanded。
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { reverseImport } from '../src/core/reverse/index.js'
import { loadProject } from '../src/core/project/store.js'
import { expandSmartArt } from '../src/core/reverse/smartart.js'

let cwd: string
beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'ppt-smartart-'))
})
afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe('reverse：SmartArt 展开', () => {
  it('组织结构图按绘图缓存展开为同组形状，文字可编辑', async () => {
    const bytes = new Uint8Array(await readFile(path.resolve('tests/corpus/syn-academic-v1.pptx')))
    const { expanded } = expandSmartArt(bytes)
    expect(expanded).toHaveLength(1)
    expect(expanded[0].slideIndex).toBe(9)
    expect(expanded[0].shapeCount).toBeGreaterThan(5)

    const result = await reverseImport({ cwd, source: bytes, targetDir: 'proj', sessionId: 's' })
    expect(result.dropped.filter((d) => d.originalType === 'smartArt')).toHaveLength(0)
    const loaded = await loadProject(cwd, 'proj')
    const page = loaded.pages.get(String(loaded.deck.pages[8]))!
    expect(page.elements.some((e) => e.elementType === 'placeholder')).toBe(false)
    const groupId = `g-9-${expanded[0].shapeId}`
    const members = page.elements.filter((e) => Array.isArray(e.group) && (e.group as string[])[0] === groupId)
    expect(members.length).toBeGreaterThan(5)
    const texts = members.map((e) => String((e as { content?: { text?: string } }).content?.text ?? '')).join('|')
    for (const word of ['学术部', '外联部', '宣传部', '秘书处']) expect(texts).toContain(word)
    expect(result.degraded.some((d) => d.feature === 'smartArt.expanded' && d.page === 9)).toBe(true)
  })

  it('没有 SmartArt 的包原样返回', async () => {
    const bytes = new Uint8Array(await readFile(path.resolve('tests/corpus/real-notes-v1.pptx')))
    const out = expandSmartArt(bytes)
    expect(out.expanded).toHaveLength(0)
    expect(out.bytes).toBe(bytes)
  })
})
