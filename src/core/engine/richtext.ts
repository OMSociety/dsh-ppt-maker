/**
 * Rich-text compiler: PPTD `content.text` markup → paragraph/run IR.
 *
 * Grammar (上游 §5 › Rich Text Rules):
 *  - block tags: <p style="...">, <ul>, <ol>, <li style="...">
 *  - inline tags: <span style="...">, <strong>, <em>, <u>, <s>, <sup>, <sub>,
 *    <a href="...">
 *  - plain-text shorthand: text without any '<' is one paragraph per line.
 *  - LaTeX \(...\) is NOT handled here — it is a render-time concern that the
 *    TS engine does not support (collected as a warning by the caller).
 *
 * style attribute mapping (authoritative subset):
 *  - <p>/<li>: text-align, line-height, margin-top, margin-left, margin-right,
 *    letter-spacing (li only), list-style*
 *  - <span>: color, font-size, font-family, background-color
 */

export interface InlineStyle {
  color?: string
  fontSize?: number
  fontFamily?: string
  backgroundColor?: string
}

export interface ParagraphProps {
  align?: string
  lineHeight?: number
  lineHeightPx?: number
  marginTop?: number
  marginLeft?: number
  marginRight?: number
  letterSpacing?: number
  bullet?: 'bullet' | 'number' | 'none'
}

export interface RichRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  superscript?: boolean
  subscript?: boolean
  hyperlink?: string
  style: InlineStyle
}

export interface RichParagraph {
  props: ParagraphProps
  runs: RichRun[]
}

export interface RichParseResult {
  paragraphs: RichParagraph[]
  warnings: string[]
}

const VOIDLESS = /^<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>/

interface Tag {
  name: string
  attrs: Record<string, string>
  closing: boolean
  selfClosing: boolean
}

function parseTag(raw: string): Tag | null {
  const m = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\s*((?:[^>"']|"[^"]*"|'[^']*')*?)\s*(\/?)>$/.exec(raw)
  if (!m) return null
  const attrs: Record<string, string> = {}
  const attrRe = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g
  let a: RegExpExecArray | null
  while ((a = attrRe.exec(m[3])) !== null) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? ''
  return { name: m[2].toLowerCase(), attrs, closing: m[1] === '/', selfClosing: m[4] === '/' }
}

/** Split markup into text and tag tokens. */
function tokenize(input: string): Array<{ kind: 'text'; value: string } | { kind: 'tag'; value: string }> {
  const out: Array<{ kind: 'text'; value: string } | { kind: 'tag'; value: string }> = []
  let i = 0
  let buf = ''
  while (i < input.length) {
    const ch = input[i]
    if (ch === '<') {
      const rest = input.slice(i)
      const m = VOIDLESS.exec(rest) ?? /^<\/[a-zA-Z][a-zA-Z0-9]*\s*>/.exec(rest) ?? /^<br\s*\/?>/.exec(rest)
      if (m) {
        if (buf) { out.push({ kind: 'text', value: buf }); buf = '' }
        out.push({ kind: 'tag', value: m[0] })
        i += m[0].length
        continue
      }
      // not a tag — literal '<'
    }
    buf += ch
    i++
  }
  if (buf) out.push({ kind: 'text', value: buf })
  return out
}

/** Decode the handful of entities authors realistically type into YAML. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Parse a CSS-ish style attribute into a lowercase key map. */
function parseStyleAttr(style: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':')
    if (idx <= 0) continue
    const key = decl.slice(0, idx).trim().toLowerCase()
    const value = decl.slice(idx + 1).trim()
    if (key) out[key] = value
  }
  return out
}

function px(value: string): number | undefined {
  const m = /^(-?\d+(?:\.\d+)?)(px|pt)?$/.exec(value.trim())
  return m ? Number(m[1]) : undefined
}

function paragraphPropsFromStyle(style: Record<string, string>, warnings: string[]): ParagraphProps {
  const props: ParagraphProps = {}
  if (style['text-align']) props.align = style['text-align']
  if (style['line-height']) {
    const raw = style['line-height']
    if (raw.endsWith('px')) {
      const v = px(raw)
      if (v !== undefined) props.lineHeightPx = v
    } else {
      const v = Number(raw)
      if (Number.isFinite(v)) props.lineHeight = v
    }
  }
  for (const [key, field] of [['margin-top', 'marginTop'], ['margin-left', 'marginLeft'], ['margin-right', 'marginRight']] as const) {
    const v = style[key] ? px(style[key]) : undefined
    if (v !== undefined) props[field] = v
  }
  if (style['letter-spacing']) {
    const v = px(style['letter-spacing'])
    if (v !== undefined) props.letterSpacing = v
    else warnings.push(`letter-spacing 无法解析：${style['letter-spacing']}`)
  }
  return props
}

function inlineStyleFromStyle(style: Record<string, string>): InlineStyle {
  const out: InlineStyle = {}
  if (style['color']) out.color = style['color']
  if (style['font-size']) {
    const v = px(style['font-size'])
    if (v !== undefined) out.fontSize = v
  }
  if (style['font-family']) out.fontFamily = style['font-family'].replace(/^["']|["']$/g, '')
  if (style['background-color']) out.backgroundColor = style['background-color']
  return out
}

interface InlineFrame {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  superscript: boolean
  subscript: boolean
  hyperlink?: string
  style: InlineStyle
}

const FRAME_DEFAULT: InlineFrame = {
  bold: false, italic: false, underline: false, strike: false,
  superscript: false, subscript: false, style: {}
}

/** True when the string contains markup worth parsing. */
export function hasMarkup(text: string): boolean {
  return /<\/?(p|span|strong|em|u|s|sup|sub|a|ul|ol|li|br)(\s|>|\/)/i.test(text)
}

/**
 * Compile markup into paragraphs. Unknown tags degrade to their text content
 * with a warning; unbalanced tags are best-effort closed at end of input.
 */
export function parseRichText(input: string): RichParseResult {
  const warnings: string[] = []
  if (!hasMarkup(input)) {
    const lines = input.split(/\r?\n/)
    return {
      paragraphs: lines.map((line) => ({ props: {}, runs: line === '' ? [] : [{ text: decodeEntities(line), style: {} }] })),
      warnings
    }
  }

  const paragraphs: RichParagraph[] = []
  let current: RichParagraph = { props: {}, runs: [] }
  const flushParagraph = () => {
    paragraphs.push(current)
    current = { props: {}, runs: [] }
  }

  const stack: Array<{ tag: string; frame: InlineFrame }> = []
  let listContext: Array<'ul' | 'ol'> = []
  const frameOf = (): InlineFrame => {
    const base: InlineFrame = { ...FRAME_DEFAULT, style: {} }
    for (const entry of stack) {
      if (entry.frame.bold) base.bold = true
      if (entry.frame.italic) base.italic = true
      if (entry.frame.underline) base.underline = true
      if (entry.frame.strike) base.strike = true
      if (entry.frame.superscript) base.superscript = true
      if (entry.frame.subscript) base.subscript = true
      if (entry.frame.hyperlink) base.hyperlink = entry.frame.hyperlink
      Object.assign(base.style, entry.frame.style)
    }
    return base
  }

  for (const token of tokenize(input)) {
    if (token.kind === 'text') {
      const text = decodeEntities(token.value)
      if (text === '') continue
      // Raw newlines inside markup are paragraph breaks (block-scalar authors
      // write one logical line per <p>-less row).
      const parts = text.split(/\r?\n/)
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== '') {
          const frame = frameOf()
          current.runs.push({
            text: parts[i],
            ...(frame.bold ? { bold: true } : {}),
            ...(frame.italic ? { italic: true } : {}),
            ...(frame.underline ? { underline: true } : {}),
            ...(frame.strike ? { strike: true } : {}),
            ...(frame.superscript ? { superscript: true } : {}),
            ...(frame.subscript ? { subscript: true } : {}),
            ...(frame.hyperlink ? { hyperlink: frame.hyperlink } : {}),
            style: frame.style
          })
        }
        if (i < parts.length - 1) flushParagraph()
      }
      continue
    }

    const tag = parseTag(token.value)
    if (!tag) { warnings.push(`无法解析的标签：${token.value}`); continue }

    if (tag.name === 'br') {
      // Represent a line break as a literal '\n' run; the engine maps it to <a:br>.
      const frame = frameOf()
      current.runs.push({ text: '\n', style: frame.style })
      continue
    }

    if (tag.closing) {
      switch (tag.name) {
        case 'p':
        case 'li':
          flushParagraph()
          break
        case 'ul':
        case 'ol':
          listContext = listContext.slice(0, -1)
          break
        default: {
          const idx = stack.map((s) => s.tag).lastIndexOf(tag.name)
          if (idx >= 0) stack.splice(idx)
          else warnings.push(`多余的闭合标签：</${tag.name}>`)
        }
      }
      continue
    }

    switch (tag.name) {
      case 'p': {
        const styles = parseStyleAttr(tag.attrs.style ?? '')
        current.props = { ...current.props, ...paragraphPropsFromStyle(styles, warnings) }
        break
      }
      case 'li': {
        const styles = parseStyleAttr(tag.attrs.style ?? '')
        const props = paragraphPropsFromStyle(styles, warnings)
        const list = listContext[listContext.length - 1]
        props.bullet = list === 'ol' ? 'number' : 'bullet'
        current.props = { ...current.props, ...props }
        break
      }
      case 'ul':
      case 'ol':
        listContext.push(tag.name)
        break
      case 'span':
        stack.push({ tag: 'span', frame: { ...FRAME_DEFAULT, style: inlineStyleFromStyle(parseStyleAttr(tag.attrs.style ?? '')) } })
        break
      case 'strong':
        stack.push({ tag: 'strong', frame: { ...FRAME_DEFAULT, bold: true, style: {} } })
        break
      case 'em':
        stack.push({ tag: 'em', frame: { ...FRAME_DEFAULT, italic: true, style: {} } })
        break
      case 'u':
        stack.push({ tag: 'u', frame: { ...FRAME_DEFAULT, underline: true, style: {} } })
        break
      case 's':
        stack.push({ tag: 's', frame: { ...FRAME_DEFAULT, strike: true, style: {} } })
        break
      case 'sup':
        stack.push({ tag: 'sup', frame: { ...FRAME_DEFAULT, superscript: true, style: {} } })
        break
      case 'sub':
        stack.push({ tag: 'sub', frame: { ...FRAME_DEFAULT, subscript: true, style: {} } })
        break
      case 'a': {
        const href = tag.attrs.href
        if (href) stack.push({ tag: 'a', frame: { ...FRAME_DEFAULT, hyperlink: href, style: {} } })
        else warnings.push('<a> 缺少 href 属性，按纯文本处理')
        break
      }
      default:
        warnings.push(`未知标签 <${tag.name}>，其内容按纯文本处理`)
    }
  }
  // Close the trailing paragraph.
  flushParagraph()

  // Drop the artificial empty trailing paragraph when the input ended with a
  // block tag (</p> / </li> already flushed).
  while (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1]
    if (last.runs.length === 0 && Object.keys(last.props).length === 0) paragraphs.pop()
    else break
  }
  return { paragraphs, warnings }
}
