/**
 * 图标：本插件的品牌标（与包根 `icon.svg` 同源的两片叠放幻灯片）+ 工作台用的几支控件图。
 *
 * **绝不 require 宿主的 `@deepseek-ai/dsh-client-ui-primitives`**：rc2 官方在
 * `cordis-plugin-development/references/practices.md:35` 明文禁止客户端 bundle 把
 * Harness Client 包当模块加载（改名就静默少图标、无类型检查兜底），替代做法就是
 * **复制几何**进本包。右侧栏在标签页里读不到主题上下文，所以品牌标自带渐变——
 * 这是「界面图标颜色只走 `currentColor` / `--dsw-alias-*`」那条纪律的例外。
 *
 * 渐变 id 带插件前缀，免得与别的插件或宿主的图标在同一页撞 `url(#…)`。
 *
 * **同一处几何只有一份**：改 `icon.svg` 就回来改 `PptMark`，别处不另画。
 */
import * as React from 'react'

export interface GlyphProps {
  size?: number
  className?: string
  /** 调用方偶尔要微调排版（如 ProjectList 的 verticalAlign），透传到 <svg>。 */
  style?: React.CSSProperties
}

/**
 * 品牌标：两片叠放的幻灯片（蓝主片压橙副片）+ 两条白色横线——与 `icon.svg` 逐字相同的
 * 矩形与渐变。磁贴那份是 36×36 的 `<img>`（宿主读成 data URI，走不了 `currentColor`），
 * 所以界面里的三处落点（右侧栏标签页、引导列表、空面板品牌行）都由这里内联渲染；
 * 同 `icon.svg` 一样在 36 画板上放大 1.3 倍取景，贴合侧边栏的视觉重量。
 */
export function PptMark({ size = 16, className, style }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true" className={className} style={style}>
      <defs>
        <linearGradient id="ppt-mark-back" x1="13" y1="8" x2="28" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9E66" />
          <stop offset="1" stopColor="#FA541C" />
        </linearGradient>
        <linearGradient id="ppt-mark-front" x1="7" y1="13" x2="25" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#69B9FF" />
          <stop offset="1" stopColor="#324DE2" />
        </linearGradient>
      </defs>
      <g transform="translate(18 18) scale(1.3) translate(-18 -18)">
        <rect x="13.5" y="8" width="14" height="11" rx="2.5" fill="url(#ppt-mark-back)" />
        <rect x="8" y="13.5" width="17" height="13" rx="2.5" fill="url(#ppt-mark-front)" />
        <rect x="11.5" y="17" width="10" height="2" rx="1" fill="#FFFFFF" />
        <rect x="11.5" y="21" width="6.5" height="2" rx="1" fill="#FFFFFF" fillOpacity="0.85" />
      </g>
    </svg>
  )
}

function GlyphSvg({ size = 14, className, style, children, viewBox = '0 0 16 16' }: GlyphProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="currentColor" aria-hidden="true" className={className} style={style}>
      {children}
    </svg>
  )
}

/** 撤销（ curved arrow, ⌘Z / Ctrl+Z 的图形化）。 */
export function UndoGlyph(props: GlyphProps) {
  return (
    <GlyphSvg {...props}>
      <path d="M3.34 6.47 5.47 4.34a.5.5 0 0 0-.7-.7L2.58 5.8a.6.6 0 0 0 0 .85l2.19 2.18a.5.5 0 0 0 .7-.7L3.35 6h5.15a3.25 3.25 0 0 1 0 6.5H6.4a.5.5 0 0 0 0 1h2.1a4.25 4.25 0 0 0 0-8.5H3.34Z" />
    </GlyphSvg>
  )
}

/** 重做：撤销图的镜像。 */
export function RedoGlyph(props: GlyphProps) {
  return (
    <GlyphSvg {...props}>
      <path d="M12.66 6.47 10.53 4.34a.5.5 0 0 1 .7-.7l2.19 2.16a.6.6 0 0 1 0 .85l-2.19 2.18a.5.5 0 0 1-.7-.7L12.65 6H7.5a3.25 3.25 0 0 0 0 6.5h2.1a.5.5 0 0 1 0 1H7.5a4.25 4.25 0 0 1 0-8.5h5.16Z" />
    </GlyphSvg>
  )
}

/** 「导出 .pptx」：向下箭头进出纸槽。 */
export function ExportGlyph(props: GlyphProps) {
  return (
    <GlyphSvg {...props}>
      <path d="M8 1.5a.5.5 0 0 1 .5.5v6.8l2.15-2.15a.5.5 0 0 1 .7.7l-3 3a.5.5 0 0 1-.7 0l-3-3a.5.5 0 0 1 .7-.7L7.5 8.8V2a.5.5 0 0 1 .5-.5ZM2.5 10a.5.5 0 0 1 .5.5V13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-2.5a.5.5 0 0 1 1 0V13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13v-2.5a.5.5 0 0 1 .5-.5Z" />
    </GlyphSvg>
  )
}

/** 加页/加分页：带「+」的卡片。 */
export function NewPageGlyph(props: GlyphProps) {
  return (
    <GlyphSvg {...props}>
      <path d="M3.5 1A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 12.5 1h-9ZM3 2.5A.5.5 0 0 1 3.5 2h9a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-11Zm5 2a.5.5 0 0 1 .5.5v2h2a.5.5 0 0 1 0 1h-2v2a.5.5 0 0 1-1 0V8h-2a.5.5 0 0 1 0-1h2V5a.5.5 0 0 1 .5-.5Z" />
    </GlyphSvg>
  )
}

/** 「导入 pptx」：托盘上方一个向下箭头。 */
export function ImportGlyph(props: GlyphProps) {
  return (
    <GlyphSvg {...props}>
      <path d="M8 1.5a.5.5 0 0 1 .5.5v4.8l1.4-1.4a.5.5 0 0 1 .7.7L8 8.7 5.4 6.1a.5.5 0 0 1 .7-.7l1.4 1.4V2a.5.5 0 0 1 .5-.5Z" />
      <path d="M2.5 8.5h3V10h-3v3.5A.5.5 0 0 0 3 14h10a.5.5 0 0 0 .5-.5V10h-3V8.5h3A1.5 1.5 0 0 1 15 10v3.5A1.5 1.5 0 0 1 13.5 15h-11A1.5 1.5 0 0 1 1 13.5V10a1.5 1.5 0 0 1 1.5-1.5Z" />
    </GlyphSvg>
  )
}

/** 「版本历史」：两片叠放的版本卡片（后片虚一档，前片实）。 */
export function HistoryGlyph(props: GlyphProps) {
  return (
    <GlyphSvg {...props}>
      <path d="M4.5 2A1.5 1.5 0 0 0 3 3.5v8A1.5 1.5 0 0 0 4.5 13H5v-1h-.5a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5V5h1V3.5A1.5 1.5 0 0 0 12 2H4.5Z" opacity="0.45" />
      <path d="M6.5 4A1.5 1.5 0 0 0 5 5.5v7A1.5 1.5 0 0 0 6.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 13.5 4h-7ZM6 5.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7Z" />
      <path d="M7.6 8.6a.5.5 0 0 1 .7-.7l.7.7V6.5a.5.5 0 0 1 1 0v1.9l.7-.7a.5.5 0 0 1 .7.7l-1.5 1.5a.5.5 0 0 1-.7 0l-1.6-1.3Z" />
    </GlyphSvg>
  )
}

/** 「显示文件位置」：文件夹（与 DSH 文件菜单的定位项同款语义图标）。 */
export function FolderGlyph(props: GlyphProps) {
  return (
    <GlyphSvg {...props}>
      <path d="M1.75 3.5A1.75 1.75 0 0 1 3.5 1.75h2.2c.55 0 1.06.26 1.4.7l.9 1.2h4.25A1.75 1.75 0 0 1 14 5.42v5.83a1.75 1.75 0 0 1-1.75 1.75H3.5A1.75 1.75 0 0 1 1.75 11.25V3.5Zm1.75-.25a.25.25 0 0 0-.25.25v7.75c0 .14.11.25.25.25h8.75a.25.25 0 0 0 .25-.25V5.42a.25.25 0 0 0-.25-.25H7.94a.75.75 0 0 1-.6-.3l-.99-1.32a.25.25 0 0 0-.2-.1H3.5Z" />
    </GlyphSvg>
  )
}
