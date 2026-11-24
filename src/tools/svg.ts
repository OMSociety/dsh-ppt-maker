/**
 * ppt_svg — SVG 页面轨的源管理工具。
 *
 * 动作：
 *  - put      把一段 SVG 写进 media/svg/<name>.svg；带 page 时同时经
 *             update_svg_source op 挂到该页（页必须已是 pageType:svg）
 *  - compile  立即编译一次（早检：错误在此暴露，同时暖编译缓存）
 *
 * SVG 是整页设计源：page 挂上 svgSource 后由引擎整页编译为 DrawingML
 * 并入成品 deck（见 docs/pptd-spec.md §4 与 src/core/svg/compiler.ts）。
 */
import { putSvgSource, loadProject, ProjectError } from '../core/project/store.js'
import { compileSvgPage, themeHashOf } from '../core/svg/compiler.js'
import { SVG_MEDIA_DIR } from '../core/pptd/schema-v2.js'
import { requireBaseRevision, renderSummary, resultSchema, resolveSessionCwd, sessionIdOf, toolError, type PluginToolCtx } from './shared.js'

const SVG_NAME_RE = /^[a-z0-9][a-z0-9_-]*\.svg$/i

export function registerSvgTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_svg',
    description:
      '管理 PPTD 工程的 SVG 页源（media/svg/*.svg）。' +
      'action=put 须带 baseRevision；写入 SVG 源（svg 为完整 SVG 文本，name 形如 cover.svg），带 page 参数时挂到该页（页须为 pageType:svg）；' +
      'action=compile 立即编译指定源做早检并暖缓存。' +
      '返回 { ok, ref?, page?, revision?, compiled?, fonts? }。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['dir', 'action'],
      properties: {
        dir: { type: 'string', minLength: 1 },
        action: { type: 'string', enum: ['put', 'compile'] },
        name: { type: 'string', description: 'put 用：文件名，小写字母/数字/连字符/下划线，.svg 结尾' },
        svg: { type: 'string', description: 'put 用：完整 SVG 文本' },
        ref: { type: 'string', description: `compile 用：工程相对路径（${SVG_MEDIA_DIR}/ 下 .svg）` },
        page: { type: 'string', description: 'put 可选：同时挂到该页（pages/NN.page）' },
        baseRevision: { type: 'integer', minimum: 0, description: 'put 时必填的乐观锁基线修订号' }
      }
    },
    output: {
      schema: resultSchema({
        ref: { type: 'string' },
        page: { type: 'string' },
        compiled: { type: 'boolean' },
        fonts: { type: 'array', items: { type: 'string' } },
        revision: { type: 'integer' }
      }),
      render: renderSummary((r) => {
        if (r.compiled === true) return `编译通过：${String(r.ref)}${(r.fonts as string[] | undefined)?.length ? `，字体 ${(r.fonts as string[]).join(' / ')}` : ''}`
        return `SVG 源已写入 ${String(r.ref)}${typeof r.page === 'string' ? ` 并挂到 ${r.page}` : ''}`
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions)
        const dir = args.dir as string
        const action = args.action as string

        if (action === 'compile') {
          const loaded = await loadProject(cwd, dir)
          const ref = args.ref as string | undefined
          if (typeof ref !== 'string' || ref === '') {
            throw new ProjectError('SvgSourceInvalid', 'compile 需要 ref（media/svg/ 下 .svg）', { status: 400 })
          }
          const compiled = await compileSvgPage({
            projectDir: loaded.dir,
            svgRef: ref,
            themeHash: themeHashOf(loaded.deck.theme)
          })
          return { ok: true, ref, compiled: true, fonts: compiled.fonts }
        }

        // put
        const name = args.name as string | undefined
        const svg = args.svg as string | undefined
        if (typeof name !== 'string' || !SVG_NAME_RE.test(name)) {
          throw new ProjectError('SvgSourceInvalid', `name 需形如 cover.svg（小写字母/数字/-/_）：${String(name)}`, { status: 400 })
        }
        if (typeof svg !== 'string' || !svg.includes('<svg')) {
          throw new ProjectError('SvgSourceInvalid', 'svg 必须是完整 SVG 文本（含 <svg> 根）', { status: 400 })
        }
        const ref = `${SVG_MEDIA_DIR}/${name}`
        const page = args.page as string | undefined
        const result = await putSvgSource(cwd, dir, name, svg, page, requireBaseRevision(args, '写入 SVG'), sessionIdOf(exec))
        return { ok: true, ref, page, revision: result.revision }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
