/**
 * README 预览入口：直接运行工作台的 SkeletonPanel / store / PptdView。
 * 只有宿主 HTTP API 由本地 fixture 应答；组件、样式和页面数据均与真实工作台一致。
 */
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { SkeletonPanel, Title } from '../../client/panel'
import { createPptStore } from '../../client/store'
import { CSS, STYLE_TAG_ID } from '../../client/styles'
import fixture from '../../docs/preview/fixture.json'

interface PreviewFixture {
  key: string
  state: Record<string, unknown>
  project: Record<string, unknown>
  pages: Record<string, { path: string; page: unknown; revision: number }>
  media: Record<string, string>
}

const data = fixture as PreviewFixture

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

// 只替换传输层：store 仍通过正式 api.ts 的 URL 与回包契约取数。
window.fetch = async (input: RequestInfo | URL): Promise<Response> => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const url = new URL(raw, window.location.href)
  const route = url.pathname.replace(/^.*\/ppt-maker\/api/, '')
  if (route === '/state') return json({ ok: true, ...data.state })
  if (route === '/project') return json({ ok: true, ...data.project })
  if (route === '/page') {
    const page = data.pages[url.searchParams.get('page') || '']
    return page ? json({ ok: true, ...page }) : json({ ok: false, error: '预览页不存在' }, 404)
  }
  if (route === '/media') {
    const source = data.media[url.searchParams.get('src') || '']
    return source === undefined
      ? new Response('Not found', { status: 404 })
      : new Response(source, { headers: { 'content-type': 'image/svg+xml' } })
  }
  return json({ ok: false, error: `预览为只读模式：${route}` }, 405)
}

const style = document.createElement('style')
style.id = STYLE_TAG_ID
style.textContent = CSS
document.head.appendChild(style)

const previewParams = new URLSearchParams(window.location.hash.slice(1))
const previewTheme = previewParams.get('theme') === 'light' ? 'light' : 'dark'
const requestedPage = Number(previewParams.get('page') ?? (previewTheme === 'light' ? 0 : 1))
const previewPage = Number.isInteger(requestedPage) ? Math.max(0, Math.min(2, requestedPage)) : 1
document.body.dataset.dshTheme = previewTheme

function HostGlyph({ children }: { children: React.ReactNode }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}

// DSH dockkit 的标签页结构与尺寸；标签标题直接复用工作台自己的 Title。
function HostTabStrip() {
  return (
    <div className="dsh-preview-tabStrip">
      <div className="dsh-preview-stripTabs">
        <div className="dsh-preview-tab dsh-preview-tabActive">
          <div className="dsh-preview-tabTitle"><Title /></div>
          <button type="button" className="dsh-preview-tabClose" tabIndex={-1} aria-label="关闭标签页"><HostGlyph><path d="m4 4 8 8M12 4l-8 8" /></HostGlyph></button>
        </div>
      </div>
      <button type="button" className="dsh-preview-iconButton" tabIndex={-1} aria-label="新建标签页"><HostGlyph><path d="M8 3v10M3 8h10" /></HostGlyph></button>
      <div className="dsh-preview-stripFill" />
      <button type="button" className="dsh-preview-iconButton" tabIndex={-1} aria-label="拆分面板"><HostGlyph><rect x="2" y="3" width="12" height="10" rx="1" /><path d="M8 3v10" /></HostGlyph></button>
      <div className="dsh-preview-stripChrome">
        <button type="button" className="dsh-preview-iconButton" tabIndex={-1} aria-label="展开面板"><HostGlyph><path d="M6 3H3v3M10 3h3v3M3 10v3h3M13 10v3h-3" /></HostGlyph></button>
        <button type="button" className="dsh-preview-iconButton" tabIndex={-1} aria-label="更多"><HostGlyph><path d="M4 8h.01M8 8h.01M12 8h.01" strokeWidth="2.4" /></HostGlyph></button>
      </div>
    </div>
  )
}

// DSH design-platform 主题 token；工作台组件样式来自上面的正式 CSS。
const hostTheme = document.createElement('style')
hostTheme.textContent = `
  :root { --dsw-radius-sm: 8px; }
  body[data-dsh-theme='light'] {
    color-scheme: light;
    --dsw-alias-bg-base: #fff;
    --dsw-alias-bg-layer-1: #fff;
    --dsw-alias-bg-layer-2: #fff;
    --dsw-alias-bg-sunken: #f1f3f5;
    --dsw-alias-label-primary: rgb(15,17,21);
    --dsw-alias-label-secondary: rgb(97,102,107);
    --dsw-alias-label-primary-foreground: #fff;
    --dsw-alias-border-l1: rgba(0,0,0,.04);
    --dsw-alias-border-l2: rgba(0,0,0,.1);
    --dsw-alias-interactive-bg-hover: rgba(38,49,72,.06);
    --dsw-alias-interactive-bg-active: rgba(38,49,72,.1);
    --dsw-alias-button-primary-fill: rgb(15,17,21);
    --dsw-alias-markdown-tag: rgb(241,243,245);
    --dsw-alias-label-status-success: #15803d;
    --dsw-alias-label-status-error: #dc2626;
    --dsw-shadow-lv1: 0 1px 3px rgba(15,23,42,.12);
    --dsw-shadow-lv2: 0 5px 18px rgba(15,23,42,.16);
  }
  body[data-dsh-theme='dark'] {
    color-scheme: dark;
    --dsw-alias-bg-base: rgb(21,21,23);
    --dsw-alias-bg-layer-1: rgb(35,35,36);
    --dsw-alias-bg-layer-2: rgb(44,44,46);
    --dsw-alias-bg-sunken: rgb(15,17,21);
    --dsw-alias-label-primary: rgb(249,250,251);
    --dsw-alias-label-secondary: rgb(207,211,214);
    --dsw-alias-label-primary-foreground: rgb(15,17,21);
    --dsw-alias-border-l1: rgba(255,255,255,.06);
    --dsw-alias-border-l2: rgba(255,255,255,.12);
    --dsw-alias-interactive-bg-hover: rgba(255,255,255,.08);
    --dsw-alias-interactive-bg-active: rgba(255,255,255,.14);
    --dsw-alias-button-primary-fill: rgb(249,250,251);
    --dsw-alias-markdown-tag: rgb(44,44,46);
    --dsw-alias-label-status-success: #4ade80;
    --dsw-alias-label-status-error: #f87171;
    --dsw-shadow-lv1: 0 1px 3px rgba(0,0,0,.28);
    --dsw-shadow-lv2: 0 5px 18px rgba(0,0,0,.36);
  }
  html, body, #root { width: 100%; height: 100%; margin: 0; overflow: hidden; }
  body {
    background: var(--dsw-alias-bg-base);
    color: var(--dsw-alias-label-primary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  button, input, textarea { font-family: inherit; }
  .dsh-preview-shell { display: flex; flex-direction: column; width: 100%; height: 100%; }
  .dsh-preview-panel { flex: 1; min-height: 0; }
  .dsh-preview-tabStrip {
    display: flex; flex: none; align-items: center; gap: 4px;
    height: 38px; padding: 10px 6px 0 10px;
    background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary);
    font-size: 13px; line-height: 1.45; user-select: none;
  }
  .dsh-preview-stripTabs { display: flex; align-items: center; gap: 4px; flex: 0 1 auto; min-width: 0; }
  .dsh-preview-tab {
    position: relative; display: flex; align-items: center; gap: 6px;
    height: 28px; min-width: 80px; max-width: 170px; padding: 0 10px;
    border-radius: var(--dsw-radius-sm) var(--dsw-radius-sm) 0 0;
  }
  .dsh-preview-tabActive { background: var(--dsw-alias-markdown-tag); color: var(--dsw-alias-label-primary); }
  .dsh-preview-tabTitle { flex: 1; min-width: 0; display: flex; align-items: center; gap: 5px; overflow: hidden; white-space: nowrap; }
  .dsh-preview-tabTitle .ppt-title-label { overflow: hidden; text-overflow: ellipsis; }
  .dsh-preview-tabClose {
    display: flex; align-items: center; justify-content: center; flex: none;
    width: 20px; height: 20px; padding: 0; border: 0; border-radius: 4px;
    background: transparent; color: inherit; cursor: default;
  }
  .dsh-preview-tabClose svg { width: 12px; height: 12px; }
  .dsh-preview-stripFill { flex: 1; min-width: 8px; }
  .dsh-preview-stripChrome { display: flex; align-items: center; gap: 4px; }
  .dsh-preview-iconButton {
    display: inline-flex; align-items: center; justify-content: center; flex: none;
    width: 28px; height: 28px; padding: 0; border: 0; border-radius: 4px;
    background: transparent; color: var(--dsw-alias-label-secondary); cursor: default;
  }
`
document.head.appendChild(hostTheme)

const store = createPptStore('preview')
const root = createRoot(document.getElementById('root')!)
root.render(
  <div className="dsh-preview-shell">
    <HostTabStrip />
    <div className="dsh-preview-panel"><SkeletonPanel store={store} /></div>
  </div>,
)

async function settlePreview(): Promise<void> {
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    const state = store.getSnapshot()
    if (state.status === 'ready' && state.activeKey) {
      if (state.currentPage !== previewPage) store.actions.setPage(previewPage)
      await Promise.all(state.deckPages.map((_, index) => store.actions.ensurePageAst(index)))
      await store.actions.ensurePageLoaded()
      const settled =
        state.currentPage === previewPage &&
        state.currentPageData !== null &&
        state.currentPageRevision === state.lastSeenRevision &&
        state.deckPages.every((_, index) => Boolean(store.getSnapshot().pagesAst[index]))
      if (settled) break
    }
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  await Promise.all(
    Array.from(document.images).map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
    ),
  )
  document.documentElement.dataset.previewReady = 'true'
}

void settlePreview()
