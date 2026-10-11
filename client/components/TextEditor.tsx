/**
 * TextEditor：就地 contentEditable。
 *
 * 机制（计划 §4-§6）：
 *   - 双击 Stage 里的文字元素进入（Stage 挂它在原地，bounds 对准元素）。
 *   - Ctrl+Enter 或失焦 提交 → store.actions.updateElement(elementId, {content: {text}})
 *   - Esc 取消（不 commit）。提交完毕后由 store 触发一次静默重载（revision 前进带动）。
 *
 * 只支持 text 元素；exact 直接读 PPTD 的 content.text。
 * 这里的文本是「单段」，无富文本（富文本提交走 text 包 markdown/inline 标记，那是 PR3 的活）。
 */
import * as React from 'react'
import type { PptStore } from '../store'

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
  const initialText = String(target?.content?.text ?? '')

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
    setCommitted(true)
    if (text === initialText) {
      onDone()
      return
    }
    const ok = await store.actions.updateElement(elementId, { content: { ...(target.content ?? {}), text } })
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
      {initialText}
    </div>
  )
}
