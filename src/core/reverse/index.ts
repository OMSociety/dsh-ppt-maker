/**
 * Reverse engine — PPTX → PPTD.
 *
 * This directory is the **second** sanctioned `@office-kit/pptx` import point
 * in the repo (`core/engine/officekit.ts` is the first). The two halves never
 * import from each other: the read side produces plain PPTD data, and the
 * write side consumes plain PPTD data.
 *
 * Public surface:
 *   - `reverseImport(options)` — one-shot bytes/path → project directory.
 *   - Types for the two-level report and intermediate model.
 *
 * Tool layer (`src/tools/import.ts`) builds on `reverseImport`.
 */
export {
  reverseImport,
  ReverseImportError,
  type ImportOptions
} from './apply.js'
export { loadReverseModel } from './read.js'
export { mapReverseModel } from './map.js'
export { writeReverseProject } from './writeProject.js'
export type {
  ImportReport,
  ReportDegradedEntry,
  ReportDroppedEntry,
  ReverseMapResult,
  ReverseMediaAsset,
  ReverseReadResult,
  ReverseShapeRecord,
  ReverseSlideRecord,
  ReverseWriteResult
} from './types.js'
