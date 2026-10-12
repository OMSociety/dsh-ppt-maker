/**
 * ProjectList：本会话已登记工程的卡片列表 + 「导入 .pptx 提示」。
 *
 * 面板还没有合适的「导入」入口——导入是模型调 ppt_import 的活，
 * 这里做的是**清空态** + 选择已有工程（切换走 store.actions.openProject）。
 * 每行卡片带上页数 / revision / 路径梗（key 后缀），并响应点击换工程。
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { PptMark, ImportGlyph } from '../icons'

export function ProjectList({ store }: { store: PptStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)

  if (!state.projects.length) {
    return (
      <div className="ppt-blank">
        <div className="ppt-blank-card">
          <div className="ppt-brand">
            <PptMark size={20} />
            <span>PPT 工作台</span>
          </div>
          <p>本会话还没有登记过任何演示文稿工程。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ppt-blank">
      <div className="ppt-blank-card">
        <div className="ppt-brand">
          <PptMark size={20} />
          <span>PPT 工作台</span>
        </div>
        <p>点一份继续编辑；或者让模型 <strong>ppt_open</strong>。</p>
        <div className="ppt-projlist" role="list">
          {state.projects.map((proj) => {
            const active = proj.key === state.activeKey
            return (
              <button
                key={proj.key}
                type="button"
                className="ppt-projrow"
                data-active={active ? 'true' : 'false'}
                onClick={() => void store.actions.openProject(proj.key)}
                aria-pressed={active}
              >
                <span className="ppt-projrow-title">
                  <PptMark size={14} />
                  {proj.dir}
                </span>
                <span className="ppt-projrow-meta">
                  key {proj.key}
                </span>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--dsw-alias-label-secondary)', marginTop: 10 }}>
          <ImportGlyph size={11} style={{ verticalAlign: -1 }} /> 导入 .pptx → 走模型工具（ppt_import / ppt_open）
        </p>
      </div>
    </div>
  )
}
