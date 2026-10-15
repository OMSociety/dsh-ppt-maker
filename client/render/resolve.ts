/**
 * PPTD → CSS 解析纯函数（无副作用，可单测）。
 *
 * 三件事：
 *   1. `$变量` 解析：PPTD 里 `color: $paper` / `style: $body` 是对 deck.theme 的引用，
 *      渲染前得查表换成真实值（$xxx → theme.colors[xxx]；$style → theme.textStyles[xxx]）。
 *   2. fill / color / 文本样式 → CSS 属性值。
 *   3. 只依赖 deck.theme，不 import 宿主、不碰 DOM。
 *
 * 主题契约（schema.ts §Theme）：
 *   theme.colors:     Record<string, string>            —— 调色板，键即 $引用名
 *   theme.textStyles: Record<string, Record<string,*>>  —— 文本样式，键即 $style 名
 *
 * 颜色值形态：'#RRGGBB' | '#RGB' | 'rgb(...)' | '$name'（引用 theme.colors）。
 * fill 形态（engine/types.ts）：
 *   { type:'solid', color }
 *   { type:'gradient', gradientType:'linear'|'radial', stops:[{position,color}], angle? }
 *   { type:'image', src }
 */

export interface ThemeLike {
  colors?: Record<string, string>
  textStyles?: Record<string, Record<string, unknown>>
}

/** 解析一个可能是 $引用 的颜色：$paper → theme.colors.paper；已是字面量则原样返回。 */
export function resolveColor(value: unknown, theme?: ThemeLike | null): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  if (value.startsWith('$')) {
    const key = value.slice(1)
    const hit = theme?.colors?.[key]
    return typeof hit === 'string' ? hit : undefined
  }
  return value
}

/** <input type=color> 只认 #rrggbb；值不是 hex（rgb()/未知 $ref/空）时用它兜底显示。 */
export const COLOR_PICKER_FALLBACK = '#1f2937'

/** '#RGB' / '#RRGGBB'（大小写不敏感）归一成小写 #rrggbb；其余形态返回 null。 */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim())
  if (!m) return null
  let h = m[1].toLowerCase()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return `#${h}`
}

/**
 * Inspector 颜色字段的视图模型（纯函数，可单测）：
 *   - ref：'$paper' 形态的主题引用名；字面量/空为 null。
 *   - swatch：可显示的色样（$ref 经 theme 解析后归一；rgb() 等非 hex 形态为 null）。
 *   - picker：<input type=color> 的 value（仅 #rrggbb，否则回退 COLOR_PICKER_FALLBACK）。
 */
export interface ColorFieldModel {
  ref: string | null
  swatch: string | null
  picker: string
}

export function colorFieldModel(value: unknown, theme?: ThemeLike | null): ColorFieldModel {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return { ref: null, swatch: null, picker: COLOR_PICKER_FALLBACK }
  if (raw.startsWith('$')) {
    const resolved = theme?.colors?.[raw.slice(1)]
    const hex = normalizeHex(resolved)
    return { ref: raw, swatch: hex, picker: hex ?? COLOR_PICKER_FALLBACK }
  }
  const hex = normalizeHex(raw)
  return { ref: null, swatch: hex, picker: hex ?? COLOR_PICKER_FALLBACK }
}

/** 从 store 的 deck 快照（宿主 /project 响应）安全地取 theme 段；缺席给 null。 */
export function deckTheme(deck: unknown): ThemeLike | null {
  const theme = (deck as { theme?: unknown } | null)?.theme
  return theme && typeof theme === 'object' ? (theme as ThemeLike) : null
}

/**
 * 解析元素的文本样式：把 `style: $body` 与内联字段合并成一份「最终生效」的样式表。
 * 内联字段优先于 $style 引用（与 richtext/导出端的覆盖语义一致）。
 * 返回的字段名保持 PPTD 原名（fontSize/color/fontFamily/lineHeight/bold/italic…），
 * 颜色字段已解析为字面量。
 */
export function resolveTextStyle(
  content: Record<string, unknown>,
  theme?: ThemeLike | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const ref = content.style
  if (typeof ref === 'string' && ref.startsWith('$')) {
    const base = theme?.textStyles?.[ref.slice(1)]
    if (base && typeof base === 'object') Object.assign(out, base)
  }
  // 内联字段覆盖（style 之外的 direct 字段；text/align/wrap 是内容或排版开关，不是样式值）
  for (const [k, v] of Object.entries(content)) {
    if (k === 'style' || k === 'text' || k === 'align' || k === 'wrap') continue
    out[k] = v
  }
  if (typeof out.color === 'string') out.color = resolveColor(out.color, theme) ?? out.color
  if (typeof out.backgroundColor === 'string')
    out.backgroundColor = resolveColor(out.backgroundColor, theme) ?? out.backgroundColor
  return out
}

/**
 * fill → CSS background 值。返回 undefined 表示「无填充」（透明）。
 * solid → 颜色；gradient → linear-gradient/radial-gradient；image → url(...)（src 经 resolveMedia 映射）。
 */
export function fillToCss(
  fill: unknown,
  theme?: ThemeLike | null,
  resolveMedia?: (src: string) => string,
): string | undefined {
  if (!fill || typeof fill !== 'object') return undefined
  const f = fill as Record<string, unknown>
  const type = f.type
  if (type === 'solid') {
    return resolveColor(f.color, theme)
  }
  if (type === 'gradient') {
    const stops = Array.isArray(f.stops) ? f.stops : []
    const parts = stops
      .map((s) => {
        const st = s as Record<string, unknown>
        const c = resolveColor(st.color, theme)
        if (!c) return null
        const pos = typeof st.position === 'number' ? st.position : typeof st.offset === 'number' ? st.offset : 0
        return `${c} ${Math.round(pos * 100)}%`
      })
      .filter((x): x is string => Boolean(x))
    if (!parts.length) return undefined
    if (f.gradientType === 'radial') return `radial-gradient(circle, ${parts.join(', ')})`
    // 角度系换算：PPTD 规格 angle 0 = 左→右、顺时针；CSS linear-gradient 0deg = 下→上。
    // 正确映射 cssAngle = pptdAngle + 90（规格缺省 angle 0 → CSS 90deg = 左→右）。
    const pptdAngle = typeof f.angle === 'number' ? f.angle : 0
    return `linear-gradient(${pptdAngle + 90}deg, ${parts.join(', ')})`
  }
  if (type === 'image') {
    const raw = typeof f.src === 'string' ? f.src : undefined
    if (!raw) return undefined
    const src = resolveMedia ? resolveMedia(raw) : raw
    return `url(${src}) center/cover no-repeat`
  }
  return undefined
}

/** border → CSS border 值。PPTD border: { style?, width?, color? }。 */
export function borderToCss(border: unknown, theme?: ThemeLike | null): string | undefined {
  if (!border || typeof border !== 'object') return undefined
  const b = border as Record<string, unknown>
  const color = resolveColor(b.color, theme)
  if (!color) return undefined
  const width = typeof b.width === 'number' ? b.width : 1
  const style = typeof b.style === 'string' ? b.style : 'solid'
  return `${width}px ${style} ${color}`
}

/** page.background → CSS background 值（与 fill 同构，但允许纯色字符串简写；image 过 resolveMedia）。 */
export function backgroundToCss(
  background: unknown,
  theme?: ThemeLike | null,
  resolveMedia?: (src: string) => string,
): string | undefined {
  if (typeof background === 'string') return resolveColor(background, theme)
  if (background && typeof background === 'object') {
    const b = background as Record<string, unknown>
    if (typeof b.color === 'string' && !b.type) return resolveColor(b.color, theme)
    return fillToCss(b, theme, resolveMedia)
  }
  return undefined
}
