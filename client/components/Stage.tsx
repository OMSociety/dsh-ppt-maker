/**
 * Stage：画布——PptdView 把页 AST 直接渲染成 DOM，ElementOverlay 盖透明选择框。
 *
 * 底图与选择层共用同源 DOM 和逻辑坐标系：打开即渲染，矢量缩放保持清晰，
 * 选择框不会因独立光栅化链路产生坐标偏差。
 *
 * 坐标系：deck.size（pt）为逻辑坐标。ElementOverlay 作为 PptdView 的 overlay 传进
 * 逻辑画布内部，随整体 scale 缩放——所以 overlay 里的元素直接用 pt 坐标即可对齐。
 *
 * 交互：
 *   - 单击覆盖层元素 → store.actions.setSelection([elementId])（同时触发右栏展开）。
 *   - 双击文本元素 → 就地编辑（TextEditor 顶在该元素位置）。
 *   - 点画布空白 → 取消选择（右栏随之收起）。
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { PptdView, type PptdElement, type PptdPage } from './PptdView'
import { TextEditor } from './TextEditor'
import { deckTheme } from '../render/resolve'

export function Stage({ store }: { store: PptStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [editing, setEditing] = React.useState<string | null>(null)

  // Stage 挂载或翻页时主动拉页 AST；确保 PptdView 与 ElementOverlay 有几何可用
  React.useEffect(() => {
    if (state.activeKey) void store.actions.ensurePageLoaded()
  }, [state.activeKey, state.currentPage, store])

  // 在翻页或切工程时退出编辑态
  React.useEffect(() => {
    setEditing(null)
  }, [state.activeKey, state.currentPage])

  if (!state.activeKey) return <div className="ppt-stage ppt-stage-empty" />

  const size = (state.deck?.size ?? [960, 540]) as [number, number]
  const theme = deckTheme(state.deck)
  const page = (state.currentPageData ?? null) as PptdPage | null
  const elements = Array.isArray(page?.elements) ? (page!.elements as PptdElement[]) : []

  return (
    <div className="ppt-stage" data-page={state.currentPage + 1}>
      <PptdView
        page={page}
        size={size}
        theme={theme}
        resolveMedia={(src) => store.actions.mediaUrl(src)}
        className="ppt-stage-pptd"
        overlay={
          <>
            <ElementOverlay
              elements={elements}
              selection={state.selection}
              onSelect={(ids) => store.actions.setSelection(ids)}
              onEnterEdit={(elementId) => setEditing(elementId)}
            />
            {editing ? <TextEditor store={store} elementId={editing} onDone={() => setEditing(null)} /> : null}
          </>
        }
      />
    </div>
  )
}

/**
 * 透明选择框：每元素一个绝对定位的 div，单击 setSelection([id])、双击 onEnterEdit。
 * 坐标与 PptdView 逻辑画布同系（pt），随整体 scale——因此天然与渲染元素对齐。
 * 双击后组件就地卸载（TextEditor 直接顶在这个位置）。
 */
function ElementOverlay({
  elements,
  selection,
  onSelect,
  onEnterEdit,
}: {
  elements: PptdElement[]
  selection: { page: number; ids: string[] } | null
  onSelect: (ids: string[]) => void
  onEnterEdit: (elementId: string) => void
}) {
  const selectedId = selection && selection.ids.length ? selection.ids[0] : null
  return (
    // 容器接收「点空白」→ 取消选择；元素框自己 stopPropagation，不会误触取消。
    // 容器要 pointer-events:auto 才收得到空白点击（样式里 overlay 默认 none，这里覆盖）。
    <div
      className="ppt-overlay ppt-overlay-active"
      aria-hidden={false}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect([])
      }}
    >
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
            aria-label={elementLabel(el)}
            title={isText ? '双击、Enter 或 F2 改字' : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'F2') {
                e.preventDefault()
                onSelect([id])
                if (isText) onEnterEdit(id)
              } else if (e.key === ' ') {
                e.preventDefault()
                onSelect([id])
              }
            }}
          />
        )
      })}
    </div>
  )
}

const TYPE_NAMES: Record<string, string> = {
  text: '文本',
  shape: '形状',
  line: '线条',
  image: '图片',
  icon: '图标',
  table: '表格',
  chart: '图表',
}

/** 元素框的可访问名：类型 + 文字前 20 字（无文字时用元素 ID）。 */
export function elementLabel(el: { elementType?: string; elementId?: string; content?: unknown }): string {
  const kind = TYPE_NAMES[el.elementType ?? ''] ?? '元素'
  const raw = (el.content as { text?: unknown } | undefined)?.text
  const text = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''
  if (text) return `${kind}：${text.length > 20 ? `${text.slice(0, 20)}…` : text}`
  return `${kind} ${el.elementId ?? ''}`.trim()
}