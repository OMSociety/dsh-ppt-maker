/**
 * 自动生成，请勿手改 —— 源码在 client/，用 `npm run build:client` 重新生成。
 * 改完记得把本文件一起提交：`dsh plugin add dsh-ppt-maker` 只安装、不构建。
 */
window.__ModuleLoader__.load({
  id: "dsh-ppt-maker",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
      "use strict";
      var __create = Object.create;
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __getProtoOf = Object.getPrototypeOf;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
      var __export = (target, all) => {
        for (var name2 in all)
          __defProp(target, name2, { get: all[name2], enumerable: true });
      };
      var __copyProps = (to, from, except, desc) => {
        if (from && typeof from === "object" || typeof from === "function") {
          for (let key of __getOwnPropNames(from))
            if (!__hasOwnProp.call(to, key) && key !== except)
              __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
        }
        return to;
      };
      var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
        // If the importer is in node compatibility mode or this is not an ESM
        // file that has been converted to a CommonJS file using a Babel-
        // compatible transform (i.e. "__esModule" has not been set), then set
        // "default" to the CommonJS "module.exports" for node compatibility.
        isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
        mod
      ));
      var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
      var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

      // client/index.tsx
      var index_exports = {};
      __export(index_exports, {
        apply: () => apply,
        inject: () => inject,
        name: () => name
      });
      module.exports = __toCommonJS(index_exports);
      var React8 = __toESM(require("react"), 1);

      // client/panel.tsx
      var React7 = __toESM(require("react"), 1);

      // client/icons.tsx
      var import_jsx_runtime = require("react/jsx-runtime");
      function PptMark({ size = 16, className }) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 36 36", fill: "none", "aria-hidden": "true", className, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", { id: "ppt-mark-back", x1: "13", y1: "8", x2: "28", y2: "20", gradientUnits: "userSpaceOnUse", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { stopColor: "#FF9E66" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "1", stopColor: "#FA541C" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", { id: "ppt-mark-front", x1: "7", y1: "13", x2: "25", y2: "27", gradientUnits: "userSpaceOnUse", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { stopColor: "#69B9FF" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "1", stopColor: "#324DE2" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { transform: "translate(18 18) scale(1.3) translate(-18 -18)", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "13.5", y: "8", width: "14", height: "11", rx: "2.5", fill: "url(#ppt-mark-back)" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "8", y: "13.5", width: "17", height: "13", rx: "2.5", fill: "url(#ppt-mark-front)" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "11.5", y: "17", width: "10", height: "2", rx: "1", fill: "#FFFFFF" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "11.5", y: "21", width: "6.5", height: "2", rx: "1", fill: "#FFFFFF", fillOpacity: "0.85" })
          ] })
        ] });
      }
      function GlyphSvg({ size = 14, className, children, viewBox = "0 0 16 16" }) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: size, height: size, viewBox, fill: "currentColor", "aria-hidden": "true", className, children });
      }
      function UndoGlyph(props) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlyphSvg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3.34 6.47 5.47 4.34a.5.5 0 0 0-.7-.7L2.58 5.8a.6.6 0 0 0 0 .85l2.19 2.18a.5.5 0 0 0 .7-.7L3.35 6h5.15a3.25 3.25 0 0 1 0 6.5H6.4a.5.5 0 0 0 0 1h2.1a4.25 4.25 0 0 0 0-8.5H3.34Z" }) });
      }
      function RedoGlyph(props) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlyphSvg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12.66 6.47 10.53 4.34a.5.5 0 0 1 .7-.7l2.19 2.16a.6.6 0 0 1 0 .85l-2.19 2.18a.5.5 0 0 1-.7-.7L12.65 6H7.5a3.25 3.25 0 0 0 0 6.5h2.1a.5.5 0 0 1 0 1H7.5a4.25 4.25 0 0 1 0-8.5h5.16Z" }) });
      }
      function ExportGlyph(props) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlyphSvg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 1.5a.5.5 0 0 1 .5.5v6.8l2.15-2.15a.5.5 0 0 1 .7.7l-3 3a.5.5 0 0 1-.7 0l-3-3a.5.5 0 0 1 .7-.7L7.5 8.8V2a.5.5 0 0 1 .5-.5ZM2.5 10a.5.5 0 0 1 .5.5V13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-2.5a.5.5 0 0 1 1 0V13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13v-2.5a.5.5 0 0 1 .5-.5Z" }) });
      }
      function NewPageGlyph(props) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlyphSvg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3.5 1A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 12.5 1h-9ZM3 2.5A.5.5 0 0 1 3.5 2h9a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-11Zm5 2a.5.5 0 0 1 .5.5v2h2a.5.5 0 0 1 0 1h-2v2a.5.5 0 0 1-1 0V8h-2a.5.5 0 0 1 0-1h2V5a.5.5 0 0 1 .5-.5Z" }) });
      }
      function ImportGlyph(props) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlyphSvg, { ...props, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 1.5a.5.5 0 0 1 .5.5v4.8l1.4-1.4a.5.5 0 0 1 .7.7L8 8.7 5.4 6.1a.5.5 0 0 1 .7-.7l1.4 1.4V2a.5.5 0 0 1 .5-.5Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2.5 8.5h3V10h-3v3.5A.5.5 0 0 0 3 14h10a.5.5 0 0 0 .5-.5V10h-3V8.5h3A1.5 1.5 0 0 1 15 10v3.5A1.5 1.5 0 0 1 13.5 15h-11A1.5 1.5 0 0 1 1 13.5V10a1.5 1.5 0 0 1 1.5-1.5Z" })
        ] });
      }

      // client/components/ProjectList.tsx
      var React = __toESM(require("react"), 1);
      var import_jsx_runtime2 = require("react/jsx-runtime");
      function ProjectList({ store }) {
        const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot);
        if (!state.projects.length) {
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ppt-blank-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ppt-brand", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PptMark, { size: 20 }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "PPT 工作台" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "本会话还没有登记过任何演示文稿工程。" })
          ] }) });
        }
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ppt-blank-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ppt-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PptMark, { size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "PPT 工作台" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
            "点一份继续编辑；或者让模型 ",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "ppt_open" }),
            "。"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "ppt-projlist", role: "list", children: state.projects.map((proj) => {
            const active = proj.key === state.activeKey;
            return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-projrow",
                "data-active": active ? "true" : "false",
                onClick: () => void store.actions.openProject(proj.key),
                "aria-pressed": active,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "ppt-projrow-title", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PptMark, { size: 14 }),
                    proj.dir
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "ppt-projrow-meta", children: [
                    "key ",
                    proj.key
                  ] })
                ]
              },
              proj.key
            );
          }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 10 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ImportGlyph, { size: 11, style: { verticalAlign: -1 } }),
            " 导入 .pptx → 走模型工具（ppt_import / ppt_open）"
          ] })
        ] }) });
      }

      // client/components/ThumbStrip.tsx
      var React2 = __toESM(require("react"), 1);
      var import_jsx_runtime3 = require("react/jsx-runtime");
      function ThumbStrip({ store }) {
        const state = React2.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const [drag, setDrag] = React2.useState({ fromPath: null, overIndex: null });
        const pages = state.deckPages;
        if (!pages.length) {
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ppt-thumbs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                onClick: () => void store.actions.addPage(),
                title: "add_page",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(NewPageGlyph, { size: 13 }),
                  " 新页"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)", padding: "4px 2px" }, children: "还没有页面；先点上面加一张。" })
          ] });
        }
        const dropAt = (toIndex) => {
          if (!drag.fromPath) return;
          void store.actions.movePage(drag.fromPath, toIndex);
          setDrag({ fromPath: null, overIndex: null });
        };
        const renderGap = (index) => {
          const over = drag.overIndex === index;
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              className: `ppt-thumb-gap${over ? " ppt-thumb-gap-over" : ""}`,
              onDragOver: (e) => {
                if (!drag.fromPath) return;
                e.preventDefault();
                setDrag((d) => d.overIndex === index ? d : { ...d, overIndex: index });
              },
              onDrop: (e) => {
                e.preventDefault();
                dropAt(index);
              },
              "aria-hidden": true
            },
            `gap-${index}`
          );
        };
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ppt-thumbs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "button",
            {
              type: "button",
              className: "ppt-btn",
              onClick: () => void store.actions.addPage(),
              title: "add_page（在末尾追加一页空白页）",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(NewPageGlyph, { size: 13 }),
                " 新页"
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ppt-thumblist", role: "list", children: pages.map((pagePath, index) => {
            const thumb = state.pageCache[index + 1];
            const pageNo = index + 1;
            const active = index === state.currentPage;
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(React2.Fragment, { children: [
              index === 0 ? renderGap(0) : null,
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "div",
                {
                  role: "listitem",
                  className: `ppt-thumbrow${active ? " ppt-thumbrow-on" : ""}${drag.fromPath === pagePath ? " ppt-thumbrow-dragging" : ""}`,
                  draggable: true,
                  onDragStart: (e) => {
                    e.dataTransfer.setData("text/ppt-page-path", pagePath);
                    e.dataTransfer.effectAllowed = "move";
                    setDrag({ fromPath: pagePath, overIndex: null });
                  },
                  onDragEnd: () => setDrag({ fromPath: null, overIndex: null }),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "ppt-thumb",
                        onClick: () => store.actions.setPage(index),
                        title: `第 ${pageNo} 页（${pagePath}）`,
                        "aria-pressed": active,
                        children: thumb ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("img", { className: "ppt-thumb-img", src: thumb.dataUrl, alt: `第 ${pageNo} 页`, draggable: false }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "ppt-thumb-preview-placeholder", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                            ThumbSkeleton,
                            {
                              onVisible: () => void store.actions.ensureThumb(pageNo, state.lastSeenRevision)
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "ppt-thumb-num", children: [
                            "第 ",
                            pageNo,
                            " 页"
                          ] })
                        ] })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ppt-thumb-actions", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "ppt-btn ppt-thumb-action",
                          onClick: () => void store.actions.duplicatePage(pagePath),
                          title: "复制这页（page_duplicate）",
                          children: "复制"
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "ppt-btn ppt-thumb-action",
                          onClick: () => void store.actions.removePage(pagePath),
                          title: "删除这页（remove_page）",
                          children: "删除"
                        }
                      )
                    ] })
                  ]
                }
              ),
              renderGap(index + 1)
            ] }, pagePath);
          }) })
        ] });
      }
      function ThumbSkeleton({ onVisible }) {
        const ref = React2.useRef(null);
        React2.useEffect(() => {
          const el = ref.current;
          if (!el) return;
          if (typeof IntersectionObserver === "undefined") {
            onVisible();
            return;
          }
          const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              io.disconnect();
              onVisible();
            }
          });
          io.observe(el);
          return () => io.disconnect();
        }, []);
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { ref, className: "ppt-thumb-skeleton", "aria-hidden": "true" });
      }

      // client/components/Stage.tsx
      var React4 = __toESM(require("react"), 1);

      // client/components/TextEditor.tsx
      var React3 = __toESM(require("react"), 1);
      var import_jsx_runtime4 = require("react/jsx-runtime");
      function TextEditor({
        store,
        elementId,
        onDone
      }) {
        const state = React3.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const page = state.currentPageData ?? null;
        const target = Array.isArray(page?.elements) ? page.elements.find((e) => e.elementId === elementId) : void 0;
        const initialText = String(target?.content?.text ?? "");
        const ref = React3.useRef(null);
        const [committed, setCommitted] = React3.useState(false);
        React3.useEffect(() => {
          const el = ref.current;
          if (!el) return;
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }, []);
        if (!target || !target.bounds) return null;
        const [x, y, w, h] = target.bounds;
        const align = target.content?.align;
        const justifyContent = align?.[0] === "center" ? "center" : align?.[0] === "right" ? "flex-end" : "flex-start";
        const alignItems = align?.[1] === "middle" ? "center" : align?.[1] === "bottom" ? "flex-end" : "flex-start";
        const fontSize = typeof target.content?.fontSize === "number" ? target.content.fontSize : void 0;
        const commit = async (text) => {
          if (committed) return;
          setCommitted(true);
          if (text === initialText) {
            onDone();
            return;
          }
          const ok = await store.actions.updateElement(elementId, { content: { ...target.content ?? {}, text } });
          if (ok) onDone();
          else setCommitted(false);
        };
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            ref,
            role: "textbox",
            "aria-multiline": "true",
            "aria-label": `编辑 ${elementId}`,
            contentEditable: true,
            suppressContentEditableWarning: true,
            className: "ppt-textedit",
            style: { left: x, top: y, width: w, height: h, justifyContent, alignItems, fontSize },
            onBlur: () => {
              const el = ref.current;
              if (el) void commit(el.innerText);
            },
            onKeyDown: (e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                onDone();
                return;
              }
              if ((e.key === "Enter" || e.key === "NumpadEnter") && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const el = ref.current;
                if (el) void commit(el.innerText);
              }
            },
            children: initialText
          }
        );
      }

      // client/components/Stage.tsx
      var import_jsx_runtime5 = require("react/jsx-runtime");
      function Stage({ store }) {
        const state = React4.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const [editing, setEditing] = React4.useState(null);
        React4.useEffect(() => {
          if (state.activeKey) void store.actions.ensurePageLoaded();
        }, [state.activeKey, state.currentPage, store]);
        if (!state.activeKey) return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ppt-stage ppt-stage-empty" });
        const size = state.deck?.size ?? [960, 540];
        const thumb = state.pageCache[state.currentPage + 1];
        const pageNo = state.currentPage + 1;
        const page = state.currentPageData ?? null;
        const elements = Array.isArray(page?.elements) ? page.elements : [];
        React4.useEffect(() => {
          setEditing(null);
        }, [state.activeKey, state.currentPage]);
        const canvasStyle = {
          width: size[0],
          height: size[1],
          background: "var(--dsw-alias-bg-layer-2)"
        };
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ppt-stage", "data-page": pageNo, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ppt-stage-canvas", style: canvasStyle, children: [
          thumb ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("img", { className: "ppt-stage-bg", src: thumb.dataUrl, alt: `第 ${pageNo} 页渲染`, draggable: false }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              className: "ppt-stage-loadthumb",
              onClick: () => void store.actions.ensureThumb(pageNo, state.lastSeenRevision),
              children: "渲染这一页的缩略图（第一次点会等 libreoffice 几秒）"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            ElementOverlay,
            {
              elements,
              selection: state.selection,
              onSelect: (ids) => store.actions.setSelection(ids),
              onEnterEdit: (elementId) => setEditing(elementId)
            }
          ),
          editing && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            TextEditor,
            {
              store,
              elementId: editing,
              onDone: () => setEditing(null)
            }
          )
        ] }) });
      }
      function ElementOverlay({
        elements,
        selection,
        onSelect,
        onEnterEdit
      }) {
        const selectedId = selection && selection.ids.length ? selection.ids[0] : null;
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ppt-overlay", "aria-hidden": false, children: elements.map((el) => {
          const id = el.elementId;
          const bounds = el.bounds;
          if (!id || !bounds || bounds.length !== 4) return null;
          const [x, y, w, h] = bounds;
          const isSel = selectedId === id;
          const isText = el.elementType === "text";
          return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "div",
            {
              role: "button",
              tabIndex: 0,
              "aria-pressed": isSel,
              "data-element-id": id,
              "data-element-type": el.elementType || "",
              className: `ppt-element${isSel ? " ppt-element-on" : ""}${isText ? " ppt-element-text" : ""}`,
              style: { left: x, top: y, width: w, height: h },
              onClick: (e) => {
                e.stopPropagation();
                onSelect([id]);
              },
              onDoubleClick: (e) => {
                e.stopPropagation();
                if (isText) onEnterEdit(id);
              },
              onKeyDown: (e) => {
                if (e.key === "Enter") onSelect([id]);
              }
            },
            id
          );
        }) });
      }

      // client/components/Inspector.tsx
      var React5 = __toESM(require("react"), 1);
      var import_jsx_runtime6 = require("react/jsx-runtime");
      async function fileToBase64(file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        const CHUNK = 32768;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
        }
        return btoa(binary);
      }
      function Inspector({ store }) {
        const state = React5.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const selection = state.selection;
        const page = state.currentPageData ?? null;
        if (!selection || !selection.ids.length) {
          return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ppt-inspector", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ppt-inspector-empty", children: "点一个元素开始编辑它的属性。" }) });
        }
        const elementId = selection.ids[0];
        const target = Array.isArray(page?.elements) ? page.elements.find((e) => e.elementId === elementId) : void 0;
        if (!target) {
          return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ppt-inspector", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ppt-inspector-empty", children: "选中的元素已不在磁盘上（可能被外部删除了）。" }) });
        }
        const content = target.content ?? {};
        const [hx, hv] = content.align ?? ["left", "top"];
        const [bx, by, bw, bh] = target.bounds ?? [0, 0, 0, 0];
        const setField = (patch) => {
          void store.actions.updateElement(elementId, patch);
        };
        const setContentField = (kv) => {
          setField({ content: { ...content, ...kv } });
        };
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ppt-inspector", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ppt-inspector-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { children: target.elementId }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "ppt-inspector-tag", children: target.elementType })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "文字" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "textarea",
              {
                rows: 3,
                value: String(content.text ?? ""),
                onChange: (e) => setContentField({ text: e.target.value })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "字号" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "input",
              {
                type: "number",
                min: 6,
                max: 200,
                value: typeof content.fontSize === "number" ? content.fontSize : 16,
                onChange: (e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 6 && v <= 200) setContentField({ fontSize: v });
                }
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "颜色（仅字面量；主题色留 PR3）" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "input",
              {
                type: "color",
                value: /^#[0-9a-fA-F]{6}$/.test(String(content.color ?? "")) ? String(content.color) : "#1F2937",
                onChange: (e) => setContentField({ color: e.target.value })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "对齐（横向 / 纵向）" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ppt-inspector-pair", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("select", { value: hx, onChange: (e) => setContentField({ align: [e.target.value, hv] }), children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "left", children: "左" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "center", children: "中" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "right", children: "右" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "justify", children: "两端" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("select", { value: hv, onChange: (e) => setContentField({ align: [hx, e.target.value] }), children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "top", children: "顶" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "middle", children: "中" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "bottom", children: "底" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "bounds [x, y, w, h]" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ppt-inspector-bounds", children: ["x", "y", "w", "h"].map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: label }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "input",
                {
                  type: "number",
                  value: [bx, by, bw, bh][i],
                  onChange: (e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    const next = [bx, by, bw, bh];
                    next[i] = v;
                    setField({ bounds: next });
                  }
                }
              )
            ] }, label)) })
          ] }),
          target.elementType === "image" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: "替换图片" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "input",
              {
                type: "file",
                accept: "image/png,image/jpeg,image/gif,image/webp,image/bmp",
                onChange: (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  (async () => {
                    if (!state.activeKey) return;
                    try {
                      const data = await fileToBase64(file);
                      const res = await store.actions.uploadMedia({ name: file.name, mime: file.type, data });
                      setField({ src: res.src });
                    } catch (error) {
                      store.actions.toast(`图片替换失败：${error.message}`, "error");
                    }
                  })();
                  e.currentTarget.value = "";
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "ppt-inspector-hint", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ImportGlyph, { size: 11 }),
              " 上传落到工程 media/ 下（宿主生成文件名），然后 update_element set src。"
            ] })
          ] })
        ] });
      }

      // client/components/Toolbar.tsx
      var React6 = __toESM(require("react"), 1);
      var import_jsx_runtime7 = require("react/jsx-runtime");
      function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename.endsWith(".pptx") ? filename : `${filename}.pptx`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }
      function Toolbar({ store }) {
        const state = React6.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const disabled = !state.activeKey || state.saving;
        const inConflict = Boolean(state.conflict || state.externalChange);
        const filename = `${state.activeKey || "deck"}.pptx`;
        const onExport = async () => {
          const res = await store.actions.exportDeck();
          if (res) triggerDownload(res.blob, res.filename);
        };
        return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-toolbar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ppt-brand", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PptMark, { size: 14 }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "PPT 工作台" })
            ] }),
            state.activeKey ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ppt-toolbar-project", children: [
              state.activeKey,
              state.deckPages.length ? ` · ${state.deckPages.length} 页` : "",
              " · rev ",
              state.lastSeenRevision,
              state.draft?.ops.length ? ` · 草稿 ${state.draft.ops.length}` : ""
            ] }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ppt-spacer" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                disabled: disabled || !state.canUndo,
                onClick: () => void store.actions.undo(),
                title: "撤销（先提交草稿再撤）",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(UndoGlyph, { size: 13 }),
                  " 撤销"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                disabled: disabled || !state.canRedo,
                onClick: () => void store.actions.redo(),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(RedoGlyph, { size: 13 }),
                  " 重做"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                disabled: disabled || inConflict,
                onClick: () => void onExport(),
                title: "导出 .pptx：走完整 build + libreoffice-kit，浏览器自起下载",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ExportGlyph, { size: 13 }),
                  " 导出 .pptx"
                ]
              }
            )
          ] }),
          state.saving ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ppt-banner", children: "正在保存…" }) : null,
          state.conflict ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-banner", "data-kind": "error", children: [
            "和服务端冲突了（服务端已改到 rev ",
            state.conflict.revision,
            "）。",
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", className: "ppt-btn ppt-btn-primary", onClick: () => void store.actions.applyDraft(), children: "重试" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", className: "ppt-btn", onClick: () => void store.actions.resolveConflictTheirs(), children: "采用服务端版本" })
          ] }) : null,
          state.externalChange ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-banner", children: [
            "外部已修改（rev ",
            state.externalChange.revision,
            "）。",
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", className: "ppt-btn", onClick: () => void store.actions.acceptExternal(), children: "拉取服务端版本（丢弃本地草稿）" })
          ] }) : null,
          state.error && state.status === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ppt-banner", "data-kind": "error", children: state.error }) : null
        ] });
      }

      // client/panel.tsx
      var import_jsx_runtime8 = require("react/jsx-runtime");
      function Title() {
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "ppt-title-label", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PptMark, { size: 14, className: "ppt-title-glyph" }),
          "PPT 工作台"
        ] });
      }
      function BlankLoading() {
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-blank-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PptMark, { size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "PPT 工作台" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-sweep", "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { children: "正在打开工作台…" })
        ] }) });
      }
      function BlankError({ error, onRetry }) {
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-blank-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PptMark, { size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "PPT 工作台" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { children: error }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-actions-row", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "ppt-btn", onClick: onRetry, children: "重试" }) })
        ] }) });
      }
      function BlankEmpty() {
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-blank-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PptMark, { size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "PPT 工作台" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { children: "还没有打开的演示文稿。" })
        ] }) });
      }
      function SkeletonPanel({ store }) {
        const state = React7.useSyncExternalStore(store.subscribe, store.getSnapshot);
        React7.useEffect(() => {
          void store.actions.init();
        }, [store]);
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-root", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Toolbar, { store }),
          state.status === "loading" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(BlankLoading, {}),
          state.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(BlankError, { error: state.error || "面板载入失败", onRetry: () => void store.actions.init() }),
          state.status === "empty" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(BlankEmpty, {}),
          state.status === "ready" && !state.activeKey && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ProjectList, { store }),
          state.status === "ready" && state.activeKey && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-workbench", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ThumbStrip, { store }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Stage, { store }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Inspector, { store })
          ] })
        ] });
      }

      // client/api.ts
      var ConflictError = class extends Error {
        constructor(revision, message) {
          super(message || `revision 冲突：服务端是 ${revision}`);
          __publicField(this, "revision", revision);
          this.name = "ConflictError";
        }
      };
      var PREFIX = "/ppt-maker/api";
      async function call(path, init) {
        const res = await fetch(`${PREFIX}${path}`, {
          ...init,
          headers: init?.body ? { "content-type": "application/json", ...init?.headers || {} } : init?.headers
        });
        let payload = null;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
        if (res.status === 409) {
          const info = payload?.conflict;
          const rev = Number(info?.revision ?? payload?.revision ?? 0) || 0;
          throw new ConflictError(rev, String(payload?.error ?? ""));
        }
        if (!res.ok || !payload || payload.ok === false) {
          throw new Error(String(payload && payload.error || `请求失败（HTTP ${res.status}）`));
        }
        return payload;
      }
      var q = (params) => Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
      var api = {
        state: (sessionId) => call(`/state?${q({ sessionId })}`),
        tabOpened: (sessionId, key) => call(`/tab-opened`, { method: "POST", body: JSON.stringify({ sessionId, key }) }),
        setActive: (sessionId, key) => call(`/active`, { method: "POST", body: JSON.stringify({ sessionId, key }) }),
        project: (sessionId, key) => call(`/project?${q({ sessionId, key })}`),
        page: (sessionId, key, page) => call(`/page?${q({ sessionId, key, page })}`),
        edit: (sessionId, key, baseRevision, ops) => call(`/edit`, {
          method: "POST",
          body: JSON.stringify({ sessionId, key, baseRevision, ops })
        }),
        undo: (sessionId, key, steps = 1) => call(`/undo`, {
          method: "POST",
          body: JSON.stringify({ sessionId, key, steps })
        }),
        redo: (sessionId, key, steps = 1) => call(`/redo`, {
          method: "POST",
          body: JSON.stringify({ sessionId, key, steps })
        }),
        uploadMedia: (sessionId, key, payload) => call(`/media/upload`, {
          method: "POST",
          body: JSON.stringify({ sessionId, key, ...payload })
        }),
        /** `?rev=N` 是缓存击穿钥匙（宿主按 (page, revision) 落盘缓存）。页号从 1 起。 */
        thumbUrl: (sessionId, key, page, revision) => `${PREFIX}/thumb?${q({ sessionId, key, page: String(page), rev: String(revision) })}`,
        mediaUrl: (sessionId, key, src) => `${PREFIX}/media?${q({ sessionId, key, src })}`,
        /**
         * 导出：宿主回的是 .pptx **二进制流**（content-disposition attachment），
         * 不能走 call()——那只会把响应体当 JSON。成功返回 Blob + 可能带上的 X-Revision 头。
         */
        async exportPptx(sessionId, key) {
          const res = await fetch(`${PREFIX}/export`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId, key })
          });
          if (res.status === 409) {
            const payload = await res.json().catch(() => null);
            throw new ConflictError(Number(payload?.conflict?.revision ?? 0) || 0, payload?.error || "");
          }
          if (!res.ok) {
            let message = `导出失败（HTTP ${res.status}）`;
            try {
              const payload = await res.json();
              if (payload?.error) message = payload.error;
            } catch {
            }
            throw new Error(message);
          }
          return { blob: await res.blob(), revision: res.headers.get("x-pt-revision") || res.headers.get("x-revision") };
        }
      };

      // client/store.ts
      function initialState(sessionId) {
        return {
          status: "loading",
          error: null,
          sessionId,
          projects: [],
          activeKey: null,
          manifest: null,
          deck: null,
          deckPages: [],
          currentPageData: null,
          currentPageRevision: -1,
          lastSeenRevision: -1,
          pageCache: {},
          currentPage: 0,
          selection: null,
          draft: null,
          canUndo: false,
          canRedo: false,
          saving: false,
          conflict: null,
          externalChange: null,
          toast: null
        };
      }
      function createPptStore(sessionId) {
        let state = initialState(sessionId);
        const listeners = /* @__PURE__ */ new Set();
        let toastSeq = 0;
        const toastTimers = /* @__PURE__ */ new Set();
        const emit = () => {
          for (const fn of listeners) fn();
        };
        const patch = (next) => {
          state = { ...state, ...next };
          emit();
        };
        const toast = (text, kind = "info") => {
          toastSeq += 1;
          const id = toastSeq;
          patch({ toast: { id, text, kind } });
          const timer = setTimeout(() => {
            toastTimers.delete(timer);
            if (state.toast && state.toast.id === id) patch({ toast: null });
          }, kind === "error" ? 5e3 : 2600);
          toastTimers.add(timer);
        };
        async function switchProject(key) {
          if (!key || key === state.activeKey) return true;
          try {
            const res = await api.project(state.sessionId, key);
            patch({
              status: "ready",
              activeKey: key,
              manifest: res.manifest,
              deck: res.deck,
              deckPages: Array.isArray(res.deck?.pages) ? res.deck.pages : [],
              currentPageData: null,
              currentPageRevision: -1,
              lastSeenRevision: res.revision,
              currentPage: 0,
              selection: null,
              draft: null,
              conflict: null,
              externalChange: null,
              pageCache: {}
            });
            return true;
          } catch (error) {
            const message = `打开工程失败：${error.message}`;
            patch({ status: "error", error: message });
            toast(message, "error");
            return false;
          }
        }
        async function applyPoll(st) {
          const projects = Array.isArray(st.projects) ? st.projects : [];
          const nextKey = st.activeKey ?? null;
          const nextRevision = nextKey && st.manifest ? st.manifest.revision : -1;
          const patchBase = {
            status: state.status === "error" && state.error ? "error" : projects.length || nextKey ? "ready" : "empty",
            error: null,
            projects,
            canUndo: Boolean(st.canUndo),
            canRedo: Boolean(st.canRedo)
          };
          if (nextKey === null) {
            if (state.activeKey) {
              patch({ ...patchBase, externalChange: { revision: state.lastSeenRevision } });
              return;
            }
            patch(patchBase);
            return;
          }
          const switched = state.activeKey !== nextKey;
          if (switched) {
            if (state.activeKey && (state.draft || state.conflict)) {
              patch({ ...patchBase, externalChange: { revision: nextRevision } });
              return;
            }
            await switchProject(nextKey);
            patch(patchBase);
            return;
          }
          if (nextRevision > state.lastSeenRevision) {
            if (state.draft || state.conflict) {
              patch({ ...patchBase, externalChange: { revision: nextRevision } });
              return;
            }
            patch({
              ...patchBase,
              lastSeenRevision: nextRevision,
              currentPageData: null,
              currentPageRevision: -1,
              pageCache: {}
            });
            void actions.ensurePageLoaded();
            return;
          }
          patch(patchBase);
        }
        async function flush() {
          if (!state.activeKey || !state.draft || !state.draft.ops.length) return false;
          if (state.conflict) return false;
          if (state.saving) return false;
          if (state.externalChange) return false;
          const key = state.activeKey;
          const base = state.draft.baseRevision;
          const ops = state.draft.ops;
          patch({ saving: true });
          try {
            const res = await api.edit(state.sessionId, key, base, ops);
            patch({
              saving: false,
              lastSeenRevision: res.revision,
              draft: null,
              conflict: null,
              externalChange: null
            });
            patch({ currentPageData: null, currentPageRevision: -1, pageCache: {} });
            void actions.ensurePageLoaded();
            return true;
          } catch (error) {
            if (error instanceof ConflictError) {
              patch({ saving: false, conflict: { revision: error.revision } });
              return false;
            }
            patch({ saving: false });
            toast(`保存失败：${error.message}`, "error");
            return false;
          }
        }
        const actions = {
          /**
           * 让正在 edit 的动作之前来一次：把 draft 刷成已提交（undo/redo 之前一笔 op 得先进 .history，
           * 不然 .history 看到的是「draft 不在历史里」时的旧游标；操作然后就会变成把还没提交的东西撤回）。
           */
          async applyDraft() {
            if (!state.draft) return true;
            return flush();
          },
          /** 面板挂载时初始化：拉一次 /state，把 projects 与 active 排进 store。 */
          async init() {
            try {
              patch({ status: "loading", error: null });
              const st = await api.state(state.sessionId);
              await applyPoll(st);
            } catch (error) {
              patch({ status: "error", error: error.message });
            }
          },
          /** 轮询入口（index.tsx 的定时器调它）。 */
          applyPoll,
          cacheThumb: async (page, dataUrl, revision) => {
            if (page < 1 || !Number.isInteger(page)) return;
            patch({
              pageCache: {
                ...state.pageCache,
                [page]: { page, revision, dataUrl }
              }
            });
          },
          ensureThumb: async (page, revision) => {
            if (!state.activeKey) return null;
            const hit = state.pageCache[page];
            if (hit && hit.revision === revision) return hit;
            const url = api.thumbUrl(state.sessionId, state.activeKey, page, revision);
            try {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const blob = await res.blob();
              const dataUrl = await new Promise((resolve, reject) => {
                const Reader = globalThis.FileReader;
                if (!Reader) return reject(new Error("这个浏览器不支持本地图预览"));
                const reader = new Reader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("缩略图读取失败"));
                reader.readAsDataURL(blob);
              });
              const thumb = { page, revision, dataUrl };
              patch({ pageCache: { ...state.pageCache, [page]: thumb } });
              return thumb;
            } catch {
              return null;
            }
          },
          /**
           * Inspector 换图按钮：POST /media/upload（宿主给文件名与白名单），response 的 src 拿来
           * 发 update_element set src（op 入队 = 同一杆）。
           */
          async uploadMedia(payload) {
            if (!state.activeKey) throw new Error("还没有打开工程");
            return api.uploadMedia(state.sessionId, state.activeKey, payload);
          },
          /** Stage 元素翻索引：updateElement(id,patch) 的便捷版，直接 stage。 */
          async updateElement(elementId, patch2) {
            if (!state.activeKey) return false;
            const page = state.currentPage;
            if (page < 0) return false;
            const pagePath = state.deckPages[page];
            if (!pagePath) return false;
            return actions.stage({ op: "update_element", page: pagePath, elementId, patch: patch2 });
          },
          /** ThumbStrip 拖拽页序 → move_page op。 */
          async movePage(pagePath, toIndex) {
            return actions.stage({ op: "move_page", page: pagePath, toIndex });
          },
          /** ThumbStrip 复制按钮 → page_duplicate op。 */
          async duplicatePage(pagePath) {
            return actions.stage({ op: "page_duplicate", page: pagePath });
          },
          /** ThumbStrip 删除按钮 → remove_page op。 */
          async removePage(pagePath) {
            return actions.stage({ op: "remove_page", page: pagePath });
          },
          /** ThumbStrip 顶上的 「+ 新页」 → add_page op。 */
          async addPage() {
            return actions.stage({ op: "add_page", content: { elements: [] } });
          },
          /** 「最近仓库」点一条项目：等保存 flush 了再切，免得丢 op。 */
          async openProject(key) {
            if (!key || key === state.activeKey) return;
            if (state.draft || state.conflict) {
              toast("先处理上方的冲突/外部修改，再切工程", "error");
              return;
            }
            await switchProject(key);
          },
          /**
           * S7 起 ThumbStrip 的点选会走这里：翻页不动磁盘、也不动 revision，
           * 只更新屏上的 currentPage（草稿是 per 工程、不是 per 页，不用清）。
           * 顺带把页缓存打上过期标记——面板想看就得重新拉（翻页 → GET /page）。
           */
          setPage(page) {
            if (page === state.currentPage) return;
            patch({ currentPage: page, selection: null, currentPageData: null });
            void actions.ensurePageLoaded();
          },
          /**
           * Stage/ElementOverlay/TextEditor 落地都要页上的元素清单——
           * 走这里拉（已经有就复用，revision 过了就重拉）。
           */
          async ensurePageLoaded() {
            if (!state.activeKey) return;
            const page = state.currentPage;
            if (page < 0 || page >= state.deckPages.length) {
              patch({ currentPageData: null, currentPageRevision: -1 });
              return;
            }
            if (state.currentPageData !== null && state.currentPageRevision === state.lastSeenRevision) return;
            const path = state.deckPages[page];
            try {
              const res = await api.page(state.sessionId, state.activeKey, path);
              if (state.currentPage !== page) return;
              patch({ currentPageData: res.page, currentPageRevision: res.revision });
            } catch (error) {
              patch({ currentPageData: null, currentPageRevision: -1 });
              toast(`第 ${page + 1} 页载入失败：${error.message}`, "error");
            }
          },
          /** 画布上点了一个元素（S7 ElementOverlay）；空数组 = 取消选择。 */
          setSelection(ids) {
            patch({ selection: ids.length ? { page: state.currentPage, ids } : null });
          },
          /**
           * 累积一杆 op（S8 TextEditor 提交、S9 ThumbStrip 页操作都走这里）：
           * 只是先记入草稿 + 亮「save」，不立即 flush——真正的提交在
           * 以下任一时候发生：①另一笔 op 跟着来；②点「保存/应用」；③切工程/关面板前。
           * 简化骨架：草稿第一杆立刻 flush（面板容易做出「我改了但没生效」的错觉），
           * 后续 op 攒到下一杆自然攒。
           */
          async stage(op) {
            if (!state.activeKey) {
              toast("还没有打开工程", "error");
              return false;
            }
            if (state.conflict) {
              toast("先处理上方的冲突再改", "error");
              return false;
            }
            patch(
              state.draft ? { draft: { ...state.draft, ops: [...state.draft.ops, op] } } : { draft: { baseRevision: state.lastSeenRevision, ops: [op] } }
            );
            return flush();
          },
          /** 「撤回」：先刷 draft（撤回只追加，不清空），再调 POST /undo。 */
          async undo() {
            if (!state.activeKey) return;
            if (!await actions.applyDraft()) return;
            if (!state.canUndo) return;
            const key = state.activeKey;
            try {
              const res = await api.undo(state.sessionId, key);
              patch({
                lastSeenRevision: res.revision,
                conflict: null,
                externalChange: null,
                currentPageData: null,
                currentPageRevision: -1,
                pageCache: {}
              });
              void actions.ensurePageLoaded();
              toast("已撤销", "info");
            } catch (error) {
              toast(`撤销失败：${error.message}`, "error");
            }
          },
          async redo() {
            if (!state.activeKey) return;
            if (!await actions.applyDraft()) return;
            if (!state.canRedo) return;
            const key = state.activeKey;
            try {
              const res = await api.redo(state.sessionId, key);
              patch({
                lastSeenRevision: res.revision,
                conflict: null,
                externalChange: null,
                currentPageData: null,
                currentPageRevision: -1,
                pageCache: {}
              });
              void actions.ensurePageLoaded();
              toast("已重做", "info");
            } catch (error) {
              toast(`重做失败：${error.message}`, "error");
            }
          },
          /**
           * 「导出 .pptx」请求体（返回 Blob，不调 document——真正的「点出下载气泡」由组件干）。
           * store 不碰 DOM：vitest 的 environment:node 没有 document；Toolbar 拿到 Blob 后自己触发。
           */
          async exportDeck() {
            if (!state.activeKey) return null;
            try {
              const { blob, revision } = await api.exportPptx(state.sessionId, state.activeKey);
              if (revision) patch({ lastSeenRevision: Number(revision) || state.lastSeenRevision });
              return { blob, filename: `${state.activeKey}.pptx` };
            } catch (error) {
              toast(`导出失败：${error.message}`, "error");
              return null;
            }
          },
          /**
           * 「重载」横幅上的确认：用户点头把外部修订拉进来，**丢掉本地 draft**。
           * 只在「外部已修改」横幅上出现——那是它唯一存在的意义。
           */
          async acceptExternal() {
            patch({ externalChange: null, draft: null, conflict: null });
            if (state.activeKey) await switchProject(state.activeKey);
          },
          /** 「冲突」横幅上的「采用服务端版本」：清冲突 + 清草稿，重载磁盘上的样子。 */
          async resolveConflictTheirs() {
            patch({ conflict: null, draft: null });
            if (state.activeKey) await switchProject(state.activeKey);
          },
          flush,
          toast
        };
        return {
          getSnapshot: () => state,
          subscribe: (fn) => {
            listeners.add(fn);
            return () => listeners.delete(fn);
          },
          actions,
          dispose() {
            for (const timer of toastTimers) clearTimeout(timer);
            toastTimers.clear();
            listeners.clear();
          }
        };
      }

      // client/styles.ts
      var STYLE_TAG_ID = "dsh-ppt-maker/panel.css";
      var CSS = `
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
      `;
      function ensureStyles(doc = document) {
        const selector = `style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`;
        if (doc.querySelector(selector)) return () => {
        };
        const tag = doc.createElement("style");
        tag.dataset.plugin = "dsh-ppt-maker";
        tag.dataset.pluginCss = STYLE_TAG_ID;
        tag.textContent = CSS;
        doc.head.appendChild(tag);
        return () => tag.remove();
      }

      // client/index.tsx
      var name = "dsh-ppt-maker";
      var inject = ["slots", "sessions"];
      var TAB_ID = "dsh-ppt-maker";
      var TAB_KIND = "ppt";
      var POLL_MS = 3e3;
      function pick(injected, key) {
        if (!injected) return void 0;
        try {
          if (typeof injected.get === "function") {
            const value = injected.get(key);
            if (value !== void 0) return value;
          }
        } catch {
        }
        return injected[key];
      }
      function service(ctx, key) {
        try {
          return typeof ctx.get === "function" ? ctx.get(key) : void 0;
        } catch {
          return void 0;
        }
      }
      function currentSessionId(ctx, readMounted) {
        try {
          const sessions = service(ctx, "sessions");
          const snapshot = sessions?.list?.getSnapshot?.();
          if (snapshot?.current) return snapshot.current;
          const mounted = readMounted?.() || null;
          if (mounted) return mounted;
          if (Array.isArray(snapshot?.ids) && snapshot.ids.length === 1) return snapshot.ids[0];
          return null;
        } catch {
          return null;
        }
      }
      function apply(ctx) {
        const stores = /* @__PURE__ */ new Map();
        const disposeStyles = ensureStyles();
        ctx.effect(() => () => disposeStyles(), "ppt-maker: 面板样式");
        let getMountedSession = null;
        const readMounted = () => {
          try {
            return getMountedSession ? getMountedSession() : null;
          } catch {
            return null;
          }
        };
        const storeFor = (sessionId) => {
          let store = stores.get(sessionId);
          if (!store) {
            store = createPptStore(sessionId);
            stores.set(sessionId, store);
          }
          return store;
        };
        function PanelHost(props) {
          const sessionId = props?.sessionId || currentSessionId(ctx, readMounted);
          const store = React8.useMemo(() => sessionId ? storeFor(sessionId) : null, [sessionId]);
          if (!sessionId || !store) {
            return React8.createElement("div", { className: "ppt-root" }, "PPT 工作台：拿不到当前会话，请在一个会话里打开。");
          }
          return React8.createElement(SkeletonPanel, { store });
        }
        let openOfficial = null;
        const openPanel = () => {
          if (!openOfficial) throw new Error("官方右侧栏尚未就绪");
          openOfficial();
        };
        const openIfRequested = (sessionId, key) => {
          try {
            openPanel?.();
          } catch (error) {
            console.warn("[dsh-ppt-maker] 打开面板失败，下一次轮询会重试：", error);
            return false;
          }
          storeFor(sessionId);
          void api.tabOpened(sessionId, key).catch(() => {
          });
          return true;
        };
        let seatHandle = null;
        try {
          seatHandle = ctx.inject(["sidebarRightTabs", "sidebarRight"], (injected) => {
            const tabs = pick(injected, "sidebarRightTabs");
            const sidebarRight = pick(injected, "sidebarRight");
            getMountedSession = () => {
              try {
                return sidebarRight?.mounted?.getSnapshot?.() || null;
              } catch {
                return null;
              }
            };
            if (!tabs || typeof tabs.register !== "function") return;
            const disposers = [];
            disposers.push(
              tabs.register({
                id: TAB_ID,
                kind: TAB_KIND,
                priority: "extension",
                title: () => "PPT 工作台",
                guide: [
                  {
                    // 0.1.7 起 guide 条目契约要求稳定 id（注册时的唯一性检查与渲染 key 都按它走）；
                    // 旧版注册处不读这个字段，多了无害。
                    id: "workbench",
                    order: 40,
                    title: () => "PPT 工作台",
                    description: () => "逆向导入 / 编辑 / 导出 .pptx；所见即所得",
                    // 不给 icon 的话，新标签页的引导列表画一个默认的立方体占位。
                    icon: PptMark
                  }
                ]
              })
            );
            const slots = ctx.slots;
            if (slots && typeof slots.inject === "function") {
              disposers.push(
                slots.inject(
                  "sidebar.right.pane.tab",
                  () => slots.register({ name: "sidebar.right.pane.tab", key: TAB_ID }, PanelHost)
                )
              );
              disposers.push(
                slots.inject(
                  "sidebar.right.pane.tab.title",
                  () => slots.register({ name: "sidebar.right.pane.tab.title", key: TAB_ID }, Title)
                )
              );
            }
            if (sidebarRight && typeof sidebarRight.openTab === "function") {
              openOfficial = () => sidebarRight.openTab(TAB_KIND);
            }
            const dispose = () => {
              for (const off of disposers.reverse()) {
                try {
                  off();
                } catch {
                }
              }
              openOfficial = null;
              getMountedSession = null;
            };
            return dispose;
          });
        } catch (error) {
          console.warn("[dsh-ppt-maker] 官方右侧栏席位注入失败：", error);
        }
        ctx.effect(() => {
          let stopped = false;
          let warned = false;
          const seenSessions = /* @__PURE__ */ new Set();
          const tick = async () => {
            if (stopped || typeof document !== "undefined" && document.visibilityState === "hidden") return;
            const sessionId = currentSessionId(ctx, readMounted);
            if (!sessionId) return;
            try {
              const st = await api.state(sessionId);
              warned = false;
              if (st.openRequest && st.openRequest.key) {
                openIfRequested(sessionId, st.openRequest.key);
              }
              const firstPoll = !seenSessions.has(sessionId);
              seenSessions.add(sessionId);
              if (firstPoll) return;
              const store = stores.get(sessionId);
              if (store) await store.actions.applyPoll(st);
            } catch (error) {
              if (!warned) {
                warned = true;
                console.warn("[dsh-ppt-maker] 轮询失败（宿主路由可能尚未就绪）：", error);
              }
            }
          };
          const timer = setInterval(() => void tick(), POLL_MS);
          void tick();
          return async () => {
            stopped = true;
            clearInterval(timer);
            try {
              await seatHandle?.dispose?.();
            } catch {
            }
            for (const store of stores.values()) store.dispose();
            stores.clear();
          };
        }, "ppt-maker: 轮询与生命周期");
      }

    return module.exports;
  },
});
