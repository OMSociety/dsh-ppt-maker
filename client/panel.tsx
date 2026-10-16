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
 * 两栏收起策略不同，且收起时都不渲染对应组件（不占渲染开销）：
 *   - 左栏「收起留把手」（16px 细条），默认展开，点把手收起/展开；
 *   - 右栏「收起即完全消失，不留把手」——只有选中元素才渲染属性面板；取消选择（点空白）
 *     或点面板头的收起钮即消失。再展开的唯一入口是点选元素：改选别的元素自动弹开，
 *     手动收起后本次选中不再弹开，直到改选。
 *
 * 「精确预览」即「导出 .pptx」（Toolbar 按钮）——宿主一次性走完 buildProjectDeck →
 * libreoffice-kit 渲页，不在面板里另起炉灶。
 */
import * as React from 'react'
import type { PptStore } from './store'
import { api, type OpenApplication } from './api'
import { PptMark, FolderGlyph } from './icons'
import { ProjectList } from './components/ProjectList'
import { ThumbStrip } from './components/ThumbStrip'
import { Stage } from './components/Stage'
import { Inspector } from './components/Inspector'
import { HistoryDrawer } from './components/HistoryDrawer'
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

/** 「加载中」态（还没拉过 /state；hint 非空时换成具体的等待原因）。 */
function BlankLoading({ hint }: { hint?: string | null }) {
  return (
    <div className="ppt-blank">
      <div className="ppt-blank-card">
        <div className="ppt-brand">
          <PptMark size={20} />
          <span>PPT 工作台</span>
        </div>
        <div className="ppt-sweep" aria-hidden="true" />
        <p>{hint || '正在打开工作台…'}</p>
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

/**
 * 页脚状态条（面板最后一行）：保存态与 store 的 toast 都落在这里。
 *
 * 用「常驻固定高度」而不是「有内容才出现的横幅」——保存是每次编辑都会发生的事，
 * 从顶栏弹出一条横幅会把画布整体顶下去（用户报的「每编辑一次页面弹动」就是这个）。
 * 常量高度 + 只换文字 = 出现/消失都不动布局。
 * toast 带 file（导出产物）时右侧出「打开 ▾」——与 DSH「已编辑」文件菜单同款的
 * 打开方式选择（关联应用 + 「显示文件位置」固定在底部）。
 */
function StatusBar({ store }: { store: PptStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const toast = state.toast
  const text = state.saving ? '正在保存…' : toast ? toast.text : ''
  const kind = !state.saving && toast?.kind === 'error' ? 'error' : 'info'
  const file = !state.saving && toast?.kind !== 'error' ? toast?.file : undefined
  return (
    <div className="ppt-statusbar" data-kind={kind} role="status" aria-live="polite">
      <span className="ppt-statusbar-text">{text}</span>
      {file && state.activeKey ? (
        <ExportOpenMenu file={file} sessionId={state.sessionId} sessionKey={state.activeKey} />
      ) : null}
    </div>
  )
}

/**
 * 导出产物的「打开方式」分体按钮：主按钮用默认关联应用打开，▾ 出菜单——
 * 关联应用列表（icon + （默认） 标注，来自 dsh-native-command，与 DSH 文件菜单同原语）、
 * 分隔线、「显示文件位置」固定底部。查询在首次点开时惰性发起并缓存。
 */
function ExportOpenMenu({
  file,
  sessionId,
  sessionKey,
}: {
  file: string
  sessionId: string
  sessionKey: string
}) {
  const [open, setOpen] = React.useState(false)
  const [apps, setApps] = React.useState<OpenApplication[] | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLSpanElement | null>(null)

  const load = React.useCallback(() => {
    setError(null)
    api
      .exportOpenMenu(sessionId, sessionKey, file)
      .then((res) => setApps(res.applications))
      .catch((err: unknown) => setError((err as Error).message))
  }, [sessionId, sessionKey, file])

  // 打开菜单 = 查询关联应用（同 DSH：点开才查，结果缓存）。
  React.useEffect(() => {
    if (open && apps === null && !error) load()
  }, [open, apps, error, load])

  // 菜单外点 / Escape 收起。
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const fire = async (opts?: { application?: string; action?: 'reveal' }) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await api.exportOpen(sessionId, sessionKey, file, opts)
      setOpen(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const fallback = apps !== null && apps.length === 0 && !error
  return (
    <span className="ppt-openwith" ref={rootRef}>
      <button
        type="button"
        className="ppt-openwith-btn"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        title={fallback ? '显示文件位置' : '打开导出的 .pptx'}
      >
        打开 {open ? '▴' : '▾'}
      </button>
      {open ? (
        <div className="ppt-openwith-menu" role="menu">
          {error ? <div className="ppt-openwith-note">{error}</div> : null}
          {!error && apps === null ? <div className="ppt-openwith-note">正在读取关联应用…</div> : null}
          {!error && apps
            ? apps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  role="menuitem"
                  className="ppt-openwith-item"
                  disabled={busy}
                  onClick={() => void fire({ application: app.id })}
                >
                  {app.icon ? <img className="ppt-openwith-icon" src={app.icon} alt="" /> : <span className="ppt-openwith-icon" />}
                  <span className="ppt-openwith-name">
                    {app.name}
                    {app.default ? <em className="ppt-openwith-default">（默认）</em> : null}
                  </span>
                </button>
              ))
            : null}
          {/* 一个关联应用都没有时主按钮退化为「显示文件位置」（DSH 同口径）。 */}
          <div className="ppt-openwith-sep" />
          <button
            type="button"
            role="menuitem"
            className="ppt-openwith-item"
            disabled={busy}
            onClick={() => void fire({ action: 'reveal' })}
          >
            <span className="ppt-openwith-icon">
              <FolderGlyph size={16} />
            </span>
            <span className="ppt-openwith-name">显示文件位置</span>
          </button>
        </div>
      ) : null}
    </span>
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
  // 版本历史抽屉：顶栏「历史」按钮开合；恢复成功后抽屉自己关。
  const [historyOpen, setHistoryOpen] = React.useState(false)
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
      <Toolbar store={store} historyOpen={historyOpen} onShowHistory={() => setHistoryOpen((v) => !v)} />
      {state.status === 'loading' && <BlankLoading hint={state.loadingHint} />}
      {state.status === 'error' && <BlankError error={state.error || '面板载入失败'} onRetry={() => void store.actions.init()} />}
      {state.status === 'empty' && <BlankEmpty />}
      {state.status === 'ready' && !state.activeKey && <ProjectList store={store} />}
      {state.status === 'ready' && state.activeKey && (
        <div className="ppt-workbench">
          {/* 左栏：缩略图条（默认展开，可收起，收起不渲染） */}
          {leftOpen ? (
            <div className="ppt-rail ppt-rail-left">
              <ThumbStrip
                store={store}
                headerAction={
                  <button
                    type="button"
                    className="ppt-rail-collapse"
                    onClick={() => setLeftOpen(false)}
                    title="收起页列表"
                    aria-label="收起页列表"
                  >
                    ‹
                  </button>
                }
              />
            </div>
          ) : (
            <button
              type="button"
              className="ppt-rail-handle ppt-rail-handle-left"
              onClick={() => setLeftOpen(true)}
              title="展开页列表"
              aria-label="展开页列表"
            >
              <span className="ppt-rail-handle-glyph">›</span>
            </button>
          )}

          <Stage store={store} />

          {/* 右栏：属性面板（选中元素才渲染；收起即完全消失，不留把手） */}
          {rightOpen ? (
            <div className="ppt-rail ppt-rail-right">
              <Inspector store={store} onCollapse={closeRight} />
            </div>
          ) : null}

          {/* 版本历史抽屉（覆盖在画布之上；预览只读，恢复走游标移动） */}
          {historyOpen ? <HistoryDrawer store={store} onClose={() => setHistoryOpen(false)} /> : null}
        </div>
      )}
      {state.status === 'ready' ? <StatusBar store={store} /> : null}
    </div>
  )
}
