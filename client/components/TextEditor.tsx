/**
 * TextEditor：就地 contentEditable。
 *
 * 机制（计划 §4-§6）：
 *   - 双击 Stage 里的文字元素进入（Stage 挂它在原地，bounds 对准元素）。
 *   - Ctrl+Enter 或失焦 提交 → store.actions.updateElement(elementId, {content: {text}})
 *   - Esc 取消（不 commit）。提交完毕后由 store 触发一次静默重载（revision 前进带动）。
 *
 * 只支持 text 元素；直接读写 PPTD 的 content.text。
 * 显示/提交语义由 textEditorModel 定：含行内格式的文本原样摆 markup 源码（改标记即改格式），
 * 简单 markup / 纯文本简写显示人话、提交时按行包回 <p>——多段文本来回不丢段、不剥格式。
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { textEditorModel } from '../render/text-markup'

interface PptElement {
  elementId?: string
  elementType?: string
  bounds?: [number, number, number, number]
  content?: { text?: string; color?: string; align?: [string, string]; fontSize?: number; [key: string]: unknown }
  [key: string]: unknown
}

interface PptPage {
  elements?: PptElement[]
  [key: string]: unknown
}

export function TextEditor({
  store,
  elementId,
  onDone,
}: {
  store: PptStore
  elementId: string
  onDone: () => void
}) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const page = (state.currentPageData ?? null) as PptPage | null
  const target = Array.isArray(page?.elements) ? page!.elements!.find((e) => e.elementId === elementId) : undefined
  const rawText = String(target?.content?.text ?? '')
  // rich：含行内格式 → 显示并提交原始 markup（不剥格式）；否则显示人话、提交包回 <p>。
  const editor = textEditorModel(rawText)

  const ref = React.useRef<HTMLDivElement | null>(null)
  const [committed, setCommitted] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    // 全选：进来就能改
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [])

  if (!target || !target.bounds) return null
  const [x, y, w, h] = target.bounds
  const align = target.content?.align
  const justifyContent = align?.[0] === 'center' ? 'center' : align?.[0] === 'right' ? 'flex-end' : 'flex-start'
  const alignItems = align?.[1] === 'middle' ? 'center' : align?.[1] === 'bottom' ? 'flex-end' : 'flex-start'
  const fontSize = typeof target.content?.fontSize === 'number' ? target.content.fontSize : undefined

  const commit = async (text: string) => {
    if (committed) return
    // 显示值原样交回 = 没动过：连归一化写入都免了（纯文本简写不会被打包成 <p>）。
    if (text === editor.display) {
      onDone()
      return
    }
    setCommitted(true)
    const nextValue = editor.commit(text)
    if (nextValue === rawText) {
      onDone()
      return
    }
    const ok = await store.actions.updateElement(elementId, { content: { ...(target.content ?? {}), text: nextValue } })
    if (ok) onDone()
    else setCommitted(false) // 409 / 网络错误都要让人能再改改、再发
  }

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="true"
      aria-label={`编辑 ${elementId}`}
      contentEditable
      suppressContentEditableWarning
      className="ppt-textedit"
      style={{ left: x, top: y, width: w, height: h, justifyContent, alignItems, fontSize }}
      onBlur={() => {
        const el = ref.current
        if (el) void commit(el.innerText)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onDone()
          return
        }
        if ((e.key === 'Enter' || e.key === 'NumpadEnter') && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          const el = ref.current
          if (el) void commit(el.innerText)
        }
      }}
    >
      {editor.display}
    </div>
  )
}
