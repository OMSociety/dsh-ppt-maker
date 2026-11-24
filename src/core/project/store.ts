/**
 * Project store: the only code that reads/writes a PPTD project on disk.
 *
 * Ownership rules:
 *  - `manifest.json` has exactly ONE writer: this module. Tools and future PR
 *    stages never touch it directly; `history.ts` owns `.history/` and nothing
 *    else.
 *  - Every project dir must resolve inside the session cwd; there is no
 *    fallback to `process.cwd()` — a tool without a session cwd fails loudly.
 *  - All mutations run under a per-directory mutex (Map<dir, Promise chain>),
 *    applied to an in-memory model first and written out only when every op
 *    succeeded, so an `ops[]` batch is atomic: either the whole batch lands or
 *    nothing changes on disk.
 */
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import {
  isSafeRelativePath,
  parseDeckText,
  parsePageText,
  parseProject,
  profileOf,
  stringifyDeck,
  stringifyPage,
  themeKeysOf,
  validateDeck,
  validatePage,
  type Issue,
  type Page,
  type Presentation
} from '../pptd/parse.js'
import { SCHEMA_VERSION, SVG_MEDIA_DIR, SVG_PAGE_TYPE } from '../pptd/schema-v2.js'
import {
  appendSnapshot,
  hashMediaDir,
  listSnapshots,
  materializeSnapshot,
  pruneAbove,
  readSnapshotState,
  revisionLabel,
  sha1Of,
  verifyMedia,
  writeAtomic,
  type SnapshotMeta,
  type SnapshotState
} from './history.js'

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export class ProjectError extends Error {
  readonly code: string
  readonly status?: number
  readonly detail?: unknown

  constructor(code: string, message: string, options: { status?: number; detail?: unknown } = {}) {
    super(message)
    this.name = 'ProjectError'
    this.code = code
    this.status = options.status
    this.detail = options.detail
  }
}

export class OpError extends Error {
  readonly opIndex: number
  readonly op: string
  /** 调用方给出的 op 不合法：HTTP 层映射为 400。 */
  readonly status = 400

  constructor(opIndex: number, op: string, message: string) {
    super(`ops[${opIndex}] (${op})：${message}`)
    this.name = 'OpError'
    this.opIndex = opIndex
    this.op = op
  }
}

/* ------------------------------------------------------------------ *
 * Manifest (single writer: this module)
 * ------------------------------------------------------------------ */

export interface Manifest {
  revision: number
  historyCursor?: number
  createdAt: string
  updatedAt: string
  designSystem: string | null
  theme: string | null
  checksum: string
  exportReport?: unknown
  /** 最近一次规则质检的落账（ppt_check / ppt_export 都会刷新），见 writeQaReport。 */
  qaReport?: unknown
}

const MANIFEST_FILE = 'manifest.json'
const DECK_FILE = 'deck.pptd'
const PAGES_DIR = 'pages'

function cursorOf(manifest: Manifest): number {
  return manifest.historyCursor === undefined ? manifest.revision : manifest.historyCursor
}

async function readManifest(projectDir: string): Promise<Manifest> {
  let raw: string
  try {
    raw = await readFile(path.join(projectDir, MANIFEST_FILE), 'utf8')
  } catch {
    throw new ProjectError('ManifestMissing', `工程账本缺失：${MANIFEST_FILE}（该目录不是完整的 PPTD 工程）`, { status: 404 })
  }
  try {
    const manifest = JSON.parse(raw) as Manifest
    if (![manifest.revision, cursorOf(manifest)].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('revision 或 historyCursor 无效')
    return manifest
  } catch (err) {
    throw new ProjectError('ManifestCorrupt', `工程账本损坏：${(err as Error).message}`, { status: 409 })
  }
}

/** The single write path for manifest.json: temp file + rename, never a torn write. */
async function writeManifest(projectDir: string, manifest: Manifest): Promise<void> {
  await writeAtomic(path.join(projectDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`)
}

/**
 * Stamp an export summary into manifest.exportReport (spec §3.2 落账契约).
 * The manifest's single-writer rule routes this through store.ts as well.
 */
export async function writeExportReport(cwd: string, dir: string, report: unknown): Promise<void> {
  const abs = resolveProjectDir(cwd, dir)
  return withProjectLock(abs, async () => {
    const manifest = await readManifest(abs)
    await writeManifest(abs, { ...manifest, exportReport: report })
  })
}

/**
 * Stamp a QA summary into manifest.qaReport（质检落账契约）。
 * `revision` / `checkedAt` 由本函数从 manifest 现场取——调用方只交业务字段，
 * 保证落账的修订号永远是「质检跑的那一刻」的游标位置。
 * 调用方（ppt_check / ppt_export）把它当 best-effort：落账失败不反噬质检结果。
 */
export async function writeQaReport(cwd: string, dir: string, report: Record<string, unknown>): Promise<void> {
  const abs = resolveProjectDir(cwd, dir)
  return withProjectLock(abs, async () => {
    const manifest = await readManifest(abs)
    await writeManifest(abs, {
      ...manifest,
      qaReport: { revision: manifest.revision, checkedAt: new Date().toISOString(), ...report }
    })
  })
}

/** Content checksum over deck + pages (detects external edits on load). */
export function checksumOf(deckText: string, pages: Map<string, string>): string {
  const parts = [`deck.pptd:${sha1Of(deckText)}`]
  for (const rel of [...pages.keys()].sort()) {
    parts.push(`${rel}:${sha1Of(pages.get(rel) ?? '')}`)
  }
  return sha1Of(parts.join('\n'))
}

/* ------------------------------------------------------------------ *
 * Path containment (dir must resolve inside the session cwd)
 * ------------------------------------------------------------------ */

export function resolveProjectDir(cwd: string, dir: string): string {
  if (typeof cwd !== 'string' || cwd === '') {
    throw new ProjectError('SessionCwdMissing', '会话没有 cwd，无法定位工程目录（不回落到 process.cwd()）', { status: 400 })
  }
  const absCwd = path.resolve(cwd)
  const abs = path.resolve(absCwd, dir)
  const rel = path.relative(absCwd, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new ProjectError('PathOutsideCwd', `工程目录必须位于会话 cwd 内：${dir}（解析到 ${abs}，超出 ${absCwd}）`, {
      status: 400,
      detail: { dir, resolved: abs, cwd: absCwd }
    })
  }
  return abs
}

/* ------------------------------------------------------------------ *
 * Per-directory mutex
 * ------------------------------------------------------------------ */

const locks = new Map<string, Promise<unknown>>()

export async function withProjectLock<T>(projectDir: string, fn: () => Promise<T>): Promise<T> {
  const absolute = path.resolve(projectDir)
  const key = process.platform === 'win32' ? absolute.toLowerCase() : absolute
  const previous = locks.get(key) ?? Promise.resolve()
  const next = previous.then(fn, fn)
  // Chain a settled wrapper so one failure does not poison the queue, and only
  // delete the map entry if nobody chained a newer operation behind us.
  const wrapped = next.catch(() => undefined)
  locks.set(key, wrapped)
  try {
    return await next
  } finally {
    if (locks.get(key) === wrapped) locks.delete(key)
  }
}

/* ------------------------------------------------------------------ *
 * Load
 * ------------------------------------------------------------------ */

export interface LoadedProject {
  dir: string
  deck: Presentation
  /** Project-relative path -> parsed page. */
  pages: Map<string, Page>
  manifest: Manifest
  issues: Issue[]
  /** Non-null when the on-disk checksum does not match the manifest (external edit). */
  checksumMismatch: boolean
}

export async function loadProject(cwd: string, dir: string): Promise<LoadedProject> {
  const abs = resolveProjectDir(cwd, dir)
  let deckText: string
  try {
    deckText = await readFile(path.join(abs, DECK_FILE), 'utf8')
  } catch {
    throw new ProjectError('ProjectNotFound', `找不到工程主入口：${path.join(abs, DECK_FILE)}`, { status: 404 })
  }
  const manifest = await readManifest(abs)

  const deckParsed = parseDeckText(deckText)
  // Path safety is validated by parseDeckText (blocker); never read outside the project dir.
  const declared = Array.isArray(deckParsed.value?.pages)
    ? deckParsed.value.pages.filter((p): p is string => typeof p === 'string' && isSafeRelativePath(p))
    : []
  const pageEntries: Array<{ path: string; text: string }> = []
  for (const rel of declared) {
    try {
      pageEntries.push({ path: rel.replace(/\\/g, '/'), text: await readFile(path.join(abs, rel), 'utf8') })
    } catch {
      // missing page file — parseProject reports it as a SchemaError issue
    }
  }
  const parsed = parseProject(deckText, pageEntries)
  if (!parsed.deck) {
    throw new ProjectError('DeckParseFailed', 'deck.pptd 无法解析', { status: 409, detail: parsed.issues })
  }

  const pages = new Map<string, string>()
  for (const entry of pageEntries) pages.set(entry.path, entry.text)
  const checksumMismatch = checksumOf(deckText, pages) !== manifest.checksum
  const issues = [...parsed.issues]
  if (checksumMismatch) {
    issues.push({
      code: 'ChecksumMismatch',
      level: 'warning',
      message: '磁盘内容与 manifest.checksum 不一致（工程被工具层之外修改过）'
    })
  }
  return { dir: abs, deck: parsed.deck, pages: parsed.pages, manifest, issues, checksumMismatch }
}

/* ------------------------------------------------------------------ *
 * Model helpers
 * ------------------------------------------------------------------ */

interface ProjectModel {
  deck: Presentation
  pages: Map<string, Page>
}

function cloneModel(model: ProjectModel): ProjectModel {
  return {
    deck: JSON.parse(JSON.stringify(model.deck)) as Presentation,
    pages: new Map([...model.pages].map(([k, v]) => [k, JSON.parse(JSON.stringify(v)) as Page]))
  }
}

function snapshotStateOf(projectDir: string, model: ProjectModel): Promise<SnapshotState> {
  return hashMediaDir(projectDir).then((media) => ({
    deck: stringifyDeck(model.deck),
    pages: new Map([...model.pages].map(([k, v]) => [k, stringifyPage(v)])),
    media
  }))
}

/** Write deck + all pages to the live project (tmp + rename per file). */
async function writeModel(projectDir: string, model: ProjectModel): Promise<void> {
  await writeAtomic(path.join(projectDir, DECK_FILE), stringifyDeck(model.deck))
  const pagesRoot = path.join(projectDir, PAGES_DIR)
  await mkdir(pagesRoot, { recursive: true })
  const live = new Set(model.pages.keys())
  for (const entry of await readdir(pagesRoot).catch(() => [] as string[])) {
    const rel = `${PAGES_DIR}/${entry}`
    if (!live.has(rel)) await rm(path.join(pagesRoot, entry), { force: true })
  }
  for (const [rel, page] of model.pages) {
    const target = path.join(projectDir, rel)
    await mkdir(path.dirname(target), { recursive: true })
    await writeAtomic(target, stringifyPage(page))
  }
}

/* ------------------------------------------------------------------ *
 * Create
 * ------------------------------------------------------------------ */

export interface CreateProjectOptions {
  dir: string
  title?: string
  size?: [number, number]
  designSystem?: string | null
  theme?: string | null
  /** Explicit `theme` block written into deck.pptd (colors/textStyles/tableStyles). */
  deckTheme?: Record<string, unknown>
  sessionId?: string | null
}

export const DEFAULT_SIZE: [number, number] = [960, 540]

export async function createProject(cwd: string, options: CreateProjectOptions): Promise<{ manifest: Manifest; dir: string }> {
  const abs = resolveProjectDir(cwd, options.dir)
  return withProjectLock(abs, async () => {
    await mkdir(abs, { recursive: true })
    if ((await readdir(abs)).length !== 0) {
      throw new ProjectError('ProjectAlreadyExists', `创建工程需要空目录：${abs}`, { status: 409 })
    }

    await mkdir(path.join(abs, PAGES_DIR), { recursive: true })
    await mkdir(path.join(abs, 'media'), { recursive: true })

    const deck: Presentation = {
      profile: 'generate',
      schema: SCHEMA_VERSION,
      ...(options.title !== undefined ? { title: options.title } : {}),
      size: options.size ?? DEFAULT_SIZE,
      ...(options.deckTheme !== undefined ? { theme: options.deckTheme } : {}),
      export: { fontEmbed: 'subset', transition: 'morph', animations: 'auto' },
      pages: []
    }

    const model: ProjectModel = { deck, pages: new Map() }
    await writeModel(abs, model)

    const now = new Date().toISOString()
    const manifest: Manifest = {
      revision: 0,
      historyCursor: 0,
      createdAt: now,
      updatedAt: now,
      designSystem: options.designSystem ?? null,
      theme: options.theme ?? null,
      checksum: checksumOf(stringifyDeck(deck), new Map())
    }

    const state = await snapshotStateOf(abs, model)
    await appendSnapshot(abs, state, { baseRevision: -1, revision: 0, sessionId: options.sessionId ?? null, ops: ['create'], force: true })
    await writeManifest(abs, manifest)
    return { manifest, dir: abs }
  })
}

/* ------------------------------------------------------------------ *
 * Ops (frozen op-array shape)
 * ------------------------------------------------------------------ */

/**
 * The frozen op vocabulary. `page_add` / `page_delete` are accepted aliases of
 * `add_page` / `remove_page`.
 */
export const OP_NAMES = [
  'add_page',
  'remove_page',
  'move_page',
  'update_page',
  'page_duplicate',
  'add_element',
  'update_element',
  'remove_element',
  'update_svg_source',
  'page_add',
  'page_delete'
] as const

const OP_ALIASES: Record<string, string> = {
  page_add: 'add_page',
  page_delete: 'remove_page'
}

export interface OpRecord {
  op?: string
  [key: string]: unknown
}

function opError(index: number, op: string, message: string): OpError {
  return new OpError(index, op, message)
}

function requirePage(model: ProjectModel, index: number, op: string, pagePath: unknown): Page {
  if (typeof pagePath !== 'string' || pagePath === '') throw opError(index, op, '缺少 page 参数（页文件相对路径）')
  const key = pagePath.replace(/\\/g, '/')
  const page = model.pages.get(key)
  if (!page) throw opError(index, op, `页不存在：${key}`)
  return page
}

function pageKeyOf(pagePath: unknown): string | null {
  if (typeof pagePath !== 'string' || pagePath === '') return null
  const key = pagePath.replace(/\\/g, '/')
  return isSafeRelativePath(key) ? key : null
}

/**
 * `page` / `newPage` on a writing op: absent means "auto-number", present but
 * unsafe is an error — silently renumbering an escaped path would hide a bug.
 */
function requirePageKey(index: number, op: string, pagePath: unknown): string | null {
  if (pagePath === undefined) return null
  const key = pageKeyOf(pagePath)
  if (key === null) throw opError(index, op, `页路径必须是工程目录内的相对路径：${JSON.stringify(pagePath)}`)
  return key
}

/** Next free `pages/NN.page` name. */
function nextPagePath(model: ProjectModel): string {
  for (let i = 1; i < 1000; i++) {
    const candidate = `pages/${String(i).padStart(2, '0')}.page`
    if (!model.pages.has(candidate) && !model.deck.pages.includes(candidate)) return candidate
  }
  throw new Error('页序号耗尽')
}

/**
 * 逆向溯源（spec §6.8）：编辑触碰内容字段时，清掉整页元素的 sourceRef。
 *
 * sourceRef 表示「该元素与源 pptx 的某个形状逐字段对应」。update_page /
 * update_element 是顶层浅合并，patch 不改 sourceRef；内容字段（content/bounds/
 * fill/…）一变，这层对应关系就不再成立，整页 sourceRef 全部抹掉。纯溯源字段
 * （sourceRef/originalName）的 patch 不触发失效。placeholder 代表源对象本身，sourceRef 始终保留，\n * 导出时据此从源存档拷回原件。整页恢复另按页指纹判定
 * （src/core/reverse/restore.ts）。
 */
const PROVENANCE_KEYS = new Set(['sourceRef', 'originalName'])

function invalidatePageProvenance(page: Page, patch: Record<string, unknown>): void {
  if (!pageHasSourceRef(page)) return
  const touchesContent = Object.keys(patch).some((k) => !PROVENANCE_KEYS.has(k))
  if (!touchesContent) return
  for (const el of page.elements) {
    // A placeholder stands for the source object itself, so its link survives edits.
    if (el && typeof el === 'object' && (el as Record<string, unknown>).elementType !== 'placeholder') {
      delete (el as Record<string, unknown>).sourceRef
    }
  }
}

function pageHasSourceRef(page: Page): boolean {
  return page.elements.some((el) => el && typeof el === 'object' && (el as Record<string, unknown>).sourceRef !== undefined)
}

function applyOp(model: ProjectModel, raw: OpRecord, index: number): string {
  if (!raw || typeof raw !== 'object') throw opError(index, '?', 'op 必须是对象')
  const name = raw.op
  if (typeof name !== 'string' || !(OP_NAMES as readonly string[]).includes(name)) {
    throw opError(index, String(name ?? '?'), `未知 op（冻结词表：${OP_NAMES.join(' / ')}）`)
  }
  const op = OP_ALIASES[name] ?? name

  switch (op) {
    case 'add_page': {
      const key = requirePageKey(index, name, raw.page) ?? nextPagePath(model)
      if (model.pages.has(key) || model.deck.pages.includes(key)) throw opError(index, name, `页已存在：${key}`)
      const content = (raw.content ?? { elements: [] }) as Page
      if (typeof content !== 'object' || content === null || Array.isArray(content)) throw opError(index, name, 'content 必须是页对象')
      if (!Array.isArray(content.elements)) content.elements = []
      const at = typeof raw.index === 'number' ? Math.max(0, Math.min(raw.index, model.deck.pages.length)) : model.deck.pages.length
      model.pages.set(key, content)
      model.deck.pages.splice(at, 0, key)
      return `add_page ${key}@${at}`
    }
    case 'remove_page': {
      const key = pageKeyOf(raw.page)
      requirePage(model, index, name, key)
      model.pages.delete(key as string)
      model.deck.pages = model.deck.pages.filter((p) => p !== key)
      return `remove_page ${key}`
    }
    case 'move_page': {
      const key = pageKeyOf(raw.page)
      requirePage(model, index, name, key)
      const from = model.deck.pages.indexOf(key as string)
      if (typeof raw.toIndex !== 'number' || !Number.isInteger(raw.toIndex)) throw opError(index, name, 'move_page 需要整数 toIndex')
      const to = Math.max(0, Math.min(raw.toIndex, model.deck.pages.length - 1))
      model.deck.pages.splice(from, 1)
      model.deck.pages.splice(to, 0, key as string)
      return `move_page ${key} ${from}→${to}`
    }
    case 'update_page': {
      const key = pageKeyOf(raw.page)
      const page = requirePage(model, index, name, key)
      const patch = raw.patch
      if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) throw opError(index, name, 'update_page 需要对象 patch（顶层浅合并）')
      invalidatePageProvenance(page, patch as Record<string, unknown>)
      Object.assign(page, patch)
      return `update_page ${key}`
    }
    case 'page_duplicate': {
      const key = pageKeyOf(raw.page)
      const page = requirePage(model, index, name, key)
      const newKey = requirePageKey(index, name, raw.newPage) ?? nextPagePath(model)
      if (model.pages.has(newKey) || model.deck.pages.includes(newKey)) throw opError(index, name, `目标页已存在：${newKey}`)
      const copy = JSON.parse(JSON.stringify(page)) as Page
      const at = typeof raw.index === 'number' ? Math.max(0, Math.min(raw.index, model.deck.pages.length)) : model.deck.pages.indexOf(key as string) + 1
      model.pages.set(newKey, copy)
      model.deck.pages.splice(at, 0, newKey)
      return `page_duplicate ${key}→${newKey}`
    }
    case 'add_element': {
      const key = pageKeyOf(raw.page)
      const page = requirePage(model, index, name, key)
      const element = raw.element
      if (typeof element !== 'object' || element === null || Array.isArray(element)) throw opError(index, name, 'add_element 需要对象 element')
      const record = element as { elementId?: unknown }
      if (typeof record.elementId !== 'string' || record.elementId === '') throw opError(index, name, 'element.elementId 必填')
      if (page.elements.some((e) => e?.elementId === record.elementId)) {
        throw opError(index, name, `elementId 重复：${String(record.elementId)}`)
      }
      const at = typeof raw.index === 'number' ? Math.max(0, Math.min(raw.index, page.elements.length)) : page.elements.length
      page.elements.splice(at, 0, element as Page['elements'][number])
      return `add_element ${key}#${String(record.elementId)}`
    }
    case 'update_element': {
      const key = pageKeyOf(raw.page)
      const page = requirePage(model, index, name, key)
      if (typeof raw.elementId !== 'string' || raw.elementId === '') throw opError(index, name, 'update_element 需要 elementId')
      const element = page.elements.find((e) => e?.elementId === raw.elementId)
      if (!element) throw opError(index, name, `元素不存在：${key}#${raw.elementId}`)
      const patch = raw.patch
      if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) throw opError(index, name, 'update_element 需要对象 patch（顶层浅合并）')
      invalidatePageProvenance(page, patch as Record<string, unknown>)
      Object.assign(element, patch)
      return `update_element ${key}#${raw.elementId}`
    }
    case 'remove_element': {
      const key = pageKeyOf(raw.page)
      const page = requirePage(model, index, name, key)
      if (typeof raw.elementId !== 'string' || raw.elementId === '') throw opError(index, name, 'remove_element 需要 elementId')
      const before = page.elements.length
      page.elements = page.elements.filter((e) => e?.elementId !== raw.elementId)
      if (page.elements.length === before) throw opError(index, name, `元素不存在：${key}#${raw.elementId}`)
      return `remove_element ${key}#${raw.elementId}`
    }
    case 'update_svg_source': {
      const key = pageKeyOf(raw.page)
      const page = requirePage(model, index, name, key)
      if (page.pageType !== SVG_PAGE_TYPE) throw opError(index, name, `页不是 svg 类型：${key}`)
      const src = raw.source
      if (typeof src !== 'object' || src === null || Array.isArray(src)) throw opError(index, name, 'update_svg_source 需要对象 source {ref, viewBox?}')
      const ref = (src as { ref?: unknown }).ref
      if (typeof ref !== 'string' || !isSafeRelativePath(ref) || !ref.startsWith(SVG_MEDIA_DIR + '/') || !ref.toLowerCase().endsWith('.svg')) {
        throw opError(index, name, `source.ref 必须是 ${SVG_MEDIA_DIR}/ 下以 .svg 结尾的相对路径`)
      }
      page.svgSource = { ref, ...((src as { viewBox?: unknown }).viewBox !== undefined ? { viewBox: (src as { viewBox: [number, number] }).viewBox } : {}) }
      return `update_svg_source ${key}→${ref}`
    }
    default:
      throw opError(index, name, `未实现的 op：${op}`)
  }
}

/* ------------------------------------------------------------------ *
 * Edit (atomic ops[] + optimistic lock)
 * ------------------------------------------------------------------ */

export interface EditOptions {
  dir: string
  ops: OpRecord[]
  baseRevision?: number
  sessionId?: string | null
}

export interface EditResult {
  revision: number
  appliedOps: string[]
  warnings: string[]
  issues: Issue[]
  merged: boolean
}

/** SVG edits install prebuilt files by rename; each displaced entry stays available for rollback. */
async function commitSvgEdit(abs: string, loaded: LoadedProject, model: ProjectModel, state: SnapshotState,
  asset: { ref: string; text: string; page?: string }, sessionId: string | null, ops: string[]) {
  const stage = await mkdtemp(path.join(abs, '.svg-edit-'))
  const installed: Array<{ target: string; backup?: string; replaced: boolean }> = []
  let retain = false
  try {
    state.media = state.media.filter(entry => entry.path !== asset.ref)
    state.media.push({ path: asset.ref, sha1: sha1Of(asset.text), bytes: Buffer.byteLength(asset.text) })
    state.media.sort((a, b) => a.path.localeCompare(b.path))
    await cp(path.join(abs, '.history'), path.join(stage, '.history'), { recursive: true })
    const cursor = cursorOf(loaded.manifest)
    const appended = await appendSnapshot(stage, state, { baseRevision: cursor, revision: cursor + 1, sessionId, ops })
    const historyCursor = appended.snapshot.revision
    await pruneAbove(stage, historyCursor)
    const revision = loaded.manifest.revision + 1
    await writeManifest(stage, { ...loaded.manifest, revision, historyCursor, updatedAt: new Date().toISOString(), checksum: checksumOf(state.deck, state.pages) })
    await mkdir(path.join(stage, SVG_MEDIA_DIR), { recursive: true })
    await writeAtomic(path.join(stage, asset.ref), asset.text)
    const entries = [asset.ref]
    if (asset.page) {
      const page = model.pages.get(asset.page)!
      await mkdir(path.dirname(path.join(stage, asset.page)), { recursive: true })
      await writeAtomic(path.join(stage, asset.page), stringifyPage(page))
      entries.push(asset.page)
    }
    entries.push('.history', MANIFEST_FILE)
    for (const rel of entries) {
      const target = path.join(abs, rel)
      await mkdir(path.dirname(target), { recursive: true })
      const entry = { target, backup: undefined as string | undefined, replaced: false }
      const existing = await lstat(target).catch(err => { if (err.code === 'ENOENT') return null; throw err })
      if (existing) {
        if (rel === '.history' ? !existing.isDirectory() : !existing.isFile()) throw new Error(`目标不是预期的文件类型：${rel}`)
        entry.backup = path.join(stage, `backup-${installed.length}`)
        await rename(target, entry.backup)
      }
      installed.push(entry)
      await rename(path.join(stage, rel), target)
      entry.replaced = true
    }
    return { revision, merged: appended.merged }
  } catch (err) {
    try {
      for (const entry of installed.reverse()) {
        if (entry.replaced) await rm(entry.target, { recursive: true, force: true })
        if (entry.backup) await rename(entry.backup, entry.target)
      }
    } catch (rollbackError) {
      retain = true
      throw new AggregateError([err, rollbackError], `恢复未完成；备份位于 ${stage}`)
    }
    throw err
  } finally {
    if (!retain) await rm(stage, { recursive: true, force: true })
  }
}

export function editProject(cwd: string, options: EditOptions): Promise<EditResult> {
  return applyEdit(cwd, options)
}

export function putSvgSource(cwd: string, dir: string, name: string, text: string, page: string | undefined, baseRevision: number, sessionId: string | null) {
  if (!/^[a-z0-9][a-z0-9_-]*\.svg$/i.test(name)) throw new ProjectError('SvgSourceInvalid', 'SVG 文件名无效', { status: 400 })
  const ref = `${SVG_MEDIA_DIR}/${name}`
  const ops = page === undefined ? [] : [{ op: 'update_svg_source', page, source: { ref } }]
  return applyEdit(cwd, { dir, ops, baseRevision, sessionId }, { ref, text, page: page?.replace(/\\/g, '/') })
}

async function applyEdit(cwd: string, options: EditOptions, asset?: { ref: string; text: string; page?: string }): Promise<EditResult> {
  const abs = resolveProjectDir(cwd, options.dir)
  return withProjectLock(abs, async () => {
    const loaded = await loadProject(cwd, options.dir)
    const base = loaded.manifest.revision

    if (options.baseRevision !== undefined && options.baseRevision !== base) {
      throw new ProjectError('RevisionMismatch', `baseRevision 不匹配：期望 ${base}，收到 ${options.baseRevision}`, {
        status: 409,
        detail: { expected: base, actual: options.baseRevision }
      })
    }

    const model = cloneModel({ deck: loaded.deck, pages: loaded.pages })
    if (asset?.page !== undefined && loaded.pages.get(asset.page)?.pageType !== SVG_PAGE_TYPE) {
      throw new ProjectError('SvgSourceInvalid', `目标页不是 svg 页型：${asset.page}`, { status: 409 })
    }
    const appliedOps: string[] = asset ? [`put_svg ${asset.ref}`] : []
    for (let i = 0; i < options.ops.length; i++) {
      appliedOps.push(applyOp(model, options.ops[i], i))
    }

    const profile = profileOf(model.deck)
    const themeKeys = themeKeysOf(model.deck.theme)
    const issues: Issue[] = [...validateDeck(model.deck, { profile })]
    for (const [rel, page] of model.pages) {
      issues.push(...validatePage(page, { profile, path: rel, themeKeys }))
    }

    // Nothing is written when the batch would land an invalid project: a
    // blocker here would only surface later at export/check time, after the
    // bad revision had already become the cursor.
    const blockers = issues.filter((issue) => issue.level === 'blocker')
    if (blockers.length > 0) {
      // 前几条直接进 message：工具摘要与面板横幅只显示 message，detail 里是完整清单。
      const shown = blockers.slice(0, 5).map((issue) => `${issue.path ?? ''} ${issue.message}`.trim())
      const more = blockers.length > shown.length ? `；另有 ${blockers.length - shown.length} 条见 detail` : ''
      throw new ProjectError('ValidationBlockers', `写入前校验发现 ${blockers.length} 个阻断问题，本次改动未落盘：${shown.join('；')}${more}`, {
        status: 409,
        detail: blockers
      })
    }

    const state = await snapshotStateOf(abs, model)
    if (asset) {
      const saved = await commitSvgEdit(abs, loaded, model, state, asset, options.sessionId ?? null, appliedOps)
      return { ...saved, appliedOps, warnings: issues.map(issue => issue.message), issues }
    }
    const appended = await appendSnapshot(abs, state, {
      baseRevision: cursorOf(loaded.manifest),
      revision: cursorOf(loaded.manifest) + 1,
      sessionId: options.sessionId ?? null,
      ops: appliedOps
    })

    const revision = base + 1
    await writeModel(abs, model)
    const manifest: Manifest = {
      ...loaded.manifest,
      revision,
      historyCursor: appended.snapshot.revision,
      updatedAt: new Date().toISOString(),
      checksum: checksumOf(state.deck, state.pages)
    }
    await writeManifest(abs, manifest)
    // Only after the new revision is fully on disk: the abandoned forward
    // branch (revisions above the new cursor) is dead, but if any write above
    // failed it must still be there to fall back on.
    await pruneAbove(abs, appended.snapshot.revision)

    const warnings = issues.map((issue) => `[${issue.level}/${issue.code}] ${issue.path ?? ''} ${issue.message}`.trim())
    return { revision, appliedOps, warnings, issues, merged: appended.merged }
  })
}

/* ------------------------------------------------------------------ *
 * Undo / redo (cursor moves; the log is append-only)
 * ------------------------------------------------------------------ */

export interface UndoRedoResult {
  revision: number
  undoneOps: string[]
  warnings: string[]
}

export interface CursorMoveOptions {
  /** 调用方看到的 manifest.revision；给出时在工程锁内比对，不符即 409 RevisionMismatch。 */
  baseRevision?: number
}

type CursorPlan = (current: number, maxRevision: number) => { target: number; label: 'undo' | 'redo' } | { noop: string }

function assertBaseRevision(base: number | undefined, current: number): void {
  if (base === undefined) return
  if (typeof base !== 'number' || !Number.isFinite(base)) {
    throw new ProjectError('InvalidArgument', 'baseRevision 必须是数字', { status: 400 })
  }
  if (base !== current) {
    throw new ProjectError('RevisionMismatch', `baseRevision 不匹配：期望 ${current}，收到 ${base}`, {
      status: 409,
      detail: { expected: current, actual: base }
    })
  }
}

/**
 * 游标移动的唯一实现：读 manifest、比对 baseRevision、计算目标与物化快照
 * 全部在同一把工程锁内完成，并发写入不会在「读到 revision」与「移动游标」之间落地。
 */
async function moveCursor(cwd: string, dir: string, plan: CursorPlan, options: CursorMoveOptions): Promise<UndoRedoResult> {
  const abs = resolveProjectDir(cwd, dir)
  return withProjectLock(abs, async () => {
    const loaded = await loadProject(cwd, dir)
    const current = cursorOf(loaded.manifest)
    const version = loaded.manifest.revision
    assertBaseRevision(options.baseRevision, version)

    const snapshots = await listSnapshots(abs)
    const maxRevision = snapshots.length > 0 ? snapshots[snapshots.length - 1].revision : 0
    const decided = plan(current, maxRevision)
    if ('noop' in decided) return { revision: version, undoneOps: [], warnings: [decided.noop] }
    const { target, label } = decided
    if (target === current) return { revision: version, undoneOps: [], warnings: [`没有可${label === 'undo' ? '撤销' : '重做'}的步骤`] }

    const between =
      label === 'undo'
        ? snapshots.filter((s) => s.revision > target && s.revision <= current)
        : snapshots.filter((s) => s.revision > current && s.revision <= target)
    const movedOps = between.flatMap((s) => s.ops)

    const state = await readSnapshotState(abs, target)
    if (!state) {
      throw new ProjectError('SnapshotUnavailable', `快照 r${String(target).padStart(4, '0')} 不存在，无法${label === 'undo' ? '撤销' : '重做'}到修订 ${target}`, {
        status: 409,
        detail: { target, current }
      })
    }

    // Rule 3: verify the snapshot's media hash list before restoring.
    const verification = await verifyMedia(abs, state.media)
    const warnings: string[] = []
    for (const missing of verification.missing) {
      warnings.push(`[media] 快照引用的素材缺失：${missing}`)
    }
    for (const mismatch of verification.mismatched) {
      warnings.push(`[media] 素材内容已被修改：${mismatch.path}（期望 ${mismatch.expected}，实际 ${mismatch.actual}）`)
    }

    await materializeSnapshot(abs, state)
    const manifest: Manifest = {
      ...loaded.manifest,
      revision: version + 1,
      historyCursor: target,
      updatedAt: new Date().toISOString(),
      checksum: checksumOf(state.deck, state.pages)
    }
    await writeManifest(abs, manifest)
    return { revision: manifest.revision, undoneOps: movedOps, warnings }
  })
}

function assertSteps(steps: number): void {
  if (!Number.isInteger(steps) || steps < 1 || steps > 20) {
    throw new ProjectError('InvalidSteps', 'steps 必须是 1–20 的整数', { status: 400 })
  }
}

export async function undoProject(cwd: string, dir: string, steps = 1, options: CursorMoveOptions = {}): Promise<UndoRedoResult> {
  assertSteps(steps)
  return moveCursor(cwd, dir, (current) => ({ target: Math.max(0, current - steps), label: 'undo' }), options)
}

export async function redoProject(cwd: string, dir: string, steps = 1, options: CursorMoveOptions = {}): Promise<UndoRedoResult> {
  assertSteps(steps)
  return moveCursor(cwd, dir, (current, max) => ({ target: Math.min(max, current + steps), label: 'redo' }), options)
}
/**
 * Undo/redo availability for UI surfaces (e.g. the workbench toolbar).
 * Cursor model: canUndo = cursor > 0; canRedo = cursor < max snapshot revision.
 * Read-only, no mutex (pure query).
 */
export async function projectUndoState(
  cwd: string,
  dir: string
): Promise<{ canUndo: boolean; canRedo: boolean }> {
  const loaded = await loadProject(cwd, dir)
  const abs = resolveProjectDir(cwd, dir)
  const snapshots = await listSnapshots(abs)
  const max = snapshots.length > 0 ? snapshots[snapshots.length - 1].revision : 0
  return { canUndo: cursorOf(loaded.manifest) > 0, canRedo: cursorOf(loaded.manifest) < max }
}

/* ------------------------------------------------------------------ *
 * Version history（用户可见的版本列表 / 预览 / 恢复）
 * ------------------------------------------------------------------ */

/** 版本历史列表：游标当前位置 + 全部快照元数据（升序）。 */
export interface HistoryListResult {
  /** 历史抽屉使用的快照游标。 */
  revision: number
  entries: SnapshotMeta[]
}

export async function listProjectHistory(cwd: string, dir: string): Promise<HistoryListResult> {
  const abs = resolveProjectDir(cwd, dir)
  const loaded = await loadProject(cwd, dir)
  const entries = await listSnapshots(abs)
  return { revision: cursorOf(loaded.manifest), entries }
}

export interface HistorySnapshotResult {
  revision: number
  deck: Presentation | null
  pages: Array<{ path: string; page: Page | null }>
  warnings: string[]
}

function formatParseIssue(issue: Issue): string {
  return `[${issue.level}/${issue.code}] ${issue.path ?? ''} ${issue.message}`.trim()
}

/** 读一份历史快照并按 PPTD 解析（供面板画布直渲预览；只读，绝不动工程文件）。 */
export async function readHistorySnapshot(
  cwd: string,
  dir: string,
  revision: number
): Promise<HistorySnapshotResult | null> {
  const abs = resolveProjectDir(cwd, dir)
  const state = await readSnapshotState(abs, revision)
  if (!state) return null
  const label = revisionLabel(revision)
  const warnings: string[] = []
  const deckParsed = parseDeckText(state.deck, `.history/${label}/deck.pptd`)
  warnings.push(...deckParsed.issues.map(formatParseIssue))
  const pages: Array<{ path: string; page: Page | null }> = []
  for (const [rel, text] of [...state.pages.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const parsed = parsePageText(text, `.history/${label}/${rel}`)
    warnings.push(...parsed.issues.map(formatParseIssue))
    pages.push({ path: rel, page: parsed.value })
  }
  return { revision, deck: deckParsed.value, pages, warnings }
}

/**
 * 恢复到指定历史版本：游标移动到目标 revision——undo/redo 的同一件事换成
 * 显式目标。复用 moveCursor 的快照物化与素材 hash 校验（历史 rule 3）；
 * 目标就是当前版本时是安全的 no-op。
 */
export async function restoreProject(
  cwd: string,
  dir: string,
  targetRevision: number,
  options: CursorMoveOptions = {}
): Promise<UndoRedoResult> {
  if (!Number.isInteger(targetRevision) || targetRevision < 0) {
    throw new ProjectError('InvalidRevision', '目标 revision 必须是 ≥0 的整数', { status: 400 })
  }
  return moveCursor(
    cwd,
    dir,
    (current) =>
      targetRevision === current
        ? { noop: '目标版本就是当前版本，无需恢复' }
        : { target: targetRevision, label: targetRevision < current ? 'undo' : 'redo' },
    options
  )
}
