/**
 * Theme catalog: scans the bundled skill's design systems
 * (`skills/ppt-maker/reference/design_system/<family>/<theme>/design.md`).
 *
 * A directory only counts as a theme when its design.md actually reads — the
 * catalog never lists half-shipped folders. An empty or unreadable catalog
 * throws, so `ppt_themes` reports a broken install instead of "0 themes".
 */
import { readdir, readFile } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
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
  let families: Dirent[]
  try {
    families = await readdir(root, { withFileTypes: true })
  } catch (err) {
    // A missing catalog means a broken install, not "no themes" — say so instead
    // of handing the tool an empty list that reads like a valid answer.
    throw new Error(`主题目录不可读（插件安装不完整？）：${root}：${(err as Error).message}`)
  }
  for (const family of families) {
    if (!family.isDirectory()) continue
    const familyDir = path.join(root, family.name)
    const themes = await readdir(familyDir, { withFileTypes: true }).catch(() => [] as Dirent[])
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
  if (out.length === 0) {
    throw new Error(`主题目录里没有任何可读的 design.md（插件安装不完整？）：${root}`)
  }
  const filtered = designSystem === undefined ? out : out.filter((theme) => theme.designSystem === designSystem)
  return filtered.sort((a, b) => a.designSystem.localeCompare(b.designSystem) || a.theme.localeCompare(b.theme))
}
