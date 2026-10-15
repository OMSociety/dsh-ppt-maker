/**
 * 文本元素的 markup ↔ 纯文字互转。
 *
 * PPTD 的文本元素 `content.text` 是**段落化富文本**：一个 `<p>` 就是一段，
 * 段内可以有 `<strong>`/`<em>`/`<span style>` 等行内格式。属性面板因此提供
 * 两种编辑模式：
 *   - 纯文字（默认）：显示人话，保存时按行包回 `<p>`；
 *   - 标记：直接编辑原始 markup，供精修行内格式。
 *
 * 这里只做「简单 markup（只含 `<p>`/`<br>`）」与纯文字之间的无损互转；
 * 含行内格式的文本由调用方按 `hasRichMarkup` 回退到标记模式，避免静默丢格式。
 */

/** 除 `<p>`/`<br>` 之外还有别的标签（即含行内格式）。 */
export function hasRichMarkup(text: string): boolean {
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (!/^(p|br)$/i.test(m[1])) return true
  }
  return false
}

/** markup → 纯文字：段间隔与 `<br>` 变行，其余标签剥掉，实体解码。 */
export function markupToPlain(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
}

/** 纯文字 → markup：一行一段；特殊字符转义，用户输入的 `<` 不会被当成标签。 */
export function plainToMarkup(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  // 末尾空行不落成空段落（否则每次回车都多一段）。
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop()
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
}

/**
 * 画布就地编辑器（TextEditor）的显示/提交模型：
 *   - 含行内格式（rich）：原样显示原始 markup，用户直接改标记源码，提交原样回写——
 *     绝不剥格式；
 *   - 简单 markup / 纯文本简写：显示人话（段变行），提交时按行包回 `<p>`。
 * display 与 raw 相等即「没动过」，调用方据此跳过提交。
 */
export function textEditorModel(raw: string): { display: string; rich: boolean; commit: (typed: string) => string } {
  const rich = hasRichMarkup(raw)
  return {
    display: rich ? raw : markupToPlain(raw),
    rich,
    commit: (typed: string) => (rich ? typed : plainToMarkup(typed)),
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
