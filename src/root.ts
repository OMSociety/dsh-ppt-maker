/**
 * Single source of truth for the package root.
 *
 * Works from both layouts this module is loaded in:
 *  - unbundled (vitest): `<root>/src/root.ts` → dirname → `<root>/src` → up one = `<root>`
 *  - bundled (tsup):     `<root>/lib/index.js` → dirname → `<root>/lib` → up one = `<root>`
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
