/**
 * 面板样式：只用 DSH 主题变量 `--dsw-alias-*`（浅色/深色自动跟随），
 * 阴影例外走 `--dsw-shadow-lv1/2/3`（rc2 里没 `--dsw-alias-shadow*` 族，
 * 官方 `HoverCard.module.css` / `Toast.module.css` 用的就是它）。
 *
 * 别用旧名（ `--dsw-text-secondary` 之类）——当前 DSH 里那些 token 一个都不存在，
 * 写 var(--x, #666) 会在深色主题下退化成硬编码浅色，出现白块。
 *
 * 注释里**别出现反引号字符**——它会把模板字符串提前闭合，`tsc` 报 TS1005。
 */

export const STYLE_TAG_ID = 'dsh-ppt-maker/panel.css'

export const CSS = `
.ppt-root{
  display:flex;flex-direction:column;height:100%;min-height:0;
  color:var(--dsw-alias-label-primary);
  background:var(--dsw-alias-bg-layer-1);
  font-size:12px;line-height:1.6;
}
.ppt-root *{box-sizing:border-box}

/* ── 顶栏（S6 骨架只放品牌行，工具按钮 S9 再加）────────────── */
.ppt-toolbar{
  display:flex;align-items:center;gap:6px;
  padding:6px 8px;flex:none;border-bottom:1px solid var(--dsw-alias-border-l2);
}
.ppt-toolbar .ppt-spacer{flex:1 1 auto}

/* ── 主区（ThumbStrip | Stage | Inspector）──────────────────── */
.ppt-workbench{display:flex;flex:1 1 auto;min-height:0}
.ppt-thumbs{
  width:96px;flex:none;overflow-y:auto;
  border-right:1px solid var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-2);
  padding:6px;display:flex;flex-direction:column;gap:6px;
}
.ppt-stage{flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;padding:10px}
.ppt-inspector{
  width:180px;flex:none;overflow-y:auto;
  border-left:1px solid var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-2);padding:8px;
}

/* ── 空面板 / 载入中 / 错误 三态共用一张卡片 ────────────────── */
.ppt-blank{
  flex:1 1 auto;display:flex;align-items:center;justify-content:center;
  min-height:0;padding:16px;
}
.ppt-blank-card{
  display:flex;flex-direction:column;align-items:center;gap:8px;
  max-width:320px;padding:20px 18px;text-align:center;
}
.ppt-brand{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary)}
.ppt-blank p{margin:0;color:var(--dsw-alias-label-secondary)}
.ppt-actions-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px}

/* ── 通用按钮 ──────────────────────────────────────────────── */
.ppt-btn{
  font:inherit;color:var(--dsw-alias-label-secondary);background:transparent;
  border:1px solid transparent;border-radius:6px;padding:2px 7px;cursor:pointer;
  transition:color .15s ease,background-color .15s ease,border-color .15s ease;
  white-space:nowrap;display:inline-flex;align-items:center;gap:4px;
}
.ppt-btn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.ppt-btn:focus-visible{
  outline:none;color:var(--dsw-alias-label-primary);
  border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-interactive-bg-hover);
}
.ppt-btn[disabled]{opacity:.5;cursor:default}
.ppt-btn[disabled]:hover{color:var(--dsw-alias-label-secondary);background:transparent}
.ppt-btn-primary{
  color:var(--dsw-alias-label-primary-foreground);
  background:var(--dsw-alias-button-primary-fill);border-color:transparent;
}
.ppt-btn-primary:hover{color:var(--dsw-alias-label-primary-foreground);filter:brightness(1.06)}

/* ── 工程卡片列表（S6 占位：ProjectList 真组件在 S7，这里先把壳它穿）── */
.ppt-projlist{display:flex;flex-direction:column;width:100%;gap:8px;margin-top:10px}
.ppt-projrow{
  display:flex;flex-direction:column;gap:2px;align-items:stretch;
  padding:6px 8px;border-radius:7px;cursor:pointer;
  border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);
  color:var(--dsw-alias-label-primary);text-align:left;font:inherit;
  transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease;
}
.ppt-projrow:hover{
  border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-interactive-bg-hover);
}
.ppt-projrow:focus-visible{
  outline:none;border-color:var(--dsw-alias-border-l1);
  box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover);
}
.ppt-projrow-title{
  display:flex;align-items:center;gap:6px;min-width:0;
  font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.ppt-projrow-meta{
  display:flex;align-items:center;gap:6px;font-size:11px;
  color:var(--dsw-alias-label-secondary);
}

/* ── 提示横幅（保存态 / 冲突 / 外部已修改）────────────────── */
.ppt-banner{
  display:flex;align-items:center;gap:6px;flex:none;
  padding:5px 8px;font-size:11.5px;
  color:var(--dsw-alias-label-secondary);
  border-bottom:1px solid var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-2);
}
.ppt-banner[data-kind="error"]{color:var(--dsw-alias-label-status-error, var(--dsw-alias-label-primary))}
.ppt-banner .ppt-btn{padding:1px 6px;font-size:11.5px}

/* ── 载入中扫光（占位面板「正在打开…」用）──────────────────── */
.ppt-sweep{
  width:120px;height:2px;border-radius:1px;overflow:hidden;
  background:var(--dsw-alias-bg-layer-2);
}
.ppt-sweep::before{
  content:'';display:block;height:100%;width:40%;
  background:var(--dsw-alias-interactive-bg-hover);
  animation:ppt-sweep 1.2s ease-in-out infinite;
}
@keyframes ppt-sweep{
  0%{transform:translateX(-100%)}
  100%{transform:translateX(300%)}
}

/* ── 标签页 chip 的品牌标 ──────────────────────────────────── */
.ppt-title-label{display:inline-flex;align-items:center;gap:5px}
.ppt-title-glyph{flex:none}

/* ── ThumbStrip（页缩略图竖条）────────────────────────────── */
.ppt-thumblist{display:flex;flex-direction:column;gap:2px}
.ppt-thumbrow{position:relative;display:flex;flex-direction:column;gap:0}
.ppt-thumbrow-on .ppt-thumb{border-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-shadow-lv1)}
.ppt-thumbrow-dragging{opacity:.4}
.ppt-thumb{
  display:block;width:100%;padding:0;border:1px solid var(--dsw-alias-border-l2);
  border-radius:4px;overflow:hidden;background:var(--dsw-alias-bg-layer-1);
  cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease;position:relative;
  aspect-ratio:16/9;
}
.ppt-thumb:focus-visible{outline:none;border-color:var(--dsw-alias-border-l1);box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover)}
.ppt-thumb-img{width:100%;height:100%;object-fit:cover;display:block}
.ppt-thumb-preview-placeholder{
  width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  color:var(--dsw-alias-label-secondary);font-size:10px;
}
.ppt-thumb-skeleton{position:absolute;inset:0;animation:ppt-sweep 1.2s ease-in-out infinite;background:var(--dsw-alias-bg-layer-2)}
.ppt-thumb-num{position:relative;z-index:1}
.ppt-thumb-actions{
  position:absolute;top:2px;right:2px;display:flex;gap:2px;opacity:0;
  transition:opacity .12s ease;
}
.ppt-thumbrow:hover .ppt-thumb-actions,
.ppt-thumbrow:focus-within .ppt-thumb-actions{opacity:1}
.ppt-thumb-action{
  padding:1px 4px;font-size:10px;
  background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);
  border-radius:3px;color:var(--dsw-alias-label-secondary);
  box-shadow:var(--dsw-shadow-lv1);
}
.ppt-thumb-action:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.ppt-thumb-gap{height:3px;margin:0 -2px;border-radius:1px;transition:background-color .1s ease}
.ppt-thumb-gap-over{background:var(--dsw-alias-interactive-bg-hover)}

/* ── Stage（画布 + 透明选择框 + 就地编辑器）──────────────── */
.ppt-stage-canvas{position:relative;box-shadow:var(--dsw-shadow-lv2);border:1px solid var(--dsw-alias-border-l2)}
.ppt-stage-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
.ppt-stage-loadthumb{
  position:absolute;inset:0;width:100%;height:100%;
  border:none;background:transparent;color:var(--dsw-alias-label-secondary);
  font-size:11px;cursor:pointer;
}
.ppt-stage-loadthumb:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.ppt-stage-empty{width:100%;height:100%}
.ppt-overlay{position:absolute;inset:0;pointer-events:none}
.ppt-element{
  position:absolute;pointer-events:auto;cursor:pointer;
  border:1px dashed transparent;transition:border-color .12s ease,background-color .12s ease;
  box-sizing:border-box;
}
.ppt-element:hover{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-interactive-bg-hover)}
.ppt-element-on{border-color:var(--dsw-alias-border-l1);border-style:solid;background:transparent}
.ppt-element-on:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover)}
.ppt-element-text{cursor:text}

/* ── 就地编辑器（盖在 Stage 上，bounds 与元素对齐）────────── */
.ppt-textedit{
  position:absolute;z-index:10;display:flex;
  padding:2px;margin:0;border:1px solid var(--dsw-alias-border-l1);
  border-radius:2px;background:var(--dsw-alias-bg-layer-1);
  color:var(--dsw-alias-label-primary);font:inherit;outline:none;
  box-shadow:var(--dsw-shadow-lv2);white-space:pre-wrap;overflow:hidden;
}

/* ── Inspector（属性面板）────────────────────────────────── */
.ppt-inspector-head{
  display:flex;align-items:center;gap:6px;
  padding-bottom:6px;margin-bottom:8px;border-bottom:1px solid var(--dsw-alias-border-l2);
}
.ppt-inspector-tag{
  font-size:10px;padding:0 5px;border-radius:3px;
  background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);
  color:var(--dsw-alias-label-secondary);
}
.ppt-inspector-empty{font-size:11px;color:var(--dsw-alias-label-secondary);margin:0 0 8px}
.ppt-inspector-row{display:flex;flex-direction:column;gap:3px;margin:0 0 10px;font-size:11px}
.ppt-inspector-row > span{color:var(--dsw-alias-label-secondary)}
.ppt-inspector-row textarea,
.ppt-inspector-row input[type='number'],
.ppt-inspector-row select{
  font:inherit;font-size:12px;color:var(--dsw-alias-label-primary);
  background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);
  border-radius:4px;padding:3px 6px;resize:vertical;
}
.ppt-inspector-row textarea:focus-visible,
.ppt-inspector-row input:focus-visible,
.ppt-inspector-row select:focus-visible{
  outline:none;border-color:var(--dsw-alias-border-l1);box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover);
}
.ppt-inspector-row input[type='color']{
  width:32px;height:22px;padding:0;border:1px solid var(--dsw-alias-border-l2);
  border-radius:3px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;
}
.ppt-inspector-row input[type='file']{font-size:11px;color:var(--dsw-alias-label-secondary)}
.ppt-inspector-pair{display:flex;gap:4px}
.ppt-inspector-pair select{flex:1 1 0;min-width:0}
.ppt-inspector-bounds{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.ppt-inspector-bounds label{display:flex;align-items:center;gap:4px;font-size:11px}
.ppt-inspector-bounds input{flex:1 1 auto;min-width:0;width:100%}
.ppt-inspector-hint{
  display:flex;align-items:center;gap:4px;font-size:10px;
  color:var(--dsw-alias-label-secondary);
}
`

/** 幂等注入样式表（重复挂载只插一次；HMR 卸载由调用方决定是否移除）。 */
export function ensureStyles(doc: Document = document): () => void {
  const selector = `style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`
  if (doc.querySelector(selector)) return () => {}
  const tag = doc.createElement('style')
  tag.dataset.plugin = 'dsh-ppt-maker'
  tag.dataset.pluginCss = STYLE_TAG_ID
  tag.textContent = CSS
  doc.head.appendChild(tag)
  return () => tag.remove()
}
