/**
 * ppt_themes — list bundled design systems (`{ ok, themes: [...] }`).
 */
import { listThemes, type ThemeInfo } from '../core/theme.js'
import { PACKAGE_ROOT } from '../root.js'
import { renderSummary, resultSchema, toolError, type PluginToolCtx } from './shared.js'

export function registerThemesTool(ctx: PluginToolCtx): (() => void) | undefined {
  const off = ctx.tools.register({
    name: 'ppt_themes',
    description:
      '列出插件内置的设计系统主题（skills/ppt-maker/reference/design_system/<族>/<主题>/design.md）。' +
      '可选 designSystem 参数按族过滤；返回 { ok, themes: [{ designSystem, theme, name, path }] }。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        designSystem: { type: 'string', description: '只列出该设计系统族下的主题' }
      }
    },
    output: {
      schema: resultSchema({
        themes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
            properties: {
              designSystem: { type: 'string' },
              theme: { type: 'string' },
              name: { type: 'string' },
              path: { type: 'string' }
            }
          }
        }
      }),
      render: renderSummary((r) => `共 ${(r.themes as ThemeInfo[] | undefined)?.length ?? 0} 个主题`)
    },
    execute: async (args) => {
      try {
        const themes = await listThemes(PACKAGE_ROOT, args.designSystem as string | undefined)
        return { ok: true, themes }
      } catch (err) {
        return toolError(err)
      }
    }
  })
  return typeof off === 'function' ? (off as () => void) : undefined
}
