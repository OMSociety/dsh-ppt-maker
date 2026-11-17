/**
 * scripts/extract-themes.mjs — distill each design-system theme's design.md
 * into a machine-readable theme.yml sitting next to it.
 *
 * design.md stays the normative style document (agent reads it for layout
 * discipline); theme.yml is the executable half: deck-level `colors` /
 * `textStyles` / `tableStyles` that ppt_create writes into deck.theme so
 * `$key` references resolve on first use.
 *
 * Idempotent: only writes theme.yml when the parse actually yields a color
 * palette or font pair; reports every directory it skipped.
 *
 * Run: node scripts/extract-themes.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stringify } from 'yaml'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DESIGN_ROOT = path.join(root, 'skills', 'ppt-maker', 'reference', 'design_system')

/* ------------------------------------------------------------------ *
 * design.md → theme.yml extraction
 *
 * design.md writes colors as `#RRGGBB` inside the 【Color Palette】 block
 * and font pairs as `{latin: X, ea: Y}` inside 【Typography】. We take the
 * first-named occurrence of each role the prose assigns; roles we cannot
 * determine are left out (a missing key beats a wrong one — the agent can
 * always inline a literal).
 * ------------------------------------------------------------------ */

const COLOR_RE = /#(?:[0-9a-fA-F]{6})\b/g

function extractPalette(md) {
  const block = /【Color Palette】([\s\S]*?)(?=【|$)/.exec(md)?.[1] ?? ''
  const colors = {}
  const seen = new Set()
  const assign = (role, hex) => {
    if (colors[role] || seen.has(hex.toUpperCase())) return
    seen.add(hex.toUpperCase())
    colors[role] = hex.toUpperCase()
  }
  // Role keywords the corpus actually uses, in first-match order.
  const rolePatterns = [
    ['background', /背景[^\n#]{0,40}?#([0-9a-fA-F]{6})/i],
    ['primary', /(?:主色|primary|主色|primary panel|primary blue|anchor)[^\n#]{0,60}?#([0-9a-fA-F]{6})/i],
    ['accent', /(?:accent|强调|accent color)[^\n#]{0,60}?#([0-9a-fA-F]{6})/i],
    ['ink', /(?:body text|正文|ink|line art|charcoal)[^\n#]{0,60}?#([0-9a-fA-F]{6})/i],
    ['muted', /(?:gray|grey|灰色|muted|low-emphasis|secondary)[^\n#]{0,60}?#([0-9a-fA-F]{6})/i],
    ['positive', /(?:positive|intervention|正向|#34A853)[^\n#]{0,40}?#([0-9a-fA-F]{6})/i]
  ]
  for (const [role, re] of rolePatterns) {
    const m = re.exec(block)
    if (m) assign(role, `#${m[1]}`)
  }
  return colors
}

function extractFonts(md) {
  const block = /【Typography】([\s\S]*?)(?=【|$)/.exec(md)?.[1] ?? ''
  const pair = /\{latin:\s*([^,}\s]+)[^}]*ea:\s*([^}\s]+)\s*\}/.exec(block)
  if (!pair) return null
  return { latin: pair[1].trim(), ea: pair[2].trim() }
}

function buildTheme(md, heading) {
  const colors = extractPalette(md)
  const fonts = extractFonts(md)
  if (Object.keys(colors).length === 0 && !fonts) return null
  const theme = {}
  if (Object.keys(colors).length > 0) theme.colors = colors
  if (fonts) {
    theme.textStyles = {
      body: { fontFamily: fonts },
      title: { fontFamily: fonts, bold: true }
    }
  }
  if (heading) theme.name = heading
  return theme
}

/* ------------------------------------------------------------------ */

async function main() {
  const families = await readdir(DESIGN_ROOT, { withFileTypes: true })
  let written = 0
  const skipped = []
  for (const family of families) {
    if (!family.isDirectory()) continue
    const familyDir = path.join(DESIGN_ROOT, family.name)
    for (const entry of await readdir(familyDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const designFile = path.join(familyDir, entry.name, 'design.md')
      let md
      try {
        md = await readFile(designFile, 'utf8')
      } catch {
        skipped.push(`${family.name}/${entry.name} (no design.md)`)
        continue
      }
      const heading = /^#\s+(.+)$/m.exec(md)?.[1]?.trim() ?? null
      const theme = buildTheme(md, heading)
      if (!theme) {
        skipped.push(`${family.name}/${entry.name} (no palette/font pair found)`)
        continue
      }
      const out = path.join(familyDir, entry.name, 'theme.yml')
      await writeFile(out, stringify(theme), 'utf8')
      written += 1
      console.log(`theme.yml ← ${family.name}/${entry.name}  colors=${Object.keys(theme.colors ?? {}).length} fonts=${theme.textStyles ? 'yes' : 'no'}`)
    }
  }
  console.log(`\nwrote ${written} theme.yml; skipped ${skipped.length}:`)
  for (const s of skipped) console.log(`  - ${s}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
