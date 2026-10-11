/**
 * Toolbar：顶栏（撤销 / 重做 / 导出 / 刷新）＋冲突 / 外部修改 / 保存态横幅。
 *
 * 「精确预览」按钮（计划 §6）：导出 → Blob 让浏览器自己下，渲染是宿主的活
 * （POST /export 一次走完整 build → pptx，本意就是给用户拿去 PowerPoint/WPS 核对）。
 * `stage` 这一杆成功才会刷 banner；409 冲突时不再让用户乱点导出按钮（先消化横幅）。
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { ExportGlyph, PptMark, RedoGlyph, UndoGlyph } from '../icons'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.pptx') ? filename : `${filename}.pptx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function Toolbar({ store }: { store: PptStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const disabled = !state.activeKey || state.saving
  const inConflict = Boolean(state.conflict || state.externalChange)
  const filename = `${state.activeKey || 'deck'}.pptx`

  const onExport = async () => {
    const res = await store.actions.exportDeck()
    if (res) triggerDownload(res.blob, res.filename)
  }

  return (
    <>
      <div className="ppt-toolbar">
        <span className="ppt-brand">
          <PptMark size={14} />
          <span>PPT 工作台</span>
        </span>
        {state.activeKey ? (
          <span className="ppt-toolbar-project">
            {state.activeKey}
            {state.deckPages.length ? ` · ${state.deckPages.length} 页` : ''}
            {' · rev '}
            {state.lastSeenRevision}
            {state.draft?.ops.length ? ` · 草稿 ${state.draft.ops.length}` : ''}
          </span>
        ) : null}
        <span className="ppt-spacer" />
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
          title="导出 .pptx：走完整 build + libreoffice-kit，浏览器自起下载"
        >
          <ExportGlyph size={13} /> 导出 .pptx
        </button>
      </div>
      {state.saving ? <div className="ppt-banner">正在保存…</div> : null}
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
