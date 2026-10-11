/**
 * ppt_export — build the project and write a .pptx (PR 1 plan §2):
 * { ok, path, revision, check: { pass, blockerCount } }.
 *
 * The rule-layer review runs by default and blockers abort the export;
 * `skipCheck: true` bypasses the gate (spec §11). On success the export
 * summary lands in manifest.exportReport (spec §3.2 落账契约).
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildProjectDeck, checkProject, saveProjectPptx } from '../core/export-pipeline.js'
import { loadProject, ProjectError, writeExportReport } from '../core/project/store.js'
import { renderSummary, resolveSessionCwd, toolError, type PluginToolCtx } from './shared.js'

export function registerExportTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_export',
    description:
      '把工程导出为 .pptx：构建引擎产物并落盘到 <out>。默认先跑规则质检（出界/文字溢出/结构），' +
      '有 blocker 时拒绝导出；传 skipCheck: true 可绕过。成功导出后把摘要写进 manifest.exportReport。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir', 'out'],
      properties: {
        dir: { type: 'string', minLength: 1, description: '工程目录（相对于会话 cwd）' },
        out: { type: 'string', minLength: 1, description: '导出文件路径（相对于会话 cwd，.pptx）' },
        skipCheck: { type: 'boolean', description: '跳过规则质检直接导出（默认 false）' }
      }
    },
    output: {
      render: renderSummary((r) => {
        const p = r.path as string | undefined
        const check = r.check as { pass?: boolean; blockerCount?: number } | undefined
        return `已导出 ${p ?? ''}（质检 ${check?.pass === true ? '通过' : `阻断 ${check?.blockerCount ?? 0} 项`}）`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const dir = args.dir as string
        const out = args.out as string
        const skipCheck = args.skipCheck === true

        if (skipCheck !== true) {
          const check = await checkProject(cwd, dir, { withMissingFonts: true })
          if (!check.pass) {
            const blockers = check.issues.filter((i) => i.severity === 'blocker')
            return {
              ok: false,
              error: {
                code: 'ExportBlocked',
                message: `规则质检发现 ${blockers.length} 个阻断问题，导出已取消（skipCheck 可绕过）`,
                detail: blockers
              },
              check: { pass: false, blockerCount: blockers.length }
            }
          }
        }

        const pipeline = await buildProjectDeck(cwd, dir)
        const bytes = await saveProjectPptx(pipeline)

        const absOut = path.resolve(cwd, out)
        const rel = path.relative(cwd, absOut)
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          throw new ProjectError('PathOutsideCwd', `导出路径必须位于会话 cwd 内：${out}`, { status: 400 })
        }
        await writeFile(absOut, bytes)

        const loaded = await loadProject(cwd, dir)
        const report = {
          revision: pipeline.revision,
          exportedAt: new Date().toISOString(),
          out: path.relative(cwd, absOut).replace(/\\/g, '/'),
          bytes: bytes.byteLength,
          fontsUsed: pipeline.fontsUsed,
          transition: loaded.deck.export?.transition ?? 'fade',
          animations: loaded.deck.export?.animations ?? 'auto',
          buildWarnings: pipeline.buildWarnings
        }
        await writeExportReport(cwd, dir, report)

        return {
          ok: true,
          path: report.out,
          revision: pipeline.revision,
          bytes: bytes.byteLength,
          fontsUsed: pipeline.fontsUsed,
          warnings: pipeline.buildWarnings,
          check: { pass: true, blockerCount: 0 }
        }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
