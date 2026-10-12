/**
 * 工作台容器：Toolbar + 三栏（ThumbStrip | Stage | Inspector）。
 *
 * 视图只管读 store 快照 + 调 actions，不自己发请求、不自己记时序——那是 `store.ts` 的活。
 * 组件分布（PR2 计划 §4）：
 *   - Toolbar.tsx      撤销/重做/导出/冲突条
 *   - ProjectList.tsx  没打开工程时的工程卡片列表（含「让模型导入」引导）
 *   - ThumbStrip.tsx   页缩略图竖条：点选 / HTML5 拖拽排序 / 复制-删除-新增页
 *   - Stage.tsx        画布：GET /thumb?rev=N 渲出 PNG + ElementOverlay 透明选择框 + TextEditor 就地编辑
 *   - Inspector.tsx    属性面板：文字/字号/颜色/对齐/bounds/替换图片
 *
 * 「精确预览」即「导出 .pptx」（Toolbar 按钮）——发源于计划 §6，宿主一次性走完
 * buildProjectDeck → libreoffice-kit 渲页，不在面板里另起炉灶。
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

  return (
    <div className="ppt-root">
      <Toolbar store={store} />
      {state.status === 'loading' && <BlankLoading />}
      {state.status === 'error' && <BlankError error={state.error || '面板载入失败'} onRetry={() => void store.actions.init()} />}
      {state.status === 'empty' && <BlankEmpty />}
      {state.status === 'ready' && !state.activeKey && <ProjectList store={store} />}
      {state.status === 'ready' && state.activeKey && (
        <div className="ppt-workbench">
          <ThumbStrip store={store} />
          <Stage store={store} />
          <Inspector store={store} />
        </div>
      )}
    </div>
  )
}
