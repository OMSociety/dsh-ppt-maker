/**
 * 工作台容器：Toolbar + 可收缩三栏（ThumbStrip | Stage | Inspector）。
 *
 * 视图只管读 store 快照 + 调 actions，不自己发请求、不自己记时序——那是 `store.ts` 的活。
 * 组件分布：
 *   - Toolbar.tsx      撤销/重做/导出/页导航/冲突条
 *   - ProjectList.tsx  没打开工程时的工程卡片列表（含「让模型导入」引导）
 *   - ThumbStrip.tsx   页缩略图竖条（左栏，可收缩）：PptdView DOM 直渲 + 点选 / 拖拽排序 / 页操作
 *   - Stage.tsx        画布：PptdView DOM 直渲 + ElementOverlay 透明选择框 + TextEditor 就地编辑
 *   - Inspector.tsx    属性面板（右栏，可收缩）：选中元素才展开
 *
 * 左右栏都是「完全收起 + 边缘把手」，且收起时不渲染对应组件（不占渲染开销）：
 *   - 左栏默认展开，点把手收起；
 *   - 右栏跟随 selection——选中元素自动展开，取消选择（点空白）自动收起，也可手动收起
 *     （手动收起后本次选中不再自动弹开，直到改选别的元素）。
 *
 * 「精确预览」即「导出 .pptx」（Toolbar 按钮）——宿主一次性走完 buildProjectDeck →
 * libreoffice-kit 渲页，不在面板里另起炉灶。
 */
import * as React from 'react'
import type { PptStore } from './store'
import { PptMark } from './icons'
import { ProjectList } from './components/ProjectList'
import { ThumbStrip } from './components/ThumbStrip'
import { Stage } from './components/Stage'
import { Inspector } from './components/Inspector'
import { Toolbar } from './components/Toolbar'

/** 右侧栏标签页（tab chip）里那个小标题：品牌图 + 「PPT 工作台」。 */
export function Title() {
  return (
    <span className="ppt-title-label">
      <PptMark size={14} className="ppt-title-glyph" />
      PPT 工作台
    </span>
  )
}

/** 「加载中」态（还没拉过 /state）。 */
function BlankLoading() {
  return (
    <div className="ppt-blank">
      <div className="ppt-blank-card">
        <div className="ppt-brand">
          <PptMark size={20} />
          <span>PPT 工作台</span>
        </div>
        <div className="ppt-sweep" aria-hidden="true" />
        <p>正在打开工作台…</p>
      </div>
    </div>
  )
}

/** 「错误」态：路由没起来 / 网络断了，给个重试。 */
function BlankError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="ppt-blank">
      <div className="ppt-blank-card">
        <div className="ppt-brand">
          <PptMark size={20} />
          <span>PPT 工作台</span>
        </div>
        <p>{error}</p>
        <div className="ppt-actions-row">
          <button type="button" className="ppt-btn" onClick={onRetry}>
            重试
          </button>
        </div>
      </div>
    </div>
  )
}

/** 「还没工程」：三条提示语都围着「让模型 / 你自己问它来一份」转。 */
function BlankEmpty() {
  return (
    <div className="ppt-blank">
      <div className="ppt-blank-card">
        <div className="ppt-brand">
          <PptMark size={20} />
          <span>PPT 工作台</span>
        </div>
        <p>还没有打开的演示文稿。</p>
      </div>
    </div>
  )
}

/** 骨架面板：按 store 快照挑视图。 */
export function SkeletonPanel({ store }: { store: PptStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  React.useEffect(() => {
    void store.actions.init()
  }, [store])

  // ── 左右栏展开态（面板本地 UI 态，非工程数据，不进 store）──
  const [leftOpen, setLeftOpen] = React.useState(true)
  const [rightOpen, setRightOpen] = React.useState(false)
  // 右栏「手动收起」的标记：记下被收起时的元素 id——只有改选**别的**元素才重置，
  // 同元素重选不弹开。取消选择（点空白）时清空。
  const rightDismissedFor = React.useRef<string | null>(null)

  const selectedId = state.selection && state.selection.ids.length ? state.selection.ids[0] : null
  React.useEffect(() => {
    if (selectedId) {
      // 换了一个元素（或首次选中）：清掉手动收起标记，让属性面板自动展开。
      if (rightDismissedFor.current !== selectedId) {
        rightDismissedFor.current = null
        setRightOpen(true)
      }
    } else {
      // 取消选择：收起，并清掉手动收起标记（下次选中又可自动展开）。
      setRightOpen(false)
      rightDismissedFor.current = null
    }
  }, [selectedId])

  const closeRight = () => {
    rightDismissedFor.current = selectedId
    setRightOpen(false)
  }

  return (
    <div className="ppt-root">
      <Toolbar store={store} />
      {state.status === 'loading' && <BlankLoading />}
      {state.status === 'error' && <BlankError error={state.error || '面板载入失败'} onRetry={() => void store.actions.init()} />}
      {state.status === 'empty' && <BlankEmpty />}
      {state.status === 'ready' && !state.activeKey && <ProjectList store={store} />}
      {state.status === 'ready' && state.activeKey && (
        <div className="ppt-workbench">
          {/* 左栏：缩略图条（默认展开，可收起，收起不渲染） */}
          {leftOpen ? (
            <div className="ppt-rail ppt-rail-left">
              <ThumbStrip store={store} />
              <button
                type="button"
                className="ppt-rail-collapse ppt-rail-collapse-left"
                onClick={() => setLeftOpen(false)}
                title="收起页列表"
                aria-label="收起页列表"
              >
                ‹
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="ppt-rail-handle ppt-rail-handle-left"
              onClick={() => setLeftOpen(true)}
              title="展开页列表"
              aria-label="展开页列表"
            >
              ›
            </button>
          )}

          <Stage store={store} />

          {/* 右栏：属性面板（选中元素才展开，可收起，收起不渲染） */}
          {rightOpen ? (
            <div className="ppt-rail ppt-rail-right">
              <Inspector store={store} onCollapse={closeRight} />
            </div>
          ) : selectedId ? (
            <button
              type="button"
              className="ppt-rail-handle ppt-rail-handle-right"
              onClick={() => {
                rightDismissed.current = false
                setRightOpen(true)
              }}
              title="展开属性面板"
              aria-label="展开属性面板"
            >
              ‹
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
