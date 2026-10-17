/**
 * 自动生成，请勿手改 —— 源码在 client/，用 `npm run build` 重新生成。
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
      var React10 = __toESM(require("react"), 1);

      // client/panel.tsx
      var React9 = __toESM(require("react"), 1);

      // client/api.ts
      var ConflictError = class extends Error {
        constructor(revision, message) {
          super(
            message || (revision === void 0 ? "revision 冲突：服务端没给出版本号" : `revision 冲突：服务端是 ${revision}`)
          );
          __publicField(this, "revision", revision);
          this.name = "ConflictError";
        }
      };
      var PREFIX = "/ppt-maker/api";
      async function call(path, init) {
        let res;
        try {
          res = await fetch(`${PREFIX}${path}`, {
            ...init,
            headers: init?.body ? { "content-type": "application/json", ...init?.headers || {} } : init?.headers
          });
        } catch (error) {
          throw new Error(`网络不通：连不上宿主路由（${error.message}）`);
        }
        let payload = null;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
        if (res.status === 409) {
          const info = payload?.conflict;
          const raw = info?.revision ?? payload?.revision;
          const revision = typeof raw === "number" && Number.isFinite(raw) ? raw : void 0;
          throw new ConflictError(revision, String(payload?.error ?? ""));
        }
        if (!res.ok || !payload || payload.ok === false) {
          throw new Error(String(payload && payload.error || `请求失败（HTTP ${res.status}）`));
        }
        return payload;
      }
      var q = (params) => Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
      async function failExport(res) {
        if (res.status === 409) {
          const payload = await res.json().catch(() => null);
          const raw = payload?.conflict?.revision;
          const revision = typeof raw === "number" && Number.isFinite(raw) ? raw : void 0;
          throw new ConflictError(revision, payload?.error || "");
        }
        let message = `导出失败（HTTP ${res.status}）`;
        try {
          const payload = await res.json();
          if (payload?.error) message = payload.error;
        } catch {
        }
        throw new Error(message);
      }
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
        mediaUrl: (sessionId, key, src) => `${PREFIX}/media?${q({ sessionId, key, src })}`,
        /**
         * 面板导出口径：宿主把 pptx 落到工程目录 `export/` 下，只回相对路径与字节数——
         * 桌面外壳的下载没有可回读的落点，落盘 + 可见路径才是「点了就有反应」的确定性结果。
         */
        async exportPptxToProject(sessionId, key) {
          const res = await fetch(`${PREFIX}/export`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId, key, save: true })
          });
          if (!res.ok) await failExport(res);
          const payload = await res.json().catch(() => ({}));
          return {
            relativePath: String(payload?.relativePath || ""),
            absolutePath: String(payload?.absolutePath || ""),
            filename: String(payload?.filename || "deck.pptx"),
            revision: Number(payload?.revision || 0),
            bytes: Number(payload?.bytes || 0)
          };
        },
        /**
         * 导出产物的主机侧「打开方式」：枚举系统关联应用（与 DSH「已编辑」文件菜单同一套
         * dsh-native-command 原语）。canOpen=false 或查询失败时 applications 为空数组——
         * 菜单降级为只剩「显示文件位置」。
         */
        async exportOpenMenu(sessionId, key, file) {
          const params = `sessionId=${encodeURIComponent(sessionId)}&key=${encodeURIComponent(key)}&file=${encodeURIComponent(file)}`;
          const payload = await call(`/export/open-menu?${params}`);
          return { canOpen: Boolean(payload?.canOpen), applications: Array.isArray(payload?.applications) ? payload.applications : [] };
        },
        /** 打开导出文件：默认关联应用 / 指定 application(id) / action:'reveal' 显示文件位置。 */
        async exportOpen(sessionId, key, file, opts) {
          await call(`/export/open`, {
            method: "POST",
            body: JSON.stringify({ sessionId, key, file, application: opts?.application, action: opts?.action })
          });
        },
        /** 版本历史列表：游标位置 + 全部快照元数据（升序）。 */
        async listHistory(sessionId, key) {
          const params = `sessionId=${encodeURIComponent(sessionId)}&key=${encodeURIComponent(key)}`;
          return call(`/history?${params}`);
        },
        /** 读一份历史快照（已按 PPTD 解析，面板画布直渲预览用；只读，不动工程）。 */
        async getHistoryPages(sessionId, key, revision) {
          const params = `sessionId=${encodeURIComponent(sessionId)}&key=${encodeURIComponent(key)}&revision=${revision}`;
          return call(`/history/pages?${params}`);
        },
        /** 恢复到指定历史版本；baseRevision 过期 → 409 ConflictError。 */
        async restoreHistory(sessionId, key, revision, baseRevision) {
          return call(`/history/restore`, {
            method: "POST",
            body: JSON.stringify({ sessionId, key, revision, baseRevision })
          });
        }
      };

      // client/icons.tsx
      var import_jsx_runtime = require("react/jsx-runtime");
      function PptMark({ size = 16, className, style }) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 36 36", fill: "none", "aria-hidden": "true", className, style, children: [
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
      function GlyphSvg({ size = 14, className, style, children, viewBox = "0 0 16 16" }) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: size, height: size, viewBox, fill: "currentColor", "aria-hidden": "true", className, style, children });
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
      function HistoryGlyph(props) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlyphSvg, { ...props, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4.5 2A1.5 1.5 0 0 0 3 3.5v8A1.5 1.5 0 0 0 4.5 13H5v-1h-.5a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5V5h1V3.5A1.5 1.5 0 0 0 12 2H4.5Z", opacity: "0.45" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.5 4A1.5 1.5 0 0 0 5 5.5v7A1.5 1.5 0 0 0 6.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 13.5 4h-7ZM6 5.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7.6 8.6a.5.5 0 0 1 .7-.7l.7.7V6.5a.5.5 0 0 1 1 0v1.9l.7-.7a.5.5 0 0 1 .7.7l-1.5 1.5a.5.5 0 0 1-.7 0l-1.6-1.3Z" })
        ] });
      }
      function FolderGlyph(props) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlyphSvg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M1.75 3.5A1.75 1.75 0 0 1 3.5 1.75h2.2c.55 0 1.06.26 1.4.7l.9 1.2h4.25A1.75 1.75 0 0 1 14 5.42v5.83a1.75 1.75 0 0 1-1.75 1.75H3.5A1.75 1.75 0 0 1 1.75 11.25V3.5Zm1.75-.25a.25.25 0 0 0-.25.25v7.75c0 .14.11.25.25.25h8.75a.25.25 0 0 0 .25-.25V5.42a.25.25 0 0 0-.25-.25H7.94a.75.75 0 0 1-.6-.3l-.99-1.32a.25.25 0 0 0-.2-.1H3.5Z" }) });
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
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "PPT 创客" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "本会话还没有登记过任何演示文稿工程。" })
          ] }) });
        }
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ppt-blank-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ppt-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PptMark, { size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "PPT 创客" })
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
      var React3 = __toESM(require("react"), 1);

      // client/components/PptdView.tsx
      var React2 = __toESM(require("react"), 1);

      // client/render/sanitize.ts
      var ALLOWED_TAGS = /* @__PURE__ */ new Set([
        "p",
        "ul",
        "ol",
        "li",
        "br",
        "span",
        "strong",
        "em",
        "u",
        "s",
        "sup",
        "sub",
        "b",
        "i"
      ]);
      var ALLOWED_CSS = /* @__PURE__ */ new Set([
        "text-align",
        "line-height",
        "margin-top",
        "margin-left",
        "margin-right",
        "color",
        "background-color",
        "font-size",
        "font-family",
        "font-weight",
        "font-style",
        "text-decoration"
      ]);
      var CSS_VALUE_DENY = /(url\s*\(|expression\s*\(|javascript:|vbscript:|@import|<|>)/i;
      function sanitizeStyle(style) {
        const out = [];
        for (const decl of style.split(";")) {
          const idx = decl.indexOf(":");
          if (idx < 0) continue;
          const prop = decl.slice(0, idx).trim().toLowerCase();
          const value = decl.slice(idx + 1).trim();
          if (!ALLOWED_CSS.has(prop)) continue;
          if (!value || CSS_VALUE_DENY.test(value)) continue;
          out.push(`${prop}:${value}`);
        }
        return out.join(";");
      }
      function sanitizeHtml(html) {
        if (typeof DOMParser === "undefined") return sanitizeHtmlString(html);
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc.body) return "";
        return cleanChildren(doc.body);
      }
      function cleanChildren(node) {
        let out = "";
        for (const child of Array.from(node.childNodes)) {
          if (child.nodeType === 3) {
            out += escapeHtml(child.textContent ?? "");
          } else if (child.nodeType === 1) {
            out += cleanElement(child);
          }
        }
        return out;
      }
      function cleanElement(el) {
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          return cleanChildren(el);
        }
        if (tag === "br") return "<br>";
        let style = "";
        const raw = el.getAttribute("style");
        if (raw) {
          const cleaned = sanitizeStyle(raw);
          if (cleaned) style = ` style="${escapeAttr(cleaned)}"`;
        }
        return `<${tag}${style}>${cleanChildren(el)}</${tag}>`;
      }
      function sanitizeHtmlString(html) {
        let out = String(html);
        out = out.replace(/<(script|style|iframe|object|embed|form|link|meta)[\s\S]*?<\/\1>/gi, "");
        out = out.replace(/<(script|style|iframe|object|embed|form|link|meta)[^>]*\/?>/gi, "");
        out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
        out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
        out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
        out = out.replace(/(href|src)\s*=\s*(["']?)\s*(javascript|vbscript):[^"'>]*\2/gi, "");
        out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+(?:"[^"]*"|'[^']*'|[^'">])*)?)\s*\/?>/g, (m, tag) => {
          const t = tag.toLowerCase();
          if (!ALLOWED_TAGS.has(t)) return "";
          if (t === "br") return "<br>";
          return m.startsWith("</") ? `</${t}>` : cleanOpenTag(m, t);
        });
        return out;
      }
      function cleanOpenTag(tagText, tag) {
        const styleMatch = tagText.match(/\sstyle\s*=\s*"([^"]*)"/i) || tagText.match(/\sstyle\s*=\s*'([^']*)'/i);
        const cleaned = styleMatch ? sanitizeStyle(styleMatch[1]) : "";
        return cleaned ? `<${tag} style="${escapeAttr(cleaned)}">` : `<${tag}>`;
      }
      function escapeHtml(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      function escapeAttr(s) {
        return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }

      // client/render/resolve.ts
      function resolveColor(value, theme) {
        if (typeof value !== "string" || !value) return void 0;
        if (value.startsWith("$")) {
          const key = value.slice(1);
          const hit = theme?.colors?.[key];
          return typeof hit === "string" ? hit : void 0;
        }
        return value;
      }
      var COLOR_PICKER_FALLBACK = "#1f2937";
      function normalizeHex(value) {
        if (typeof value !== "string") return null;
        const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim());
        if (!m) return null;
        let h = m[1].toLowerCase();
        if (h.length === 3) h = h.split("").map((c) => c + c).join("");
        return `#${h}`;
      }
      function colorFieldModel(value, theme) {
        const raw = typeof value === "string" ? value.trim() : "";
        if (!raw) return { ref: null, swatch: null, picker: COLOR_PICKER_FALLBACK };
        if (raw.startsWith("$")) {
          const resolved = theme?.colors?.[raw.slice(1)];
          const hex2 = normalizeHex(resolved);
          return { ref: raw, swatch: hex2, picker: hex2 ?? COLOR_PICKER_FALLBACK };
        }
        const hex = normalizeHex(raw);
        return { ref: null, swatch: hex, picker: hex ?? COLOR_PICKER_FALLBACK };
      }
      function deckTheme(deck) {
        const theme = deck?.theme;
        return theme && typeof theme === "object" ? theme : null;
      }
      function resolveTextStyle(content, theme) {
        const out = {};
        const ref = content.style;
        if (typeof ref === "string" && ref.startsWith("$")) {
          const base = theme?.textStyles?.[ref.slice(1)];
          if (base && typeof base === "object") Object.assign(out, base);
        }
        for (const [k, v] of Object.entries(content)) {
          if (k === "style" || k === "text" || k === "align" || k === "wrap") continue;
          out[k] = v;
        }
        if (typeof out.color === "string") out.color = resolveColor(out.color, theme) ?? out.color;
        if (typeof out.backgroundColor === "string")
          out.backgroundColor = resolveColor(out.backgroundColor, theme) ?? out.backgroundColor;
        return out;
      }
      function fillToCss(fill, theme, resolveMedia) {
        if (!fill || typeof fill !== "object") return void 0;
        const f = fill;
        const type = f.type;
        if (type === "solid") {
          return resolveColor(f.color, theme);
        }
        if (type === "gradient") {
          const stops = Array.isArray(f.stops) ? f.stops : [];
          const parts = stops.map((s) => {
            const st = s;
            const c = resolveColor(st.color, theme);
            if (!c) return null;
            const pos = typeof st.position === "number" ? st.position : typeof st.offset === "number" ? st.offset : 0;
            return `${c} ${Math.round(pos * 100)}%`;
          }).filter((x) => Boolean(x));
          if (!parts.length) return void 0;
          if (f.gradientType === "radial") return `radial-gradient(circle, ${parts.join(", ")})`;
          const pptdAngle = typeof f.angle === "number" ? f.angle : 0;
          return `linear-gradient(${pptdAngle + 90}deg, ${parts.join(", ")})`;
        }
        if (type === "image") {
          const raw = typeof f.src === "string" ? f.src : void 0;
          if (!raw) return void 0;
          const src = resolveMedia ? resolveMedia(raw) : raw;
          return `url("${escapeAttr(src)}") center/cover no-repeat`;
        }
        return void 0;
      }
      function borderToCss(border, theme) {
        if (!border || typeof border !== "object") return void 0;
        const b = border;
        const color = resolveColor(b.color, theme);
        if (!color) return void 0;
        const width = typeof b.width === "number" ? b.width : 1;
        const style = typeof b.style === "string" ? b.style : "solid";
        return `${width}px ${style} ${color}`;
      }
      function backgroundToCss(background, theme, resolveMedia) {
        if (typeof background === "string") return resolveColor(background, theme);
        if (background && typeof background === "object") {
          const b = background;
          if (typeof b.color === "string" && !b.type) return resolveColor(b.color, theme);
          return fillToCss(b, theme, resolveMedia);
        }
        return void 0;
      }

      // client/render/points.ts
      function pathFromPoints(pts, curve) {
        const [x0, y0] = pts[0];
        if (curve === "sharp" || pts.length === 2) {
          return `M${x0},${y0} ` + pts.slice(1).map(([x, y]) => `L${x},${y}`).join(" ");
        }
        let d = `M${x0},${y0}`;
        let i = 1;
        while (i < pts.length - 1) {
          const c1 = pts[i];
          if (i + 1 === pts.length - 1) {
            const end2 = pts[i + 1];
            d += ` Q${c1[0]},${c1[1]} ${end2[0]},${end2[1]}`;
            break;
          }
          const c2 = pts[i + 1];
          const end = pts[i + 2];
          d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${end[0]},${end[1]}`;
          i += 2;
        }
        return d;
      }

      // client/components/PptdView.tsx
      var import_jsx_runtime3 = require("react/jsx-runtime");
      function PptdView({ page, size, theme, resolveMedia, overlay, className }) {
        const wrapRef = React2.useRef(null);
        const [scale, setScale] = React2.useState(1);
        React2.useEffect(() => {
          const el = wrapRef.current;
          if (!el) return;
          const update = () => {
            const cw = el.clientWidth;
            const ch = el.clientHeight;
            if (cw > 0 && size[0] > 0) {
              const sx = cw / size[0];
              const sy = ch > 0 && size[1] > 0 ? ch / size[1] : sx;
              setScale(Math.min(sx, sy));
            }
          };
          update();
          if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", update);
            return () => window.removeEventListener("resize", update);
          }
          const ro = new ResizeObserver(update);
          ro.observe(el);
          return () => ro.disconnect();
        }, [size[0], size[1]]);
        const [w, h] = size;
        const bgCss = backgroundToCss(page?.background, theme, resolveMedia);
        const elements = Array.isArray(page?.elements) ? page.elements : [];
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { ref: wrapRef, className: `pptd-viewport${className ? ` ${className}` : ""}`, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "div",
          {
            className: "pptd-canvas",
            style: {
              width: w,
              height: h,
              // 注意：不能设 transformOrigin '0 0'。flex 居中把布局盒中心钉在容器中心，
              // 默认 origin（50% 50%）绕布局盒中心缩放，缩放后视觉盒仍以容器为中心、
              // 正好填满 min(容器宽/逻辑宽, 容器高/逻辑高) 的可视区；改成 0 0 会把视觉盒
              // 左上角钉在（必然为负的）布局盒左上角，整块落到视口外。
              transform: `scale(${scale})`,
              background: bgCss ?? "#FFFFFF"
            },
            children: [
              elements.map((el, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ElementView, { el, theme, resolveMedia }, el.elementId ?? i)),
              overlay
            ]
          }
        ) });
      }
      function ElementView({
        el,
        theme,
        resolveMedia
      }) {
        const b = el.bounds;
        if (!b || b.length !== 4) return null;
        const [x, y, w, h] = b;
        const transforms = [];
        if (el.rotation) transforms.push(`rotate(${el.rotation}deg)`);
        if (el.flip?.[0]) transforms.push("scaleX(-1)");
        if (el.flip?.[1]) transforms.push("scaleY(-1)");
        const style = {
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          transform: transforms.length ? transforms.join(" ") : void 0,
          opacity: typeof el.opacity === "number" ? el.opacity : void 0
        };
        const type = el.elementType ?? "text";
        switch (type) {
          case "text":
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TextView, { el, style, theme });
          case "shape":
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ShapeView, { el, style, theme, resolveMedia });
          case "line":
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LineView, { el, style, theme });
          case "image":
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ImageView, { el, style, resolveMedia });
          default:
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { ...style, ...placeholderBox() }, "data-element-type": type, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: placeholderLabel(), children: placeholderText(type) }) });
        }
      }
      function TextView({
        el,
        style,
        theme
      }) {
        const content = el.content ?? {};
        const st = resolveTextStyle(content, theme);
        const html = typeof content.text === "string" ? sanitizeHtml(content.text) : "";
        const align = Array.isArray(content.align) ? content.align : [];
        const wrap = typeof content.wrap === "boolean" ? content.wrap : void 0;
        const css = textStyleToCss(st, align, wrap);
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { ...style, ...css }, className: "pptd-text", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { dangerouslySetInnerHTML: { __html: html } }) });
      }
      function ShapeView({
        el,
        style,
        theme,
        resolveMedia
      }) {
        const shapeName = el.shapeName ?? "rect";
        const fillCss = fillToCss(el.fill, theme, resolveMedia);
        const borderCss = borderToCss(el.border, theme);
        const css = {
          background: fillCss,
          border: borderCss,
          borderRadius: shapeName === "ellipse" ? "50%" : void 0
        };
        const content = el.content ?? {};
        const hasText = typeof content.text === "string" && content.text.length > 0;
        const align = Array.isArray(content.align) ? content.align : [];
        const wrap = typeof content.wrap === "boolean" ? content.wrap : void 0;
        const textCss = hasText ? { ...shapeTextWrap(), ...textStyleToCss(resolveTextStyle(content, theme), align, wrap, "center") } : void 0;
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { ...style, ...css }, className: "pptd-shape", "data-shape": shapeName, children: hasText ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: textCss, className: "pptd-text", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { dangerouslySetInnerHTML: { __html: sanitizeHtml(String(content.text)) } }) }) : null });
      }
      function LineView({
        el,
        style,
        theme
      }) {
        const viewBox = Array.isArray(el.viewBox) && el.viewBox.length === 2 ? el.viewBox : null;
        const pointsRaw = typeof el.points === "string" ? el.points : "";
        const pts = pointsRaw.trim().split(/\s+/).map((pair) => {
          const [x, y] = pair.split(",").map(Number);
          return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
        }).filter((p) => p !== null);
        if (!viewBox || pts.length < 2) {
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { ...style, borderTop: `2px solid #1A1A1A`, height: 0 }, className: "pptd-line" });
        }
        const curve = typeof el.curve === "string" ? el.curve : "round";
        const d = pathFromPoints(pts, curve);
        const borderCss = borderToCss(el.border, theme) ?? "1px solid #1A1A1A";
        const borderMatch = borderCss.match(/^([\d.]+)px\s+(\S+)\s+(.+)$/);
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "svg",
          {
            className: "pptd-line",
            style,
            viewBox: `0 0 ${viewBox[0]} ${viewBox[1]}`,
            preserveAspectRatio: "none",
            fill: "none",
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "path",
              {
                d,
                stroke: borderMatch ? borderMatch[3] : "#1A1A1A",
                strokeWidth: borderMatch ? Number(borderMatch[1]) : 1
              }
            )
          }
        );
      }
      function ImageView({
        el,
        style,
        resolveMedia
      }) {
        const raw = el.src ?? el.content?.src;
        const src = raw && resolveMedia ? resolveMedia(raw) : raw;
        const [failedSrc, setFailedSrc] = React2.useState(null);
        const failed = Boolean(src) && failedSrc === src;
        if (!src || failed) {
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { ...style, ...placeholderBox() }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: placeholderLabel(), children: failed ? "图片加载失败" : "图片" }) });
        }
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "img",
          {
            src,
            alt: "",
            draggable: false,
            style: { ...style, objectFit: "cover", display: "block" },
            className: "pptd-image",
            onError: () => setFailedSrc(src ?? null)
          }
        );
      }
      function textStyleToCss(st, align, wrap, defaultV = "flex-start") {
        const css = {
          fontSize: typeof st.fontSize === "number" ? st.fontSize : void 0,
          color: typeof st.color === "string" ? st.color : void 0,
          fontFamily: typeof st.fontFamily === "string" ? st.fontFamily : void 0,
          lineHeight: typeof st.lineHeight === "number" ? st.lineHeight : void 0,
          fontWeight: st.bold ? 700 : void 0,
          fontStyle: st.italic ? "italic" : void 0,
          letterSpacing: typeof st.letterSpacing === "number" ? st.letterSpacing : void 0,
          background: typeof st.backgroundColor === "string" ? st.backgroundColor : void 0,
          // 宽高由外层 style（bounds）给定，这里绝不能 100%——会把元素撑成整个画布。
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          whiteSpace: wrap === false ? "nowrap" : "pre-wrap",
          wordBreak: "break-word"
        };
        const v = align[1];
        if (v === "middle") css.justifyContent = "center";
        else if (v === "bottom") css.justifyContent = "flex-end";
        else css.justifyContent = defaultV;
        const h = align[0];
        if (h === "center" || h === "right" || h === "left") css.textAlign = h;
        return css;
      }
      function placeholderBox() {
        return {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 8px,#f3f4f6 8px,#f3f4f6 16px)",
          border: "1px dashed #9ca3af",
          color: "#6b7280",
          fontSize: 12,
          overflow: "hidden"
        };
      }
      function placeholderLabel() {
        return { padding: "2px 6px", background: "rgba(255,255,255,.7)", borderRadius: 3 };
      }
      function placeholderText(type) {
        const map = {
          table: "表格",
          chart: "图表",
          icon: "图标",
          smartArt: "SmartArt 图示",
          group: "组合",
          media: "媒体",
          placeholder: "占位内容"
        };
        return map[type] ?? `${type}（暂不支持渲染）`;
      }
      function shapeTextWrap() {
        return {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 4,
          boxSizing: "border-box"
        };
      }

      // client/components/ThumbStrip.tsx
      var import_jsx_runtime4 = require("react/jsx-runtime");
      function ThumbStrip({ store, headerAction }) {
        const state = React3.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const [drag, setDrag] = React3.useState({ fromPath: null, overIndex: null });
        const pages = state.deckPages;
        const size = state.deck?.size ?? [960, 540];
        const theme = deckTheme(state.deck);
        if (!pages.length) {
          return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ppt-thumbs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ppt-thumbs-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                "button",
                {
                  type: "button",
                  className: "ppt-btn",
                  onClick: () => void store.actions.addPage(),
                  title: "add_page",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NewPageGlyph, { size: 13 }),
                    " 新页"
                  ]
                }
              ),
              headerAction
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)", padding: "4px 2px" }, children: "还没有页面；先点上面加一张。" })
          ] });
        }
        const dropAt = (toIndex) => {
          if (!drag.fromPath) return;
          void store.actions.movePage(drag.fromPath, toIndex);
          setDrag({ fromPath: null, overIndex: null });
        };
        const renderGap = (index) => {
          const over = drag.overIndex === index;
          return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ppt-thumbs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ppt-thumbs-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                onClick: () => void store.actions.addPage(),
                title: "add_page（在末尾追加一页空白页）",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NewPageGlyph, { size: 13 }),
                  " 新页"
                ]
              }
            ),
            headerAction
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ppt-thumblist", role: "list", children: pages.map((pagePath, index) => {
            const ast = state.pagesAst[index];
            const pageNo = index + 1;
            const active = index === state.currentPage;
            return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(React3.Fragment, { children: [
              index === 0 ? renderGap(0) : null,
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
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
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "ppt-thumb",
                        onClick: () => store.actions.setPage(index),
                        title: `第 ${pageNo} 页（${pagePath}）`,
                        "aria-pressed": active,
                        children: ast ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          PptdView,
                          {
                            page: ast.page,
                            size,
                            theme,
                            resolveMedia: (src) => store.actions.mediaUrl(src),
                            className: "ppt-thumb-pptd"
                          }
                        ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ThumbAstLoader, { pageIndex: index, store, label: `第 ${pageNo} 页` })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ppt-thumb-actions", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "ppt-btn ppt-thumb-action",
                          onClick: () => void store.actions.duplicatePage(pagePath),
                          title: "复制这页（page_duplicate）",
                          children: "复制"
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
      function ThumbAstLoader({
        pageIndex,
        store,
        label
      }) {
        const ref = React3.useRef(null);
        React3.useEffect(() => {
          const el = ref.current;
          if (!el) return;
          const load = () => void store.actions.ensurePageAst(pageIndex);
          if (typeof IntersectionObserver === "undefined") {
            load();
            return;
          }
          const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              io.disconnect();
              load();
            }
          });
          io.observe(el);
          return () => io.disconnect();
        }, [pageIndex, store]);
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { ref, className: "ppt-thumb-preview-placeholder", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "ppt-thumb-skeleton", "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "ppt-thumb-num", children: label })
        ] });
      }

      // client/components/Stage.tsx
      var React5 = __toESM(require("react"), 1);

      // client/components/TextEditor.tsx
      var React4 = __toESM(require("react"), 1);

      // client/render/text-markup.ts
      function hasRichMarkup(text) {
        const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g;
        let m;
        while ((m = re.exec(text)) !== null) {
          if (!/^(p|br)$/i.test(m[1])) return true;
        }
        return false;
      }
      function markupToPlain(text) {
        return text.replace(/\r\n?/g, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p\s*>\s*<p[^>]*>/gi, "\n").replace(/<\/?p[^>]*>/gi, "").replace(/<[^>]*>/g, "").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
      }
      function plainToMarkup(text) {
        const lines = text.replace(/\r\n?/g, "\n").split("\n");
        while (lines.length > 1 && lines[lines.length - 1].trim() === "") lines.pop();
        return lines.map((line) => `<p>${escapeHtml2(line)}</p>`).join("");
      }
      function textEditorModel(raw) {
        const rich = hasRichMarkup(raw);
        return {
          display: rich ? raw : markupToPlain(raw),
          rich,
          commit: (typed) => rich ? typed : plainToMarkup(typed)
        };
      }
      function escapeHtml2(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }

      // client/components/TextEditor.tsx
      var import_jsx_runtime5 = require("react/jsx-runtime");
      function TextEditor({
        store,
        elementId,
        onDone
      }) {
        const state = React4.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const page = state.currentPageData ?? null;
        const target = Array.isArray(page?.elements) ? page.elements.find((e) => e.elementId === elementId) : void 0;
        const rawText = String(target?.content?.text ?? "");
        const editor = textEditorModel(rawText);
        const ref = React4.useRef(null);
        const [committed, setCommitted] = React4.useState(false);
        React4.useEffect(() => {
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
          if (text === editor.display) {
            onDone();
            return;
          }
          setCommitted(true);
          const nextValue = editor.commit(text);
          if (nextValue === rawText) {
            onDone();
            return;
          }
          const ok = await store.actions.updateElement(elementId, { content: { ...target.content ?? {}, text: nextValue } });
          if (ok) onDone();
          else setCommitted(false);
        };
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
            children: editor.display
          }
        );
      }

      // client/components/Stage.tsx
      var import_jsx_runtime6 = require("react/jsx-runtime");
      function Stage({ store }) {
        const state = React5.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const [editing, setEditing] = React5.useState(null);
        React5.useEffect(() => {
          if (state.activeKey) void store.actions.ensurePageLoaded();
        }, [state.activeKey, state.currentPage, store]);
        React5.useEffect(() => {
          setEditing(null);
        }, [state.activeKey, state.currentPage]);
        if (!state.activeKey) return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ppt-stage ppt-stage-empty" });
        const size = state.deck?.size ?? [960, 540];
        const theme = deckTheme(state.deck);
        const page = state.currentPageData ?? null;
        const elements = Array.isArray(page?.elements) ? page.elements : [];
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ppt-stage", "data-page": state.currentPage + 1, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          PptdView,
          {
            page,
            size,
            theme,
            resolveMedia: (src) => store.actions.mediaUrl(src),
            className: "ppt-stage-pptd",
            overlay: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                ElementOverlay,
                {
                  elements,
                  selection: state.selection,
                  onSelect: (ids) => store.actions.setSelection(ids),
                  onEnterEdit: (elementId) => setEditing(elementId)
                }
              ),
              editing ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TextEditor, { store, elementId: editing, onDone: () => setEditing(null) }) : null
            ] })
          }
        ) });
      }
      function ElementOverlay({
        elements,
        selection,
        onSelect,
        onEnterEdit
      }) {
        const selectedId = selection && selection.ids.length ? selection.ids[0] : null;
        return (
          // 容器接收「点空白」→ 取消选择；元素框自己 stopPropagation，不会误触取消。
          // 容器要 pointer-events:auto 才收得到空白点击（样式里 overlay 默认 none，这里覆盖）。
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "div",
            {
              className: "ppt-overlay ppt-overlay-active",
              "aria-hidden": false,
              onClick: (e) => {
                if (e.target === e.currentTarget) onSelect([]);
              },
              children: elements.map((el) => {
                const id = el.elementId;
                const bounds = el.bounds;
                if (!id || !bounds || bounds.length !== 4) return null;
                const [x, y, w, h] = bounds;
                const isSel = selectedId === id;
                const isText = el.elementType === "text";
                return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
              })
            }
          )
        );
      }

      // client/components/Inspector.tsx
      var React6 = __toESM(require("react"), 1);

      // client/render/table-rows.ts
      function normTableRows(rows) {
        if (!Array.isArray(rows)) return [];
        return rows.map(
          (r) => Array.isArray(r) ? r.map((c) => c && typeof c === "object" ? c : { text: c ?? "" }) : []
        );
      }
      function equalRatios(n) {
        return n > 0 ? Array.from({ length: n }, () => 1 / n) : [];
      }

      // client/components/Inspector.tsx
      var import_jsx_runtime7 = require("react/jsx-runtime");
      async function fileToBase64(file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        const CHUNK = 32768;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
        }
        return btoa(binary);
      }
      function fillColorOf(fill) {
        if (typeof fill === "string") return fill;
        if (fill && typeof fill === "object") return fill.color;
        return void 0;
      }
      function Inspector({ store, onCollapse }) {
        const state = React6.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const selection = state.selection;
        const page = state.currentPageData ?? null;
        const [textMode, setTextMode] = React6.useState("plain");
        const [textDraft, setTextDraft] = React6.useState(null);
        const [fontDraft, setFontDraft] = React6.useState(null);
        if (!selection || !selection.ids.length) {
          return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ppt-inspector", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "ppt-inspector-empty", children: "点一个元素开始编辑它的属性。" }) });
        }
        const elementId = selection.ids[0];
        const target = Array.isArray(page?.elements) ? page.elements.find((e) => e.elementId === elementId) : void 0;
        if (!target) {
          return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ppt-inspector", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "ppt-inspector-empty", children: "选中的元素已不在磁盘上（可能被外部删除了）。" }) });
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
        const rawText = String(content.text ?? "");
        const richText = hasRichMarkup(rawText);
        const elementType = String(target.elementType ?? "text");
        const isTextLike = elementType === "text" || elementType === "shape";
        const usesFillColor = elementType === "shape" || elementType === "icon";
        const hasColorRow = isTextLike || elementType === "icon";
        const colorSource = usesFillColor ? fillColorOf(target.fill) : content.color;
        const commitColor = (color) => {
          if (usesFillColor) setField({ fill: { type: "solid", color } });
          else setContentField({ color });
        };
        const theme = deckTheme(state.deck);
        const colorModel = colorFieldModel(colorSource, theme);
        const themeColors = Object.entries(theme?.colors ?? {}).map(([key, raw]) => ({
          key,
          ref: `$${key}`,
          hex: normalizeHex(raw)
        }));
        const textKey = `${state.activeKey ?? ""}#${state.currentPage}#${elementId}#${textMode}`;
        const textValue = textDraft && textDraft.key === textKey ? textDraft.value : textMode === "plain" ? markupToPlain(rawText) : rawText;
        const commitText = (next) => {
          setTextDraft({ key: textKey, value: next });
          setContentField({ text: textMode === "plain" ? plainToMarkup(next) : next });
        };
        const fontKey = `${state.activeKey ?? ""}#${state.currentPage}#${elementId}#fontSize`;
        const fontSizeOnDisk = typeof content.fontSize === "number" ? content.fontSize : 16;
        const fontValue = fontDraft && fontDraft.key === fontKey ? fontDraft.value : String(fontSizeOnDisk);
        const commitFontSize = (raw) => {
          setFontDraft(null);
          const trimmed = raw.trim();
          if (!trimmed) return;
          const parsed = Number(trimmed);
          if (!Number.isFinite(parsed)) return;
          const clamped = Math.min(200, Math.max(6, Math.round(parsed)));
          if (clamped !== fontSizeOnDisk) setContentField({ fontSize: clamped });
        };
        return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("strong", { children: target.elementId }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ppt-inspector-tag", children: target.elementType }),
            onCollapse ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                type: "button",
                className: "ppt-btn ppt-inspector-collapse",
                onClick: onCollapse,
                title: "收起属性面板",
                "aria-label": "收起属性面板",
                children: "›"
              }
            ) : null
          ] }),
          elementType === "icon" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "iconName（Font Awesome 免费集）" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "input",
              {
                type: "text",
                value: String(target.iconName ?? ""),
                placeholder: "fas:house",
                onChange: (e) => setField({ iconName: e.target.value })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ppt-inspector-hint", children: "画布暂不渲染 icon（显示占位框）；这里改的 iconName 会照常写进 .page。" })
          ] }) : null,
          isTextLike ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ppt-inspector-labelrow", children: [
              "文字",
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ppt-inspector-modes", role: "group", "aria-label": "文字编辑模式", children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                  "button",
                  {
                    type: "button",
                    className: `ppt-btn ppt-btn-mode${textMode === "plain" ? " ppt-btn-on" : ""}`,
                    "aria-pressed": textMode === "plain",
                    onClick: () => setTextMode("plain"),
                    title: "按纯文字编辑；保存时按行包回 <p>",
                    children: "纯文字"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                  "button",
                  {
                    type: "button",
                    className: `ppt-btn ppt-btn-mode${textMode === "markup" ? " ppt-btn-on" : ""}`,
                    "aria-pressed": textMode === "markup",
                    onClick: () => setTextMode("markup"),
                    title: "直接编辑原始标记（<p> = 段落）",
                    children: "标记"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "textarea",
              {
                rows: 3,
                value: textValue,
                onChange: (e) => commitText(e.target.value),
                onBlur: () => setTextDraft(null)
              }
            ),
            richText && textMode === "plain" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ppt-inspector-hint", children: "原文含行内格式（<strong> 等），纯文字模式保存会丢弃；要保留请切「标记」。" }) : null
          ] }) : null,
          isTextLike ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "字号" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "input",
              {
                type: "number",
                min: 6,
                max: 200,
                value: fontValue,
                onChange: (e) => setFontDraft({ key: fontKey, value: e.target.value }),
                onBlur: (e) => commitFontSize(e.target.value)
              }
            )
          ] }) : null,
          hasColorRow ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-labelrow", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: usesFillColor ? "填充色" : "颜色" }),
              colorModel.ref ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("code", { className: "ppt-inspector-ref", children: colorModel.ref }) : null
            ] }),
            themeColors.length ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ppt-inspector-swatches", role: "group", "aria-label": "主题色", children: themeColors.map(({ key, ref, hex }) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                type: "button",
                className: `ppt-inspector-swatch${colorModel.ref === ref ? " ppt-inspector-swatch-on" : ""}`,
                style: hex ? { background: hex } : void 0,
                title: `${ref}${hex ? `（${hex}）` : ""}`,
                "aria-label": `主题色 ${ref}`,
                "aria-pressed": colorModel.ref === ref,
                onClick: () => commitColor(ref)
              },
              key
            )) }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "input",
              {
                type: "color",
                "aria-label": "自定义颜色（字面量）",
                value: colorModel.picker,
                onChange: (e) => commitColor(e.target.value)
              }
            )
          ] }) : null,
          isTextLike ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "对齐（横向 / 纵向）" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-pair", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("select", { value: hx, onChange: (e) => setContentField({ align: [e.target.value, hv] }), children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "left", children: "左" }),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "center", children: "中" }),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "right", children: "右" }),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "justify", children: "两端" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("select", { value: hv, onChange: (e) => setContentField({ align: [hx, e.target.value] }), children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "top", children: "顶" }),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "middle", children: "中" }),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "bottom", children: "底" })
              ] })
            ] })
          ] }) : null,
          elementType === "table" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TableGrid, { rows: target.rows, onPatch: setField }) : null,
          elementType === "placeholder" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "占位元素（逆向方言）" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ppt-inspector-hint", children: [
              "原类型 ",
              String(target.originalType ?? "unknown"),
              "；源部件数据不进工程，画布显示斜纹占位框，位置大小可调。"
            ] })
          ] }) : null,
          elementType === "chart" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "图表" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ppt-inspector-hint", children: "data / series / title 等字段请在 .page 里直改，ppt_render 复核成品。" })
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "bounds [x, y, w, h]" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ppt-inspector-bounds", children: ["x", "y", "w", "h"].map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: label }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "input",
                {
                  type: "number",
                  value: [bx, by, bw, bh][i],
                  onChange: (e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    const next = [bx, by, bw, bh];
                    next[i] = i < 2 ? Math.max(0, v) : v > 0 ? v : 1;
                    setField({ bounds: next });
                  }
                }
              )
            ] }, label)) })
          ] }),
          target.elementType === "image" && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "替换图片" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
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
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ppt-inspector-hint", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ImportGlyph, { size: 11 }),
              " 上传落到工程 media/ 下（宿主生成文件名），然后 update_element set src。"
            ] })
          ] })
        ] });
      }
      function TableGrid({ rows, onPatch }) {
        const grid = normTableRows(rows);
        const colCount = grid.reduce((m, r) => Math.max(m, r.length), 0);
        if (!grid.length || !colCount) {
          return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: "表格内容" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                onClick: () => onPatch({
                  rows: [
                    [{ text: "" }, { text: "" }],
                    [{ text: "" }, { text: "" }]
                  ],
                  columnWidths: [0.5, 0.5],
                  rowHeights: [0.5, 0.5]
                }),
                children: "+ 初始化 2×2 表格"
              }
            )
          ] });
        }
        const setCell = (ri, ci, text) => {
          onPatch({
            rows: grid.map((row, r) => row.map((cell, c) => r === ri && c === ci ? { ...cell, text } : cell))
          });
        };
        return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ppt-inspector-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ppt-inspector-labelrow", children: [
            "表格内容（",
            grid.length,
            " 行 × ",
            colCount,
            " 列）",
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ppt-inspector-modes", role: "group", "aria-label": "表格结构", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "button",
                {
                  type: "button",
                  className: "ppt-btn ppt-btn-mode",
                  onClick: () => onPatch({
                    rows: [...grid, Array.from({ length: colCount }, () => ({ text: "" }))],
                    rowHeights: equalRatios(grid.length + 1)
                  }),
                  children: "+行"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "button",
                {
                  type: "button",
                  className: "ppt-btn ppt-btn-mode",
                  disabled: grid.length <= 1,
                  onClick: () => onPatch({ rows: grid.slice(0, -1), rowHeights: equalRatios(grid.length - 1) }),
                  children: "−行"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "button",
                {
                  type: "button",
                  className: "ppt-btn ppt-btn-mode",
                  onClick: () => onPatch({
                    rows: grid.map((row) => [...row, { text: "" }]),
                    columnWidths: equalRatios(colCount + 1)
                  }),
                  children: "+列"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "button",
                {
                  type: "button",
                  className: "ppt-btn ppt-btn-mode",
                  disabled: colCount <= 1,
                  onClick: () => onPatch({
                    rows: grid.map((row) => row.slice(0, -1)),
                    columnWidths: equalRatios(colCount - 1)
                  }),
                  children: "−列"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ppt-inspector-table", style: { gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }, children: grid.map(
            (row, ri) => row.map((cell, ci) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "input",
              {
                type: "text",
                value: String(cell.text ?? ""),
                "aria-label": `单元格 ${ri + 1}-${ci + 1}`,
                onChange: (e) => setCell(ri, ci, e.target.value)
              },
              `${ri}-${ci}`
            ))
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ppt-inspector-hint", children: "增删行列后列宽/行高均分；合并单元格的 rowSpan/colSpan 随单元格保留。画布显示占位框，成品以 ppt_render 为准。" })
        ] });
      }

      // client/components/HistoryDrawer.tsx
      var React7 = __toESM(require("react"), 1);
      var import_jsx_runtime8 = require("react/jsx-runtime");
      function formatTime(iso) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      function opsSummary(entry) {
        const head = entry.ops.slice(0, 3).join("、");
        const more = entry.ops.length > 3 ? ` 等 ${entry.ops.length} 项` : "";
        const merged = entry.mergedCount > 0 ? `（合并 ${entry.mergedCount} 次编辑）` : "";
        return `${head || "（创建）"}${more}${merged}`;
      }
      function HistoryDrawer({ store, onClose }) {
        const state = React7.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const [entries, setEntries] = React7.useState(null);
        const [cursor, setCursor] = React7.useState(0);
        const [selected, setSelected] = React7.useState(null);
        const [preview, setPreview] = React7.useState(null);
        const [previewPage, setPreviewPage] = React7.useState(0);
        const [busy, setBusy] = React7.useState(false);
        const [error, setError] = React7.useState(null);
        const key = state.activeKey;
        const sessionId = state.sessionId;
        React7.useEffect(() => {
          let cancelled = false;
          if (!key) return;
          api.listHistory(sessionId, key).then((res) => {
            if (cancelled) return;
            setCursor(res.revision);
            setEntries([...res.entries].sort((a, b) => b.revision - a.revision));
          }).catch((err) => {
            if (!cancelled) setError(`历史列表拉取失败：${err.message}`);
          });
          return () => {
            cancelled = true;
          };
        }, [key, sessionId]);
        const pick2 = (revision) => {
          if (!key || revision === selected) return;
          setSelected(revision);
          setPreview(null);
          setPreviewPage(0);
          setError(null);
          api.getHistoryPages(sessionId, key, revision).then((snap) => {
            setPreview({
              size: snap.deck?.size ?? [960, 540],
              pages: snap.pages.map((p) => p.page ?? {}),
              warnings: snap.warnings
            });
          }).catch((err) => setError(`快照读取失败：${err.message}`));
        };
        const restore = async () => {
          if (selected === null || busy || selected === cursor) return;
          setBusy(true);
          try {
            const ok = await store.actions.restoreRevision(selected);
            if (ok) onClose();
          } finally {
            setBusy(false);
          }
        };
        const pageCount = preview?.pages.length ?? 0;
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-history", role: "dialog", "aria-label": "版本历史", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-history-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: "版本历史" }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "ppt-history-head-meta", children: [
              "当前 r",
              cursor
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ppt-spacer" }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
              "button",
              {
                type: "button",
                className: "ppt-history-close",
                onClick: onClose,
                "aria-label": "关闭版本历史",
                title: "关闭",
                children: "×"
              }
            )
          ] }),
          error ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-history-error", children: error }) : null,
          selected !== null ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-history-preview", children: [
            preview ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                PptdView,
                {
                  page: preview.pages[previewPage] ?? null,
                  size: preview.size,
                  resolveMedia: (src) => store.actions.mediaUrl(src),
                  className: "ppt-history-pptd"
                }
              ),
              pageCount > 1 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-history-pager", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "ppt-btn",
                    disabled: previewPage <= 0,
                    onClick: () => setPreviewPage((p) => Math.max(0, p - 1)),
                    children: "‹"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
                  previewPage + 1,
                  " / ",
                  pageCount
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "ppt-btn",
                    disabled: previewPage >= pageCount - 1,
                    onClick: () => setPreviewPage((p) => Math.min(pageCount - 1, p + 1)),
                    children: "›"
                  }
                )
              ] }) : null,
              preview.warnings.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-history-warn", title: preview.warnings.join("\n"), children: [
                "快照含 ",
                preview.warnings.length,
                " 条解析警告"
              ] }) : null
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ppt-history-loading", children: [
              "正在读取 r",
              selected,
              "…"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-history-actions", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
              "button",
              {
                type: "button",
                className: "ppt-btn ppt-btn-primary",
                disabled: busy || selected === cursor,
                onClick: () => void restore(),
                title: selected === cursor ? "目标就是当前版本" : "把工程恢复到这个版本（与撤销同一套游标语义）",
                children: busy ? "恢复中…" : `恢复到此版本（r${selected}）`
              }
            ) })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-history-hint", children: "点下面的版本号看预览。" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-history-list", children: entries === null ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ppt-history-loading", children: "正在读取历史…" }) : entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
            "button",
            {
              type: "button",
              className: `ppt-history-row${selected === entry.revision ? " ppt-history-row-on" : ""}`,
              onClick: () => pick2(entry.revision),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "ppt-history-rev", children: [
                  "r",
                  entry.revision,
                  entry.anchor ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("em", { className: "ppt-history-tag", children: "锚点" }) : null,
                  entry.revision === cursor ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("em", { className: "ppt-history-tag ppt-history-tag-on", children: "当前" }) : null
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ppt-history-ops", children: opsSummary(entry) }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ppt-history-time", children: formatTime(entry.createdAt) })
              ]
            },
            entry.revision
          )) })
        ] });
      }

      // client/components/Toolbar.tsx
      var React8 = __toESM(require("react"), 1);
      var import_jsx_runtime9 = require("react/jsx-runtime");
      function Toolbar({
        store,
        historyOpen,
        onShowHistory
      }) {
        const state = React8.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const disabled = !state.activeKey || state.saving;
        const inConflict = Boolean(state.conflict || state.externalChange);
        const onExport = async () => {
          await store.actions.exportDeck();
        };
        return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "ppt-toolbar", children: [
            state.activeKey ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "ppt-toolbar-project", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("strong", { children: state.deck?.title ?? state.activeKey }),
              state.deckPages.length ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "ppt-toolbar-meta", children: [
                state.deckPages.length,
                " 页"
              ] }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "ppt-toolbar-meta", children: [
                "第 ",
                state.lastSeenRevision,
                " 版"
              ] }),
              state.draft?.ops.length ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "ppt-toolbar-meta", children: [
                "草稿 ",
                state.draft.ops.length
              ] }) : null
            ] }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "ppt-spacer" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "button",
              {
                type: "button",
                className: `ppt-btn${historyOpen ? " ppt-btn-on" : ""}`,
                disabled,
                onClick: () => onShowHistory?.(),
                title: "版本历史：预览并恢复到任意历史版本（再点一次收起）",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(HistoryGlyph, { size: 13 }),
                  " 历史"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                disabled: disabled || !state.canUndo,
                onClick: () => void store.actions.undo(),
                title: "撤销（先提交草稿再撤）",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(UndoGlyph, { size: 13 }),
                  " 撤销"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                disabled: disabled || !state.canRedo,
                onClick: () => void store.actions.redo(),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(RedoGlyph, { size: 13 }),
                  " 重做"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "button",
              {
                type: "button",
                className: "ppt-btn",
                disabled: disabled || inConflict,
                onClick: () => void onExport(),
                title: "导出 .pptx 到工程目录的 export/ 下",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ExportGlyph, { size: 13 }),
                  " 导出 .pptx"
                ]
              }
            )
          ] }),
          state.conflict ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "ppt-banner", "data-kind": "error", children: [
            "和服务端冲突了",
            typeof state.conflict.revision === "number" ? `（服务端已改到 rev ${state.conflict.revision}）` : "",
            "。 采用服务端版本会丢弃本地草稿。",
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", className: "ppt-btn ppt-btn-primary", onClick: () => void store.actions.resolveConflictTheirs(), children: "采用服务端版本" })
          ] }) : null,
          state.externalChange ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "ppt-banner", children: [
            "外部已修改（rev ",
            state.externalChange.revision,
            "）。",
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", className: "ppt-btn", onClick: () => void store.actions.acceptExternal(), children: "拉取服务端版本（丢弃本地草稿）" })
          ] }) : null,
          state.error && state.status === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "ppt-banner", "data-kind": "error", children: state.error }) : null
        ] });
      }

      // client/panel.tsx
      var import_jsx_runtime10 = require("react/jsx-runtime");
      function Title() {
        return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "ppt-title-label", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PptMark, { size: 14, className: "ppt-title-glyph" }),
          "PPT 工作台"
        ] });
      }
      function BlankLoading({ hint }) {
        return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-blank-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PptMark, { size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: "PPT 创客" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-sweep", "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { children: hint || "正在打开工作台…" })
        ] }) });
      }
      function BlankError({ error, onRetry }) {
        return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-blank-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PptMark, { size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: "PPT 创客" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { children: error }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-actions-row", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "ppt-btn", onClick: onRetry, children: "重试" }) })
        ] }) });
      }
      function BlankEmpty() {
        return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-blank", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-blank-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PptMark, { size: 20 }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: "PPT 创客" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { children: "还没有打开的演示文稿。" })
        ] }) });
      }
      function StatusBar({ store }) {
        const state = React9.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const toast = state.toast;
        const text = state.saving ? "正在保存…" : toast ? toast.text : "";
        const kind = !state.saving && toast?.kind === "error" ? "error" : "info";
        const file = !state.saving && toast?.kind !== "error" ? toast?.file : void 0;
        return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-statusbar", "data-kind": kind, role: "status", "aria-live": "polite", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "ppt-statusbar-text", children: text }),
          file && state.activeKey ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ExportOpenMenu, { file, sessionId: state.sessionId, sessionKey: state.activeKey }) : null
        ] });
      }
      function ExportOpenMenu({
        file,
        sessionId,
        sessionKey
      }) {
        const [open, setOpen] = React9.useState(false);
        const [apps, setApps] = React9.useState(null);
        const [busy, setBusy] = React9.useState(false);
        const [error, setError] = React9.useState(null);
        const rootRef = React9.useRef(null);
        const queriedFor = React9.useRef(null);
        const load = React9.useCallback(() => {
          queriedFor.current = file;
          setError(null);
          api.exportOpenMenu(sessionId, sessionKey, file).then((res) => setApps(res.applications)).catch((err) => setError(err.message));
        }, [sessionId, sessionKey, file]);
        React9.useEffect(() => {
          if (!open || apps !== null) return;
          if (queriedFor.current === file) return;
          load();
        }, [open, apps, file, load]);
        React9.useEffect(() => {
          if (!open) return;
          const onDown = (e) => {
            if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) setOpen(false);
          };
          const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
          };
          document.addEventListener("mousedown", onDown);
          document.addEventListener("keydown", onKey);
          return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
          };
        }, [open]);
        const fire = async (opts) => {
          if (busy) return;
          setBusy(true);
          setError(null);
          try {
            await api.exportOpen(sessionId, sessionKey, file, opts);
            setOpen(false);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        };
        const fallback = apps !== null && apps.length === 0 && !error;
        return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "ppt-openwith", ref: rootRef, children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
            "button",
            {
              type: "button",
              className: "ppt-openwith-btn",
              disabled: busy,
              onClick: () => setOpen((v) => !v),
              title: fallback ? "显示文件位置" : "打开导出的 .pptx",
              children: [
                "打开 ",
                open ? "▴" : "▾"
              ]
            }
          ),
          open ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-openwith-menu", role: "menu", children: [
            error ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-openwith-note", children: [
              error,
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "ppt-btn ppt-btn-mode", disabled: busy, onClick: () => load(), children: "重试" })
            ] }) : null,
            !error && apps === null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-openwith-note", children: "正在读取关联应用…" }) : null,
            !error && apps ? apps.map((app) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
              "button",
              {
                type: "button",
                role: "menuitem",
                className: "ppt-openwith-item",
                disabled: busy,
                onClick: () => void fire({ application: app.id }),
                children: [
                  app.icon ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("img", { className: "ppt-openwith-icon", src: app.icon, alt: "" }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "ppt-openwith-icon" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "ppt-openwith-name", children: [
                    app.name,
                    app.default ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("em", { className: "ppt-openwith-default", children: "（默认）" }) : null
                  ] })
                ]
              },
              app.id
            )) : null,
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-openwith-sep" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
              "button",
              {
                type: "button",
                role: "menuitem",
                className: "ppt-openwith-item",
                disabled: busy,
                onClick: () => void fire({ action: "reveal" }),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "ppt-openwith-icon", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(FolderGlyph, { size: 16 }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "ppt-openwith-name", children: "显示文件位置" })
                ]
              }
            )
          ] }) : null
        ] });
      }
      function SkeletonPanel({ store }) {
        const state = React9.useSyncExternalStore(store.subscribe, store.getSnapshot);
        React9.useEffect(() => {
          void store.actions.init();
        }, [store]);
        const [leftOpen, setLeftOpen] = React9.useState(true);
        const [rightOpen, setRightOpen] = React9.useState(false);
        const [historyOpen, setHistoryOpen] = React9.useState(false);
        const rightDismissedFor = React9.useRef(null);
        const selectedId = state.selection && state.selection.ids.length ? state.selection.ids[0] : null;
        React9.useEffect(() => {
          if (selectedId) {
            if (rightDismissedFor.current !== selectedId) {
              rightDismissedFor.current = null;
              setRightOpen(true);
            }
          } else {
            setRightOpen(false);
            rightDismissedFor.current = null;
          }
        }, [selectedId]);
        const closeRight = () => {
          rightDismissedFor.current = selectedId;
          setRightOpen(false);
        };
        return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-root", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Toolbar, { store, historyOpen, onShowHistory: () => setHistoryOpen((v) => !v) }),
          state.status === "loading" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(BlankLoading, { hint: state.loadingHint }),
          state.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(BlankError, { error: state.error || "面板载入失败", onRetry: () => void store.actions.init() }),
          state.status === "empty" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(BlankEmpty, {}),
          state.status === "ready" && !state.activeKey && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ProjectList, { store }),
          state.status === "ready" && state.activeKey && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ppt-workbench", children: [
            leftOpen ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-rail ppt-rail-left", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              ThumbStrip,
              {
                store,
                headerAction: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "ppt-rail-collapse",
                    onClick: () => setLeftOpen(false),
                    title: "收起页列表",
                    "aria-label": "收起页列表",
                    children: "‹"
                  }
                )
              }
            ) }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              "button",
              {
                type: "button",
                className: "ppt-rail-handle ppt-rail-handle-left",
                onClick: () => setLeftOpen(true),
                title: "展开页列表",
                "aria-label": "展开页列表",
                children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "ppt-rail-handle-glyph", children: "›" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Stage, { store }),
            rightOpen ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ppt-rail ppt-rail-right", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Inspector, { store, onCollapse: closeRight }) }) : null,
            historyOpen ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(HistoryDrawer, { store, onClose: () => setHistoryOpen(false) }) : null
          ] }),
          state.status === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(StatusBar, { store }) : null
        ] });
      }

      // client/store.ts
      function initialState(sessionId) {
        return {
          status: "loading",
          error: null,
          loadingHint: null,
          sessionId,
          projects: [],
          activeKey: null,
          manifest: null,
          deck: null,
          deckPages: [],
          currentPageData: null,
          currentPageRevision: -1,
          lastSeenRevision: -1,
          pagesAst: {},
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
        const STAGE_DEBOUNCE_MS = 400;
        const STRUCTURAL_OPS = /* @__PURE__ */ new Set([
          "add_page",
          "remove_page",
          "page_add",
          "page_delete",
          "move_page",
          "page_duplicate"
        ]);
        let stageTimer = null;
        let flushPending = false;
        const astInflight = /* @__PURE__ */ new Set();
        const SESSION_RACE_BUDGET_MS = 15e3;
        const SESSION_RACE_RETRY_MS = 800;
        let sessionRaceSince = -1;
        let sessionRaceTimer = null;
        function scheduleFlush() {
          if (stageTimer) clearTimeout(stageTimer);
          stageTimer = setTimeout(() => {
            stageTimer = null;
            void flush();
          }, STAGE_DEBOUNCE_MS);
        }
        async function flushNow() {
          if (stageTimer) {
            clearTimeout(stageTimer);
            stageTimer = null;
          }
          return flush();
        }
        const emit = () => {
          for (const fn of listeners) fn();
        };
        const patch = (next) => {
          let changed = false;
          for (const key of Object.keys(next)) {
            if (!Object.is(state[key], next[key])) {
              changed = true;
              break;
            }
          }
          if (!changed) return;
          state = { ...state, ...next };
          emit();
        };
        const toast = (text, kind = "info", opts) => {
          toastSeq += 1;
          const id = toastSeq;
          patch({ toast: { id, text, kind, file: opts?.file } });
          const timer = setTimeout(
            () => {
              toastTimers.delete(timer);
              if (state.toast && state.toast.id === id) patch({ toast: null });
            },
            opts?.lingerMs ?? (kind === "error" ? 5e3 : 2600)
          );
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
              pagesAst: {}
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
            // 不保留 error：applyPoll 只在 /state 成功时被调用（失败走 init/轮询的 catch，根本到不了这里），
            // 一次成功的轮询就是「宿主恢复」的信号——重启竞态里 init 撞 400 后，这里负责把人救回面板，
            // 否则错误屏会一直挂到用户手动点「重试」。
            status: projects.length || nextKey ? "ready" : "empty",
            error: null,
            projects,
            // canUndo/canRedo 由宿主 /state 的 manifest 轮廓给出（activeKey 工程才有意义）。
            canUndo: Boolean(st.manifest?.canUndo),
            canRedo: Boolean(st.manifest?.canRedo)
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
              pagesAst: {}
            });
            void actions.ensurePageLoaded();
            void actions.syncProjectPages();
            return;
          }
          patch(patchBase);
        }
        async function flush() {
          if (!state.activeKey || !state.draft || !state.draft.ops.length) return false;
          if (state.conflict) return false;
          if (state.externalChange) return false;
          if (state.saving) {
            flushPending = true;
            return false;
          }
          const key = state.activeKey;
          const base = state.draft.baseRevision;
          const ops = state.draft.ops;
          const sent = ops.length;
          patch({ saving: true });
          try {
            const res = await api.edit(state.sessionId, key, base, ops);
            const morePending = flushPending;
            flushPending = false;
            if (state.activeKey !== key) {
              patch({ saving: false });
              return false;
            }
            const rest = state.draft && state.draft.ops.length > sent ? state.draft.ops.slice(sent) : [];
            patch({
              saving: false,
              lastSeenRevision: res.revision,
              // 残余（在飞期间新 stage 的 op）换到新基线继续挂着；没有残余才清空草稿。
              draft: rest.length ? { baseRevision: res.revision, ops: rest } : null,
              conflict: null,
              externalChange: null
            });
            const warnings = res.warnings ?? [];
            if (warnings.length) {
              toast(
                warnings.length > 1 ? `已保存，但有 ${warnings.length} 条提示，首条：${warnings[0]}` : `已保存，但有提示：${warnings[0]}`,
                "info"
              );
            }
            const structural = ops.some(
              (op) => op && typeof op === "object" && STRUCTURAL_OPS.has(String(op.op ?? ""))
            );
            if (structural) {
              patch({ currentPageData: null, currentPageRevision: -1, pagesAst: {} });
              void actions.ensurePageLoaded(true);
            } else {
              void actions.ensurePageLoaded(true);
              void actions.ensurePageAst(state.currentPage, true);
              void actions.ensureAllPages();
            }
            void actions.syncProjectPages();
            if (morePending && rest.length) scheduleFlush();
            return true;
          } catch (error) {
            flushPending = false;
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
            if (stageTimer) {
              clearTimeout(stageTimer);
              stageTimer = null;
            }
            if (!state.draft) return true;
            return flush();
          },
          /** 面板挂载时初始化：拉一次 /state，把 projects 与 active 排进 store。 */
          async init() {
            try {
              patch({ status: "loading", error: null, loadingHint: null });
              const st = await api.state(state.sessionId);
              sessionRaceSince = -1;
              await applyPoll(st);
            } catch (error) {
              const message = error.message;
              if (message.includes("无法解析会话工作目录")) {
                const now = Date.now();
                if (sessionRaceSince < 0) sessionRaceSince = now;
                if (now - sessionRaceSince <= SESSION_RACE_BUDGET_MS) {
                  const waited = now - sessionRaceSince;
                  patch({
                    status: "loading",
                    error: null,
                    loadingHint: waited >= 3e3 ? "宿主正在就绪，请稍候…" : null
                  });
                  if (sessionRaceTimer) clearTimeout(sessionRaceTimer);
                  sessionRaceTimer = setTimeout(() => {
                    sessionRaceTimer = null;
                    void actions.init();
                  }, SESSION_RACE_RETRY_MS);
                  return;
                }
              }
              patch({ status: "error", error: message, loadingHint: null });
            }
          },
          /** 轮询入口（index.tsx 的定时器调它）。 */
          applyPoll,
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
           * `force`：保存成功后必须走这条——合并窗口里的连写不推进 revision，
           * 光比 revision 会以为「磁盘没变」，把后续改动全压在旧 AST 上。
           */
          async ensurePageLoaded(force = false) {
            if (!state.activeKey) return;
            const page = state.currentPage;
            if (page < 0 || page >= state.deckPages.length) {
              patch({ currentPageData: null, currentPageRevision: -1 });
              return;
            }
            if (!force && state.currentPageData !== null && state.currentPageRevision === state.lastSeenRevision) return;
            const key = state.activeKey;
            const path = state.deckPages[page];
            try {
              const res = await api.page(state.sessionId, key, path);
              if (state.currentPage !== page || state.activeKey !== key) return;
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
           * PptdView 的媒体 src 解析：media/ 相对路径映射到宿主 /media 路由；
           * http(s): 远端 URL（规格允许）原样透传，不进 /media。
           */
          mediaUrl(src) {
            if (!state.activeKey) return src;
            if (!src.startsWith("media/")) return src;
            return api.mediaUrl(state.sessionId, state.activeKey, src);
          },
          /**
           * 拉某一页的 AST 进 pagesAst 缓存（ThumbStrip 的 DOM 缩略图按页渲染用）。
           * 已有缓存且 revision 未变则复用；失败静默（缩略图退化为占位）。
           * 竞态守卫：捕获请求时的 activeKey，响应回来比对——切了工程就把旧响应丢掉。
           * 并发守卫：同一页同时被滚动与选中触发时只发一次（in-flight 集合，force 与普通请求分开记）。
           */
          async ensurePageAst(pageIndex, force = false) {
            if (!state.activeKey) return;
            if (pageIndex < 0 || pageIndex >= state.deckPages.length) return;
            const hit = state.pagesAst[pageIndex];
            if (!force && hit && hit.revision === state.lastSeenRevision) return;
            const key = state.activeKey;
            const path = state.deckPages[pageIndex];
            const inflightKey = `${force ? "force" : "auto"}:${key}#${pageIndex}`;
            if (astInflight.has(inflightKey)) return;
            astInflight.add(inflightKey);
            try {
              const res = await api.page(state.sessionId, key, path);
              if (state.activeKey !== key) return;
              patch({
                pagesAst: { ...state.pagesAst, [pageIndex]: { page: res.page, revision: res.revision } }
              });
            } catch {
            } finally {
              astInflight.delete(inflightKey);
            }
          },
          /** 并行拉齐所有页 AST（打开工程 / revision 变化后，ThumbStrip 一次性渲染整列）。 */
          async ensureAllPages(force = false) {
            if (!state.activeKey) return;
            await Promise.all(state.deckPages.map((_, i) => actions.ensurePageAst(i, force)));
          },
          /**
           * 重拉 /project 同步页清单：add/remove/move_page 之后 deck.pages 会变。
           * 只刷新 deck/deckPages——lastSeenRevision 的权威是 /edit 响应（flush 已推进），
           * 这里不覆盖（否则一个迟到的旧 project 响应会把 revision 拽回去）。
           * 失败静默：轮询只在 revision 前进的分支里顺带调用本函数，所以这里失败就是静默丢一次，
           * 要等下一次有人写盘（或下一次 save 成功）才会再拉。
           */
          async syncProjectPages() {
            const key = state.activeKey;
            if (!key) return;
            try {
              const res = await api.project(state.sessionId, key);
              if (state.activeKey !== key) return;
              patch({
                deck: res.deck,
                deckPages: Array.isArray(res.deck?.pages) ? res.deck.pages : []
              });
            } catch {
            }
          },
          /**
           * 累积一杆 op（S8 TextEditor 提交、S9 ThumbStrip 页操作都走这里）：
           * 只是先记入草稿 + 亮「save」，不立即 flush。草稿落地有三条路：
           * ①防抖窗口到期（scheduleFlush，见 STAGE_DEBOUNCE_MS）；②撤销/重做/导出前
           * 主动调 applyDraft；③面板卸载时 dispose 里的 flushNow 兜底。
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
            scheduleFlush();
            return true;
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
                pagesAst: {},
                // 乐观更新按钮态：undo 成功后游标下降，前方必有快照可重做
                canUndo: res.revision > 0,
                canRedo: true
              });
              void actions.ensurePageLoaded();
              void actions.syncProjectPages();
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
                pagesAst: {},
                // redo 成功后游标必 > 0；canRedo 是否还有余量交给下轮轮询校准
                canUndo: true
              });
              void actions.ensurePageLoaded();
              void actions.syncProjectPages();
              toast("已重做", "info");
            } catch (error) {
              toast(`重做失败：${error.message}`, "error");
            }
          },
          /**
           * 「恢复到历史版本」：与 undo/redo 同为游标移动，只是目标显式（版本历史抽屉用）。
           * baseRevision 取 lastSeenRevision——和编辑同一条修订基线；409 时亮冲突横幅。
           */
          async restoreRevision(revision) {
            if (!state.activeKey) return false;
            if (!await actions.applyDraft()) return false;
            const key = state.activeKey;
            try {
              const res = await api.restoreHistory(state.sessionId, key, revision, state.lastSeenRevision);
              patch({
                lastSeenRevision: res.revision,
                conflict: null,
                externalChange: null,
                currentPageData: null,
                currentPageRevision: -1,
                pagesAst: {},
                selection: null,
                canUndo: res.revision > 0,
                canRedo: true
              });
              void actions.ensurePageLoaded();
              void actions.syncProjectPages();
              toast(`已恢复到 r${res.revision}`, "info");
              return true;
            } catch (error) {
              if (error instanceof ConflictError) {
                patch({ conflict: { revision: error.revision } });
              }
              toast(`恢复失败：${error.message}`, "error");
              return false;
            }
          },
          /**
           * 「导出 .pptx」：宿主把 pptx 落到工程目录 `export/` 下，回相对路径 + 字节数。
           * 不走浏览器下载——桌面外壳的下载没有可回读的落点，磁盘上的文件才是确定的结果，
           * 所以这里只报告落点（store 不碰 DOM）。
           */
          async exportDeck() {
            if (!state.activeKey) return null;
            try {
              const saved = await api.exportPptxToProject(state.sessionId, state.activeKey);
              if (saved.revision) patch({ lastSeenRevision: saved.revision });
              const kb = Math.max(1, Math.round(saved.bytes / 1024));
              toast(`已导出 ${saved.relativePath || saved.filename}（${kb} KB）`, "info", {
                file: saved.absolutePath || void 0,
                lingerMs: 1e4
              });
              return saved;
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
            if (state.draft && state.draft.ops.length && !state.conflict) void flushNow();
            for (const timer of toastTimers) clearTimeout(timer);
            toastTimers.clear();
            if (stageTimer) {
              clearTimeout(stageTimer);
              stageTimer = null;
            }
            if (sessionRaceTimer) {
              clearTimeout(sessionRaceTimer);
              sessionRaceTimer = null;
            }
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
          const store = React10.useMemo(() => sessionId ? storeFor(sessionId) : null, [sessionId]);
          if (!sessionId || !store) {
            return React10.createElement("div", { className: "ppt-root" }, "PPT 创客：拿不到当前会话，请在一个会话里打开。");
          }
          return React10.createElement(SkeletonPanel, { store });
        }
        let openOfficial = null;
        const openPanel = () => {
          if (!openOfficial) throw new Error("官方右侧栏尚未就绪");
          openOfficial();
        };
        let tabOpenedWarned = false;
        const openIfRequested = (sessionId, key) => {
          try {
            openPanel?.();
          } catch (error) {
            console.warn("[dsh-ppt-maker] 打开面板失败，下一次轮询会重试：", error);
            return false;
          }
          storeFor(sessionId);
          void api.tabOpened(sessionId, key).catch((error) => {
            if (tabOpenedWarned) return;
            tabOpenedWarned = true;
            console.warn("[dsh-ppt-maker] 通知宿主 tab-opened 失败（只报这一次）：", error);
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
              const reqs = Array.isArray(st.openRequests) ? st.openRequests : [];
              for (const req of reqs) {
                if (req && req.key) openIfRequested(sessionId, req.key);
              }
              const firstPoll = !seenSessions.has(sessionId);
              seenSessions.add(sessionId);
              const store = stores.get(sessionId);
              if (store) {
                const status = store.getSnapshot().status;
                if (firstPoll && (status === "ready" || status === "empty")) return;
                await store.actions.applyPoll(st);
              }
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
