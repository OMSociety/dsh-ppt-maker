/**
 * ppt_plan — 规划契约工具：brief.md 与 plan.yml 的读 / 写 / 确认。
 *
 * 动作：
 *  - get      读当前 brief（解析为结构化字段）与 plan（含交叉检查 issues）
 *  - setBrief 写 brief.md（覆盖式；带 baseRevision，在工程锁内比对）
 *  - setPlan  经 update_plan op 写 plan.yml（进编辑历史；带 baseRevision 乐观锁）
 *
 * plan 的 status 由模型按工作流推进（draft → confirmed），确认动作就是
 * setPlan 一个 status:'confirmed' 的 plan；P01–P05 早检等纪律在 SKILL.md。
 */
import path from 'node:path'
import { editProject, loadProject, ProjectError, writeProjectBrief } from '../core/project/store.js'
import { briefFromMarkdown, briefToMarkdown, validateBrief, type Brief } from '../core/pptd/plan.js'
import type { Plan } from '../core/pptd/schema-v2.js'
import { readFile } from 'node:fs/promises'
import { requireBaseRevision, renderSummary, resultSchema, resolveSessionCwd, sessionIdOf, toolError, type PluginToolCtx } from './shared.js'

export function registerPlanTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_plan',
    description:
      '读写 PPTD 工程的规划契约：brief.md（设计简报）与 plan.yml（页面计划）。' +
      'action=get 读当前 brief+plan 与 revision；setBrief 覆盖写 brief.md（传 brief 对象与 baseRevision，不推进 revision）；' +
      'setPlan 写 plan.yml（传 plan 对象，经编辑历史与乐观锁）。' +
      '返回 { ok, brief?, plan?, issues?, revision? }。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir', 'action'],
      properties: {
        dir: { type: 'string', minLength: 1 },
        action: { type: 'string', enum: ['get', 'setBrief', 'setPlan'] },
        brief: {
          type: 'object',
          additionalProperties: true,
          description: 'setBrief 用：{ purpose?, audience?, coreMessage?, tone?, mode?, pageCount? }'
        },
        plan: {
          type: 'object',
          additionalProperties: true,
          description: 'setPlan 用：{ version?:1, status?:draft|confirmed, pages:[{page,title?,type?,svgRef?,intent?,module?}] }'
        },
        baseRevision: { type: 'integer', minimum: 0, description: 'setBrief / setPlan 必填的乐观锁基线修订号' }
      }
    },
    output: {
      schema: resultSchema({
        brief: { type: 'object', additionalProperties: true },
        plan: { type: 'object', additionalProperties: true },
        issues: { type: 'array', items: { type: 'object', additionalProperties: true } },
        revision: { type: 'integer' }
      }),
      render: renderSummary((r) => {
        if (r.plan === undefined && r.brief !== undefined) return `brief.md 已写入（revision ${String(r.revision)}）`
        if (r.plan === undefined && typeof r.revision === 'number') return `plan.yml 已更新，revision → ${r.revision}`
        const pages = ((r.plan as Plan | null | undefined)?.pages?.length) ?? 0
        return `brief ${r.brief ? '有' : '无'}；plan ${r.plan ? `${pages} 页` : '无'}`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const dir = args.dir as string
        const action = args.action as string

        if (action === 'get') {
          const loaded = await loadProject(cwd, dir)
          let brief: Brief | null = null
          try {
            const raw = await readFile(path.join(loaded.dir, 'brief.md'), 'utf8')
            brief = briefFromMarkdown(raw)
          } catch {
            brief = null
          }
          return { ok: true, brief, plan: loaded.plan, issues: loaded.issues, revision: loaded.manifest.revision }
        }

        if (action === 'setBrief') {
          const brief = (args.brief ?? {}) as Brief
          const issues = validateBrief(brief)
          const blockers = issues.filter((i) => i.level === 'blocker')
          if (blockers.length > 0) {
            throw new ProjectError('BriefInvalid', `brief 存在 ${blockers.length} 个阻断问题`, {
              status: 409,
              detail: blockers.map((b) => b.message)
            })
          }
          const baseRevision = requireBaseRevision(args, 'setBrief ')
          const written = await writeProjectBrief(cwd, dir, briefToMarkdown(brief), { baseRevision })
          return { ok: true, brief, revision: written.revision }
        }

        // setPlan：走 update_plan op，进编辑历史与乐观锁。
        const result = await editProject(cwd, {
          dir,
          ops: [{ op: 'update_plan', plan: args.plan } as never],
          baseRevision: requireBaseRevision(args, 'setPlan '),
          sessionId: sessionIdOf(exec)
        })
        return { ok: true, revision: result.revision, appliedOps: result.appliedOps, warnings: result.warnings }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
