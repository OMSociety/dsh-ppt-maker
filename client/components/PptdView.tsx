/**
 * PptdView：把一页 PPTD（页 AST）直接渲染成 DOM——这就是「去光栅化」的核心。
 *
 * 取代旧的「GET /thumb 光栅化 PNG 底图」：
 *   - 打开即渲染，不等 libreoffice 冷启动；
 *   - 元素与 ElementOverlay 同源同坐标系，选择框永远对齐；
 *   - 用 pt 逻辑坐标 + transform: scale()，无 PNG 的 px:pt 系数问题。
 *
 * 缩放模型（仿 PPTist 的 viewportSize）：
 *   逻辑坐标固定为 deck.size（如 960×540，单位 pt）。容器实际宽度由 ResizeObserver
 *   测得，scale = 容器宽 / 逻辑宽。内层 div 用逻辑尺寸铺开元素，再整体 scale。
 *   这样无论侧栏多宽，版面比例恒定、清晰（矢量，非位图放大）。
 *
 * 坐标约定：PPTD bounds = [x, y, w, h]，单位 pt（1 pt = 1 px 逻辑，spec §1.2）。
 * rotation 单位为度，绕元素中心旋转。
 */
import * as React from 'react'
import { backgroundToCss, borderToCss, fillToCss, resolveTextStyle, type ThemeLike } from '../render/resolve'
import { pathFromPoints } from '../render/points'
import { sanitizeHtml } from '../render/sanitize'

export interface PptdElement {
  elementId?: string
  elementType?: string
  bounds?: [number, number, number, number]
  rotation?: number
  opacity?: number
  flip?: [boolean, boolean]
  content?: Record<string, unknown> & { text?: string }
  shapeName?: string
  fill?: unknown
  border?: unknown
  src?: string
  [key: string]: unknown
}

export interface PptdPage {
  background?: unknown
  elements?: PptdElement[]
  [key: string]: unknown
}

interface PptdViewProps {
  page: PptdPage | null
  /** deck.size，逻辑画布 [宽, 高]（pt）。 */
  size: [number, number]
  theme?: ThemeLike | null
  /** 媒体 src 解析：把 PPTD 的 media/xxx 映射成可访问 URL（宿主 /media 路由）。 */
  resolveMedia?: (src: string) => string
  /** 元素层之上的覆盖层（选择框等），坐标系与逻辑坐标一致（未缩放）。 */
  overlay?: React.ReactNode
  /** 额外类名（缩放行为由调用方定制时用）。 */
  className?: string
}

export function PptdView({ page, size, theme, resolveMedia, overlay, className }: PptdViewProps) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = React.useState(1)

  // 跟随容器尺寸重算 scale：取宽、高两个方向的较小比例（contain），画布完整可见且居中。
  // 逻辑坐标系恒定 = size，缩放只发生在最外层。
  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (cw > 0 && size[0] > 0) {
        const sx = cw / size[0]
        const sy = ch > 0 && size[1] > 0 ? ch / size[1] : sx
        setScale(Math.min(sx, sy))
      }
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [size[0], size[1]])

  const [w, h] = size
  const bgCss = backgroundToCss(page?.background, theme, resolveMedia)
  const elements = Array.isArray(page?.elements) ? (page!.elements as PptdElement[]) : []

  return (
    <div ref={wrapRef} className={`pptd-viewport${className ? ` ${className}` : ''}`}>
      <div
        className="pptd-canvas"
        style={{
          width: w,
          height: h,
          // 注意：不能设 transformOrigin '0 0'。flex 居中把布局盒中心钉在容器中心，
          // 默认 origin（50% 50%）绕布局盒中心缩放，缩放后视觉盒仍以容器为中心、
          // 正好填满 min(容器宽/逻辑宽, 容器高/逻辑高) 的可视区；改成 0 0 会把视觉盒
          // 左上角钉在（必然为负的）布局盒左上角，整块落到视口外。
          transform: `scale(${scale})`,
          background: bgCss ?? '#FFFFFF',
        }}
      >
        {elements.map((el, i) => (
          <ElementView key={el.elementId ?? i} el={el} theme={theme} resolveMedia={resolveMedia} />
        ))}
        {overlay}
      </div>
    </div>
  )
}

/** 单个元素：绝对定位 + 旋转 + 不透明度，再按 elementType 分发渲染内容。 */
function ElementView({
  el,
  theme,
  resolveMedia,
}: {
  el: PptdElement
  theme?: ThemeLike | null
  resolveMedia?: (src: string) => string
}) {
  const b = el.bounds
  if (!b || b.length !== 4) return null
  const [x, y, w, h] = b

  const transforms: string[] = []
  if (el.rotation) transforms.push(`rotate(${el.rotation}deg)`)
  if (el.flip?.[0]) transforms.push('scaleX(-1)')
  if (el.flip?.[1]) transforms.push('scaleY(-1)')

  const style: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: w,
    height: h,
    transform: transforms.length ? transforms.join(' ') : undefined,
    opacity: typeof el.opacity === 'number' ? el.opacity : undefined,
  }

  const type = el.elementType ?? 'text'
  switch (type) {
    case 'text':
      return <TextView el={el} style={style} theme={theme} />
    case 'shape':
      return <ShapeView el={el} style={style} theme={theme} resolveMedia={resolveMedia} />
    case 'line':
      return <LineView el={el} style={style} theme={theme} />
    case 'image':
      return <ImageView el={el} style={style} resolveMedia={resolveMedia} />
    default:
      // table / chart / icon / smartArt / placeholder 等：灰底占位（与逆向引擎 placeholder 口径一致）。
      return (
        <div style={{ ...style, ...placeholderBox() }} data-element-type={type}>
          <span style={placeholderLabel()}>{placeholderText(type)}</span>
        </div>
      )
  }
}

/** 文本元素：富文本 HTML（sanitize 后 innerHTML）。 */
function TextView({
  el,
  style,
  theme,
}: {
  el: PptdElement
  style: React.CSSProperties
  theme?: ThemeLike | null
}) {
  const content = (el.content ?? {}) as Record<string, unknown>
  const st = resolveTextStyle(content, theme)
  const html = typeof content.text === 'string' ? sanitizeHtml(content.text) : ''
  const align = Array.isArray(content.align) ? (content.align as string[]) : []
  const wrap = typeof content.wrap === 'boolean' ? content.wrap : undefined
  const css = textStyleToCss(st, align, wrap)
  return (
    <div style={{ ...style, ...css }} className="pptd-text">
      {/* sanitizeHtml 已做白名单清洗，这里 innerHTML 安全。 */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

/** 形状元素：rect / ellipse / 其它（path 太深的先按矩形兜底）+ 可选内嵌文本。 */
function ShapeView({
  el,
  style,
  theme,
  resolveMedia,
}: {
  el: PptdElement
  style: React.CSSProperties
  theme?: ThemeLike | null
  resolveMedia?: (src: string) => string
}) {
  const shapeName = (el.shapeName ?? 'rect') as string
  const fillCss = fillToCss(el.fill, theme, resolveMedia)
  const borderCss = borderToCss(el.border, theme)
  const css: React.CSSProperties = {
    background: fillCss,
    border: borderCss,
    borderRadius: shapeName === 'ellipse' ? '50%' : undefined,
  }
  // 形状内嵌文本（content.text 存在时）：与 TextView 一样走 resolveTextStyle + textStyleToCss，
  // 元素级 fontSize/color/align/wrap 不能丢（逆向与 generate 双方都大量产出「形状+文字」）。
  const content = (el.content ?? {}) as Record<string, unknown>
  const hasText = typeof content.text === 'string' && content.text.length > 0
  const align = Array.isArray(content.align) ? (content.align as string[]) : []
  const wrap = typeof content.wrap === 'boolean' ? content.wrap : undefined
  const textCss = hasText
    ? { ...shapeTextWrap(), ...textStyleToCss(resolveTextStyle(content, theme), align, wrap, 'center') }
    : undefined
  return (
    <div style={{ ...style, ...css }} className="pptd-shape" data-shape={shapeName}>
      {hasText ? (
        <div style={textCss} className="pptd-text">
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(content.text)) }} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * 线条元素：SVG 画真实路径（PPTD 契约 viewBox + points 贝塞尔 + border 色宽）。
 * points: "x1,y1 x2,y2 ..."，viewBox 独立拉伸到 bounds；flip 已在外层 transform 处理。
 * arrow 端点箭头暂不支持（P2），如实渲染主体线即可。
 */
function LineView({
  el,
  style,
  theme,
}: {
  el: PptdElement
  style: React.CSSProperties
  theme?: ThemeLike | null
}) {
  const viewBox = Array.isArray(el.viewBox) && el.viewBox.length === 2 ? (el.viewBox as number[]) : null
  const pointsRaw = typeof el.points === 'string' ? el.points : ''
  const pts = pointsRaw
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return Number.isFinite(x) && Number.isFinite(y) ? ([x, y] as [number, number]) : null
    })
    .filter((p): p is [number, number] => p !== null)
  if (!viewBox || pts.length < 2) {
    // 契约不符（缺 viewBox/points）：退化为包围盒顶边的一条线，至少可见。
    return <div style={{ ...style, borderTop: `2px solid #1A1A1A`, height: 0 }} className="pptd-line" />
  }

  const curve = typeof el.curve === 'string' ? el.curve : 'round'
  const d = pathFromPoints(pts, curve)
  const borderCss = borderToCss(el.border, theme) ?? '1px solid #1A1A1A'
  // borderToCss 产物 "Wpx style color" → stroke 属性拆开用
  const borderMatch = borderCss.match(/^([\d.]+)px\s+(\S+)\s+(.+)$/)

  return (
    <svg
      className="pptd-line"
      style={style}
      viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`}
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d={d}
        stroke={borderMatch ? borderMatch[3] : '#1A1A1A'}
        strokeWidth={borderMatch ? Number(borderMatch[1]) : 1}
      />
    </svg>
  )
}

/** 图片元素：media src 经 resolveMedia 映射成可访问 URL。 */
function ImageView({
  el,
  style,
  resolveMedia,
}: {
  el: PptdElement
  style: React.CSSProperties
  resolveMedia?: (src: string) => string
}) {
  const raw = (el.src ?? (el.content?.src as string)) as string | undefined
  const src = raw && resolveMedia ? resolveMedia(raw) : raw
  if (!src) {
    return <div style={{ ...style, ...placeholderBox() }}>图片</div>
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{ ...style, objectFit: 'cover', display: 'block' }}
      className="pptd-image"
    />
  )
}

/* ---------------- 样式映射辅助 ---------------- */

/** resolveTextStyle 的产物 → React CSS。align=[水平, 垂直]；wrap=false 时不折行。 */
function textStyleToCss(
  st: Record<string, unknown>,
  align: string[],
  wrap?: boolean,
  defaultV: 'flex-start' | 'center' = 'flex-start',
): React.CSSProperties {
  const css: React.CSSProperties = {
    fontSize: typeof st.fontSize === 'number' ? st.fontSize : undefined,
    color: typeof st.color === 'string' ? st.color : undefined,
    fontFamily: typeof st.fontFamily === 'string' ? st.fontFamily : undefined,
    lineHeight: typeof st.lineHeight === 'number' ? st.lineHeight : undefined,
    fontWeight: st.bold ? 700 : undefined,
    fontStyle: st.italic ? 'italic' : undefined,
    letterSpacing: typeof st.letterSpacing === 'number' ? st.letterSpacing : undefined,
    background: typeof st.backgroundColor === 'string' ? st.backgroundColor : undefined,
    // 宽高由外层 style（bounds）给定，这里绝不能 100%——会把元素撑成整个画布。
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    whiteSpace: wrap === false ? 'nowrap' : 'pre-wrap',
    wordBreak: 'break-word',
  }
  // 垂直对齐（flex）：显式 align[1] 优先，否则用 defaultV（文本框默认顶、形状内文本默认中）。
  const v = align[1]
  if (v === 'middle') css.justifyContent = 'center'
  else if (v === 'bottom') css.justifyContent = 'flex-end'
  else css.justifyContent = defaultV
  // 水平对齐由富文本 <p style="text-align"> 决定；元素级 align[0] 作为兜底 textAlign。
  const h = align[0]
  if (h === 'center' || h === 'right' || h === 'left') css.textAlign = h as React.CSSProperties['textAlign']
  return css
}

function placeholderBox(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 8px,#f3f4f6 8px,#f3f4f6 16px)',
    border: '1px dashed #9ca3af',
    color: '#6b7280',
    fontSize: 12,
    overflow: 'hidden',
  }
}
function placeholderLabel(): React.CSSProperties {
  return { padding: '2px 6px', background: 'rgba(255,255,255,.7)', borderRadius: 3 }
}
function placeholderText(type: string): string {
  const map: Record<string, string> = {
    table: '表格',
    chart: '图表',
    icon: '图标',
    smartArt: 'SmartArt 图示',
    group: '组合',
    media: '媒体',
    placeholder: '占位内容',
  }
  return map[type] ?? `${type}（暂不支持渲染）`
}
function shapeTextWrap(): React.CSSProperties {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: 4,
    boxSizing: 'border-box',
  }
}
