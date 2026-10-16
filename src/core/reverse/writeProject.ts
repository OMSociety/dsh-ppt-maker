/**
 * Reverse write-back layer (tool plumbing):
 * materialise a { deck, pages, media, report } tuple into a real PPTD
 * project directory, reusing the store/history contracts so the project
 * the user sees afterwards is exactly the project the tool layer sees.
 *
 * Layout produced:
 *   <dir>/deck.pptd
 *   <dir>/pages/01.page … NN.page
 *   <dir>/media/.objects/<sha1><ext>   (content-addressed store)
 *   <dir>/media/<basename>             (symlink-free alias files for pages)
 *   <dir>/manifest.json                (via createProject + editProject)
 *   <dir>/import.report.yml
 *   <dir>/.history/r0000               (creation anchor snapshot)
 *
 * We deliberately do not write media files twice: pages reference
 * `media/<basename>`, and the on-disk pool is `.objects/<sha1><ext>`. The
 * alias layer exists so `ppt_export`'s path-based loader keeps working
 * without learning the object store.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  ProjectError,
  createProject,
  editProject,
  resolveProjectDir,
  type OpRecord
} from '../project/store.js'
import { checksumOf } from '../project/store.js'
import { stringifyDeck } from '../pptd/parse.js'
import { stringify as yamlStringify } from 'yaml'
import type { ImportReport, ReverseMapResult, ReverseWriteResult } from './types.js'

/* ------------------------------------------------------------------ *
 * Dedup + materialisation helpers
 * ------------------------------------------------------------------ */

function sha1Of(buffer: Uint8Array): string {
  return createHash('sha1').update(buffer).digest('hex')
}

/** basename guard: dedup pool keys only ever come from this module. */
function safeFileStem(stem: string): string {
  return stem.replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'asset'
}

/* ------------------------------------------------------------------ *
 * Public entry
 * ------------------------------------------------------------------ */

export interface WriteProjectOptions {
  cwd: string
  dir: string
  title?: string
  sessionId?: string | null
}

export async function writeReverseProject(
  mapped: ReverseMapResult,
  options: WriteProjectOptions
): Promise<ReverseWriteResult> {
  const absDir = resolveProjectDir(options.cwd, options.dir)

  // 1. create the project shell via the single-writer path. This gives us
  //    manifest.json + .history/r0000 + media/ for free.
  const created = await createProject(options.cwd, {
    dir: options.dir,
    title: options.title ?? (mapped.deck.title as string | undefined),
    size: mapped.deck.size,
    designSystem: null,
    theme: null,
    sessionId: options.sessionId ?? null
  })

  // 2. media pool with sha1 dedup
  const mediaRoot = path.join(absDir, 'media')
  const objectsRoot = path.join(mediaRoot, '.objects')
  await mkdir(objectsRoot, { recursive: true })
  const seen = new Map<string, string>() // sha1 -> alias path
  let mediaCount = 0
  for (const asset of mapped.media) {
    const hash = sha1Of(asset.bytes)
    const existing = seen.get(hash)
    if (existing) {
      // remap the page's src to the already-stored alias
      remapMediaSrc(mapped, asset.partName, existing)
      continue
    }
    const objectName = `${hash}${asset.ext}`
    const objectPath = path.join(objectsRoot, objectName)
    await writeFile(objectPath, Buffer.from(asset.bytes))
    const aliasName = `${safeFileStem(path.basename(asset.partName, asset.ext))}-${hash.slice(0, 8)}${asset.ext}`
    const aliasPath = path.join(mediaRoot, aliasName)
    await writeFile(aliasPath, Buffer.from(asset.bytes))
    seen.set(hash, `media/${aliasName}`)
    mediaCount++
    remapMediaSrc(mapped, asset.partName, `media/${aliasName}`)
  }

  // 3. deck.pptd carries the reverse-dialect contract (profile/source); apply
  //    it with pages:[] so the editProject below is the one claiming each page
  //    path. Deck mutation is atomic (tmp + rename); manifest.checksum stays
  //    stale here and is corrected by bumpManifestChecksum, which editProject
  //    then re-reads before stamping its own revision.
  const emptyDeck = { ...mapped.deck, pages: [] }
  const deckPath = path.join(absDir, 'deck.pptd')
  const tmpDeck = `${deckPath}.tmp-${process.pid}`
  await writeFile(tmpDeck, stringifyDeck(emptyDeck), 'utf8')
  await rename(tmpDeck, deckPath)
  await bumpManifestChecksum(absDir)

  // 4. apply the mapped pages via editProject so the edit lands in history
  //    as revision 1 with the cursor at the tip.
  const ops: OpRecord[] = []
  for (let i = 0; i < mapped.pages.length; i++) {
    const page = mapped.pages[i]
    ops.push({
      op: 'add_page',
      page: `pages/${String(i + 1).padStart(2, '0')}.page`,
      content: page
    })
  }
  const edited = await editProject(options.cwd, {
    dir: options.dir,
    ops,
    baseRevision: created.manifest.revision,
    sessionId: options.sessionId ?? null
  })

  // 5. import.report.yml sits next to deck.pptd. It is *not* part of the
  //    manifest checksum (loadProject only checksums deck + pages), so
  //    writing it after editProject is safe.
  const reportPath = path.join(absDir, 'import.report.yml')
  await writeFile(reportPath, yamlStringify(mapped.report), 'utf8')

  return {
    projectDir: absDir,
    pageCount: mapped.pages.length,
    mediaCount,
    revision: edited.revision,
    dropped: mapped.report.dropped,
    degraded: mapped.report.degraded
  }
}

/**
 * After in-place deck.pptd surgery the manifest's checksum is stale (it was
 * computed over the empty deck by createProject). Compute the real one now so
 * the editProject below sees a consistent project and stamps its own revision
 * on top of it.
 */
async function bumpManifestChecksum(projectDir: string): Promise<void> {
  const manifestPath = path.join(projectDir, 'manifest.json')
  const raw = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as { revision: number; checksum?: string }
  const deckText = await readFile(path.join(projectDir, 'deck.pptd'), 'utf8')
  const tmp = `${manifestPath}.tmp-${process.pid}`
  await writeFile(
    tmp,
    `${JSON.stringify({ ...manifest, checksum: checksumOf(deckText, new Map()) }, null, 2)}\n`,
    'utf8'
  )
  await rename(tmp, manifestPath)
  void ProjectError // type re-export for downstream callers
}

/** Rewrite any `src` that still points at the synthetic per-shape part name to the deduped alias. */
function remapMediaSrc(mapped: ReverseMapResult, partName: string, alias: string): void {
  for (const page of mapped.pages) {
    for (const element of page.elements) {
      const rec = element as Record<string, unknown>
      if (rec.partName === partName) {
        rec.src = alias
        delete rec.partName
      }
    }
    const bg = page.background as Record<string, unknown> | undefined
    if (bg && typeof bg === 'object' && bg.partName === partName) {
      bg.src = alias
      delete bg.partName
    }
  }
}
