/**
 * Toolbar：顶栏（撤销 / 重做 / 导出 / 刷新）＋冲突 / 外部修改 / 保存态横幅。
 *
 * 「导出 .pptx」：POST /export 一次走完整 build → pptx，由宿主落到工程目录 `export/` 下，
 * 面板只把落点报给用户（桌面外壳的下载没有可回读的落点，不做浏览器下载）。
 * `stage` 这一杆成功才会刷 banner；409 冲突时不再让用户乱点导出按钮（先消化横幅）。
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { ExportGlyph, HistoryGlyph, RedoGlyph, UndoGlyph } from '../icons'

export function Toolbar({
  store,
  historyOpen,
  onShowHistory,
}: {
  store: PptStore
  historyOpen?: boolean
  onShowHistory?: () => void
}) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const disabled = !state.activeKey || state.saving
  const inConflict = Boolean(state.conflict || state.externalChange)

  const onExport = async () => {
    await store.actions.exportDeck()
  }

  return (
    <>
      <div className="ppt-toolbar">
        {state.activeKey ? (
          <span className="ppt-toolbar-project">
            <strong>{(state.deck as { title?: string } | null)?.title ?? state.activeKey}</strong>
            {state.deckPages.length ? <span className="ppt-toolbar-meta">{state.deckPages.length} 页</span> : null}
            <span className="ppt-toolbar-meta">第 {state.lastSeenRevision} 版</span>
            {state.draft?.ops.length ? <span className="ppt-toolbar-meta">草稿 {state.draft.ops.length}</span> : null}
          </span>
        ) : null}
        <span className="ppt-spacer" />
        <button
          type="button"
          className={`ppt-btn${historyOpen ? ' ppt-btn-on' : ''}`}
          disabled={disabled}
          onClick={() => onShowHistory?.()}
          title="版本历史：预览并恢复到任意历史版本（再点一次收起）"
        >
          <HistoryGlyph size={13} /> 历史
        </button>
        <button
          type="button"
          className="ppt-btn"
          disabled={disabled || !state.canUndo}
          onClick={() => void store.actions.undo()}
          title="撤销（先提交草稿再撤）"
        >
          <UndoGlyph size={13} /> 撤销
        </button>
        <button
          type="button"
          className="ppt-btn"
          disabled={disabled || !state.canRedo}
          onClick={() => void store.actions.redo()}
        >
          <RedoGlyph size={13} /> 重做
        </button>
        <button
          type="button"
          className="ppt-btn"
          disabled={disabled || inConflict}
          onClick={() => void onExport()}
          title="导出 .pptx 到工程目录的 export/ 下"
        >
          <ExportGlyph size={13} /> 导出 .pptx
        </button>
      </div>
      {state.conflict ? (
        <div className="ppt-banner" data-kind="error">
          和服务端冲突了（服务端已改到 rev {state.conflict.revision}）。
          <button type="button" className="ppt-btn ppt-btn-primary" onClick={() => void store.actions.applyDraft()}>
            重试
          </button>
          <button type="button" className="ppt-btn" onClick={() => void store.actions.resolveConflictTheirs()}>
            采用服务端版本
          </button>
        </div>
      ) : null}
      {state.externalChange ? (
        <div className="ppt-banner">
          外部已修改（rev {state.externalChange.revision}）。
          <button type="button" className="ppt-btn" onClick={() => void store.actions.acceptExternal()}>
            拉取服务端版本（丢弃本地草稿）
          </button>
        </div>
      ) : null}
      {state.error && state.status === 'ready' ? (
        <div className="ppt-banner" data-kind="error">
          {state.error}
        </div>
      ) : null}
    </>
  )
}
