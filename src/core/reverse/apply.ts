/**
 * Reverse orchestration: pptx bytes / file → PPTD project.
 *
 * This module is the public facade the tool layer (`ppt_import`) and any
 * future route handler call. It owns:
 *   - resolving the source to bytes (`Uint8Array` / absolute path inside cwd);
 *   - hashing once for source.sha1;
 *   - running read → map → write;
 *   - converting library-level "cannot parse" throws into a typed error the
 *     caller can turn into a surgical-mode suggestion.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { loadReverseModel } from './read.js'
import { mapReverseModel } from './map.js'
import { writeReverseProject } from './writeProject.js'
import type { ReverseWriteResult } from './types.js'

export interface ImportOptions {
  cwd: string
  /** pptx source bytes or a path relative to cwd. */
  source: Uint8Array | string
  /** Target project directory, relative to cwd. */
  targetDir: string
  title?: string
  sessionId?: string | null
}

export class ReverseImportError extends Error {
  readonly code: 'SourceNotFound' | 'SourceOutsideCwd' | 'ParseFailed'
  readonly detail?: unknown

  constructor(code: ReverseImportError['code'], message: string, detail?: unknown) {
    super(message)
    this.name = 'ReverseImportError'
    this.code = code
    this.detail = detail
  }
}

async function sourceBytes(cwd: string, source: Uint8Array | string): Promise<{ bytes: Uint8Array; path: string }> {
  if (source instanceof Uint8Array) return { bytes: source, path: '<bytes>' }
  const abs = path.resolve(cwd, source)
  const rel = path.relative(path.resolve(cwd), abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new ReverseImportError('SourceOutsideCwd', `源文件必须位于会话 cwd 内：${source}（解析到 ${abs}）`)
  }
  try {
    const bytes = await readFile(abs)
    return { bytes: new Uint8Array(bytes), path: abs }
  } catch (err) {
    throw new ReverseImportError('SourceNotFound', `源文件读不到：${abs}`, err)
  }
}

export async function reverseImport(options: ImportOptions): Promise<ReverseWriteResult> {
  const { bytes, path: sourceAbs } = await sourceBytes(options.cwd, options.source)
  const sha1 = createHash('sha1').update(bytes).digest('hex')

  let read: Awaited<ReturnType<typeof loadReverseModel>>
  try {
    read = await loadReverseModel(bytes)
  } catch (err) {
    throw new ReverseImportError(
      'ParseFailed',
      `@office-kit/pptx 无法解析源文件（可改用 mode:'surgical' 直接小改）：${(err as Error).message}`,
      err
    )
  }

  const mapped = mapReverseModel(read, { sourcePath: sourceAbs, sourceSha1: sha1 })

  return writeReverseProject(mapped, {
    cwd: options.cwd,
    dir: options.targetDir,
    title: options.title,
    sessionId: options.sessionId ?? null
  })
}
