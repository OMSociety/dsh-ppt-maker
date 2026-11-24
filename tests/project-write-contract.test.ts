import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createProject, editProject, loadProject, putSvgSource, redoProject, undoProject } from '../src/core/project/store.js'

const failure = vi.hoisted(() => ({ armed: false }))
vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>()
  return { ...fs, rename: async (...args: Parameters<typeof fs.rename>) => {
    if (failure.armed && path.basename(String(args[0])) === 'manifest.json' && path.basename(String(args[1])) === 'manifest.json') {
      failure.armed = false
      throw new Error('模拟清单安装错误')
    }
    return fs.rename(...args)
  } }
})
let cwd: string
const dir = 'sample'
const at = (name: string) => path.join(cwd, dir, name)
beforeEach(async () => { cwd = await mkdtemp(path.join(tmpdir(), 'ppt-write-')) })
afterEach(async () => { failure.armed = false; await rm(cwd, { recursive: true, force: true }) })
async function tree(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name)
    if (entry.isDirectory()) for (const [k, v] of Object.entries(await tree(file))) result[`${entry.name}/${k}`] = v
    else result[entry.name] = (await readFile(file)).toString('base64')
  }
  return result
}
it('创建仅接收新目录或空目录；非空目录逐文件保持原样', async () => {
  await mkdir(at(''), { recursive: true })
  await writeFile(at('notes.txt'), '普通本地草稿')
  const before = await tree(at(''))
  await expect(createProject(cwd, { dir })).rejects.toMatchObject({ code: 'ProjectAlreadyExists' })
  expect(await tree(at(''))).toEqual(before)
  await rm(at('notes.txt'))
  const pair = await Promise.allSettled([createProject(cwd, { dir }), createProject(cwd, { dir })])
  expect(pair.filter(r => r.status === 'fulfilled')).toHaveLength(1)
})
it('打开工程只读；首次编辑记录游标并保留快照与撤销重做', async () => {
  await createProject(cwd, { dir })
  await editProject(cwd, { dir, baseRevision: 0, ops: [{ op: 'add_page' }] })
  const manifest = JSON.parse(await readFile(at('manifest.json'), 'utf8'))
  delete manifest.historyCursor
  await writeFile(at('manifest.json'), JSON.stringify(manifest))
  const initial = await tree(at(''))
  expect((await loadProject(cwd, dir)).manifest.revision).toBe(1)
  expect(await tree(at(''))).toEqual(initial)
  const result = await editProject(cwd, { dir, sessionId: 'editor-b', baseRevision: 1, ops: [{ op: 'add_page' }] })
  expect(result.revision).toBe(2)
  expect((await loadProject(cwd, dir)).manifest.historyCursor).toBe(2)
  const after = await tree(at(''))
  for (const key of Object.keys(initial).filter(k => k.startsWith('.history/'))) expect(after[key]).toBe(initial[key])
  expect((await undoProject(cwd, dir, 1, { baseRevision: 2 })).revision).toBe(3)
  expect((await redoProject(cwd, dir, 1, { baseRevision: 3 })).revision).toBe(4)
})
it('并发编辑共享基线时一次成功；按返回基线续编仍可成组撤销', async () => {
  await createProject(cwd, { dir })
  const save = (baseRevision: number) => editProject(cwd, { dir, baseRevision, sessionId: 'same', ops: [{ op: 'add_page' }] })
  await save(0)
  const pair = await Promise.allSettled([save(1), save(1)])
  expect(pair.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect(pair.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'RevisionMismatch', detail: { expected: 2 } } })
  expect(await save(2)).toMatchObject({ merged: true, revision: 3 })
  await undoProject(cwd, dir, 1, { baseRevision: 3 })
  expect((await loadProject(cwd, dir)).deck.pages).toEqual([])
})
it('普通页不接收 SVG 挂页，源、页及历史保持一致', async () => {
  await createProject(cwd, { dir })
  await putSvgSource(cwd, dir, 'cover.svg', '<svg/>', undefined, 0, 'writer')
  await editProject(cwd, { dir, baseRevision: 1, ops: [{ op: 'add_page' }] })
  const before = await tree(at(''))
  await expect(putSvgSource(cwd, dir, 'cover.svg', '<svg><rect/></svg>', 'pages/01.page', 2, 'writer')).rejects.toMatchObject({ code: 'SvgSourceInvalid' })
  expect(await tree(at(''))).toEqual(before)
})
it('SVG 源、页面、历史与清单共同提交，安装错误保留原字节', async () => {
  await createProject(cwd, { dir })
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>'
  await putSvgSource(cwd, dir, 'a.svg', svg, undefined, 0, 'editor')
  await editProject(cwd, { dir, baseRevision: 1, ops: [{ op: 'add_page', content: { pageType: 'svg', svgSource: { ref: 'media/svg/a.svg' }, elements: [] } }] })
  const before = await tree(at(''))
  await expect(putSvgSource(cwd, dir, 'a.svg', '<svg/>', 'pages/01.page', 1, 'editor')).rejects.toMatchObject({ code: 'RevisionMismatch' })
  expect(await tree(at(''))).toEqual(before)
  failure.armed = true
  await expect(putSvgSource(cwd, dir, 'a.svg', '<svg/>', 'pages/01.page', 2, 'editor')).rejects.toThrow('模拟清单安装错误')
  expect(await tree(at(''))).toEqual(before)
  expect((await putSvgSource(cwd, dir, 'b.svg', svg, 'pages/01.page', 2, 'editor')).revision).toBe(3)
  expect(await readFile(at('pages/01.page'), 'utf8')).toContain('media/svg/b.svg')
})
