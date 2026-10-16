/**
 * Cordis host plugin entry for dsh-ppt-maker — a thin shell.
 *
 * The plugin body lives in `src/` and ships as the built single-file ESM bundle
 * `lib/index.js`, which is committed (DSH installs packages without building
 * them). This file only re-exports that bundle, so the entry point stays stable
 * while `package.json#main` keeps pointing at a path that exists both in the
 * repo and in the published tarball.
 *
 * `name` and `inject` must stay statically exported here: the loader reads them
 * before `apply` runs, and a missing injected service means `apply` is never
 * called at all (silently).
 */
export { name, inject, apply } from '../lib/index.js'
