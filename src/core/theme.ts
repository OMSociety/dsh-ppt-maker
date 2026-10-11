/**
 * Theme catalog: scans the bundled skill's design systems
 * (`skills/ppt-maker/reference/design_system/<family>/<theme>/design.md`).
 *
 * A directory only counts as a theme when its design.md actually reads — the
 * catalog never lists half-shipped folders.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface ThemeInfo {
  /** Design-system family, e.g. `academic`. */
  designSystem: string
  /** Theme id inside the family, e.g. `teal-green-academic-defense`. */
  theme: string
  /** First `# …` heading of design.md, when present. */
  name: string | null
  /** Project-relative path of design.md (forward slashes). */
  path: string
}

export async function listThemes(packageRoot: string, designSystem?: string): Promise<ThemeInfo[]> {
  const root = path.join(packageRoot, 'skills', 'ppt-maker', 'reference', 'design_system')
  const out: ThemeInfo[] = []
  const families = await readdir(root, { withFileTypes: true }).catch(() => [] as import('node:fs').Dirent[])
  for (const family of families) {
    if (!family.isDirectory()) continue
    if (designSystem !== undefined && family.name !== designSystem) continue
    const familyDir = path.join(root, family.name)
    const themes = await readdir(familyDir, { withFileTypes: true }).catch(() => [] as import('node:fs').Dirent[])
    for (const entry of themes) {
      if (!entry.isDirectory()) continue
      const designFile = path.join(familyDir, entry.name, 'design.md')
      let name: string | null = null
      try {
        const text = await readFile(designFile, 'utf8')
        const heading = /^#\s+(.+)$/m.exec(text)
        name = heading ? heading[1].trim() : null
      } catch {
        continue
      }
      out.push({
        designSystem: family.name,
        theme: entry.name,
        name,
        path: path.relative(packageRoot, designFile).replace(/\\/g, '/')
      })
    }
  }
  return out.sort((a, b) => a.designSystem.localeCompare(b.designSystem) || a.theme.localeCompare(b.theme))
}
