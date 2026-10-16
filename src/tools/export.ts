/**
 * ppt_export — build the project and write a .pptx:
 * { ok, path, revision, check: { pass, blockerCount } }.
 *
 * The rule-layer review runs by default and blockers abort the export;
 * `skipCheck: true` bypasses the gate (spec §11). On success the export
 * summary lands in manifest.exportReport (spec §3.2 落账契约).
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildProjectDeck, checkProject, saveProjectPptx } from '../core/export-pipeline.js'
import { loadProject, ProjectError, writeExportReport, writeQaReport } from '../core/project/store.js'
import { renderSummary, resultSchema, resolveSessionCwd, toolError, type PluginToolCtx } from './shared.js'

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
      schema: resultSchema({
        path: { type: 'string' },
        revision: { type: 'integer' },
        bytes: { type: 'integer' },
        fontsUsed: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        fontEmbed: { type: 'object', additionalProperties: true },
        check: {
          type: 'object',
          additionalProperties: true,
          properties: { pass: { type: 'boolean' }, blockerCount: { type: 'integer' } }
        }
      }),
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

        /** 质检摘要（skipCheck 时为 null）；既进 exportReport 也进 qaReport。 */
        let checkSummary: { pass: boolean; issueCount: number; blockerCount: number } | null = null

        if (skipCheck !== true) {
          const check = await checkProject(cwd, dir, { withMissingFonts: true })
          checkSummary = {
            pass: check.pass,
            issueCount: check.issues.length,
            blockerCount: check.issues.filter((i) => i.severity === 'blocker').length
          }
          if (!check.pass) {
            const blockers = check.issues.filter((i) => i.severity === 'blocker')
            // 被阻断也要落账——「当初为什么没过」本身值得可追溯。
            try {
              await writeQaReport(cwd, dir, {
                tool: 'ppt_export',
                pass: false,
                issueCount: check.issues.length,
                blockerCount: blockers.length,
                issues: check.issues,
                pages: null,
                ai: null
              })
            } catch {
              /* 落账是副产物 */
            }
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
          // 质检通过：同样落账（tool 标 ppt_export，与 ppt_check 的落账区分开）。
          try {
            await writeQaReport(cwd, dir, { tool: 'ppt_export', ...checkSummary, issues: check.issues, pages: null, ai: null })
          } catch {
            /* 落账是副产物 */
          }
        }

        const pipeline = await buildProjectDeck(cwd, dir)
        const saved = await saveProjectPptx(pipeline)
        const bytes = saved.bytes

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
          fontEmbed: saved.fontEmbed
            ? {
                mode: saved.fontEmbed.mode,
                facesEmbedded: saved.fontEmbed.facesEmbedded.length,
                skipped: saved.fontEmbed.skipped.length,
                rawBytes: saved.fontEmbed.rawBytes,
                finalBytes: saved.fontEmbed.finalBytes,
                warnings: saved.fontEmbed.warnings,
                subset: saved.fontEmbed.subset,
                skippedDetail: saved.fontEmbed.skipped
              }
            : { mode: 'off' as const },
          buildWarnings: pipeline.buildWarnings,
          /** 本次导出门禁的质检摘要（skipCheck 时为 null）。 */
          check: checkSummary
        }
        await writeExportReport(cwd, dir, report)

        return {
          ok: true,
          path: report.out,
          revision: pipeline.revision,
          bytes: bytes.byteLength,
          fontsUsed: pipeline.fontsUsed,
          warnings: pipeline.buildWarnings,
          fontEmbed: saved.fontEmbed
            ? {
                mode: saved.fontEmbed.mode,
                facesEmbedded: saved.fontEmbed.facesEmbedded,
                facesEmbeddedCount: saved.fontEmbed.facesEmbedded.length,
                skipped: saved.fontEmbed.skipped,
                skippedCount: saved.fontEmbed.skipped.length,
                rawBytes: saved.fontEmbed.rawBytes,
                finalBytes: saved.fontEmbed.finalBytes,
                subset: saved.fontEmbed.subset,
                warnings: saved.fontEmbed.warnings
              }
            : { mode: 'off' as const, facesEmbedded: [], facesEmbeddedCount: 0, skipped: [], skippedCount: 0, rawBytes: bytes.byteLength, finalBytes: bytes.byteLength, warnings: [] },
          check: { pass: true, blockerCount: 0 }
        }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
