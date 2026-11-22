/**
 * PlanDrawer — 规划契约抽屉（brief.md + plan.yml 只读视图）。
 *
 * 挂在 Toolbar「规划」按钮上，覆盖在画布之上（与 HistoryDrawer 同位）。
 * 内容来自 store 的 plan/brief 快照（GET /project 顺带透传），只读展示：
 * 修改规划走 ppt_plan 工具（模型侧），面板不做第二个写入口。
 */

import * as React from 'react'
import type { PptStore } from '../store'

export function PlanDrawer({ store, onClose }: { store: PptStore; onClose: () => void }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const plan = state.plan
  const brief = state.brief
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    // 打开即把焦点移进抽屉，关闭时还给触发它的按钮。
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    rootRef.current?.focus()
    return () => opener?.focus()
  }, [])

  return (
    <div
      ref={rootRef}
      className="ppt-plan-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="规划契约"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="ppt-plan-head">
        <strong>规划契约</strong>
        <span className="ppt-plan-status" data-status={plan?.status ?? 'none'}>
          {plan ? (plan.status === 'confirmed' ? '已确认' : '草稿') : '未写规划'}
        </span>
        <span className="ppt-spacer" />
        <button type="button" className="ppt-btn" onClick={onClose}>
          收起
        </button>
      </div>
      <div className="ppt-plan-body">
        <section>
          <h4>简报（brief.md）</h4>
          {brief ? (
            <pre className="ppt-plan-brief">{brief}</pre>
          ) : (
            <p className="ppt-plan-empty">还没有简报。让模型用 ppt_plan setBrief 写入。</p>
          )}
        </section>
        <section>
          <h4>页面计划（plan.yml）</h4>
          {plan && Array.isArray(plan.pages) && plan.pages.length ? (
            <table className="ppt-plan-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>页文件</th>
                  <th>标题</th>
                  <th>轨道</th>
                  <th>意图</th>
                </tr>
              </thead>
              <tbody>
                {plan.pages.map((p, i) => (
                  <tr key={p.page}>
                    <td>{i + 1}</td>
                    <td>
                      <code>{p.page}</code>
                    </td>
                    <td>{p.title ?? ''}</td>
                    <td>{p.type === 'svg' ? 'SVG' : '原生'}</td>
                    <td>{p.intent ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="ppt-plan-empty">还没有页面计划。让模型用 ppt_plan setPlan 写入。</p>
          )}
        </section>
      </div>
    </div>
  )
}
