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
import { mkdir, readFile, readdir, rm } from 'node:fs/promises'
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

async function readManifest(projectDir: string): Promise<Manifest> {
  let raw: string
  try {
    raw = await readFile(path.join(projectDir, MANIFEST_FILE), 'utf8')
  } catch {
    throw new ProjectError('ManifestMissing', `工程账本缺失：${MANIFEST_FILE}（该目录不是完整的 PPTD 工程）`, { status: 404 })
  }
  try {
    const manifest = JSON.parse(raw) as Manifest
    if (typeof manifest.revision !== 'number') throw new Error('revision 缺失')
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
  const key = path.resolve(projectDir)
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
    try {
      await readFile(path.join(abs, DECK_FILE), 'utf8')
      throw new ProjectError('ProjectAlreadyExists', `目标目录已存在工程：${path.join(abs, DECK_FILE)}`, { status: 409 })
    } catch (err) {
      if (err instanceof ProjectError) throw err
      // ENOENT → good, we can create
    }

    await mkdir(path.join(abs, PAGES_DIR), { recursive: true })
    await mkdir(path.join(abs, 'media'), { recursive: true })

    const deck: Presentation = {
      profile: 'generate',
      ...(options.title !== undefined ? { title: options.title } : {}),
      size: options.size ?? DEFAULT_SIZE,
      ...(options.deckTheme !== undefined ? { theme: options.deckTheme } : {}),
      export: { fontEmbed: 'subset', transition: 'fade', animations: 'auto' },
      pages: []
    }

    const model: ProjectModel = { deck, pages: new Map() }
    await writeModel(abs, model)

    const now = new Date().toISOString()
    const manifest: Manifest = {
      revision: 0,
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
 * `add_page` / `remove_page`; the plan's op list names both spellings.
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

export async function editProject(cwd: string, options: EditOptions): Promise<EditResult> {
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
    const appliedOps: string[] = []
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
      throw new ProjectError('ValidationBlockers', `写入前校验发现 ${blockers.length} 个阻断问题，本次改动未落盘`, {
        status: 409,
        detail: blockers
      })
    }

    const state = await snapshotStateOf(abs, model)
    const appended = await appendSnapshot(abs, state, {
      baseRevision: base,
      revision: base + 1,
      sessionId: options.sessionId ?? null,
      ops: appliedOps
    })

    const revision = appended.merged ? base : base + 1
    await writeModel(abs, model)
    const manifest: Manifest = {
      ...loaded.manifest,
      revision,
      updatedAt: new Date().toISOString(),
      checksum: checksumOf(state.deck, state.pages)
    }
    await writeManifest(abs, manifest)
    // Only after the new revision is fully on disk: the abandoned forward
    // branch (revisions above the new cursor) is dead, but if any write above
    // failed it must still be there to fall back on.
    await pruneAbove(abs, revision)

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

async function moveCursor(cwd: string, dir: string, target: number, label: 'undo' | 'redo'): Promise<UndoRedoResult> {
  const abs = resolveProjectDir(cwd, dir)
  return withProjectLock(abs, async () => {
    const loaded = await loadProject(cwd, dir)
    const current = loaded.manifest.revision
    if (target === current) return { revision: current, undoneOps: [], warnings: [`没有可${label === 'undo' ? '撤销' : '重做'}的步骤`] }

    const snapshots = await listSnapshots(abs)
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
      revision: target,
      updatedAt: new Date().toISOString(),
      checksum: checksumOf(state.deck, state.pages)
    }
    await writeManifest(abs, manifest)
    return { revision: target, undoneOps: movedOps, warnings }
  })
}

export async function undoProject(cwd: string, dir: string, steps = 1): Promise<UndoRedoResult> {
  if (!Number.isInteger(steps) || steps < 1 || steps > 20) {
    throw new ProjectError('InvalidSteps', 'steps 必须是 1–20 的整数', { status: 400 })
  }
  const loaded = await loadProject(cwd, dir)
  const target = Math.max(0, loaded.manifest.revision - steps)
  return moveCursor(cwd, dir, target, 'undo')
}

export async function redoProject(cwd: string, dir: string, steps = 1): Promise<UndoRedoResult> {
  if (!Number.isInteger(steps) || steps < 1 || steps > 20) {
    throw new ProjectError('InvalidSteps', 'steps 必须是 1–20 的整数', { status: 400 })
  }
  const loaded = await loadProject(cwd, dir)
  const abs = resolveProjectDir(cwd, dir)
  const snapshots = await listSnapshots(abs)
  const max = snapshots.length > 0 ? snapshots[snapshots.length - 1].revision : 0
  const target = Math.min(max, loaded.manifest.revision + steps)
  return moveCursor(cwd, dir, target, 'redo')
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
  return { canUndo: loaded.manifest.revision > 0, canRedo: loaded.manifest.revision < max }
}

/* ------------------------------------------------------------------ *
 * Version history（用户可见的版本列表 / 预览 / 恢复）
 * ------------------------------------------------------------------ */

/** 版本历史列表：游标当前位置 + 全部快照元数据（升序）。 */
export interface HistoryListResult {
  /** manifest.revision——游标当前位置。 */
  revision: number
  entries: SnapshotMeta[]
}

export async function listProjectHistory(cwd: string, dir: string): Promise<HistoryListResult> {
  const abs = resolveProjectDir(cwd, dir)
  const loaded = await loadProject(cwd, dir)
  const entries = await listSnapshots(abs)
  return { revision: loaded.manifest.revision, entries }
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
export async function restoreProject(cwd: string, dir: string, targetRevision: number): Promise<UndoRedoResult> {
  if (!Number.isInteger(targetRevision) || targetRevision < 0) {
    throw new ProjectError('InvalidRevision', '目标 revision 必须是 ≥0 的整数', { status: 400 })
  }
  const loaded = await loadProject(cwd, dir)
  const current = loaded.manifest.revision
  if (targetRevision === current) {
    return { revision: current, undoneOps: [], warnings: ['目标版本就是当前版本，无需恢复'] }
  }
  return moveCursor(cwd, dir, targetRevision, targetRevision < current ? 'undo' : 'redo')
}
