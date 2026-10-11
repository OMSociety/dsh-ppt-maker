/**
 * Cordis host plugin for dsh-ppt-maker (renamed from dsh-kimi-ppt, v1.0.0).
 *
 * Two jobs:
 *  1. Register the bundled `skills/ppt-maker` directory as a DSH skill so the
 *     model can load it (DSH never discovers skill files shipped inside a
 *     package on its own).
 *  2. Register the eight project tools: ppt_create / ppt_themes / ppt_edit /
 *     ppt_undo / ppt_redo / ppt_render / ppt_export / ppt_check (raw
 *     JSON-Schema via ctx.tools.register, per the PR 1 plan).
 *
 * `inject = ['tools', 'sessions', 'skills', 'llm', 'attachments']`: the tools
 * need `sessions` to resolve the session cwd (`exec.agent.session.id` →
 * `sessions.get(id).header.cwd`); there is deliberately no process.cwd()
 * fallback. `llm` + `attachments` power the opt-in AI review pass of
 * ppt_check (PR 1 plan §6, added in PR1-C). `webServer` joins in PR 2.
 *
 * Note: Cordis refuses bare service access without declaring it in `inject`,
 * and refuses to run apply() at all when an injected service is missing.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { PACKAGE_ROOT } from './root.js'
import { registerCheckTool } from './tools/check.js'
import { registerCreateTool } from './tools/create.js'
import { registerEditTool } from './tools/edit.js'
import { registerExportTool } from './tools/export.js'
import { registerRedoTool } from './tools/redo.js'
import { registerRenderTool } from './tools/render.js'
import { registerThemesTool } from './tools/themes.js'
import { registerUndoTool } from './tools/undo.js'

export const name = 'dsh-ppt-maker'
export const inject = ['tools', 'sessions', 'skills', 'llm', 'attachments']
export { PACKAGE_ROOT }

const SKILL_DIR = path.join(PACKAGE_ROOT, 'skills', 'ppt-maker')
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md')

/** Minimal YAML-frontmatter reader for the skill's own `key: value` block. */
function readSkillFrontmatter(source: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match) return {}
  const out: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (kv) out[kv[1]] = kv[2].trim()
  }
  return out
}

interface SkillsLike {
  register(def: {
    name?: string
    description?: string
    whenToUse?: string
    content: string
    source: string
    resourceBase: { kind: 'directory'; path: string }
  }): unknown
}

interface ApplyCtx {
  skills?: SkillsLike
  tools?: Parameters<typeof registerCreateTool>[0]['tools']
  sessions?: Parameters<typeof registerCreateTool>[0]['sessions']
  llm?: Parameters<typeof registerCheckTool>[0]['llm']
  attachments?: Parameters<typeof registerCheckTool>[0]['attachments']
  logger?: { warn?: (message: string) => void }
  effect?: (fn: () => void | (() => void)) => void
}

function registerSkill(ctx: ApplyCtx): () => void {
  if (!ctx.skills || !existsSync(SKILL_FILE)) return () => {}
  try {
    const source = readFileSync(SKILL_FILE, 'utf8')
    const frontmatter = readSkillFrontmatter(source)
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    const off = ctx.skills.register({
      name: frontmatter.name,
      description: frontmatter.description,
      ...(frontmatter.whenToUse !== undefined ? { whenToUse: frontmatter.whenToUse } : {}),
      content: body.trim(),
      // `register()` fills `provider` but not `source`, and the registry's load
      // path (SkillRegistry.get → validateDefinition) requires both to be
      // strings — without `source` the skill catalogs fine and then throws on
      // first load.
      source: 'bundled',
      resourceBase: { kind: 'directory', path: SKILL_DIR }
    })
    return typeof off === 'function' ? (off as () => void) : () => {}
  } catch (err) {
    ctx.logger?.warn?.(`[dsh-ppt-maker] could not register the skill: ${(err as Error).message}`)
    return () => {}
  }
}

export function apply(ctx: ApplyCtx): void {
  const offs: Array<() => void> = [registerSkill(ctx)]
  if (ctx.tools) {
    for (const register of [
      registerCreateTool,
      registerThemesTool,
      registerEditTool,
      registerUndoTool,
      registerRedoTool,
      registerRenderTool,
      registerExportTool,
      registerCheckTool
    ]) {
      try {
        const off = register({ tools: ctx.tools, sessions: ctx.sessions, llm: ctx.llm, attachments: ctx.attachments })
        if (typeof off === 'function') offs.push(off)
      } catch (err) {
        ctx.logger?.warn?.(`[dsh-ppt-maker] tool registration failed: ${(err as Error).message}`)
      }
    }
  }
  ctx.effect?.(() => () => {
    for (const off of offs.splice(0)) {
      try {
        off()
      } catch {
        /* teardown must not throw */
      }
    }
  })
}
