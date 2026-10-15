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
  /* 内容区底色对齐宿主面板（浏览器/日程等）的 --dsw-alias-bg-base：
     深色 #151517 / 浅色 #fff，与别的面板内容区同底；标签栏仍由宿主负责。 */
  background:var(--dsw-alias-bg-base);
  font-size:12px;line-height:1.6;
}
.ppt-root *{box-sizing:border-box}

/* ── 顶栏（S6 骨架只放品牌行，工具按钮 S9 再加）────────────── */
.ppt-toolbar{
  display:flex;align-items:center;gap:6px;
  padding:6px 8px;flex:none;border-bottom:1px solid var(--dsw-alias-border-l2);
  /* toolbar 透明继承 root（bg-base），与浏览器面板的地址栏区域同底 */
}
.ppt-toolbar .ppt-spacer{flex:1 1 auto}
/* 工程信息：标题主色加粗，元信息（页数/版次/草稿）弱化、大间隔分隔（对齐 DSH 状态栏风格）。
   空间分配：标题先收缩（ellipsis），元信息保持完整；空间极端不足时 project 整体裁切，
   绝不溢出盖住右侧按钮。 */
.ppt-toolbar-project{display:inline-flex;align-items:baseline;gap:10px;min-width:0;flex:0 1 auto;overflow:hidden}
.ppt-toolbar-project strong{font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0}
.ppt-toolbar-meta{color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none}

/* ── 主区（ThumbStrip | Stage | Inspector，左右栏可收缩）───────── */
.ppt-workbench{display:flex;flex:1 1 auto;min-height:0;position:relative}
.ppt-thumbs{
  width:96px;flex:none;overflow-y:auto;
  border-right:1px solid var(--dsw-alias-border-l2);
  /* 透明继承 .ppt-root（sidebar-fill），与标签栏同底；分层交给边框线 */
  padding:6px;display:flex;flex-direction:column;gap:6px;
}
.ppt-stage{flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;padding:10px;min-height:0}
.ppt-inspector{
  width:180px;flex:none;overflow-y:auto;
  border-left:1px solid var(--dsw-alias-border-l2);
  padding:8px;
}

/* 左右栏容器（收起时不渲染内部组件，只留边缘把手） */
.ppt-rail{display:flex;flex:none;min-height:0;position:relative}
.ppt-rail-left{border-right:1px solid var(--dsw-alias-border-l2)}
.ppt-rail-right{border-left:1px solid var(--dsw-alias-border-l2)}
.ppt-rail .ppt-thumbs,.ppt-rail .ppt-inspector{border:none}
/* 栏内收起小按钮（与「新页」同处 .ppt-thumbs-head 一行，flex 居中对齐） */
.ppt-rail-collapse{
  flex:none;width:16px;height:20px;padding:0;
  border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-layer-1);
  color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:4px;
  font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;
}
/* 同 .ppt-thumb-action：不透明底 + 叠加高亮，别把底换成带 alpha 的色 */
.ppt-rail-collapse:hover{
  color:var(--dsw-alias-label-primary);
  background-image:linear-gradient(var(--dsw-alias-interactive-bg-hover),var(--dsw-alias-interactive-bg-hover));
  border-color:var(--dsw-alias-border-l1);
}
/* 缩略图条头部行：新页按钮 + 收起按钮；按钮让出右侧固定 16px，不再互相叠压 */
.ppt-thumbs-head{display:flex;align-items:center;gap:4px}
.ppt-thumbs-head>.ppt-btn{flex:1;min-width:0}
.ppt-rail-right .ppt-inspector{position:relative}
.ppt-inspector-collapse{position:absolute;top:2px;right:2px;width:18px;height:18px;padding:0;font-size:12px;line-height:1}
/* 收起后的边缘把手（细条，点击展开）：自身一律透明，与宿主同底。
   button 不写 background 会吃到 UA 的 ButtonFace，满高的灰条在深色下像多出一栏；
   悬停也只给 glyph 一颗小药丸，不铺满整条。
   仅左栏使用——右栏收起即完全消失，不留把手（展开的唯一入口是点选元素）。 */
.ppt-rail-handle{
  flex:none;width:16px;border:none;padding:0;cursor:pointer;
  background:transparent;
  color:var(--dsw-alias-label-secondary);
  display:flex;align-items:center;justify-content:center;font-size:12px;
  border-right:1px solid var(--dsw-alias-border-l2);
}
.ppt-rail-handle-glyph{
  display:flex;align-items:center;justify-content:center;
  width:14px;height:40px;border-radius:7px;
  transition:background-color .15s ease;
}
.ppt-rail-handle:hover{color:var(--dsw-alias-label-primary)}
.ppt-rail-handle:hover .ppt-rail-handle-glyph{background:var(--dsw-alias-interactive-bg-hover)}

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
/* 开关型按钮的「开着」态（如历史抽屉） */
.ppt-btn-on,.ppt-btn-on:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
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

/* ── 提示横幅（冲突 / 外部已修改 / 错误）──────────────────── */
.ppt-banner{
  display:flex;align-items:center;gap:6px;flex:none;
  padding:5px 8px;font-size:11.5px;
  color:var(--dsw-alias-label-secondary);
  border-bottom:1px solid var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-2);
}
.ppt-banner[data-kind="error"]{color:var(--dsw-alias-label-status-error, var(--dsw-alias-label-primary))}
.ppt-banner .ppt-btn{padding:1px 6px;font-size:11.5px}

/* ── 页脚状态条（保存态 / toast 文本）──────────────────────── */
/* 常驻固定高度：只换文字，不参与「有则出现」的高度变化——
   保存横幅从顶栏挪到这里，画布才不再每编辑一次就被顶一下。 */
.ppt-statusbar{
  position:relative;
  display:flex;align-items:center;gap:6px;flex:none;
  height:22px;padding:0 10px;
  font-size:11px;line-height:22px;
  color:var(--dsw-alias-label-secondary);
  border-top:1px solid var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-base);
}
.ppt-statusbar-text{flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.ppt-statusbar[data-kind="error"]{color:var(--dsw-alias-label-status-error, var(--dsw-alias-label-primary))}

/* ── 导出 toast 的「打开方式」菜单（结构与 DSH 文件菜单同：应用列表 + 固定底部的定位项）── */
.ppt-openwith{position:relative;flex:none;display:inline-flex}
.ppt-openwith-btn{
  font:inherit;font-size:11px;line-height:1;padding:1px 6px;
  color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);
  border:1px solid var(--dsw-alias-border-l2);border-radius:4px;cursor:pointer;
}
.ppt-openwith-btn:hover{background:var(--dsw-alias-interactive-bg-active, var(--dsw-alias-interactive-bg-hover))}
.ppt-openwith-btn:disabled{opacity:.6;cursor:default}
.ppt-openwith-menu{
  position:absolute;right:0;bottom:calc(100% + 4px);z-index:40;
  min-width:220px;max-height:320px;overflow-y:auto;
  display:flex;flex-direction:column;
  background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;
  box-shadow:0 -4px 16px rgba(0,0,0,0.18);padding:4px;
}
.ppt-openwith-item{
  display:flex;align-items:center;gap:8px;padding:5px 8px;
  font:inherit;font-size:11.5px;color:var(--dsw-alias-label-primary);
  background:transparent;border:none;border-radius:5px;cursor:pointer;text-align:left;
}
.ppt-openwith-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ppt-openwith-item:disabled{opacity:.6;cursor:default}
.ppt-openwith-icon{width:16px;height:16px;flex:none;object-fit:contain}
.ppt-openwith-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ppt-openwith-default{font-style:normal;color:var(--dsw-alias-label-secondary)}
.ppt-openwith-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l2)}
.ppt-openwith-note{padding:5px 8px;font-size:11px;color:var(--dsw-alias-label-secondary)}

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
  background-color:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);
  border-radius:3px;color:var(--dsw-alias-label-secondary);
  box-shadow:var(--dsw-shadow-lv1);
}
/* hover：底色必须保持不透明——直接换成 interactive-bg-hover（带 alpha）会让缩略图透上来，
   视觉上像按钮被抠空。改用叠加层：不透明底 + 半透明高亮叠在一起。 */
.ppt-thumb-action:hover{
  color:var(--dsw-alias-label-primary);
  background-image:linear-gradient(var(--dsw-alias-interactive-bg-hover),var(--dsw-alias-interactive-bg-hover));
  border-color:var(--dsw-alias-border-l1);
}
.ppt-thumb-gap{height:3px;margin:0 -2px;border-radius:1px;transition:background-color .1s ease}
.ppt-thumb-gap-over{background:var(--dsw-alias-interactive-bg-hover)}

/* ── PptdView（DOM 直渲画布，取代光栅化 PNG）────────────────── */
/* 外层容器：决定可用空间，内部 flex 居中 */
.pptd-viewport{position:relative;width:100%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center}
/* 逻辑画布：固定 pt 尺寸，transform scale 缩放；transform 不改变布局占位，配合 flex 居中 */
.pptd-canvas{
  position:relative;flex:none;
  box-sizing:border-box;
  /* 描边用 outline 而非 border：border 在 border-box 下会往内挤内容盒（0.67px @dpr1.5），
     全幅贴边元素（bottom-bar）四边被缩进 0.45px，露出画布米色页底，在深色界面下形成
     一条「白条」。outline 不占用布局，内容盒保持完整 960pt，贴边元素真正顶到画布边缘。 */
  box-shadow:var(--dsw-shadow-lv2);outline:1px solid var(--dsw-alias-border-l2);border-radius:2px;
  /* 排版基线 reset：规格默认 18pt/MiSans/单倍行距。不 reset 会继承工作台 UI 的
     12px/1.6/UI 字体族，未显式设字号的元素整体渲小。 */
  font-size:18px;line-height:1.2;font-family:MiSans,sans-serif;color:#1A1A1A;
}
/* Stage 里的 PptdView 占满并居中 */
.ppt-stage-pptd{width:100%;height:100%}
/* 缩略图里的 PptdView：小尺寸 contain，文字随 scale 自动缩小（矢量清晰） */
.ppt-thumb-pptd{width:100%;height:100%;pointer-events:none}

/* Stage 画布内元素（PptdView 渲染） */
.pptd-text{overflow:hidden;box-sizing:border-box}
.pptd-text p{margin:0}
.pptd-shape{box-sizing:border-box}
.pptd-image{box-sizing:border-box}
.pptd-line{box-sizing:border-box}

/* Stage 画布 + 透明选择框 + 就地编辑器（overlay 在逻辑坐标系内，随 canvas scale） */
.ppt-stage-empty{width:100%;height:100%}
.ppt-overlay{position:absolute;inset:0;pointer-events:none}
/* 激活态（Stage 用）：overlay 容器接收「点空白取消选择」，元素框仍各自 pointer-events:auto */
.ppt-overlay-active{pointer-events:auto;cursor:default}
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
.ppt-inspector-labelrow{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ppt-inspector-modes{
  display:inline-flex;gap:2px;padding:1px;border-radius:6px;
  background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);
}
.ppt-btn-mode{padding:0 6px;font-size:10.5px;line-height:16px;border-radius:4px}
.ppt-btn-on{
  color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);
  border-color:var(--dsw-alias-border-l1);
}
.ppt-inspector-row textarea,
.ppt-inspector-row input[type='number'],
.ppt-inspector-row input[type='text'],
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
.ppt-inspector-ref{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10px;color:var(--dsw-alias-label-secondary);
}
.ppt-inspector-swatches{display:flex;flex-wrap:wrap;gap:4px}
.ppt-inspector-swatch{
  width:20px;height:20px;padding:0;border-radius:4px;
  border:1px solid var(--dsw-alias-border-l2);cursor:pointer;
}
.ppt-inspector-swatch:hover{border-color:var(--dsw-alias-border-l1)}
.ppt-inspector-swatch-on{border-color:var(--dsw-alias-label-primary);box-shadow:0 0 0 2px var(--dsw-alias-border-l1)}
.ppt-inspector-row input[type='file']{font-size:11px;color:var(--dsw-alias-label-secondary)}
.ppt-inspector-pair{display:flex;gap:4px}
.ppt-inspector-pair select{flex:1 1 0;min-width:0}
.ppt-inspector-bounds{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.ppt-inspector-bounds label{display:flex;align-items:center;gap:4px;font-size:11px}
.ppt-inspector-bounds input{flex:1 1 auto;min-width:0;width:100%}
.ppt-inspector-table{display:grid;gap:3px}
.ppt-inspector-table input{
  font:inherit;font-size:11px;color:var(--dsw-alias-label-primary);min-width:0;
  background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);
  border-radius:3px;padding:2px 4px;
}
.ppt-inspector-table input:focus-visible{
  outline:none;border-color:var(--dsw-alias-border-l1);
  box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover);
}
.ppt-inspector-hint{
  display:flex;align-items:center;gap:4px;font-size:10px;
  color:var(--dsw-alias-label-secondary);
}
/* ── 版本历史抽屉（覆盖在画布上，右对齐；列表 + 直渲预览 + 恢复） ── */
.ppt-history{
  position:absolute;top:0;right:0;bottom:0;width:300px;z-index:20;
  display:flex;flex-direction:column;min-height:0;
  background:var(--dsw-alias-bg-base);
  border-left:1px solid var(--dsw-alias-border-l2);
  box-shadow:-6px 0 16px rgba(0,0,0,0.12);
}
.ppt-history-head{
  display:flex;align-items:center;gap:8px;padding:8px 10px;flex:none;
  border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px;
}
.ppt-history-head-meta{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.ppt-history-head .ppt-spacer{flex:1 1 auto}
.ppt-history-close{
  flex:none;width:20px;height:20px;padding:0;
  border:1px solid transparent;border-radius:4px;background:transparent;
  color:var(--dsw-alias-label-secondary);cursor:pointer;
  font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;
}
.ppt-history-close:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.ppt-history-error{
  flex:none;padding:6px 10px;font-size:11px;
  color:var(--dsw-alias-label-primary);
  background:var(--dsw-alias-interactive-bg-hover);
}
.ppt-history-hint{flex:none;padding:8px 10px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.ppt-history-preview{
  flex:none;display:flex;flex-direction:column;gap:6px;padding:8px 10px;
  border-bottom:1px solid var(--dsw-alias-border-l2);
}
.ppt-history-pptd{
  width:100%;aspect-ratio:16/9;border:1px solid var(--dsw-alias-border-l2);
  border-radius:4px;overflow:hidden;background:#fff;
}
.ppt-history-pager{
  display:flex;align-items:center;justify-content:center;gap:8px;
  font-size:11px;color:var(--dsw-alias-label-secondary);
}
.ppt-history-warn,.ppt-history-loading{
  font-size:10.5px;color:var(--dsw-alias-label-secondary);
}
.ppt-history-actions{display:flex;justify-content:center}
.ppt-history-list{flex:1 1 auto;overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:3px}
.ppt-history-row{
  display:flex;flex-direction:column;gap:2px;text-align:left;
  padding:6px 8px;border-radius:5px;border:1px solid transparent;cursor:pointer;
  font-size:11px;color:var(--dsw-alias-label-primary);
  background:transparent;
}
.ppt-history-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ppt-history-row-on{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-interactive-bg-hover)}
.ppt-history-rev{display:flex;align-items:center;gap:6px;font-weight:600}
.ppt-history-tag{
  font-style:normal;font-size:9.5px;font-weight:400;line-height:14px;padding:0 4px;
  border-radius:3px;border:1px solid var(--dsw-alias-border-l2);
  color:var(--dsw-alias-label-secondary);
}
.ppt-history-tag-on{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}
.ppt-history-ops{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10px;color:var(--dsw-alias-label-secondary);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.ppt-history-time{font-size:10px;color:var(--dsw-alias-label-secondary)}
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
