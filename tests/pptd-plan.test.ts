import { describe, expect, it } from 'vitest'
import {
  briefFromMarkdown,
  briefToMarkdown,
  crossCheckPlan,
  parsePlanText,
  stringifyPlan,
  validatePlan,
  type Plan
} from '../src/core/pptd/plan.js'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createProject, editProject, loadProject } from '../src/core/project/store.js'

function codes(issues: { code: string }[]): string[] {
  return issues.map((i) => i.code)
}

const PLAN_OK = `version: 1
status: draft
pages:
  - page: pages/01.page
    title: 封面
    type: native
  - page: pages/02.page
    title: 数据页
    type: svg
    svgRef: media/svg/chart.svg
`

describe('plan.yml 契约', () => {
  it('合法 plan 通过校验并可往返', () => {
    const r = parsePlanText(PLAN_OK)
    expect(r.issues.filter((i) => i.level === 'blocker')).toEqual([])
    expect(r.plan?.pages).toHaveLength(2)
    const round = parsePlanText(stringifyPlan(r.plan as Plan))
    expect(round.issues.filter((i) => i.level === 'blocker')).toEqual([])
    expect(round.plan).toEqual(r.plan)
  })

  it('pages 缺失/为空 → blocker', () => {
    expect(codes(validatePlan({ version: 1, pages: [] }))).toContain('SchemaError')
    expect(codes(validatePlan({ version: 1 }))).toContain('SchemaError')
  })

  it('svg 页缺 svgRef → blocker；native 页带 svgRef → blocker', () => {
    const noRef = validatePlan({ pages: [{ page: 'pages/01.page', type: 'svg' }] })
    expect(codes(noRef)).toContain('SchemaError')
    const strayRef = validatePlan({ pages: [{ page: 'pages/01.page', type: 'native', svgRef: 'media/svg/a.svg' }] })
    expect(codes(strayRef)).toContain('SchemaError')
  })

  it('page 路径重复 → blocker', () => {
    const dup = validatePlan({ pages: [{ page: 'pages/01.page' }, { page: 'pages/01.page' }] })
    expect(codes(dup)).toContain('SchemaError')
  })

  it('crossCheckPlan：plan 与 deck 页表不一致 → warning 而非 blocker', () => {
    const plan = parsePlanText(PLAN_OK).plan as Plan
    const issues = crossCheckPlan(plan, { schema: 2, size: [960, 540], pages: ['pages/01.page'] } as never)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every((i) => i.level === 'warning')).toBe(true)
  })
})

describe('brief.md 契约', () => {
  it('briefToMarkdown/briefFromMarkdown 往返保住字段', () => {
    const brief = { purpose: '季度复盘', audience: '管理层', coreMessage: '增长来自留存', tone: '克制', mode: 'deck' as const, pageCount: 12 }
    const back = briefFromMarkdown(briefToMarkdown(brief))
    expect(back).toEqual(brief)
  })

  it('散文行被容错忽略', () => {
    const brief = briefFromMarkdown('# 随便写写\n\n这里没有结构化行。\n- **目的**：测试\n')
    expect(brief.purpose).toBe('测试')
  })
})

describe('store：update_plan / update_svg_source / schema 戳', () => {
  it('createProject 写的 deck.pptd 带 schema: 2；update_plan 落 plan.yml；update_svg_source 校验 svg 页', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'ppt-plan-'))
    try {
      const { manifest } = await createProject(cwd, { dir: 'deck', title: 't', sessionId: 's1' })
      const deckText = await readFile(path.join(cwd, 'deck', 'deck.pptd'), 'utf8')
      expect(deckText).toContain('schema: 2')

      // 先加一页 svg 页 + 一页 native 页
      const e1 = await editProject(cwd, {
        dir: 'deck',
        baseRevision: manifest.revision,
        sessionId: 's1',
        ops: [
          { op: 'add_page', page: 'pages/01.page', content: { pageType: 'svg', svgSource: { ref: 'media/svg/cover.svg' }, elements: [] } },
          { op: 'add_page', page: 'pages/02.page', content: { elements: [] } }
        ]
      })
      expect(e1.revision).toBeGreaterThan(0)

      // update_plan 合法 → plan.yml 落盘
      const e2 = await editProject(cwd, {
        dir: 'deck',
        baseRevision: e1.revision,
        sessionId: 's1',
        ops: [
          {
            op: 'update_plan',
            plan: {
              version: 1,
              status: 'confirmed',
              pages: [
                { page: 'pages/01.page', title: '封面', type: 'svg', svgRef: 'media/svg/cover.svg' },
                { page: 'pages/02.page', title: '正文', type: 'native' }
              ]
            }
          }
        ]
      })
      expect(e2.appliedOps.some((s) => s.startsWith('update_plan'))).toBe(true)
      const planText = await readFile(path.join(cwd, 'deck', 'plan.yml'), 'utf8')
      expect(planText).toContain('status: confirmed')
      const loaded = await loadProject(cwd, 'deck')
      expect(loaded.plan?.status).toBe('confirmed')

      // update_plan 非法（svg 页缺 svgRef）→ 拒绝
      const bad = await editProject(cwd, {
        dir: 'deck',
        baseRevision: e2.revision,
        sessionId: 's1',
        ops: [{ op: 'update_plan', plan: { pages: [{ page: 'pages/01.page', type: 'svg' }] } }]
      }).catch((e: unknown) => e)
      expect(bad).toMatchObject({ name: 'OpError' })

      // update_svg_source：svg 页合法更新
      const e3 = await editProject(cwd, {
        dir: 'deck',
        baseRevision: e2.revision,
        sessionId: 's1',
        ops: [{ op: 'update_svg_source', page: 'pages/01.page', source: { ref: 'media/svg/cover-v2.svg' } }]
      })
      expect(e3.appliedOps.some((s) => s.startsWith('update_svg_source'))).toBe(true)

      // update_svg_source：指向 native 页 → 拒绝
      const wrongPage = await editProject(cwd, {
        dir: 'deck',
        baseRevision: e3.revision,
        sessionId: 's1',
        ops: [{ op: 'update_svg_source', page: 'pages/02.page', source: { ref: 'media/svg/x.svg' } }]
      }).catch((e: unknown) => e)
      expect(wrongPage).toMatchObject({ name: 'OpError' })

      // update_svg_source：ref 逃逸 media/svg → 拒绝
      const escape = await editProject(cwd, {
        dir: 'deck',
        baseRevision: e3.revision,
        sessionId: 's1',
        ops: [{ op: 'update_svg_source', page: 'pages/01.page', source: { ref: 'media/other.svg' } }]
      }).catch((e: unknown) => e)
      expect(escape).toMatchObject({ name: 'OpError' })
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
