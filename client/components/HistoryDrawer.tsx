/**
 * 版本历史抽屉：列表（新→旧）+ 画布直渲预览 + 「恢复到此版本」。
 *
 * 预览走 PptdView（与 Stage 同一渲染器）——不碰 libreoffice-kit（无冷启动、无本机
 * 光栅化裁切缺陷），也绝不写工程文件（读 /history/pages 的解析结果）。
 * 恢复 = 游标移动（store.actions.restoreRevision），与撤销/重做同一条 revision 基线。
 */
import * as React from 'react'
import { api, type HistoryEntry } from '../api'
import type { PptStore } from '../store'
import { PptdView, type PptdPage } from './PptdView'

interface PreviewState {
  size: [number, number]
  pages: PptdPage[]
  warnings: string[]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function opsSummary(entry: HistoryEntry): string {
  const head = entry.ops.slice(0, 3).join('、')
  const more = entry.ops.length > 3 ? ` 等 ${entry.ops.length} 项` : ''
  const merged = entry.mergedCount > 0 ? `（合并 ${entry.mergedCount} 次编辑）` : ''
  return `${head || '（创建）'}${more}${merged}`
}

export function HistoryDrawer({ store, onClose }: { store: PptStore; onClose: () => void }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [entries, setEntries] = React.useState<HistoryEntry[] | null>(null)
  const [cursor, setCursor] = React.useState(0)
  const [selected, setSelected] = React.useState<number | null>(null)
  const [preview, setPreview] = React.useState<PreviewState | null>(null)
  const [previewPage, setPreviewPage] = React.useState(0)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const key = state.activeKey
  const sessionId = state.sessionId

  React.useEffect(() => {
    let cancelled = false
    if (!key) return
    api
      .listHistory(sessionId, key)
      .then((res) => {
        if (cancelled) return
        setCursor(res.revision)
        setEntries([...res.entries].sort((a, b) => b.revision - a.revision))
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(`历史列表拉取失败：${(err as Error).message}`)
      })
    return () => {
      cancelled = true
    }
  }, [key, sessionId])

  const pick = (revision: number) => {
    if (!key || revision === selected) return
    setSelected(revision)
    setPreview(null)
    setPreviewPage(0)
    setError(null)
    api
      .getHistoryPages(sessionId, key, revision)
      .then((snap) => {
        setPreview({
          size: snap.deck?.size ?? [960, 540],
          pages: snap.pages.map((p) => (p.page ?? {}) as PptdPage),
          warnings: snap.warnings,
        })
      })
      .catch((err: unknown) => setError(`快照读取失败：${(err as Error).message}`))
  }

  const restore = async () => {
    if (selected === null || busy || selected === cursor) return
    setBusy(true)
    try {
      const ok = await store.actions.restoreRevision(selected)
      if (ok) onClose()
    } finally {
      setBusy(false)
    }
  }

  const pageCount = preview?.pages.length ?? 0

  return (
    <div className="ppt-history" role="dialog" aria-label="版本历史">
      <div className="ppt-history-head">
        <strong>版本历史</strong>
        <span className="ppt-history-head-meta">当前 r{cursor}</span>
        <span className="ppt-spacer" />
        <button
          type="button"
          className="ppt-history-close"
          onClick={onClose}
          aria-label="关闭版本历史"
          title="关闭"
        >
          ×
        </button>
      </div>

      {error ? <div className="ppt-history-error">{error}</div> : null}

      {selected !== null ? (
        <div className="ppt-history-preview">
          {preview ? (
            <>
              <PptdView
                page={preview.pages[previewPage] ?? null}
                size={preview.size}
                resolveMedia={(src) => store.actions.mediaUrl(src)}
                className="ppt-history-pptd"
              />
              {pageCount > 1 ? (
                <div className="ppt-history-pager">
                  <button
                    type="button"
                    className="ppt-btn"
                    disabled={previewPage <= 0}
                    onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                  >
                    ‹
                  </button>
                  <span>
                    {previewPage + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    className="ppt-btn"
                    disabled={previewPage >= pageCount - 1}
                    onClick={() => setPreviewPage((p) => Math.min(pageCount - 1, p + 1))}
                  >
                    ›
                  </button>
                </div>
              ) : null}
              {preview.warnings.length > 0 ? (
                <div className="ppt-history-warn" title={preview.warnings.join('\n')}>
                  快照含 {preview.warnings.length} 条解析警告
                </div>
              ) : null}
            </>
          ) : (
            <div className="ppt-history-loading">正在读取 r{selected}…</div>
          )}
          <div className="ppt-history-actions">
            <button
              type="button"
              className="ppt-btn ppt-btn-primary"
              disabled={busy || selected === cursor}
              onClick={() => void restore()}
              title={selected === cursor ? '目标就是当前版本' : '把工程恢复到这个版本（与撤销同一套游标语义）'}
            >
              {busy ? '恢复中…' : `恢复到此版本（r${selected}）`}
            </button>
          </div>
        </div>
      ) : (
        <div className="ppt-history-hint">点下面的版本号看预览。</div>
      )}

      <div className="ppt-history-list">
        {entries === null ? (
          <div className="ppt-history-loading">正在读取历史…</div>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.revision}
              type="button"
              className={`ppt-history-row${selected === entry.revision ? ' ppt-history-row-on' : ''}`}
              onClick={() => pick(entry.revision)}
            >
              <span className="ppt-history-rev">
                r{entry.revision}
                {entry.anchor ? <em className="ppt-history-tag">锚点</em> : null}
                {entry.revision === cursor ? <em className="ppt-history-tag ppt-history-tag-on">当前</em> : null}
              </span>
              <span className="ppt-history-ops">{opsSummary(entry)}</span>
              <span className="ppt-history-time">{formatTime(entry.createdAt)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
