/**
 * Stage：画布——GET /thumb?rev=N 渲出的 PNG 做大图 + ElementOverlay 盖透明选择框。
 *
 * 尺寸取 deck.size（[w, h]，单位 px，与 OOXML EMU 同源换算）；
 * 画布外层有一个可滚容器，大图自然撑开（不责任适配，那是 TextEditor/Inspector 的活）。
 *
 * 单击选中：点透明覆盖层上某个元素 → store.actions.setSelection([elementId])。
 * 双击进入就地编辑 → Stage 进入 editing 态 → 在那里挂 TextEditor；失焦 / Ctrl+Enter 提交，
 * Esc 取消。区域外的单击 = 取消选择。
 *
 * Element 字段读 PPTD：
 *   elementId / elementType / bounds:[x,y,w,h] / content.text? / content.color?
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { TextEditor } from './TextEditor'

interface PptElement {
  elementId?: string
  elementType?: string
  bounds?: [number, number, number, number]
  content?: {
    text?: string
    color?: string
    align?: [string, string]
    fontSize?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface PptPage {
  background?: { type?: string; color?: string }
  elements?: PptElement[]
  [key: string]: unknown
}

export function Stage({ store }: { store: PptStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [editing, setEditing] = React.useState<string | null>(null)

  // Stage 挂载或翻页时主动拉页 AST；确保 ElementOverlay 有几何可用
  React.useEffect(() => {
    if (state.activeKey) void store.actions.ensurePageLoaded()
  }, [state.activeKey, state.currentPage, store])

  if (!state.activeKey) return <div className="ppt-stage ppt-stage-empty" />
  const size = (state.deck?.size ?? [960, 540]) as [number, number]
  const thumb = state.pageCache[state.currentPage + 1]
  const pageNo = state.currentPage + 1
  const page = (state.currentPageData ?? null) as PptPage | null
  const elements = Array.isArray(page?.elements) ? (page!.elements as PptElement[]) : []

  React.useEffect(() => {
    // 在翻页或 activeKey 变化时退出编辑态
    setEditing(null)
  }, [state.activeKey, state.currentPage])

  const canvasStyle: React.CSSProperties = {
    width: size[0],
    height: size[1],
    background: 'var(--dsw-alias-bg-layer-2)',
  }

  return (
    <div className="ppt-stage" data-page={pageNo}>
      <div className="ppt-stage-canvas" style={canvasStyle}>
        {thumb ? (
          <img className="ppt-stage-bg" src={thumb.dataUrl} alt={`第 ${pageNo} 页渲染`} draggable={false} />
        ) : (
          <button
            type="button"
            className="ppt-stage-loadthumb"
            onClick={() => void store.actions.ensureThumb(pageNo, state.lastSeenRevision)}
          >
            渲染这一页的缩略图（第一次点会等 libreoffice 几秒）
          </button>
        )}
        <ElementOverlay
          elements={elements}
          selection={state.selection}
          onSelect={(ids) => store.actions.setSelection(ids)}
          onEnterEdit={(elementId) => setEditing(elementId)}
        />
        {editing && (
          <TextEditor
            store={store}
            elementId={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </div>
    </div>
  )
}

/**
 * 透明选择框：每元素一个绝对定位的 div，单击 setSelection([id])、双击 onEnterEdit。
 * 双击后组件就地卸载（TextEditor 直接顶在这个位置）。
 */
function ElementOverlay({
  elements,
  selection,
  onSelect,
  onEnterEdit,
}: {
  elements: PptElement[]
  selection: { page: number; ids: string[] } | null
  onSelect: (ids: string[]) => void
  onEnterEdit: (elementId: string) => void
}) {
  const selectedId = selection && selection.ids.length ? selection.ids[0] : null
  return (
    <div className="ppt-overlay" aria-hidden={false}>
      {elements.map((el) => {
        const id = el.elementId
        const bounds = el.bounds
        if (!id || !bounds || bounds.length !== 4) return null
        const [x, y, w, h] = bounds
        const isSel = selectedId === id
        const isText = el.elementType === 'text'
        return (
          <div
            key={id}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            data-element-id={id}
            data-element-type={el.elementType || ''}
            className={`ppt-element${isSel ? ' ppt-element-on' : ''}${isText ? ' ppt-element-text' : ''}`}
            style={{ left: x, top: y, width: w, height: h }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect([id])
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (isText) onEnterEdit(id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSelect([id])
            }}
          />
        )
      })}
    </div>
  )
}
