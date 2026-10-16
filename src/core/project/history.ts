/**
 * Revision history: append-only snapshot log + cursor.
 *
 * Model (frozen):
 *  - `.history/r0000`, `r0001`, … is an append-only log of full-state snapshots
 *    (`deck.pptd` + every `pages/*.page` + `meta.json` + `media.json`).
 *  - `manifest.json#revision` is a *cursor* into that log, not a stack pointer.
 *    Undo/redo are pure cursor moves, so redo needs no pop-stack.
 *  - Media is never copied into snapshots: `media.json` holds a content-hash
 *    reference list (`media/.objects/<sha1>` dedup is the importer's job). pptx bytes are never snapshotted — they are a derived artifact and
 *    would cost 10–20 MB per revision once fonts are embedded.
 *
 * The three fine-print rules the plan calls out are all implemented here:
 *  1. merge window — same session, edits inside `mergeWindowMs` collapse into
 *     one snapshot, so the 20-entry cap cannot be blown in seconds;
 *  2. snapshot 0 is an anchor — the creation snapshot is never evicted;
 *  3. restore verifies the media hash list and reports missing/changed files
 *     instead of silently rendering a broken deck.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const HISTORY_DIR = '.history'
export const MEDIA_DIR = 'media'
export const DEFAULT_HISTORY_LIMIT = 20
export const DEFAULT_MERGE_WINDOW_MS = 30_000

export interface SnapshotMeta {
  revision: number
  parentRevision: number
  createdAt: string
  /** Start of the merge window this snapshot belongs to (merge preserves it). */
  windowStartedAt: string
  sessionId: string | null
  ops: string[]
  mergedCount: number
  anchor: boolean
}

export interface MediaEntry {
  /** Project-relative path, e.g. `media/image1.png`. */
  path: string
  sha1: string
  bytes: number
}

export interface SnapshotState {
  /** Text of `deck.pptd` at that revision. */
  deck: string
  /** Project-relative page path -> page text. */
  pages: Map<string, string>
  media: MediaEntry[]
}

export interface SnapshotInfo extends SnapshotMeta {
  dir: string
}

export interface MediaVerification {
  missing: string[]
  mismatched: Array<{ path: string; expected: string; actual: string | null }>
}

export interface AppendOptions {
  /** Cursor position the edit started from (`manifest.revision` before the edit). */
  baseRevision: number
  /** Revision this snapshot represents (0 for the creation snapshot, else base + 1). */
  revision: number
  sessionId?: string | null
  ops: string[]
  now?: number
  /** Skip the merge window (used by tests and by explicit "snapshot now" calls). */
  force?: boolean
}

export interface AppendResult {
  snapshot: SnapshotInfo
  /** True when the edit merged into the existing snapshot instead of appending one. */
  merged: boolean
}

interface HistoryPolicy {
  limit: number
  mergeWindowMs: number
}

const policy: HistoryPolicy = {
  limit: DEFAULT_HISTORY_LIMIT,
  mergeWindowMs: DEFAULT_MERGE_WINDOW_MS
}

/** Override the history policy (tests narrow the window; the defaults are the shipped contract). */
export function setHistoryPolicy(next: Partial<HistoryPolicy>): void {
  if (next.limit !== undefined) policy.limit = next.limit
  if (next.mergeWindowMs !== undefined) policy.mergeWindowMs = next.mergeWindowMs
}

export function getHistoryPolicy(): HistoryPolicy {
  return { ...policy }
}

/* ------------------------------------------------------------------ *
 * Paths
 * ------------------------------------------------------------------ */

export function historyDir(projectDir: string): string {
  return path.join(projectDir, HISTORY_DIR)
}

export function revisionLabel(revision: number): string {
  return `r${String(revision).padStart(4, '0')}`
}

export function snapshotDir(projectDir: string, revision: number): string {
  return path.join(historyDir(projectDir), revisionLabel(revision))
}

function metaPath(dir: string): string {
  return path.join(dir, 'meta.json')
}

function mediaManifestPath(dir: string): string {
  return path.join(dir, 'media.json')
}

/* ------------------------------------------------------------------ *
 * Read side
 * ------------------------------------------------------------------ */

export async function listSnapshots(projectDir: string): Promise<SnapshotInfo[]> {
  const root = historyDir(projectDir)
  let entries: string[]
  try {
    entries = await readdir(root)
  } catch {
    return []
  }
  const out: SnapshotInfo[] = []
  for (const entry of entries) {
    const match = /^r(\d{4,})$/.exec(entry)
    if (!match) continue
    const dir = path.join(root, entry)
    const meta = await readMeta(dir)
    if (meta) out.push({ ...meta, dir })
  }
  return out.sort((a, b) => a.revision - b.revision)
}

export async function readMeta(dir: string): Promise<SnapshotMeta | null> {
  try {
    const raw = JSON.parse(await readFile(metaPath(dir), 'utf8')) as SnapshotMeta
    if (typeof raw?.revision !== 'number') return null
    return raw
  } catch {
    return null
  }
}

export async function readSnapshotState(projectDir: string, revision: number): Promise<SnapshotState | null> {
  const dir = snapshotDir(projectDir, revision)
  const meta = await readMeta(dir)
  if (!meta) return null
  const deck = await readFile(path.join(dir, 'deck.pptd'), 'utf8')
  const pages = new Map<string, string>()
  const pagesRoot = path.join(dir, 'pages')
  for (const rel of await listFilesRecursive(pagesRoot)) {
    pages.set(`pages/${rel.replace(/\\/g, '/')}`, await readFile(path.join(pagesRoot, rel), 'utf8'))
  }
  let media: MediaEntry[] = []
  try {
    media = JSON.parse(await readFile(mediaManifestPath(dir), 'utf8')) as MediaEntry[]
  } catch {
    media = []
  }
  return { deck, pages, media }
}

/* ------------------------------------------------------------------ *
 * Write side
 * ------------------------------------------------------------------ */

async function writeSnapshotDir(dir: string, state: SnapshotState, meta: SnapshotMeta): Promise<void> {
  const tmp = `${dir}.tmp-${process.pid}-${Date.now()}`
  await rm(tmp, { recursive: true, force: true })
  await mkdir(path.join(tmp, 'pages'), { recursive: true })
  await writeFile(path.join(tmp, 'deck.pptd'), state.deck, 'utf8')
  for (const [rel, text] of state.pages) {
    const target = path.join(tmp, rel)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, text, 'utf8')
  }
  await writeFile(path.join(tmp, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
  await writeFile(path.join(tmp, 'media.json'), `${JSON.stringify(state.media, null, 2)}\n`, 'utf8')
  await rm(dir, { recursive: true, force: true })
  await rename(tmp, dir)
}

/**
 * Append (or merge into) a snapshot.
 *
 * Merge semantics (rule 1): an edit merges when the cursor is at the tip, the
 * tip snapshot is not the creation anchor, the session matches and the window
 * anchored at `windowStartedAt` has not expired. A merged edit keeps the same
 * revision — `undo` of a merged edit rolls back the whole burst in one step.
 * The window is anchored to the first edit of the burst, so a continuous
 * session produces at most one snapshot per window rather than sliding forever.
 */
export async function appendSnapshot(projectDir: string, state: SnapshotState, options: AppendOptions): Promise<AppendResult> {
  const now = options.now ?? Date.now()
  const snapshots = await listSnapshots(projectDir)
  const last = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null

  const mergeable =
    options.force !== true &&
    last !== null &&
    !last.anchor &&
    last.revision === options.baseRevision &&
    (options.sessionId ?? null) === last.sessionId &&
    now - Date.parse(last.windowStartedAt) < policy.mergeWindowMs

  if (last && mergeable) {
    const meta: SnapshotMeta = {
      ...last,
      createdAt: new Date(now).toISOString(),
      ops: [...last.ops, ...options.ops],
      mergedCount: last.mergedCount + 1
    }
    await writeSnapshotDir(last.dir, state, meta)
    return { snapshot: { ...meta, dir: last.dir }, merged: true }
  }

  const meta: SnapshotMeta = {
    revision: options.revision,
    parentRevision: options.baseRevision,
    createdAt: new Date(now).toISOString(),
    windowStartedAt: new Date(now).toISOString(),
    sessionId: options.sessionId ?? null,
    ops: [...options.ops],
    mergedCount: 0,
    anchor: options.revision === 0
  }
  const dir = snapshotDir(projectDir, options.revision)
  await writeSnapshotDir(dir, state, meta)
  await enforceLimit(projectDir)
  return { snapshot: { ...meta, dir }, merged: false }
}

/**
 * Drop snapshots above `revision`.
 *
 * Undo/redo never delete anything — they only move the cursor — so redo keeps
 * working after an undo. A *new edit* from an older cursor abandons the
 * forward branch, and that dead branch is pruned here; otherwise stale
 * revisions would collide with the newly appended ones.
 */
export async function pruneAbove(projectDir: string, revision: number): Promise<number[]> {
  const snapshots = await listSnapshots(projectDir)
  const pruned: number[] = []
  for (const snapshot of snapshots) {
    if (snapshot.revision > revision) {
      await rm(snapshot.dir, { recursive: true, force: true })
      pruned.push(snapshot.revision)
    }
  }
  return pruned
}

/** Evict the oldest snapshots beyond the cap, never the revision-0 anchor. */
export async function enforceLimit(projectDir: string, limit = policy.limit): Promise<number[]> {
  const snapshots = await listSnapshots(projectDir)
  const evicted: number[] = []
  let count = snapshots.length
  for (const snapshot of snapshots) {
    if (count <= limit) break
    if (snapshot.anchor) continue
    await rm(snapshot.dir, { recursive: true, force: true })
    evicted.push(snapshot.revision)
    count -= 1
  }
  return evicted
}

/* ------------------------------------------------------------------ *
 * Media hashing / verification
 * ------------------------------------------------------------------ */

export function sha1Of(buffer: Buffer | string): string {
  return createHash('sha1').update(buffer).digest('hex')
}

/** Content-hash list of everything under `<projectDir>/media`, sorted by path. */
export async function hashMediaDir(projectDir: string): Promise<MediaEntry[]> {
  const root = path.join(projectDir, MEDIA_DIR)
  const rels = await listFilesRecursive(root)
  const entries: MediaEntry[] = []
  for (const rel of rels.sort()) {
    const buffer = await readFile(path.join(root, rel))
    entries.push({ path: `${MEDIA_DIR}/${rel.replace(/\\/g, '/')}`, sha1: sha1Of(buffer), bytes: buffer.byteLength })
  }
  return entries
}

/**
 * Rule 3: on restore, check the snapshot's media list against what is on disk.
 * A missing or changed asset is reported, never silently tolerated.
 */
export async function verifyMedia(projectDir: string, entries: MediaEntry[]): Promise<MediaVerification> {
  const missing: string[] = []
  const mismatched: MediaVerification['mismatched'] = []
  for (const entry of entries) {
    const abs = path.join(projectDir, entry.path)
    try {
      const buffer = await readFile(abs)
      const actual = sha1Of(buffer)
      if (actual !== entry.sha1) mismatched.push({ path: entry.path, expected: entry.sha1, actual })
    } catch {
      missing.push(entry.path)
    }
  }
  return { missing, mismatched }
}

/** Verify a stored snapshot revision against the current project media. */
export async function verifySnapshotMedia(projectDir: string, revision: number): Promise<MediaVerification | null> {
  const state = await readSnapshotState(projectDir, revision)
  if (!state) return null
  return verifyMedia(projectDir, state.media)
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Recursively list files under `root`, returned as paths relative to `root`. */
export async function listFilesRecursive(root: string, prefix = ''): Promise<string[]> {
  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const out: string[] = []
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(path.join(root, entry.name), rel)))
    } else if (entry.isFile()) {
      out.push(rel)
    }
  }
  return out
}

/**
 * Copy a snapshot's live files back over the project (used by undo/redo):
 * rewrite `deck.pptd`, sync `pages/` to exactly the snapshot's set, and leave
 * `media/` untouched (snapshots only hold hash references; rule 3's
 * verification happens in the caller).
 */
export async function materializeSnapshot(projectDir: string, state: SnapshotState): Promise<void> {
  await writeFile(path.join(projectDir, 'deck.pptd'), state.deck, 'utf8')
  const pagesRoot = path.join(projectDir, 'pages')
  await mkdir(pagesRoot, { recursive: true })
  for (const existing of await listFilesRecursive(pagesRoot)) {
    const rel = `pages/${existing.replace(/\\/g, '/')}`
    if (!state.pages.has(rel)) await rm(path.join(pagesRoot, existing), { force: true })
  }
  for (const [rel, text] of state.pages) {
    const target = path.join(projectDir, rel)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, text, 'utf8')
  }
}
