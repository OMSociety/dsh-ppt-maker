/**
 * ThumbStrip：页缩略图竖条。
 *
 * 三件事：
 *   1. 按 `deckPages` 排页；每页一张 img，拉的是 `GET /thumb?rev=…` 渲出的 PNG。
 *   2. 点选 → store.actions.setPage（面板同步到 Stage 与 Inspector）。
 *   3. 悬停动作按钮：复制（page_duplicate）、删除（remove_page）；顶部「+ 新页」（add_page）。
 *
 * 拖拽排序（HTML5 drag & drop）→ move_page：拖一个缩略图到某条间隙，松开即落 op。
 * 拖拽过程 store 不动——只有松手才构造 op（不然每次 over 都发一次请求）。
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { NewPageGlyph } from '../icons'

interface DragState {
  fromPath: string | null
  overIndex: number | null
}

export function ThumbStrip({ store }: { store: PptStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [drag, setDrag] = React.useState<DragState>({ fromPath: null, overIndex: null })

  const pages = state.deckPages
  if (!pages.length) {
    return (
      <div className="ppt-thumbs">
        <button
          type="button"
          className="ppt-btn"
          onClick={() => void store.actions.addPage()}
          title="add_page"
        >
          <NewPageGlyph size={13} /> 新页
        </button>
        <p style={{ fontSize: 11, color: 'var(--dsw-alias-label-secondary)', padding: '4px 2px' }}>
          还没有页面；先点上面加一张。
        </p>
      </div>
    )
  }

  const dropAt = (toIndex: number) => {
    if (!drag.fromPath) return
    void store.actions.movePage(drag.fromPath, toIndex)
    setDrag({ fromPath: null, overIndex: null })
  }

  const renderGap = (index: number) => {
    const over = drag.overIndex === index
    return (
      <div
        key={`gap-${index}`}
        className={`ppt-thumb-gap${over ? ' ppt-thumb-gap-over' : ''}`}
        onDragOver={(e) => {
          if (!drag.fromPath) return
          e.preventDefault()
          setDrag((d) => (d.overIndex === index ? d : { ...d, overIndex: index }))
        }}
        onDrop={(e) => {
          e.preventDefault()
          dropAt(index)
        }}
        aria-hidden
      />
    )
  }

  return (
    <div className="ppt-thumbs">
      <button
        type="button"
        className="ppt-btn"
        onClick={() => void store.actions.addPage()}
        title="add_page（在末尾追加一页空白页）"
      >
        <NewPageGlyph size={13} /> 新页
      </button>
      <div className="ppt-thumblist" role="list">
        {pages.map((pagePath, index) => {
          const thumb = state.pageCache[index + 1]
          const pageNo = index + 1
          const active = index === state.currentPage

          return (
            <React.Fragment key={pagePath}>
              {index === 0 ? renderGap(0) : null}
              <div
                role="listitem"
                className={`ppt-thumbrow${active ? ' ppt-thumbrow-on' : ''}${drag.fromPath === pagePath ? ' ppt-thumbrow-dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/ppt-page-path', pagePath)
                  e.dataTransfer.effectAllowed = 'move'
                  setDrag({ fromPath: pagePath, overIndex: null })
                }}
                onDragEnd={() => setDrag({ fromPath: null, overIndex: null })}
              >
                <button
                  type="button"
                  className="ppt-thumb"
                  onClick={() => store.actions.setPage(index)}
                  title={`第 ${pageNo} 页（${pagePath}）`}
                  aria-pressed={active}
                >
                  {thumb ? (
                    <img className="ppt-thumb-img" src={thumb.dataUrl} alt={`第 ${pageNo} 页`} draggable={false} />
                  ) : (
                    <span className="ppt-thumb-preview-placeholder">
                      <ThumbSkeleton
                        onVisible={() => void store.actions.ensureThumb(pageNo, state.lastSeenRevision)}
                      />
                      <span className="ppt-thumb-num">第 {pageNo} 页</span>
                    </span>
                  )}
                </button>
                <div className="ppt-thumb-actions">
                  <button
                    type="button"
                    className="ppt-btn ppt-thumb-action"
                    onClick={() => void store.actions.duplicatePage(pagePath)}
                    title="复制这页（page_duplicate）"
                  >
                    复制
                  </button>
                  <button
                    type="button"
                    className="ppt-btn ppt-thumb-action"
                    onClick={() => void store.actions.removePage(pagePath)}
                    title="删除这页（remove_page）"
                  >
                    删除
                  </button>
                </div>
              </div>
              {renderGap(index + 1)}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

/** 拖进可视区才拉缩略图（IntersectionObserver 兜底，Element 级惰性）。 */
function ThumbSkeleton({ onVisible }: { onVisible: () => void }) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      onVisible()
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect()
        onVisible()
      }
    })
    io.observe(el)
    return () => io.disconnect()
    // onVisible 只触发一次就够（ensureThumb 有内部缓存守卫）。
  }, [])
  return <div ref={ref} className="ppt-thumb-skeleton" aria-hidden="true" />
}
