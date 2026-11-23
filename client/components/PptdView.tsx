/**
 * PptdView：把一页 PPTD（页 AST）直接渲染成 DOM。
 *
 * 当前渲染契约：
 *   - 打开即渲染；
 *   - 元素与 ElementOverlay 同源同坐标系，选择框对齐；
 *   - 使用 pt 逻辑坐标 + transform: translate() scale()。
 *
 * 缩放模型（仿 PPTist 的 viewportSize）：
 *   逻辑坐标固定为 deck.size（如 960×540，单位 pt）。容器尺寸由 ResizeObserver 测得，
 *   client/render/canvas-fit.ts 的 fitCanvas 给出 contain 缩放比与居中偏移，二者都对齐到
 *   设备像素。内层 div 用逻辑尺寸铺开元素，再整体变换；无论侧栏多宽，版面比例恒定、清晰。
 *
 * 坐标约定：PPTD bounds = [x, y, w, h]，单位 pt（1 pt = 1 px 逻辑，spec §1.2）。
 * rotation 单位为度，绕元素中心旋转。
 */
import * as React from 'react'
import { backgroundToCss, borderToCss, fillToCss, resolveColor, resolveTextStyle, type ThemeLike } from '../render/resolve'
import { pathFromPoints } from '../render/points'
import { fitCanvas, type CanvasFit } from '../render/canvas-fit'
import { sanitizeHtml } from '../render/sanitize'
import { TableView } from './TableView'
import { ChartView } from './ChartView'

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
  /** svg 页（整页编译轨）。pageType==='svg' 时 elements 恒为空数组。 */
  pageType?: string
  /** svg 页的源引用（media/svg/*.svg），预览直接 <img> 渲染。 */
  svgSource?: { ref: string; viewBox?: [number, number] }
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
  const [fit, setFit] = React.useState<CanvasFit>({ scale: 1, x: 0, y: 0 })
  const scale = fit.scale

  // 跟随容器尺寸重算缩放：contain 适配后对齐到设备像素，画布完整可见且居中。
  // 逻辑坐标系恒定 = size，缩放只发生在最外层。
  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const next = fitCanvas(el.clientWidth, el.clientHeight, size[0], size[1], window.devicePixelRatio || 1)
      if (next) setFit(next)
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
  const isSvgPage = page?.pageType === 'svg'
  const svgRef = isSvgPage && page?.svgSource?.ref ? page.svgSource.ref : null
  const svgUrl = svgRef && resolveMedia ? resolveMedia(svgRef) : svgRef

  return (
    <div ref={wrapRef} className={`pptd-viewport${className ? ` ${className}` : ''}`}>
      <div
        className="pptd-canvas"
        style={{
          width: w,
          height: h,
          transform: `translate(${fit.x}px, ${fit.y}px) scale(${scale})`,
          background: bgCss ?? '#FFFFFF',
        }}
      >
        {isSvgPage ? (
          svgUrl ? (
            <SvgPageView src={svgUrl} width={w} height={h} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, ...placeholderBox() }}>
              <span style={placeholderLabel()}>SVG 页：缺少 svgSource.ref</span>
            </div>
          )
        ) : (
          elements.map((el, i) => (
            <ElementView key={el.elementId ?? i} el={el} theme={theme} resolveMedia={resolveMedia} />
          ))
        )}
        {overlay}
      </div>
    </div>
  )
}

/** SVG 页预览：显式用 image/svg+xml 构造 Blob，避免宿主 MIME 推断影响 <img> 解码。 */
function SvgPageView({ src, width, height }: { src: string; width: number; height: number }) {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    let url: string | null = null
    setObjectUrl(null)
    setFailed(false)
    void fetch(src, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.arrayBuffer()
      })
      .then((bytes) => {
        if (controller.signal.aborted) return
        url = URL.createObjectURL(new Blob([bytes], { type: 'image/svg+xml' }))
        setObjectUrl(url)
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [src])

  if (failed) {
    return (
      <div style={{ position: 'absolute', inset: 0, ...placeholderBox() }}>
        <span style={placeholderLabel()}>SVG 页加载失败</span>
      </div>
    )
  }
  return objectUrl ? (
    <img
      src={objectUrl}
      alt=""
      draggable={false}
      style={{ position: 'absolute', inset: 0, width, height, display: 'block' }}
      className="pptd-svg-page"
      onError={() => setFailed(true)}
    />
  ) : null
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
    case 'table':
      return (
        <div style={style} data-element-type={type}>
          <TableView content={el} theme={theme} />
        </div>
      )
    case 'chart':
      return (
        <div style={style} data-element-type={type}>
          <ChartView content={el} theme={theme} />
        </div>
      )
    default:
      // icon / smartArt / placeholder 等：灰底占位（与逆向引擎 placeholder 口径一致）。
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

/** 预设形状里能用 CSS 多边形精确表达的几种；其余预设按矩形显示。 */
const PRESET_POLYGONS: Record<string, string> = {
  triangle: 'polygon(50% 0, 100% 100%, 0 100%)',
  rtTriangle: 'polygon(0 0, 100% 100%, 0 100%)',
  diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
  parallelogram: 'polygon(25% 0, 100% 0, 75% 100%, 0 100%)',
  pentagon: 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)',
  hexagon: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
}

/** custom 形状的 viewBox + path（spec §6.2）；不完整时返回 null。 */
function customGeometryOf(el: PptdElement): { w: number; h: number; d: string } | null {
  const vb = el.viewBox
  const d = el.path
  if (!Array.isArray(vb) || vb.length < 2 || typeof d !== 'string' || d.trim() === '') return null
  const w = Number(vb[0])
  const h = Number(vb[1])
  if (!(w > 0) || !(h > 0)) return null
  return { w, h, d }
}

/** 形状元素：rect / ellipse / custom 路径 / 常见多边形预设 + 可选内嵌文本。 */
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
  const clipId = `pptd-clip-${React.useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  const fillCss = fillToCss(el.fill, theme, resolveMedia)
  const borderCss = borderToCss(el.border, theme)
  const custom = shapeName === 'custom' ? customGeometryOf(el) : null
  const polygon = PRESET_POLYGONS[shapeName]
  const css: React.CSSProperties = {
    background: fillCss,
    // 裁切后的形状边框无法沿轮廓描出，只给矩形与椭圆画 CSS 边框。
    border: custom || polygon ? undefined : borderCss,
    borderRadius: shapeName === 'ellipse' ? '50%' : undefined,
    clipPath: custom ? `url(#${clipId})` : polygon,
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
      {custom ? (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={custom.d} clipRule="evenodd" transform={`scale(${1 / custom.w} ${1 / custom.h})`} />
          </clipPath>
        </svg>
      ) : null}
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
  const gradientId = `pptd-stroke-${React.useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  const gradient = strokeGradientOf(el.border, viewBox, theme)

  return (
    <svg
      className="pptd-line"
      style={style}
      viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`}
      preserveAspectRatio="none"
      fill="none"
    >
      {gradient ? (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>
            {gradient.stops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <path
        d={d}
        stroke={gradient ? `url(#${gradientId})` : borderMatch ? borderMatch[3] : '#1A1A1A'}
        strokeWidth={borderMatch ? Number(borderMatch[1]) : 1}
      />
    </svg>
  )
}

/**
 * border.gradient → SVG 线性渐变参数。用 viewBox 坐标（userSpaceOnUse）：
 * 竖直或水平的线包围盒宽或高为 0，objectBoundingBox 下渐变不绘制。
 * angle 0 = 左→右，顺时针。
 */
function strokeGradientOf(
  border: unknown,
  viewBox: number[],
  theme?: ThemeLike | null,
): { x1: number; y1: number; x2: number; y2: number; stops: { offset: number; color: string }[] } | null {
  if (!border || typeof border !== 'object') return null
  const g = (border as Record<string, unknown>).gradient as Record<string, unknown> | undefined
  if (!g || !Array.isArray(g.stops)) return null
  const stops = g.stops
    .map((s) => {
      const st = s as Record<string, unknown>
      const color = resolveColor(st.color, theme)
      return color && typeof st.position === 'number' ? { offset: st.position, color } : null
    })
    .filter((s): s is { offset: number; color: string } => s !== null)
  if (stops.length < 2) return null
  const rad = ((typeof g.angle === 'number' ? g.angle : 0) * Math.PI) / 180
  const [w, h] = viewBox
  const dx = (Math.cos(rad) * w) / 2
  const dy = (Math.sin(rad) * h) / 2
  return { x1: w / 2 - dx, y1: h / 2 - dy, x2: w / 2 + dx, y2: h / 2 + dy, stops }
}

/**
 * 图片元素：media src 经 resolveMedia 映射成可访问 URL。
 * 加载失败（媒体文件被删、映射失效）落成占位框——否则画布上留一块纯空白，看着像丢内容。
 */
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
  // 记「哪一个 src 失败」而不是布尔值：换图后 src 一变，失败标记自动失效。
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const failed = Boolean(src) && failedSrc === src
  if (!src || failed) {
    return (
      <div style={{ ...style, ...placeholderBox() }}>
        <span style={placeholderLabel()}>{failed ? '图片加载失败' : '图片'}</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{ ...style, objectFit: 'cover', display: 'block' }}
      className="pptd-image"
      onError={() => setFailedSrc(src ?? null)}
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
    // 与 PPTX 文本框内边距一致：未写 padding 取 Office 默认 [3.6, 7.2, 3.6, 7.2]。
    padding: (Array.isArray(st.padding) && st.padding.length === 4 ? (st.padding as number[]) : [3.6, 7.2, 3.6, 7.2])
      .map((v) => `${v}px`)
      .join(' '),
  }
  // 垂直对齐（flex）：显式 align[1] 优先，否则用 defaultV（文本框默认顶、形状内文本默认中）。
  const v = align[1]
  if (v === 'middle') css.justifyContent = 'center'
  else if (v === 'bottom') css.justifyContent = 'flex-end'
  else css.justifyContent = defaultV
  // 水平对齐由富文本 <p style="text-align"> 决定；元素级 align[0] 作为兜底 textAlign。
  const h = align[0]
  if (h === 'center' || h === 'right' || h === 'left' || h === 'justify') css.textAlign = h as React.CSSProperties['textAlign']
  else if (h === 'distributed') {
    css.textAlign = 'justify'
    css.textAlignLast = 'justify'
  }
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
