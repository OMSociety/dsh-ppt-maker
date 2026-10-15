/**
 * ThumbStrip：页缩略图竖条。
 *
 * 三件事：
 *   1. 按 `deckPages` 排页；每页一张缩略图，用 PptdView 直接渲染该页 AST（DOM 直渲，
 *      不走光栅化 PNG——打开即出、与画布同渲染管线、无 px:pt 系数错位）。
 *   2. 点选 → store.actions.setPage（面板同步到 Stage 与 Inspector）。
 *   3. 悬停动作按钮：复制（page_duplicate）、删除（remove_page）；顶部「+ 新页」（add_page），
 *      与收起按钮同处一行（panel.tsx 经 headerAction 注入，flex 行内天然纵坐标对齐）。
 *
 * 拖拽排序（HTML5 drag & drop）→ move_page：拖一个缩略图到某条间隙，松开即落 op。
 * 拖拽过程 store 不动——只有松手才构造 op（不然每次 over 都发一次请求）。
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { NewPageGlyph } from '../icons'
import { PptdView, type PptdPage } from './PptdView'
import { deckTheme } from '../render/resolve'

interface DragState {
  fromPath: string | null
  overIndex: number | null
}

export function ThumbStrip({ store, headerAction }: { store: PptStore; headerAction?: React.ReactNode }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [drag, setDrag] = React.useState<DragState>({ fromPath: null, overIndex: null })

  const pages = state.deckPages
  const size = (state.deck?.size ?? [960, 540]) as [number, number]
  const theme = deckTheme(state.deck)

  if (!pages.length) {
    return (
      <div className="ppt-thumbs">
        <div className="ppt-thumbs-head">
          <button
            type="button"
            className="ppt-btn"
            onClick={() => void store.actions.addPage()}
            title="add_page"
          >
            <NewPageGlyph size={13} /> 新页
          </button>
          {headerAction}
        </div>
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
      <div className="ppt-thumbs-head">
        <button
          type="button"
          className="ppt-btn"
          onClick={() => void store.actions.addPage()}
          title="add_page（在末尾追加一页空白页）"
        >
          <NewPageGlyph size={13} /> 新页
        </button>
        {headerAction}
      </div>
      <div className="ppt-thumblist" role="list">
        {pages.map((pagePath, index) => {
          const ast = state.pagesAst[index]
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
                  {ast ? (
                    <PptdView
                      page={ast.page as PptdPage}
                      size={size}
                      theme={theme}
                      resolveMedia={(src) => store.actions.mediaUrl(src)}
                      className="ppt-thumb-pptd"
                    />
                  ) : (
                    <ThumbAstLoader
                      onVisible={() => void store.actions.ensurePageAst(index)}
                      label={`第 ${pageNo} 页`}
                    />
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

/**
 * 缩略图占位 + 惰性拉取：进可视区才 ensurePageAst（IntersectionObserver）。
 * 没有 IO 的环境（老 WebView）直接拉。编辑后 pagesAst 被清，本组件重新挂载，
 * 已离开可视区的页不会立刻重拉——滚动到它们时才拉（这就是懒加载的意义）。
 */
function ThumbAstLoader({ onVisible, label }: { onVisible: () => void; label: string }) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
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
  }, [onVisible])
  return (
    <span ref={ref} className="ppt-thumb-preview-placeholder">
      <span className="ppt-thumb-skeleton" aria-hidden="true" />
      <span className="ppt-thumb-num">{label}</span>
    </span>
  )
}
