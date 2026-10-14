/**
 * 富文本 HTML 白名单 sanitize（防 XSS）。
 *
 * PPTD 的 content.text 是 HTML 子集，渲染时要 innerHTML。但这份字符串可能来自
 * 模型生成或外部 pptx 逆向（reverse/map.ts 拼的），里面若混进 <script>/<img onerror>/
 * javascript: 之类，直接塞进 DOM 就是注入。这里过一道白名单再渲染。
 *
 * 白名单口径对齐富文本编译器（engine/richtext.ts 与 reverse/map.ts 的实际产物）：
 *   块级: p, ul, ol, li, br
 *   行内: span, strong, em, u, s, sup, sub, b, i
 *   允许属性: 仅 style；且 style 里只放行白名单 CSS 属性，值里禁 url()/expression/括号注入。
 *
 * 不引入第三方库（DSH 浏览器半侧只能 require 基线模块），手写一个基于 DOMParser 的
 * 递归清洗——浏览器半侧必有 DOMParser（这与 vitest 的 node 环境区分：单测里用一份
 * 纯字符串回退实现，见 sanitizeHtmlString）。
 */

/** 允许的标签（小写）。 */
const ALLOWED_TAGS = new Set([
  'p', 'ul', 'ol', 'li', 'br',
  'span', 'strong', 'em', 'u', 's', 'sup', 'sub', 'b', 'i',
])

/** style 里允许出现的 CSS 属性（小写）。 */
const ALLOWED_CSS = new Set([
  'text-align', 'line-height',
  'margin-top', 'margin-left', 'margin-right',
  'color', 'background-color', 'font-size', 'font-family',
  'font-weight', 'font-style', 'text-decoration',
])

/** 值里出现这些子串即拒绝该条声明（防 url(javascript:)/expression()/括号逃逸）。 */
const CSS_VALUE_DENY = /(url\s*\(|expression\s*\(|javascript:|vbscript:|@import|<|>)/i

/** 清洗一条 style 字符串，返回只含白名单属性、值安全的新串（无则空串）。 */
export function sanitizeStyle(style: string): string {
  const out: string[] = []
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':')
    if (idx < 0) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const value = decl.slice(idx + 1).trim()
    if (!ALLOWED_CSS.has(prop)) continue
    if (!value || CSS_VALUE_DENY.test(value)) continue
    out.push(`${prop}:${value}`)
  }
  return out.join(';')
}

/**
 * 浏览器路径：用 DOMParser 解析后递归重建一棵只含白名单节点的树，返回安全 HTML。
 * DOMParser 解析本身不执行脚本（inert document），安全。
 */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return sanitizeHtmlString(html)
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  return cleanChildren(root)
}

function cleanChildren(node: Element): string {
  let out = ''
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 /* TEXT_NODE */) {
      out += escapeHtml(child.textContent ?? '')
    } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
      out += cleanElement(child as Element)
    }
  }
  return out
}

function cleanElement(el: Element): string {
  const tag = el.tagName.toLowerCase()
  if (!ALLOWED_TAGS.has(tag)) {
    // 不允许的标签：丢掉标签本身，但保留其清洗后的文本子树（不丢内容）。
    return cleanChildren(el)
  }
  if (tag === 'br') return '<br>'
  let style = ''
  const raw = el.getAttribute('style')
  if (raw) {
    const cleaned = sanitizeStyle(raw)
    if (cleaned) style = ` style="${escapeAttr(cleaned)}"`
  }
  return `<${tag}${style}>${cleanChildren(el)}</${tag}>`
}

/** 纯字符串回退（无 DOMParser 的环境，如 vitest node）：正则级粗清洗，宁可保守。 */
export function sanitizeHtmlString(html: string): string {
  let out = String(html)
  // 去掉 script/style/iframe/object/embed/form 及其内容
  out = out.replace(/<(script|style|iframe|object|embed|form|link|meta)[\s\S]*?<\/\1>/gi, '')
  out = out.replace(/<(script|style|iframe|object|embed|form|link|meta)[^>]*\/?>/gi, '')
  // 去掉所有 on* 事件属性与 javascript:/vbscript: 协议
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
  out = out.replace(/(href|src)\s*=\s*(["']?)\s*(javascript|vbscript):[^"'>]*\2/gi, '')
  // 去掉不在白名单里的标签（保留文本）
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+(?:"[^"]*"|'[^']*'|[^'">])*)?)\s*\/?>/g, (m, tag: string) => {
    const t = tag.toLowerCase()
    if (!ALLOWED_TAGS.has(t)) return ''
    if (t === 'br') return '<br>'
    return m.startsWith('</') ? `</${t}>` : cleanOpenTag(m, t)
  })
  return out
}

function cleanOpenTag(tagText: string, tag: string): string {
  const styleMatch = tagText.match(/\sstyle\s*=\s*"([^"]*)"/i) || tagText.match(/\sstyle\s*=\s*'([^']*)'/i)
  const cleaned = styleMatch ? sanitizeStyle(styleMatch[1]) : ''
  return cleaned ? `<${tag} style="${escapeAttr(cleaned)}">` : `<${tag}>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
