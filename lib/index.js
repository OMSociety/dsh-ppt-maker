import { createRequire as __pptCreateRequire } from 'node:module';
const require = __pptCreateRequire(import.meta.url);
// dsh-ppt-maker — built artifact (tsup). Do not edit; edit src/ and run `npm run build`.
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar2(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar2;
    exports.isSeq = isSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit2(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit2.BREAK = BREAK;
    visit2.SKIP = SKIP;
    visit2.REMOVE = REMOVE;
    function visit_(key, node, visitor, path17) {
      const ctrl = callVisitor(key, node, visitor, path17);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path17, ctrl);
        return visit_(key, ctrl, visitor, path17);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path17 = Object.freeze(path17.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path17);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path17 = Object.freeze(path17.concat(node));
          const ck = visit_("key", node.key, visitor, path17);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path17);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path17) {
      const ctrl = await callVisitor(key, node, visitor, path17);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path17, ctrl);
        return visitAsync_(key, ctrl, visitor, path17);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path17 = Object.freeze(path17.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path17);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path17 = Object.freeze(path17.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path17);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path17);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path17) {
      if (typeof visitor === "function")
        return visitor(key, node, path17);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path17);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path17);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path17);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path17);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path17);
      return void 0;
    }
    function replaceNode(key, path17, node) {
      const parent = path17[path17.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit2;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit2 = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name2 = parts.shift();
        switch (name2) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name2}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit2.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit2 = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit2.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name2 = `${prefix}${i}`;
        if (!exclude.has(name2))
          return name2;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit2 = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit2.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        if (found && ctx) {
          const { anchors: anchors2, doc: doc2, maxAliasCount } = ctx;
          let data = anchors2.get(found);
          if (!data) {
            toJS.toJS(found, null, ctx);
            data = anchors2.get(found);
          }
          if (data?.res === void 0) {
            const msg = "This should not happen: Alias anchor was not resolved?";
            throw new ReferenceError(msg);
          }
          if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
              data.aliasCount = getAliasCount(doc2, found, anchors2);
            if (data.count * data.aliasCount > maxAliasCount) {
              const msg = "Excessive alias count indicates a resource exhaustion attack";
              throw new ReferenceError(msg);
            }
          }
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const source = this.resolve(ctx.doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        return ctx.anchors.get(source).res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path17, value) {
      let v = value;
      for (let i = path17.length - 1; i >= 0; --i) {
        const k = path17[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path17) => path17 == null || typeof path17 === "object" && !!path17[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path17, value) {
        if (isEmptyPath(path17))
          this.add(value);
        else {
          const [key, ...rest] = path17;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path17) {
        const [key, ...rest] = path17;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path17, keepScalar) {
        const [key, ...rest] = path17;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path17) {
        const [key, ...rest] = path17;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path17, value) {
        const [key, ...rest] = path17;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name2 = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name2} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning2) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning2);
        else
          console.warn(warning2);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument2(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument2;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument2 = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document2 = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path17, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path17, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name2) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name2 || prev.has(name2) ? anchors.findNewAnchor(name2 || "a", prev) : name2;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path17) {
        if (Collection.isEmptyPath(path17)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path17) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path17, keepScalar) {
        if (Collection.isEmptyPath(path17))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path17, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path17) {
        if (Collection.isEmptyPath(path17))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path17) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path17, value) {
        if (Collection.isEmptyPath(path17)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path17), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path17, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument2.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document2;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name2, pos, code, message) {
        super();
        this.name = name2;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc2) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc2.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc2.lineStarts[line - 1], lc2.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc2.lineStarts[line - 2], lc2.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep + cb;
              sep = "";
              break;
            }
            case "newline":
              if (comment)
                sep += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep)
                for (const st of sep) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name2 = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name2} must end with a ${expectedEnd}` : `${name2} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep === " ")
            sep = "\n";
          else if (!prevMoreIndented && sep === "\n")
            sep = "\n\n";
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep === "\n")
            value += "\n";
          else
            sep = "\n";
        } else {
          value += sep + content;
          sep = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return unfoldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function unfoldLines(source) {
      const line = /(.*?)\r?\n/sy;
      let match = line.exec(source);
      if (!match)
        return source;
      let trimEnd, trimBoth;
      try {
        trimEnd = new RegExp("(?<![ 	])[ 	]+$");
        trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
      } catch {
        trimEnd = /[ \t]+$/;
        trimBoth = /^[ \t]+|[ \t]+$/g;
      }
      let res = match[1].replace(trimEnd, "");
      let sep = " ";
      let pos = line.lastIndex;
      while (match = line.exec(source)) {
        const lm = match[1].replace(trimBoth, "");
        if (lm === "") {
          if (sep === "\n")
            res += sep;
          else
            sep = "\n";
        } else {
          res += sep + lm;
          sep = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document2 = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document2.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document2 = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning2) => {
          const pos = getErrorPos(source);
          if (warning2)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning2) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning2);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document2.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep)
        for (const st of sep)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit2(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit2.BREAK = BREAK;
    visit2.SKIP = SKIP;
    visit2.REMOVE = REMOVE;
    visit2.itemAtPath = (cst, path17) => {
      let item = cst;
      for (const [field, index] of path17) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit2.parentCollection = (cst, path17) => {
      const parent = visit2.itemAtPath(cst, path17.slice(0, -1));
      const field = path17[path17.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path17, item, visitor) {
      let ctrl = visitor(item, path17);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path17.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path17);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path17) : ctrl;
    }
    exports.visit = visit2;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar2 = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar2;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep;
          if (scalar.end) {
            sep = scalar.end;
            sep.push(this.sourceToken);
            delete scalar.end;
          } else
            sep = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep = it.sep;
                  sep.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep = fc.end.splice(1, fc.end.length);
            sep.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document2 = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning2) => log.warn(doc.options.logLevel, warning2));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document2.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document2 = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit2 = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document2.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit2.visit;
    exports.visitAsync = visit2.visitAsync;
  }
});

// node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/conventions.js
var require_conventions = __commonJS({
  "node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/conventions.js"(exports) {
    "use strict";
    function find(list, predicate, ac) {
      if (ac === void 0) {
        ac = Array.prototype;
      }
      if (list && typeof ac.find === "function") {
        return ac.find.call(list, predicate);
      }
      for (var i = 0; i < list.length; i++) {
        if (hasOwn(list, i)) {
          var item = list[i];
          if (predicate.call(void 0, item, i, list)) {
            return item;
          }
        }
      }
    }
    function freeze(object, oc) {
      if (oc === void 0) {
        oc = Object;
      }
      if (oc && typeof oc.getOwnPropertyDescriptors === "function") {
        object = oc.create(null, oc.getOwnPropertyDescriptors(object));
      }
      return oc && typeof oc.freeze === "function" ? oc.freeze(object) : object;
    }
    function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
    }
    function assign(target, source) {
      if (target === null || typeof target !== "object") {
        throw new TypeError("target is not an object");
      }
      for (var key in source) {
        if (hasOwn(source, key)) {
          target[key] = source[key];
        }
      }
      return target;
    }
    var HTML_BOOLEAN_ATTRIBUTES = freeze({
      allowfullscreen: true,
      async: true,
      autofocus: true,
      autoplay: true,
      checked: true,
      controls: true,
      default: true,
      defer: true,
      disabled: true,
      formnovalidate: true,
      hidden: true,
      ismap: true,
      itemscope: true,
      loop: true,
      multiple: true,
      muted: true,
      nomodule: true,
      novalidate: true,
      open: true,
      playsinline: true,
      readonly: true,
      required: true,
      reversed: true,
      selected: true
    });
    function isHTMLBooleanAttribute(name2) {
      return hasOwn(HTML_BOOLEAN_ATTRIBUTES, name2.toLowerCase());
    }
    var HTML_VOID_ELEMENTS = freeze({
      area: true,
      base: true,
      br: true,
      col: true,
      embed: true,
      hr: true,
      img: true,
      input: true,
      link: true,
      meta: true,
      param: true,
      source: true,
      track: true,
      wbr: true
    });
    function isHTMLVoidElement(tagName) {
      return hasOwn(HTML_VOID_ELEMENTS, tagName.toLowerCase());
    }
    var HTML_RAW_TEXT_ELEMENTS = freeze({
      script: false,
      style: false,
      textarea: true,
      title: true
    });
    function isHTMLRawTextElement(tagName) {
      var key = tagName.toLowerCase();
      return hasOwn(HTML_RAW_TEXT_ELEMENTS, key) && !HTML_RAW_TEXT_ELEMENTS[key];
    }
    function isHTMLEscapableRawTextElement(tagName) {
      var key = tagName.toLowerCase();
      return hasOwn(HTML_RAW_TEXT_ELEMENTS, key) && HTML_RAW_TEXT_ELEMENTS[key];
    }
    function isHTMLMimeType(mimeType) {
      return mimeType === MIME_TYPE.HTML;
    }
    function hasDefaultHTMLNamespace(mimeType) {
      return isHTMLMimeType(mimeType) || mimeType === MIME_TYPE.XML_XHTML_APPLICATION;
    }
    var MIME_TYPE = freeze({
      /**
       * `text/html`, the only mime type that triggers treating an XML document as HTML.
       *
       * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
       * @see https://en.wikipedia.org/wiki/HTML Wikipedia
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
       * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring
       *      WHATWG HTML Spec
       */
      HTML: "text/html",
      /**
       * `application/xml`, the standard mime type for XML documents.
       *
       * @see https://www.iana.org/assignments/media-types/application/xml IANA MimeType
       *      registration
       * @see https://tools.ietf.org/html/rfc7303#section-9.1 RFC 7303
       * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
       */
      XML_APPLICATION: "application/xml",
      /**
       * `text/xml`, an alias for `application/xml`.
       *
       * @see https://tools.ietf.org/html/rfc7303#section-9.2 RFC 7303
       * @see https://www.iana.org/assignments/media-types/text/xml IANA MimeType registration
       * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
       */
      XML_TEXT: "text/xml",
      /**
       * `application/xhtml+xml`, indicates an XML document that has the default HTML namespace,
       * but is parsed as an XML document.
       *
       * @see https://www.iana.org/assignments/media-types/application/xhtml+xml IANA MimeType
       *      registration
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument WHATWG DOM Spec
       * @see https://en.wikipedia.org/wiki/XHTML Wikipedia
       */
      XML_XHTML_APPLICATION: "application/xhtml+xml",
      /**
       * `image/svg+xml`,
       *
       * @see https://www.iana.org/assignments/media-types/image/svg+xml IANA MimeType registration
       * @see https://www.w3.org/TR/SVG11/ W3C SVG 1.1
       * @see https://en.wikipedia.org/wiki/Scalable_Vector_Graphics Wikipedia
       */
      XML_SVG_IMAGE: "image/svg+xml"
    });
    var _MIME_TYPES = Object.keys(MIME_TYPE).map(function(key) {
      return MIME_TYPE[key];
    });
    function isValidMimeType(mimeType) {
      return _MIME_TYPES.indexOf(mimeType) > -1;
    }
    var NAMESPACE = freeze({
      /**
       * The XHTML namespace.
       *
       * @see http://www.w3.org/1999/xhtml
       */
      HTML: "http://www.w3.org/1999/xhtml",
      /**
       * The SVG namespace.
       *
       * @see http://www.w3.org/2000/svg
       */
      SVG: "http://www.w3.org/2000/svg",
      /**
       * The `xml:` namespace.
       *
       * @see http://www.w3.org/XML/1998/namespace
       */
      XML: "http://www.w3.org/XML/1998/namespace",
      /**
       * The `xmlns:` namespace.
       *
       * @see https://www.w3.org/2000/xmlns/
       */
      XMLNS: "http://www.w3.org/2000/xmlns/"
    });
    exports.assign = assign;
    exports.find = find;
    exports.freeze = freeze;
    exports.HTML_BOOLEAN_ATTRIBUTES = HTML_BOOLEAN_ATTRIBUTES;
    exports.HTML_RAW_TEXT_ELEMENTS = HTML_RAW_TEXT_ELEMENTS;
    exports.HTML_VOID_ELEMENTS = HTML_VOID_ELEMENTS;
    exports.hasDefaultHTMLNamespace = hasDefaultHTMLNamespace;
    exports.hasOwn = hasOwn;
    exports.isHTMLBooleanAttribute = isHTMLBooleanAttribute;
    exports.isHTMLRawTextElement = isHTMLRawTextElement;
    exports.isHTMLEscapableRawTextElement = isHTMLEscapableRawTextElement;
    exports.isHTMLMimeType = isHTMLMimeType;
    exports.isHTMLVoidElement = isHTMLVoidElement;
    exports.isValidMimeType = isValidMimeType;
    exports.MIME_TYPE = MIME_TYPE;
    exports.NAMESPACE = NAMESPACE;
  }
});

// node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/errors.js
var require_errors2 = __commonJS({
  "node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/errors.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    function extendError(constructor, writableName) {
      constructor.prototype = Object.create(Error.prototype, {
        constructor: { value: constructor },
        name: { value: constructor.name, enumerable: true, writable: writableName }
      });
    }
    var DOMExceptionName = conventions.freeze({
      /**
       * the default value as defined by the spec
       */
      Error: "Error",
      /**
       * @deprecated
       * Use RangeError instead.
       */
      IndexSizeError: "IndexSizeError",
      /**
       * @deprecated
       * Just to match the related static code, not part of the spec.
       */
      DomstringSizeError: "DomstringSizeError",
      HierarchyRequestError: "HierarchyRequestError",
      WrongDocumentError: "WrongDocumentError",
      InvalidCharacterError: "InvalidCharacterError",
      /**
       * @deprecated
       * Just to match the related static code, not part of the spec.
       */
      NoDataAllowedError: "NoDataAllowedError",
      NoModificationAllowedError: "NoModificationAllowedError",
      NotFoundError: "NotFoundError",
      NotSupportedError: "NotSupportedError",
      InUseAttributeError: "InUseAttributeError",
      InvalidStateError: "InvalidStateError",
      SyntaxError: "SyntaxError",
      InvalidModificationError: "InvalidModificationError",
      NamespaceError: "NamespaceError",
      /**
       * @deprecated
       * Use TypeError for invalid arguments,
       * "NotSupportedError" DOMException for unsupported operations,
       * and "NotAllowedError" DOMException for denied requests instead.
       */
      InvalidAccessError: "InvalidAccessError",
      /**
       * @deprecated
       * Just to match the related static code, not part of the spec.
       */
      ValidationError: "ValidationError",
      /**
       * @deprecated
       * Use TypeError instead.
       */
      TypeMismatchError: "TypeMismatchError",
      SecurityError: "SecurityError",
      NetworkError: "NetworkError",
      AbortError: "AbortError",
      /**
       * @deprecated
       * Just to match the related static code, not part of the spec.
       */
      URLMismatchError: "URLMismatchError",
      QuotaExceededError: "QuotaExceededError",
      TimeoutError: "TimeoutError",
      InvalidNodeTypeError: "InvalidNodeTypeError",
      DataCloneError: "DataCloneError",
      EncodingError: "EncodingError",
      NotReadableError: "NotReadableError",
      UnknownError: "UnknownError",
      ConstraintError: "ConstraintError",
      DataError: "DataError",
      TransactionInactiveError: "TransactionInactiveError",
      ReadOnlyError: "ReadOnlyError",
      VersionError: "VersionError",
      OperationError: "OperationError",
      NotAllowedError: "NotAllowedError",
      OptOutError: "OptOutError"
    });
    var DOMExceptionNames = Object.keys(DOMExceptionName);
    function isValidDomExceptionCode(value) {
      return typeof value === "number" && value >= 1 && value <= 25;
    }
    function endsWithError(value) {
      return typeof value === "string" && value.substring(value.length - DOMExceptionName.Error.length) === DOMExceptionName.Error;
    }
    function DOMException(messageOrCode, nameOrMessage) {
      if (isValidDomExceptionCode(messageOrCode)) {
        this.name = DOMExceptionNames[messageOrCode];
        this.message = nameOrMessage || "";
      } else {
        this.message = messageOrCode;
        this.name = endsWithError(nameOrMessage) ? nameOrMessage : DOMExceptionName.Error;
      }
      if (Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
    }
    extendError(DOMException, true);
    Object.defineProperties(DOMException.prototype, {
      code: {
        enumerable: true,
        get: function() {
          var code = DOMExceptionNames.indexOf(this.name);
          if (isValidDomExceptionCode(code)) return code;
          return 0;
        }
      }
    });
    var ExceptionCode = {
      INDEX_SIZE_ERR: 1,
      DOMSTRING_SIZE_ERR: 2,
      HIERARCHY_REQUEST_ERR: 3,
      WRONG_DOCUMENT_ERR: 4,
      INVALID_CHARACTER_ERR: 5,
      NO_DATA_ALLOWED_ERR: 6,
      NO_MODIFICATION_ALLOWED_ERR: 7,
      NOT_FOUND_ERR: 8,
      NOT_SUPPORTED_ERR: 9,
      INUSE_ATTRIBUTE_ERR: 10,
      INVALID_STATE_ERR: 11,
      SYNTAX_ERR: 12,
      INVALID_MODIFICATION_ERR: 13,
      NAMESPACE_ERR: 14,
      INVALID_ACCESS_ERR: 15,
      VALIDATION_ERR: 16,
      TYPE_MISMATCH_ERR: 17,
      SECURITY_ERR: 18,
      NETWORK_ERR: 19,
      ABORT_ERR: 20,
      URL_MISMATCH_ERR: 21,
      QUOTA_EXCEEDED_ERR: 22,
      TIMEOUT_ERR: 23,
      INVALID_NODE_TYPE_ERR: 24,
      DATA_CLONE_ERR: 25
    };
    var entries = Object.entries(ExceptionCode);
    for (i = 0; i < entries.length; i++) {
      key = entries[i][0];
      DOMException[key] = entries[i][1];
    }
    var key;
    var i;
    function ParseError(message, locator, cause) {
      this.message = message;
      this.locator = locator;
      this.cause = cause;
      if (Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
    }
    extendError(ParseError);
    exports.DOMException = DOMException;
    exports.DOMExceptionName = DOMExceptionName;
    exports.ExceptionCode = ExceptionCode;
    exports.ParseError = ParseError;
  }
});

// node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/grammar.js
var require_grammar = __commonJS({
  "node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/grammar.js"(exports) {
    "use strict";
    function detectUnicodeSupport(RegExpImpl) {
      try {
        if (typeof RegExpImpl !== "function") {
          RegExpImpl = RegExp;
        }
        var match = new RegExpImpl("\u{1D306}", "u").exec("\u{1D306}");
        return !!match && match[0].length === 2;
      } catch (error) {
      }
      return false;
    }
    var UNICODE_SUPPORT = detectUnicodeSupport();
    function chars(regexp) {
      if (regexp.source[0] !== "[") {
        throw new Error(regexp + " can not be used with chars");
      }
      return regexp.source.slice(1, regexp.source.lastIndexOf("]"));
    }
    function chars_without(regexp, search) {
      if (regexp.source[0] !== "[") {
        throw new Error("/" + regexp.source + "/ can not be used with chars_without");
      }
      if (!search || typeof search !== "string") {
        throw new Error(JSON.stringify(search) + " is not a valid search");
      }
      if (regexp.source.indexOf(search) === -1) {
        throw new Error('"' + search + '" is not is /' + regexp.source + "/");
      }
      if (search === "-" && regexp.source.indexOf(search) !== 1) {
        throw new Error('"' + search + '" is not at the first postion of /' + regexp.source + "/");
      }
      return new RegExp(regexp.source.replace(search, ""), UNICODE_SUPPORT ? "u" : "");
    }
    function reg(args) {
      var self = this;
      return new RegExp(
        Array.prototype.slice.call(arguments).map(function(part) {
          var isStr = typeof part === "string";
          if (isStr && self === void 0 && part === "|") {
            throw new Error("use regg instead of reg to wrap expressions with `|`!");
          }
          return isStr ? part : part.source;
        }).join(""),
        UNICODE_SUPPORT ? "u" : ""
      );
    }
    function regg(args) {
      if (arguments.length === 0) {
        throw new Error("no parameters provided");
      }
      return reg.apply(regg, ["(?:"].concat(Array.prototype.slice.call(arguments), [")"]));
    }
    var UNICODE_REPLACEMENT_CHARACTER = "\uFFFD";
    var Char = /[-\x09\x0A\x0D\x20-\x2C\x2E-\uD7FF\uE000-\uFFFD]/;
    if (UNICODE_SUPPORT) {
      Char = reg("[", chars(Char), "\\u{10000}-\\u{10FFFF}", "]");
    }
    var InvalidChar = new RegExp("[^" + chars(Char) + "]", UNICODE_SUPPORT ? "u" : "");
    var _SChar = /[\x20\x09\x0D\x0A]/;
    var SChar_s = chars(_SChar);
    var S = reg(_SChar, "+");
    var S_OPT = reg(_SChar, "*");
    var NameStartChar = /[:_a-zA-Z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
    if (UNICODE_SUPPORT) {
      NameStartChar = reg("[", chars(NameStartChar), "\\u{10000}-\\u{10FFFF}", "]");
    }
    var NameStartChar_s = chars(NameStartChar);
    var NameChar = reg("[", NameStartChar_s, chars(/[-.0-9\xB7]/), chars(/[\u0300-\u036F\u203F-\u2040]/), "]");
    var Name = reg(NameStartChar, NameChar, "*");
    var Name_exact = reg("^", Name, "$");
    var Nmtoken = reg(NameChar, "+");
    var EntityRef = reg("&", Name, ";");
    var CharRef = regg(/&#[0-9]+;|&#x[0-9a-fA-F]+;/);
    var Reference = regg(EntityRef, "|", CharRef);
    var PEReference = reg("%", Name, ";");
    var EntityValue = regg(
      reg('"', regg(/[^%&"]/, "|", PEReference, "|", Reference), "*", '"'),
      "|",
      reg("'", regg(/[^%&']/, "|", PEReference, "|", Reference), "*", "'")
    );
    var AttValue = regg('"', regg(/[^<&"]/, "|", Reference), "*", '"', "|", "'", regg(/[^<&']/, "|", Reference), "*", "'");
    var NCNameStartChar = chars_without(NameStartChar, ":");
    var NCNameChar = chars_without(NameChar, ":");
    var NCName = reg(NCNameStartChar, NCNameChar, "*");
    var NCName_exact = reg("^", NCName, "$");
    var QName = reg(NCName, regg(":", NCName), "?");
    var QName_exact = reg("^", QName, "$");
    var QName_group = reg("(", QName, ")");
    var SystemLiteral = regg(/"[^"]*"|'[^']*'/);
    var PI = reg(/^<\?/, "(", Name, ")", regg(S, "(?!", _SChar, ")(", Char, "*?)"), "?", /\?>/);
    var PubidChar = /[\x20\x0D\x0Aa-zA-Z0-9-'()+,./:=?;!*#@$_%]/;
    var PubidLiteral = regg('"', PubidChar, '*"', "|", "'", chars_without(PubidChar, "'"), "*'");
    var COMMENT_START = "<!--";
    var COMMENT_END = "-->";
    var Comment = reg(COMMENT_START, regg(chars_without(Char, "-"), "|", reg("-", chars_without(Char, "-"))), "*", COMMENT_END);
    var PCDATA = "#PCDATA";
    var Mixed = regg(
      reg(/\(/, S_OPT, PCDATA, regg(S_OPT, /\|/, S_OPT, QName), "*", S_OPT, /\)\*/),
      "|",
      reg(/\(/, S_OPT, PCDATA, S_OPT, /\)/)
    );
    var _children_quantity = /[?*+]?/;
    var children = reg(
      /\([^>]+\)/,
      _children_quantity
      /*regg(choice, '|', seq), _children_quantity*/
    );
    var contentspec = regg("EMPTY", "|", "ANY", "|", Mixed, "|", children);
    var ELEMENTDECL_START = "<!ELEMENT";
    var elementdecl = reg(ELEMENTDECL_START, S, regg(QName, "|", PEReference), S, regg(contentspec, "|", PEReference), S_OPT, ">");
    var NotationType = reg("NOTATION", S, /\(/, S_OPT, Name, regg(S_OPT, /\|/, S_OPT, Name), "*", S_OPT, /\)/);
    var Enumeration = reg(/\(/, S_OPT, Nmtoken, regg(S_OPT, /\|/, S_OPT, Nmtoken), "*", S_OPT, /\)/);
    var EnumeratedType = regg(NotationType, "|", Enumeration);
    var AttType = regg(/CDATA|ID|IDREF|IDREFS|ENTITY|ENTITIES|NMTOKEN|NMTOKENS/, "|", EnumeratedType);
    var DefaultDecl = regg(/#REQUIRED|#IMPLIED/, "|", regg(regg("#FIXED", S), "?", AttValue));
    var AttDef = regg(S, Name, S, AttType, S, DefaultDecl);
    var ATTLIST_DECL_START = "<!ATTLIST";
    var AttlistDecl = reg(ATTLIST_DECL_START, S, Name, AttDef, "*", S_OPT, ">");
    var ABOUT_LEGACY_COMPAT = "about:legacy-compat";
    var ABOUT_LEGACY_COMPAT_SystemLiteral = regg('"' + ABOUT_LEGACY_COMPAT + '"', "|", "'" + ABOUT_LEGACY_COMPAT + "'");
    var SYSTEM = "SYSTEM";
    var PUBLIC = "PUBLIC";
    var ExternalID = regg(regg(SYSTEM, S, SystemLiteral), "|", regg(PUBLIC, S, PubidLiteral, S, SystemLiteral));
    var ExternalID_match = reg(
      "^",
      regg(
        regg(SYSTEM, S, "(?<SystemLiteralOnly>", SystemLiteral, ")"),
        "|",
        regg(PUBLIC, S, "(?<PubidLiteral>", PubidLiteral, ")", S, "(?<SystemLiteral>", SystemLiteral, ")")
      )
    );
    var PubidLiteral_match = reg("^", PubidLiteral, "$");
    var SystemLiteral_match = reg("^", SystemLiteral, "$");
    var NDataDecl = regg(S, "NDATA", S, Name);
    var EntityDef = regg(EntityValue, "|", regg(ExternalID, NDataDecl, "?"));
    var ENTITY_DECL_START = "<!ENTITY";
    var GEDecl = reg(ENTITY_DECL_START, S, Name, S, EntityDef, S_OPT, ">");
    var PEDef = regg(EntityValue, "|", ExternalID);
    var PEDecl = reg(ENTITY_DECL_START, S, "%", S, Name, S, PEDef, S_OPT, ">");
    var EntityDecl = regg(GEDecl, "|", PEDecl);
    var PublicID = reg(PUBLIC, S, PubidLiteral);
    var NotationDecl = reg("<!NOTATION", S, Name, S, regg(ExternalID, "|", PublicID), S_OPT, ">");
    var Eq = reg(S_OPT, "=", S_OPT);
    var VersionNum = /1[.]\d+/;
    var VersionInfo = reg(S, "version", Eq, regg("'", VersionNum, "'", "|", '"', VersionNum, '"'));
    var EncName = /[A-Za-z][-A-Za-z0-9._]*/;
    var EncodingDecl = regg(S, "encoding", Eq, regg('"', EncName, '"', "|", "'", EncName, "'"));
    var SDDecl = regg(S, "standalone", Eq, regg("'", regg("yes", "|", "no"), "'", "|", '"', regg("yes", "|", "no"), '"'));
    var XMLDecl = reg(/^<\?xml/, VersionInfo, EncodingDecl, "?", SDDecl, "?", S_OPT, /\?>/);
    var DOCTYPE_DECL_START = "<!DOCTYPE";
    var CDATA_START = "<![CDATA[";
    var CDATA_END = "]]>";
    var CDStart = /<!\[CDATA\[/;
    var CDEnd = /\]\]>/;
    var CData = reg(Char, "*?", CDEnd);
    var CDSect = reg(CDStart, CData);
    exports.chars = chars;
    exports.chars_without = chars_without;
    exports.detectUnicodeSupport = detectUnicodeSupport;
    exports.reg = reg;
    exports.regg = regg;
    exports.ABOUT_LEGACY_COMPAT = ABOUT_LEGACY_COMPAT;
    exports.ABOUT_LEGACY_COMPAT_SystemLiteral = ABOUT_LEGACY_COMPAT_SystemLiteral;
    exports.AttlistDecl = AttlistDecl;
    exports.CDATA_START = CDATA_START;
    exports.CDATA_END = CDATA_END;
    exports.CDSect = CDSect;
    exports.Char = Char;
    exports.Comment = Comment;
    exports.COMMENT_START = COMMENT_START;
    exports.COMMENT_END = COMMENT_END;
    exports.DOCTYPE_DECL_START = DOCTYPE_DECL_START;
    exports.elementdecl = elementdecl;
    exports.EntityDecl = EntityDecl;
    exports.EntityValue = EntityValue;
    exports.ExternalID = ExternalID;
    exports.ExternalID_match = ExternalID_match;
    exports.Name = Name;
    exports.Name_exact = Name_exact;
    exports.NCName_exact = NCName_exact;
    exports.NotationDecl = NotationDecl;
    exports.Reference = Reference;
    exports.PEReference = PEReference;
    exports.PI = PI;
    exports.PUBLIC = PUBLIC;
    exports.PubidLiteral = PubidLiteral;
    exports.PubidLiteral_match = PubidLiteral_match;
    exports.QName = QName;
    exports.QName_exact = QName_exact;
    exports.QName_group = QName_group;
    exports.S = S;
    exports.SChar_s = SChar_s;
    exports.S_OPT = S_OPT;
    exports.SYSTEM = SYSTEM;
    exports.SystemLiteral = SystemLiteral;
    exports.SystemLiteral_match = SystemLiteral_match;
    exports.InvalidChar = InvalidChar;
    exports.UNICODE_REPLACEMENT_CHARACTER = UNICODE_REPLACEMENT_CHARACTER;
    exports.UNICODE_SUPPORT = UNICODE_SUPPORT;
    exports.XMLDecl = XMLDecl;
  }
});

// node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/dom.js
var require_dom = __commonJS({
  "node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/dom.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    var find = conventions.find;
    var hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
    var hasOwn = conventions.hasOwn;
    var isHTMLMimeType = conventions.isHTMLMimeType;
    var isHTMLRawTextElement = conventions.isHTMLRawTextElement;
    var isHTMLVoidElement = conventions.isHTMLVoidElement;
    var MIME_TYPE = conventions.MIME_TYPE;
    var NAMESPACE = conventions.NAMESPACE;
    var PDC = /* @__PURE__ */ Symbol();
    var errors = require_errors2();
    var DOMException = errors.DOMException;
    var DOMExceptionName = errors.DOMExceptionName;
    var g = require_grammar();
    function checkSymbol(symbol) {
      if (symbol !== PDC) {
        throw new TypeError("Illegal constructor");
      }
    }
    function notEmptyString(input) {
      return input !== "";
    }
    function splitOnASCIIWhitespace(input) {
      return input ? input.split(/[\t\n\f\r ]+/).filter(notEmptyString) : [];
    }
    function orderedSetReducer(current, element) {
      if (!hasOwn(current, element)) {
        current[element] = true;
      }
      return current;
    }
    function toOrderedSet(input) {
      if (!input) return [];
      var list = splitOnASCIIWhitespace(input);
      return Object.keys(list.reduce(orderedSetReducer, {}));
    }
    function arrayIncludes(list) {
      return function(element) {
        return list && list.indexOf(element) !== -1;
      };
    }
    function validateQualifiedName(qualifiedName) {
      if (!g.QName_exact.test(qualifiedName)) {
        throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'invalid character in qualified name "' + qualifiedName + '"');
      }
    }
    function validateAndExtract(namespace, qualifiedName) {
      validateQualifiedName(qualifiedName);
      namespace = namespace || null;
      var prefix = null;
      var localName = qualifiedName;
      if (qualifiedName.indexOf(":") >= 0) {
        var splitResult = qualifiedName.split(":");
        prefix = splitResult[0];
        localName = splitResult[1];
      }
      if (prefix !== null && namespace === null) {
        throw new DOMException(DOMException.NAMESPACE_ERR, "prefix is non-null and namespace is null");
      }
      if (prefix === "xml" && namespace !== conventions.NAMESPACE.XML) {
        throw new DOMException(DOMException.NAMESPACE_ERR, 'prefix is "xml" and namespace is not the XML namespace');
      }
      if ((prefix === "xmlns" || qualifiedName === "xmlns") && namespace !== conventions.NAMESPACE.XMLNS) {
        throw new DOMException(
          DOMException.NAMESPACE_ERR,
          'either qualifiedName or prefix is "xmlns" and namespace is not the XMLNS namespace'
        );
      }
      if (namespace === conventions.NAMESPACE.XMLNS && prefix !== "xmlns" && qualifiedName !== "xmlns") {
        throw new DOMException(
          DOMException.NAMESPACE_ERR,
          'namespace is the XMLNS namespace and neither qualifiedName nor prefix is "xmlns"'
        );
      }
      return [namespace, prefix, localName];
    }
    function copy(src, dest) {
      for (var p in src) {
        if (hasOwn(src, p)) {
          dest[p] = src[p];
        }
      }
    }
    function _extends(Class, Super) {
      var pt = Class.prototype;
      if (!(pt instanceof Super)) {
        let t = function() {
        };
        t.prototype = Super.prototype;
        t = new t();
        copy(pt, t);
        Class.prototype = pt = t;
      }
      if (pt.constructor != Class) {
        if (typeof Class != "function") {
          console.error("unknown Class:" + Class);
        }
        pt.constructor = Class;
      }
    }
    var NodeType = {};
    var ELEMENT_NODE = NodeType.ELEMENT_NODE = 1;
    var ATTRIBUTE_NODE = NodeType.ATTRIBUTE_NODE = 2;
    var TEXT_NODE = NodeType.TEXT_NODE = 3;
    var CDATA_SECTION_NODE = NodeType.CDATA_SECTION_NODE = 4;
    var ENTITY_REFERENCE_NODE = NodeType.ENTITY_REFERENCE_NODE = 5;
    var ENTITY_NODE = NodeType.ENTITY_NODE = 6;
    var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
    var COMMENT_NODE = NodeType.COMMENT_NODE = 8;
    var DOCUMENT_NODE = NodeType.DOCUMENT_NODE = 9;
    var DOCUMENT_TYPE_NODE = NodeType.DOCUMENT_TYPE_NODE = 10;
    var DOCUMENT_FRAGMENT_NODE = NodeType.DOCUMENT_FRAGMENT_NODE = 11;
    var NOTATION_NODE = NodeType.NOTATION_NODE = 12;
    var DocumentPosition = conventions.freeze({
      DOCUMENT_POSITION_DISCONNECTED: 1,
      DOCUMENT_POSITION_PRECEDING: 2,
      DOCUMENT_POSITION_FOLLOWING: 4,
      DOCUMENT_POSITION_CONTAINS: 8,
      DOCUMENT_POSITION_CONTAINED_BY: 16,
      DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
    });
    function commonAncestor(a, b) {
      if (b.length < a.length) return commonAncestor(b, a);
      var c = null;
      for (var n in a) {
        if (a[n] !== b[n]) return c;
        c = a[n];
      }
      return c;
    }
    function docGUID(doc) {
      if (!doc.guid) doc.guid = Math.random();
      return doc.guid;
    }
    function NodeList() {
    }
    NodeList.prototype = {
      /**
       * The number of nodes in the list. The range of valid child node indices is 0 to length-1
       * inclusive.
       *
       * @type {number}
       */
      length: 0,
      /**
       * Returns the item at `index`. If index is greater than or equal to the number of nodes in
       * the list, this returns null.
       *
       * @param index
       * Unsigned long Index into the collection.
       * @returns {Node | null}
       * The node at position `index` in the NodeList,
       * or null if that is not a valid index.
       */
      item: function(index) {
        return index >= 0 && index < this.length ? this[index] : null;
      },
      /**
       * Returns a string representation of the NodeList.
       *
       * Accepts the same `options` object as `XMLSerializer.prototype.serializeToString`
       * (`requireWellFormed`, `splitCDATASections`, `nodeFilter`). Passing a function is treated as
       * a legacy `nodeFilter` for backward compatibility.
       *
       * @param {Object | function} [options]
       * @param {boolean} [options.requireWellFormed=false]
       * @param {boolean} [options.splitCDATASections=true]
       * @param {function} [options.nodeFilter]
       * @returns {string}
       */
      toString: function(options) {
        var opts;
        if (typeof options === "function") {
          opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: options };
        } else if (!!options) {
          opts = {
            requireWellFormed: !!options.requireWellFormed,
            splitCDATASections: options.splitCDATASections !== false,
            nodeFilter: options.nodeFilter || null
          };
        } else {
          opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: null };
        }
        for (var buf = [], i = 0; i < this.length; i++) {
          serializeToString(this[i], buf, null, opts);
        }
        return buf.join("");
      },
      /**
       * Filters the NodeList based on a predicate.
       *
       * @param {function(Node): boolean} predicate
       * - A predicate function to filter the NodeList.
       * @returns {Node[]}
       * An array of nodes that satisfy the predicate.
       * @private
       */
      filter: function(predicate) {
        return Array.prototype.filter.call(this, predicate);
      },
      /**
       * Returns the first index at which a given node can be found in the NodeList, or -1 if it is
       * not present.
       *
       * @param {Node} item
       * - The Node item to locate in the NodeList.
       * @returns {number}
       * The first index of the node in the NodeList; -1 if not found.
       * @private
       */
      indexOf: function(item) {
        return Array.prototype.indexOf.call(this, item);
      }
    };
    NodeList.prototype[Symbol.iterator] = function() {
      var me = this;
      var index = 0;
      return {
        next: function() {
          if (index < me.length) {
            return {
              value: me[index++],
              done: false
            };
          } else {
            return {
              done: true
            };
          }
        },
        return: function() {
          return {
            done: true
          };
        }
      };
    };
    function LiveNodeList(node, refresh) {
      this._node = node;
      this._refresh = refresh;
      _updateLiveList(this);
    }
    function _updateLiveList(list) {
      var inc = list._node._inc || list._node.ownerDocument._inc;
      if (list._inc !== inc) {
        var ls = list._refresh(list._node);
        __set__(list, "length", ls.length);
        if (!list.$$length || ls.length < list.$$length) {
          for (var i = ls.length; i in list; i++) {
            if (hasOwn(list, i)) {
              delete list[i];
            }
          }
        }
        copy(ls, list);
        list._inc = inc;
      }
    }
    LiveNodeList.prototype.item = function(i) {
      _updateLiveList(this);
      return this[i] || null;
    };
    _extends(LiveNodeList, NodeList);
    function NamedNodeMap() {
      this._nsIndex = /* @__PURE__ */ Object.create(null);
      this._noNsIndex = /* @__PURE__ */ Object.create(null);
    }
    function _findNodeIndex(list, node) {
      var i = 0;
      while (i < list.length) {
        if (list[i] === node) {
          return i;
        }
        i++;
      }
    }
    function _nnmBucket(map, namespaceURI, create) {
      if (!namespaceURI) {
        return map._noNsIndex;
      }
      var bucket = map._nsIndex[namespaceURI];
      if (!bucket && create) {
        bucket = map._nsIndex[namespaceURI] = /* @__PURE__ */ Object.create(null);
      }
      return bucket;
    }
    function _nnmIndexFind(map, namespaceURI, localName) {
      var bucket = _nnmBucket(map, namespaceURI, false);
      var found = bucket && bucket[localName];
      return found ? found : null;
    }
    function _nnmIndexAdd(map, attr) {
      _nnmBucket(map, attr.namespaceURI, true)[attr.localName] = attr;
    }
    function _nnmIndexRemove(map, attr) {
      var bucket = _nnmBucket(map, attr.namespaceURI, false);
      if (bucket) {
        delete bucket[attr.localName];
      }
    }
    function _addNamedNode(el, list, newAttr, oldAttr) {
      if (oldAttr) {
        list[_findNodeIndex(list, oldAttr)] = newAttr;
      } else {
        list[list.length] = newAttr;
        list.length++;
      }
      _nnmIndexAdd(list, newAttr);
      if (el) {
        newAttr.ownerElement = el;
        var doc = el.ownerDocument;
        if (doc) {
          oldAttr && _onRemoveAttribute(doc, el, oldAttr);
          _onAddAttribute(doc, el, newAttr);
        }
      }
    }
    function _removeNamedNode(el, list, attr) {
      var i = _findNodeIndex(list, attr);
      if (i >= 0) {
        var lastIndex = list.length - 1;
        while (i <= lastIndex) {
          list[i] = list[++i];
        }
        list.length = lastIndex;
        _nnmIndexRemove(list, attr);
        if (el) {
          var doc = el.ownerDocument;
          if (doc) {
            _onRemoveAttribute(doc, el, attr);
          }
          attr.ownerElement = null;
        }
      }
    }
    NamedNodeMap.prototype = {
      length: 0,
      item: NodeList.prototype.item,
      /**
       * Get an attribute by name. Note: Name is in lower case in case of HTML namespace and
       * document.
       *
       * @param {string} localName
       * The local name of the attribute.
       * @returns {Attr | null}
       * The attribute with the given local name, or null if no such attribute exists.
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-get-by-name
       */
      getNamedItem: function(localName) {
        if (this._ownerElement && this._ownerElement._isInHTMLDocumentAndNamespace()) {
          localName = localName.toLowerCase();
        }
        var i = 0;
        while (i < this.length) {
          var attr = this[i];
          if (attr.nodeName === localName) {
            return attr;
          }
          i++;
        }
        return null;
      },
      /**
       * Set an attribute.
       *
       * @param {Attr} attr
       * The attribute to set.
       * @returns {Attr | null}
       * The old attribute with the same local name and namespace URI as the new one, or null if no
       * such attribute exists.
       * @throws {DOMException}
       * With code:
       * - {@link INUSE_ATTRIBUTE_ERR} - If the attribute is already an attribute of another
       * element.
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-set
       */
      setNamedItem: function(attr) {
        var el = attr.ownerElement;
        if (el && el !== this._ownerElement) {
          throw new DOMException(DOMException.INUSE_ATTRIBUTE_ERR);
        }
        var oldAttr = _nnmIndexFind(this, attr.namespaceURI, attr.localName);
        if (oldAttr === attr) {
          return attr;
        }
        _addNamedNode(this._ownerElement, this, attr, oldAttr);
        return oldAttr;
      },
      /**
       * Set an attribute, replacing an existing attribute with the same local name and namespace
       * URI if one exists.
       *
       * @param {Attr} attr
       * The attribute to set.
       * @returns {Attr | null}
       * The old attribute with the same local name and namespace URI as the new one, or null if no
       * such attribute exists.
       * @throws {DOMException}
       * Throws a DOMException with the name "InUseAttributeError" if the attribute is already an
       * attribute of another element.
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-set
       */
      setNamedItemNS: function(attr) {
        return this.setNamedItem(attr);
      },
      /**
       * Removes an attribute specified by the local name.
       *
       * @param {string} localName
       * The local name of the attribute to be removed.
       * @returns {Attr}
       * The attribute node that was removed.
       * @throws {DOMException}
       * With code:
       * - {@link DOMException.NOT_FOUND_ERR} if no attribute with the given name is found.
       * @see https://dom.spec.whatwg.org/#dom-namednodemap-removenameditem
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-remove-by-name
       */
      removeNamedItem: function(localName) {
        var attr = this.getNamedItem(localName);
        if (!attr) {
          throw new DOMException(DOMException.NOT_FOUND_ERR, localName);
        }
        _removeNamedNode(this._ownerElement, this, attr);
        return attr;
      },
      /**
       * Removes an attribute specified by the namespace and local name.
       *
       * @param {string | null} namespaceURI
       * The namespace URI of the attribute to be removed.
       * @param {string} localName
       * The local name of the attribute to be removed.
       * @returns {Attr}
       * The attribute node that was removed.
       * @throws {DOMException}
       * With code:
       * - {@link DOMException.NOT_FOUND_ERR} if no attribute with the given namespace URI and local
       * name is found.
       * @see https://dom.spec.whatwg.org/#dom-namednodemap-removenameditemns
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-remove-by-namespace
       */
      removeNamedItemNS: function(namespaceURI, localName) {
        var attr = this.getNamedItemNS(namespaceURI, localName);
        if (!attr) {
          throw new DOMException(DOMException.NOT_FOUND_ERR, namespaceURI ? namespaceURI + " : " + localName : localName);
        }
        _removeNamedNode(this._ownerElement, this, attr);
        return attr;
      },
      /**
       * Get an attribute by namespace and local name.
       *
       * @param {string | null} namespaceURI
       * The namespace URI of the attribute.
       * @param {string} localName
       * The local name of the attribute.
       * @returns {Attr | null}
       * The attribute with the given namespace URI and local name, or null if no such attribute
       * exists.
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-get-by-namespace
       */
      getNamedItemNS: function(namespaceURI, localName) {
        if (!namespaceURI) {
          namespaceURI = null;
        }
        var i = 0;
        while (i < this.length) {
          var node = this[i];
          if (node.localName === localName && node.namespaceURI === namespaceURI) {
            return node;
          }
          i++;
        }
        return null;
      }
    };
    NamedNodeMap.prototype[Symbol.iterator] = function() {
      var me = this;
      var index = 0;
      return {
        next: function() {
          if (index < me.length) {
            return {
              value: me[index++],
              done: false
            };
          } else {
            return {
              done: true
            };
          }
        },
        return: function() {
          return {
            done: true
          };
        }
      };
    };
    function DOMImplementation() {
    }
    DOMImplementation.prototype = {
      /**
       * Test if the DOM implementation implements a specific feature and version, as specified in
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/core.html#DOMFeatures DOM Features}.
       *
       * The DOMImplementation.hasFeature() method returns a Boolean flag indicating if a given
       * feature is supported. The different implementations fairly diverged in what kind of
       * features were reported. The latest version of the spec settled to force this method to
       * always return true, where the functionality was accurate and in use.
       *
       * @deprecated
       * It is deprecated and modern browsers return true in all cases.
       * @function DOMImplementation#hasFeature
       * @param {string} feature
       * The name of the feature to test.
       * @param {string} [version]
       * This is the version number of the feature to test.
       * @returns {boolean}
       * Always returns true.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/hasFeature MDN
       * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-5CED94D7 DOM Level 1 Core
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-hasfeature DOM Living Standard
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-5CED94D7 DOM Level 3 Core
       */
      hasFeature: function(feature, version) {
        return true;
      },
      /**
       * Creates a DOM Document object of the specified type with its document element. Note that
       * based on the {@link DocumentType}
       * given to create the document, the implementation may instantiate specialized
       * {@link Document} objects that support additional features than the "Core", such as "HTML"
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#DOM2HTML DOM Level 2 HTML}.
       * On the other hand, setting the {@link DocumentType} after the document was created makes
       * this very unlikely to happen. Alternatively, specialized {@link Document} creation methods,
       * such as createHTMLDocument
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#DOM2HTML DOM Level 2 HTML},
       * can be used to obtain specific types of {@link Document} objects.
       *
       * __It behaves slightly different from the description in the living standard__:
       * - There is no interface/class `XMLDocument`, it returns a `Document`
       * instance (with it's `type` set to `'xml'`).
       * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
       *
       * @function DOMImplementation.createDocument
       * @param {string | null} namespaceURI
       * The
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-namespaceURI namespace URI}
       * of the document element to create or null.
       * @param {string | null} qualifiedName
       * The
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-qualifiedname qualified name}
       * of the document element to be created or null.
       * @param {DocumentType | null} [doctype=null]
       * The type of document to be created or null. When doctype is not null, its
       * {@link Node#ownerDocument} attribute is set to the document being created. Default is
       * `null`
       * @returns {Document}
       * A new {@link Document} object with its document element. If the NamespaceURI,
       * qualifiedName, and doctype are null, the returned {@link Document} is empty with no
       * document element.
       * @throws {DOMException}
       * With code:
       *
       * - `INVALID_CHARACTER_ERR`: Raised if the specified qualified name is not an XML name
       * according to {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#XML XML 1.0}.
       * - `NAMESPACE_ERR`: Raised if the qualifiedName is malformed, if the qualifiedName has a
       * prefix and the namespaceURI is null, or if the qualifiedName is null and the namespaceURI
       * is different from null, or if the qualifiedName has a prefix that is "xml" and the
       * namespaceURI is different from "{@link http://www.w3.org/XML/1998/namespace}"
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#Namespaces XML Namespaces},
       * or if the DOM implementation does not support the "XML" feature but a non-null namespace
       * URI was provided, since namespaces were defined by XML.
       * - `WRONG_DOCUMENT_ERR`: Raised if doctype has already been used with a different document
       * or was created from a different implementation.
       * - `NOT_SUPPORTED_ERR`: May be raised if the implementation does not support the feature
       * "XML" and the language exposed through the Document does not support XML Namespaces (such
       * as {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#HTML40 HTML 4.01}).
       * @since DOM Level 2.
       * @see {@link #createHTMLDocument}
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocument MDN
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument DOM Living Standard
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Level-2-Core-DOM-createDocument DOM
       *      Level 3 Core
       * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocument DOM
       *      Level 2 Core (initial)
       */
      createDocument: function(namespaceURI, qualifiedName, doctype) {
        var contentType = MIME_TYPE.XML_APPLICATION;
        if (namespaceURI === NAMESPACE.HTML) {
          contentType = MIME_TYPE.XML_XHTML_APPLICATION;
        } else if (namespaceURI === NAMESPACE.SVG) {
          contentType = MIME_TYPE.XML_SVG_IMAGE;
        }
        var doc = new Document2(PDC, { contentType });
        doc.implementation = this;
        doc.childNodes = new NodeList();
        doc.doctype = doctype || null;
        if (doctype) {
          doc.appendChild(doctype);
        }
        if (qualifiedName) {
          var root = doc.createElementNS(namespaceURI, qualifiedName);
          doc.appendChild(root);
        }
        return doc;
      },
      /**
       * Creates an empty DocumentType node. Entity declarations and notations are not made
       * available. Entity reference expansions and default attribute additions do not occur.
       *
       * **This behavior is slightly different from the one in the specs**:
       * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
       * - `publicId` and `systemId` contain the raw data including any possible quotes,
       *   so they can always be serialized back to the original value
       * - `internalSubset` contains the raw string between `[` and `]` if present,
       *   but is not parsed or validated in any form.
       *
       * @function DOMImplementation#createDocumentType
       * @param {string} qualifiedName
       * The {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-qualifiedname qualified
       * name} of the document type to be created.
       * @param {string} [publicId]
       * The external subset public identifier. Stored verbatim including surrounding quotes.
       * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
       * if the value is non-empty and does not match the XML `PubidLiteral` production
       * (W3C DOM Parsing §3.2.1.3; XML 1.0 production [12]). Creation-time validation is not
       * enforced — deferred to a future breaking release.
       * @param {string} [systemId]
       * The external subset system identifier. Stored verbatim including surrounding quotes.
       * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
       * if the value is non-empty and does not match the XML `SystemLiteral` production
       * (W3C DOM Parsing §3.2.1.3; XML 1.0 production [11]). Creation-time validation is not
       * enforced — deferred to a future breaking release.
       * @param {string} [internalSubset]
       * The internal subset or an empty string if it is not present. Stored verbatim.
       * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
       * if the value contains `"]>"`. Creation-time validation is not enforced.
       * @returns {DocumentType}
       * A new {@link DocumentType} node with {@link Node#ownerDocument} set to null.
       * @throws {DOMException}
       * With code:
       *
       * - `INVALID_CHARACTER_ERR`: Raised if the specified qualified name is not an XML name
       * according to {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#XML XML 1.0}.
       * - `NAMESPACE_ERR`: Raised if the qualifiedName is malformed.
       * - `NOT_SUPPORTED_ERR`: May be raised if the implementation does not support the feature
       * "XML" and the language exposed through the Document does not support XML Namespaces (such
       * as {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#HTML40 HTML 4.01}).
       * @since DOM Level 2.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocumentType
       *      MDN
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocumenttype DOM Living
       *      Standard
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Level-3-Core-DOM-createDocType DOM
       *      Level 3 Core
       * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocType DOM
       *      Level 2 Core
       * @see https://github.com/xmldom/xmldom/blob/master/CHANGELOG.md#050
       * @see https://www.w3.org/TR/DOM-Level-2-Core/#core-ID-Core-DocType-internalSubset
       * @prettierignore
       */
      createDocumentType: function(qualifiedName, publicId, systemId, internalSubset) {
        validateQualifiedName(qualifiedName);
        var node = new DocumentType(PDC);
        node.name = qualifiedName;
        node.nodeName = qualifiedName;
        node.publicId = publicId || "";
        node.systemId = systemId || "";
        node.internalSubset = internalSubset || "";
        node.childNodes = new NodeList();
        return node;
      },
      /**
       * Returns an HTML document, that might already have a basic DOM structure.
       *
       * __It behaves slightly different from the description in the living standard__:
       * - If the first argument is `false` no initial nodes are added (steps 3-7 in the specs are
       * omitted)
       * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
       *
       * @param {string | false} [title]
       * A string containing the title to give the new HTML document.
       * @returns {Document}
       * The HTML document.
       * @since WHATWG Living Standard.
       * @see {@link #createDocument}
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createhtmldocument
       * @see https://dom.spec.whatwg.org/#html-document
       */
      createHTMLDocument: function(title) {
        var doc = new Document2(PDC, { contentType: MIME_TYPE.HTML });
        doc.implementation = this;
        doc.childNodes = new NodeList();
        if (title !== false) {
          doc.doctype = this.createDocumentType("html");
          doc.doctype.ownerDocument = doc;
          doc.appendChild(doc.doctype);
          var htmlNode = doc.createElement("html");
          doc.appendChild(htmlNode);
          var headNode = doc.createElement("head");
          htmlNode.appendChild(headNode);
          if (typeof title === "string") {
            var titleNode = doc.createElement("title");
            titleNode.appendChild(doc.createTextNode(title));
            headNode.appendChild(titleNode);
          }
          htmlNode.appendChild(doc.createElement("body"));
        }
        return doc;
      }
    };
    function Node(symbol) {
      checkSymbol(symbol);
    }
    Node.prototype = {
      /**
       * The first child of this node.
       *
       * @type {Node | null}
       */
      firstChild: null,
      /**
       * The last child of this node.
       *
       * @type {Node | null}
       */
      lastChild: null,
      /**
       * The previous sibling of this node.
       *
       * @type {Node | null}
       */
      previousSibling: null,
      /**
       * The next sibling of this node.
       *
       * @type {Node | null}
       */
      nextSibling: null,
      /**
       * The parent node of this node.
       *
       * @type {Node | null}
       */
      parentNode: null,
      /**
       * The parent element of this node.
       *
       * @type {Element | null}
       */
      get parentElement() {
        return this.parentNode && this.parentNode.nodeType === this.ELEMENT_NODE ? this.parentNode : null;
      },
      /**
       * The child nodes of this node.
       *
       * @type {NodeList}
       */
      childNodes: null,
      /**
       * The document object associated with this node.
       *
       * @type {Document | null}
       */
      ownerDocument: null,
      /**
       * The value of this node.
       *
       * @type {string | null}
       */
      nodeValue: null,
      /**
       * The namespace URI of this node.
       *
       * @type {string | null}
       */
      namespaceURI: null,
      /**
       * The prefix of the namespace for this node.
       *
       * @type {string | null}
       */
      prefix: null,
      /**
       * The local part of the qualified name of this node.
       *
       * @type {string | null}
       */
      localName: null,
      /**
       * The baseURI is currently always `about:blank`,
       * since that's what happens when you create a document from scratch.
       *
       * @type {'about:blank'}
       */
      baseURI: "about:blank",
      /**
       * Is true if this node is part of a document.
       *
       * @type {boolean}
       */
      get isConnected() {
        var rootNode = this.getRootNode();
        return rootNode && rootNode.nodeType === rootNode.DOCUMENT_NODE;
      },
      /**
       * Checks whether `other` is an inclusive descendant of this node.
       *
       * @param {Node | null | undefined} other
       * The node to check.
       * @returns {boolean}
       * True if `other` is an inclusive descendant of this node; false otherwise.
       * @see https://dom.spec.whatwg.org/#dom-node-contains
       */
      contains: function(other) {
        if (!other) return false;
        var parent = other;
        do {
          if (this === parent) return true;
          parent = parent.parentNode;
        } while (parent);
        return false;
      },
      /**
       * @typedef GetRootNodeOptions
       * @property {boolean} [composed=false]
       */
      /**
       * Searches for the root node of this node.
       *
       * **This behavior is slightly different from the in the specs**:
       * - ignores `options.composed`, since `ShadowRoot`s are unsupported, always returns root.
       *
       * @param {GetRootNodeOptions} [options]
       * @returns {Node}
       * Root node.
       * @see https://dom.spec.whatwg.org/#dom-node-getrootnode
       * @see https://dom.spec.whatwg.org/#concept-shadow-including-root
       */
      getRootNode: function(options) {
        var parent = this;
        do {
          if (!parent.parentNode) {
            return parent;
          }
          parent = parent.parentNode;
        } while (parent);
      },
      /**
       * Checks whether the given node is equal to this node.
       *
       * Two nodes are equal when they have the same type, defining characteristics (for the type),
       * and the same childNodes. The comparison is iterative to avoid stack overflows on
       * deeply-nested trees. Attribute nodes of each Element pair are also pushed onto the stack
       * and compared the same way.
       *
       * @param {Node} [otherNode]
       * @returns {boolean}
       * @see https://dom.spec.whatwg.org/#concept-node-equals
       * @see ../docs/walk-dom.md.
       */
      isEqualNode: function(otherNode) {
        if (!otherNode) return false;
        var stack = [{ node: this, other: otherNode }];
        while (stack.length > 0) {
          var pair = stack.pop();
          var node = pair.node;
          var other = pair.other;
          if (node.nodeType !== other.nodeType) return false;
          switch (node.nodeType) {
            case node.DOCUMENT_TYPE_NODE:
              if (node.name !== other.name) return false;
              if (node.publicId !== other.publicId) return false;
              if (node.systemId !== other.systemId) return false;
              break;
            case node.ELEMENT_NODE:
              if (node.namespaceURI !== other.namespaceURI) return false;
              if (node.prefix !== other.prefix) return false;
              if (node.localName !== other.localName) return false;
              if (node.attributes.length !== other.attributes.length) return false;
              for (var i = 0; i < node.attributes.length; i++) {
                var attr = node.attributes.item(i);
                var otherAttr = other.getAttributeNodeNS(attr.namespaceURI, attr.localName);
                if (!otherAttr) return false;
                stack.push({ node: attr, other: otherAttr });
              }
              break;
            case node.ATTRIBUTE_NODE:
              if (node.namespaceURI !== other.namespaceURI) return false;
              if (node.localName !== other.localName) return false;
              if (node.value !== other.value) return false;
              break;
            case node.PROCESSING_INSTRUCTION_NODE:
              if (node.target !== other.target || node.data !== other.data) return false;
              break;
            case node.TEXT_NODE:
            case node.CDATA_SECTION_NODE:
            case node.COMMENT_NODE:
              if (node.data !== other.data) return false;
              break;
          }
          if (node.childNodes.length !== other.childNodes.length) return false;
          for (var i = node.childNodes.length - 1; i >= 0; i--) {
            stack.push({ node: node.childNodes[i], other: other.childNodes[i] });
          }
        }
        return true;
      },
      /**
       * Checks whether or not the given node is this node.
       *
       * @param {Node} [otherNode]
       */
      isSameNode: function(otherNode) {
        return this === otherNode;
      },
      /**
       * Inserts a node before a reference node as a child of this node.
       *
       * @param {Node} newChild
       * The new child node to be inserted.
       * @param {Node | null} refChild
       * The reference node before which newChild will be inserted.
       * @returns {Node}
       * The new child node successfully inserted.
       * @throws {DOMException}
       * Throws a DOMException if inserting the node would result in a DOM tree that is not
       * well-formed, or if `child` is provided but is not a child of `parent`.
       * See {@link _insertBefore} for more details.
       * @since Modified in DOM L2
       */
      insertBefore: function(newChild, refChild) {
        return _insertBefore(this, newChild, refChild);
      },
      /**
       * Replaces an old child node with a new child node within this node.
       *
       * @param {Node} newChild
       * The new node that is to replace the old node.
       * If it already exists in the DOM, it is removed from its original position.
       * @param {Node} oldChild
       * The existing child node to be replaced.
       * @returns {Node}
       * Returns the replaced child node.
       * @throws {DOMException}
       * Throws a DOMException if replacing the node would result in a DOM tree that is not
       * well-formed, or if `oldChild` is not a child of `this`.
       * This can also occur if the pre-replacement validity assertion fails.
       * See {@link _insertBefore}, {@link Node.removeChild}, and
       * {@link assertPreReplacementValidityInDocument} for more details.
       * @see https://dom.spec.whatwg.org/#concept-node-replace
       */
      replaceChild: function(newChild, oldChild) {
        _insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
        if (oldChild) {
          this.removeChild(oldChild);
        }
      },
      /**
       * Removes an existing child node from this node.
       *
       * @param {Node} oldChild
       * The child node to be removed.
       * @returns {Node}
       * Returns the removed child node.
       * @throws {DOMException}
       * Throws a DOMException if `oldChild` is not a child of `this`.
       * See {@link _removeChild} for more details.
       */
      removeChild: function(oldChild) {
        return _removeChild(this, oldChild);
      },
      /**
       * Appends a child node to this node.
       *
       * @param {Node} newChild
       * The child node to be appended to this node.
       * If it already exists in the DOM, it is removed from its original position.
       * @returns {Node}
       * Returns the appended child node.
       * @throws {DOMException}
       * Throws a DOMException if appending the node would result in a DOM tree that is not
       * well-formed, or if `newChild` is not a valid Node.
       * See {@link insertBefore} for more details.
       */
      appendChild: function(newChild) {
        return this.insertBefore(newChild, null);
      },
      /**
       * Determines whether this node has any child nodes.
       *
       * @returns {boolean}
       * Returns true if this node has any child nodes, and false otherwise.
       */
      hasChildNodes: function() {
        return this.firstChild != null;
      },
      /**
       * Creates a copy of the calling node.
       *
       * @param {boolean} deep
       * If true, the contents of the node are recursively copied.
       * If false, only the node itself (and its attributes, if it is an element) are copied.
       * @returns {Node}
       * Returns the newly created copy of the node.
       * @throws {DOMException}
       * May throw a DOMException if operations within {@link Element#setAttributeNode} or
       * {@link Node#appendChild} (which are potentially invoked in this method) do not meet their
       * specific constraints.
       * @see {@link cloneNode}
       */
      cloneNode: function(deep) {
        return cloneNode(this.ownerDocument || this, this, deep);
      },
      /**
       * Puts the specified node and all of its subtree into a "normalized" form. In a normalized
       * subtree, no text nodes in the subtree are empty and there are no adjacent text nodes.
       *
       * Specifically, this method merges any adjacent text nodes (i.e., nodes for which `nodeType`
       * is `TEXT_NODE`) into a single node with the combined data. It also removes any empty text
       * nodes.
       *
       * This method iterativly traverses all child nodes to normalize all descendent nodes within
       * the subtree.
       *
       * @throws {DOMException}
       * May throw a DOMException if operations within removeChild or appendData (which are
       * potentially invoked in this method) do not meet their specific constraints.
       * @since Modified in DOM Level 2
       * @see {@link Node.removeChild}
       * @see {@link CharacterData.appendData}
       * @see ../docs/walk-dom.md.
       */
      normalize: function() {
        walkDOM(this, null, {
          enter: function(node) {
            var child = node.firstChild;
            while (child) {
              var next = child.nextSibling;
              if (next !== null && next.nodeType === TEXT_NODE && child.nodeType === TEXT_NODE) {
                var tail = [];
                var sibling = next;
                while (sibling !== null && sibling.nodeType === TEXT_NODE) {
                  tail.push(sibling.data);
                  sibling = sibling.nextSibling;
                }
                var removed = child.nextSibling;
                while (removed !== sibling) {
                  var following = removed.nextSibling;
                  removed.parentNode = null;
                  removed.previousSibling = null;
                  removed.nextSibling = null;
                  removed = following;
                }
                child.nextSibling = sibling;
                if (sibling !== null) {
                  sibling.previousSibling = child;
                } else {
                  node.lastChild = child;
                }
                child.appendData(tail.join(""));
                _onUpdateChild(node.ownerDocument, node);
                child = sibling;
              } else {
                child = next;
              }
            }
            return true;
          }
        });
      },
      /**
       * Checks whether the DOM implementation implements a specific feature and its version.
       *
       * @deprecated
       * Since `DOMImplementation.hasFeature` is deprecated and always returns true.
       * @param {string} feature
       * The package name of the feature to test. This is the same name that can be passed to the
       * method `hasFeature` on `DOMImplementation`.
       * @param {string} version
       * This is the version number of the package name to test.
       * @returns {boolean}
       * Returns true in all cases in the current implementation.
       * @since Introduced in DOM Level 2
       * @see {@link DOMImplementation.hasFeature}
       */
      isSupported: function(feature, version) {
        return this.ownerDocument.implementation.hasFeature(feature, version);
      },
      /**
       * Look up the prefix associated to the given namespace URI, starting from this node.
       * **The default namespace declarations are ignored by this method.**
       * See Namespace Prefix Lookup for details on the algorithm used by this method.
       *
       * **This behavior is different from the in the specs**:
       * - no node type specific handling
       * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
       *
       * @param {string | null} namespaceURI
       * The namespace URI for which to find the associated prefix.
       * @returns {string | null}
       * The associated prefix, if found; otherwise, null.
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespacePrefix
       * @see https://www.w3.org/TR/DOM-Level-3-Core/namespaces-algorithms.html#lookupNamespacePrefixAlgo
       * @see https://dom.spec.whatwg.org/#dom-node-lookupprefix
       * @see https://github.com/xmldom/xmldom/issues/322
       * @prettierignore
       */
      lookupPrefix: function(namespaceURI) {
        var el = this;
        while (el) {
          var map = el._nsMap;
          if (map) {
            for (var n in map) {
              if (hasOwn(map, n) && map[n] === namespaceURI) {
                return n;
              }
            }
          }
          el = el.nodeType == ATTRIBUTE_NODE ? el.ownerDocument : el.parentNode;
        }
        return null;
      },
      /**
       * This function is used to look up the namespace URI associated with the given prefix,
       * starting from this node.
       *
       * **This behavior is different from the in the specs**:
       * - no node type specific handling
       * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
       *
       * @param {string | null} prefix
       * The prefix for which to find the associated namespace URI.
       * @returns {string | null}
       * The associated namespace URI, if found; otherwise, null.
       * @since DOM Level 3
       * @see https://dom.spec.whatwg.org/#dom-node-lookupnamespaceuri
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespaceURI
       * @prettierignore
       */
      lookupNamespaceURI: function(prefix) {
        var el = this;
        while (el) {
          var map = el._nsMap;
          if (map) {
            if (hasOwn(map, prefix)) {
              return map[prefix];
            }
          }
          el = el.nodeType == ATTRIBUTE_NODE ? el.ownerDocument : el.parentNode;
        }
        return null;
      },
      /**
       * Determines whether the given namespace URI is the default namespace.
       *
       * The function works by looking up the prefix associated with the given namespace URI. If no
       * prefix is found (i.e., the namespace URI is not registered in the namespace map of this
       * node or any of its ancestors), it returns `true`, implying the namespace URI is considered
       * the default.
       *
       * **This behavior is different from the in the specs**:
       * - no node type specific handling
       * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
       *
       * @param {string | null} namespaceURI
       * The namespace URI to be checked.
       * @returns {boolean}
       * Returns true if the given namespace URI is the default namespace, false otherwise.
       * @since DOM Level 3
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-isDefaultNamespace
       * @see https://dom.spec.whatwg.org/#dom-node-isdefaultnamespace
       * @prettierignore
       */
      isDefaultNamespace: function(namespaceURI) {
        var prefix = this.lookupPrefix(namespaceURI);
        return prefix == null;
      },
      /**
       * Compares the reference node with a node with regard to their position in the document and
       * according to the document order.
       *
       * @param {Node} other
       * The node to compare the reference node to.
       * @returns {number}
       * Returns how the node is positioned relatively to the reference node according to the
       * bitmask. 0 if reference node and given node are the same.
       * @since DOM Level 3
       * @see https://www.w3.org/TR/2004/REC-DOM-Level-3-Core-20040407/core.html#Node3-compare
       * @see https://dom.spec.whatwg.org/#dom-node-comparedocumentposition
       */
      compareDocumentPosition: function(other) {
        if (this === other) return 0;
        var node1 = other;
        var node2 = this;
        var attr1 = null;
        var attr2 = null;
        if (node1 instanceof Attr) {
          attr1 = node1;
          node1 = attr1.ownerElement;
        }
        if (node2 instanceof Attr) {
          attr2 = node2;
          node2 = attr2.ownerElement;
          if (attr1 && node1 && node2 === node1) {
            for (var i = 0, attr; attr = node2.attributes[i]; i++) {
              if (attr === attr1)
                return DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
              if (attr === attr2)
                return DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
            }
          }
        }
        if (!node1 || !node2 || node2.ownerDocument !== node1.ownerDocument) {
          return DocumentPosition.DOCUMENT_POSITION_DISCONNECTED + DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + (docGUID(node2.ownerDocument) > docGUID(node1.ownerDocument) ? DocumentPosition.DOCUMENT_POSITION_FOLLOWING : DocumentPosition.DOCUMENT_POSITION_PRECEDING);
        }
        if (attr2 && node1 === node2) {
          return DocumentPosition.DOCUMENT_POSITION_CONTAINS + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
        }
        if (attr1 && node1 === node2) {
          return DocumentPosition.DOCUMENT_POSITION_CONTAINED_BY + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
        }
        var chain1 = [];
        var ancestor1 = node1.parentNode;
        while (ancestor1) {
          if (!attr2 && ancestor1 === node2) {
            return DocumentPosition.DOCUMENT_POSITION_CONTAINED_BY + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
          }
          chain1.push(ancestor1);
          ancestor1 = ancestor1.parentNode;
        }
        chain1.reverse();
        var chain2 = [];
        var ancestor2 = node2.parentNode;
        while (ancestor2) {
          if (!attr1 && ancestor2 === node1) {
            return DocumentPosition.DOCUMENT_POSITION_CONTAINS + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
          }
          chain2.push(ancestor2);
          ancestor2 = ancestor2.parentNode;
        }
        chain2.reverse();
        var ca = commonAncestor(chain1, chain2);
        for (var n in ca.childNodes) {
          var child = ca.childNodes[n];
          if (child === node2) return DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
          if (child === node1) return DocumentPosition.DOCUMENT_POSITION_PRECEDING;
          if (chain2.indexOf(child) >= 0) return DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
          if (chain1.indexOf(child) >= 0) return DocumentPosition.DOCUMENT_POSITION_PRECEDING;
        }
        return 0;
      }
    };
    function _xmlEncoder(c) {
      return c == "<" && "&lt;" || c == ">" && "&gt;" || c == "&" && "&amp;" || c == '"' && "&quot;" || "&#" + c.charCodeAt() + ";";
    }
    copy(NodeType, Node);
    copy(NodeType, Node.prototype);
    copy(DocumentPosition, Node);
    copy(DocumentPosition, Node.prototype);
    function _visitNode(node, callback) {
      walkDOM(node, null, {
        enter: function(n) {
          return callback(n) ? walkDOM.STOP : true;
        }
      });
    }
    function walkDOM(node, context, callbacks) {
      var stack = [{ node, context, phase: walkDOM.ENTER }];
      while (stack.length > 0) {
        var frame = stack.pop();
        if (frame.phase === walkDOM.ENTER) {
          var childContext = callbacks.enter(frame.node, frame.context);
          if (childContext === walkDOM.STOP) {
            return walkDOM.STOP;
          }
          stack.push({ node: frame.node, context: childContext, phase: walkDOM.EXIT });
          if (childContext === null || childContext === void 0) {
            continue;
          }
          var child = frame.node.lastChild;
          while (child) {
            stack.push({ node: child, context: childContext, phase: walkDOM.ENTER });
            child = child.previousSibling;
          }
        } else {
          if (callbacks.exit) {
            callbacks.exit(frame.node, frame.context);
          }
        }
      }
    }
    walkDOM.STOP = /* @__PURE__ */ Symbol("walkDOM.STOP");
    walkDOM.ENTER = 0;
    walkDOM.EXIT = 1;
    function Document2(symbol, options) {
      checkSymbol(symbol);
      var opt = options || {};
      this.ownerDocument = this;
      this.contentType = opt.contentType || MIME_TYPE.XML_APPLICATION;
      this.type = isHTMLMimeType(this.contentType) ? "html" : "xml";
    }
    function _onAddAttribute(doc, el, newAttr) {
      doc && doc._inc++;
      var ns = newAttr.namespaceURI;
      if (ns === NAMESPACE.XMLNS) {
        el._nsMap[newAttr.prefix ? newAttr.localName : ""] = newAttr.value;
      }
    }
    function _onRemoveAttribute(doc, el, newAttr, remove) {
      doc && doc._inc++;
      var ns = newAttr.namespaceURI;
      if (ns === NAMESPACE.XMLNS) {
        delete el._nsMap[newAttr.prefix ? newAttr.localName : ""];
      }
    }
    function _onUpdateChild(doc, parent, newChild) {
      if (doc && doc._inc) {
        doc._inc++;
        var childNodes = parent.childNodes;
        if (newChild && !newChild.nextSibling) {
          childNodes[childNodes.length++] = newChild;
        } else {
          var child = parent.firstChild;
          var i = 0;
          while (child) {
            childNodes[i++] = child;
            child = child.nextSibling;
          }
          childNodes.length = i;
          delete childNodes[childNodes.length];
        }
      }
    }
    function _removeChild(parentNode, child) {
      if (parentNode !== child.parentNode) {
        throw new DOMException(DOMException.NOT_FOUND_ERR, "child's parent is not parent");
      }
      var oldPreviousSibling = child.previousSibling;
      var oldNextSibling = child.nextSibling;
      if (oldPreviousSibling) {
        oldPreviousSibling.nextSibling = oldNextSibling;
      } else {
        parentNode.firstChild = oldNextSibling;
      }
      if (oldNextSibling) {
        oldNextSibling.previousSibling = oldPreviousSibling;
      } else {
        parentNode.lastChild = oldPreviousSibling;
      }
      _onUpdateChild(parentNode.ownerDocument, parentNode);
      child.parentNode = null;
      child.previousSibling = null;
      child.nextSibling = null;
      return child;
    }
    function hasValidParentNodeType(node) {
      return node && (node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.ELEMENT_NODE);
    }
    function hasInsertableNodeType(node) {
      return node && (node.nodeType === Node.CDATA_SECTION_NODE || node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.DOCUMENT_TYPE_NODE || node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.PROCESSING_INSTRUCTION_NODE || node.nodeType === Node.TEXT_NODE);
    }
    function isDocTypeNode(node) {
      return node && node.nodeType === Node.DOCUMENT_TYPE_NODE;
    }
    function isElementNode(node) {
      return node && node.nodeType === Node.ELEMENT_NODE;
    }
    function isTextNode(node) {
      return node && node.nodeType === Node.TEXT_NODE;
    }
    function isElementInsertionPossible(doc, child) {
      var parentChildNodes = doc.childNodes || [];
      if (find(parentChildNodes, isElementNode) || isDocTypeNode(child)) {
        return false;
      }
      var docTypeNode = find(parentChildNodes, isDocTypeNode);
      return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
    }
    function isElementReplacementPossible(doc, child) {
      var parentChildNodes = doc.childNodes || [];
      function hasElementChildThatIsNotChild(node) {
        return isElementNode(node) && node !== child;
      }
      if (find(parentChildNodes, hasElementChildThatIsNotChild)) {
        return false;
      }
      var docTypeNode = find(parentChildNodes, isDocTypeNode);
      return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
    }
    function assertPreInsertionValidity1to5(parent, node, child) {
      if (!hasValidParentNodeType(parent)) {
        throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Unexpected parent node type " + parent.nodeType);
      }
      if (child && child.parentNode !== parent) {
        throw new DOMException(DOMException.NOT_FOUND_ERR, "child not in parent");
      }
      if (
        // 4. If `node` is not a DocumentFragment, DocumentType, Element, or CharacterData node, then throw a "HierarchyRequestError" DOMException.
        !hasInsertableNodeType(node) || // 5. If either `node` is a Text node and `parent` is a document,
        // the sax parser currently adds top level text nodes, this will be fixed in 0.9.0
        // || (node.nodeType === Node.TEXT_NODE && parent.nodeType === Node.DOCUMENT_NODE)
        // or `node` is a doctype and `parent` is not a document, then throw a "HierarchyRequestError" DOMException.
        isDocTypeNode(node) && parent.nodeType !== Node.DOCUMENT_NODE
      ) {
        throw new DOMException(
          DOMException.HIERARCHY_REQUEST_ERR,
          "Unexpected node type " + node.nodeType + " for parent node type " + parent.nodeType
        );
      }
    }
    function assertPreInsertionValidityInDocument(parent, node, child) {
      var parentChildNodes = parent.childNodes || [];
      var nodeChildNodes = node.childNodes || [];
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        var nodeChildElements = nodeChildNodes.filter(isElementNode);
        if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
        }
        if (nodeChildElements.length === 1 && !isElementInsertionPossible(parent, child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
        }
      }
      if (isElementNode(node)) {
        if (!isElementInsertionPossible(parent, child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
        }
      }
      if (isDocTypeNode(node)) {
        if (find(parentChildNodes, isDocTypeNode)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
        }
        var parentElementChild = find(parentChildNodes, isElementNode);
        if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
        }
        if (!child && parentElementChild) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can not be appended since element is present");
        }
      }
    }
    function assertPreReplacementValidityInDocument(parent, node, child) {
      var parentChildNodes = parent.childNodes || [];
      var nodeChildNodes = node.childNodes || [];
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        var nodeChildElements = nodeChildNodes.filter(isElementNode);
        if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
        }
        if (nodeChildElements.length === 1 && !isElementReplacementPossible(parent, child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
        }
      }
      if (isElementNode(node)) {
        if (!isElementReplacementPossible(parent, child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
        }
      }
      if (isDocTypeNode(node)) {
        let hasDoctypeChildThatIsNotChild = function(node2) {
          return isDocTypeNode(node2) && node2 !== child;
        };
        if (find(parentChildNodes, hasDoctypeChildThatIsNotChild)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
        }
        var parentElementChild = find(parentChildNodes, isElementNode);
        if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
        }
      }
    }
    function _insertBefore(parent, node, child, _inDocumentAssertion) {
      assertPreInsertionValidity1to5(parent, node, child);
      if (parent.nodeType === Node.DOCUMENT_NODE) {
        (_inDocumentAssertion || assertPreInsertionValidityInDocument)(parent, node, child);
      }
      var cp = node.parentNode;
      if (cp) {
        cp.removeChild(node);
      }
      if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
        var newFirst = node.firstChild;
        if (newFirst == null) {
          return node;
        }
        var newLast = node.lastChild;
      } else {
        newFirst = newLast = node;
      }
      var pre = child ? child.previousSibling : parent.lastChild;
      newFirst.previousSibling = pre;
      newLast.nextSibling = child;
      if (pre) {
        pre.nextSibling = newFirst;
      } else {
        parent.firstChild = newFirst;
      }
      if (child == null) {
        parent.lastChild = newLast;
      } else {
        child.previousSibling = newLast;
      }
      do {
        newFirst.parentNode = parent;
      } while (newFirst !== newLast && (newFirst = newFirst.nextSibling));
      _onUpdateChild(parent.ownerDocument || parent, parent, node);
      if (node.nodeType == DOCUMENT_FRAGMENT_NODE) {
        node.firstChild = node.lastChild = null;
      }
      return node;
    }
    Document2.prototype = {
      /**
       * The implementation that created this document.
       *
       * @type DOMImplementation
       * @readonly
       */
      implementation: null,
      nodeName: "#document",
      nodeType: DOCUMENT_NODE,
      /**
       * The DocumentType node of the document.
       *
       * @type DocumentType
       * @readonly
       */
      doctype: null,
      documentElement: null,
      _inc: 1,
      insertBefore: function(newChild, refChild) {
        if (newChild.nodeType === DOCUMENT_FRAGMENT_NODE) {
          var child = newChild.firstChild;
          while (child) {
            var next = child.nextSibling;
            this.insertBefore(child, refChild);
            child = next;
          }
          return newChild;
        }
        _insertBefore(this, newChild, refChild);
        newChild.ownerDocument = this;
        if (this.documentElement === null && newChild.nodeType === ELEMENT_NODE) {
          this.documentElement = newChild;
        }
        return newChild;
      },
      removeChild: function(oldChild) {
        var removed = _removeChild(this, oldChild);
        if (removed === this.documentElement) {
          this.documentElement = null;
        }
        return removed;
      },
      replaceChild: function(newChild, oldChild) {
        _insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
        newChild.ownerDocument = this;
        if (oldChild) {
          this.removeChild(oldChild);
        }
        if (isElementNode(newChild)) {
          this.documentElement = newChild;
        }
      },
      /**
       * Imports a node from another document into this document, creating a new copy owned by this
       * document. The source node and its subtree are not modified.
       *
       * @param {Node} importedNode
       * The node to import.
       * @param {boolean} deep
       * If true, the contents of the node are recursively imported.
       * If false, only the node itself (and its attributes, if it is an element) are imported.
       * @returns {Node}
       * Returns the newly created import of the node.
       * @see {@link importNode}
       * @see {@link https://dom.spec.whatwg.org/#dom-document-importnode}
       */
      importNode: function(importedNode, deep) {
        return importNode(this, importedNode, deep);
      },
      // Introduced in DOM Level 2:
      getElementById: function(id) {
        var rtv = null;
        _visitNode(this.documentElement, function(node) {
          if (node.nodeType == ELEMENT_NODE) {
            if (node.getAttribute("id") == id) {
              rtv = node;
              return true;
            }
          }
        });
        return rtv;
      },
      /**
       * Creates a new `Element` that is owned by this `Document`.
       * In HTML Documents `localName` is the lower cased `tagName`,
       * otherwise no transformation is being applied.
       * When `contentType` implies the HTML namespace, it will be set as `namespaceURI`.
       *
       * __This implementation differs from the specification:__ - The provided name is not checked
       * against the `Name` production,
       * so no related error will be thrown.
       * - There is no interface `HTMLElement`, it is always an `Element`.
       * - There is no support for a second argument to indicate using custom elements.
       *
       * @param {string} tagName
       * @returns {Element}
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
       * @see https://dom.spec.whatwg.org/#dom-document-createelement
       * @see https://dom.spec.whatwg.org/#concept-create-element
       */
      createElement: function(tagName) {
        var node = new Element(PDC);
        node.ownerDocument = this;
        if (this.type === "html") {
          tagName = tagName.toLowerCase();
        }
        if (hasDefaultHTMLNamespace(this.contentType)) {
          node.namespaceURI = NAMESPACE.HTML;
        }
        node.nodeName = tagName;
        node.tagName = tagName;
        node.localName = tagName;
        node.childNodes = new NodeList();
        var attrs = node.attributes = new NamedNodeMap();
        attrs._ownerElement = node;
        return node;
      },
      /**
       * @returns {DocumentFragment}
       */
      createDocumentFragment: function() {
        var node = new DocumentFragment(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        return node;
      },
      /**
       * @param {string} data
       * @returns {Text}
       */
      createTextNode: function(data) {
        var node = new Text(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.appendData(data);
        return node;
      },
      /**
       * @param {string} data
       * @returns {Comment}
       * @see https://dom.spec.whatwg.org/#dom-document-createcomment
       * @see https://www.w3.org/TR/xml/#NT-Comment XML 1.0 production [15]
       * @see https://www.w3.org/TR/DOM-Parsing/#dfn-concept-serialize-xml §3.2.1.3
       *
       *      Note: no validation is performed at creation time. When the resulting document is
       *      serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
       *      if the comment data contains `--` anywhere, ends with `-`, or contains characters
       *      outside the XML Char production (W3C DOM Parsing §3.2.1.3). Without that option the
       *      data is emitted verbatim.
       */
      createComment: function(data) {
        var node = new Comment(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.appendData(data);
        return node;
      },
      /**
       * Returns a new CDATASection node whose data is `data`.
       *
       * __This implementation differs from the specification:__ - calling this method on an HTML
       * document does not throw `NotSupportedError`.
       *
       * @param {string} data
       * @returns {CDATASection}
       * @throws {DOMException}
       * With code `INVALID_CHARACTER_ERR` if `data` contains `"]]>"`.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createCDATASection
       * @see https://dom.spec.whatwg.org/#dom-document-createcdatasection
       */
      createCDATASection: function(data) {
        if (data.indexOf("]]>") !== -1) {
          throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'data contains "]]>"');
        }
        var node = new CDATASection(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.appendData(data);
        return node;
      },
      /**
       * Returns a ProcessingInstruction node whose target is target and data is data.
       *
       * __This behavior is slightly different from the in the specs__:
       * - it does not do any input validation on the arguments and doesn't throw
       * "InvalidCharacterError".
       *
       * Note: When the resulting document is serialized with `requireWellFormed: true`, the
       * serializer throws `InvalidStateError` if `.target` is not a valid XML `NCName` (a `Name`
       * with no colon) or is an ASCII case-insensitive match for `"xml"`, or if `.data` contains
       * `?>` or characters outside the XML Char production (W3C DOM Parsing §3.2.1.7). Without that
       * option the target and data are emitted verbatim.
       *
       * @param {string} target
       * @param {string} data
       * @returns {ProcessingInstruction}
       * @see https://developer.mozilla.org/docs/Web/API/Document/createProcessingInstruction
       * @see https://dom.spec.whatwg.org/#dom-document-createprocessinginstruction
       * @see https://www.w3.org/TR/DOM-Parsing/#dfn-concept-serialize-xml §3.2.1.7
       */
      createProcessingInstruction: function(target, data) {
        var node = new ProcessingInstruction(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.nodeName = node.target = target;
        node.nodeValue = node.data = data;
        return node;
      },
      /**
       * Creates an `Attr` node that is owned by this document.
       * In HTML Documents `localName` is the lower cased `name`,
       * otherwise no transformation is being applied.
       *
       * __This implementation differs from the specification:__ - The provided name is not checked
       * against the `Name` production,
       * so no related error will be thrown.
       *
       * @param {string} name
       * @returns {Attr}
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createAttribute
       * @see https://dom.spec.whatwg.org/#dom-document-createattribute
       */
      createAttribute: function(name2) {
        if (!g.QName_exact.test(name2)) {
          throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'invalid character in name "' + name2 + '"');
        }
        if (this.type === "html") {
          name2 = name2.toLowerCase();
        }
        return this._createAttribute(name2);
      },
      _createAttribute: function(name2) {
        var node = new Attr(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.name = name2;
        node.nodeName = name2;
        node.localName = name2;
        node.specified = true;
        return node;
      },
      /**
       * Creates an EntityReference object.
       * The current implementation does not fill the `childNodes` with those of the corresponding
       * `Entity`
       *
       * The `name` is validated against the XML `Name` production at creation time; an invalid name
       * throws `InvalidCharacterError`. When the resulting node is serialized with
       * `requireWellFormed: true`, the serializer re-validates `nodeName` against the XML `Name`
       * production and throws `InvalidStateError` if a later `nodeName` mutation made it invalid;
       * without that option the name is emitted verbatim.
       *
       * __This implementation differs from the specification:__ xmldom does not expand entities —
       * the parser resolves entity references inline and never constructs `EntityReference` nodes,
       * so this method is the only producer.
       *
       * @deprecated
       * In DOM Level 4.
       * @param {string} name
       * The name of the entity to reference. No namespace well-formedness checks are performed.
       * @returns {EntityReference}
       * @throws {DOMException}
       * With code `INVALID_CHARACTER_ERR` when `name` is not a valid XML `Name`.
       * @throws {DOMException}
       * with code `NOT_SUPPORTED_ERR` when the document is of type `html`
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-392B75AE
       */
      createEntityReference: function(name2) {
        if (!g.Name_exact.test(name2)) {
          throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'not a valid xml name "' + name2 + '"');
        }
        if (this.type === "html") {
          throw new DOMException("document is an html document", DOMExceptionName.NotSupportedError);
        }
        var node = new EntityReference(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.nodeName = name2;
        return node;
      },
      // Introduced in DOM Level 2:
      /**
       * @param {string} namespaceURI
       * @param {string} qualifiedName
       * @returns {Element}
       */
      createElementNS: function(namespaceURI, qualifiedName) {
        var validated = validateAndExtract(namespaceURI, qualifiedName);
        var node = new Element(PDC);
        var attrs = node.attributes = new NamedNodeMap();
        node.childNodes = new NodeList();
        node.ownerDocument = this;
        node.nodeName = qualifiedName;
        node.tagName = qualifiedName;
        node.namespaceURI = validated[0];
        node.prefix = validated[1];
        node.localName = validated[2];
        attrs._ownerElement = node;
        return node;
      },
      // Introduced in DOM Level 2:
      /**
       * @param {string} namespaceURI
       * @param {string} qualifiedName
       * @returns {Attr}
       */
      createAttributeNS: function(namespaceURI, qualifiedName) {
        var validated = validateAndExtract(namespaceURI, qualifiedName);
        var node = new Attr(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.nodeName = qualifiedName;
        node.name = qualifiedName;
        node.specified = true;
        node.namespaceURI = validated[0];
        node.prefix = validated[1];
        node.localName = validated[2];
        return node;
      }
    };
    _extends(Document2, Node);
    function Element(symbol) {
      checkSymbol(symbol);
      this._nsMap = /* @__PURE__ */ Object.create(null);
    }
    Element.prototype = {
      nodeType: ELEMENT_NODE,
      /**
       * The attributes of this element.
       *
       * @type {NamedNodeMap | null}
       */
      attributes: null,
      getQualifiedName: function() {
        return this.prefix ? this.prefix + ":" + this.localName : this.localName;
      },
      _isInHTMLDocumentAndNamespace: function() {
        return this.ownerDocument.type === "html" && this.namespaceURI === NAMESPACE.HTML;
      },
      /**
       * Implementaton of Level2 Core function hasAttributes.
       *
       * @returns {boolean}
       * True if attribute list is not empty.
       * @see https://www.w3.org/TR/DOM-Level-2-Core/#core-ID-NodeHasAttrs
       */
      hasAttributes: function() {
        return !!(this.attributes && this.attributes.length);
      },
      hasAttribute: function(name2) {
        return !!this.getAttributeNode(name2);
      },
      /**
       * Returns element’s first attribute whose qualified name is `name`, and `null`
       * if there is no such attribute.
       *
       * @param {string} name
       * @returns {string | null}
       */
      getAttribute: function(name2) {
        var attr = this.getAttributeNode(name2);
        return attr ? attr.value : null;
      },
      getAttributeNode: function(name2) {
        if (this._isInHTMLDocumentAndNamespace()) {
          name2 = name2.toLowerCase();
        }
        return this.attributes.getNamedItem(name2);
      },
      /**
       * Sets the value of element’s first attribute whose qualified name is qualifiedName to value.
       *
       * @param {string} name
       * @param {string} value
       */
      setAttribute: function(name2, value) {
        if (this._isInHTMLDocumentAndNamespace()) {
          name2 = name2.toLowerCase();
        }
        var attr = this.getAttributeNode(name2);
        if (attr) {
          attr.value = attr.nodeValue = "" + value;
        } else {
          attr = this.ownerDocument._createAttribute(name2);
          attr.value = attr.nodeValue = "" + value;
          this.setAttributeNode(attr);
        }
      },
      removeAttribute: function(name2) {
        var attr = this.getAttributeNode(name2);
        attr && this.removeAttributeNode(attr);
      },
      setAttributeNode: function(newAttr) {
        return this.attributes.setNamedItem(newAttr);
      },
      setAttributeNodeNS: function(newAttr) {
        return this.attributes.setNamedItemNS(newAttr);
      },
      removeAttributeNode: function(oldAttr) {
        return this.attributes.removeNamedItem(oldAttr.nodeName);
      },
      //get real attribute name,and remove it by removeAttributeNode
      removeAttributeNS: function(namespaceURI, localName) {
        var old = this.getAttributeNodeNS(namespaceURI, localName);
        old && this.removeAttributeNode(old);
      },
      hasAttributeNS: function(namespaceURI, localName) {
        return this.getAttributeNodeNS(namespaceURI, localName) != null;
      },
      /**
       * Returns element’s attribute whose namespace is `namespaceURI` and local name is
       * `localName`,
       * or `null` if there is no such attribute.
       *
       * @param {string} namespaceURI
       * @param {string} localName
       * @returns {string | null}
       */
      getAttributeNS: function(namespaceURI, localName) {
        var attr = this.getAttributeNodeNS(namespaceURI, localName);
        return attr ? attr.value : null;
      },
      /**
       * Sets the value of element’s attribute whose namespace is `namespaceURI` and local name is
       * `localName` to value.
       *
       * @param {string} namespaceURI
       * @param {string} qualifiedName
       * @param {string} value
       * @see https://dom.spec.whatwg.org/#dom-element-setattributens
       */
      setAttributeNS: function(namespaceURI, qualifiedName, value) {
        var validated = validateAndExtract(namespaceURI, qualifiedName);
        var localName = validated[2];
        var attr = this.getAttributeNodeNS(namespaceURI, localName);
        if (attr) {
          attr.value = attr.nodeValue = "" + value;
        } else {
          attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
          attr.value = attr.nodeValue = "" + value;
          this.setAttributeNode(attr);
        }
      },
      getAttributeNodeNS: function(namespaceURI, localName) {
        return this.attributes.getNamedItemNS(namespaceURI, localName);
      },
      /**
       * Returns a LiveNodeList of all child elements which have **all** of the given class name(s).
       *
       * Returns an empty list if `classNames` is an empty string or only contains HTML white space
       * characters.
       *
       * Warning: This returns a live LiveNodeList.
       * Changes in the DOM will reflect in the array as the changes occur.
       * If an element selected by this array no longer qualifies for the selector,
       * it will automatically be removed. Be aware of this for iteration purposes.
       *
       * @param {string} classNames
       * Is a string representing the class name(s) to match; multiple class names are separated by
       * (ASCII-)whitespace.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getElementsByClassName
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
       * @see https://dom.spec.whatwg.org/#concept-getelementsbyclassname
       */
      getElementsByClassName: function(classNames) {
        var classNamesSet = toOrderedSet(classNames);
        return new LiveNodeList(this, function(base) {
          var ls = [];
          if (classNamesSet.length > 0) {
            _visitNode(base, function(node) {
              if (node !== base && node.nodeType === ELEMENT_NODE) {
                var nodeClassNames = node.getAttribute("class");
                if (nodeClassNames) {
                  var matches2 = classNames === nodeClassNames;
                  if (!matches2) {
                    var nodeClassNamesSet = toOrderedSet(nodeClassNames);
                    matches2 = classNamesSet.every(arrayIncludes(nodeClassNamesSet));
                  }
                  if (matches2) {
                    ls.push(node);
                  }
                }
              }
            });
          }
          return ls;
        });
      },
      /**
       * Returns a LiveNodeList of elements with the given qualifiedName.
       * Searching for all descendants can be done by passing `*` as `qualifiedName`.
       *
       * All descendants of the specified element are searched, but not the element itself.
       * The returned list is live, which means it updates itself with the DOM tree automatically.
       * Therefore, there is no need to call `Element.getElementsByTagName()`
       * with the same element and arguments repeatedly if the DOM changes in between calls.
       *
       * When called on an HTML element in an HTML document,
       * `getElementsByTagName` lower-cases the argument before searching for it.
       * This is undesirable when trying to match camel-cased SVG elements (such as
       * `<linearGradient>`) in an HTML document.
       * Instead, use `Element.getElementsByTagNameNS()`,
       * which preserves the capitalization of the tag name.
       *
       * `Element.getElementsByTagName` is similar to `Document.getElementsByTagName()`,
       * except that it only searches for elements that are descendants of the specified element.
       *
       * @param {string} qualifiedName
       * @returns {LiveNodeList}
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getElementsByTagName
       * @see https://dom.spec.whatwg.org/#concept-getelementsbytagname
       */
      getElementsByTagName: function(qualifiedName) {
        var isHTMLDocument = (this.nodeType === DOCUMENT_NODE ? this : this.ownerDocument).type === "html";
        var lowerQualifiedName = qualifiedName.toLowerCase();
        return new LiveNodeList(this, function(base) {
          var ls = [];
          _visitNode(base, function(node) {
            if (node === base || node.nodeType !== ELEMENT_NODE) {
              return;
            }
            if (qualifiedName === "*") {
              ls.push(node);
            } else {
              var nodeQualifiedName = node.getQualifiedName();
              var matchingQName = isHTMLDocument && node.namespaceURI === NAMESPACE.HTML ? lowerQualifiedName : qualifiedName;
              if (nodeQualifiedName === matchingQName) {
                ls.push(node);
              }
            }
          });
          return ls;
        });
      },
      getElementsByTagNameNS: function(namespaceURI, localName) {
        return new LiveNodeList(this, function(base) {
          var ls = [];
          _visitNode(base, function(node) {
            if (node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === "*" || node.namespaceURI === namespaceURI) && (localName === "*" || node.localName == localName)) {
              ls.push(node);
            }
          });
          return ls;
        });
      }
    };
    Document2.prototype.getElementsByClassName = Element.prototype.getElementsByClassName;
    Document2.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
    Document2.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;
    _extends(Element, Node);
    function Attr(symbol) {
      checkSymbol(symbol);
      this.namespaceURI = null;
      this.prefix = null;
      this.ownerElement = null;
    }
    Attr.prototype.nodeType = ATTRIBUTE_NODE;
    _extends(Attr, Node);
    function CharacterData(symbol) {
      checkSymbol(symbol);
    }
    CharacterData.prototype = {
      data: "",
      substringData: function(offset, count) {
        return this.data.substring(offset, offset + count);
      },
      appendData: function(text) {
        text = this.data + text;
        this.nodeValue = this.data = text;
        this.length = text.length;
      },
      insertData: function(offset, text) {
        this.replaceData(offset, 0, text);
      },
      deleteData: function(offset, count) {
        this.replaceData(offset, count, "");
      },
      replaceData: function(offset, count, text) {
        var start = this.data.substring(0, offset);
        var end = this.data.substring(offset + count);
        text = start + text + end;
        this.nodeValue = this.data = text;
        this.length = text.length;
      }
    };
    _extends(CharacterData, Node);
    function Text(symbol) {
      checkSymbol(symbol);
    }
    Text.prototype = {
      nodeName: "#text",
      nodeType: TEXT_NODE,
      splitText: function(offset) {
        var text = this.data;
        var newText = text.substring(offset);
        text = text.substring(0, offset);
        this.data = this.nodeValue = text;
        this.length = text.length;
        var newNode = this.ownerDocument.createTextNode(newText);
        if (this.parentNode) {
          this.parentNode.insertBefore(newNode, this.nextSibling);
        }
        return newNode;
      }
    };
    _extends(Text, CharacterData);
    function Comment(symbol) {
      checkSymbol(symbol);
    }
    Comment.prototype = {
      nodeName: "#comment",
      nodeType: COMMENT_NODE
    };
    _extends(Comment, CharacterData);
    function CDATASection(symbol) {
      checkSymbol(symbol);
    }
    CDATASection.prototype = {
      nodeName: "#cdata-section",
      nodeType: CDATA_SECTION_NODE
    };
    _extends(CDATASection, Text);
    function DocumentType(symbol) {
      checkSymbol(symbol);
    }
    DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
    _extends(DocumentType, Node);
    function Notation(symbol) {
      checkSymbol(symbol);
    }
    Notation.prototype.nodeType = NOTATION_NODE;
    _extends(Notation, Node);
    function Entity(symbol) {
      checkSymbol(symbol);
    }
    Entity.prototype.nodeType = ENTITY_NODE;
    _extends(Entity, Node);
    function EntityReference(symbol) {
      checkSymbol(symbol);
    }
    EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
    _extends(EntityReference, Node);
    function DocumentFragment(symbol) {
      checkSymbol(symbol);
    }
    DocumentFragment.prototype.nodeName = "#document-fragment";
    DocumentFragment.prototype.nodeType = DOCUMENT_FRAGMENT_NODE;
    _extends(DocumentFragment, Node);
    function ProcessingInstruction(symbol) {
      checkSymbol(symbol);
    }
    ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
    _extends(ProcessingInstruction, CharacterData);
    function XMLSerializer2() {
    }
    XMLSerializer2.prototype.serializeToString = function(node, options) {
      return nodeSerializeToString.call(node, options);
    };
    Node.prototype.toString = nodeSerializeToString;
    function nodeSerializeToString(options) {
      var opts;
      if (typeof options === "function") {
        opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: options };
      } else if (options != null) {
        opts = {
          requireWellFormed: !!options.requireWellFormed,
          splitCDATASections: options.splitCDATASections !== false,
          nodeFilter: options.nodeFilter || null
        };
      } else {
        opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: null };
      }
      var buf = [];
      var refNode = this.nodeType === DOCUMENT_NODE && this.documentElement || this;
      var prefix = refNode.prefix;
      var uri = refNode.namespaceURI;
      if (uri && prefix == null) {
        var prefix = refNode.lookupPrefix(uri);
        if (prefix == null) {
          var visibleNamespaces = [
            { namespace: uri, prefix: null }
            //{namespace:uri,prefix:''}
          ];
        }
      }
      serializeToString(this, buf, visibleNamespaces, opts);
      return buf.join("");
    }
    function needNamespaceDefine(node, isHTML, visibleNamespaces) {
      var prefix = node.prefix || "";
      var uri = node.namespaceURI;
      if (!uri) {
        return false;
      }
      if (prefix === "xml" && uri === NAMESPACE.XML || uri === NAMESPACE.XMLNS) {
        return false;
      }
      var i = visibleNamespaces.length;
      while (i--) {
        var ns = visibleNamespaces[i];
        if (ns.prefix === prefix) {
          return ns.namespace !== uri;
        }
      }
      return true;
    }
    function addSerializedAttribute(buf, qualifiedName, value, requireWellFormed) {
      if (requireWellFormed && !g.QName_exact.test(qualifiedName)) {
        throw new DOMException(
          'The attribute name "' + qualifiedName + '" is not a valid XML QName',
          DOMExceptionName.InvalidStateError
        );
      }
      buf.push(" ", qualifiedName, '="', value.replace(/[<>&"\t\n\r]/g, _xmlEncoder), '"');
    }
    function serializeToString(node, buf, visibleNamespaces, opts) {
      if (!visibleNamespaces) {
        visibleNamespaces = [];
      }
      var nodeFilter = opts.nodeFilter;
      var requireWellFormed = opts.requireWellFormed;
      var splitCDATASections = opts.splitCDATASections;
      var doc = node.nodeType === DOCUMENT_NODE ? node : node.ownerDocument;
      var isHTML = doc.type === "html";
      walkDOM(
        node,
        { ns: visibleNamespaces },
        {
          enter: function(n, ctx) {
            var namespaces = ctx.ns;
            if (nodeFilter) {
              n = nodeFilter(n);
              if (n) {
                if (typeof n == "string") {
                  buf.push(n);
                  return null;
                }
              } else {
                return null;
              }
            }
            switch (n.nodeType) {
              case ELEMENT_NODE:
                var attrs = n.attributes;
                var len = attrs.length;
                var nodeName = n.tagName;
                var prefixedNodeName = nodeName;
                if (!isHTML && !n.prefix && n.namespaceURI) {
                  var defaultNS;
                  for (var ai = 0; ai < attrs.length; ai++) {
                    if (attrs.item(ai).name === "xmlns") {
                      defaultNS = attrs.item(ai).value;
                      break;
                    }
                  }
                  if (!defaultNS) {
                    for (var nsi = namespaces.length - 1; nsi >= 0; nsi--) {
                      var nsEntry = namespaces[nsi];
                      if (nsEntry.prefix === "" && nsEntry.namespace === n.namespaceURI) {
                        defaultNS = nsEntry.namespace;
                        break;
                      }
                    }
                  }
                  if (defaultNS !== n.namespaceURI) {
                    for (var nsi = namespaces.length - 1; nsi >= 0; nsi--) {
                      var nsEntry = namespaces[nsi];
                      if (nsEntry.namespace === n.namespaceURI) {
                        if (nsEntry.prefix) {
                          prefixedNodeName = nsEntry.prefix + ":" + nodeName;
                        }
                        break;
                      }
                    }
                  }
                }
                if (requireWellFormed && !g.QName_exact.test(prefixedNodeName)) {
                  throw new DOMException(
                    'The element name "' + prefixedNodeName + '" is not a valid XML QName',
                    DOMExceptionName.InvalidStateError
                  );
                }
                buf.push("<", prefixedNodeName);
                var childNamespaces = namespaces.slice();
                for (var i = 0; i < len; i++) {
                  var attr = attrs.item(i);
                  if (attr.prefix == "xmlns") {
                    childNamespaces.push({
                      prefix: attr.localName,
                      namespace: attr.value
                    });
                  } else if (attr.nodeName == "xmlns") {
                    childNamespaces.push({ prefix: "", namespace: attr.value });
                  }
                }
                for (var i = 0; i < len; i++) {
                  var attr = attrs.item(i);
                  if (needNamespaceDefine(attr, isHTML, childNamespaces)) {
                    var attrPrefix = attr.prefix || "";
                    var uri = attr.namespaceURI;
                    addSerializedAttribute(buf, attrPrefix ? "xmlns:" + attrPrefix : "xmlns", uri, requireWellFormed);
                    childNamespaces.push({ prefix: attrPrefix, namespace: uri });
                  }
                  var filteredAttr = nodeFilter ? nodeFilter(attr) : attr;
                  if (filteredAttr) {
                    if (typeof filteredAttr === "string") {
                      buf.push(filteredAttr);
                    } else {
                      addSerializedAttribute(buf, filteredAttr.name, filteredAttr.value, requireWellFormed);
                    }
                  }
                }
                if (nodeName === prefixedNodeName && needNamespaceDefine(n, isHTML, childNamespaces)) {
                  var nodePrefix = n.prefix || "";
                  var uri = n.namespaceURI;
                  addSerializedAttribute(buf, nodePrefix ? "xmlns:" + nodePrefix : "xmlns", uri, requireWellFormed);
                  childNamespaces.push({ prefix: nodePrefix, namespace: uri });
                }
                var canCloseTag = !n.firstChild;
                if (canCloseTag && (isHTML || n.namespaceURI === NAMESPACE.HTML)) {
                  canCloseTag = isHTMLVoidElement(nodeName);
                }
                if (canCloseTag) {
                  buf.push("/>");
                  return null;
                }
                buf.push(">");
                if (isHTML && isHTMLRawTextElement(nodeName)) {
                  var child = n.firstChild;
                  while (child) {
                    if (child.data) {
                      buf.push(child.data);
                    } else {
                      serializeToString(child, buf, childNamespaces.slice(), opts);
                    }
                    child = child.nextSibling;
                  }
                  buf.push("</", prefixedNodeName, ">");
                  return null;
                }
                return { ns: childNamespaces, tag: prefixedNodeName };
              case DOCUMENT_NODE:
              case DOCUMENT_FRAGMENT_NODE:
                if (requireWellFormed && n.nodeType === DOCUMENT_NODE && n.documentElement == null) {
                  throw new DOMException("The Document has no documentElement", DOMExceptionName.InvalidStateError);
                }
                return { ns: namespaces };
              case ATTRIBUTE_NODE:
                addSerializedAttribute(buf, n.name, n.value, requireWellFormed);
                return null;
              case TEXT_NODE:
                if (requireWellFormed && g.InvalidChar.test(n.data)) {
                  throw new DOMException(
                    "The Text node data contains characters outside the XML Char production",
                    DOMExceptionName.InvalidStateError
                  );
                }
                buf.push(n.data.replace(/[<&>]/g, _xmlEncoder));
                return null;
              case CDATA_SECTION_NODE:
                if (requireWellFormed && n.data.indexOf("]]>") !== -1) {
                  throw new DOMException('The CDATASection data contains "]]>"', DOMExceptionName.InvalidStateError);
                }
                if (splitCDATASections) {
                  buf.push(g.CDATA_START, n.data.replace(/]]>/g, "]]]]><![CDATA[>"), g.CDATA_END);
                } else {
                  buf.push(g.CDATA_START, n.data, g.CDATA_END);
                }
                return null;
              case COMMENT_NODE:
                if (requireWellFormed) {
                  if (g.InvalidChar.test(n.data)) {
                    throw new DOMException(
                      "The comment node data contains characters outside the XML Char production",
                      DOMExceptionName.InvalidStateError
                    );
                  }
                  if (n.data.indexOf("--") !== -1 || n.data[n.data.length - 1] === "-") {
                    throw new DOMException(
                      'The comment node data contains "--" or ends with "-"',
                      DOMExceptionName.InvalidStateError
                    );
                  }
                }
                buf.push(g.COMMENT_START, n.data, g.COMMENT_END);
                return null;
              case DOCUMENT_TYPE_NODE:
                var pubid = n.publicId;
                var sysid = n.systemId;
                if (requireWellFormed) {
                  if (!g.Name_exact.test(n.name)) {
                    throw new DOMException(
                      'The doctype name "' + n.name + '" is not a valid XML Name',
                      DOMExceptionName.InvalidStateError
                    );
                  }
                  if (pubid && !g.PubidLiteral_match.test(pubid)) {
                    throw new DOMException("DocumentType publicId is not a valid PubidLiteral", DOMExceptionName.InvalidStateError);
                  }
                  if (sysid && sysid !== "." && !g.SystemLiteral_match.test(sysid)) {
                    throw new DOMException("DocumentType systemId is not a valid SystemLiteral", DOMExceptionName.InvalidStateError);
                  }
                  if (n.internalSubset && n.internalSubset.indexOf("]>") !== -1) {
                    throw new DOMException('DocumentType internalSubset contains "]>"', DOMExceptionName.InvalidStateError);
                  }
                }
                buf.push(g.DOCTYPE_DECL_START, " ", n.name);
                if (pubid) {
                  buf.push(" ", g.PUBLIC, " ", pubid);
                  if (sysid && sysid !== ".") {
                    buf.push(" ", sysid);
                  }
                } else if (sysid && sysid !== ".") {
                  buf.push(" ", g.SYSTEM, " ", sysid);
                }
                if (n.internalSubset) {
                  buf.push(" [", n.internalSubset, "]");
                }
                buf.push(">");
                return null;
              case PROCESSING_INSTRUCTION_NODE:
                if (requireWellFormed) {
                  if (!g.NCName_exact.test(n.target) || n.target.toLowerCase() === "xml") {
                    throw new DOMException(
                      'The processing instruction target "' + n.target + '" is not a valid XML NCName or is reserved',
                      DOMExceptionName.InvalidStateError
                    );
                  }
                  if (g.InvalidChar.test(n.data)) {
                    throw new DOMException(
                      "The ProcessingInstruction data contains characters outside the XML Char production",
                      DOMExceptionName.InvalidStateError
                    );
                  }
                  if (n.data.indexOf("?>") !== -1) {
                    throw new DOMException('The ProcessingInstruction data contains "?>"', DOMExceptionName.InvalidStateError);
                  }
                }
                buf.push("<?", n.target, " ", n.data, "?>");
                return null;
              case ENTITY_REFERENCE_NODE:
                if (requireWellFormed && !g.Name_exact.test(n.nodeName)) {
                  throw new DOMException(
                    'The entity reference name "' + n.nodeName + '" is not a valid XML Name',
                    DOMExceptionName.InvalidStateError
                  );
                }
                buf.push("&", n.nodeName, ";");
                return null;
              //case ENTITY_NODE:
              //case NOTATION_NODE:
              default:
                buf.push("??", n.nodeName);
                return null;
            }
          },
          exit: function(n, childCtx) {
            if (childCtx && childCtx.tag) {
              buf.push("</", childCtx.tag, ">");
            }
          }
        }
      );
    }
    function importNode(doc, node, deep) {
      var destRoot;
      walkDOM(node, null, {
        enter: function(srcNode, destParent) {
          var destNode = srcNode.cloneNode(false);
          destNode.ownerDocument = doc;
          destNode.parentNode = null;
          if (destParent === null) {
            destRoot = destNode;
          } else {
            destParent.appendChild(destNode);
          }
          var shouldDeep = srcNode.nodeType === ATTRIBUTE_NODE || deep;
          return shouldDeep ? destNode : null;
        }
      });
      return destRoot;
    }
    function cloneNode(doc, node, deep) {
      var destRoot;
      walkDOM(node, null, {
        enter: function(srcNode, destParent) {
          var destNode = new srcNode.constructor(PDC);
          for (var n in srcNode) {
            if (hasOwn(srcNode, n)) {
              var v = srcNode[n];
              if (typeof v != "object") {
                if (v != destNode[n]) {
                  destNode[n] = v;
                }
              }
            }
          }
          if (srcNode.childNodes) {
            destNode.childNodes = new NodeList();
          }
          destNode.ownerDocument = doc;
          var shouldDeep = deep;
          switch (destNode.nodeType) {
            case ELEMENT_NODE:
              var attrs = srcNode.attributes;
              var attrs2 = destNode.attributes = new NamedNodeMap();
              var len = attrs.length;
              attrs2._ownerElement = destNode;
              for (var i = 0; i < len; i++) {
                destNode.setAttributeNode(cloneNode(doc, attrs.item(i), true));
              }
              break;
            case ATTRIBUTE_NODE:
              shouldDeep = true;
          }
          if (destParent !== null) {
            destParent.appendChild(destNode);
          } else {
            destRoot = destNode;
          }
          return shouldDeep ? destNode : null;
        }
      });
      return destRoot;
    }
    function __set__(object, key, value) {
      object[key] = value;
    }
    function childrenRefresh(node) {
      var ls = [];
      var child = node.firstChild;
      while (child) {
        if (child.nodeType === ELEMENT_NODE) {
          ls.push(child);
        }
        child = child.nextSibling;
      }
      return ls;
    }
    try {
      if (Object.defineProperty) {
        Object.defineProperty(LiveNodeList.prototype, "length", {
          get: function() {
            _updateLiveList(this);
            return this.$$length;
          }
        });
        Object.defineProperty(Node.prototype, "textContent", {
          get: function() {
            if (this.nodeType === ELEMENT_NODE || this.nodeType === DOCUMENT_FRAGMENT_NODE) {
              var buf = [];
              walkDOM(this, null, {
                enter: function(n) {
                  if (n.nodeType === ELEMENT_NODE || n.nodeType === DOCUMENT_FRAGMENT_NODE) {
                    return true;
                  }
                  if (n.nodeType === PROCESSING_INSTRUCTION_NODE || n.nodeType === COMMENT_NODE) {
                    return null;
                  }
                  buf.push(n.nodeValue);
                }
              });
              return buf.join("");
            }
            return this.nodeValue;
          },
          set: function(data) {
            switch (this.nodeType) {
              case ELEMENT_NODE:
              case DOCUMENT_FRAGMENT_NODE:
                while (this.firstChild) {
                  this.removeChild(this.firstChild);
                }
                if (data || String(data)) {
                  this.appendChild(this.ownerDocument.createTextNode(data));
                }
                break;
              default:
                this.data = data;
                this.value = data;
                this.nodeValue = data;
            }
          }
        });
        Object.defineProperty(CharacterData.prototype, "data", {
          get: function() {
            return this._data != null ? this._data : "";
          },
          set: function(v) {
            this._data = v;
            this.length = typeof v === "string" ? v.length : 0;
          }
        });
        Object.defineProperty(CharacterData.prototype, "nodeValue", {
          get: function() {
            return this.data;
          },
          set: function(v) {
            this.data = v;
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(Element.prototype, "children", {
          get: function() {
            return new LiveNodeList(this, childrenRefresh);
          }
        });
        Object.defineProperty(Document2.prototype, "children", {
          get: function() {
            return new LiveNodeList(this, childrenRefresh);
          }
        });
        Object.defineProperty(DocumentFragment.prototype, "children", {
          get: function() {
            return new LiveNodeList(this, childrenRefresh);
          }
        });
        __set__ = function(object, key, value) {
          object["$$" + key] = value;
        };
      }
    } catch (e) {
    }
    exports._updateLiveList = _updateLiveList;
    exports.Attr = Attr;
    exports.CDATASection = CDATASection;
    exports.CharacterData = CharacterData;
    exports.Comment = Comment;
    exports.Document = Document2;
    exports.DocumentFragment = DocumentFragment;
    exports.DocumentType = DocumentType;
    exports.DOMImplementation = DOMImplementation;
    exports.Element = Element;
    exports.Entity = Entity;
    exports.EntityReference = EntityReference;
    exports.LiveNodeList = LiveNodeList;
    exports.NamedNodeMap = NamedNodeMap;
    exports.Node = Node;
    exports.NodeList = NodeList;
    exports.Notation = Notation;
    exports.Text = Text;
    exports.ProcessingInstruction = ProcessingInstruction;
    exports.walkDOM = walkDOM;
    exports.XMLSerializer = XMLSerializer2;
  }
});

// node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/entities.js
var require_entities = __commonJS({
  "node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/entities.js"(exports) {
    "use strict";
    var freeze = require_conventions().freeze;
    exports.XML_ENTITIES = freeze({
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      quot: '"'
    });
    exports.HTML_ENTITIES = freeze({
      Aacute: "\xC1",
      aacute: "\xE1",
      Abreve: "\u0102",
      abreve: "\u0103",
      ac: "\u223E",
      acd: "\u223F",
      acE: "\u223E\u0333",
      Acirc: "\xC2",
      acirc: "\xE2",
      acute: "\xB4",
      Acy: "\u0410",
      acy: "\u0430",
      AElig: "\xC6",
      aelig: "\xE6",
      af: "\u2061",
      Afr: "\u{1D504}",
      afr: "\u{1D51E}",
      Agrave: "\xC0",
      agrave: "\xE0",
      alefsym: "\u2135",
      aleph: "\u2135",
      Alpha: "\u0391",
      alpha: "\u03B1",
      Amacr: "\u0100",
      amacr: "\u0101",
      amalg: "\u2A3F",
      AMP: "&",
      amp: "&",
      And: "\u2A53",
      and: "\u2227",
      andand: "\u2A55",
      andd: "\u2A5C",
      andslope: "\u2A58",
      andv: "\u2A5A",
      ang: "\u2220",
      ange: "\u29A4",
      angle: "\u2220",
      angmsd: "\u2221",
      angmsdaa: "\u29A8",
      angmsdab: "\u29A9",
      angmsdac: "\u29AA",
      angmsdad: "\u29AB",
      angmsdae: "\u29AC",
      angmsdaf: "\u29AD",
      angmsdag: "\u29AE",
      angmsdah: "\u29AF",
      angrt: "\u221F",
      angrtvb: "\u22BE",
      angrtvbd: "\u299D",
      angsph: "\u2222",
      angst: "\xC5",
      angzarr: "\u237C",
      Aogon: "\u0104",
      aogon: "\u0105",
      Aopf: "\u{1D538}",
      aopf: "\u{1D552}",
      ap: "\u2248",
      apacir: "\u2A6F",
      apE: "\u2A70",
      ape: "\u224A",
      apid: "\u224B",
      apos: "'",
      ApplyFunction: "\u2061",
      approx: "\u2248",
      approxeq: "\u224A",
      Aring: "\xC5",
      aring: "\xE5",
      Ascr: "\u{1D49C}",
      ascr: "\u{1D4B6}",
      Assign: "\u2254",
      ast: "*",
      asymp: "\u2248",
      asympeq: "\u224D",
      Atilde: "\xC3",
      atilde: "\xE3",
      Auml: "\xC4",
      auml: "\xE4",
      awconint: "\u2233",
      awint: "\u2A11",
      backcong: "\u224C",
      backepsilon: "\u03F6",
      backprime: "\u2035",
      backsim: "\u223D",
      backsimeq: "\u22CD",
      Backslash: "\u2216",
      Barv: "\u2AE7",
      barvee: "\u22BD",
      Barwed: "\u2306",
      barwed: "\u2305",
      barwedge: "\u2305",
      bbrk: "\u23B5",
      bbrktbrk: "\u23B6",
      bcong: "\u224C",
      Bcy: "\u0411",
      bcy: "\u0431",
      bdquo: "\u201E",
      becaus: "\u2235",
      Because: "\u2235",
      because: "\u2235",
      bemptyv: "\u29B0",
      bepsi: "\u03F6",
      bernou: "\u212C",
      Bernoullis: "\u212C",
      Beta: "\u0392",
      beta: "\u03B2",
      beth: "\u2136",
      between: "\u226C",
      Bfr: "\u{1D505}",
      bfr: "\u{1D51F}",
      bigcap: "\u22C2",
      bigcirc: "\u25EF",
      bigcup: "\u22C3",
      bigodot: "\u2A00",
      bigoplus: "\u2A01",
      bigotimes: "\u2A02",
      bigsqcup: "\u2A06",
      bigstar: "\u2605",
      bigtriangledown: "\u25BD",
      bigtriangleup: "\u25B3",
      biguplus: "\u2A04",
      bigvee: "\u22C1",
      bigwedge: "\u22C0",
      bkarow: "\u290D",
      blacklozenge: "\u29EB",
      blacksquare: "\u25AA",
      blacktriangle: "\u25B4",
      blacktriangledown: "\u25BE",
      blacktriangleleft: "\u25C2",
      blacktriangleright: "\u25B8",
      blank: "\u2423",
      blk12: "\u2592",
      blk14: "\u2591",
      blk34: "\u2593",
      block: "\u2588",
      bne: "=\u20E5",
      bnequiv: "\u2261\u20E5",
      bNot: "\u2AED",
      bnot: "\u2310",
      Bopf: "\u{1D539}",
      bopf: "\u{1D553}",
      bot: "\u22A5",
      bottom: "\u22A5",
      bowtie: "\u22C8",
      boxbox: "\u29C9",
      boxDL: "\u2557",
      boxDl: "\u2556",
      boxdL: "\u2555",
      boxdl: "\u2510",
      boxDR: "\u2554",
      boxDr: "\u2553",
      boxdR: "\u2552",
      boxdr: "\u250C",
      boxH: "\u2550",
      boxh: "\u2500",
      boxHD: "\u2566",
      boxHd: "\u2564",
      boxhD: "\u2565",
      boxhd: "\u252C",
      boxHU: "\u2569",
      boxHu: "\u2567",
      boxhU: "\u2568",
      boxhu: "\u2534",
      boxminus: "\u229F",
      boxplus: "\u229E",
      boxtimes: "\u22A0",
      boxUL: "\u255D",
      boxUl: "\u255C",
      boxuL: "\u255B",
      boxul: "\u2518",
      boxUR: "\u255A",
      boxUr: "\u2559",
      boxuR: "\u2558",
      boxur: "\u2514",
      boxV: "\u2551",
      boxv: "\u2502",
      boxVH: "\u256C",
      boxVh: "\u256B",
      boxvH: "\u256A",
      boxvh: "\u253C",
      boxVL: "\u2563",
      boxVl: "\u2562",
      boxvL: "\u2561",
      boxvl: "\u2524",
      boxVR: "\u2560",
      boxVr: "\u255F",
      boxvR: "\u255E",
      boxvr: "\u251C",
      bprime: "\u2035",
      Breve: "\u02D8",
      breve: "\u02D8",
      brvbar: "\xA6",
      Bscr: "\u212C",
      bscr: "\u{1D4B7}",
      bsemi: "\u204F",
      bsim: "\u223D",
      bsime: "\u22CD",
      bsol: "\\",
      bsolb: "\u29C5",
      bsolhsub: "\u27C8",
      bull: "\u2022",
      bullet: "\u2022",
      bump: "\u224E",
      bumpE: "\u2AAE",
      bumpe: "\u224F",
      Bumpeq: "\u224E",
      bumpeq: "\u224F",
      Cacute: "\u0106",
      cacute: "\u0107",
      Cap: "\u22D2",
      cap: "\u2229",
      capand: "\u2A44",
      capbrcup: "\u2A49",
      capcap: "\u2A4B",
      capcup: "\u2A47",
      capdot: "\u2A40",
      CapitalDifferentialD: "\u2145",
      caps: "\u2229\uFE00",
      caret: "\u2041",
      caron: "\u02C7",
      Cayleys: "\u212D",
      ccaps: "\u2A4D",
      Ccaron: "\u010C",
      ccaron: "\u010D",
      Ccedil: "\xC7",
      ccedil: "\xE7",
      Ccirc: "\u0108",
      ccirc: "\u0109",
      Cconint: "\u2230",
      ccups: "\u2A4C",
      ccupssm: "\u2A50",
      Cdot: "\u010A",
      cdot: "\u010B",
      cedil: "\xB8",
      Cedilla: "\xB8",
      cemptyv: "\u29B2",
      cent: "\xA2",
      CenterDot: "\xB7",
      centerdot: "\xB7",
      Cfr: "\u212D",
      cfr: "\u{1D520}",
      CHcy: "\u0427",
      chcy: "\u0447",
      check: "\u2713",
      checkmark: "\u2713",
      Chi: "\u03A7",
      chi: "\u03C7",
      cir: "\u25CB",
      circ: "\u02C6",
      circeq: "\u2257",
      circlearrowleft: "\u21BA",
      circlearrowright: "\u21BB",
      circledast: "\u229B",
      circledcirc: "\u229A",
      circleddash: "\u229D",
      CircleDot: "\u2299",
      circledR: "\xAE",
      circledS: "\u24C8",
      CircleMinus: "\u2296",
      CirclePlus: "\u2295",
      CircleTimes: "\u2297",
      cirE: "\u29C3",
      cire: "\u2257",
      cirfnint: "\u2A10",
      cirmid: "\u2AEF",
      cirscir: "\u29C2",
      ClockwiseContourIntegral: "\u2232",
      CloseCurlyDoubleQuote: "\u201D",
      CloseCurlyQuote: "\u2019",
      clubs: "\u2663",
      clubsuit: "\u2663",
      Colon: "\u2237",
      colon: ":",
      Colone: "\u2A74",
      colone: "\u2254",
      coloneq: "\u2254",
      comma: ",",
      commat: "@",
      comp: "\u2201",
      compfn: "\u2218",
      complement: "\u2201",
      complexes: "\u2102",
      cong: "\u2245",
      congdot: "\u2A6D",
      Congruent: "\u2261",
      Conint: "\u222F",
      conint: "\u222E",
      ContourIntegral: "\u222E",
      Copf: "\u2102",
      copf: "\u{1D554}",
      coprod: "\u2210",
      Coproduct: "\u2210",
      COPY: "\xA9",
      copy: "\xA9",
      copysr: "\u2117",
      CounterClockwiseContourIntegral: "\u2233",
      crarr: "\u21B5",
      Cross: "\u2A2F",
      cross: "\u2717",
      Cscr: "\u{1D49E}",
      cscr: "\u{1D4B8}",
      csub: "\u2ACF",
      csube: "\u2AD1",
      csup: "\u2AD0",
      csupe: "\u2AD2",
      ctdot: "\u22EF",
      cudarrl: "\u2938",
      cudarrr: "\u2935",
      cuepr: "\u22DE",
      cuesc: "\u22DF",
      cularr: "\u21B6",
      cularrp: "\u293D",
      Cup: "\u22D3",
      cup: "\u222A",
      cupbrcap: "\u2A48",
      CupCap: "\u224D",
      cupcap: "\u2A46",
      cupcup: "\u2A4A",
      cupdot: "\u228D",
      cupor: "\u2A45",
      cups: "\u222A\uFE00",
      curarr: "\u21B7",
      curarrm: "\u293C",
      curlyeqprec: "\u22DE",
      curlyeqsucc: "\u22DF",
      curlyvee: "\u22CE",
      curlywedge: "\u22CF",
      curren: "\xA4",
      curvearrowleft: "\u21B6",
      curvearrowright: "\u21B7",
      cuvee: "\u22CE",
      cuwed: "\u22CF",
      cwconint: "\u2232",
      cwint: "\u2231",
      cylcty: "\u232D",
      Dagger: "\u2021",
      dagger: "\u2020",
      daleth: "\u2138",
      Darr: "\u21A1",
      dArr: "\u21D3",
      darr: "\u2193",
      dash: "\u2010",
      Dashv: "\u2AE4",
      dashv: "\u22A3",
      dbkarow: "\u290F",
      dblac: "\u02DD",
      Dcaron: "\u010E",
      dcaron: "\u010F",
      Dcy: "\u0414",
      dcy: "\u0434",
      DD: "\u2145",
      dd: "\u2146",
      ddagger: "\u2021",
      ddarr: "\u21CA",
      DDotrahd: "\u2911",
      ddotseq: "\u2A77",
      deg: "\xB0",
      Del: "\u2207",
      Delta: "\u0394",
      delta: "\u03B4",
      demptyv: "\u29B1",
      dfisht: "\u297F",
      Dfr: "\u{1D507}",
      dfr: "\u{1D521}",
      dHar: "\u2965",
      dharl: "\u21C3",
      dharr: "\u21C2",
      DiacriticalAcute: "\xB4",
      DiacriticalDot: "\u02D9",
      DiacriticalDoubleAcute: "\u02DD",
      DiacriticalGrave: "`",
      DiacriticalTilde: "\u02DC",
      diam: "\u22C4",
      Diamond: "\u22C4",
      diamond: "\u22C4",
      diamondsuit: "\u2666",
      diams: "\u2666",
      die: "\xA8",
      DifferentialD: "\u2146",
      digamma: "\u03DD",
      disin: "\u22F2",
      div: "\xF7",
      divide: "\xF7",
      divideontimes: "\u22C7",
      divonx: "\u22C7",
      DJcy: "\u0402",
      djcy: "\u0452",
      dlcorn: "\u231E",
      dlcrop: "\u230D",
      dollar: "$",
      Dopf: "\u{1D53B}",
      dopf: "\u{1D555}",
      Dot: "\xA8",
      dot: "\u02D9",
      DotDot: "\u20DC",
      doteq: "\u2250",
      doteqdot: "\u2251",
      DotEqual: "\u2250",
      dotminus: "\u2238",
      dotplus: "\u2214",
      dotsquare: "\u22A1",
      doublebarwedge: "\u2306",
      DoubleContourIntegral: "\u222F",
      DoubleDot: "\xA8",
      DoubleDownArrow: "\u21D3",
      DoubleLeftArrow: "\u21D0",
      DoubleLeftRightArrow: "\u21D4",
      DoubleLeftTee: "\u2AE4",
      DoubleLongLeftArrow: "\u27F8",
      DoubleLongLeftRightArrow: "\u27FA",
      DoubleLongRightArrow: "\u27F9",
      DoubleRightArrow: "\u21D2",
      DoubleRightTee: "\u22A8",
      DoubleUpArrow: "\u21D1",
      DoubleUpDownArrow: "\u21D5",
      DoubleVerticalBar: "\u2225",
      DownArrow: "\u2193",
      Downarrow: "\u21D3",
      downarrow: "\u2193",
      DownArrowBar: "\u2913",
      DownArrowUpArrow: "\u21F5",
      DownBreve: "\u0311",
      downdownarrows: "\u21CA",
      downharpoonleft: "\u21C3",
      downharpoonright: "\u21C2",
      DownLeftRightVector: "\u2950",
      DownLeftTeeVector: "\u295E",
      DownLeftVector: "\u21BD",
      DownLeftVectorBar: "\u2956",
      DownRightTeeVector: "\u295F",
      DownRightVector: "\u21C1",
      DownRightVectorBar: "\u2957",
      DownTee: "\u22A4",
      DownTeeArrow: "\u21A7",
      drbkarow: "\u2910",
      drcorn: "\u231F",
      drcrop: "\u230C",
      Dscr: "\u{1D49F}",
      dscr: "\u{1D4B9}",
      DScy: "\u0405",
      dscy: "\u0455",
      dsol: "\u29F6",
      Dstrok: "\u0110",
      dstrok: "\u0111",
      dtdot: "\u22F1",
      dtri: "\u25BF",
      dtrif: "\u25BE",
      duarr: "\u21F5",
      duhar: "\u296F",
      dwangle: "\u29A6",
      DZcy: "\u040F",
      dzcy: "\u045F",
      dzigrarr: "\u27FF",
      Eacute: "\xC9",
      eacute: "\xE9",
      easter: "\u2A6E",
      Ecaron: "\u011A",
      ecaron: "\u011B",
      ecir: "\u2256",
      Ecirc: "\xCA",
      ecirc: "\xEA",
      ecolon: "\u2255",
      Ecy: "\u042D",
      ecy: "\u044D",
      eDDot: "\u2A77",
      Edot: "\u0116",
      eDot: "\u2251",
      edot: "\u0117",
      ee: "\u2147",
      efDot: "\u2252",
      Efr: "\u{1D508}",
      efr: "\u{1D522}",
      eg: "\u2A9A",
      Egrave: "\xC8",
      egrave: "\xE8",
      egs: "\u2A96",
      egsdot: "\u2A98",
      el: "\u2A99",
      Element: "\u2208",
      elinters: "\u23E7",
      ell: "\u2113",
      els: "\u2A95",
      elsdot: "\u2A97",
      Emacr: "\u0112",
      emacr: "\u0113",
      empty: "\u2205",
      emptyset: "\u2205",
      EmptySmallSquare: "\u25FB",
      emptyv: "\u2205",
      EmptyVerySmallSquare: "\u25AB",
      emsp: "\u2003",
      emsp13: "\u2004",
      emsp14: "\u2005",
      ENG: "\u014A",
      eng: "\u014B",
      ensp: "\u2002",
      Eogon: "\u0118",
      eogon: "\u0119",
      Eopf: "\u{1D53C}",
      eopf: "\u{1D556}",
      epar: "\u22D5",
      eparsl: "\u29E3",
      eplus: "\u2A71",
      epsi: "\u03B5",
      Epsilon: "\u0395",
      epsilon: "\u03B5",
      epsiv: "\u03F5",
      eqcirc: "\u2256",
      eqcolon: "\u2255",
      eqsim: "\u2242",
      eqslantgtr: "\u2A96",
      eqslantless: "\u2A95",
      Equal: "\u2A75",
      equals: "=",
      EqualTilde: "\u2242",
      equest: "\u225F",
      Equilibrium: "\u21CC",
      equiv: "\u2261",
      equivDD: "\u2A78",
      eqvparsl: "\u29E5",
      erarr: "\u2971",
      erDot: "\u2253",
      Escr: "\u2130",
      escr: "\u212F",
      esdot: "\u2250",
      Esim: "\u2A73",
      esim: "\u2242",
      Eta: "\u0397",
      eta: "\u03B7",
      ETH: "\xD0",
      eth: "\xF0",
      Euml: "\xCB",
      euml: "\xEB",
      euro: "\u20AC",
      excl: "!",
      exist: "\u2203",
      Exists: "\u2203",
      expectation: "\u2130",
      ExponentialE: "\u2147",
      exponentiale: "\u2147",
      fallingdotseq: "\u2252",
      Fcy: "\u0424",
      fcy: "\u0444",
      female: "\u2640",
      ffilig: "\uFB03",
      fflig: "\uFB00",
      ffllig: "\uFB04",
      Ffr: "\u{1D509}",
      ffr: "\u{1D523}",
      filig: "\uFB01",
      FilledSmallSquare: "\u25FC",
      FilledVerySmallSquare: "\u25AA",
      fjlig: "fj",
      flat: "\u266D",
      fllig: "\uFB02",
      fltns: "\u25B1",
      fnof: "\u0192",
      Fopf: "\u{1D53D}",
      fopf: "\u{1D557}",
      ForAll: "\u2200",
      forall: "\u2200",
      fork: "\u22D4",
      forkv: "\u2AD9",
      Fouriertrf: "\u2131",
      fpartint: "\u2A0D",
      frac12: "\xBD",
      frac13: "\u2153",
      frac14: "\xBC",
      frac15: "\u2155",
      frac16: "\u2159",
      frac18: "\u215B",
      frac23: "\u2154",
      frac25: "\u2156",
      frac34: "\xBE",
      frac35: "\u2157",
      frac38: "\u215C",
      frac45: "\u2158",
      frac56: "\u215A",
      frac58: "\u215D",
      frac78: "\u215E",
      frasl: "\u2044",
      frown: "\u2322",
      Fscr: "\u2131",
      fscr: "\u{1D4BB}",
      gacute: "\u01F5",
      Gamma: "\u0393",
      gamma: "\u03B3",
      Gammad: "\u03DC",
      gammad: "\u03DD",
      gap: "\u2A86",
      Gbreve: "\u011E",
      gbreve: "\u011F",
      Gcedil: "\u0122",
      Gcirc: "\u011C",
      gcirc: "\u011D",
      Gcy: "\u0413",
      gcy: "\u0433",
      Gdot: "\u0120",
      gdot: "\u0121",
      gE: "\u2267",
      ge: "\u2265",
      gEl: "\u2A8C",
      gel: "\u22DB",
      geq: "\u2265",
      geqq: "\u2267",
      geqslant: "\u2A7E",
      ges: "\u2A7E",
      gescc: "\u2AA9",
      gesdot: "\u2A80",
      gesdoto: "\u2A82",
      gesdotol: "\u2A84",
      gesl: "\u22DB\uFE00",
      gesles: "\u2A94",
      Gfr: "\u{1D50A}",
      gfr: "\u{1D524}",
      Gg: "\u22D9",
      gg: "\u226B",
      ggg: "\u22D9",
      gimel: "\u2137",
      GJcy: "\u0403",
      gjcy: "\u0453",
      gl: "\u2277",
      gla: "\u2AA5",
      glE: "\u2A92",
      glj: "\u2AA4",
      gnap: "\u2A8A",
      gnapprox: "\u2A8A",
      gnE: "\u2269",
      gne: "\u2A88",
      gneq: "\u2A88",
      gneqq: "\u2269",
      gnsim: "\u22E7",
      Gopf: "\u{1D53E}",
      gopf: "\u{1D558}",
      grave: "`",
      GreaterEqual: "\u2265",
      GreaterEqualLess: "\u22DB",
      GreaterFullEqual: "\u2267",
      GreaterGreater: "\u2AA2",
      GreaterLess: "\u2277",
      GreaterSlantEqual: "\u2A7E",
      GreaterTilde: "\u2273",
      Gscr: "\u{1D4A2}",
      gscr: "\u210A",
      gsim: "\u2273",
      gsime: "\u2A8E",
      gsiml: "\u2A90",
      Gt: "\u226B",
      GT: ">",
      gt: ">",
      gtcc: "\u2AA7",
      gtcir: "\u2A7A",
      gtdot: "\u22D7",
      gtlPar: "\u2995",
      gtquest: "\u2A7C",
      gtrapprox: "\u2A86",
      gtrarr: "\u2978",
      gtrdot: "\u22D7",
      gtreqless: "\u22DB",
      gtreqqless: "\u2A8C",
      gtrless: "\u2277",
      gtrsim: "\u2273",
      gvertneqq: "\u2269\uFE00",
      gvnE: "\u2269\uFE00",
      Hacek: "\u02C7",
      hairsp: "\u200A",
      half: "\xBD",
      hamilt: "\u210B",
      HARDcy: "\u042A",
      hardcy: "\u044A",
      hArr: "\u21D4",
      harr: "\u2194",
      harrcir: "\u2948",
      harrw: "\u21AD",
      Hat: "^",
      hbar: "\u210F",
      Hcirc: "\u0124",
      hcirc: "\u0125",
      hearts: "\u2665",
      heartsuit: "\u2665",
      hellip: "\u2026",
      hercon: "\u22B9",
      Hfr: "\u210C",
      hfr: "\u{1D525}",
      HilbertSpace: "\u210B",
      hksearow: "\u2925",
      hkswarow: "\u2926",
      hoarr: "\u21FF",
      homtht: "\u223B",
      hookleftarrow: "\u21A9",
      hookrightarrow: "\u21AA",
      Hopf: "\u210D",
      hopf: "\u{1D559}",
      horbar: "\u2015",
      HorizontalLine: "\u2500",
      Hscr: "\u210B",
      hscr: "\u{1D4BD}",
      hslash: "\u210F",
      Hstrok: "\u0126",
      hstrok: "\u0127",
      HumpDownHump: "\u224E",
      HumpEqual: "\u224F",
      hybull: "\u2043",
      hyphen: "\u2010",
      Iacute: "\xCD",
      iacute: "\xED",
      ic: "\u2063",
      Icirc: "\xCE",
      icirc: "\xEE",
      Icy: "\u0418",
      icy: "\u0438",
      Idot: "\u0130",
      IEcy: "\u0415",
      iecy: "\u0435",
      iexcl: "\xA1",
      iff: "\u21D4",
      Ifr: "\u2111",
      ifr: "\u{1D526}",
      Igrave: "\xCC",
      igrave: "\xEC",
      ii: "\u2148",
      iiiint: "\u2A0C",
      iiint: "\u222D",
      iinfin: "\u29DC",
      iiota: "\u2129",
      IJlig: "\u0132",
      ijlig: "\u0133",
      Im: "\u2111",
      Imacr: "\u012A",
      imacr: "\u012B",
      image: "\u2111",
      ImaginaryI: "\u2148",
      imagline: "\u2110",
      imagpart: "\u2111",
      imath: "\u0131",
      imof: "\u22B7",
      imped: "\u01B5",
      Implies: "\u21D2",
      in: "\u2208",
      incare: "\u2105",
      infin: "\u221E",
      infintie: "\u29DD",
      inodot: "\u0131",
      Int: "\u222C",
      int: "\u222B",
      intcal: "\u22BA",
      integers: "\u2124",
      Integral: "\u222B",
      intercal: "\u22BA",
      Intersection: "\u22C2",
      intlarhk: "\u2A17",
      intprod: "\u2A3C",
      InvisibleComma: "\u2063",
      InvisibleTimes: "\u2062",
      IOcy: "\u0401",
      iocy: "\u0451",
      Iogon: "\u012E",
      iogon: "\u012F",
      Iopf: "\u{1D540}",
      iopf: "\u{1D55A}",
      Iota: "\u0399",
      iota: "\u03B9",
      iprod: "\u2A3C",
      iquest: "\xBF",
      Iscr: "\u2110",
      iscr: "\u{1D4BE}",
      isin: "\u2208",
      isindot: "\u22F5",
      isinE: "\u22F9",
      isins: "\u22F4",
      isinsv: "\u22F3",
      isinv: "\u2208",
      it: "\u2062",
      Itilde: "\u0128",
      itilde: "\u0129",
      Iukcy: "\u0406",
      iukcy: "\u0456",
      Iuml: "\xCF",
      iuml: "\xEF",
      Jcirc: "\u0134",
      jcirc: "\u0135",
      Jcy: "\u0419",
      jcy: "\u0439",
      Jfr: "\u{1D50D}",
      jfr: "\u{1D527}",
      jmath: "\u0237",
      Jopf: "\u{1D541}",
      jopf: "\u{1D55B}",
      Jscr: "\u{1D4A5}",
      jscr: "\u{1D4BF}",
      Jsercy: "\u0408",
      jsercy: "\u0458",
      Jukcy: "\u0404",
      jukcy: "\u0454",
      Kappa: "\u039A",
      kappa: "\u03BA",
      kappav: "\u03F0",
      Kcedil: "\u0136",
      kcedil: "\u0137",
      Kcy: "\u041A",
      kcy: "\u043A",
      Kfr: "\u{1D50E}",
      kfr: "\u{1D528}",
      kgreen: "\u0138",
      KHcy: "\u0425",
      khcy: "\u0445",
      KJcy: "\u040C",
      kjcy: "\u045C",
      Kopf: "\u{1D542}",
      kopf: "\u{1D55C}",
      Kscr: "\u{1D4A6}",
      kscr: "\u{1D4C0}",
      lAarr: "\u21DA",
      Lacute: "\u0139",
      lacute: "\u013A",
      laemptyv: "\u29B4",
      lagran: "\u2112",
      Lambda: "\u039B",
      lambda: "\u03BB",
      Lang: "\u27EA",
      lang: "\u27E8",
      langd: "\u2991",
      langle: "\u27E8",
      lap: "\u2A85",
      Laplacetrf: "\u2112",
      laquo: "\xAB",
      Larr: "\u219E",
      lArr: "\u21D0",
      larr: "\u2190",
      larrb: "\u21E4",
      larrbfs: "\u291F",
      larrfs: "\u291D",
      larrhk: "\u21A9",
      larrlp: "\u21AB",
      larrpl: "\u2939",
      larrsim: "\u2973",
      larrtl: "\u21A2",
      lat: "\u2AAB",
      lAtail: "\u291B",
      latail: "\u2919",
      late: "\u2AAD",
      lates: "\u2AAD\uFE00",
      lBarr: "\u290E",
      lbarr: "\u290C",
      lbbrk: "\u2772",
      lbrace: "{",
      lbrack: "[",
      lbrke: "\u298B",
      lbrksld: "\u298F",
      lbrkslu: "\u298D",
      Lcaron: "\u013D",
      lcaron: "\u013E",
      Lcedil: "\u013B",
      lcedil: "\u013C",
      lceil: "\u2308",
      lcub: "{",
      Lcy: "\u041B",
      lcy: "\u043B",
      ldca: "\u2936",
      ldquo: "\u201C",
      ldquor: "\u201E",
      ldrdhar: "\u2967",
      ldrushar: "\u294B",
      ldsh: "\u21B2",
      lE: "\u2266",
      le: "\u2264",
      LeftAngleBracket: "\u27E8",
      LeftArrow: "\u2190",
      Leftarrow: "\u21D0",
      leftarrow: "\u2190",
      LeftArrowBar: "\u21E4",
      LeftArrowRightArrow: "\u21C6",
      leftarrowtail: "\u21A2",
      LeftCeiling: "\u2308",
      LeftDoubleBracket: "\u27E6",
      LeftDownTeeVector: "\u2961",
      LeftDownVector: "\u21C3",
      LeftDownVectorBar: "\u2959",
      LeftFloor: "\u230A",
      leftharpoondown: "\u21BD",
      leftharpoonup: "\u21BC",
      leftleftarrows: "\u21C7",
      LeftRightArrow: "\u2194",
      Leftrightarrow: "\u21D4",
      leftrightarrow: "\u2194",
      leftrightarrows: "\u21C6",
      leftrightharpoons: "\u21CB",
      leftrightsquigarrow: "\u21AD",
      LeftRightVector: "\u294E",
      LeftTee: "\u22A3",
      LeftTeeArrow: "\u21A4",
      LeftTeeVector: "\u295A",
      leftthreetimes: "\u22CB",
      LeftTriangle: "\u22B2",
      LeftTriangleBar: "\u29CF",
      LeftTriangleEqual: "\u22B4",
      LeftUpDownVector: "\u2951",
      LeftUpTeeVector: "\u2960",
      LeftUpVector: "\u21BF",
      LeftUpVectorBar: "\u2958",
      LeftVector: "\u21BC",
      LeftVectorBar: "\u2952",
      lEg: "\u2A8B",
      leg: "\u22DA",
      leq: "\u2264",
      leqq: "\u2266",
      leqslant: "\u2A7D",
      les: "\u2A7D",
      lescc: "\u2AA8",
      lesdot: "\u2A7F",
      lesdoto: "\u2A81",
      lesdotor: "\u2A83",
      lesg: "\u22DA\uFE00",
      lesges: "\u2A93",
      lessapprox: "\u2A85",
      lessdot: "\u22D6",
      lesseqgtr: "\u22DA",
      lesseqqgtr: "\u2A8B",
      LessEqualGreater: "\u22DA",
      LessFullEqual: "\u2266",
      LessGreater: "\u2276",
      lessgtr: "\u2276",
      LessLess: "\u2AA1",
      lesssim: "\u2272",
      LessSlantEqual: "\u2A7D",
      LessTilde: "\u2272",
      lfisht: "\u297C",
      lfloor: "\u230A",
      Lfr: "\u{1D50F}",
      lfr: "\u{1D529}",
      lg: "\u2276",
      lgE: "\u2A91",
      lHar: "\u2962",
      lhard: "\u21BD",
      lharu: "\u21BC",
      lharul: "\u296A",
      lhblk: "\u2584",
      LJcy: "\u0409",
      ljcy: "\u0459",
      Ll: "\u22D8",
      ll: "\u226A",
      llarr: "\u21C7",
      llcorner: "\u231E",
      Lleftarrow: "\u21DA",
      llhard: "\u296B",
      lltri: "\u25FA",
      Lmidot: "\u013F",
      lmidot: "\u0140",
      lmoust: "\u23B0",
      lmoustache: "\u23B0",
      lnap: "\u2A89",
      lnapprox: "\u2A89",
      lnE: "\u2268",
      lne: "\u2A87",
      lneq: "\u2A87",
      lneqq: "\u2268",
      lnsim: "\u22E6",
      loang: "\u27EC",
      loarr: "\u21FD",
      lobrk: "\u27E6",
      LongLeftArrow: "\u27F5",
      Longleftarrow: "\u27F8",
      longleftarrow: "\u27F5",
      LongLeftRightArrow: "\u27F7",
      Longleftrightarrow: "\u27FA",
      longleftrightarrow: "\u27F7",
      longmapsto: "\u27FC",
      LongRightArrow: "\u27F6",
      Longrightarrow: "\u27F9",
      longrightarrow: "\u27F6",
      looparrowleft: "\u21AB",
      looparrowright: "\u21AC",
      lopar: "\u2985",
      Lopf: "\u{1D543}",
      lopf: "\u{1D55D}",
      loplus: "\u2A2D",
      lotimes: "\u2A34",
      lowast: "\u2217",
      lowbar: "_",
      LowerLeftArrow: "\u2199",
      LowerRightArrow: "\u2198",
      loz: "\u25CA",
      lozenge: "\u25CA",
      lozf: "\u29EB",
      lpar: "(",
      lparlt: "\u2993",
      lrarr: "\u21C6",
      lrcorner: "\u231F",
      lrhar: "\u21CB",
      lrhard: "\u296D",
      lrm: "\u200E",
      lrtri: "\u22BF",
      lsaquo: "\u2039",
      Lscr: "\u2112",
      lscr: "\u{1D4C1}",
      Lsh: "\u21B0",
      lsh: "\u21B0",
      lsim: "\u2272",
      lsime: "\u2A8D",
      lsimg: "\u2A8F",
      lsqb: "[",
      lsquo: "\u2018",
      lsquor: "\u201A",
      Lstrok: "\u0141",
      lstrok: "\u0142",
      Lt: "\u226A",
      LT: "<",
      lt: "<",
      ltcc: "\u2AA6",
      ltcir: "\u2A79",
      ltdot: "\u22D6",
      lthree: "\u22CB",
      ltimes: "\u22C9",
      ltlarr: "\u2976",
      ltquest: "\u2A7B",
      ltri: "\u25C3",
      ltrie: "\u22B4",
      ltrif: "\u25C2",
      ltrPar: "\u2996",
      lurdshar: "\u294A",
      luruhar: "\u2966",
      lvertneqq: "\u2268\uFE00",
      lvnE: "\u2268\uFE00",
      macr: "\xAF",
      male: "\u2642",
      malt: "\u2720",
      maltese: "\u2720",
      Map: "\u2905",
      map: "\u21A6",
      mapsto: "\u21A6",
      mapstodown: "\u21A7",
      mapstoleft: "\u21A4",
      mapstoup: "\u21A5",
      marker: "\u25AE",
      mcomma: "\u2A29",
      Mcy: "\u041C",
      mcy: "\u043C",
      mdash: "\u2014",
      mDDot: "\u223A",
      measuredangle: "\u2221",
      MediumSpace: "\u205F",
      Mellintrf: "\u2133",
      Mfr: "\u{1D510}",
      mfr: "\u{1D52A}",
      mho: "\u2127",
      micro: "\xB5",
      mid: "\u2223",
      midast: "*",
      midcir: "\u2AF0",
      middot: "\xB7",
      minus: "\u2212",
      minusb: "\u229F",
      minusd: "\u2238",
      minusdu: "\u2A2A",
      MinusPlus: "\u2213",
      mlcp: "\u2ADB",
      mldr: "\u2026",
      mnplus: "\u2213",
      models: "\u22A7",
      Mopf: "\u{1D544}",
      mopf: "\u{1D55E}",
      mp: "\u2213",
      Mscr: "\u2133",
      mscr: "\u{1D4C2}",
      mstpos: "\u223E",
      Mu: "\u039C",
      mu: "\u03BC",
      multimap: "\u22B8",
      mumap: "\u22B8",
      nabla: "\u2207",
      Nacute: "\u0143",
      nacute: "\u0144",
      nang: "\u2220\u20D2",
      nap: "\u2249",
      napE: "\u2A70\u0338",
      napid: "\u224B\u0338",
      napos: "\u0149",
      napprox: "\u2249",
      natur: "\u266E",
      natural: "\u266E",
      naturals: "\u2115",
      nbsp: "\xA0",
      nbump: "\u224E\u0338",
      nbumpe: "\u224F\u0338",
      ncap: "\u2A43",
      Ncaron: "\u0147",
      ncaron: "\u0148",
      Ncedil: "\u0145",
      ncedil: "\u0146",
      ncong: "\u2247",
      ncongdot: "\u2A6D\u0338",
      ncup: "\u2A42",
      Ncy: "\u041D",
      ncy: "\u043D",
      ndash: "\u2013",
      ne: "\u2260",
      nearhk: "\u2924",
      neArr: "\u21D7",
      nearr: "\u2197",
      nearrow: "\u2197",
      nedot: "\u2250\u0338",
      NegativeMediumSpace: "\u200B",
      NegativeThickSpace: "\u200B",
      NegativeThinSpace: "\u200B",
      NegativeVeryThinSpace: "\u200B",
      nequiv: "\u2262",
      nesear: "\u2928",
      nesim: "\u2242\u0338",
      NestedGreaterGreater: "\u226B",
      NestedLessLess: "\u226A",
      NewLine: "\n",
      nexist: "\u2204",
      nexists: "\u2204",
      Nfr: "\u{1D511}",
      nfr: "\u{1D52B}",
      ngE: "\u2267\u0338",
      nge: "\u2271",
      ngeq: "\u2271",
      ngeqq: "\u2267\u0338",
      ngeqslant: "\u2A7E\u0338",
      nges: "\u2A7E\u0338",
      nGg: "\u22D9\u0338",
      ngsim: "\u2275",
      nGt: "\u226B\u20D2",
      ngt: "\u226F",
      ngtr: "\u226F",
      nGtv: "\u226B\u0338",
      nhArr: "\u21CE",
      nharr: "\u21AE",
      nhpar: "\u2AF2",
      ni: "\u220B",
      nis: "\u22FC",
      nisd: "\u22FA",
      niv: "\u220B",
      NJcy: "\u040A",
      njcy: "\u045A",
      nlArr: "\u21CD",
      nlarr: "\u219A",
      nldr: "\u2025",
      nlE: "\u2266\u0338",
      nle: "\u2270",
      nLeftarrow: "\u21CD",
      nleftarrow: "\u219A",
      nLeftrightarrow: "\u21CE",
      nleftrightarrow: "\u21AE",
      nleq: "\u2270",
      nleqq: "\u2266\u0338",
      nleqslant: "\u2A7D\u0338",
      nles: "\u2A7D\u0338",
      nless: "\u226E",
      nLl: "\u22D8\u0338",
      nlsim: "\u2274",
      nLt: "\u226A\u20D2",
      nlt: "\u226E",
      nltri: "\u22EA",
      nltrie: "\u22EC",
      nLtv: "\u226A\u0338",
      nmid: "\u2224",
      NoBreak: "\u2060",
      NonBreakingSpace: "\xA0",
      Nopf: "\u2115",
      nopf: "\u{1D55F}",
      Not: "\u2AEC",
      not: "\xAC",
      NotCongruent: "\u2262",
      NotCupCap: "\u226D",
      NotDoubleVerticalBar: "\u2226",
      NotElement: "\u2209",
      NotEqual: "\u2260",
      NotEqualTilde: "\u2242\u0338",
      NotExists: "\u2204",
      NotGreater: "\u226F",
      NotGreaterEqual: "\u2271",
      NotGreaterFullEqual: "\u2267\u0338",
      NotGreaterGreater: "\u226B\u0338",
      NotGreaterLess: "\u2279",
      NotGreaterSlantEqual: "\u2A7E\u0338",
      NotGreaterTilde: "\u2275",
      NotHumpDownHump: "\u224E\u0338",
      NotHumpEqual: "\u224F\u0338",
      notin: "\u2209",
      notindot: "\u22F5\u0338",
      notinE: "\u22F9\u0338",
      notinva: "\u2209",
      notinvb: "\u22F7",
      notinvc: "\u22F6",
      NotLeftTriangle: "\u22EA",
      NotLeftTriangleBar: "\u29CF\u0338",
      NotLeftTriangleEqual: "\u22EC",
      NotLess: "\u226E",
      NotLessEqual: "\u2270",
      NotLessGreater: "\u2278",
      NotLessLess: "\u226A\u0338",
      NotLessSlantEqual: "\u2A7D\u0338",
      NotLessTilde: "\u2274",
      NotNestedGreaterGreater: "\u2AA2\u0338",
      NotNestedLessLess: "\u2AA1\u0338",
      notni: "\u220C",
      notniva: "\u220C",
      notnivb: "\u22FE",
      notnivc: "\u22FD",
      NotPrecedes: "\u2280",
      NotPrecedesEqual: "\u2AAF\u0338",
      NotPrecedesSlantEqual: "\u22E0",
      NotReverseElement: "\u220C",
      NotRightTriangle: "\u22EB",
      NotRightTriangleBar: "\u29D0\u0338",
      NotRightTriangleEqual: "\u22ED",
      NotSquareSubset: "\u228F\u0338",
      NotSquareSubsetEqual: "\u22E2",
      NotSquareSuperset: "\u2290\u0338",
      NotSquareSupersetEqual: "\u22E3",
      NotSubset: "\u2282\u20D2",
      NotSubsetEqual: "\u2288",
      NotSucceeds: "\u2281",
      NotSucceedsEqual: "\u2AB0\u0338",
      NotSucceedsSlantEqual: "\u22E1",
      NotSucceedsTilde: "\u227F\u0338",
      NotSuperset: "\u2283\u20D2",
      NotSupersetEqual: "\u2289",
      NotTilde: "\u2241",
      NotTildeEqual: "\u2244",
      NotTildeFullEqual: "\u2247",
      NotTildeTilde: "\u2249",
      NotVerticalBar: "\u2224",
      npar: "\u2226",
      nparallel: "\u2226",
      nparsl: "\u2AFD\u20E5",
      npart: "\u2202\u0338",
      npolint: "\u2A14",
      npr: "\u2280",
      nprcue: "\u22E0",
      npre: "\u2AAF\u0338",
      nprec: "\u2280",
      npreceq: "\u2AAF\u0338",
      nrArr: "\u21CF",
      nrarr: "\u219B",
      nrarrc: "\u2933\u0338",
      nrarrw: "\u219D\u0338",
      nRightarrow: "\u21CF",
      nrightarrow: "\u219B",
      nrtri: "\u22EB",
      nrtrie: "\u22ED",
      nsc: "\u2281",
      nsccue: "\u22E1",
      nsce: "\u2AB0\u0338",
      Nscr: "\u{1D4A9}",
      nscr: "\u{1D4C3}",
      nshortmid: "\u2224",
      nshortparallel: "\u2226",
      nsim: "\u2241",
      nsime: "\u2244",
      nsimeq: "\u2244",
      nsmid: "\u2224",
      nspar: "\u2226",
      nsqsube: "\u22E2",
      nsqsupe: "\u22E3",
      nsub: "\u2284",
      nsubE: "\u2AC5\u0338",
      nsube: "\u2288",
      nsubset: "\u2282\u20D2",
      nsubseteq: "\u2288",
      nsubseteqq: "\u2AC5\u0338",
      nsucc: "\u2281",
      nsucceq: "\u2AB0\u0338",
      nsup: "\u2285",
      nsupE: "\u2AC6\u0338",
      nsupe: "\u2289",
      nsupset: "\u2283\u20D2",
      nsupseteq: "\u2289",
      nsupseteqq: "\u2AC6\u0338",
      ntgl: "\u2279",
      Ntilde: "\xD1",
      ntilde: "\xF1",
      ntlg: "\u2278",
      ntriangleleft: "\u22EA",
      ntrianglelefteq: "\u22EC",
      ntriangleright: "\u22EB",
      ntrianglerighteq: "\u22ED",
      Nu: "\u039D",
      nu: "\u03BD",
      num: "#",
      numero: "\u2116",
      numsp: "\u2007",
      nvap: "\u224D\u20D2",
      nVDash: "\u22AF",
      nVdash: "\u22AE",
      nvDash: "\u22AD",
      nvdash: "\u22AC",
      nvge: "\u2265\u20D2",
      nvgt: ">\u20D2",
      nvHarr: "\u2904",
      nvinfin: "\u29DE",
      nvlArr: "\u2902",
      nvle: "\u2264\u20D2",
      nvlt: "<\u20D2",
      nvltrie: "\u22B4\u20D2",
      nvrArr: "\u2903",
      nvrtrie: "\u22B5\u20D2",
      nvsim: "\u223C\u20D2",
      nwarhk: "\u2923",
      nwArr: "\u21D6",
      nwarr: "\u2196",
      nwarrow: "\u2196",
      nwnear: "\u2927",
      Oacute: "\xD3",
      oacute: "\xF3",
      oast: "\u229B",
      ocir: "\u229A",
      Ocirc: "\xD4",
      ocirc: "\xF4",
      Ocy: "\u041E",
      ocy: "\u043E",
      odash: "\u229D",
      Odblac: "\u0150",
      odblac: "\u0151",
      odiv: "\u2A38",
      odot: "\u2299",
      odsold: "\u29BC",
      OElig: "\u0152",
      oelig: "\u0153",
      ofcir: "\u29BF",
      Ofr: "\u{1D512}",
      ofr: "\u{1D52C}",
      ogon: "\u02DB",
      Ograve: "\xD2",
      ograve: "\xF2",
      ogt: "\u29C1",
      ohbar: "\u29B5",
      ohm: "\u03A9",
      oint: "\u222E",
      olarr: "\u21BA",
      olcir: "\u29BE",
      olcross: "\u29BB",
      oline: "\u203E",
      olt: "\u29C0",
      Omacr: "\u014C",
      omacr: "\u014D",
      Omega: "\u03A9",
      omega: "\u03C9",
      Omicron: "\u039F",
      omicron: "\u03BF",
      omid: "\u29B6",
      ominus: "\u2296",
      Oopf: "\u{1D546}",
      oopf: "\u{1D560}",
      opar: "\u29B7",
      OpenCurlyDoubleQuote: "\u201C",
      OpenCurlyQuote: "\u2018",
      operp: "\u29B9",
      oplus: "\u2295",
      Or: "\u2A54",
      or: "\u2228",
      orarr: "\u21BB",
      ord: "\u2A5D",
      order: "\u2134",
      orderof: "\u2134",
      ordf: "\xAA",
      ordm: "\xBA",
      origof: "\u22B6",
      oror: "\u2A56",
      orslope: "\u2A57",
      orv: "\u2A5B",
      oS: "\u24C8",
      Oscr: "\u{1D4AA}",
      oscr: "\u2134",
      Oslash: "\xD8",
      oslash: "\xF8",
      osol: "\u2298",
      Otilde: "\xD5",
      otilde: "\xF5",
      Otimes: "\u2A37",
      otimes: "\u2297",
      otimesas: "\u2A36",
      Ouml: "\xD6",
      ouml: "\xF6",
      ovbar: "\u233D",
      OverBar: "\u203E",
      OverBrace: "\u23DE",
      OverBracket: "\u23B4",
      OverParenthesis: "\u23DC",
      par: "\u2225",
      para: "\xB6",
      parallel: "\u2225",
      parsim: "\u2AF3",
      parsl: "\u2AFD",
      part: "\u2202",
      PartialD: "\u2202",
      Pcy: "\u041F",
      pcy: "\u043F",
      percnt: "%",
      period: ".",
      permil: "\u2030",
      perp: "\u22A5",
      pertenk: "\u2031",
      Pfr: "\u{1D513}",
      pfr: "\u{1D52D}",
      Phi: "\u03A6",
      phi: "\u03C6",
      phiv: "\u03D5",
      phmmat: "\u2133",
      phone: "\u260E",
      Pi: "\u03A0",
      pi: "\u03C0",
      pitchfork: "\u22D4",
      piv: "\u03D6",
      planck: "\u210F",
      planckh: "\u210E",
      plankv: "\u210F",
      plus: "+",
      plusacir: "\u2A23",
      plusb: "\u229E",
      pluscir: "\u2A22",
      plusdo: "\u2214",
      plusdu: "\u2A25",
      pluse: "\u2A72",
      PlusMinus: "\xB1",
      plusmn: "\xB1",
      plussim: "\u2A26",
      plustwo: "\u2A27",
      pm: "\xB1",
      Poincareplane: "\u210C",
      pointint: "\u2A15",
      Popf: "\u2119",
      popf: "\u{1D561}",
      pound: "\xA3",
      Pr: "\u2ABB",
      pr: "\u227A",
      prap: "\u2AB7",
      prcue: "\u227C",
      prE: "\u2AB3",
      pre: "\u2AAF",
      prec: "\u227A",
      precapprox: "\u2AB7",
      preccurlyeq: "\u227C",
      Precedes: "\u227A",
      PrecedesEqual: "\u2AAF",
      PrecedesSlantEqual: "\u227C",
      PrecedesTilde: "\u227E",
      preceq: "\u2AAF",
      precnapprox: "\u2AB9",
      precneqq: "\u2AB5",
      precnsim: "\u22E8",
      precsim: "\u227E",
      Prime: "\u2033",
      prime: "\u2032",
      primes: "\u2119",
      prnap: "\u2AB9",
      prnE: "\u2AB5",
      prnsim: "\u22E8",
      prod: "\u220F",
      Product: "\u220F",
      profalar: "\u232E",
      profline: "\u2312",
      profsurf: "\u2313",
      prop: "\u221D",
      Proportion: "\u2237",
      Proportional: "\u221D",
      propto: "\u221D",
      prsim: "\u227E",
      prurel: "\u22B0",
      Pscr: "\u{1D4AB}",
      pscr: "\u{1D4C5}",
      Psi: "\u03A8",
      psi: "\u03C8",
      puncsp: "\u2008",
      Qfr: "\u{1D514}",
      qfr: "\u{1D52E}",
      qint: "\u2A0C",
      Qopf: "\u211A",
      qopf: "\u{1D562}",
      qprime: "\u2057",
      Qscr: "\u{1D4AC}",
      qscr: "\u{1D4C6}",
      quaternions: "\u210D",
      quatint: "\u2A16",
      quest: "?",
      questeq: "\u225F",
      QUOT: '"',
      quot: '"',
      rAarr: "\u21DB",
      race: "\u223D\u0331",
      Racute: "\u0154",
      racute: "\u0155",
      radic: "\u221A",
      raemptyv: "\u29B3",
      Rang: "\u27EB",
      rang: "\u27E9",
      rangd: "\u2992",
      range: "\u29A5",
      rangle: "\u27E9",
      raquo: "\xBB",
      Rarr: "\u21A0",
      rArr: "\u21D2",
      rarr: "\u2192",
      rarrap: "\u2975",
      rarrb: "\u21E5",
      rarrbfs: "\u2920",
      rarrc: "\u2933",
      rarrfs: "\u291E",
      rarrhk: "\u21AA",
      rarrlp: "\u21AC",
      rarrpl: "\u2945",
      rarrsim: "\u2974",
      Rarrtl: "\u2916",
      rarrtl: "\u21A3",
      rarrw: "\u219D",
      rAtail: "\u291C",
      ratail: "\u291A",
      ratio: "\u2236",
      rationals: "\u211A",
      RBarr: "\u2910",
      rBarr: "\u290F",
      rbarr: "\u290D",
      rbbrk: "\u2773",
      rbrace: "}",
      rbrack: "]",
      rbrke: "\u298C",
      rbrksld: "\u298E",
      rbrkslu: "\u2990",
      Rcaron: "\u0158",
      rcaron: "\u0159",
      Rcedil: "\u0156",
      rcedil: "\u0157",
      rceil: "\u2309",
      rcub: "}",
      Rcy: "\u0420",
      rcy: "\u0440",
      rdca: "\u2937",
      rdldhar: "\u2969",
      rdquo: "\u201D",
      rdquor: "\u201D",
      rdsh: "\u21B3",
      Re: "\u211C",
      real: "\u211C",
      realine: "\u211B",
      realpart: "\u211C",
      reals: "\u211D",
      rect: "\u25AD",
      REG: "\xAE",
      reg: "\xAE",
      ReverseElement: "\u220B",
      ReverseEquilibrium: "\u21CB",
      ReverseUpEquilibrium: "\u296F",
      rfisht: "\u297D",
      rfloor: "\u230B",
      Rfr: "\u211C",
      rfr: "\u{1D52F}",
      rHar: "\u2964",
      rhard: "\u21C1",
      rharu: "\u21C0",
      rharul: "\u296C",
      Rho: "\u03A1",
      rho: "\u03C1",
      rhov: "\u03F1",
      RightAngleBracket: "\u27E9",
      RightArrow: "\u2192",
      Rightarrow: "\u21D2",
      rightarrow: "\u2192",
      RightArrowBar: "\u21E5",
      RightArrowLeftArrow: "\u21C4",
      rightarrowtail: "\u21A3",
      RightCeiling: "\u2309",
      RightDoubleBracket: "\u27E7",
      RightDownTeeVector: "\u295D",
      RightDownVector: "\u21C2",
      RightDownVectorBar: "\u2955",
      RightFloor: "\u230B",
      rightharpoondown: "\u21C1",
      rightharpoonup: "\u21C0",
      rightleftarrows: "\u21C4",
      rightleftharpoons: "\u21CC",
      rightrightarrows: "\u21C9",
      rightsquigarrow: "\u219D",
      RightTee: "\u22A2",
      RightTeeArrow: "\u21A6",
      RightTeeVector: "\u295B",
      rightthreetimes: "\u22CC",
      RightTriangle: "\u22B3",
      RightTriangleBar: "\u29D0",
      RightTriangleEqual: "\u22B5",
      RightUpDownVector: "\u294F",
      RightUpTeeVector: "\u295C",
      RightUpVector: "\u21BE",
      RightUpVectorBar: "\u2954",
      RightVector: "\u21C0",
      RightVectorBar: "\u2953",
      ring: "\u02DA",
      risingdotseq: "\u2253",
      rlarr: "\u21C4",
      rlhar: "\u21CC",
      rlm: "\u200F",
      rmoust: "\u23B1",
      rmoustache: "\u23B1",
      rnmid: "\u2AEE",
      roang: "\u27ED",
      roarr: "\u21FE",
      robrk: "\u27E7",
      ropar: "\u2986",
      Ropf: "\u211D",
      ropf: "\u{1D563}",
      roplus: "\u2A2E",
      rotimes: "\u2A35",
      RoundImplies: "\u2970",
      rpar: ")",
      rpargt: "\u2994",
      rppolint: "\u2A12",
      rrarr: "\u21C9",
      Rrightarrow: "\u21DB",
      rsaquo: "\u203A",
      Rscr: "\u211B",
      rscr: "\u{1D4C7}",
      Rsh: "\u21B1",
      rsh: "\u21B1",
      rsqb: "]",
      rsquo: "\u2019",
      rsquor: "\u2019",
      rthree: "\u22CC",
      rtimes: "\u22CA",
      rtri: "\u25B9",
      rtrie: "\u22B5",
      rtrif: "\u25B8",
      rtriltri: "\u29CE",
      RuleDelayed: "\u29F4",
      ruluhar: "\u2968",
      rx: "\u211E",
      Sacute: "\u015A",
      sacute: "\u015B",
      sbquo: "\u201A",
      Sc: "\u2ABC",
      sc: "\u227B",
      scap: "\u2AB8",
      Scaron: "\u0160",
      scaron: "\u0161",
      sccue: "\u227D",
      scE: "\u2AB4",
      sce: "\u2AB0",
      Scedil: "\u015E",
      scedil: "\u015F",
      Scirc: "\u015C",
      scirc: "\u015D",
      scnap: "\u2ABA",
      scnE: "\u2AB6",
      scnsim: "\u22E9",
      scpolint: "\u2A13",
      scsim: "\u227F",
      Scy: "\u0421",
      scy: "\u0441",
      sdot: "\u22C5",
      sdotb: "\u22A1",
      sdote: "\u2A66",
      searhk: "\u2925",
      seArr: "\u21D8",
      searr: "\u2198",
      searrow: "\u2198",
      sect: "\xA7",
      semi: ";",
      seswar: "\u2929",
      setminus: "\u2216",
      setmn: "\u2216",
      sext: "\u2736",
      Sfr: "\u{1D516}",
      sfr: "\u{1D530}",
      sfrown: "\u2322",
      sharp: "\u266F",
      SHCHcy: "\u0429",
      shchcy: "\u0449",
      SHcy: "\u0428",
      shcy: "\u0448",
      ShortDownArrow: "\u2193",
      ShortLeftArrow: "\u2190",
      shortmid: "\u2223",
      shortparallel: "\u2225",
      ShortRightArrow: "\u2192",
      ShortUpArrow: "\u2191",
      shy: "\xAD",
      Sigma: "\u03A3",
      sigma: "\u03C3",
      sigmaf: "\u03C2",
      sigmav: "\u03C2",
      sim: "\u223C",
      simdot: "\u2A6A",
      sime: "\u2243",
      simeq: "\u2243",
      simg: "\u2A9E",
      simgE: "\u2AA0",
      siml: "\u2A9D",
      simlE: "\u2A9F",
      simne: "\u2246",
      simplus: "\u2A24",
      simrarr: "\u2972",
      slarr: "\u2190",
      SmallCircle: "\u2218",
      smallsetminus: "\u2216",
      smashp: "\u2A33",
      smeparsl: "\u29E4",
      smid: "\u2223",
      smile: "\u2323",
      smt: "\u2AAA",
      smte: "\u2AAC",
      smtes: "\u2AAC\uFE00",
      SOFTcy: "\u042C",
      softcy: "\u044C",
      sol: "/",
      solb: "\u29C4",
      solbar: "\u233F",
      Sopf: "\u{1D54A}",
      sopf: "\u{1D564}",
      spades: "\u2660",
      spadesuit: "\u2660",
      spar: "\u2225",
      sqcap: "\u2293",
      sqcaps: "\u2293\uFE00",
      sqcup: "\u2294",
      sqcups: "\u2294\uFE00",
      Sqrt: "\u221A",
      sqsub: "\u228F",
      sqsube: "\u2291",
      sqsubset: "\u228F",
      sqsubseteq: "\u2291",
      sqsup: "\u2290",
      sqsupe: "\u2292",
      sqsupset: "\u2290",
      sqsupseteq: "\u2292",
      squ: "\u25A1",
      Square: "\u25A1",
      square: "\u25A1",
      SquareIntersection: "\u2293",
      SquareSubset: "\u228F",
      SquareSubsetEqual: "\u2291",
      SquareSuperset: "\u2290",
      SquareSupersetEqual: "\u2292",
      SquareUnion: "\u2294",
      squarf: "\u25AA",
      squf: "\u25AA",
      srarr: "\u2192",
      Sscr: "\u{1D4AE}",
      sscr: "\u{1D4C8}",
      ssetmn: "\u2216",
      ssmile: "\u2323",
      sstarf: "\u22C6",
      Star: "\u22C6",
      star: "\u2606",
      starf: "\u2605",
      straightepsilon: "\u03F5",
      straightphi: "\u03D5",
      strns: "\xAF",
      Sub: "\u22D0",
      sub: "\u2282",
      subdot: "\u2ABD",
      subE: "\u2AC5",
      sube: "\u2286",
      subedot: "\u2AC3",
      submult: "\u2AC1",
      subnE: "\u2ACB",
      subne: "\u228A",
      subplus: "\u2ABF",
      subrarr: "\u2979",
      Subset: "\u22D0",
      subset: "\u2282",
      subseteq: "\u2286",
      subseteqq: "\u2AC5",
      SubsetEqual: "\u2286",
      subsetneq: "\u228A",
      subsetneqq: "\u2ACB",
      subsim: "\u2AC7",
      subsub: "\u2AD5",
      subsup: "\u2AD3",
      succ: "\u227B",
      succapprox: "\u2AB8",
      succcurlyeq: "\u227D",
      Succeeds: "\u227B",
      SucceedsEqual: "\u2AB0",
      SucceedsSlantEqual: "\u227D",
      SucceedsTilde: "\u227F",
      succeq: "\u2AB0",
      succnapprox: "\u2ABA",
      succneqq: "\u2AB6",
      succnsim: "\u22E9",
      succsim: "\u227F",
      SuchThat: "\u220B",
      Sum: "\u2211",
      sum: "\u2211",
      sung: "\u266A",
      Sup: "\u22D1",
      sup: "\u2283",
      sup1: "\xB9",
      sup2: "\xB2",
      sup3: "\xB3",
      supdot: "\u2ABE",
      supdsub: "\u2AD8",
      supE: "\u2AC6",
      supe: "\u2287",
      supedot: "\u2AC4",
      Superset: "\u2283",
      SupersetEqual: "\u2287",
      suphsol: "\u27C9",
      suphsub: "\u2AD7",
      suplarr: "\u297B",
      supmult: "\u2AC2",
      supnE: "\u2ACC",
      supne: "\u228B",
      supplus: "\u2AC0",
      Supset: "\u22D1",
      supset: "\u2283",
      supseteq: "\u2287",
      supseteqq: "\u2AC6",
      supsetneq: "\u228B",
      supsetneqq: "\u2ACC",
      supsim: "\u2AC8",
      supsub: "\u2AD4",
      supsup: "\u2AD6",
      swarhk: "\u2926",
      swArr: "\u21D9",
      swarr: "\u2199",
      swarrow: "\u2199",
      swnwar: "\u292A",
      szlig: "\xDF",
      Tab: "	",
      target: "\u2316",
      Tau: "\u03A4",
      tau: "\u03C4",
      tbrk: "\u23B4",
      Tcaron: "\u0164",
      tcaron: "\u0165",
      Tcedil: "\u0162",
      tcedil: "\u0163",
      Tcy: "\u0422",
      tcy: "\u0442",
      tdot: "\u20DB",
      telrec: "\u2315",
      Tfr: "\u{1D517}",
      tfr: "\u{1D531}",
      there4: "\u2234",
      Therefore: "\u2234",
      therefore: "\u2234",
      Theta: "\u0398",
      theta: "\u03B8",
      thetasym: "\u03D1",
      thetav: "\u03D1",
      thickapprox: "\u2248",
      thicksim: "\u223C",
      ThickSpace: "\u205F\u200A",
      thinsp: "\u2009",
      ThinSpace: "\u2009",
      thkap: "\u2248",
      thksim: "\u223C",
      THORN: "\xDE",
      thorn: "\xFE",
      Tilde: "\u223C",
      tilde: "\u02DC",
      TildeEqual: "\u2243",
      TildeFullEqual: "\u2245",
      TildeTilde: "\u2248",
      times: "\xD7",
      timesb: "\u22A0",
      timesbar: "\u2A31",
      timesd: "\u2A30",
      tint: "\u222D",
      toea: "\u2928",
      top: "\u22A4",
      topbot: "\u2336",
      topcir: "\u2AF1",
      Topf: "\u{1D54B}",
      topf: "\u{1D565}",
      topfork: "\u2ADA",
      tosa: "\u2929",
      tprime: "\u2034",
      TRADE: "\u2122",
      trade: "\u2122",
      triangle: "\u25B5",
      triangledown: "\u25BF",
      triangleleft: "\u25C3",
      trianglelefteq: "\u22B4",
      triangleq: "\u225C",
      triangleright: "\u25B9",
      trianglerighteq: "\u22B5",
      tridot: "\u25EC",
      trie: "\u225C",
      triminus: "\u2A3A",
      TripleDot: "\u20DB",
      triplus: "\u2A39",
      trisb: "\u29CD",
      tritime: "\u2A3B",
      trpezium: "\u23E2",
      Tscr: "\u{1D4AF}",
      tscr: "\u{1D4C9}",
      TScy: "\u0426",
      tscy: "\u0446",
      TSHcy: "\u040B",
      tshcy: "\u045B",
      Tstrok: "\u0166",
      tstrok: "\u0167",
      twixt: "\u226C",
      twoheadleftarrow: "\u219E",
      twoheadrightarrow: "\u21A0",
      Uacute: "\xDA",
      uacute: "\xFA",
      Uarr: "\u219F",
      uArr: "\u21D1",
      uarr: "\u2191",
      Uarrocir: "\u2949",
      Ubrcy: "\u040E",
      ubrcy: "\u045E",
      Ubreve: "\u016C",
      ubreve: "\u016D",
      Ucirc: "\xDB",
      ucirc: "\xFB",
      Ucy: "\u0423",
      ucy: "\u0443",
      udarr: "\u21C5",
      Udblac: "\u0170",
      udblac: "\u0171",
      udhar: "\u296E",
      ufisht: "\u297E",
      Ufr: "\u{1D518}",
      ufr: "\u{1D532}",
      Ugrave: "\xD9",
      ugrave: "\xF9",
      uHar: "\u2963",
      uharl: "\u21BF",
      uharr: "\u21BE",
      uhblk: "\u2580",
      ulcorn: "\u231C",
      ulcorner: "\u231C",
      ulcrop: "\u230F",
      ultri: "\u25F8",
      Umacr: "\u016A",
      umacr: "\u016B",
      uml: "\xA8",
      UnderBar: "_",
      UnderBrace: "\u23DF",
      UnderBracket: "\u23B5",
      UnderParenthesis: "\u23DD",
      Union: "\u22C3",
      UnionPlus: "\u228E",
      Uogon: "\u0172",
      uogon: "\u0173",
      Uopf: "\u{1D54C}",
      uopf: "\u{1D566}",
      UpArrow: "\u2191",
      Uparrow: "\u21D1",
      uparrow: "\u2191",
      UpArrowBar: "\u2912",
      UpArrowDownArrow: "\u21C5",
      UpDownArrow: "\u2195",
      Updownarrow: "\u21D5",
      updownarrow: "\u2195",
      UpEquilibrium: "\u296E",
      upharpoonleft: "\u21BF",
      upharpoonright: "\u21BE",
      uplus: "\u228E",
      UpperLeftArrow: "\u2196",
      UpperRightArrow: "\u2197",
      Upsi: "\u03D2",
      upsi: "\u03C5",
      upsih: "\u03D2",
      Upsilon: "\u03A5",
      upsilon: "\u03C5",
      UpTee: "\u22A5",
      UpTeeArrow: "\u21A5",
      upuparrows: "\u21C8",
      urcorn: "\u231D",
      urcorner: "\u231D",
      urcrop: "\u230E",
      Uring: "\u016E",
      uring: "\u016F",
      urtri: "\u25F9",
      Uscr: "\u{1D4B0}",
      uscr: "\u{1D4CA}",
      utdot: "\u22F0",
      Utilde: "\u0168",
      utilde: "\u0169",
      utri: "\u25B5",
      utrif: "\u25B4",
      uuarr: "\u21C8",
      Uuml: "\xDC",
      uuml: "\xFC",
      uwangle: "\u29A7",
      vangrt: "\u299C",
      varepsilon: "\u03F5",
      varkappa: "\u03F0",
      varnothing: "\u2205",
      varphi: "\u03D5",
      varpi: "\u03D6",
      varpropto: "\u221D",
      vArr: "\u21D5",
      varr: "\u2195",
      varrho: "\u03F1",
      varsigma: "\u03C2",
      varsubsetneq: "\u228A\uFE00",
      varsubsetneqq: "\u2ACB\uFE00",
      varsupsetneq: "\u228B\uFE00",
      varsupsetneqq: "\u2ACC\uFE00",
      vartheta: "\u03D1",
      vartriangleleft: "\u22B2",
      vartriangleright: "\u22B3",
      Vbar: "\u2AEB",
      vBar: "\u2AE8",
      vBarv: "\u2AE9",
      Vcy: "\u0412",
      vcy: "\u0432",
      VDash: "\u22AB",
      Vdash: "\u22A9",
      vDash: "\u22A8",
      vdash: "\u22A2",
      Vdashl: "\u2AE6",
      Vee: "\u22C1",
      vee: "\u2228",
      veebar: "\u22BB",
      veeeq: "\u225A",
      vellip: "\u22EE",
      Verbar: "\u2016",
      verbar: "|",
      Vert: "\u2016",
      vert: "|",
      VerticalBar: "\u2223",
      VerticalLine: "|",
      VerticalSeparator: "\u2758",
      VerticalTilde: "\u2240",
      VeryThinSpace: "\u200A",
      Vfr: "\u{1D519}",
      vfr: "\u{1D533}",
      vltri: "\u22B2",
      vnsub: "\u2282\u20D2",
      vnsup: "\u2283\u20D2",
      Vopf: "\u{1D54D}",
      vopf: "\u{1D567}",
      vprop: "\u221D",
      vrtri: "\u22B3",
      Vscr: "\u{1D4B1}",
      vscr: "\u{1D4CB}",
      vsubnE: "\u2ACB\uFE00",
      vsubne: "\u228A\uFE00",
      vsupnE: "\u2ACC\uFE00",
      vsupne: "\u228B\uFE00",
      Vvdash: "\u22AA",
      vzigzag: "\u299A",
      Wcirc: "\u0174",
      wcirc: "\u0175",
      wedbar: "\u2A5F",
      Wedge: "\u22C0",
      wedge: "\u2227",
      wedgeq: "\u2259",
      weierp: "\u2118",
      Wfr: "\u{1D51A}",
      wfr: "\u{1D534}",
      Wopf: "\u{1D54E}",
      wopf: "\u{1D568}",
      wp: "\u2118",
      wr: "\u2240",
      wreath: "\u2240",
      Wscr: "\u{1D4B2}",
      wscr: "\u{1D4CC}",
      xcap: "\u22C2",
      xcirc: "\u25EF",
      xcup: "\u22C3",
      xdtri: "\u25BD",
      Xfr: "\u{1D51B}",
      xfr: "\u{1D535}",
      xhArr: "\u27FA",
      xharr: "\u27F7",
      Xi: "\u039E",
      xi: "\u03BE",
      xlArr: "\u27F8",
      xlarr: "\u27F5",
      xmap: "\u27FC",
      xnis: "\u22FB",
      xodot: "\u2A00",
      Xopf: "\u{1D54F}",
      xopf: "\u{1D569}",
      xoplus: "\u2A01",
      xotime: "\u2A02",
      xrArr: "\u27F9",
      xrarr: "\u27F6",
      Xscr: "\u{1D4B3}",
      xscr: "\u{1D4CD}",
      xsqcup: "\u2A06",
      xuplus: "\u2A04",
      xutri: "\u25B3",
      xvee: "\u22C1",
      xwedge: "\u22C0",
      Yacute: "\xDD",
      yacute: "\xFD",
      YAcy: "\u042F",
      yacy: "\u044F",
      Ycirc: "\u0176",
      ycirc: "\u0177",
      Ycy: "\u042B",
      ycy: "\u044B",
      yen: "\xA5",
      Yfr: "\u{1D51C}",
      yfr: "\u{1D536}",
      YIcy: "\u0407",
      yicy: "\u0457",
      Yopf: "\u{1D550}",
      yopf: "\u{1D56A}",
      Yscr: "\u{1D4B4}",
      yscr: "\u{1D4CE}",
      YUcy: "\u042E",
      yucy: "\u044E",
      Yuml: "\u0178",
      yuml: "\xFF",
      Zacute: "\u0179",
      zacute: "\u017A",
      Zcaron: "\u017D",
      zcaron: "\u017E",
      Zcy: "\u0417",
      zcy: "\u0437",
      Zdot: "\u017B",
      zdot: "\u017C",
      zeetrf: "\u2128",
      ZeroWidthSpace: "\u200B",
      Zeta: "\u0396",
      zeta: "\u03B6",
      Zfr: "\u2128",
      zfr: "\u{1D537}",
      ZHcy: "\u0416",
      zhcy: "\u0436",
      zigrarr: "\u21DD",
      Zopf: "\u2124",
      zopf: "\u{1D56B}",
      Zscr: "\u{1D4B5}",
      zscr: "\u{1D4CF}",
      zwj: "\u200D",
      zwnj: "\u200C"
    });
    exports.entityMap = exports.HTML_ENTITIES;
  }
});

// node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/sax.js
var require_sax = __commonJS({
  "node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/sax.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    var g = require_grammar();
    var errors = require_errors2();
    var isHTMLEscapableRawTextElement = conventions.isHTMLEscapableRawTextElement;
    var isHTMLMimeType = conventions.isHTMLMimeType;
    var isHTMLRawTextElement = conventions.isHTMLRawTextElement;
    var hasOwn = conventions.hasOwn;
    var NAMESPACE = conventions.NAMESPACE;
    var ParseError = errors.ParseError;
    var DOMException = errors.DOMException;
    var S_TAG = 0;
    var S_ATTR = 1;
    var S_ATTR_SPACE = 2;
    var S_EQ = 3;
    var S_ATTR_NOQUOT_VALUE = 4;
    var S_ATTR_END = 5;
    var S_TAG_SPACE = 6;
    var S_TAG_CLOSE = 7;
    function XMLReader() {
    }
    XMLReader.prototype = {
      parse: function(source, defaultNSMap, entityMap) {
        var domBuilder = this.domBuilder;
        domBuilder.startDocument();
        _copy(defaultNSMap, defaultNSMap = /* @__PURE__ */ Object.create(null));
        parse(source, defaultNSMap, entityMap, domBuilder, this.errorHandler);
        domBuilder.endDocument();
      }
    };
    var ENTITY_REG = /&#?\w+;?/g;
    function parse(source, defaultNSMapCopy, entityMap, domBuilder, errorHandler) {
      var isHTML = isHTMLMimeType(domBuilder.mimeType);
      if (source.indexOf(g.UNICODE_REPLACEMENT_CHARACTER) >= 0) {
        errorHandler.warning("Unicode replacement character detected, source encoding issues?");
      }
      function fixedFromCharCode(code) {
        if (code > 65535) {
          code -= 65536;
          var surrogate1 = 55296 + (code >> 10), surrogate2 = 56320 + (code & 1023);
          return String.fromCharCode(surrogate1, surrogate2);
        } else {
          return String.fromCharCode(code);
        }
      }
      function entityReplacer(a2) {
        var complete = a2[a2.length - 1] === ";" ? a2 : a2 + ";";
        if (!isHTML && complete !== a2) {
          errorHandler.error("EntityRef: expecting ;");
          return a2;
        }
        var match = g.Reference.exec(complete);
        if (!match || match[0].length !== complete.length) {
          errorHandler.error("entity not matching Reference production: " + a2);
          return a2;
        }
        var k = complete.slice(1, -1);
        if (hasOwn(entityMap, k)) {
          return entityMap[k];
        } else if (k.charAt(0) === "#") {
          return fixedFromCharCode(parseInt(k.substring(1).replace("x", "0x")));
        } else {
          errorHandler.error("entity not found:" + a2);
          return a2;
        }
      }
      function appendText(end2) {
        if (end2 > start) {
          var xt = source.substring(start, end2).replace(ENTITY_REG, entityReplacer);
          locator && position(start);
          domBuilder.characters(xt, 0, end2 - start);
          start = end2;
        }
      }
      var lineStart = 0;
      var lineEnd = 0;
      var linePattern = /\r\n?|\n|$/g;
      var locator = domBuilder.locator;
      function position(p, m) {
        while (p >= lineEnd && (m = linePattern.exec(source))) {
          lineStart = lineEnd;
          lineEnd = m.index + m[0].length;
          locator.lineNumber++;
        }
        locator.columnNumber = p - lineStart + 1;
      }
      var parseStack = [{ currentNSMap: defaultNSMapCopy }];
      var unclosedTags = [];
      var start = 0;
      while (true) {
        try {
          var tagStart = source.indexOf("<", start);
          if (tagStart < 0) {
            if (!isHTML && unclosedTags.length > 0) {
              return errorHandler.fatalError("unclosed xml tag(s): " + unclosedTags.join(", "));
            }
            if (!source.substring(start).match(/^\s*$/)) {
              var doc = domBuilder.doc;
              var text = doc.createTextNode(source.substring(start));
              if (doc.documentElement) {
                return errorHandler.error("Extra content at the end of the document");
              }
              doc.appendChild(text);
              domBuilder.currentElement = text;
            }
            return;
          }
          if (tagStart > start) {
            var fromSource = source.substring(start, tagStart);
            if (!isHTML && unclosedTags.length === 0) {
              fromSource = fromSource.replace(new RegExp(g.S_OPT.source, "g"), "");
              fromSource && errorHandler.error("Unexpected content outside root element: '" + fromSource + "'");
            }
            appendText(tagStart);
          }
          switch (source.charAt(tagStart + 1)) {
            case "/":
              var end = source.indexOf(">", tagStart + 2);
              var tagNameRaw = source.substring(tagStart + 2, end > 0 ? end : void 0);
              if (!tagNameRaw) {
                return errorHandler.fatalError("end tag name missing");
              }
              var endTagNameStrict = g.reg("^", g.QName_group, g.S_OPT, "$");
              var tagNameMatch = end > 0 && endTagNameStrict.exec(tagNameRaw);
              if (!tagNameMatch) {
                var leadingTagNameMatch = end > 0 && g.reg("^", g.QName_group).exec(tagNameRaw);
                if (isHTML && leadingTagNameMatch) {
                  errorHandler.warning('end tag name contains invalid trailing characters: "' + tagNameRaw + '"');
                  tagNameMatch = leadingTagNameMatch;
                } else if (
                  // Backward compatibility, remove this whole `else if` arm in the next breaking release
                  // (XML then falls through to the `fatalError` below, for a clean mode split: XML fatal,
                  // HTML warning). A valid end-tag name followed by a line break and trailing content was
                  // silently accepted while `reg` still used the `m` flag; re-adding `m` here matches exactly
                  // those inputs, kept recoverable and reported.
                  leadingTagNameMatch && new RegExp(endTagNameStrict.source, endTagNameStrict.flags + "m").test(tagNameRaw)
                ) {
                  errorHandler.error('end tag name is followed by a line break and trailing content: "' + tagNameRaw + '"');
                  tagNameMatch = leadingTagNameMatch;
                } else {
                  return errorHandler.fatalError('end tag name contains invalid characters: "' + tagNameRaw + '"');
                }
              }
              if (!domBuilder.currentElement && !domBuilder.doc.documentElement) {
                return;
              }
              var currentTagName = unclosedTags[unclosedTags.length - 1] || domBuilder.currentElement.tagName || domBuilder.doc.documentElement.tagName || "";
              if (currentTagName !== tagNameMatch[1]) {
                var tagNameLower = tagNameMatch[1].toLowerCase();
                if (!isHTML || currentTagName.toLowerCase() !== tagNameLower) {
                  return errorHandler.fatalError('Opening and ending tag mismatch: "' + currentTagName + '" != "' + tagNameRaw + '"');
                }
              }
              var config = parseStack.pop();
              unclosedTags.pop();
              var localNSMap = config.localNSMap;
              domBuilder.endElement(config.uri, config.localName, currentTagName);
              if (localNSMap) {
                for (var prefix in localNSMap) {
                  if (hasOwn(localNSMap, prefix)) {
                    domBuilder.endPrefixMapping(prefix);
                  }
                }
              }
              end++;
              break;
            // end element
            case "?":
              locator && position(tagStart);
              end = parseProcessingInstruction(source, tagStart, domBuilder, errorHandler);
              break;
            case "!":
              locator && position(tagStart);
              end = parseDoctypeCommentOrCData(source, tagStart, domBuilder, errorHandler, isHTML);
              break;
            default:
              locator && position(tagStart);
              var el = new ElementAttributes();
              var currentNSMap = parseStack[parseStack.length - 1].currentNSMap;
              var end = parseElementStartPart(source, tagStart, el, currentNSMap, entityReplacer, errorHandler, isHTML);
              var len = el.length;
              if (!el.closed) {
                if (isHTML && conventions.isHTMLVoidElement(el.tagName)) {
                  el.closed = true;
                } else {
                  unclosedTags.push(el.tagName);
                }
              }
              if (locator && len) {
                var locator2 = copyLocator(locator, {});
                for (var i = 0; i < len; i++) {
                  var a = el[i];
                  position(a.offset);
                  a.locator = copyLocator(locator, {});
                }
                domBuilder.locator = locator2;
                if (appendElement(el, domBuilder, currentNSMap)) {
                  parseStack.push(el);
                }
                domBuilder.locator = locator;
              } else {
                if (appendElement(el, domBuilder, currentNSMap)) {
                  parseStack.push(el);
                }
              }
              if (isHTML && !el.closed) {
                end = parseHtmlSpecialContent(source, end, el.tagName, entityReplacer, domBuilder);
              } else {
                end++;
              }
          }
        } catch (e) {
          if (e instanceof ParseError) {
            throw e;
          } else if (e instanceof DOMException) {
            return errorHandler.fatalError("Error constructing the DOM: " + e.name + ": " + e.message, e);
          }
          errorHandler.error("element parse error: " + e);
          end = -1;
        }
        if (end > start) {
          start = end;
        } else {
          appendText(Math.max(tagStart, start) + 1);
        }
      }
    }
    function copyLocator(f, t) {
      t.lineNumber = f.lineNumber;
      t.columnNumber = f.columnNumber;
      return t;
    }
    function parseElementStartPart(source, start, el, currentNSMap, entityReplacer, errorHandler, isHTML) {
      function addAttribute(qname, value2, startIndex) {
        if (hasOwn(el.attributeNames, qname)) {
          return errorHandler.fatalError("Attribute " + qname + " redefined");
        }
        if (!isHTML && value2.indexOf("<") >= 0) {
          return errorHandler.fatalError("Unescaped '<' not allowed in attributes values");
        }
        el.addValue(
          qname,
          // @see https://www.w3.org/TR/xml/#AVNormalize
          // since the xmldom sax parser does not "interpret" DTD the following is not implemented:
          // - recursive replacement of (DTD) entity references
          // - trimming and collapsing multiple spaces into a single one for attributes that are not of type CDATA
          value2.replace(/[\t\n\r]/g, " ").replace(ENTITY_REG, entityReplacer),
          startIndex
        );
      }
      var attrName;
      var value;
      var p = ++start;
      var s = S_TAG;
      while (true) {
        var c = source.charAt(p);
        if (s === S_TAG && c === "<") {
          throw new Error("unexpected < in tag name: " + source.slice(start, p));
        }
        switch (c) {
          case "=":
            if (s === S_ATTR) {
              attrName = source.slice(start, p);
              s = S_EQ;
            } else if (s === S_ATTR_SPACE) {
              s = S_EQ;
            } else {
              throw new Error("attribute equal must after attrName");
            }
            break;
          case "'":
          case '"':
            if (s === S_EQ || s === S_ATTR) {
              if (s === S_ATTR) {
                errorHandler.warning('attribute value must after "="');
                attrName = source.slice(start, p);
              }
              start = p + 1;
              p = source.indexOf(c, start);
              if (p > 0) {
                value = source.slice(start, p);
                addAttribute(attrName, value, start - 1);
                s = S_ATTR_END;
              } else {
                throw new Error("attribute value no end '" + c + "' match");
              }
            } else if (s == S_ATTR_NOQUOT_VALUE) {
              value = source.slice(start, p);
              addAttribute(attrName, value, start);
              errorHandler.warning('attribute "' + attrName + '" missed start quot(' + c + ")!!");
              start = p + 1;
              s = S_ATTR_END;
            } else {
              throw new Error('attribute value must after "="');
            }
            break;
          case "/":
            switch (s) {
              case S_TAG:
                el.setTagName(source.slice(start, p));
              case S_ATTR_END:
              case S_TAG_SPACE:
              case S_TAG_CLOSE:
                s = S_TAG_CLOSE;
                el.closed = true;
              case S_ATTR_NOQUOT_VALUE:
              case S_ATTR:
                break;
              case S_ATTR_SPACE:
                el.closed = true;
                break;
              //case S_EQ:
              default:
                throw new Error("attribute invalid close char('/')");
            }
            break;
          case "":
            errorHandler.error("unexpected end of input");
            if (s == S_TAG) {
              el.setTagName(source.slice(start, p));
            }
            return p;
          case ">":
            switch (s) {
              case S_TAG:
                el.setTagName(source.slice(start, p));
              case S_ATTR_END:
              case S_TAG_SPACE:
              case S_TAG_CLOSE:
                break;
              //normal
              case S_ATTR_NOQUOT_VALUE:
              //Compatible state
              case S_ATTR:
                value = source.slice(start, p);
                if (value.slice(-1) === "/") {
                  el.closed = true;
                  value = value.slice(0, -1);
                }
              case S_ATTR_SPACE:
                if (s === S_ATTR_SPACE) {
                  value = attrName;
                }
                if (s == S_ATTR_NOQUOT_VALUE) {
                  errorHandler.warning('attribute "' + value + '" missed quot(")!');
                  addAttribute(attrName, value, start);
                } else {
                  if (!isHTML) {
                    errorHandler.warning('attribute "' + value + '" missed value!! "' + value + '" instead!!');
                  }
                  addAttribute(value, value, start);
                }
                break;
              case S_EQ:
                if (!isHTML) {
                  return errorHandler.fatalError(`AttValue: ' or " expected`);
                }
            }
            return p;
          /*xml space '\x20' | #x9 | #xD | #xA; */
          case "\x80":
            c = " ";
          default:
            if (c <= " ") {
              switch (s) {
                case S_TAG:
                  el.setTagName(source.slice(start, p));
                  s = S_TAG_SPACE;
                  break;
                case S_ATTR:
                  attrName = source.slice(start, p);
                  s = S_ATTR_SPACE;
                  break;
                case S_ATTR_NOQUOT_VALUE:
                  var value = source.slice(start, p);
                  errorHandler.warning('attribute "' + value + '" missed quot(")!!');
                  addAttribute(attrName, value, start);
                case S_ATTR_END:
                  s = S_TAG_SPACE;
                  break;
              }
            } else {
              switch (s) {
                //case S_TAG:void();break;
                //case S_ATTR:void();break;
                //case S_ATTR_NOQUOT_VALUE:void();break;
                case S_ATTR_SPACE:
                  if (!isHTML) {
                    errorHandler.warning('attribute "' + attrName + '" missed value!! "' + attrName + '" instead2!!');
                  }
                  addAttribute(attrName, attrName, start);
                  start = p;
                  s = S_ATTR;
                  break;
                case S_ATTR_END:
                  errorHandler.warning('attribute space is required"' + attrName + '"!!');
                case S_TAG_SPACE:
                  s = S_ATTR;
                  start = p;
                  break;
                case S_EQ:
                  s = S_ATTR_NOQUOT_VALUE;
                  start = p;
                  break;
                case S_TAG_CLOSE:
                  throw new Error("elements closed character '/' and '>' must be connected to");
              }
            }
        }
        p++;
      }
    }
    function appendElement(el, domBuilder, currentNSMap) {
      var tagName = el.tagName;
      var localNSMap = null;
      var i = el.length;
      while (i--) {
        var a = el[i];
        var qName = a.qName;
        var value = a.value;
        var nsp = qName.indexOf(":");
        if (nsp > 0) {
          var prefix = a.prefix = qName.slice(0, nsp);
          var localName = qName.slice(nsp + 1);
          var nsPrefix = prefix === "xmlns" && localName;
        } else {
          localName = qName;
          prefix = null;
          nsPrefix = qName === "xmlns" && "";
        }
        a.localName = localName;
        if (nsPrefix !== false) {
          if (localNSMap == null) {
            localNSMap = /* @__PURE__ */ Object.create(null);
            currentNSMap = Object.create(currentNSMap);
          }
          currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
          a.uri = NAMESPACE.XMLNS;
          domBuilder.startPrefixMapping(nsPrefix, value);
        }
      }
      var i = el.length;
      while (i--) {
        a = el[i];
        if (a.prefix) {
          if (a.prefix === "xml") {
            a.uri = NAMESPACE.XML;
          }
          if (a.prefix !== "xmlns") {
            a.uri = currentNSMap[a.prefix];
          }
        }
      }
      var nsp = tagName.indexOf(":");
      if (nsp > 0) {
        prefix = el.prefix = tagName.slice(0, nsp);
        localName = el.localName = tagName.slice(nsp + 1);
      } else {
        prefix = null;
        localName = el.localName = tagName;
      }
      var ns = el.uri = currentNSMap[prefix || ""];
      domBuilder.startElement(ns, localName, tagName, el);
      if (el.closed) {
        domBuilder.endElement(ns, localName, tagName);
        if (localNSMap) {
          for (prefix in localNSMap) {
            if (hasOwn(localNSMap, prefix)) {
              domBuilder.endPrefixMapping(prefix);
            }
          }
        }
      } else {
        el.currentNSMap = currentNSMap;
        el.localNSMap = localNSMap;
        return true;
      }
    }
    function parseHtmlSpecialContent(source, elStartEnd, tagName, entityReplacer, domBuilder) {
      var isEscapableRaw = isHTMLEscapableRawTextElement(tagName);
      if (isEscapableRaw || isHTMLRawTextElement(tagName)) {
        var closeTag = new RegExp("</" + tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ">", "ig");
        closeTag.lastIndex = elStartEnd;
        var match = closeTag.exec(source);
        var elEndStart = match ? match.index : -1;
        if (elEndStart < 0) {
          return elStartEnd + 1;
        }
        var text = source.substring(elStartEnd + 1, elEndStart);
        if (isEscapableRaw) {
          text = text.replace(ENTITY_REG, entityReplacer);
        }
        domBuilder.characters(text, 0, text.length);
        return elEndStart;
      }
      return elStartEnd + 1;
    }
    function _copy(source, target) {
      for (var n in source) {
        if (hasOwn(source, n)) {
          target[n] = source[n];
        }
      }
    }
    function parseUtils(source, start) {
      var index = start;
      function char(n) {
        n = n || 0;
        return source.charAt(index + n);
      }
      function skip(n) {
        n = n || 1;
        index += n;
      }
      function skipBlanks() {
        var blanks = 0;
        while (index < source.length) {
          var c = char();
          if (c !== " " && c !== "\n" && c !== "	" && c !== "\r") {
            return blanks;
          }
          blanks++;
          skip();
        }
        return -1;
      }
      function substringFromIndex() {
        return source.substring(index);
      }
      function substringStartsWith(text) {
        return source.substring(index, index + text.length) === text;
      }
      function substringStartsWithCaseInsensitive(text) {
        return source.substring(index, index + text.length).toUpperCase() === text.toUpperCase();
      }
      function getMatch(args) {
        var expr = g.reg("^", args);
        var match = expr.exec(substringFromIndex());
        if (match) {
          skip(match[0].length);
          return match[0];
        }
        return null;
      }
      return {
        char,
        getIndex: function() {
          return index;
        },
        getMatch,
        getSource: function() {
          return source;
        },
        skip,
        skipBlanks,
        substringFromIndex,
        substringStartsWith,
        substringStartsWithCaseInsensitive
      };
    }
    function parseDoctypeInternalSubset(p, errorHandler) {
      function parsePI(p2, errorHandler2) {
        var match = g.PI.exec(p2.substringFromIndex());
        if (!match) {
          return errorHandler2.fatalError("processing instruction is not well-formed at position " + p2.getIndex());
        }
        if (match[1].toLowerCase() === "xml") {
          return errorHandler2.fatalError(
            "xml declaration is only allowed at the start of the document, but found at position " + p2.getIndex()
          );
        }
        p2.skip(match[0].length);
        return match[0];
      }
      var source = p.getSource();
      if (p.char() === "[") {
        p.skip(1);
        var intSubsetStart = p.getIndex();
        while (p.getIndex() < source.length) {
          p.skipBlanks();
          if (p.char() === "]") {
            var internalSubset = source.substring(intSubsetStart, p.getIndex());
            p.skip(1);
            return internalSubset;
          }
          var current = null;
          if (p.char() === "<" && p.char(1) === "!") {
            switch (p.char(2)) {
              case "E":
                if (p.char(3) === "L") {
                  current = p.getMatch(g.elementdecl);
                } else if (p.char(3) === "N") {
                  current = p.getMatch(g.EntityDecl);
                }
                break;
              case "A":
                current = p.getMatch(g.AttlistDecl);
                break;
              case "N":
                current = p.getMatch(g.NotationDecl);
                break;
              case "-":
                current = p.getMatch(g.Comment);
                break;
            }
          } else if (p.char() === "<" && p.char(1) === "?") {
            current = parsePI(p, errorHandler);
          } else if (p.char() === "%") {
            current = p.getMatch(g.PEReference);
          } else {
            return errorHandler.fatalError("Error detected in Markup declaration");
          }
          if (!current) {
            return errorHandler.fatalError("Error in internal subset at position " + p.getIndex());
          }
        }
        return errorHandler.fatalError("doctype internal subset is not well-formed, missing ]");
      }
    }
    function parseDoctypeCommentOrCData(source, start, domBuilder, errorHandler, isHTML) {
      var p = parseUtils(source, start);
      switch (isHTML ? p.char(2).toUpperCase() : p.char(2)) {
        case "-":
          var comment = p.getMatch(g.Comment);
          if (comment) {
            domBuilder.comment(comment, g.COMMENT_START.length, comment.length - g.COMMENT_START.length - g.COMMENT_END.length);
            return p.getIndex();
          } else {
            return errorHandler.fatalError("comment is not well-formed at position " + p.getIndex());
          }
        case "[":
          var cdata = p.getMatch(g.CDSect);
          if (cdata) {
            if (!isHTML && !domBuilder.currentElement) {
              return errorHandler.fatalError("CDATA outside of element");
            }
            domBuilder.startCDATA();
            domBuilder.characters(cdata, g.CDATA_START.length, cdata.length - g.CDATA_START.length - g.CDATA_END.length);
            domBuilder.endCDATA();
            return p.getIndex();
          } else {
            return errorHandler.fatalError("Invalid CDATA starting at position " + start);
          }
        case "D": {
          if (domBuilder.doc && domBuilder.doc.documentElement) {
            return errorHandler.fatalError("Doctype not allowed inside or after documentElement at position " + p.getIndex());
          }
          if (isHTML ? !p.substringStartsWithCaseInsensitive(g.DOCTYPE_DECL_START) : !p.substringStartsWith(g.DOCTYPE_DECL_START)) {
            return errorHandler.fatalError("Expected " + g.DOCTYPE_DECL_START + " at position " + p.getIndex());
          }
          p.skip(g.DOCTYPE_DECL_START.length);
          if (p.skipBlanks() < 1) {
            return errorHandler.fatalError("Expected whitespace after " + g.DOCTYPE_DECL_START + " at position " + p.getIndex());
          }
          var doctype = {
            name: void 0,
            publicId: void 0,
            systemId: void 0,
            internalSubset: void 0
          };
          doctype.name = p.getMatch(g.Name);
          if (!doctype.name)
            return errorHandler.fatalError("doctype name missing or contains unexpected characters at position " + p.getIndex());
          if (isHTML && doctype.name.toLowerCase() !== "html") {
            errorHandler.warning("Unexpected DOCTYPE in HTML document at position " + p.getIndex());
          }
          p.skipBlanks();
          if (p.substringStartsWith(g.PUBLIC) || p.substringStartsWith(g.SYSTEM)) {
            var match = g.ExternalID_match.exec(p.substringFromIndex());
            if (!match) {
              return errorHandler.fatalError("doctype external id is not well-formed at position " + p.getIndex());
            }
            if (match.groups.SystemLiteralOnly !== void 0) {
              doctype.systemId = match.groups.SystemLiteralOnly;
            } else {
              doctype.systemId = match.groups.SystemLiteral;
              doctype.publicId = match.groups.PubidLiteral;
            }
            p.skip(match[0].length);
          } else if (isHTML && p.substringStartsWithCaseInsensitive(g.SYSTEM)) {
            p.skip(g.SYSTEM.length);
            if (p.skipBlanks() < 1) {
              return errorHandler.fatalError("Expected whitespace after " + g.SYSTEM + " at position " + p.getIndex());
            }
            doctype.systemId = p.getMatch(g.ABOUT_LEGACY_COMPAT_SystemLiteral);
            if (!doctype.systemId) {
              return errorHandler.fatalError(
                "Expected " + g.ABOUT_LEGACY_COMPAT + " in single or double quotes after " + g.SYSTEM + " at position " + p.getIndex()
              );
            }
          }
          if (isHTML && doctype.systemId && !g.ABOUT_LEGACY_COMPAT_SystemLiteral.test(doctype.systemId)) {
            errorHandler.warning("Unexpected doctype.systemId in HTML document at position " + p.getIndex());
          }
          if (!isHTML) {
            p.skipBlanks();
            doctype.internalSubset = parseDoctypeInternalSubset(p, errorHandler);
          }
          p.skipBlanks();
          if (p.char() !== ">") {
            return errorHandler.fatalError("doctype not terminated with > at position " + p.getIndex());
          }
          p.skip(1);
          domBuilder.startDTD(doctype.name, doctype.publicId, doctype.systemId, doctype.internalSubset);
          domBuilder.endDTD();
          return p.getIndex();
        }
        default:
          return errorHandler.fatalError('Not well-formed XML starting with "<!" at position ' + start);
      }
    }
    function parseProcessingInstruction(source, start, domBuilder, errorHandler) {
      var match = source.substring(start).match(g.PI);
      if (!match) {
        return errorHandler.fatalError("Invalid processing instruction starting at position " + start);
      }
      if (match[1].toLowerCase() === "xml") {
        if (start > 0) {
          return errorHandler.fatalError(
            "processing instruction at position " + start + " is an xml declaration which is only at the start of the document"
          );
        }
        if (!g.XMLDecl.test(source.substring(start))) {
          return errorHandler.fatalError("xml declaration is not well-formed");
        }
      }
      domBuilder.processingInstruction(match[1], match[2]);
      return start + match[0].length;
    }
    function ElementAttributes() {
      this.attributeNames = /* @__PURE__ */ Object.create(null);
    }
    ElementAttributes.prototype = {
      setTagName: function(tagName) {
        if (!g.QName_exact.test(tagName)) {
          throw new Error("invalid tagName:" + tagName);
        }
        this.tagName = tagName;
      },
      addValue: function(qName, value, offset) {
        if (!g.QName_exact.test(qName)) {
          throw new Error("invalid attribute:" + qName);
        }
        this.attributeNames[qName] = this.length;
        this[this.length++] = { qName, value, offset };
      },
      length: 0,
      getLocalName: function(i) {
        return this[i].localName;
      },
      getLocator: function(i) {
        return this[i].locator;
      },
      getQName: function(i) {
        return this[i].qName;
      },
      getURI: function(i) {
        return this[i].uri;
      },
      getValue: function(i) {
        return this[i].value;
      }
      //	,getIndex:function(uri, localName)){
      //		if(localName){
      //
      //		}else{
      //			var qName = uri
      //		}
      //	},
      //	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
      //	getType:function(uri,localName){}
      //	getType:function(i){},
    };
    exports.XMLReader = XMLReader;
    exports.parseUtils = parseUtils;
    exports.parseDoctypeCommentOrCData = parseDoctypeCommentOrCData;
  }
});

// node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/dom-parser.js
var require_dom_parser = __commonJS({
  "node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/dom-parser.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    var dom = require_dom();
    var errors = require_errors2();
    var entities = require_entities();
    var sax = require_sax();
    var DOMImplementation = dom.DOMImplementation;
    var hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
    var isHTMLMimeType = conventions.isHTMLMimeType;
    var isValidMimeType = conventions.isValidMimeType;
    var MIME_TYPE = conventions.MIME_TYPE;
    var NAMESPACE = conventions.NAMESPACE;
    var ParseError = errors.ParseError;
    var XMLReader = sax.XMLReader;
    function normalizeLineEndings(input) {
      return input.replace(/\r[\n\u0085]/g, "\n").replace(/[\r\u0085\u2028\u2029]/g, "\n");
    }
    function DOMParser3(options) {
      options = options || {};
      if (options.locator === void 0) {
        options.locator = true;
      }
      this.assign = options.assign || conventions.assign;
      this.domHandler = options.domHandler || DOMHandler;
      this.onError = options.onError || options.errorHandler;
      if (options.errorHandler && typeof options.errorHandler !== "function") {
        throw new TypeError("errorHandler object is no longer supported, switch to onError!");
      } else if (options.errorHandler) {
        options.errorHandler("warning", "The `errorHandler` option has been deprecated, use `onError` instead!", this);
      }
      this.normalizeLineEndings = options.normalizeLineEndings || normalizeLineEndings;
      this.locator = !!options.locator;
      this.xmlns = this.assign(/* @__PURE__ */ Object.create(null), options.xmlns);
    }
    DOMParser3.prototype.parseFromString = function(source, mimeType) {
      if (!isValidMimeType(mimeType)) {
        throw new TypeError('DOMParser.parseFromString: the provided mimeType "' + mimeType + '" is not valid.');
      }
      var defaultNSMap = this.assign(/* @__PURE__ */ Object.create(null), this.xmlns);
      var entityMap = entities.XML_ENTITIES;
      var defaultNamespace = defaultNSMap[""] || null;
      if (hasDefaultHTMLNamespace(mimeType)) {
        entityMap = entities.HTML_ENTITIES;
        defaultNamespace = NAMESPACE.HTML;
      } else if (mimeType === MIME_TYPE.XML_SVG_IMAGE) {
        defaultNamespace = NAMESPACE.SVG;
      }
      defaultNSMap[""] = defaultNamespace;
      defaultNSMap.xml = defaultNSMap.xml || NAMESPACE.XML;
      var domBuilder = new this.domHandler({
        mimeType,
        defaultNamespace,
        onError: this.onError
      });
      var locator = this.locator ? {} : void 0;
      if (this.locator) {
        domBuilder.setDocumentLocator(locator);
      }
      var sax2 = new XMLReader();
      sax2.errorHandler = domBuilder;
      sax2.domBuilder = domBuilder;
      var isXml = !conventions.isHTMLMimeType(mimeType);
      if (isXml && typeof source !== "string") {
        sax2.errorHandler.fatalError("source is not a string");
      }
      sax2.parse(this.normalizeLineEndings(String(source)), defaultNSMap, entityMap);
      if (!domBuilder.doc.documentElement) {
        sax2.errorHandler.fatalError("missing root element");
      }
      return domBuilder.doc;
    };
    function DOMHandler(options) {
      var opt = options || {};
      this.mimeType = opt.mimeType || MIME_TYPE.XML_APPLICATION;
      this.defaultNamespace = opt.defaultNamespace || null;
      this.cdata = false;
      this.currentElement = void 0;
      this.doc = void 0;
      this.locator = void 0;
      this.onError = opt.onError;
    }
    function position(locator, node) {
      node.lineNumber = locator.lineNumber;
      node.columnNumber = locator.columnNumber;
    }
    DOMHandler.prototype = {
      /**
       * Either creates an XML or an HTML document and stores it under `this.doc`.
       * If it is an XML document, `this.defaultNamespace` is used to create it,
       * and it will not contain any `childNodes`.
       * If it is an HTML document, it will be created without any `childNodes`.
       *
       * @see http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
       */
      startDocument: function() {
        var impl = new DOMImplementation();
        this.doc = isHTMLMimeType(this.mimeType) ? impl.createHTMLDocument(false) : impl.createDocument(this.defaultNamespace, "");
      },
      startElement: function(namespaceURI, localName, qName, attrs) {
        var doc = this.doc;
        var el = doc.createElementNS(namespaceURI, qName || localName);
        var len = attrs.length;
        appendElement(this, el);
        this.currentElement = el;
        this.locator && position(this.locator, el);
        for (var i = 0; i < len; i++) {
          var namespaceURI = attrs.getURI(i);
          var value = attrs.getValue(i);
          var qName = attrs.getQName(i);
          var attr = doc.createAttributeNS(namespaceURI, qName);
          this.locator && position(attrs.getLocator(i), attr);
          attr.value = attr.nodeValue = value;
          el.setAttributeNode(attr);
        }
      },
      endElement: function(namespaceURI, localName, qName) {
        this.currentElement = this.currentElement.parentNode;
      },
      startPrefixMapping: function(prefix, uri) {
      },
      endPrefixMapping: function(prefix) {
      },
      processingInstruction: function(target, data) {
        var ins = this.doc.createProcessingInstruction(target, data);
        this.locator && position(this.locator, ins);
        appendElement(this, ins);
      },
      ignorableWhitespace: function(ch, start, length) {
      },
      characters: function(chars, start, length) {
        chars = _toString.apply(this, arguments);
        if (chars) {
          if (this.cdata) {
            var charNode = this.doc.createCDATASection(chars);
          } else {
            var charNode = this.doc.createTextNode(chars);
          }
          if (this.currentElement) {
            this.currentElement.appendChild(charNode);
          } else if (/^\s*$/.test(chars)) {
            this.doc.appendChild(charNode);
          }
          this.locator && position(this.locator, charNode);
        }
      },
      skippedEntity: function(name2) {
      },
      endDocument: function() {
        this.doc.normalize();
      },
      /**
       * Stores the locator to be able to set the `columnNumber` and `lineNumber`
       * on the created DOM nodes.
       *
       * @param {Locator} locator
       */
      setDocumentLocator: function(locator) {
        if (locator) {
          locator.lineNumber = 0;
        }
        this.locator = locator;
      },
      //LexicalHandler
      comment: function(chars, start, length) {
        chars = _toString.apply(this, arguments);
        var comm = this.doc.createComment(chars);
        this.locator && position(this.locator, comm);
        appendElement(this, comm);
      },
      startCDATA: function() {
        this.cdata = true;
      },
      endCDATA: function() {
        this.cdata = false;
      },
      startDTD: function(name2, publicId, systemId, internalSubset) {
        var impl = this.doc.implementation;
        if (impl && impl.createDocumentType) {
          var dt = impl.createDocumentType(name2, publicId, systemId, internalSubset);
          this.locator && position(this.locator, dt);
          appendElement(this, dt);
          this.doc.doctype = dt;
        }
      },
      reportError: function(level, message) {
        if (typeof this.onError === "function") {
          try {
            this.onError(level, message, this);
          } catch (e) {
            throw new ParseError("Reporting " + level + ' "' + message + '" caused ' + e, this.locator);
          }
        } else {
          console.error("[xmldom " + level + "]	" + message, _locator(this.locator));
        }
      },
      /**
       * @see http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
       */
      warning: function(message) {
        this.reportError("warning", message);
      },
      error: function(message) {
        this.reportError("error", message);
      },
      /**
       * This function reports a fatal error and throws a ParseError.
       *
       * @param {string} message
       * - The message to be used for reporting and throwing the error.
       * @param {Error} [cause]
       * The error that caused this fatal error, preserved as the thrown `ParseError`'s `cause`.
       * @returns {never}
       * This function always throws an error and never returns a value.
       * @throws {ParseError}
       * Always throws a ParseError with the provided message.
       */
      fatalError: function(message, cause) {
        this.reportError("fatalError", message);
        throw new ParseError(message, this.locator, cause);
      }
    };
    function _locator(l) {
      if (l) {
        return "\n@#[line:" + l.lineNumber + ",col:" + l.columnNumber + "]";
      }
    }
    function _toString(chars, start, length) {
      if (typeof chars == "string") {
        return chars.substr(start, length);
      } else {
        if (chars.length >= start + length || start) {
          return new java.lang.String(chars, start, length) + "";
        }
        return chars;
      }
    }
    "endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(
      /\w+/g,
      function(key) {
        DOMHandler.prototype[key] = function() {
          return null;
        };
      }
    );
    function appendElement(handler, node) {
      if (!handler.currentElement) {
        handler.doc.appendChild(node);
      } else {
        handler.currentElement.appendChild(node);
      }
    }
    function onErrorStopParsing(level) {
      if (level === "error") throw "onErrorStopParsing";
    }
    function onWarningStopParsing() {
      throw "onWarningStopParsing";
    }
    exports.__DOMHandler = DOMHandler;
    exports.DOMParser = DOMParser3;
    exports.normalizeLineEndings = normalizeLineEndings;
    exports.onErrorStopParsing = onErrorStopParsing;
    exports.onWarningStopParsing = onWarningStopParsing;
  }
});

// node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/@xmldom+xmldom@0.9.12/node_modules/@xmldom/xmldom/lib/index.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    exports.assign = conventions.assign;
    exports.hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
    exports.isHTMLMimeType = conventions.isHTMLMimeType;
    exports.isValidMimeType = conventions.isValidMimeType;
    exports.MIME_TYPE = conventions.MIME_TYPE;
    exports.NAMESPACE = conventions.NAMESPACE;
    var errors = require_errors2();
    exports.DOMException = errors.DOMException;
    exports.DOMExceptionName = errors.DOMExceptionName;
    exports.ExceptionCode = errors.ExceptionCode;
    exports.ParseError = errors.ParseError;
    var dom = require_dom();
    exports.Attr = dom.Attr;
    exports.CDATASection = dom.CDATASection;
    exports.CharacterData = dom.CharacterData;
    exports.Comment = dom.Comment;
    exports.Document = dom.Document;
    exports.DocumentFragment = dom.DocumentFragment;
    exports.DocumentType = dom.DocumentType;
    exports.DOMImplementation = dom.DOMImplementation;
    exports.Element = dom.Element;
    exports.Entity = dom.Entity;
    exports.EntityReference = dom.EntityReference;
    exports.LiveNodeList = dom.LiveNodeList;
    exports.NamedNodeMap = dom.NamedNodeMap;
    exports.Node = dom.Node;
    exports.NodeList = dom.NodeList;
    exports.Notation = dom.Notation;
    exports.ProcessingInstruction = dom.ProcessingInstruction;
    exports.Text = dom.Text;
    exports.XMLSerializer = dom.XMLSerializer;
    var domParser = require_dom_parser();
    exports.DOMParser = domParser.DOMParser;
    exports.normalizeLineEndings = domParser.normalizeLineEndings;
    exports.onErrorStopParsing = domParser.onErrorStopParsing;
    exports.onWarningStopParsing = domParser.onWarningStopParsing;
  }
});

// src/index.ts
import { existsSync as existsSync2, readFileSync } from "fs";
import path16 from "path";
import { pathToFileURL } from "url";

// src/root.ts
import path from "path";
import { fileURLToPath } from "url";
var PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// src/core/export-pipeline.ts
import { mkdtemp, readFile as readFile6, rm as rm3, writeFile as writeFile3 } from "fs/promises";
import os2 from "os";
import path7 from "path";
import { createConverter } from "@deepseek-ai/libreoffice-kit";

// src/core/project/store.ts
import { mkdir as mkdir2, readFile as readFile2, readdir as readdir2, rename as rename2, rm as rm2, writeFile as writeFile2 } from "fs/promises";
import path3 from "path";

// src/core/pptd/parse.ts
var import_yaml = __toESM(require_dist(), 1);

// src/core/pptd/schema.ts
var DEFAULT_PROFILE = "generate";
var ANIMATION_ENTRANCE = [
  "appear",
  "blindsIn",
  "checkerboardIn",
  "dissolveIn",
  "flyIn",
  "peekIn",
  "randomBarsIn",
  "shapeIn",
  "splitIn",
  "stripsIn",
  "wedgeIn",
  "wheelIn",
  "wipeIn",
  "expandIn",
  "fadeIn",
  "swivelIn",
  "zoomIn",
  "centerRevolveIn",
  "floatIn",
  "growTurnIn",
  "riseUpIn",
  "spinnerIn",
  "basicZoomIn",
  "stretchIn",
  "boomerangIn",
  "bounceIn",
  "creditsIn",
  "curveUpIn",
  "dropIn",
  "flipIn",
  "floatingIn",
  "pinwheelIn",
  "spiralIn",
  "basicSwivelIn",
  "whipIn"
];
var ANIMATION_EMPHASIS = [
  "fillColor",
  "fontColor",
  "growShrink",
  "lineColor",
  "spin",
  "transparency",
  "boldFlash",
  "brushColor",
  "complementaryColor2",
  "contrastingColor",
  "darken",
  "desaturate",
  "lighten",
  "objectColor",
  "pulse",
  "underline",
  "colorPulse",
  "growWithColor",
  "shimmer",
  "teeter",
  "blink",
  "boldReveal",
  "wave",
  "complementaryColor"
];
var ANIMATION_EXIT = [
  "blindsOut",
  "checkerboardOut",
  "disappear",
  "dissolveOut",
  "flyOut",
  "peekOut",
  "randomBarsOut",
  "shapeOut",
  "splitOut",
  "stripsOut",
  "wedgeOut",
  "wheelOut",
  "wipeOut",
  "contractOut",
  "fadeOut",
  "swivelOut",
  "zoomOut",
  "centerRevolveOut",
  "collapseOut",
  "floatOut",
  "shrinkTurnOut",
  "sinkDownOut",
  "spinnerOut",
  "basicZoomOut",
  "boomerangOut",
  "bounceOut",
  "creditsOut",
  "curveDownOut",
  "dropOut",
  "flipOut",
  "floatingOut",
  "pinwheelOut",
  "spiralOut",
  "basicSwivelOut",
  "whipOut",
  "stretchyOut"
];
var ANIMATION_EFFECTS = [
  ...ANIMATION_ENTRANCE,
  ...ANIMATION_EMPHASIS,
  ...ANIMATION_EXIT
];
var ANIMATION_EFFECT_SET = new Set(ANIMATION_EFFECTS);
var TRANSITION_EFFECTS = [
  "blinds",
  "checker",
  "circle",
  "dissolve",
  "comb",
  "cover",
  "cut",
  "diamond",
  "fade",
  "newsflash",
  "plus",
  "pull",
  "push",
  "random",
  "randomBar",
  "split",
  "strips",
  "wedge",
  "wheel",
  "wipe",
  "zoom",
  "flash",
  "flip",
  "flythrough",
  "pan",
  "reveal",
  "shred",
  "switch",
  "wheelReverse",
  "window",
  "prstTrans",
  "morph",
  "conveyor",
  "doors",
  "ferris",
  "gallery",
  "glitter",
  "honeycomb",
  "prism",
  "ripple",
  "vortex",
  "warp"
];
var TRANSITION_EFFECT_SET = new Set(TRANSITION_EFFECTS);
var TRANSITION_PRESETS = [
  "fallOver",
  "drape",
  "curtains",
  "wind",
  "prestige",
  "fracture",
  "crush",
  "peelOff",
  "pageCurlDouble",
  "pageCurlSingle",
  "airplane",
  "origami"
];
var TRANSITION_PRESET_SET = new Set(TRANSITION_PRESETS);
var TRANSITION_DIRECTION_DOMAIN = {
  blinds: ["horz", "vert"],
  checker: ["horz", "vert"],
  comb: ["horz", "vert"],
  randomBar: ["horz", "vert"],
  doors: ["horz", "vert"],
  window: ["horz", "vert"],
  push: ["l", "r", "u", "d"],
  wipe: ["l", "r", "u", "d"],
  vortex: ["l", "r", "u", "d"],
  pan: ["l", "r", "u", "d"],
  glitter: ["l", "r", "u", "d"],
  prism: ["l", "r", "u", "d"],
  cover: ["l", "r", "u", "d", "lu", "ru", "ld", "rd"],
  pull: ["l", "r", "u", "d", "lu", "ru", "ld", "rd"],
  strips: ["lu", "ru", "ld", "rd"],
  ripple: ["center", "lu", "ru", "ld", "rd"],
  switch: ["l", "r"],
  flip: ["l", "r"],
  ferris: ["l", "r"],
  gallery: ["l", "r"],
  conveyor: ["l", "r"],
  reveal: ["l", "r"],
  zoom: ["in", "out"],
  split: ["in", "out"],
  warp: ["in", "out"],
  flythrough: ["in", "out"],
  shred: ["in", "out"]
};
var ANIMATION_OPTION_APPLICABILITY = {
  direction: [
    "flyIn",
    "flyOut",
    "wipeIn",
    "wipeOut",
    "peekIn",
    "peekOut",
    "stripsIn",
    "stripsOut"
  ],
  orientation: [
    "blindsIn",
    "blindsOut",
    "randomBarsIn",
    "randomBarsOut",
    "checkerboardIn",
    "checkerboardOut",
    "splitIn",
    "splitOut"
  ],
  inOut: ["shapeIn", "shapeOut", "splitIn", "splitOut"],
  shape: ["shapeIn", "shapeOut"],
  spokes: ["wheelIn", "wheelOut"],
  spinDirection: ["spin"],
  spinDegrees: ["spin"],
  scaleDirection: ["growShrink"],
  scalePercent: ["growShrink"],
  transparencyPercent: ["transparency"],
  color: [
    "fillColor",
    "fontColor",
    "lineColor",
    "brushColor",
    "objectColor",
    "colorPulse",
    "growWithColor"
  ]
};
var ANIMATION_DURATION_FORBIDDEN = [
  "appear",
  "disappear",
  "transparency",
  "boldReveal"
];
var ANIMATION_BUILD_RESTRICTED = ["fillColor", "lineColor"];
var ANIMATION_DIRECTIONS = [
  "top",
  "right",
  "bottom",
  "left",
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight"
];
var ANIMATION_ORIENTATIONS = ["horizontal", "vertical"];
var ANIMATION_IN_OUT = ["in", "out"];
var ANIMATION_SHAPES = ["circle", "box", "diamond", "plus"];
var ANIMATION_SPOKES = [1, 2, 3, 4, 8];
var ANIMATION_TRIGGERS = ["onClick", "withPrevious", "afterPrevious"];
var ANIMATION_TEXT_BUILDS = ["asOneObject", "allAtOnce", "byParagraph"];
var GENERATE_ELEMENT_TYPES = [
  "text",
  "shape",
  "line",
  "image",
  "icon",
  "table",
  "chart"
];
var REVERSE_ELEMENT_TYPES = [
  "text",
  "shape",
  "line",
  "image",
  "table",
  "placeholder"
];
var PLACEHOLDER_ORIGINAL_TYPES = [
  "chart",
  "smartArt",
  "group",
  "media",
  "ole",
  "object3d",
  "unknown"
];
var PLACEHOLDER_DEFAULT_LABELS = {
  chart: "\u6B64\u5904\u539F\u4E3A\u56FE\u8868",
  smartArt: "\u6B64\u5904\u539F\u4E3A SmartArt \u56FE\u793A",
  group: "\u6B64\u5904\u539F\u4E3A\u7EC4\u5408\u56FE\u5F62",
  media: "\u6B64\u5904\u539F\u4E3A\u5A92\u4F53\uFF08\u97F3\u9891/\u89C6\u9891\uFF09",
  ole: "\u6B64\u5904\u539F\u4E3A\u5D4C\u5165\u5BF9\u8C61",
  object3d: "\u6B64\u5904\u539F\u4E3A\u4E09\u7EF4\u56FE\u5F62",
  unknown: "\u6B64\u5904\u539F\u4E3A\u672A\u5EFA\u6A21\u5143\u7D20"
};
var THEME_REF_PREFIX = "$";
var ERROR_CODES = {
  VersionError: "VersionError",
  UnknownProfileError: "UnknownProfileError",
  ProfileViolationError: "ProfileViolationError",
  PlaceholderNotAllowedError: "PlaceholderNotAllowedError",
  ExplicitGeometryRequiredError: "ExplicitGeometryRequiredError",
  SourceRequiredError: "SourceRequiredError",
  ExportFieldValueError: "ExportFieldValueError",
  UnknownThemeKeyError: "UnknownThemeKeyError",
  SchemaError: "SchemaError",
  UnknownAnimationEffectError: "UnknownAnimationEffectError",
  AnimationTargetError: "AnimationTargetError",
  AnimationOptionNotApplicableError: "AnimationOptionNotApplicableError",
  AnimationOptionValueError: "AnimationOptionValueError",
  AnimationDurationNotAllowedError: "AnimationDurationNotAllowedError",
  AnimationSequenceError: "AnimationSequenceError",
  OriginalEffectRequiredError: "OriginalEffectRequiredError",
  AnimationDurationRequiredWarning: "AnimationDurationRequiredWarning",
  UnknownTransitionEffectError: "UnknownTransitionEffectError",
  TransitionPresetRequiredError: "TransitionPresetRequiredError",
  TransitionDirectionMismatchError: "TransitionDirectionMismatchError",
  TransitionOptionNotApplicableError: "TransitionOptionNotApplicableError",
  UnmodeledTransitionWarning: "UnmodeledTransitionWarning",
  PlaceholderFieldError: "PlaceholderFieldError",
  PlaceholderContrastWarning: "PlaceholderContrastWarning"
};
var REVERSE_ONLY_PAGE_FIELDS = [
  "transition",
  "hidden",
  "layoutRef",
  "sectionName"
];
var REVERSE_ONLY_ELEMENT_FIELDS = [
  "sourceRef",
  "originalName",
  "glue",
  "imageAdjust",
  "partName",
  "builtinStyle",
  "originalType",
  "label",
  "labelStyle"
];
var REVERSE_ONLY_ANIMATION_FIELDS = [
  "originalEffect",
  "presetId",
  "presetClass",
  "sequence",
  "valueAfterEnd",
  "buildLevel",
  "playable",
  "editable"
];

// src/core/pptd/parse.ts
function blocker(code, message, path17, detail) {
  return { code, level: "blocker", message, ...path17 === void 0 ? {} : { path: path17 }, ...detail === void 0 ? {} : { detail } };
}
function warning(code, message, path17, detail) {
  return { code, level: "warning", message, ...path17 === void 0 ? {} : { path: path17 }, ...detail === void 0 ? {} : { detail } };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isBounds(value) {
  return Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber);
}
function isSizePair(value) {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber);
}
function isSafeRelativePath(value) {
  if (value.trim() === "") return false;
  if (value.startsWith("/") || value.startsWith("\\")) return false;
  if (/^[A-Za-z]:[\\/]/.test(value)) return false;
  const normalized = value.replace(/\\/g, "/");
  return !normalized.split("/").includes("..");
}
function parseDeckText(text, sourcePath = "deck.pptd") {
  const issues = [];
  let raw;
  try {
    raw = (0, import_yaml.parse)(text);
  } catch (err2) {
    return {
      value: null,
      issues: [blocker(ERROR_CODES.SchemaError, `deck.pptd \u4E0D\u662F\u5408\u6CD5 YAML\uFF1A${err2.message}`, sourcePath)]
    };
  }
  if (!isRecord(raw)) {
    return { value: null, issues: [blocker(ERROR_CODES.SchemaError, "deck.pptd \u9876\u5C42\u5FC5\u987B\u662F\u6620\u5C04\u5BF9\u8C61", sourcePath)] };
  }
  issues.push(...validateDeckShape(raw, sourcePath));
  return { value: raw, issues };
}
function parsePageText(text, sourcePath) {
  let raw;
  try {
    raw = (0, import_yaml.parse)(text);
  } catch (err2) {
    return {
      value: null,
      issues: [blocker(ERROR_CODES.SchemaError, `\u9875\u6587\u4EF6\u4E0D\u662F\u5408\u6CD5 YAML\uFF1A${err2.message}`, sourcePath)]
    };
  }
  if (!isRecord(raw)) {
    return { value: null, issues: [blocker(ERROR_CODES.SchemaError, "\u9875\u6587\u4EF6\u9876\u5C42\u5FC5\u987B\u662F\u6620\u5C04\u5BF9\u8C61", sourcePath)] };
  }
  return { value: raw, issues: [] };
}
function stringifyDocument(value) {
  const doc = new import_yaml.Document(value);
  (0, import_yaml.visit)(doc, {
    Seq: (_key, node) => {
      if (node.items.length > 0 && node.items.every((item) => (0, import_yaml.isScalar)(item) && typeof item.value === "number")) {
        node.flow = true;
      }
    }
  });
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false });
}
function stringifyDeck(deck) {
  return stringifyDocument(deck);
}
function stringifyPage(page) {
  return stringifyDocument(page);
}
function profileOf(deck) {
  return deck.profile ?? DEFAULT_PROFILE;
}
function validateDeckShape(deck, path17) {
  const issues = [];
  if (deck.version !== "v3") {
    issues.push(
      blocker(ERROR_CODES.VersionError, `version \u7F3A\u5931\u6216\u4E0D\u4E3A "v3"\uFF08\u5B9E\u9645\uFF1A${JSON.stringify(deck.version)}\uFF09`, `${path17}#version`, {
        expected: "v3",
        actual: deck.version ?? null
      })
    );
  }
  if (deck.profile !== void 0 && deck.profile !== "generate" && deck.profile !== "reverse") {
    issues.push(
      blocker(ERROR_CODES.UnknownProfileError, `profile \u53D6\u503C\u5FC5\u987B\u662F generate / reverse\uFF08\u5B9E\u9645\uFF1A${JSON.stringify(deck.profile)}\uFF09`, `${path17}#profile`)
    );
  }
  if (!isSizePair(deck.size)) {
    issues.push(
      blocker(ERROR_CODES.SchemaError, "size \u5FC5\u586B\uFF0C\u4E14\u4E3A [\u5BBD, \u9AD8] \u4E24\u4E2A\u6B63\u6570", `${path17}#size`, { actual: deck.size ?? null })
    );
  } else if (deck.size[0] <= 0 || deck.size[1] <= 0) {
    issues.push(blocker(ERROR_CODES.SchemaError, "size \u7684\u5BBD\u9AD8\u5FC5\u987B > 0", `${path17}#size`, { actual: deck.size }));
  }
  if (deck.title !== void 0 && typeof deck.title !== "string") {
    issues.push(blocker(ERROR_CODES.SchemaError, "title \u5FC5\u987B\u662F\u5B57\u7B26\u4E32", `${path17}#title`));
  }
  if (!Array.isArray(deck.pages)) {
    issues.push(blocker(ERROR_CODES.SchemaError, "pages \u5FC5\u586B\uFF0C\u4E14\u4E3A\u9875\u6587\u4EF6\u76F8\u5BF9\u8DEF\u5F84\u6570\u7EC4", `${path17}#pages`));
  } else {
    deck.pages.forEach((entry, i) => {
      if (typeof entry !== "string" || !isSafeRelativePath(entry)) {
        issues.push(
          blocker(ERROR_CODES.SchemaError, '\u9875\u8DEF\u5F84\u5FC5\u987B\u662F\u5DE5\u7A0B\u76EE\u5F55\u5185\u7684\u76F8\u5BF9\u8DEF\u5F84\uFF08\u4E0D\u5F97\u4E3A\u7EDD\u5BF9\u8DEF\u5F84\u6216\u542B ".."\uFF09', `${path17}#pages[${i}]`, {
            actual: entry
          })
        );
      }
    });
  }
  issues.push(...validateExportConfig(deck.export, `${path17}#export`));
  return issues;
}
function validateExportConfig(raw, path17) {
  const issues = [];
  if (raw === void 0) return issues;
  if (!isRecord(raw)) {
    return [blocker(ERROR_CODES.ExportFieldValueError, "export \u5FC5\u987B\u662F\u5BF9\u8C61", path17)];
  }
  const domains = {
    fontEmbed: ["subset", "full", "off"],
    transition: ["fade", "none"],
    animations: ["auto", "off"]
  };
  for (const [key, allowed] of Object.entries(domains)) {
    const value = raw[key];
    if (value !== void 0 && (typeof value !== "string" || !allowed.includes(value))) {
      issues.push(
        blocker(ERROR_CODES.ExportFieldValueError, `export.${key} \u53D6\u503C\u5FC5\u987B\u5728 ${allowed.join(" / ")} \u5185`, `${path17}.${key}`, {
          allowed,
          actual: value
        })
      );
    }
  }
  for (const key of Object.keys(raw)) {
    if (!(key in domains)) {
      issues.push(warning(ERROR_CODES.ExportFieldValueError, `export \u91CC\u7684\u672A\u77E5\u5B57\u6BB5 "${key}" \u5C06\u88AB\u5FFD\u7565`, `${path17}.${key}`));
    }
  }
  return issues;
}
function collectThemeRefs(value, path17, out = []) {
  if (typeof value === "string") {
    if (value.startsWith(THEME_REF_PREFIX) && value.length > 1) out.push({ key: value.slice(1), path: path17 });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectThemeRefs(item, `${path17}[${i}]`, out));
    return out;
  }
  if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) collectThemeRefs(v, `${path17}.${k}`, out);
  }
  return out;
}
function themeKeysOf(theme) {
  const keys = /* @__PURE__ */ new Set();
  if (!isRecord(theme)) return keys;
  for (const table of ["colors", "textStyles", "tableStyles"]) {
    const entries = theme[table];
    if (isRecord(entries)) for (const key of Object.keys(entries)) keys.add(key);
  }
  return keys;
}
function validateDeck(deck, options = {}) {
  const path17 = options.path ?? "deck.pptd";
  const profile = options.profile ?? profileOf(deck);
  const issues = [...validateDeckShape(deck, path17)];
  if (profile === "reverse") {
    issues.push(...validateDeckSource(deck.source, `${path17}#source`));
  } else {
    if (deck.source !== void 0) {
      issues.push(
        blocker(ERROR_CODES.ProfileViolationError, "deck.source \u662F\u9006\u5411\u65B9\u8A00\u4E13\u5C5E\u5B57\u6BB5\uFF0C\u751F\u6210\u65B9\u8A00\u4E0D\u5F97\u51FA\u73B0", `${path17}#source`)
      );
    }
    const themeKeys = themeKeysOf(deck.theme);
    for (const ref of collectThemeRefs(deck, path17)) {
      if (!themeKeys.has(ref.key)) {
        issues.push(
          blocker(ERROR_CODES.UnknownThemeKeyError, `\u4E3B\u9898\u5F15\u7528 $${ref.key} \u5728 deck.theme \u4E2D\u4E0D\u5B58\u5728`, ref.path, {
            key: ref.key,
            available: [...themeKeys]
          })
        );
      }
    }
  }
  return issues;
}
function validateDeckSource(source, path17) {
  const issues = [];
  if (!isRecord(source)) {
    return [blocker(ERROR_CODES.SourceRequiredError, "profile: reverse \u65F6 deck.source \u5FC5\u586B", path17)];
  }
  if (typeof source.path !== "string" || source.path === "") {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, "source.path \u5FC5\u586B\uFF08\u6E90 .pptx \u8DEF\u5F84\uFF09", `${path17}.path`));
  }
  if (!isFiniteNumber(source.slideCount)) {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, "source.slideCount \u5FC5\u586B\uFF08\u6E90\u6587\u4EF6\u9875\u6570\uFF09", `${path17}.slideCount`));
  }
  if (!isSizePair(source.size)) {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, "source.size \u5FC5\u586B\uFF08\u6E90\u6587\u4EF6\u9875\u9762\u5C3A\u5BF8 [\u5BBD, \u9AD8]\uFF09", `${path17}.size`));
  }
  return issues;
}
function validatePage(page, options = {}) {
  const profile = options.profile ?? DEFAULT_PROFILE;
  const path17 = options.path ?? "pages/?.page";
  const issues = [];
  const raw = page;
  if (profile === "generate") {
    for (const field of REVERSE_ONLY_PAGE_FIELDS) {
      if (raw[field] !== void 0) {
        issues.push(
          blocker(ERROR_CODES.ProfileViolationError, `Page.${field} \u662F\u9006\u5411\u65B9\u8A00\u4E13\u5C5E\u5B57\u6BB5\uFF0C\u751F\u6210\u65B9\u8A00\u4E0D\u5F97\u51FA\u73B0`, `${path17}#${field}`)
        );
      }
    }
  } else if (page.pageType !== void 0) {
    issues.push(
      blocker(ERROR_CODES.ProfileViolationError, "Page.pageType \u662F\u751F\u6210\u65B9\u8A00\u4E13\u5C5E\u5B57\u6BB5\uFF0C\u9006\u5411\u65B9\u8A00\u4E0D\u4F7F\u7528", `${path17}#pageType`)
    );
  }
  if (page.transition !== void 0) issues.push(...validatePageTransition(page.transition, `${path17}#transition`));
  if (!Array.isArray(page.elements)) {
    issues.push(blocker(ERROR_CODES.SchemaError, "elements \u5FC5\u586B\uFF0C\u4E14\u4E3A\u5143\u7D20\u6570\u7EC4", `${path17}#elements`));
    return issues;
  }
  const seen = /* @__PURE__ */ new Set();
  page.elements.forEach((element, index) => {
    issues.push(...validateElement(element, { profile, path: `${path17}#elements[${index}]`, seen }));
  });
  issues.push(...validateAnimations(page.animations, { path: `${path17}#animations`, elements: page.elements, profile }));
  if (profile === "reverse") {
    for (const ref of collectThemeRefs(page, path17)) {
      issues.push(
        blocker(ERROR_CODES.ProfileViolationError, `\u9006\u5411\u65B9\u8A00\u4E0D\u5141\u8BB8 $key \u4E3B\u9898\u5F15\u7528\uFF08$${ref.key}\uFF1BR2/R4 \u8981\u6C42\u5B57\u9762\u91CF\uFF09`, ref.path, { key: ref.key })
      );
    }
  } else if (options.themeKeys) {
    for (const ref of collectThemeRefs(page, path17)) {
      if (!options.themeKeys.has(ref.key)) {
        issues.push(
          blocker(ERROR_CODES.UnknownThemeKeyError, `\u4E3B\u9898\u5F15\u7528 $${ref.key} \u5728 deck.theme \u4E2D\u4E0D\u5B58\u5728`, ref.path, {
            key: ref.key,
            available: [...options.themeKeys]
          })
        );
      }
    }
  }
  return issues;
}
function validateElement(element, ctx) {
  const { profile, path: path17 } = ctx;
  const issues = [];
  if (!isRecord(element)) {
    return [blocker(ERROR_CODES.SchemaError, "\u5143\u7D20\u5FC5\u987B\u662F\u6620\u5C04\u5BF9\u8C61", path17)];
  }
  const target = element;
  if (typeof target.elementId !== "string" || target.elementId === "") {
    issues.push(blocker(ERROR_CODES.SchemaError, "elementId \u5FC5\u586B\uFF0C\u4E14\u4E3A\u975E\u7A7A\u5B57\u7B26\u4E32", `${path17}#elementId`));
  } else if (ctx.seen.has(target.elementId)) {
    issues.push(blocker(ERROR_CODES.SchemaError, `elementId "${target.elementId}" \u5728\u540C\u4E00\u9875\u5185\u91CD\u590D`, `${path17}#elementId`));
  } else {
    ctx.seen.add(target.elementId);
  }
  const elementType = target.elementType;
  const allowed = profile === "generate" ? GENERATE_ELEMENT_TYPES : REVERSE_ELEMENT_TYPES;
  if (typeof elementType !== "string") {
    issues.push(blocker(ERROR_CODES.SchemaError, "elementType \u5FC5\u586B", `${path17}#elementType`));
  } else if (profile === "generate" && elementType === "placeholder") {
    issues.push(
      blocker(ERROR_CODES.PlaceholderNotAllowedError, 'profile: generate \u7684\u5DE5\u7A0B\u91CC\u4E0D\u5141\u8BB8 elementType: "placeholder"', `${path17}#elementType`)
    );
  } else if (profile === "reverse" && (elementType === "icon" || elementType === "chart")) {
    issues.push(
      blocker(ERROR_CODES.ProfileViolationError, `\u9006\u5411\u65B9\u8A00\u4E0D\u4EA7\u51FA ${elementType} \u5143\u7D20\uFF08\u6E90\u56FE\u6807\u6309 shape/image\u3001\u56FE\u8868\u8D70 dropped + placeholder \u6620\u5C04\uFF09`, `${path17}#elementType`)
    );
  } else if (!allowed.includes(elementType)) {
    issues.push(
      blocker(ERROR_CODES.SchemaError, `elementType "${elementType}" \u4E0D\u5728 ${profile} \u65B9\u8A00\u5141\u8BB8\u7684\u53D6\u503C\u5185`, `${path17}#elementType`, {
        allowed
      })
    );
  }
  const isPlaceholder = elementType === "placeholder";
  if (!("bounds" in element) || element.bounds === void 0) {
    issues.push(
      profile === "reverse" ? blocker(ERROR_CODES.ExplicitGeometryRequiredError, "\u9006\u5411\u65B9\u8A00\u5143\u7D20\u5FC5\u987B\u663E\u5F0F\u7ED9\u51FA bounds", `${path17}#bounds`) : blocker(ERROR_CODES.SchemaError, "bounds \u5FC5\u586B\uFF08[x, y, w, h]\uFF09", `${path17}#bounds`)
    );
  } else if (!isBounds(element.bounds)) {
    issues.push(blocker(ERROR_CODES.SchemaError, "bounds \u5FC5\u987B\u662F [x, y, w, h] \u56DB\u4E2A\u6570", `${path17}#bounds`, { actual: element.bounds }));
  }
  if (profile === "reverse" && !isPlaceholder) {
    for (const field of ["rotation", "opacity", "flip"]) {
      if (element[field] === void 0) {
        issues.push(
          blocker(ERROR_CODES.ExplicitGeometryRequiredError, `\u9006\u5411\u65B9\u8A00\u5143\u7D20\u5FC5\u987B\u663E\u5F0F\u5199\u51FA ${field}\uFF08\u5373\u4F7F\u7B49\u4E8E\u9ED8\u8BA4\u503C\uFF09`, `${path17}#${field}`)
        );
      }
    }
  }
  if (profile === "generate") {
    for (const field of REVERSE_ONLY_ELEMENT_FIELDS) {
      if (element[field] !== void 0) {
        issues.push(
          blocker(ERROR_CODES.ProfileViolationError, `\u5143\u7D20\u5B57\u6BB5 "${field}" \u662F\u9006\u5411\u65B9\u8A00\u4E13\u5C5E\uFF0C\u751F\u6210\u65B9\u8A00\u4E0D\u5F97\u51FA\u73B0`, `${path17}#${field}`)
        );
      }
    }
  }
  if (isPlaceholder) {
    const originalType = element.originalType;
    if (originalType === void 0) {
      issues.push(blocker(ERROR_CODES.PlaceholderFieldError, "placeholder \u7684 originalType \u5FC5\u586B", `${path17}#originalType`));
    } else if (typeof originalType !== "string" || !PLACEHOLDER_ORIGINAL_TYPES.includes(originalType)) {
      issues.push(
        blocker(ERROR_CODES.PlaceholderFieldError, `placeholder.originalType \u4E0D\u5728\u7C7B\u522B\u8868\u5185\uFF08${PLACEHOLDER_ORIGINAL_TYPES.join(" / ")}\uFF09`, `${path17}#originalType`, {
          actual: originalType
        })
      );
    }
  }
  return issues;
}
function validateAnimations(animations, ctx) {
  const profile = ctx.profile ?? DEFAULT_PROFILE;
  const issues = [];
  if (animations === void 0) return issues;
  if (!Array.isArray(animations)) {
    return [blocker(ERROR_CODES.SchemaError, "animations \u5FC5\u987B\u662F\u6570\u7EC4", ctx.path)];
  }
  const elementIds = new Set(ctx.elements.map((e) => e?.elementId).filter((id) => typeof id === "string"));
  const placeholderIds = new Set(
    ctx.elements.filter((e) => e?.elementType === "placeholder").map((e) => e.elementId)
  );
  animations.forEach((raw, index) => {
    const path17 = `${ctx.path}[${index}]`;
    if (!isRecord(raw)) {
      issues.push(blocker(ERROR_CODES.SchemaError, "\u52A8\u753B\u6761\u76EE\u5FC5\u987B\u662F\u6620\u5C04\u5BF9\u8C61", path17));
      return;
    }
    const anim = raw;
    if (typeof anim.elementId !== "string" || anim.elementId === "") {
      issues.push(blocker(ERROR_CODES.AnimationTargetError, "\u52A8\u753B elementId \u5FC5\u586B", `${path17}#elementId`));
    } else if (placeholderIds.has(anim.elementId)) {
      issues.push(
        blocker(ERROR_CODES.AnimationTargetError, `\u52A8\u753B\u4E0D\u5F97\u6307\u5411 placeholder \u5143\u7D20\uFF08${anim.elementId}\uFF09`, `${path17}#elementId`)
      );
    } else if (!elementIds.has(anim.elementId)) {
      issues.push(
        blocker(ERROR_CODES.AnimationTargetError, `\u52A8\u753B elementId "${anim.elementId}" \u672A\u5F15\u7528\u672C\u9875\u5DF2\u5B58\u5728\u7684\u5143\u7D20`, `${path17}#elementId`)
      );
    }
    const effect = anim.effect;
    const isNullEffect = effect === null;
    if (isNullEffect) {
      if (anim.originalEffect === void 0) {
        issues.push(
          blocker(ERROR_CODES.OriginalEffectRequiredError, "effect: null \u65F6\u5FC5\u987B\u5199 originalEffect\uFF08\u6E90 preset \u539F\u6837\u6807\u8BC6\uFF09", `${path17}#originalEffect`)
        );
      }
    } else if (typeof effect !== "string" || !ANIMATION_EFFECT_SET.has(effect)) {
      issues.push(
        blocker(ERROR_CODES.UnknownAnimationEffectError, `effect \u4E0D\u5728 95 \u4E2A preset \u8BCD\u8868\u5185\uFF1A${JSON.stringify(effect)}`, `${path17}#effect`)
      );
    }
    if (anim.trigger !== void 0 && !ANIMATION_TRIGGERS.includes(anim.trigger)) {
      issues.push(
        blocker(ERROR_CODES.SchemaError, `trigger \u53D6\u503C\u5FC5\u987B\u662F ${ANIMATION_TRIGGERS.join(" / ")}`, `${path17}#trigger`, { actual: anim.trigger })
      );
    }
    const effectName = typeof effect === "string" ? effect : null;
    if (anim.durationMs !== void 0 && anim.durationMs !== null) {
      if (!isFiniteNumber(anim.durationMs) || anim.durationMs <= 0) {
        issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "durationMs \u5FC5\u987B > 0", `${path17}#durationMs`, { actual: anim.durationMs }));
      } else if (effectName !== null && ANIMATION_DURATION_FORBIDDEN.includes(effectName)) {
        issues.push(
          blocker(ERROR_CODES.AnimationDurationNotAllowedError, `${effectName} \u4E0D\u63A5\u53D7 durationMs\uFF08\u77AC\u65F6\u6216\u6548\u679C\u4FDD\u6301\u5230\u672C\u9875\u7ED3\u675F\uFF09`, `${path17}#durationMs`)
        );
      }
    }
    if (anim.delayMs !== void 0 && (!isFiniteNumber(anim.delayMs) || anim.delayMs < 0)) {
      issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "delayMs \u5FC5\u987B >= 0", `${path17}#delayMs`, { actual: anim.delayMs }));
    }
    issues.push(...validateAnimationOptions(anim, path17, effectName));
    issues.push(...validateAnimationSequence(anim, index, animations, path17));
    if (profile === "generate") {
      for (const field of REVERSE_ONLY_ANIMATION_FIELDS) {
        if (raw[field] !== void 0) {
          issues.push(
            blocker(ERROR_CODES.ProfileViolationError, `\u52A8\u753B\u8BB0\u5F55\u5B57\u6BB5 "${field}" \u662F\u9006\u5411\u65B9\u8A00\u4E13\u5C5E\uFF0C\u751F\u6210\u65B9\u8A00\u4E0D\u5F97\u51FA\u73B0`, `${path17}#${field}`)
          );
        }
      }
    }
  });
  return issues;
}
var ANIMATION_DIRECTION_DOMAIN = {
  flyIn: ANIMATION_DIRECTIONS,
  flyOut: ANIMATION_DIRECTIONS,
  wipeIn: ["top", "right", "bottom", "left"],
  wipeOut: ["top", "right", "bottom", "left"],
  peekIn: ["top", "right", "bottom", "left"],
  peekOut: ["top", "right", "bottom", "left"],
  stripsIn: ["topLeft", "topRight", "bottomLeft", "bottomRight"],
  stripsOut: ["topLeft", "topRight", "bottomLeft", "bottomRight"]
};
function validateAnimationOptions(anim, path17, effectName) {
  const issues = [];
  if (effectName === null) return issues;
  const optionKeys = Object.keys(ANIMATION_OPTION_APPLICABILITY);
  for (const option of optionKeys) {
    if (anim[option] === void 0) continue;
    if (!ANIMATION_OPTION_APPLICABILITY[option].includes(effectName)) {
      issues.push(
        blocker(
          ERROR_CODES.AnimationOptionNotApplicableError,
          `\u9009\u9879 ${option} \u4E0D\u9002\u7528\u4E8E preset ${effectName}\uFF08\xA77.3 \u9002\u7528\u77E9\u9635\uFF09`,
          `${path17}#${option}`,
          { applicableTo: ANIMATION_OPTION_APPLICABILITY[option] }
        )
      );
    }
  }
  if (anim.direction !== void 0) {
    const domain = ANIMATION_DIRECTION_DOMAIN[effectName];
    if (domain !== void 0 && !domain.includes(String(anim.direction))) {
      issues.push(
        blocker(ERROR_CODES.AnimationOptionValueError, `direction "${anim.direction}" \u8D85\u51FA ${effectName} \u7684\u65B9\u5411\u96C6\u5408`, `${path17}#direction`, {
          allowed: domain
        })
      );
    }
  }
  if (anim.orientation !== void 0 && !ANIMATION_ORIENTATIONS.includes(String(anim.orientation))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "orientation \u53D6\u503C\u5FC5\u987B\u662F horizontal / vertical", `${path17}#orientation`));
  }
  if (anim.inOut !== void 0 && !ANIMATION_IN_OUT.includes(String(anim.inOut))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "inOut \u53D6\u503C\u5FC5\u987B\u662F in / out", `${path17}#inOut`));
  }
  if (anim.shape !== void 0 && !ANIMATION_SHAPES.includes(String(anim.shape))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "shape \u53D6\u503C\u5FC5\u987B\u662F circle / box / diamond / plus", `${path17}#shape`));
  }
  if (anim.spokes !== void 0 && !ANIMATION_SPOKES.includes(Number(anim.spokes))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "spokes \u53D6\u503C\u9650 1 / 2 / 3 / 4 / 8", `${path17}#spokes`, { actual: anim.spokes }));
  }
  if (anim.spinDegrees !== void 0 && (!isFiniteNumber(anim.spinDegrees) || anim.spinDegrees <= 0)) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "spinDegrees \u5FC5\u987B > 0", `${path17}#spinDegrees`));
  }
  if (anim.scalePercent !== void 0 && (!isFiniteNumber(anim.scalePercent) || anim.scalePercent <= 0)) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "scalePercent \u5FC5\u987B > 0", `${path17}#scalePercent`));
  }
  if (anim.transparencyPercent !== void 0 && (!isFiniteNumber(anim.transparencyPercent) || anim.transparencyPercent < 0 || anim.transparencyPercent > 100)) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "transparencyPercent \u53D6\u503C\u5FC5\u987B\u5728 [0, 100]", `${path17}#transparencyPercent`));
  }
  if (anim.build !== void 0 && !ANIMATION_TEXT_BUILDS.includes(String(anim.build))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "build \u53D6\u503C\u5FC5\u987B\u662F asOneObject / allAtOnce / byParagraph", `${path17}#build`));
  }
  if (anim.build !== void 0 && anim.build !== "asOneObject" && ANIMATION_BUILD_RESTRICTED.includes(effectName)) {
    issues.push(
      blocker(ERROR_CODES.AnimationOptionNotApplicableError, `${effectName} \u53EA\u52A8\u753B\u5F62\u72B6\u672C\u8EAB\uFF0C\u4E0D\u63A5\u53D7 build: ${anim.build}`, `${path17}#build`)
    );
  }
  return issues;
}
function validateAnimationSequence(anim, index, all, path17) {
  if (anim.trigger !== "afterPrevious" || index === 0) return [];
  const previous = all[index - 1];
  if (!isRecord(previous)) return [];
  const prev = previous;
  const reasons = [];
  if (prev.effect === null) reasons.push("\u524D\u4E00\u6761 effect \u4E3A null\uFF08\u672A\u5EFA\u6A21\u6B65\u9AA4\uFF09");
  if (prev.playable === false) reasons.push("\u524D\u4E00\u6761\u4E0D\u53EF\u64AD\u653E");
  if (prev.build === "byParagraph") reasons.push("\u524D\u4E00\u6761\u9010\u6BB5\u64AD\u653E");
  if (typeof prev.effect === "string" && ["transparency", "boldReveal"].includes(prev.effect)) reasons.push("\u524D\u4E00\u6761\u6548\u679C\u4FDD\u6301\u5230\u672C\u9875\u7ED3\u675F");
  if (reasons.length === 0) return [];
  return [
    warning(
      ERROR_CODES.AnimationSequenceError,
      `afterPrevious \u7684\u524D\u4E00\u6761\u52A8\u753B\u7ED3\u675F\u65F6\u523B\u4E0D\u53EF\u6D4B\u5B9A\uFF1A${reasons.join("\uFF1B")}`,
      `${path17}#trigger`,
      { reasons }
    )
  ];
}
var TRANSITION_OPTION_SCOPE = {
  spokes: ["wheel", "wheelReverse"],
  orientation: ["split"],
  thruBlack: ["fade", "cut", "reveal"],
  pattern: ["glitter", "shred"],
  isContent: ["prism"],
  isInverted: ["prism"],
  hasBounce: ["flythrough"],
  invertX: ["prstTrans"],
  invertY: ["prstTrans"],
  morphOption: ["morph"]
};
function validatePageTransition(raw, path17) {
  const issues = [];
  if (!isRecord(raw)) {
    return [blocker(ERROR_CODES.SchemaError, "transition \u5FC5\u987B\u662F\u5BF9\u8C61", path17)];
  }
  const transition = raw;
  const effect = transition.effect;
  if (typeof effect !== "string" || effect === "") {
    issues.push(blocker(ERROR_CODES.UnknownTransitionEffectError, "transition.effect \u5FC5\u586B", `${path17}#effect`));
    return issues;
  }
  if (!TRANSITION_EFFECT_SET.has(effect)) {
    if (transition.unmodeled === true) {
      issues.push(
        warning(ERROR_CODES.UnmodeledTransitionWarning, `\u8F6C\u573A\u6548\u679C "${effect}" \u672A\u5EFA\u6A21\uFF0C\u5BFC\u51FA\u65F6\u8DF3\u8FC7\u8BE5\u9875\u8F6C\u573A`, `${path17}#effect`)
      );
    } else {
      issues.push(
        blocker(ERROR_CODES.UnknownTransitionEffectError, `transition.effect "${effect}" \u4E0D\u5728\u9644\u5F55 B.1 \u7684 42 \u4E2A token \u5185\u4E14\u672A\u7F6E unmodeled: true`, `${path17}#effect`)
      );
    }
  }
  if (effect === "prstTrans") {
    const preset = transition.preset;
    if (typeof preset !== "string" || !TRANSITION_PRESET_SET.has(preset)) {
      issues.push(
        blocker(ERROR_CODES.TransitionPresetRequiredError, "effect: prstTrans \u65F6 preset \u5FC5\u586B\uFF0C\u4E14\u5FC5\u987B\u5728\u9644\u5F55 B.2 \u7684 12 \u4E2A token \u5185", `${path17}#preset`, {
          actual: preset ?? null
        })
      );
    }
  }
  if (transition.direction !== void 0) {
    const domain = TRANSITION_DIRECTION_DOMAIN[effect];
    if (domain === void 0) {
      issues.push(
        blocker(ERROR_CODES.TransitionDirectionMismatchError, `${effect} \u4E0D\u63A5\u53D7 direction`, `${path17}#direction`, { actual: transition.direction })
      );
    } else if (!domain.includes(String(transition.direction))) {
      issues.push(
        blocker(ERROR_CODES.TransitionDirectionMismatchError, `direction "${transition.direction}" \u4E0E ${effect} \u7684\u65B9\u5411\u57DF\u4E0D\u5339\u914D`, `${path17}#direction`, {
          allowed: domain
        })
      );
    }
  }
  for (const [option, scope] of Object.entries(TRANSITION_OPTION_SCOPE)) {
    if (transition[option] !== void 0 && !scope.includes(effect)) {
      issues.push(
        blocker(ERROR_CODES.TransitionOptionNotApplicableError, `\u9009\u9879 ${option} \u4E0D\u9002\u7528\u4E8E\u8F6C\u573A effect ${effect}`, `${path17}#${option}`)
      );
    }
  }
  if (transition.speed !== void 0 && !["slow", "med", "fast"].includes(String(transition.speed))) {
    issues.push(blocker(ERROR_CODES.SchemaError, "transition.speed \u53D6\u503C\u5FC5\u987B\u662F slow / med / fast", `${path17}#speed`));
  }
  if (transition.durationMs !== void 0 && (!isFiniteNumber(transition.durationMs) || transition.durationMs <= 0)) {
    issues.push(blocker(ERROR_CODES.SchemaError, "transition.durationMs \u5FC5\u987B > 0", `${path17}#durationMs`));
  }
  if (transition.spokes !== void 0 && ![1, 2, 3, 4, 8].includes(Number(transition.spokes))) {
    issues.push(blocker(ERROR_CODES.TransitionOptionNotApplicableError, "transition.spokes \u53D6\u503C\u9650 1 / 2 / 3 / 4 / 8", `${path17}#spokes`));
  }
  return issues;
}
function parseProject(deckText, pageEntries) {
  const issues = [];
  const deckResult = parseDeckText(deckText);
  issues.push(...deckResult.issues);
  const deck = deckResult.value;
  const profile = deck ? profileOf(deck) : DEFAULT_PROFILE;
  if (deck) issues.push(...validateDeck(deck, { profile }));
  const themeKeys = deck ? themeKeysOf(deck.theme) : void 0;
  const pages = /* @__PURE__ */ new Map();
  const declared = new Set(Array.isArray(deck?.pages) ? deck.pages.filter((p) => typeof p === "string") : []);
  const provided = new Map(pageEntries.map((entry) => [entry.path.replace(/\\/g, "/"), entry.text]));
  for (const path17 of declared) {
    const key = path17.replace(/\\/g, "/");
    const text = provided.get(key);
    if (text === void 0) {
      issues.push(
        blocker(ERROR_CODES.SchemaError, `deck.pages \u58F0\u660E\u7684\u9875\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${key}`, `deck.pptd#pages#${key}`)
      );
      continue;
    }
    const parsed = parsePageText(text, key);
    issues.push(...parsed.issues);
    if (parsed.value) {
      pages.set(key, parsed.value);
      issues.push(...validatePage(parsed.value, { profile, path: key, themeKeys }));
    }
  }
  for (const key of provided.keys()) {
    if (!declared.has(key)) {
      issues.push(warning(ERROR_CODES.SchemaError, `\u9875\u6587\u4EF6\u672A\u88AB deck.pages \u5F15\u7528\uFF08\u5B64\u513F\u9875\uFF09\uFF1A${key}`, key));
    }
  }
  return { deck, pages, issues, profile };
}

// src/core/project/history.ts
import { createHash } from "crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "fs/promises";
import path2 from "path";
var HISTORY_DIR = ".history";
var MEDIA_DIR = "media";
var DEFAULT_HISTORY_LIMIT = 20;
var DEFAULT_MERGE_WINDOW_MS = 3e4;
var policy = {
  limit: DEFAULT_HISTORY_LIMIT,
  mergeWindowMs: DEFAULT_MERGE_WINDOW_MS
};
function historyDir(projectDir) {
  return path2.join(projectDir, HISTORY_DIR);
}
function revisionLabel(revision) {
  return `r${String(revision).padStart(4, "0")}`;
}
function snapshotDir(projectDir, revision) {
  return path2.join(historyDir(projectDir), revisionLabel(revision));
}
function metaPath(dir) {
  return path2.join(dir, "meta.json");
}
function mediaManifestPath(dir) {
  return path2.join(dir, "media.json");
}
async function listSnapshots(projectDir) {
  const root = historyDir(projectDir);
  let entries;
  try {
    entries = await readdir(root);
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const match = /^r(\d{4,})$/.exec(entry);
    if (!match) continue;
    const dir = path2.join(root, entry);
    const meta = await readMeta(dir);
    if (meta) out.push({ ...meta, dir });
  }
  return out.sort((a, b) => a.revision - b.revision);
}
async function readMeta(dir) {
  try {
    const raw = JSON.parse(await readFile(metaPath(dir), "utf8"));
    if (typeof raw?.revision !== "number") return null;
    return raw;
  } catch {
    return null;
  }
}
async function readSnapshotState(projectDir, revision) {
  const dir = snapshotDir(projectDir, revision);
  const meta = await readMeta(dir);
  if (!meta) return null;
  const deck = await readFile(path2.join(dir, "deck.pptd"), "utf8");
  const pages = /* @__PURE__ */ new Map();
  const pagesRoot = path2.join(dir, "pages");
  for (const rel of await listFilesRecursive(pagesRoot)) {
    pages.set(`pages/${rel.replace(/\\/g, "/")}`, await readFile(path2.join(pagesRoot, rel), "utf8"));
  }
  let media = [];
  try {
    media = JSON.parse(await readFile(mediaManifestPath(dir), "utf8"));
  } catch {
    media = [];
  }
  return { deck, pages, media };
}
async function writeSnapshotDir(dir, state, meta) {
  const tmp = `${dir}.tmp-${process.pid}-${Date.now()}`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(path2.join(tmp, "pages"), { recursive: true });
  await writeFile(path2.join(tmp, "deck.pptd"), state.deck, "utf8");
  for (const [rel, text] of state.pages) {
    const target = path2.join(tmp, rel);
    await mkdir(path2.dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");
  }
  await writeFile(path2.join(tmp, "meta.json"), `${JSON.stringify(meta, null, 2)}
`, "utf8");
  await writeFile(path2.join(tmp, "media.json"), `${JSON.stringify(state.media, null, 2)}
`, "utf8");
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir);
}
async function appendSnapshot(projectDir, state, options) {
  const now = options.now ?? Date.now();
  const snapshots = await listSnapshots(projectDir);
  const last = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const mergeable = options.force !== true && last !== null && !last.anchor && last.revision === options.baseRevision && (options.sessionId ?? null) === last.sessionId && now - Date.parse(last.windowStartedAt) < policy.mergeWindowMs;
  if (last && mergeable) {
    const meta2 = {
      ...last,
      createdAt: new Date(now).toISOString(),
      ops: [...last.ops, ...options.ops],
      mergedCount: last.mergedCount + 1
    };
    await writeSnapshotDir(last.dir, state, meta2);
    return { snapshot: { ...meta2, dir: last.dir }, merged: true };
  }
  const meta = {
    revision: options.revision,
    parentRevision: options.baseRevision,
    createdAt: new Date(now).toISOString(),
    windowStartedAt: new Date(now).toISOString(),
    sessionId: options.sessionId ?? null,
    ops: [...options.ops],
    mergedCount: 0,
    anchor: options.revision === 0
  };
  const dir = snapshotDir(projectDir, options.revision);
  await writeSnapshotDir(dir, state, meta);
  await enforceLimit(projectDir);
  return { snapshot: { ...meta, dir }, merged: false };
}
async function pruneAbove(projectDir, revision) {
  const snapshots = await listSnapshots(projectDir);
  const pruned = [];
  for (const snapshot of snapshots) {
    if (snapshot.revision > revision) {
      await rm(snapshot.dir, { recursive: true, force: true });
      pruned.push(snapshot.revision);
    }
  }
  return pruned;
}
async function enforceLimit(projectDir, limit = policy.limit) {
  const snapshots = await listSnapshots(projectDir);
  const evicted = [];
  let count = snapshots.length;
  for (const snapshot of snapshots) {
    if (count <= limit) break;
    if (snapshot.anchor) continue;
    await rm(snapshot.dir, { recursive: true, force: true });
    evicted.push(snapshot.revision);
    count -= 1;
  }
  return evicted;
}
function sha1Of(buffer) {
  return createHash("sha1").update(buffer).digest("hex");
}
async function hashMediaDir(projectDir) {
  const root = path2.join(projectDir, MEDIA_DIR);
  const rels = await listFilesRecursive(root);
  const entries = [];
  for (const rel of rels.sort()) {
    const buffer = await readFile(path2.join(root, rel));
    entries.push({ path: `${MEDIA_DIR}/${rel.replace(/\\/g, "/")}`, sha1: sha1Of(buffer), bytes: buffer.byteLength });
  }
  return entries;
}
async function verifyMedia(projectDir, entries) {
  const missing = [];
  const mismatched = [];
  for (const entry of entries) {
    const abs = path2.join(projectDir, entry.path);
    try {
      const buffer = await readFile(abs);
      const actual = sha1Of(buffer);
      if (actual !== entry.sha1) mismatched.push({ path: entry.path, expected: entry.sha1, actual });
    } catch {
      missing.push(entry.path);
    }
  }
  return { missing, mismatched };
}
async function listFilesRecursive(root, prefix = "") {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...await listFilesRecursive(path2.join(root, entry.name), rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}
async function materializeSnapshot(projectDir, state) {
  await writeFile(path2.join(projectDir, "deck.pptd"), state.deck, "utf8");
  const pagesRoot = path2.join(projectDir, "pages");
  await mkdir(pagesRoot, { recursive: true });
  for (const existing of await listFilesRecursive(pagesRoot)) {
    const rel = `pages/${existing.replace(/\\/g, "/")}`;
    if (!state.pages.has(rel)) await rm(path2.join(pagesRoot, existing), { force: true });
  }
  for (const [rel, text] of state.pages) {
    const target = path2.join(projectDir, rel);
    await mkdir(path2.dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");
  }
}

// src/core/project/store.ts
var ProjectError = class extends Error {
  code;
  status;
  detail;
  constructor(code, message, options = {}) {
    super(message);
    this.name = "ProjectError";
    this.code = code;
    this.status = options.status;
    this.detail = options.detail;
  }
};
var OpError = class extends Error {
  opIndex;
  op;
  constructor(opIndex, op, message) {
    super(`ops[${opIndex}] (${op})\uFF1A${message}`);
    this.name = "OpError";
    this.opIndex = opIndex;
    this.op = op;
  }
};
var MANIFEST_FILE = "manifest.json";
var DECK_FILE = "deck.pptd";
var PAGES_DIR = "pages";
async function readManifest(projectDir) {
  let raw;
  try {
    raw = await readFile2(path3.join(projectDir, MANIFEST_FILE), "utf8");
  } catch {
    throw new ProjectError("ManifestMissing", `\u5DE5\u7A0B\u8D26\u672C\u7F3A\u5931\uFF1A${MANIFEST_FILE}\uFF08\u8BE5\u76EE\u5F55\u4E0D\u662F\u5B8C\u6574\u7684 PPTD v3 \u5DE5\u7A0B\uFF09`, { status: 404 });
  }
  try {
    const manifest = JSON.parse(raw);
    if (typeof manifest.revision !== "number") throw new Error("revision \u7F3A\u5931");
    return manifest;
  } catch (err2) {
    throw new ProjectError("ManifestCorrupt", `\u5DE5\u7A0B\u8D26\u672C\u635F\u574F\uFF1A${err2.message}`, { status: 409 });
  }
}
async function writeManifest(projectDir, manifest) {
  const target = path3.join(projectDir, MANIFEST_FILE);
  const tmp = `${target}.tmp-${process.pid}`;
  await writeFile2(tmp, `${JSON.stringify(manifest, null, 2)}
`, "utf8");
  await rename2(tmp, target);
}
async function writeExportReport(cwd, dir, report) {
  const abs = resolveProjectDir(cwd, dir);
  return withProjectLock(abs, async () => {
    const manifest = await readManifest(abs);
    await writeManifest(abs, { ...manifest, exportReport: report });
  });
}
function checksumOf(deckText, pages) {
  const parts = [`deck.pptd:${sha1Of(deckText)}`];
  for (const rel of [...pages.keys()].sort()) {
    parts.push(`${rel}:${sha1Of(pages.get(rel) ?? "")}`);
  }
  return sha1Of(parts.join("\n"));
}
function resolveProjectDir(cwd, dir) {
  if (typeof cwd !== "string" || cwd === "") {
    throw new ProjectError("SessionCwdMissing", "\u4F1A\u8BDD\u6CA1\u6709 cwd\uFF0C\u65E0\u6CD5\u5B9A\u4F4D\u5DE5\u7A0B\u76EE\u5F55\uFF08\u4E0D\u56DE\u843D\u5230 process.cwd()\uFF09", { status: 400 });
  }
  const absCwd = path3.resolve(cwd);
  const abs = path3.resolve(absCwd, dir);
  const rel = path3.relative(absCwd, abs);
  if (rel.startsWith("..") || path3.isAbsolute(rel)) {
    throw new ProjectError("PathOutsideCwd", `\u5DE5\u7A0B\u76EE\u5F55\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${dir}\uFF08\u89E3\u6790\u5230 ${abs}\uFF0C\u8D85\u51FA ${absCwd}\uFF09`, {
      status: 400,
      detail: { dir, resolved: abs, cwd: absCwd }
    });
  }
  return abs;
}
var locks = /* @__PURE__ */ new Map();
async function withProjectLock(projectDir, fn) {
  const key = path3.resolve(projectDir);
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  const wrapped = next.catch(() => void 0);
  locks.set(key, wrapped);
  try {
    return await next;
  } finally {
    if (locks.get(key) === wrapped) locks.delete(key);
  }
}
async function loadProject(cwd, dir) {
  const abs = resolveProjectDir(cwd, dir);
  let deckText;
  try {
    deckText = await readFile2(path3.join(abs, DECK_FILE), "utf8");
  } catch {
    throw new ProjectError("ProjectNotFound", `\u627E\u4E0D\u5230\u5DE5\u7A0B\u4E3B\u5165\u53E3\uFF1A${path3.join(abs, DECK_FILE)}`, { status: 404 });
  }
  const manifest = await readManifest(abs);
  const deckParsed = parseDeckText(deckText);
  const declared = Array.isArray(deckParsed.value?.pages) ? deckParsed.value.pages.filter((p) => typeof p === "string") : [];
  const pageEntries = [];
  for (const rel of declared) {
    try {
      pageEntries.push({ path: rel.replace(/\\/g, "/"), text: await readFile2(path3.join(abs, rel), "utf8") });
    } catch {
    }
  }
  const parsed = parseProject(deckText, pageEntries);
  if (!parsed.deck) {
    throw new ProjectError("DeckParseFailed", "deck.pptd \u65E0\u6CD5\u89E3\u6790", { status: 409, detail: parsed.issues });
  }
  const pages = /* @__PURE__ */ new Map();
  for (const entry of pageEntries) pages.set(entry.path, entry.text);
  const checksumMismatch = checksumOf(deckText, pages) !== manifest.checksum;
  const issues = [...parsed.issues];
  if (checksumMismatch) {
    issues.push({
      code: "ChecksumMismatch",
      level: "warning",
      message: "\u78C1\u76D8\u5185\u5BB9\u4E0E manifest.checksum \u4E0D\u4E00\u81F4\uFF08\u5DE5\u7A0B\u88AB\u5DE5\u5177\u5C42\u4E4B\u5916\u4FEE\u6539\u8FC7\uFF09"
    });
  }
  return { dir: abs, deck: parsed.deck, pages: parsed.pages, manifest, issues, checksumMismatch };
}
function cloneModel(model) {
  return {
    deck: JSON.parse(JSON.stringify(model.deck)),
    pages: new Map([...model.pages].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]))
  };
}
function snapshotStateOf(projectDir, model) {
  return hashMediaDir(projectDir).then((media) => ({
    deck: stringifyDeck(model.deck),
    pages: new Map([...model.pages].map(([k, v]) => [k, stringifyPage(v)])),
    media
  }));
}
async function writeModel(projectDir, model) {
  await writeAtomic(path3.join(projectDir, DECK_FILE), stringifyDeck(model.deck));
  const pagesRoot = path3.join(projectDir, PAGES_DIR);
  await mkdir2(pagesRoot, { recursive: true });
  const live = new Set(model.pages.keys());
  for (const entry of await readdir2(pagesRoot).catch(() => [])) {
    const rel = `${PAGES_DIR}/${entry}`;
    if (!live.has(rel)) await rm2(path3.join(pagesRoot, entry), { force: true });
  }
  for (const [rel, page] of model.pages) {
    const target = path3.join(projectDir, rel);
    await mkdir2(path3.dirname(target), { recursive: true });
    await writeAtomic(target, stringifyPage(page));
  }
}
async function writeAtomic(target, content) {
  const tmp = `${target}.tmp-${process.pid}`;
  await writeFile2(tmp, content, "utf8");
  await rename2(tmp, target);
}
var DEFAULT_SIZE = [960, 540];
async function createProject(cwd, options) {
  const abs = resolveProjectDir(cwd, options.dir);
  return withProjectLock(abs, async () => {
    try {
      await readFile2(path3.join(abs, DECK_FILE), "utf8");
      throw new ProjectError("ProjectAlreadyExists", `\u76EE\u6807\u76EE\u5F55\u5DF2\u5B58\u5728\u5DE5\u7A0B\uFF1A${path3.join(abs, DECK_FILE)}`, { status: 409 });
    } catch (err2) {
      if (err2 instanceof ProjectError) throw err2;
    }
    await mkdir2(path3.join(abs, PAGES_DIR), { recursive: true });
    await mkdir2(path3.join(abs, "media"), { recursive: true });
    const deck = {
      version: "v3",
      profile: "generate",
      ...options.title !== void 0 ? { title: options.title } : {},
      size: options.size ?? DEFAULT_SIZE,
      ...options.deckTheme !== void 0 ? { theme: options.deckTheme } : {},
      export: { fontEmbed: "subset", transition: "fade", animations: "auto" },
      pages: []
    };
    const model = { deck, pages: /* @__PURE__ */ new Map() };
    await writeModel(abs, model);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const manifest = {
      revision: 0,
      createdAt: now,
      updatedAt: now,
      designSystem: options.designSystem ?? null,
      theme: options.theme ?? null,
      checksum: checksumOf(stringifyDeck(deck), /* @__PURE__ */ new Map())
    };
    const state = await snapshotStateOf(abs, model);
    await appendSnapshot(abs, state, { baseRevision: -1, revision: 0, sessionId: options.sessionId ?? null, ops: ["create"], force: true });
    await writeManifest(abs, manifest);
    return { manifest, dir: abs };
  });
}
var OP_NAMES = [
  "add_page",
  "remove_page",
  "move_page",
  "update_page",
  "page_duplicate",
  "add_element",
  "update_element",
  "remove_element",
  "page_add",
  "page_delete"
];
var OP_ALIASES = {
  page_add: "add_page",
  page_delete: "remove_page"
};
function opError(index, op, message) {
  return new OpError(index, op, message);
}
function requirePage(model, index, op, pagePath) {
  if (typeof pagePath !== "string" || pagePath === "") throw opError(index, op, "\u7F3A\u5C11 page \u53C2\u6570\uFF08\u9875\u6587\u4EF6\u76F8\u5BF9\u8DEF\u5F84\uFF09");
  const key = pagePath.replace(/\\/g, "/");
  const page = model.pages.get(key);
  if (!page) throw opError(index, op, `\u9875\u4E0D\u5B58\u5728\uFF1A${key}`);
  return page;
}
function pageKeyOf(pagePath) {
  return typeof pagePath === "string" && pagePath !== "" ? pagePath.replace(/\\/g, "/") : null;
}
function nextPagePath(model) {
  for (let i = 1; i < 1e3; i++) {
    const candidate = `pages/${String(i).padStart(2, "0")}.page`;
    if (!model.pages.has(candidate) && !model.deck.pages.includes(candidate)) return candidate;
  }
  throw new Error("\u9875\u5E8F\u53F7\u8017\u5C3D");
}
function applyOp(model, raw, index) {
  if (!raw || typeof raw !== "object") throw opError(index, "?", "op \u5FC5\u987B\u662F\u5BF9\u8C61");
  const name2 = raw.op;
  if (typeof name2 !== "string" || !OP_NAMES.includes(name2)) {
    throw opError(index, String(name2 ?? "?"), `\u672A\u77E5 op\uFF08\u51BB\u7ED3\u8BCD\u8868\uFF1A${OP_NAMES.join(" / ")}\uFF09`);
  }
  const op = OP_ALIASES[name2] ?? name2;
  switch (op) {
    case "add_page": {
      const key = pageKeyOf(raw.page) ?? nextPagePath(model);
      if (model.pages.has(key) || model.deck.pages.includes(key)) throw opError(index, name2, `\u9875\u5DF2\u5B58\u5728\uFF1A${key}`);
      const content = raw.content ?? { elements: [] };
      if (typeof content !== "object" || content === null || Array.isArray(content)) throw opError(index, name2, "content \u5FC5\u987B\u662F\u9875\u5BF9\u8C61");
      if (!Array.isArray(content.elements)) content.elements = [];
      const at = typeof raw.index === "number" ? Math.max(0, Math.min(raw.index, model.deck.pages.length)) : model.deck.pages.length;
      model.pages.set(key, content);
      model.deck.pages.splice(at, 0, key);
      return `add_page ${key}@${at}`;
    }
    case "remove_page": {
      const key = pageKeyOf(raw.page);
      requirePage(model, index, name2, key);
      model.pages.delete(key);
      model.deck.pages = model.deck.pages.filter((p) => p !== key);
      return `remove_page ${key}`;
    }
    case "move_page": {
      const key = pageKeyOf(raw.page);
      requirePage(model, index, name2, key);
      const from = model.deck.pages.indexOf(key);
      if (typeof raw.toIndex !== "number" || !Number.isInteger(raw.toIndex)) throw opError(index, name2, "move_page \u9700\u8981\u6574\u6570 toIndex");
      const to = Math.max(0, Math.min(raw.toIndex, model.deck.pages.length - 1));
      model.deck.pages.splice(from, 1);
      model.deck.pages.splice(to, 0, key);
      return `move_page ${key} ${from}\u2192${to}`;
    }
    case "update_page": {
      const key = pageKeyOf(raw.page);
      const page = requirePage(model, index, name2, key);
      const patch = raw.patch;
      if (typeof patch !== "object" || patch === null || Array.isArray(patch)) throw opError(index, name2, "update_page \u9700\u8981\u5BF9\u8C61 patch\uFF08\u9876\u5C42\u6D45\u5408\u5E76\uFF09");
      Object.assign(page, patch);
      return `update_page ${key}`;
    }
    case "page_duplicate": {
      const key = pageKeyOf(raw.page);
      const page = requirePage(model, index, name2, key);
      const newKey = pageKeyOf(raw.newPage) ?? nextPagePath(model);
      if (model.pages.has(newKey) || model.deck.pages.includes(newKey)) throw opError(index, name2, `\u76EE\u6807\u9875\u5DF2\u5B58\u5728\uFF1A${newKey}`);
      const copy = JSON.parse(JSON.stringify(page));
      const at = typeof raw.index === "number" ? Math.max(0, Math.min(raw.index, model.deck.pages.length)) : model.deck.pages.indexOf(key) + 1;
      model.pages.set(newKey, copy);
      model.deck.pages.splice(at, 0, newKey);
      return `page_duplicate ${key}\u2192${newKey}`;
    }
    case "add_element": {
      const key = pageKeyOf(raw.page);
      const page = requirePage(model, index, name2, key);
      const element = raw.element;
      if (typeof element !== "object" || element === null || Array.isArray(element)) throw opError(index, name2, "add_element \u9700\u8981\u5BF9\u8C61 element");
      const record = element;
      if (typeof record.elementId !== "string" || record.elementId === "") throw opError(index, name2, "element.elementId \u5FC5\u586B");
      if (page.elements.some((e) => e?.elementId === record.elementId)) {
        throw opError(index, name2, `elementId \u91CD\u590D\uFF1A${String(record.elementId)}`);
      }
      const at = typeof raw.index === "number" ? Math.max(0, Math.min(raw.index, page.elements.length)) : page.elements.length;
      page.elements.splice(at, 0, element);
      return `add_element ${key}#${String(record.elementId)}`;
    }
    case "update_element": {
      const key = pageKeyOf(raw.page);
      const page = requirePage(model, index, name2, key);
      if (typeof raw.elementId !== "string" || raw.elementId === "") throw opError(index, name2, "update_element \u9700\u8981 elementId");
      const element = page.elements.find((e) => e?.elementId === raw.elementId);
      if (!element) throw opError(index, name2, `\u5143\u7D20\u4E0D\u5B58\u5728\uFF1A${key}#${raw.elementId}`);
      const patch = raw.patch;
      if (typeof patch !== "object" || patch === null || Array.isArray(patch)) throw opError(index, name2, "update_element \u9700\u8981\u5BF9\u8C61 patch\uFF08\u9876\u5C42\u6D45\u5408\u5E76\uFF09");
      Object.assign(element, patch);
      return `update_element ${key}#${raw.elementId}`;
    }
    case "remove_element": {
      const key = pageKeyOf(raw.page);
      const page = requirePage(model, index, name2, key);
      if (typeof raw.elementId !== "string" || raw.elementId === "") throw opError(index, name2, "remove_element \u9700\u8981 elementId");
      const before = page.elements.length;
      page.elements = page.elements.filter((e) => e?.elementId !== raw.elementId);
      if (page.elements.length === before) throw opError(index, name2, `\u5143\u7D20\u4E0D\u5B58\u5728\uFF1A${key}#${raw.elementId}`);
      return `remove_element ${key}#${raw.elementId}`;
    }
    default:
      throw opError(index, name2, `\u672A\u5B9E\u73B0\u7684 op\uFF1A${op}`);
  }
}
async function editProject(cwd, options) {
  const abs = resolveProjectDir(cwd, options.dir);
  return withProjectLock(abs, async () => {
    const loaded = await loadProject(cwd, options.dir);
    const base = loaded.manifest.revision;
    if (options.baseRevision !== void 0 && options.baseRevision !== base) {
      throw new ProjectError("RevisionMismatch", `baseRevision \u4E0D\u5339\u914D\uFF1A\u671F\u671B ${base}\uFF0C\u6536\u5230 ${options.baseRevision}`, {
        status: 409,
        detail: { expected: base, actual: options.baseRevision }
      });
    }
    const model = cloneModel({ deck: loaded.deck, pages: loaded.pages });
    const appliedOps = [];
    for (let i = 0; i < options.ops.length; i++) {
      appliedOps.push(applyOp(model, options.ops[i], i));
    }
    const profile = profileOf(model.deck);
    const themeKeys = themeKeysOf(model.deck.theme);
    const issues = [...validateDeck(model.deck, { profile })];
    for (const [rel, page] of model.pages) {
      issues.push(...validatePage(page, { profile, path: rel, themeKeys }));
    }
    await pruneAbove(abs, base);
    const state = await snapshotStateOf(abs, model);
    const appended = await appendSnapshot(abs, state, {
      baseRevision: base,
      revision: base + 1,
      sessionId: options.sessionId ?? null,
      ops: appliedOps
    });
    const revision = appended.merged ? base : base + 1;
    await writeModel(abs, model);
    const manifest = {
      ...loaded.manifest,
      revision,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      checksum: checksumOf(state.deck, state.pages)
    };
    await writeManifest(abs, manifest);
    const warnings = issues.map((issue) => `[${issue.level}/${issue.code}] ${issue.path ?? ""} ${issue.message}`.trim());
    return { revision, appliedOps, warnings, issues, merged: appended.merged };
  });
}
async function moveCursor(cwd, dir, target, label) {
  const abs = resolveProjectDir(cwd, dir);
  return withProjectLock(abs, async () => {
    const loaded = await loadProject(cwd, dir);
    const current = loaded.manifest.revision;
    if (target === current) return { revision: current, undoneOps: [], warnings: [`\u6CA1\u6709\u53EF${label === "undo" ? "\u64A4\u9500" : "\u91CD\u505A"}\u7684\u6B65\u9AA4`] };
    const snapshots = await listSnapshots(abs);
    const between = label === "undo" ? snapshots.filter((s) => s.revision > target && s.revision <= current) : snapshots.filter((s) => s.revision > current && s.revision <= target);
    const movedOps = between.flatMap((s) => s.ops);
    const state = await readSnapshotState(abs, target);
    if (!state) {
      throw new ProjectError("SnapshotUnavailable", `\u5FEB\u7167 r${String(target).padStart(4, "0")} \u4E0D\u5B58\u5728\uFF0C\u65E0\u6CD5${label === "undo" ? "\u64A4\u9500" : "\u91CD\u505A"}\u5230\u4FEE\u8BA2 ${target}`, {
        status: 409,
        detail: { target, current }
      });
    }
    const verification = await verifyMedia(abs, state.media);
    const warnings = [];
    for (const missing of verification.missing) {
      warnings.push(`[media] \u5FEB\u7167\u5F15\u7528\u7684\u7D20\u6750\u7F3A\u5931\uFF1A${missing}`);
    }
    for (const mismatch of verification.mismatched) {
      warnings.push(`[media] \u7D20\u6750\u5185\u5BB9\u5DF2\u88AB\u4FEE\u6539\uFF1A${mismatch.path}\uFF08\u671F\u671B ${mismatch.expected}\uFF0C\u5B9E\u9645 ${mismatch.actual}\uFF09`);
    }
    await materializeSnapshot(abs, state);
    const manifest = {
      ...loaded.manifest,
      revision: target,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      checksum: checksumOf(state.deck, state.pages)
    };
    await writeManifest(abs, manifest);
    return { revision: target, undoneOps: movedOps, warnings };
  });
}
async function undoProject(cwd, dir, steps = 1) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 20) {
    throw new ProjectError("InvalidSteps", "steps \u5FC5\u987B\u662F 1\u201320 \u7684\u6574\u6570", { status: 400 });
  }
  const loaded = await loadProject(cwd, dir);
  const target = Math.max(0, loaded.manifest.revision - steps);
  return moveCursor(cwd, dir, target, "undo");
}
async function redoProject(cwd, dir, steps = 1) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 20) {
    throw new ProjectError("InvalidSteps", "steps \u5FC5\u987B\u662F 1\u201320 \u7684\u6574\u6570", { status: 400 });
  }
  const loaded = await loadProject(cwd, dir);
  const abs = resolveProjectDir(cwd, dir);
  const snapshots = await listSnapshots(abs);
  const max2 = snapshots.length > 0 ? snapshots[snapshots.length - 1].revision : 0;
  const target = Math.min(max2, loaded.manifest.revision + steps);
  return moveCursor(cwd, dir, target, "redo");
}

// src/core/engine/officekit.ts
import {
  addBlankSlide,
  addSlideChart,
  addSlideImage,
  addSlideLine,
  addSlideShape,
  addSlideTable,
  addSlideTextBox,
  clearSlideShapes,
  createPresentation,
  emu,
  getTableCell,
  mergeTableCells,
  renameShape,
  savePresentation,
  setParagraphBullet,
  setParagraphIndent,
  setParagraphLineSpacing,
  setPresentationFonts,
  setPresentationTheme,
  setShapeAnimation,
  setShapeBounds,
  setShapeCustomGeometry,
  setShapeFill,
  setShapeFlip,
  setShapeGradientFill,
  setShapeImageCrop,
  setShapeImageFill,
  setShapeImageOpacity,
  setShapeParagraphs,
  setShapePreset,
  setShapeRotation,
  setShapeShadow,
  setShapeStroke,
  setShapeStrokeArrow,
  setShapeStrokeDash,
  setShapeTextAnchor,
  setShapeTextDirection,
  setShapeTextWrap,
  setSlideBackground,
  setSlideBackgroundGradientFill,
  setSlideBackgroundImage,
  setSlideHidden,
  setSlideNotes,
  setSlideSize,
  setSlideTransition,
  setTableCellAnchor,
  setTableCellBorders,
  setTableCellFill,
  setTableCellParagraphs
} from "@office-kit/pptx";

// src/core/engine/richtext.ts
var VOIDLESS = /^<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>/;
function parseTag(raw) {
  const m = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\s*((?:[^>"']|"[^"]*"|'[^']*')*?)\s*(\/?)>$/.exec(raw);
  if (!m) return null;
  const attrs = {};
  const attrRe = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let a;
  while ((a = attrRe.exec(m[3])) !== null) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? "";
  return { name: m[2].toLowerCase(), attrs, closing: m[1] === "/", selfClosing: m[4] === "/" };
}
function tokenize(input) {
  const out = [];
  let i = 0;
  let buf = "";
  while (i < input.length) {
    const ch = input[i];
    if (ch === "<") {
      const rest = input.slice(i);
      const m = VOIDLESS.exec(rest) ?? /^<\/[a-zA-Z][a-zA-Z0-9]*\s*>/.exec(rest) ?? /^<br\s*\/?>/.exec(rest);
      if (m) {
        if (buf) {
          out.push({ kind: "text", value: buf });
          buf = "";
        }
        out.push({ kind: "tag", value: m[0] });
        i += m[0].length;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  if (buf) out.push({ kind: "text", value: buf });
  return out;
}
function decodeEntities(text) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
}
function parseStyleAttr(style) {
  const out = {};
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx <= 0) continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}
function px(value) {
  const m = /^(-?\d+(?:\.\d+)?)(px|pt)?$/.exec(value.trim());
  return m ? Number(m[1]) : void 0;
}
function paragraphPropsFromStyle(style, warnings) {
  const props = {};
  if (style["text-align"]) props.align = style["text-align"];
  if (style["line-height"]) {
    const raw = style["line-height"];
    if (raw.endsWith("px")) {
      const v = px(raw);
      if (v !== void 0) props.lineHeightPx = v;
    } else {
      const v = Number(raw);
      if (Number.isFinite(v)) props.lineHeight = v;
    }
  }
  for (const [key, field] of [["margin-top", "marginTop"], ["margin-left", "marginLeft"], ["margin-right", "marginRight"]]) {
    const v = style[key] ? px(style[key]) : void 0;
    if (v !== void 0) props[field] = v;
  }
  if (style["letter-spacing"]) {
    const v = px(style["letter-spacing"]);
    if (v !== void 0) props.letterSpacing = v;
    else warnings.push(`letter-spacing \u65E0\u6CD5\u89E3\u6790\uFF1A${style["letter-spacing"]}`);
  }
  return props;
}
function inlineStyleFromStyle(style) {
  const out = {};
  if (style["color"]) out.color = style["color"];
  if (style["font-size"]) {
    const v = px(style["font-size"]);
    if (v !== void 0) out.fontSize = v;
  }
  if (style["font-family"]) out.fontFamily = style["font-family"].replace(/^["']|["']$/g, "");
  if (style["background-color"]) out.backgroundColor = style["background-color"];
  return out;
}
var FRAME_DEFAULT = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  superscript: false,
  subscript: false,
  style: {}
};
function hasMarkup(text) {
  return /<\/?(p|span|strong|em|u|s|sup|sub|a|ul|ol|li|br)(\s|>|\/)/i.test(text);
}
function parseRichText(input) {
  const warnings = [];
  if (!hasMarkup(input)) {
    const lines = input.split(/\r?\n/);
    return {
      paragraphs: lines.map((line) => ({ props: {}, runs: line === "" ? [] : [{ text: decodeEntities(line), style: {} }] })),
      warnings
    };
  }
  const paragraphs = [];
  let current = { props: {}, runs: [] };
  const flushParagraph = () => {
    paragraphs.push(current);
    current = { props: {}, runs: [] };
  };
  const stack = [];
  let listContext = [];
  const frameOf = () => {
    const base = { ...FRAME_DEFAULT, style: {} };
    for (const entry of stack) {
      if (entry.frame.bold) base.bold = true;
      if (entry.frame.italic) base.italic = true;
      if (entry.frame.underline) base.underline = true;
      if (entry.frame.strike) base.strike = true;
      if (entry.frame.superscript) base.superscript = true;
      if (entry.frame.subscript) base.subscript = true;
      if (entry.frame.hyperlink) base.hyperlink = entry.frame.hyperlink;
      Object.assign(base.style, entry.frame.style);
    }
    return base;
  };
  for (const token of tokenize(input)) {
    if (token.kind === "text") {
      const text = decodeEntities(token.value);
      if (text === "") continue;
      const parts = text.split(/\r?\n/);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== "") {
          const frame = frameOf();
          current.runs.push({
            text: parts[i],
            ...frame.bold ? { bold: true } : {},
            ...frame.italic ? { italic: true } : {},
            ...frame.underline ? { underline: true } : {},
            ...frame.strike ? { strike: true } : {},
            ...frame.superscript ? { superscript: true } : {},
            ...frame.subscript ? { subscript: true } : {},
            ...frame.hyperlink ? { hyperlink: frame.hyperlink } : {},
            style: frame.style
          });
        }
        if (i < parts.length - 1) flushParagraph();
      }
      continue;
    }
    const tag = parseTag(token.value);
    if (!tag) {
      warnings.push(`\u65E0\u6CD5\u89E3\u6790\u7684\u6807\u7B7E\uFF1A${token.value}`);
      continue;
    }
    if (tag.name === "br") {
      const frame = frameOf();
      current.runs.push({ text: "\n", style: frame.style });
      continue;
    }
    if (tag.closing) {
      switch (tag.name) {
        case "p":
        case "li":
          flushParagraph();
          break;
        case "ul":
        case "ol":
          listContext = listContext.slice(0, -1);
          break;
        default: {
          const idx = stack.map((s) => s.tag).lastIndexOf(tag.name);
          if (idx >= 0) stack.splice(idx);
          else warnings.push(`\u591A\u4F59\u7684\u95ED\u5408\u6807\u7B7E\uFF1A</${tag.name}>`);
        }
      }
      continue;
    }
    switch (tag.name) {
      case "p": {
        const styles = parseStyleAttr(tag.attrs.style ?? "");
        current.props = { ...current.props, ...paragraphPropsFromStyle(styles, warnings) };
        break;
      }
      case "li": {
        const styles = parseStyleAttr(tag.attrs.style ?? "");
        const props = paragraphPropsFromStyle(styles, warnings);
        const list = listContext[listContext.length - 1];
        props.bullet = list === "ol" ? "number" : "bullet";
        current.props = { ...current.props, ...props };
        break;
      }
      case "ul":
      case "ol":
        listContext.push(tag.name);
        break;
      case "span":
        stack.push({ tag: "span", frame: { ...FRAME_DEFAULT, style: inlineStyleFromStyle(parseStyleAttr(tag.attrs.style ?? "")) } });
        break;
      case "strong":
        stack.push({ tag: "strong", frame: { ...FRAME_DEFAULT, bold: true, style: {} } });
        break;
      case "em":
        stack.push({ tag: "em", frame: { ...FRAME_DEFAULT, italic: true, style: {} } });
        break;
      case "u":
        stack.push({ tag: "u", frame: { ...FRAME_DEFAULT, underline: true, style: {} } });
        break;
      case "s":
        stack.push({ tag: "s", frame: { ...FRAME_DEFAULT, strike: true, style: {} } });
        break;
      case "sup":
        stack.push({ tag: "sup", frame: { ...FRAME_DEFAULT, superscript: true, style: {} } });
        break;
      case "sub":
        stack.push({ tag: "sub", frame: { ...FRAME_DEFAULT, subscript: true, style: {} } });
        break;
      case "a": {
        const href = tag.attrs.href;
        if (href) stack.push({ tag: "a", frame: { ...FRAME_DEFAULT, hyperlink: href, style: {} } });
        else warnings.push("<a> \u7F3A\u5C11 href \u5C5E\u6027\uFF0C\u6309\u7EAF\u6587\u672C\u5904\u7406");
        break;
      }
      default:
        warnings.push(`\u672A\u77E5\u6807\u7B7E <${tag.name}>\uFF0C\u5176\u5185\u5BB9\u6309\u7EAF\u6587\u672C\u5904\u7406`);
    }
  }
  flushParagraph();
  while (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1];
    if (last.runs.length === 0 && Object.keys(last.props).length === 0) paragraphs.pop();
    else break;
  }
  return { paragraphs, warnings };
}

// src/core/engine/officekit.ts
var PX_TO_EMU = 12700;
function toEmu(px2) {
  return emu(Math.round(px2 * PX_TO_EMU));
}
var ThemeResolver = class {
  colors;
  constructor(theme) {
    this.colors = theme?.colors ?? {};
  }
  /** Resolve a PPTD color to an engine Color; unknown $keys stay as-is (validation already flagged them). */
  color(value) {
    if (typeof value !== "string") return void 0;
    if (value.startsWith("$")) {
      const hit = this.colors[value.slice(1)];
      return hit ?? value;
    }
    return value;
  }
  /** Resolve a possibly-{latin,ea} font family into engine font fields. */
  fontFamily(value) {
    if (typeof value === "string") {
      const parts = splitFontStack(value);
      if (parts.length === 0) return {};
      return { font: parts[0], fontEastAsian: parts.length > 1 ? parts[1] : parts[0] };
    }
    if (value && typeof value === "object") {
      const rec = value;
      const out = {};
      if (typeof rec.latin === "string") out.font = rec.latin;
      if (typeof rec.ea === "string") out.fontEastAsian = rec.ea;
      return out;
    }
    return {};
  }
  /** Record a font family string into fontsUsed. */
  static collectFont(into, value) {
    if (typeof value === "string") {
      for (const part of splitFontStack(value)) into.add(part);
    } else if (value && typeof value === "object") {
      const rec = value;
      if (typeof rec.latin === "string") into.add(rec.latin);
      if (typeof rec.ea === "string") into.add(rec.ea);
    }
  }
};
var GENERIC_FAMILIES = /* @__PURE__ */ new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "default"]);
function splitFontStack(value) {
  return value.split(",").map((s) => s.trim().replace(/^["']+|["']+$/g, "")).filter((s) => s !== "" && !GENERIC_FAMILIES.has(s.toLowerCase()));
}
var ALIGN_MAP = {
  left: "left",
  center: "center",
  right: "right",
  justify: "justify",
  distributed: "distribute"
};
function resolveContent(content, theme, resolver, fonts, warnings, where) {
  const styleKey = typeof content.style === "string" && content.style.startsWith("$") ? content.style.slice(1) : null;
  const styleRef = (styleKey ? theme?.textStyles?.[styleKey] : void 0) ?? {};
  const pick = (key) => content[key] !== void 0 ? content[key] : styleRef[key];
  const fontFamily = pick("fontFamily");
  if (fontFamily !== void 0) ThemeResolver.collectFont(fonts, fontFamily);
  const colorRaw = pick("color");
  const out = {
    fontSize: pick("fontSize"),
    color: resolver.color(colorRaw),
    font: resolver.fontFamily(fontFamily),
    bold: pick("bold"),
    italic: pick("italic"),
    lineHeight: pick("lineHeight"),
    lineHeightPx: pick("lineHeightPx"),
    letterSpacing: pick("letterSpacing"),
    marginTop: pick("marginTop"),
    align: pick("align") ?? ["left", "top"],
    wrap: pick("wrap") ?? true,
    textDirection: pick("textDirection")
  };
  const bgRaw = pick("backgroundColor");
  if (bgRaw !== void 0) {
    const resolved = resolver.color(bgRaw);
    if (resolved !== void 0) out.backgroundColor = String(resolved);
  }
  if (content.gradient !== void 0 || styleRef.gradient !== void 0) {
    warnings.push(`${where}\uFF1A\u6587\u5B57\u6E10\u53D8\uFF08gradient\uFF09\u6682\u4E0D\u652F\u6301\uFF0C\u5DF2\u6309\u7EAF\u8272\u5904\u7406`);
  }
  const shadow = content.shadow ?? styleRef.shadow;
  if (shadow !== void 0) out.shadow = shadow;
  if (content.textDirection === "vertical") {
  }
  return out;
}
function richRunsToSpecs(paragraphs, base, resolver, fonts) {
  const specs = [];
  for (const para of paragraphs) {
    const alignToken = para.props.align !== void 0 ? ALIGN_MAP[para.props.align] : void 0;
    const runs = para.runs.flatMap((run) => runToSpecs(run, base, resolver, fonts));
    const spec = {
      ...alignToken !== void 0 ? { align: alignToken } : {},
      runs,
      // endFormat keeps empty paragraphs' height stable.
      ...runs.length === 0 && base.fontSize !== void 0 ? { endFormat: { size: base.fontSize, ...base.color !== void 0 ? { color: base.color } : {} } } : {}
    };
    specs.push(spec);
  }
  return specs;
}
function runToSpecs(run, base, resolver, fonts) {
  const format = {};
  const size = run.style.fontSize ?? base.fontSize;
  if (size !== void 0) format.size = size;
  const colorRaw = run.style.color !== void 0 ? run.style.color : base.color;
  const color = typeof colorRaw === "string" ? resolver.color(colorRaw) : colorRaw;
  if (color !== void 0) format.color = color;
  if (run.style.fontFamily !== void 0) {
    ThemeResolver.collectFont(fonts, run.style.fontFamily);
    Object.assign(format, resolver.fontFamily(run.style.fontFamily));
  } else {
    Object.assign(format, base.font);
  }
  if (run.bold === true || base.bold === true) format.bold = true;
  if (run.italic === true || base.italic === true) format.italic = true;
  if (run.underline) format.underline = true;
  if (run.strike) format.strike = true;
  if (run.superscript) format.baseline = 0.3;
  if (run.subscript) format.baseline = -0.25;
  if (run.style.backgroundColor !== void 0) {
    const bg = resolver.color(run.style.backgroundColor);
    if (bg !== void 0) format.highlight = bg;
  } else if (base.backgroundColor !== void 0) {
    format.highlight = base.backgroundColor;
  }
  if (base.letterSpacing !== void 0) format.spc = Math.round(base.letterSpacing * 100);
  return [{ text: run.text, format }];
}
function applyParagraphMetrics(shape, paragraphs, base) {
  paragraphs.forEach((para, index) => {
    const lh = para.props.lineHeight ?? base.lineHeight;
    const lhPx = para.props.lineHeightPx ?? base.lineHeightPx;
    if (lhPx !== void 0) {
      setParagraphLineSpacing(shape, index, { kind: "pts", value: lhPx });
    } else if (lh !== void 0) {
      setParagraphLineSpacing(shape, index, { kind: "pct", value: lh });
    }
  });
}
function applyParagraphBullets(shape, paragraphs) {
  paragraphs.forEach((para, index) => {
    const bullet = para.props.bullet;
    if (bullet === void 0 || bullet === null) return;
    try {
      setParagraphBullet(shape, index, bullet === "number" ? "number" : "bullet");
      const left = para.props.marginLeft !== void 0 ? para.props.marginLeft : 27;
      setParagraphIndent(shape, index, { leftEmu: toEmu(left), firstLineEmu: toEmu(-left) });
    } catch {
    }
  });
}
function applyTextBodyProps(shape, base, warnings, where) {
  const vertical = base.align[1];
  if (vertical === "middle") setShapeTextAnchor(shape, "center");
  else if (vertical === "bottom") setShapeTextAnchor(shape, "bottom");
  else setShapeTextAnchor(shape, "top");
  if (!base.wrap) setShapeTextWrap(shape, "none");
  if (base.textDirection === "vertical") {
    try {
      setShapeTextDirection(shape, "eaVert");
    } catch {
      warnings.push(`${where}\uFF1A\u7AD6\u6392\u6587\u5B57\u8BBE\u7F6E\u5931\u8D25\uFF0C\u5DF2\u6309\u6A2A\u6392\u5904\u7406`);
    }
  }
}
function applyFill(shape, fill, resolver, ctx, where) {
  if (fill === void 0) return;
  const type = fill.type;
  if (type === "solid") {
    const color = resolver.color(fill.color);
    if (color === void 0) {
      ctx.warnings.push(`${where}\uFF1Asolid \u586B\u5145\u7F3A color`);
      return;
    }
    setShapeFill(shape, color);
  } else if (type === "gradient") {
    const stops = Array.isArray(fill.stops) ? fill.stops : [];
    const mapped = stops.map((stop) => {
      const s = stop;
      const color = resolver.color(s.color);
      return typeof s.position === "number" && color !== void 0 ? { offset: s.position, color } : null;
    }).filter((s) => s !== null);
    if (mapped.length < 2) {
      ctx.warnings.push(`${where}\uFF1Agradient \u586B\u5145\u81F3\u5C11\u9700\u8981 2 \u4E2A\u8272\u6807`);
      return;
    }
    if (fill.gradientType === "radial") {
      ctx.warnings.push(`${where}\uFF1A\u5F84\u5411\u6E10\u53D8\uFF08radial\uFF09\u6682\u4E0D\u652F\u6301\uFF0C\u5DF2\u6309\u7EBF\u6027\u6E10\u53D8\u5904\u7406`);
    }
    const angle = typeof fill.angle === "number" ? fill.angle : 0;
    const options = { stops: mapped, angleDeg: angle };
    setShapeGradientFill(shape, options);
  } else if (type === "image") {
    const bytes = fill.__bytes;
    if (bytes) {
      setShapeImageFill(shape, bytes);
    } else {
      ctx.warnings.push(`${where}\uFF1Aimage \u586B\u5145\u672A\u80FD\u52A0\u8F7D\u7D20\u6750\uFF08${String(fill.src)}\uFF09\uFF0C\u5DF2\u8DF3\u8FC7\u586B\u5145`);
    }
  } else {
    ctx.warnings.push(`${where}\uFF1A\u672A\u77E5\u586B\u5145\u7C7B\u578B ${String(type)}\uFF0C\u5DF2\u8DF3\u8FC7`);
  }
}
function applyBorder(shape, border, resolver) {
  if (border === void 0) return;
  const color = resolver.color(border.color) ?? "#000000";
  const width = typeof border.width === "number" ? border.width : 1;
  setShapeStroke(shape, { color, widthEmu: toEmu(width) });
  const style = border.style;
  if (style === "dash") setShapeStrokeDash(shape, "dash");
  else if (style === "dot") setShapeStrokeDash(shape, "sysDot");
}
function applyShadow(shape, shadow, resolver) {
  if (shadow === void 0) return;
  const color = resolver.color(shadow.color) ?? "#000000";
  const blur = typeof shadow.blur === "number" ? shadow.blur : 0;
  const offset = Array.isArray(shadow.offset) ? shadow.offset : [0, 0];
  const [ox, oy] = [offset[0] ?? 0, offset[1] ?? 0];
  const dist = Math.sqrt(ox * ox + oy * oy);
  const angle = dist === 0 ? 0 : Math.atan2(oy, ox) * 180 / Math.PI;
  setShapeShadow(shape, {
    color,
    blurEmu: toEmu(blur),
    offsetEmu: toEmu(dist),
    angleDeg: Math.round(angle)
  });
}
function applyCommonGeometry(shape, element, ctx, where) {
  if (Array.isArray(element.bounds) && element.bounds.length === 4) {
    const [x, y, w, h] = element.bounds;
    setShapeBounds(shape, { x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) });
  }
  if (typeof element.rotation === "number" && element.rotation !== 0) setShapeRotation(shape, element.rotation);
  if (Array.isArray(element.flip) && (element.flip[0] || element.flip[1])) {
    setShapeFlip(shape, { horizontal: element.flip[0] === true, vertical: element.flip[1] === true });
  }
  if (typeof element.opacity === "number" && element.opacity < 1) {
    setShapeFill(shape, { opacity: Math.max(0, Math.min(1, element.opacity)) });
    ctx.warnings.push(`${where}\uFF1A\u5143\u7D20 opacity \u7ECF\u586B\u5145\u900F\u660E\u5EA6\u8FD1\u4F3C\u5B9E\u73B0\uFF08\u6587\u5B57/\u63CF\u8FB9\u4E0D\u900F\u660E\u5EA6\u672A\u7EA7\u8054\uFF09`);
  }
  renameShape(shape, element.elementId);
}
async function preloadImageBytes(src, ctx, where) {
  if (typeof src !== "string" || src === "") return null;
  try {
    return await ctx.loadMedia(src);
  } catch (err2) {
    ctx.warnings.push(`${where}\uFF1A\u7D20\u6750\u52A0\u8F7D\u5931\u8D25 ${src}\uFF1A${err2.message}`);
    return null;
  }
}
function buildText(slide, element, resolver, theme, ctx, fonts) {
  const where = `\u5143\u7D20 ${String(element.elementId)}`;
  const content = element.content ?? {};
  const base = resolveContent(content, theme, resolver, fonts, ctx.warnings, where);
  const [x, y, w, h] = element.bounds ?? [0, 0, 100, 20];
  const text = typeof content.text === "string" ? content.text : "";
  if (/\\\(([\s\S]*?)\\\)/.test(text)) {
    ctx.warnings.push(`${where}\uFF1ALaTeX \u516C\u5F0F\u5728 TS \u5BFC\u51FA\u94FE\u8DEF\u6682\u4E0D\u652F\u6301\uFF0C\u5DF2\u6309\u7EAF\u6587\u672C\u4FDD\u7559`);
  }
  const parsed = parseRichText(text);
  ctx.warnings.push(...parsed.warnings.map((m) => `${where}\uFF1A${m}`));
  const shape = addSlideTextBox(slide, { x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h), text: "" });
  const specs = richRunsToSpecs(parsed.paragraphs, base, resolver, fonts);
  setShapeParagraphs(shape, specs);
  applyParagraphMetrics(shape, parsed.paragraphs, base);
  applyParagraphBullets(shape, parsed.paragraphs);
  if (base.marginTop !== void 0 && base.marginTop > 0) {
    ctx.warnings.push(`${where}\uFF1AmarginTop\uFF08\u6BB5\u524D\u8DDD\uFF09\u6682\u4E0D\u652F\u6301\uFF0C\u5DF2\u5FFD\u7565`);
  }
  applyTextBodyProps(shape, base, ctx.warnings, where);
  applyCommonGeometry(shape, element, ctx, where);
  return shape;
}
function buildShape(slide, element, resolver, ctx) {
  const where = `\u5143\u7D20 ${String(element.elementId)}`;
  const shapeName = typeof element.shapeName === "string" ? element.shapeName : "rect";
  const [x, y, w, h] = element.bounds ?? [0, 0, 100, 100];
  const shape = addSlideShape(slide, { preset: shapeName === "custom" ? "rect" : shapeName, x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) });
  if (shapeName === "custom") {
    const viewBox = element.viewBox;
    const pathData = element.path;
    if (viewBox && pathData) {
      const geometry = svgPathToCustomGeometry(pathData, viewBox, ctx, where);
      if (geometry) {
        try {
          setShapeCustomGeometry(shape, geometry);
        } catch (err2) {
          ctx.warnings.push(`${where}\uFF1A\u81EA\u5B9A\u4E49\u51E0\u4F55\u5199\u5165\u5931\u8D25\uFF1A${err2.message}`);
        }
      }
    } else {
      ctx.warnings.push(`${where}\uFF1Acustom \u5F62\u72B6\u7F3A viewBox/path\uFF0C\u5DF2\u6309 rect \u5904\u7406`);
    }
  } else if (Array.isArray(element.adjustments) && element.adjustments.length > 0) {
    ctx.warnings.push(`${where}\uFF1A\u5F62\u72B6 adjustments \u6682\u4E0D\u652F\u6301\uFF0C\u6309\u9884\u8BBE\u9ED8\u8BA4\u503C\u7ED8\u5236`);
  }
  applyFill(shape, element.fill, resolver, ctx, where);
  applyBorder(shape, element.border, resolver);
  applyShadow(shape, element.shadow, resolver);
  applyCommonGeometry(shape, element, ctx, where);
  return shape;
}
function buildPlaceholder(slide, element, resolver, ctx, fonts) {
  const where = `\u5360\u4F4D\u5143\u7D20 ${String(element.elementId)}`;
  const shapeName = typeof element.shapeName === "string" ? element.shapeName : "rect";
  const [x, y, w, h] = element.bounds ?? [0, 0, 100, 100];
  const shape = addSlideShape(slide, { preset: shapeName, x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) });
  const fill = element.fill ?? { type: "solid", color: "#E5E7EB" };
  applyFill(shape, fill, resolver, ctx, where);
  const border = element.border ?? { style: "dash", width: 1, color: "#9CA3AF" };
  applyBorder(shape, border, resolver);
  const originalType = typeof element.originalType === "string" ? element.originalType : "unknown";
  const label = typeof element.label === "string" ? element.label : PLACEHOLDER_DEFAULT_LABELS[originalType] ?? PLACEHOLDER_DEFAULT_LABELS.unknown;
  const labelStyle = element.labelStyle ?? {};
  const fontSize = typeof labelStyle.fontSize === "number" ? labelStyle.fontSize : 14;
  const color = resolver.color(labelStyle.color) ?? "#4B5563";
  const alignPair = Array.isArray(labelStyle.align) ? labelStyle.align : ["center", "middle"];
  applyTextBodyProps(
    shape,
    { align: alignPair, wrap: true, font: {} },
    ctx.warnings,
    where
  );
  setShapeParagraphs(shape, [
    {
      align: ALIGN_MAP[alignPair[0]] ?? "center",
      runs: [{ text: label, format: { size: fontSize, color } }]
    }
  ]);
  fonts.add("default");
  applyCommonGeometry(shape, element, ctx, where);
  return shape;
}
function buildImage(slide, element, resolver, ctx, bytes) {
  const where = `\u5143\u7D20 ${String(element.elementId)}`;
  const [x, y, w, h] = element.bounds ?? [0, 0, 100, 100];
  if (!bytes) {
    ctx.warnings.push(`${where}\uFF1A\u56FE\u7247\u7D20\u6750\u4E0D\u53EF\u7528\uFF0C\u843D\u4E3A\u7070\u5E95\u5360\u4F4D`);
    return buildPlaceholder(
      slide,
      {
        ...element,
        originalType: "unknown",
        label: `\u56FE\u7247\u7F3A\u5931\uFF1A${String(element.src)}`
      },
      resolver,
      ctx,
      /* @__PURE__ */ new Set()
    );
  }
  const fit = element.fit?.mode;
  const engineFit = fit === "contain" ? "contain" : "fill";
  if (fit === "cover" || fit === void 0) {
  }
  const shape = addSlideImage(slide, bytes, { x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h), fit: engineFit });
  const crop = element.crop;
  if (crop) {
    setShapeImageCrop(shape, {
      left: crop.left ?? 0,
      top: crop.top ?? 0,
      right: crop.right ?? 0,
      bottom: crop.bottom ?? 0
    });
  }
  const cropShape = element.cropShape;
  if (cropShape && typeof cropShape.shapeName === "string" && cropShape.shapeName !== "rect") {
    if (cropShape.shapeName === "custom") {
      ctx.warnings.push(`${where}\uFF1AcropShape custom \u6682\u4E0D\u652F\u6301\uFF0C\u5DF2\u6309\u77E9\u5F62\u88C1\u526A`);
    } else {
      try {
        setShapePreset(shape, cropShape.shapeName);
      } catch {
        ctx.warnings.push(`${where}\uFF1AcropShape ${String(cropShape.shapeName)} \u4E0D\u662F\u5408\u6CD5\u9884\u8BBE\u5F62\u72B6`);
      }
    }
  }
  if (typeof element.opacity === "number" && element.opacity < 1) {
    try {
      setShapeImageOpacity(shape, Math.max(0, Math.min(1, element.opacity)));
    } catch {
      ctx.warnings.push(`${where}\uFF1A\u56FE\u7247\u900F\u660E\u5EA6\u8BBE\u7F6E\u5931\u8D25`);
    }
  }
  applyBorder(shape, element.border, resolver);
  applyShadow(shape, element.shadow, resolver);
  applyCommonGeometry(shape, element, ctx, where);
  return shape;
}
function buildLine(slide, element, resolver, ctx) {
  const where = `\u5143\u7D20 ${String(element.elementId)}`;
  const pointsRaw = typeof element.points === "string" ? element.points : "";
  const pts = pointsRaw.trim().split(/\s+/).map((pair) => pair.split(",").map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite));
  if (pts.length < 2) {
    ctx.warnings.push(`${where}\uFF1Aline \u81F3\u5C11\u9700\u8981 2 \u4E2A\u70B9\uFF0C\u5DF2\u8DF3\u8FC7`);
    return null;
  }
  const viewBox = element.viewBox ?? [100, 100];
  const [x, y, w, h] = element.bounds ?? [0, 0, viewBox[0], viewBox[1]];
  const sx = w / (viewBox[0] || 1);
  const sy = h / (viewBox[1] || 1);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const shape = addSlideLine(slide, {
    from: { x: toEmu(x + first[0] * sx), y: toEmu(y + first[1] * sy) },
    to: { x: toEmu(x + last[0] * sx), y: toEmu(y + last[1] * sy) }
  });
  if (pts.length > 2) {
    ctx.warnings.push(`${where}\uFF1A\u591A\u6BB5/\u66F2\u7EBF line \u6682\u4EE5\u9996\u5C3E\u76F4\u7EBF\u8FD1\u4F3C\uFF08${pts.length} \u70B9 \u2192 2 \u70B9\uFF09`);
  }
  const border = element.border;
  if (border) applyBorder(shape, border, resolver);
  const arrows = Array.isArray(element.arrow) ? element.arrow : null;
  if (arrows) {
    const map = { arrow: "triangle", stealth: "stealth", diamond: "diamond", oval: "oval" };
    const [head, tail] = [arrows[0] ?? null, arrows[1] ?? null];
    if (head && map[head]) setShapeStrokeArrow(shape, "head", { type: map[head] });
    if (tail && map[tail]) setShapeStrokeArrow(shape, "tail", { type: map[tail] });
  }
  applyShadow(shape, element.shadow, resolver);
  applyCommonGeometry(shape, element, ctx, where);
  return shape;
}
function buildTable(slide, element, resolver, theme, ctx, fonts) {
  const where = `\u5143\u7D20 ${String(element.elementId)}`;
  const rowsRaw = Array.isArray(element.rows) ? element.rows : [];
  if (rowsRaw.length === 0) {
    ctx.warnings.push(`${where}\uFF1A\u8868\u683C\u65E0\u884C\uFF0C\u5DF2\u8DF3\u8FC7`);
    return null;
  }
  const columnWidths = Array.isArray(element.columnWidths) ? element.columnWidths : null;
  const rowHeights = Array.isArray(element.rowHeights) ? element.rowHeights : null;
  const cols = columnWidths?.length ?? Math.max(...rowsRaw.map((r) => r.length));
  const [x, y, w, h] = element.bounds ?? [0, 0, 400, 200];
  const tableStyle = resolveTableStyle(element.style, theme);
  const shape = addSlideTable(slide, {
    x: toEmu(x),
    y: toEmu(y),
    w: toEmu(w),
    h: toEmu(h),
    rows: rowsRaw.map((row) => row.map((cell) => cellTextOf(cell))),
    colWidths: (columnWidths ?? new Array(cols).fill(1 / cols)).map((f) => toEmu(w * f)),
    rowHeights: (rowHeights ?? new Array(rowsRaw.length).fill(1 / rowsRaw.length)).map((f) => toEmu(h * f)),
    firstRow: tableStyle?.firstRowStyle !== void 0,
    bandRow: tableStyle?.bandRow === true
  });
  applyTableCells(shape, rowsRaw, tableStyle, resolver, theme, ctx, fonts, where);
  applyCommonGeometry(shape, element, ctx, where);
  if (typeof element.rotation === "number" && element.rotation !== 0) {
    ctx.warnings.push(`${where}\uFF1APPT \u539F\u751F\u8868\u683C\u4E0D\u652F\u6301\u65CB\u8F6C\uFF0C\u5DF2\u5FFD\u7565 rotation`);
  }
  return shape;
}
function cellTextOf(cell) {
  if (!cell) return "";
  return typeof cell.text === "string" ? cell.text : "";
}
function resolveTableStyle(style, theme) {
  if (typeof style === "string" && style.startsWith("$")) {
    const hit = theme?.tableStyles?.[style.slice(1)];
    return hit ?? null;
  }
  if (style && typeof style === "object") return style;
  return null;
}
function applyTableCells(table, rows, style, resolver, theme, ctx, fonts, where) {
  const merges = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const cell = rows[r][c];
      if (!cell) continue;
      if ((cell.rowSpan ?? 1) > 1 || (cell.colSpan ?? 1) > 1) {
        merges.push({ row: r, col: c, rowSpan: cell.rowSpan ?? 1, colSpan: cell.colSpan ?? 1 });
      }
    }
  }
  for (const merge of merges) {
    try {
      mergeTableCells(table, merge, { coveredText: "keep" });
    } catch (err2) {
      ctx.warnings.push(`${where}\uFF1A\u5408\u5E76\u5355\u5143\u683C (${merge.row},${merge.col}) \u5931\u8D25\uFF1A${err2.message}`);
    }
  }
  const { getTableCell: getTableCell3 } = tableApi;
  const lastRow = rows.length - 1;
  for (let r = 0; r < rows.length; r++) {
    const lastCol = rows[r].length - 1;
    for (let c = 0; c < rows[r].length; c++) {
      const cell = rows[r][c];
      if (!cell) continue;
      const handle = getTableCell3(table, r, c);
      const category = categoryStyleOf(style, r, c, lastRow, lastCol);
      const baseStyle = { ...style?.cellStyle ?? {}, ...category ?? {} };
      const textStyleRef = typeof cell.textStyle === "string" && cell.textStyle.startsWith("$") ? theme?.textStyles?.[cell.textStyle.slice(1)] : void 0;
      const fill = cell.fill ?? baseStyle.fill;
      if (fill && fill.type === "solid") {
        const color = resolver.color(fill.color);
        if (color) setTableCellFill(handle, color);
      }
      const text = typeof cell.text === "string" ? cell.text : "";
      const merged = { ...baseStyle, ...textStyleRef ?? {}, ...cell };
      const content = resolveContent(merged, theme, resolver, fonts, ctx.warnings, `${where} \u5355\u5143\u683C(${r},${c})`);
      const parsed = parseRichText(text);
      const specs = richRunsToSpecs(parsed.paragraphs, content, resolver, fonts);
      setTableCellParagraphs(handle, specs);
      applyParagraphBullets(handle, parsed.paragraphs);
      const anchor = content.align[1] ?? "middle";
      setTableCellAnchor(handle, anchor === "top" ? "top" : anchor === "bottom" ? "bottom" : "center");
      applyCellBorders(handle, cell.border ?? baseStyle.border, resolver, ctx, `${where} \u5355\u5143\u683C(${r},${c})`);
    }
  }
}
function categoryStyleOf(style, r, c, lastRow, lastCol) {
  if (!style) return null;
  const rowStyle = r === 0 ? style.firstRowStyle : r === lastRow ? style.lastRowStyle : style.bodyStyles?.[(r - 1) % (style.bodyStyles.length || 1)];
  const colStyle = c === 0 ? style.firstColumnStyle : c === lastCol ? style.lastColumnStyle : null;
  const rowOverColumn = style.rowOverColumn !== false;
  const merged = rowOverColumn ? { ...colStyle ?? {}, ...rowStyle ?? {} } : { ...rowStyle ?? {}, ...colStyle ?? {} };
  return Object.keys(merged).length > 0 ? merged : null;
}
function applyCellBorders(handle, spec, resolver, ctx, where) {
  if (spec === void 0) return;
  const cell = handle;
  if (spec === null) {
    setTableCellBorders(cell, null);
    return;
  }
  const one = (b) => {
    if (!b || typeof b !== "object") return null;
    const rec = b;
    const color = resolver.color(rec.color) ?? "#000000";
    const width = typeof rec.width === "number" ? rec.width : 1;
    const dash = rec.style === "dash" ? "dash" : rec.style === "dot" ? "sysDot" : "solid";
    return { color: String(color), widthEmu: toEmu(width), dash };
  };
  try {
    if (Array.isArray(spec)) {
      const [tb, lr, b22, l2] = [spec[0], spec[1], spec[2], spec[3]];
      if (spec.length === 2) {
        setTableCellBorders(cell, { top: one(tb), bottom: one(tb), left: one(lr), right: one(lr) });
      } else if (spec.length === 4) {
        setTableCellBorders(cell, { top: one(tb), right: one(lr), bottom: one(b22), left: one(l2) });
      } else {
        ctx.warnings.push(`${where}\uFF1ABorderSpec \u6570\u7EC4\u957F\u5EA6\u987B\u4E3A 2 \u6216 4`);
      }
    } else if (typeof spec === "object" && spec !== null) {
      const b = one(spec);
      if (b) setTableCellBorders(cell, { top: b, right: b, bottom: b, left: b });
    }
  } catch (err2) {
    ctx.warnings.push(`${where}\uFF1A\u5355\u5143\u683C\u8FB9\u6846\u8BBE\u7F6E\u5931\u8D25\uFF1A${err2.message}`);
  }
}
var tableApi = { getTableCell };
function buildChart(slide, element, resolver, ctx) {
  const where = `\u5143\u7D20 ${String(element.elementId)}`;
  const data = element.data;
  const series = Array.isArray(element.series) ? element.series : [];
  if (!data?.cols || !Array.isArray(data.rows) || series.length === 0) {
    ctx.warnings.push(`${where}\uFF1A\u56FE\u8868\u7F3A data/series\uFF0C\u5DF2\u8DF3\u8FC7`);
    return null;
  }
  const [x, y, w, h] = element.bounds ?? [0, 0, 400, 300];
  const supported = /* @__PURE__ */ new Set(["bar", "line", "area", "pie"]);
  const firstType = String(series[0]?.type ?? "");
  if (!supported.has(firstType)) {
    ctx.warnings.push(`${where}\uFF1A\u56FE\u8868\u7C7B\u578B ${firstType} \u6682\u4E0D\u652F\u6301\uFF08PR1 \u6700\u5C0F\u96C6 bar/line/area/pie\uFF09\uFF0C\u843D\u4E3A\u5360\u4F4D`);
    return buildPlaceholder(slide, { ...element, originalType: "chart" }, resolver, ctx, /* @__PURE__ */ new Set());
  }
  const spec = chartSpecOf(element, data, series, resolver, ctx, where);
  if (!spec) return null;
  const shape = addSlideChartSafe(slide, { spec, x: toEmu(x), y: toEmu(y), w: toEmu(w), h: toEmu(h) });
  applyCommonGeometry(shape, element, ctx, where);
  return shape;
}
function chartSpecOf(element, data, series, resolver, ctx, where) {
  const cols = data.cols;
  const colIndex = (name2) => typeof name2 === "string" ? cols.indexOf(name2) : -1;
  const firstType = String(series[0]?.type ?? "");
  if (firstType === "pie") {
    const s0 = series[0];
    const encode = s0.encode ?? {};
    const catIdx = colIndex(encode.category);
    const valIdx = colIndex(encode.value);
    if (catIdx < 0 || valIdx < 0) {
      ctx.warnings.push(`${where}\uFF1Apie \u56FE\u8868 encode.category/value \u672A\u547D\u4E2D data.cols`);
      return null;
    }
    return {
      kind: "pie",
      categories: data.rows.map((r) => String(r[catIdx] ?? "")),
      series: [
        {
          name: typeof s0.name === "string" ? s0.name : String(encode.value ?? ""),
          values: data.rows.map((r) => numOrNull(r[valIdx]))
        }
      ]
    };
  }
  const kind = firstType === "bar" ? "column" : firstType;
  const mappedSeries = series.map((s) => {
    const encode = s.encode ?? {};
    const xIdx2 = colIndex(encode.x);
    const yIdx = colIndex(encode.y);
    if (xIdx2 < 0 || yIdx < 0) {
      ctx.warnings.push(`${where}\uFF1A\u7CFB\u5217 ${String(s.name ?? "?")} \u7684 encode \u672A\u547D\u4E2D data.cols`);
      return null;
    }
    const out = {
      name: typeof s.name === "string" ? s.name : String(encode.y ?? ""),
      values: data.rows.map((r) => numOrNull(r[yIdx]))
    };
    const fill = typeof s.fill === "string" ? resolver.color(s.fill) : void 0;
    if (fill !== void 0) out.color = String(fill);
    if (firstType === "line" || firstType === "area") out.chartKind = firstType;
    return { out, xIdx: xIdx2 };
  });
  if (mappedSeries.some((s) => s === null)) return null;
  const xIdx = mappedSeries[0].xIdx;
  return {
    kind,
    categories: data.rows.map((r) => String(r[xIdx] ?? "")),
    series: mappedSeries.map((s) => s.out)
  };
}
function numOrNull(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}
var addSlideChartSafe = addSlideChart;
function svgPathToCustomGeometry(path17, viewBox, ctx, where) {
  const tokens = path17.match(/[MmLlHhVvCcSsQqZzAa]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g);
  if (!tokens) return null;
  const paths = [];
  let commands = [];
  let cx = 0;
  let cy = 0;
  let i = 0;
  let cmd = "";
  const num = () => Number(tokens[i++]);
  const pushMove = (x, y) => commands.push({ kind: "moveTo", pt: { x, y } });
  const pushLine = (x, y) => commands.push({ kind: "lnTo", pt: { x, y } });
  const pushCubic = (x1, y1, x2, y2, x, y) => commands.push({ kind: "cubicBezTo", pts: [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x, y }] });
  const flush = () => {
    if (commands.length > 0) paths.push({ w: viewBox[0], h: viewBox[1], commands });
    commands = [];
  };
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[A-Za-z]$/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") {
        commands.push({ kind: "close" });
        continue;
      }
      if (cmd === "A" || cmd === "a") {
        ctx.warnings.push(`${where}\uFF1ASVG \u5F27\u7EBF\u547D\u4EE4 A \u6682\u4E0D\u652F\u6301\uFF0C\u8BE5\u6BB5\u5DF2\u8DF3\u8FC7`);
      }
    }
    const rel = cmd === cmd.toLowerCase();
    const op = cmd.toUpperCase();
    try {
      if (op === "M") {
        const x = num();
        const y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        if (commands.length > 0) flush();
        pushMove(cx, cy);
        cmd = rel ? "l" : "L";
      } else if (op === "L") {
        const x = num();
        const y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        pushLine(cx, cy);
      } else if (op === "H") {
        const x = num();
        cx = rel ? cx + x : x;
        pushLine(cx, cy);
      } else if (op === "V") {
        const y = num();
        cy = rel ? cy + y : y;
        pushLine(cx, cy);
      } else if (op === "C") {
        const x1 = num();
        const y1 = num();
        const x2 = num();
        const y2 = num();
        const x = num();
        const y = num();
        const p1 = rel ? { x: cx + x1, y: cy + y1 } : { x: x1, y: y1 };
        const p2 = rel ? { x: cx + x2, y: cy + y2 } : { x: x2, y: y2 };
        const p = rel ? { x: cx + x, y: cy + y } : { x, y };
        pushCubic(p1.x, p1.y, p2.x, p2.y, p.x, p.y);
        cx = p.x;
        cy = p.y;
      } else if (op === "S" || op === "Q") {
        ctx.warnings.push(`${where}\uFF1ASVG \u547D\u4EE4 ${op} \u6682\u4E0D\u652F\u6301\uFF0C\u5DF2\u4E2D\u65AD\u8DEF\u5F84\u89E3\u6790`);
        break;
      } else if (op === "A") {
        i += 7;
      } else {
        break;
      }
    } catch {
      ctx.warnings.push(`${where}\uFF1ASVG \u8DEF\u5F84\u89E3\u6790\u4E2D\u65AD`);
      break;
    }
  }
  flush();
  if (paths.length === 0) return null;
  return { paths };
}
function applyAnimations(slide, page, shapes, animationsMode, ctx, pageLabel) {
  if (animationsMode === "off" || !Array.isArray(page.animations)) return { written: 0, skipped: 0 };
  let written = 0;
  let skipped = 0;
  const triggerMap = { onClick: "click", withPrevious: "withPrevious", afterPrevious: "afterPrevious" };
  for (const anim of page.animations) {
    if (anim.effect === null || anim.effect === void 0) {
      skipped++;
      ctx.warnings.push(`${pageLabel}\uFF1A\u672A\u5EFA\u6A21\u52A8\u753B\u6B65\u9AA4\uFF08${String(anim.originalEffect ?? "unknown")}\uFF09\u5BFC\u51FA\u65F6\u8DF3\u8FC7`);
      continue;
    }
    const shape = shapes.get(anim.elementId);
    if (!shape) {
      skipped++;
      ctx.warnings.push(`${pageLabel}\uFF1A\u52A8\u753B\u76EE\u6807 ${anim.elementId} \u672A\u5EFA\u51FA\u5F62\u72B6\uFF0C\u8DF3\u8FC7`);
      continue;
    }
    try {
      setShapeAnimation(shape, {
        effect: anim.effect,
        start: triggerMap[anim.trigger ?? "onClick"],
        ...anim.durationMs != null ? { durationMs: anim.durationMs } : {},
        ...anim.delayMs != null ? { delayMs: anim.delayMs } : {},
        ...anim.build !== void 0 ? { build: anim.build } : {},
        ...anim.direction !== void 0 ? { direction: anim.direction } : {},
        ...anim.orientation !== void 0 ? { orientation: anim.orientation } : {},
        ...anim.inOut !== void 0 ? { inOut: anim.inOut } : {},
        ...anim.shape !== void 0 ? { shape: anim.shape } : {},
        ...anim.spokes !== void 0 ? { spokes: anim.spokes } : {},
        ...anim.spinDirection !== void 0 ? { spinDirection: anim.spinDirection } : {},
        ...anim.spinDegrees !== void 0 ? { spinDegrees: anim.spinDegrees } : {},
        ...anim.scaleDirection !== void 0 ? { scaleDirection: anim.scaleDirection } : {},
        ...anim.scalePercent !== void 0 ? { scalePercent: anim.scalePercent } : {},
        ...anim.transparencyPercent !== void 0 ? { transparencyPercent: anim.transparencyPercent } : {},
        ...anim.color !== void 0 ? { color: animColorOf(anim.color) } : {}
      });
      written++;
    } catch (err2) {
      skipped++;
      ctx.warnings.push(`${pageLabel}\uFF1A\u52A8\u753B ${anim.effect}@${anim.elementId} \u5199\u5165\u5931\u8D25\uFF1A${err2.message}`);
    }
  }
  return { written, skipped };
}
function animColorOf(color) {
  if (typeof color === "string") return color;
  if (color && typeof color === "object" && "color" in color) {
    const rec = color;
    return { color: rec.color, ...Array.isArray(rec.colorTransforms) ? { colorTransforms: rec.colorTransforms } : {} };
  }
  return void 0;
}
function applyTransition(slide, transition, ctx, pageLabel) {
  if (transition.unmodeled === true) {
    ctx.warnings.push(`${pageLabel}\uFF1A\u672A\u5EFA\u6A21\u8F6C\u573A ${transition.effect}\uFF0C\u5BFC\u51FA\u65F6\u8DF3\u8FC7`);
    return false;
  }
  const options = {
    effect: transition.effect,
    ...transition.speed !== void 0 ? { speed: transition.speed } : {},
    ...transition.durationMs !== void 0 ? { durationMs: transition.durationMs } : {},
    ...transition.direction !== void 0 ? { direction: transition.direction } : {},
    ...transition.spokes !== void 0 ? { spokes: transition.spokes } : {},
    ...transition.orientation !== void 0 ? { orientation: transition.orientation } : {},
    ...transition.thruBlack !== void 0 ? { thruBlack: transition.thruBlack } : {},
    ...transition.pattern !== void 0 ? { pattern: transition.pattern } : {},
    ...transition.isContent !== void 0 ? { isContent: transition.isContent } : {},
    ...transition.isInverted !== void 0 ? { isInverted: transition.isInverted } : {},
    ...transition.hasBounce !== void 0 ? { hasBounce: transition.hasBounce } : {},
    ...transition.preset !== void 0 ? { preset: transition.preset } : {},
    ...transition.invertX !== void 0 ? { invertX: transition.invertX } : {},
    ...transition.invertY !== void 0 ? { invertY: transition.invertY } : {},
    ...transition.morphOption !== void 0 ? { morphOption: transition.morphOption } : {},
    ...transition.advanceOnClick !== void 0 ? { advanceOnClick: transition.advanceOnClick } : {},
    ...transition.advanceAfterMs !== void 0 ? { advanceAfterMs: transition.advanceAfterMs } : {}
  };
  try {
    setSlideTransition(slide, options);
    return true;
  } catch (err2) {
    ctx.warnings.push(`${pageLabel}\uFF1A\u8F6C\u573A ${transition.effect} \u5199\u5165\u5931\u8D25\uFF1A${err2.message}`);
    return false;
  }
}
async function applyBackground(slide, background, resolver, ctx, where) {
  if (background === void 0 || background === null) return;
  if (!background || typeof background !== "object") {
    ctx.warnings.push(`${where}\uFF1Abackground \u5FC5\u987B\u662F Fill \u5BF9\u8C61`);
    return;
  }
  const fill = background;
  if (fill.type === "solid") {
    const color = resolver.color(fill.color);
    if (color) setSlideBackground(slide, color);
  } else if (fill.type === "gradient") {
    const stops = (Array.isArray(fill.stops) ? fill.stops : []).map((s) => {
      const rec = s;
      const color = resolver.color(rec.color);
      return typeof rec.position === "number" && color !== void 0 ? { offset: rec.position, color } : null;
    }).filter((s) => s !== null);
    if (stops.length >= 2) {
      if (fill.gradientType === "radial") ctx.warnings.push(`${where}\uFF1A\u5F84\u5411\u6E10\u53D8\u80CC\u666F\u6682\u4E0D\u652F\u6301\uFF0C\u6309\u7EBF\u6027\u5904\u7406`);
      setSlideBackgroundGradientFill(slide, {
        stops,
        angleDeg: typeof fill.angle === "number" ? fill.angle : 0
      });
    } else {
      ctx.warnings.push(`${where}\uFF1A\u6E10\u53D8\u80CC\u666F\u81F3\u5C11\u9700\u8981 2 \u4E2A\u8272\u6807`);
    }
  } else if (fill.type === "image") {
    const bytes = await preloadImageBytes(fill.src, ctx, where);
    if (bytes) setSlideBackgroundImage(slide, bytes);
  } else {
    ctx.warnings.push(`${where}\uFF1A\u672A\u77E5\u80CC\u666F\u7C7B\u578B ${String(fill.type)}`);
  }
}
var THEME_COLOR_SLOTS = [
  "dark1",
  "light1",
  "dark2",
  "light2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hyperlink",
  "followedHyperlink"
];
function applyDeckTheme(pres, theme, warnings) {
  if (theme === void 0) return;
  const familyOf = (key) => {
    const fam = theme.textStyles?.[key]?.fontFamily;
    if (typeof fam === "string") {
      const parts = splitFontStack(fam);
      return parts.length > 0 ? { latin: parts[0], ea: parts.length > 1 ? parts[1] : parts[0] } : {};
    }
    if (fam && typeof fam === "object") {
      const rec = fam;
      return {
        ...typeof rec.latin === "string" ? { latin: rec.latin } : {},
        ...typeof rec.ea === "string" ? { ea: rec.ea } : {}
      };
    }
    return {};
  };
  const title = familyOf("title");
  const body = familyOf("body");
  const fontsInput = {
    ...title.latin !== void 0 ? { majorLatin: title.latin } : {},
    ...title.ea !== void 0 ? { majorEastAsian: title.ea } : {},
    ...body.latin !== void 0 ? { minorLatin: body.latin } : {},
    ...body.ea !== void 0 ? { minorEastAsian: body.ea } : {}
  };
  if (Object.keys(fontsInput).length > 0) {
    try {
      setPresentationFonts(pres, fontsInput);
    } catch (err2) {
      warnings.push(`\u4E3B\u9898\u5B57\u4F53\u65B9\u6848\u5199\u5165\u5931\u8D25\uFF1A${err2.message}`);
    }
  }
  const colors = theme.colors ?? {};
  const slots = {};
  for (const key of THEME_COLOR_SLOTS) {
    const value = colors[key];
    if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) slots[key] = value;
  }
  if (Object.keys(slots).length > 0) {
    try {
      setPresentationTheme(pres, slots);
    } catch (err2) {
      warnings.push(`\u4E3B\u9898\u8272\u65B9\u6848\u5199\u5165\u5931\u8D25\uFF1A${err2.message}`);
    }
  }
}
function createOfficeKitEngine() {
  return {
    async buildDeck(model, ctx) {
      const { deck, pages } = model;
      const warnings = ctx.warnings;
      const fonts = /* @__PURE__ */ new Set();
      const resolver = new ThemeResolver(deck.theme);
      const size = Array.isArray(deck.size) ? deck.size : [960, 540];
      const ratio = size[0] / (size[1] || 1);
      const pres = createPresentation({ size: Math.abs(ratio - 4 / 3) < 0.01 ? "4:3" : "16:9" });
      setSlideSize(pres, { width: toEmu(size[0]), height: toEmu(size[1]) });
      applyDeckTheme(pres, deck.theme, warnings);
      const exportCfg = deck.export ?? {};
      const transitionMode = exportCfg.transition ?? "fade";
      const animationsMode = exportCfg.animations ?? "auto";
      const profile = deck.profile ?? "generate";
      const slides = [];
      const shapesPerPage = /* @__PURE__ */ new Map();
      const stats = {
        transitionPages: 0,
        animationsWritten: 0,
        animationsSkipped: 0
      };
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        const pageLabel = `\u7B2C ${pageIndex + 1} \u9875`;
        const slide = addBlankSlide(pres);
        clearSlideShapes(slide);
        slides.push(slide);
        const shapeMap = /* @__PURE__ */ new Map();
        shapesPerPage.set(pageIndex, shapeMap);
        await applyBackground(slide, page.background, resolver, ctx, pageLabel);
        for (const element of page.elements) {
          await preloadFillBytes(element, ctx);
        }
        for (const element of page.elements) {
          const record = element;
          const type = record.elementType;
          let shape = null;
          try {
            switch (type) {
              case "text":
                shape = buildText(slide, record, resolver, deck.theme, ctx, fonts);
                break;
              case "shape":
                shape = buildShape(slide, record, resolver, ctx);
                break;
              case "placeholder":
                shape = buildPlaceholder(slide, record, resolver, ctx, fonts);
                break;
              case "image": {
                const bytes = await preloadImageBytes(record.src, ctx, `\u5143\u7D20 ${String(record.elementId)}`);
                shape = buildImage(slide, record, resolver, ctx, bytes);
                break;
              }
              case "line":
                shape = buildLine(slide, record, resolver, ctx);
                break;
              case "table":
                shape = buildTable(slide, record, resolver, deck.theme, ctx, fonts);
                break;
              case "chart":
                shape = buildChart(slide, record, resolver, ctx);
                break;
              case "icon":
                warnings.push(`${pageLabel}\uFF1Aicon \u5143\u7D20\uFF08${String(record.iconName)}\uFF09\u6682\u4E0D\u652F\u6301\uFF0C\u843D\u4E3A\u5360\u4F4D`);
                shape = buildPlaceholder(slide, { ...record, originalType: "unknown", label: `\u56FE\u6807\uFF1A${String(record.iconName)}` }, resolver, ctx, fonts);
                break;
              default:
                warnings.push(`${pageLabel}\uFF1A\u672A\u77E5\u5143\u7D20\u7C7B\u578B ${String(type)}\uFF0C\u5DF2\u8DF3\u8FC7`);
            }
          } catch (err2) {
            warnings.push(`${pageLabel}\uFF1A\u5143\u7D20 ${String(record.elementId)}\uFF08${String(type)}\uFF09\u6784\u5EFA\u5931\u8D25\uFF1A${err2.message}`);
            shape = null;
          }
          if (shape) shapeMap.set(String(record.elementId), shape);
        }
        if (typeof page.notes === "string" && page.notes !== "") setSlideNotes(slide, page.notes);
        if (profile === "reverse" && page.hidden === true) setSlideHidden(slide, true);
        if (transitionMode !== "none") {
          if (profile === "reverse" && page.transition) {
            if (applyTransition(slide, page.transition, ctx, pageLabel)) stats.transitionPages++;
          } else {
            try {
              setSlideTransition(slide, { effect: "fade", speed: "fast", advanceOnClick: true });
              stats.transitionPages++;
            } catch (err2) {
              warnings.push(`${pageLabel}\uFF1A\u9ED8\u8BA4\u6DE1\u5165\u8F6C\u573A\u5199\u5165\u5931\u8D25\uFF1A${err2.message}`);
            }
          }
        }
        const anim = applyAnimations(slide, page, shapeMap, animationsMode, ctx, pageLabel);
        stats.animationsWritten += anim.written;
        stats.animationsSkipped += anim.skipped;
      }
      return {
        native: pres,
        slides,
        shapes: shapesPerPage,
        warnings,
        fontsUsed: [...fonts].filter((f) => f !== "default")
      };
    },
    async saveDeck(native) {
      return savePresentation(native);
    }
  };
}
async function preloadFillBytes(element, ctx) {
  const candidates = [element.fill];
  for (const fill of candidates) {
    if (fill && fill.type === "image" && typeof fill.src === "string" && fill.__bytes === void 0) {
      try {
        fill.__bytes = await ctx.loadMedia(fill.src);
      } catch (err2) {
        ctx.warnings.push(`\u5143\u7D20 ${String(element.elementId)}\uFF1A\u586B\u5145\u7D20\u6750\u52A0\u8F7D\u5931\u8D25 ${fill.src}\uFF1A${err2.message}`);
      }
    }
  }
}

// src/core/review/index.ts
import {
  findOverlappingShapePairs,
  findShapesOutsideCanvas,
  getShapeFillColorResolved,
  getShapeName,
  getShapeText,
  getSlideShapes,
  getSlides,
  resolveDeckBodyTextColor,
  validatePresentation
} from "@office-kit/pptx";
import { auditTextLayout } from "@office-kit/pptx-preview";
function relativeLuminance(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(n >> 16 & 255) + 0.7152 * channel(n >> 8 & 255) + 0.0722 * channel(n & 255);
}
function contrastRatio(foreground, background) {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  if (l1 === null || l2 === null) return null;
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
var CONTRAST_THRESHOLD = 3;
function textAuditCategory(issue) {
  return "text-overflow";
}
function describeTextAudit(issue) {
  if (issue.kind === "soft-wrap") {
    return `\u6BB5\u843D ${issue.paragraphIndex + 1} \u81EA\u884C\u6362\u884C ${issue.extraLines} \u884C\uFF08\u8D85\u51FA\u663E\u5F0F\u6362\u884C\u610F\u56FE\uFF09`;
  }
  const axis = issue.kind === "overflow-x" ? "\u6C34\u5E73" : "\u5782\u76F4";
  return `\u6587\u5B57${axis}\u6EA2\u51FA ${issue.overflowPx.toFixed(1)}px`;
}
function reviewDeck(pres, options = {}) {
  const issues = [];
  const slides = getSlides(pres);
  const pageFilter = options.pages ? new Set(options.pages) : null;
  const threshold = options.contrastThreshold ?? CONTRAST_THRESHOLD;
  for (const v of validatePresentation(pres)) {
    issues.push({
      page: 0,
      severity: v.severity === "error" ? "blocker" : "warning",
      category: "structure",
      description: v.message,
      ...v.partName !== void 0 ? { elementId: String(v.partName) } : {}
    });
  }
  const audits = auditTextLayout(pres, { reportSoftWraps: options.reportSoftWraps === true });
  for (const issue of audits) {
    const page = issue.slideIndex + 1;
    if (pageFilter && !pageFilter.has(page)) continue;
    const gross = issue.kind === "soft-wrap" ? issue.extraLines >= 2 : issue.overflowPx >= 4;
    issues.push({
      page,
      severity: issue.approximate && !gross ? "warning" : "blocker",
      category: textAuditCategory(issue),
      ...issue.shapeName !== null ? { elementId: issue.shapeName } : {},
      description: describeTextAudit(issue),
      suggestion: "\u7F29\u77ED\u6587\u5B57\u3001\u52A0\u5927\u6587\u672C\u6846\uFF0C\u6216\u8C03\u5C0F\u5B57\u53F7"
    });
  }
  slides.forEach((slide, index) => {
    const page = index + 1;
    if (pageFilter && !pageFilter.has(page)) return;
    for (const shape of findShapesOutsideCanvas(slide, pres)) {
      issues.push({
        page,
        severity: "blocker",
        category: "out-of-canvas",
        elementId: getShapeName(shape),
        description: "\u5F62\u72B6\u8D85\u51FA\u753B\u5E03\u8FB9\u754C",
        suggestion: "\u628A\u5143\u7D20\u79FB\u56DE\u753B\u5E03\u5185\u6216\u8C03\u6574 bounds"
      });
    }
    for (const [a, b] of findOverlappingShapePairs(slide)) {
      issues.push({
        page,
        severity: "warning",
        category: "overlap",
        elementId: `${getShapeName(a)} / ${getShapeName(b)}`,
        description: "\u4E24\u4E2A\u5F62\u72B6\u7684\u5305\u56F4\u76D2\u91CD\u53E0",
        suggestion: "\u786E\u8BA4\u662F\u5426\u4E3A\u6709\u610F\u5C42\u53E0\uFF1B\u5426\u5219\u9519\u5F00\u4F4D\u7F6E"
      });
    }
    const bodyColor = bodyTextColorOf(slide);
    if (bodyColor) {
      for (const shape of shapesWithText(slide)) {
        const fill = getShapeFillColorResolved(pres, shape);
        if (!fill) continue;
        const ratio = contrastRatio(bodyColor, fill);
        if (ratio !== null && ratio < threshold) {
          issues.push({
            page,
            severity: "warning",
            category: "contrast",
            elementId: getShapeName(shape),
            description: `\u6587\u5B57\u4E0E\u5F62\u72B6\u586B\u5145\u5BF9\u6BD4\u5EA6 ${ratio.toFixed(2)}\uFF08\u9608\u503C ${threshold}\uFF09`,
            suggestion: "\u52A0\u6DF1\u6587\u5B57\u989C\u8272\u6216\u51CF\u6DE1\u586B\u5145\u8272"
          });
        }
      }
    }
  });
  return {
    pass: !issues.some((i) => i.severity === "blocker"),
    issues,
    missingFonts: []
  };
}
function bodyTextColorOf(slide) {
  try {
    return resolveDeckBodyTextColor(slide);
  } catch {
    return null;
  }
}
function shapesWithText(slide) {
  try {
    return getSlideShapes(slide).filter((s) => hasText(s));
  } catch {
    return [];
  }
}
function hasText(shape) {
  try {
    return getShapeText(shape).trim() !== "";
  } catch {
    return false;
  }
}

// src/core/review/ai.ts
import { readFile as readFile3 } from "fs/promises";
import path4 from "path";
import { getShapeText as getShapeText2, getSlideShapes as getSlideShapes2, getSlides as getSlides2 } from "@office-kit/pptx";
var AI_REVIEW_PROMPT_VERSION = "ai-review/v1";
var VALID_SEVERITIES = /* @__PURE__ */ new Set(["suggestion", "polish"]);
var SYSTEM_PROMPT = [
  "\u4F60\u662F\u6F14\u793A\u6587\u7A3F\u89C6\u89C9\u8D28\u68C0\u5458\u3002\u8F93\u5165\u662F\u4E00\u4EFD PPT \u7684\u6700\u7EC8\u6E32\u67D3\u56FE\uFF08\u6BCF\u9875\u4E00\u5F20 PNG\uFF0C\u6309\u9875\u7801\u987A\u5E8F\uFF09\u4E0E\u8BE5\u9875\u7684\u7248\u5F0F\u6307\u6807\u6458\u8981\u3002",
  "\u53EA\u505A\u89C6\u89C9\u5224\u65AD\uFF0C\u4E0D\u8981\u590D\u8FF0\u89C4\u5219\u5C42\u5DF2\u7ECF\u80FD\u67E5\u7684\u4E1C\u897F\uFF08\u6587\u5B57\u6EA2\u51FA\u3001\u51FA\u754C\u3001\u91CD\u53E0\u7531\u89C4\u5219\u5C42\u8D1F\u8D23\uFF09\u3002",
  "\u4F60\u5BA1\u7684\u662F\uFF1A\u914D\u8272\u662F\u5426\u534F\u8C03\u3001\u5C42\u7EA7\u662F\u5426\u6E05\u695A\u3001\u7248\u9762\u662F\u5426\u5E73\u8861\u3001\u56FE\u4E0E\u6587\u662F\u5426\u642D\u914D\u3001\u98CE\u683C\u662F\u5426\u7EDF\u4E00\u3002",
  "\u8F93\u51FA\u6070\u597D\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57\uFF0C\u4E0D\u8981 Markdown \u56F4\u680F\u3002\u7ED3\u6784\uFF1A",
  '{"issues":[{"page":<\u9875\u7801\u6574\u6570>,"severity":"suggestion|polish","category":"<\u7C7B\u522B\u77ED\u8BED>","description":"<\u95EE\u9898\u63CF\u8FF0>","suggestion":"<\u4FEE\u6539\u5EFA\u8BAE>"}]}',
  'severity \u53E3\u5F84\uFF1Asuggestion=\u660E\u663E\u62C9\u4F4E\u89C2\u611F\u3001\u5EFA\u8BAE\u4FEE\u6539\uFF1Bpolish=\u53EF\u9009\u6253\u78E8\u9879\u3002\u6CA1\u6709\u95EE\u9898\u7684\u9875\u4E0D\u8981\u51FA\u6761\u76EE\uFF1B\u6574\u4F53\u6CA1\u6709\u53EF\u8BF4\u7684\u5C31\u8F93\u51FA {"issues":[]}\u3002'
].join("\n");
async function readTextStream(stream) {
  const partials = /* @__PURE__ */ new Map();
  let finished = false;
  for await (const chunk of stream) {
    if (chunk.type === "finish") {
      finished = true;
      const reason = chunk.reason;
      if (reason && reason.kind !== "stop") {
        const code = reason.failure?.code ?? reason.kind ?? "unknown";
        const message = reason.failure?.message ?? "";
        throw new Error(`AI \u8D28\u68C0\u6D41\u4EE5 ${reason.kind} \u7ED3\u675F\uFF08${code}${message ? `\uFF1A${message}` : ""}\uFF09`);
      }
      continue;
    }
    if (finished) continue;
    const index = typeof chunk.index === "number" ? chunk.index : 0;
    const partial = partials.get(index) ?? { blockType: "text", text: "" };
    switch (chunk.type) {
      case "block-start":
        partial.blockType = chunk.blockType ?? "text";
        break;
      case "text-delta":
        partial.blockType = "text";
        partial.text += chunk.text ?? "";
        break;
      case "block-end":
        partial.blockType = chunk.block?.type ?? partial.blockType;
        if (chunk.block?.type === "text" && typeof chunk.block.text === "string") {
          partial.closed = chunk.block.text;
        }
        break;
      default:
        if (chunk.type === "reasoning-delta") partial.blockType = "reasoning";
        break;
    }
    partials.set(index, partial);
  }
  const texts = [];
  for (const index of [...partials.keys()].sort((a, b) => a - b)) {
    const partial = partials.get(index);
    if (!partial || partial.blockType !== "text") continue;
    texts.push(partial.closed ?? partial.text);
  }
  return texts.join("\n");
}
function extractJsonObject(raw) {
  let text = raw.trim();
  const fence = /^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n?```$/m.exec(text);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("AI \u8D28\u68C0\u8F93\u51FA\u91CC\u6CA1\u6709 JSON \u5BF9\u8C61");
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI \u8D28\u68C0\u8F93\u51FA\u4E0D\u662F JSON \u5BF9\u8C61");
  }
  return parsed;
}
function parseAiIssues(raw, validPages) {
  const parsed = extractJsonObject(raw);
  const list = parsed.issues;
  if (!Array.isArray(list)) throw new Error("AI \u8D28\u68C0\u8F93\u51FA\u7F3A issues \u6570\u7EC4");
  const issues = [];
  let dropped = 0;
  for (const entry of list) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      dropped++;
      continue;
    }
    const record = entry;
    const page = record.page;
    const severity = record.severity;
    const category = record.category;
    const description = record.description;
    const suggestion = record.suggestion;
    if (typeof page !== "number" || !Number.isInteger(page) || !validPages.has(page) || typeof severity !== "string" || !VALID_SEVERITIES.has(severity) || typeof category !== "string" || category.trim() === "" || typeof description !== "string" || description.trim() === "" || suggestion !== void 0 && typeof suggestion !== "string") {
      dropped++;
      continue;
    }
    issues.push({
      page,
      severity,
      category: category.trim(),
      description: description.trim(),
      ...typeof suggestion === "string" && suggestion.trim() !== "" ? { suggestion: suggestion.trim() } : {}
    });
  }
  return { issues, dropped };
}
function layoutDigest(pres, pages) {
  const slides = getSlides2(pres);
  const lines = [];
  for (const page of pages) {
    const slide = slides[page - 1];
    if (!slide) continue;
    let shapes = 0;
    let textShapes = 0;
    let chars = 0;
    try {
      for (const shape of getSlideShapes2(slide)) {
        shapes++;
        const text = getShapeText2(shape);
        if (text.trim() !== "") {
          textShapes++;
          chars += text.trim().length;
        }
      }
    } catch {
    }
    lines.push(`\u7B2C ${page} \u9875\uFF1A\u5F62\u72B6 ${shapes} \u4E2A\uFF08\u542B\u6587\u5B57 ${textShapes} \u4E2A\uFF09\uFF0C\u6B63\u6587\u7EA6 ${chars} \u5B57`);
  }
  return lines.join("\n");
}
async function runAiReview(input, deps) {
  const displayPath = deps.toDisplayPath ?? ((p) => p);
  if (!deps.llm || typeof deps.llm.stream !== "function") {
    return { performed: false, reason: "\u5BBF\u4E3B\u672A\u6CE8\u5165 llm \u670D\u52A1\uFF0CAI \u8D28\u68C0\u4E0D\u53EF\u7528" };
  }
  const session = deps.sessionId !== null ? deps.sessions?.get(deps.sessionId) : void 0;
  const route = session?.requestHeader?.()?.config;
  const provider = typeof route?.provider === "string" && route.provider !== "" ? route.provider : null;
  const model = typeof route?.model === "string" && route.model !== "" ? route.model : null;
  if (provider === null || model === null) {
    return {
      performed: false,
      reason: "\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u8DEF\u7531\u8FC7\u7684\u6A21\u578B\uFF08requestHeader.config \u7F3A provider/model\uFF09\uFF0CAI \u8D28\u68C0\u4E0D\u53EF\u7528",
      fallbackImages: input.images.map((img) => ({ page: img.page, path: displayPath(img.absPath) })),
      layoutDigest: layoutDigest(input.pres, input.pages)
    };
  }
  let supportsImage = false;
  try {
    const info = await deps.llm.resolveModelInfo(provider, model, input.signal);
    supportsImage = info.inputModalities?.includes("image") === true;
  } catch {
    supportsImage = false;
  }
  if (!supportsImage || !deps.attachments || typeof deps.attachments.saveImages !== "function") {
    const reason = !supportsImage ? `\u5F53\u524D\u8DEF\u7531 ${provider}/${model} \u672A\u58F0\u660E\u56FE\u50CF\u8F93\u5165\uFF08inputModalities \u4E0D\u542B image\uFF09` : "\u5BBF\u4E3B\u672A\u6CE8\u5165 attachments \u670D\u52A1\uFF0C\u56FE\u7247\u65E0\u6CD5\u5165\u5E93";
    return {
      performed: false,
      reason: `${reason}\uFF1B\u5DF2\u964D\u7EA7\uFF1A\u8BF7\u4E3B\u6A21\u578B\u81EA\u884C read_image \u4E0B\u5217 PNG \u505A\u89C6\u89C9\u590D\u6838`,
      fallbackImages: input.images.map((img) => ({ page: img.page, path: displayPath(img.absPath) })),
      layoutDigest: layoutDigest(input.pres, input.pages)
    };
  }
  const refs = [];
  try {
    const batch = await Promise.all(
      input.images.map(async (img) => ({
        data: new Uint8Array(await readFile3(img.absPath)),
        mediaType: "image/png",
        name: path4.basename(img.absPath)
      }))
    );
    refs.push(...await deps.attachments.saveImages(batch));
  } catch (err2) {
    return {
      performed: false,
      reason: `\u56FE\u7247\u5165\u5E93\u5931\u8D25\uFF08${err2.message}\uFF09\uFF1B\u5DF2\u964D\u7EA7\uFF1A\u8BF7\u4E3B\u6A21\u578B\u81EA\u884C read_image \u4E0B\u5217 PNG`,
      fallbackImages: input.images.map((img) => ({ page: img.page, path: displayPath(img.absPath) })),
      layoutDigest: layoutDigest(input.pres, input.pages)
    };
  }
  const content = [
    {
      type: "text",
      text: [
        `\u4EE5\u4E0B\u662F\u8FD9\u4EFD\u6F14\u793A\u6587\u7A3F\u7B2C ${input.pages.join("\u3001")} \u9875\u7684\u6700\u7EC8\u6E32\u67D3\u56FE\uFF08\u4E0E\u4EA4\u4ED8\u7684 .pptx \u540C\u6E90\uFF09\u3002`,
        "",
        "\u7248\u5F0F\u6307\u6807\u6458\u8981\uFF1A",
        layoutDigest(input.pres, input.pages)
      ].join("\n")
    }
  ];
  input.images.forEach((img, index) => {
    const ref = refs[index];
    content.push({ type: "text", text: `\u7B2C ${img.page} \u9875\u6E32\u67D3\u56FE\uFF1A` });
    content.push({ type: "image", attachment: ref });
  });
  const raw = await readTextStream(
    deps.llm.stream({
      provider,
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      temperature: 0,
      ...input.signal !== void 0 ? { signal: input.signal } : {}
    })
  );
  const { issues, dropped } = parseAiIssues(raw, new Set(input.pages));
  void dropped;
  return {
    performed: true,
    provider,
    model,
    pages: input.pages,
    issues,
    promptVersion: AI_REVIEW_PROMPT_VERSION
  };
}
function aiIssuesAsReviewIssues(result) {
  if (!result.performed) return [];
  return result.issues.map((issue) => ({
    page: issue.page,
    severity: "warning",
    category: "ai-visual",
    description: `[AI/${issue.category}] ${issue.description}`,
    ...issue.suggestion !== void 0 ? { suggestion: issue.suggestion } : {}
  }));
}

// src/core/export-pipeline.ts
import { getSlides as getSlides3 } from "@office-kit/pptx";

// src/core/fonts/embed-pipeline.ts
import { readFile as readFile5 } from "fs/promises";
import path6 from "path";

// src/core/fonts/usage.ts
function collectFontFamily(value, into) {
  if (typeof value === "string" && value !== "") into.add(value);
  else if (value !== null && typeof value === "object") {
    const rec = value;
    if (typeof rec.latin === "string") into.add(rec.latin);
    if (typeof rec.ea === "string") into.add(rec.ea);
  }
}
function slotFrom(bold, italic) {
  if (bold === true && italic === true) return "boldItalic";
  if (bold === true) return "bold";
  if (italic === true) return "italic";
  return "regular";
}
function scanStyle(style, into) {
  const ff = style.fontFamily;
  if (ff === void 0) return;
  const tmp = /* @__PURE__ */ new Set();
  collectFontFamily(ff, tmp);
  const bold = style.bold === true;
  const italic = style.italic === true;
  const slot = slotFrom(bold, italic);
  for (const name2 of tmp) {
    if (!into.has(name2)) into.set(name2, /* @__PURE__ */ new Set());
    into.get(name2).add(slot);
    if (slot !== "regular") into.get(name2).add("regular");
  }
}
function scanText(text, chars) {
  if (typeof text !== "string") return;
  for (const ch of text) {
    if (ch < " " && ch !== "\n" && ch !== "	") continue;
    chars.add(ch);
  }
}
function scanElement(el, fonts, chars) {
  if (el.content && typeof el.content === "object") {
    const content = el.content;
    scanStyle(content, fonts);
    scanText(content.text, chars);
    if (content.richText) scanText(typeof content.richText === "string" ? content.richText : "", chars);
  }
  if (el.textStyle && typeof el.textStyle === "object") scanStyle(el.textStyle, fonts);
  if (el.elementType === "chart") scanChart(el, fonts, chars);
  if (el.elementType === "table" && Array.isArray(el.rows)) scanTable(el.rows, fonts, chars);
  if (typeof el.notes === "string") scanText(el.notes, chars);
}
function scanTable(rows, fonts, chars) {
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (!cell || typeof cell !== "object") continue;
      const c = cell;
      if (c.textStyle && typeof c.textStyle === "object") scanStyle(c.textStyle, fonts);
      scanText(c.text, chars);
    }
  }
}
function scanChart(el, fonts, chars) {
  const scanConfig = (cfg) => {
    if (!cfg || typeof cfg !== "object") return;
    const rec = cfg;
    scanStyle(rec, fonts);
    scanText(rec.text, chars);
    if (rec.label && typeof rec.label === "object") scanConfig(rec.label);
  };
  scanConfig(el.title);
  scanConfig(el.legend);
  scanConfig(el.dataLabel);
  if (Array.isArray(el.axes)) el.axes.forEach(scanConfig);
  scanConfig(el.tooltip);
  if (el.data && typeof el.data === "object") {
    const d = el.data;
    if (Array.isArray(d.rows)) {
      for (const row of d.rows) if (Array.isArray(row)) row.forEach((v) => scanText(String(v ?? ""), chars));
    }
    if (Array.isArray(d.cols)) d.cols.forEach((c) => scanText(String(c ?? ""), chars));
  }
}
function collectFontUsage(deck, pages) {
  const typefaces = /* @__PURE__ */ new Map();
  const chars = /* @__PURE__ */ new Set();
  const textStyles = deck.theme?.textStyles;
  if (textStyles && typeof textStyles === "object") {
    for (const style of Object.values(textStyles)) {
      if (style && typeof style === "object") scanStyle(style, typefaces);
    }
  }
  for (const page of pages) {
    if (typeof page.notes === "string") scanText(page.notes, chars);
    for (const el of page.elements ?? []) {
      scanElement(el, typefaces, chars);
    }
  }
  const charset = [...chars].join("");
  return { typefaces, charset };
}

// src/core/fonts/resolver.ts
import { readdir as readdir3, readFile as readFile4 } from "fs/promises";
import { existsSync } from "fs";
import path5 from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

// src/core/fonts/fsType.ts
var FS_RESTRICTED = 2;
var FS_PREVIEW_PRINT = 4;
var FS_EDITABLE = 8;
var FS_NO_SUBSET = 256;
var FS_BITMAP_ONLY = 512;
function readUint16BE(dv, off) {
  return dv.getUint16(off, false);
}
function readUint32BE(dv, off) {
  return dv.getUint32(off, false);
}
function fsTypeOfFace(bytes, faceOffset) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (faceOffset + 12 > dv.byteLength) return null;
  const numTables = readUint16BE(dv, faceOffset + 4);
  for (let i = 0; i < numTables; i++) {
    const rec = faceOffset + 12 + i * 16;
    if (rec + 16 > dv.byteLength) break;
    const tag = String.fromCharCode(bytes[rec], bytes[rec + 1], bytes[rec + 2], bytes[rec + 3]);
    if (tag === "OS/2") {
      const absOff = readUint32BE(dv, rec + 8);
      if (absOff + 10 > dv.byteLength) return null;
      return readUint16BE(dv, absOff + 8);
    }
  }
  return null;
}
function readFsTypeAll(bytes) {
  if (bytes.length < 12) return [null];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag0 = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (tag0 === "ttcf") {
    const numFaces = readUint32BE(dv, 8);
    const out = [];
    for (let i = 0; i < numFaces; i++) {
      const faceOff = readUint32BE(dv, 12 + i * 4);
      out.push(fsTypeOfFace(bytes, faceOff));
    }
    return out;
  }
  return [fsTypeOfFace(bytes, 0)];
}
function licenseOf(fsType) {
  if (fsType === null) {
    return {
      fsType: null,
      embeddable: false,
      readonly: false,
      noSubset: false,
      label: "OS/2 \u8868\u8BFB\u4E0D\u5230\uFF0C\u4FDD\u5B88\u8DF3\u8FC7\u5D4C\u5165\uFF08\u9700\u7528\u6237\u6392\u67E5\u5B57\u4F53\u6587\u4EF6\u5B8C\u6574\u6027\uFF09"
    };
  }
  if ((fsType & FS_RESTRICTED) !== 0) {
    return { fsType, embeddable: false, readonly: false, noSubset: false, label: "\u8BB8\u53EF\u7981\u6B62\u5D4C\u5165\uFF08Restricted\uFF09" };
  }
  if ((fsType & FS_BITMAP_ONLY) !== 0) {
    return { fsType, embeddable: false, readonly: false, noSubset: false, label: "\u8BB8\u53EF\u4EC5\u5141\u8BB8\u5D4C\u5165\u4F4D\u56FE\uFF08Bitmap Only\uFF0C\u89C6\u540C\u7981\u5D4C\uFF09" };
  }
  const readonly = (fsType & FS_PREVIEW_PRINT) !== 0;
  const noSubset = (fsType & FS_NO_SUBSET) !== 0;
  const editable = (fsType & FS_EDITABLE) !== 0;
  let label;
  if (readonly) label = "\u53EF\u5D4C\u5165\u4F46\u76EE\u6807\u673A\u53EA\u8BFB\uFF08Preview & Print\uFF09\uFF0CPowerPoint \u4F1A\u63D0\u793A\u300C\u53EA\u8BFB\u5D4C\u5165\u5F0F\u5B57\u4F53\u300D";
  else if (noSubset) label = "\u53EF\u5D4C\u5165\u4F46\u7981\u6B62\u5B50\u96C6\u5316\uFF08No Subset\uFF09\uFF0C\u5C06\u6574\u5B57\u4F53\u5D4C\u5165";
  else if (editable) label = "\u53EF\u5D4C\u5165\u53EF\u7F16\u8F91\uFF08Editable\uFF09";
  else label = "\u53EF\u5D4C\u5165\u53EF\u7F16\u8F91\uFF08Installable\uFF09";
  return { fsType, embeddable: true, readonly, noSubset, label };
}

// src/core/fonts/resolver.ts
var execFileAsync = promisify(execFile);
function fontkitNameStr(v) {
  if (typeof v === "string") return v;
  if (v !== null && typeof v === "object") {
    const rec = v;
    if (typeof rec.en === "string") return rec.en;
    for (const vv of Object.values(rec)) if (typeof vv === "string") return vv;
  }
  return "";
}
function normalizeName(s) {
  if (typeof s !== "string") return "";
  return s.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
}
function matches(registryName, requested) {
  if (typeof registryName !== "string" || typeof requested !== "string") return false;
  const r = normalizeName(registryName);
  const q = normalizeName(requested);
  if (!r || !q) return false;
  if (r === q) return true;
  if (r.startsWith(q) && r.length > q.length) {
    const next = r[q.length];
    if (next === " " || next === "-") return true;
  }
  return false;
}
var fontkitCache = null;
async function loadFontkit() {
  if (fontkitCache) return fontkitCache;
  const { createRequire: createRequire2 } = await import("module");
  const req = createRequire2(import.meta.url);
  fontkitCache = req("fontkit");
  return fontkitCache;
}
var FONT_EXTS = [".ttf", ".ttc", ".otf", ".otc"];
async function readWinRegistryFontEntries() {
  const KEY = "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
  const KEY_USER = "HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";
  const out = [];
  for (const key of [KEY, KEY_USER]) {
    try {
      const { stdout } = await execFileAsync("reg.exe", ["query", key], { maxBuffer: 8 * 1024 * 1024 });
      for (const ln2 of stdout.split(/\r?\n/)) {
        const m = /^\s+(\S(?:.*?\S)?)\s+REG_SZ\s+(\S+)\s*$/.exec(ln2);
        if (!m) continue;
        const [, name2, file] = m;
        let abs;
        if (/^[a-zA-Z]:[\\/]/.test(file)) {
          abs = file;
        } else if (key.startsWith("HKCU")) {
          abs = path5.join(process.env.LOCALAPPDATA ?? path5.join(os.homedir(), "AppData", "Local"), "Microsoft", "Windows", "Fonts", file);
        } else {
          abs = path5.join(process.env.SystemRoot ?? process.env.WINDIR ?? "C:\\Windows", "Fonts", file);
        }
        out.push({ name: name2, file: abs });
      }
    } catch {
    }
  }
  return out;
}
var POSIX_FONT_DIRS = [
  "/usr/share/fonts",
  "/usr/local/share/fonts",
  path5.join(os.homedir(), ".fonts"),
  path5.join(os.homedir(), ".local", "share", "fonts"),
  "/Library/Fonts",
  "/System/Library/Fonts",
  path5.join(os.homedir(), "Library", "Fonts")
];
async function scanFontDirs(root) {
  const out = [];
  if (!existsSync(root)) return out;
  try {
    const entries = await readdir3(root, { withFileTypes: true });
    for (const e of entries) {
      const p = path5.join(root, e.name);
      if (e.isDirectory()) {
        out.push(...await scanFontDirs(p));
      } else if (e.isFile() && FONT_EXTS.some((ext) => e.name.toLowerCase().endsWith(ext))) {
        out.push(p);
      }
    }
  } catch {
  }
  return out;
}
var indexCacheInt = { byName: /* @__PURE__ */ new Map(), ready: false };
function slotOf(fsSelection, macStyle, subfamily) {
  const italic = (fsSelection & 1) !== 0 || (macStyle & 2) !== 0 || /italic|oblique/i.test(subfamily);
  const bold = (fsSelection & 32) !== 0 || (macStyle & 1) !== 0 || /bold|black|heavy|semibold|demibold/i.test(subfamily);
  if (italic && bold) return "boldItalic";
  if (italic) return "italic";
  if (bold) return "bold";
  return "regular";
}
function outlineOf(font) {
  const tables = font.directory?.tables ?? {};
  if ("CFF " in tables || "CFF2" in tables) return "CFF";
  if ("glyf" in tables) return "glyf";
  return "unknown";
}
async function indexOne(pathAbs, into) {
  let bytes;
  try {
    bytes = new Uint8Array(await readFile4(pathAbs));
  } catch {
    return;
  }
  const fsTypes = readFsTypeAll(bytes);
  const kit = await loadFontkit();
  let opened;
  try {
    opened = kit.openSync(pathAbs);
  } catch {
    return;
  }
  const faces = [];
  if (opened && typeof opened === "object" && "fonts" in opened && Array.isArray(opened.fonts)) {
    const fonts = opened.fonts;
    fonts.forEach((f, i) => faces.push({ font: f, faceIndex: i }));
  } else {
    faces.push({ font: opened, faceIndex: 0 });
  }
  for (const { font, faceIndex } of faces) {
    const fsSelection = font["OS/2"]?.fsSelection ?? 64;
    const macStyle = font.head?.macStyle ?? 0;
    const subfamilyRaw = font.subfamilyName;
    const subfamily = fontkitNameStr(subfamilyRaw) || "Regular";
    const familyRaw = font.familyName;
    const family = fontkitNameStr(familyRaw) || path5.basename(pathAbs, path5.extname(pathAbs));
    const fullNameStr = fontkitNameStr(font.fullName);
    const postscriptNameStr = fontkitNameStr(font.postscriptName);
    const fsSel = typeof fsSelection === "number" ? fsSelection : 64;
    const entry = {
      path: pathAbs,
      faceIndex,
      familyName: family,
      subfamilyName: subfamily,
      postscriptName: postscriptNameStr,
      fullName: fullNameStr,
      slot: slotOf(fsSel, macStyle, subfamily),
      outline: outlineOf(font),
      fsSelection: fsSel,
      macStyle,
      fsType: fsTypes[faceIndex] ?? null,
      ...faces.length > 1 ? { containerBytes: bytes } : {}
    };
    const keys = /* @__PURE__ */ new Set();
    if (family) keys.add(normalizeName(family));
    if (fullNameStr) keys.add(normalizeName(fullNameStr));
    if (postscriptNameStr) keys.add(normalizeName(postscriptNameStr));
    for (const k of keys) {
      if (!k) continue;
      const arr = into.get(k) ?? [];
      arr.push(entry);
      into.set(k, arr);
    }
  }
}
async function ensureIndex() {
  if (indexCacheInt.ready) return indexCacheInt.byName;
  const byName = /* @__PURE__ */ new Map();
  if (process.platform === "win32") {
    const reg = await readWinRegistryFontEntries();
    const seen = /* @__PURE__ */ new Set();
    for (const entry of reg) {
      if (!entry || typeof entry.file !== "string" || typeof entry.name !== "string") continue;
      if (!seen.has(entry.file)) {
        seen.add(entry.file);
        await indexOne(entry.file, byName);
      }
      const key = normalizeName(entry.name);
      if (key) {
        const arr = byName.get(key) ?? [];
        if (!arr.some((f) => f.path === entry.file)) {
          const placeholder = {
            path: entry.file,
            faceIndex: 0,
            familyName: entry.name,
            subfamilyName: "",
            postscriptName: "",
            fullName: entry.name,
            slot: "regular",
            outline: "unknown",
            fsSelection: 64,
            macStyle: 0,
            fsType: null
          };
          arr.push(placeholder);
          byName.set(key, arr);
        }
      }
    }
  } else {
    for (const dir of POSIX_FONT_DIRS) {
      for (const f of await scanFontDirs(dir)) {
        await indexOne(f, byName);
      }
    }
  }
  indexCacheInt.byName = byName;
  indexCacheInt.ready = true;
  return byName;
}
async function resolveFromAssets(typeface, assetsDir) {
  if (!existsSync(assetsDir)) return null;
  let files;
  try {
    files = await readdir3(assetsDir);
  } catch {
    return null;
  }
  for (const f of files) {
    if (!FONT_EXTS.some((ext) => f.toLowerCase().endsWith(ext))) continue;
    const full = path5.join(assetsDir, f);
    const tmp = /* @__PURE__ */ new Map();
    await indexOne(full, tmp);
    for (const [fam, arr] of tmp) {
      if (arr.length > 0 && matches(fam, typeface)) return arr[0];
    }
  }
  return null;
}
async function resolveTypeface(typeface, slot, options = {}) {
  if (options.projectDir) {
    const assetsHit = await resolveFromAssets(typeface, path5.join(options.projectDir, "assets", "fonts"));
    if (assetsHit && assetsHit.slot === slot) {
      const bytes2 = assetsHit.containerBytes ?? new Uint8Array(await readFile4(assetsHit.path));
      return toResolved(assetsHit, typeface, bytes2);
    }
  }
  const index = await ensureIndex();
  const key = normalizeName(typeface);
  const candidates = index.get(key) ?? [];
  const pool = candidates.length > 0 ? candidates : findByPrefix(index, typeface);
  if (pool.length === 0) return null;
  const slotHit = pool.find((f) => f.slot === slot) ?? pool.find((f) => f.slot === "regular") ?? pool[0];
  const bytes = slotHit.containerBytes ?? new Uint8Array(await readFile4(slotHit.path));
  return toResolved(slotHit, typeface, bytes);
}
function findByPrefix(index, typeface) {
  const out = [];
  for (const [key, arr] of index.entries()) {
    if (matches(key, typeface)) out.push(...arr);
  }
  return out;
}
async function toResolved(font, requestedTypeface, bytes) {
  return {
    typeface: requestedTypeface,
    slot: font.slot,
    path: font.path,
    faceIndex: font.faceIndex,
    bytes,
    familyName: font.familyName,
    familyNameZh: null,
    // fontkit 中文记录读法与数据形态待真实安装环境验证；先 null
    postscriptName: font.postscriptName,
    outline: font.outline,
    license: licenseOf(font.fsType)
  };
}
var ALTERNATIVES = {
  SortsMillGoudy: ["Georgia", "Cambria"],
  MiSans: ["\u66F4\u7EB1\u9ED1\u4F53 SC", "\u601D\u6E90\u9ED1\u4F53 CN"],
  "Noto Sans SC": ["\u66F4\u7EB1\u9ED1\u4F53 SC", "\u601D\u6E90\u9ED1\u4F53 CN"],
  QuattrocentoSans: ["Century Gothic"],
  HedvigLettersSans: ["Arial"],
  Liter: ["Century Gothic", "Arial"],
  Oranienbaum: ["Georgia", "Cambria"],
  Unna: ["Cambria"],
  Coda: ["Arial"],
  Jersey15: ["Impact", "Franklin Gothic"],
  Jersey20Charted: ["Impact", "Franklin Gothic"],
  "\u5F97\u610F\u9ED1": ["\u601D\u6E90\u9ED1\u4F53 CN", "\u66F4\u7EB1\u9ED1\u4F53 SC"],
  "\u7CBE\u54C1\u70B9\u9635\u4F53": ["SimSun", "SimHei"],
  "\u5FAE\u8F6F\u96C5\u9ED1": ["Microsoft YaHei"],
  "\u5B8B\u4F53": ["SimSun"],
  "\u9ED1\u4F53": ["SimHei"],
  "\u4EFF\u5B8B": ["FangSong"],
  "\u6977\u4F53": ["KaiTi"]
};
function findAlternatives(typeface) {
  return ALTERNATIVES[typeface] ?? [];
}

// src/core/fonts/subset.ts
var MIN_CHARSET = (() => {
  const out = [];
  for (let i = 32; i <= 126; i++) out.push(String.fromCharCode(i));
  out.push(
    "\u3000",
    "\u3002",
    "\uFF0C",
    "\u3001",
    "\uFF1B",
    "\uFF1A",
    "\uFF1F",
    "\uFF01",
    "\u300C",
    "\u300D",
    "\u300E",
    "\u300F",
    "\uFF08",
    "\uFF09",
    "\u300A",
    "\u300B",
    "\u3010",
    "\u3011",
    "\u2014",
    "\u2013",
    "\u2026",
    "\xB7",
    "\u3008",
    "\u3009"
  );
  for (let i = 0; i < 10; i++) out.push(String.fromCharCode(65296 + i));
  return out.join("");
})();
var subsetFontCache = null;
async function loadSubset() {
  if (subsetFontCache) return subsetFontCache;
  const { createRequire: createRequire2 } = await import("module");
  const req = createRequire2(import.meta.url);
  const mod = req("subset-font");
  subsetFontCache = typeof mod === "function" ? mod : mod?.default ?? mod?.subsetFont;
  return subsetFontCache;
}
async function subsetIfNeeded(bytes, charset, mode, license) {
  const before = bytes.byteLength;
  if (mode === "off" || mode === "full" || license.noSubset) {
    return { bytes, subsetted: false, beforeBytes: before, afterBytes: before };
  }
  if (!license.embeddable) {
    return { bytes, subsetted: false, beforeBytes: before, afterBytes: before };
  }
  try {
    const subset = await loadSubset();
    const merged = `${charset}${MIN_CHARSET}`;
    const { Buffer: Buffer2 } = await import("buffer");
    const bufIn = Buffer2.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = await subset(bufIn, merged, { targetFormat: "sfnt" });
    return { bytes: new Uint8Array(out.buffer, out.byteOffset, out.byteLength), subsetted: true, beforeBytes: before, afterBytes: out.byteLength };
  } catch (err2) {
    return {
      bytes,
      subsetted: false,
      beforeBytes: before,
      afterBytes: before,
      degradedReason: `\u5B50\u96C6\u5316\u5931\u8D25\uFF08${err2.message}\uFF09\uFF0C\u5DF2\u6574\u5B57\u4F53\u5D4C\u5165`
    };
  }
}

// node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i = 1; i < a.length; ++i) {
    if (a[i] > m)
      m = a[i];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i = 0; i < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i = sym - 257, b = fleb[i];
          add = bits(dat, pos, (1 << b) - 1) + fl[i];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i = 0; i < d.length; ++i) {
    if (d[i])
      t.push({ s: i, f: d[i] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i = 1; i < s; ++i) {
    if (t2[i].s > maxSym)
      maxSym = t2[i].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i < s; ++i) {
      var i2_1 = t2[i].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i;
    }
    for (; i >= 0 && dt; --i) {
      var i2_3 = t2[i].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i = 1; i <= s; ++i) {
    if (c[i] == cln && i != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i = 0; i < cl.length; ++i)
    l += cf[i] * cl[i];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i = 0; i < s; ++i)
    out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i = 0; i < lclt.length; ++i)
    ++lcfreq[lclt[i] & 31];
  for (var i = 0; i < lcdt.length; ++i)
    ++lcfreq[lcdt[i] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i = 0; i < nlcc; ++i)
      wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i = 0; i < clct.length; ++i) {
        var len = clct[i] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i = 0; i < li; ++i) {
    var sym = syms[i];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i2) {
      return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i + 2 < s; ++i) {
      var hv = hsh(i);
      var imod = i & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        var rem = s - i;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc_1 = eb = 0, bs = i;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i, st.w = wi;
    }
  } else {
    for (var i = st.w || 0; i < s + lst; i += 65535) {
      var e = i + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t = new Int32Array(256);
  for (var i = 0; i < 256; ++i) {
    var c = i, k = 9;
    while (--k)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i = 0; i < d.length; ++i)
        cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (ArrayBuffer.isView(val))
      t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i = 0; ; ) {
    var c = d[i++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i + eb > d.length)
      return { s: r, r: slc(d, i - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i = 0; i < str.length; ++i)
      ar_1[i] = str.charCodeAt(i);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i = 0; i < l; ++i) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i = 0; i < dat.length; i += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c = crc();
    c.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i = 0; i < files.length; ++i) {
    var f = files[i];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i = 0; i < c; ++i) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// src/core/fonts/embed.ts
var import_xmldom = __toESM(require_lib(), 1);

// src/core/fonts/eot.ts
var EOT_VERSION = 131073;
var EOT_MAGIC = 20556;
function readFontMeta(ttf) {
  const dv = new DataView(ttf.buffer, ttf.byteOffset, ttf.byteLength);
  const sfnt = dv.getUint32(0);
  if (sfnt !== 65536) {
    throw new Error(`\u975E TrueType \u8F6E\u5ED3\uFF08sfnt=0x${sfnt.toString(16)}\uFF09\uFF0CEOT \u4EC5\u5C01\u88C5 glyf TTF`);
  }
  const numTables = dv.getUint16(4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    const tag = String.fromCharCode(ttf[o], ttf[o + 1], ttf[o + 2], ttf[o + 3]);
    tables[tag] = { offset: dv.getUint32(o + 8), length: dv.getUint32(o + 12) };
  }
  for (const t of ["head", "OS/2", "name"]) {
    if (!tables[t]) throw new Error(`\u7F3A\u5C11 ${t} \u8868`);
  }
  const head = tables["head"].offset;
  const os22 = tables["OS/2"].offset;
  const nameOff = tables["name"].offset;
  const count = dv.getUint16(nameOff + 2);
  const strBase = nameOff + dv.getUint16(nameOff + 4);
  const pickName = (id) => {
    let fallback = null;
    for (let i = 0; i < count; i++) {
      const r = nameOff + 6 + i * 12;
      const pid = dv.getUint16(r);
      const lid = dv.getUint16(r + 4);
      const nid = dv.getUint16(r + 6);
      if (nid !== id) continue;
      const len = dv.getUint16(r + 8);
      const off = dv.getUint16(r + 10);
      const raw = ttf.subarray(strBase + off, strBase + off + len);
      if (pid === 3) {
        let s = "";
        for (let j = 0; j + 1 < raw.length; j += 2) s += String.fromCharCode(raw[j] << 8 | raw[j + 1]);
        if (lid === 1033) return s;
        fallback ??= s;
      } else if (pid === 1 && fallback === null) {
        fallback = String.fromCharCode(...raw);
      }
    }
    return fallback ?? "";
  };
  const cp1 = dv.getUint32(os22 + 78);
  let charset = 0;
  if (cp1 & 262144) charset = 134;
  else if (cp1 & 131072) charset = 128;
  else if (cp1 & 524288) charset = 129;
  else if (cp1 & 2097152) charset = 136;
  const fsSelection = dv.getUint16(os22 + 62);
  return {
    checkSumAdjustment: dv.getUint32(head + 8),
    headOffset: head,
    panose: ttf.subarray(os22 + 32, os22 + 42),
    charset,
    italic: fsSelection & 1 ? 1 : 0,
    weight: dv.getUint16(os22 + 4),
    fsType: dv.getUint16(os22 + 8),
    unicodeRange: [0, 1, 2, 3].map((i) => dv.getUint32(os22 + 42 + i * 4)),
    codePageRange: [cp1, dv.getUint32(os22 + 82)],
    familyName: pickName(1),
    styleName: pickName(2),
    fullName: pickName(4),
    versionName: pickName(5)
  };
}
function utf16leNull(s) {
  const b = new Uint8Array((s.length + 1) * 2);
  const dv = new DataView(b.buffer);
  for (let i = 0; i < s.length; i++) dv.setUint16(i * 2, s.charCodeAt(i), true);
  return b;
}
function wrapEot(ttfBytes) {
  const meta = readFontMeta(ttfBytes);
  const fontData = new Uint8Array(ttfBytes);
  fontData.fill(0, meta.headOffset + 8, meta.headOffset + 12);
  const names = [meta.familyName, meta.styleName, meta.versionName, meta.fullName].map(utf16leNull);
  const fixed = 80;
  const namesLen = names.reduce((a, n) => a + 4 + n.length, 0);
  const v2tail = 24;
  const eotSize = fixed + namesLen + v2tail + fontData.length;
  const out = new Uint8Array(eotSize);
  const dv = new DataView(out.buffer);
  let p = 0;
  const u162 = (v) => {
    dv.setUint16(p, v & 65535, true);
    p += 2;
  };
  const u32 = (v) => {
    dv.setUint32(p, v >>> 0, true);
    p += 4;
  };
  u32(eotSize);
  u32(fontData.length);
  u32(EOT_VERSION);
  u32(0);
  out.set(meta.panose, p);
  p += 10;
  out[p++] = meta.charset;
  out[p++] = meta.italic;
  u32(meta.weight);
  u162(meta.fsType);
  u162(EOT_MAGIC);
  for (const v of meta.unicodeRange) u32(v);
  for (const v of meta.codePageRange) u32(v);
  u32(meta.checkSumAdjustment);
  u32(0);
  u32(0);
  u32(0);
  u32(0);
  for (const n of names) {
    u162(0);
    u162(n.length);
    out.set(n, p);
    p += n.length;
  }
  u162(0);
  u162(0);
  u32(0);
  u32(0);
  u162(0);
  u162(0);
  u32(0);
  u32(0);
  out.set(fontData, p);
  p += fontData.length;
  if (p !== eotSize) throw new Error(`EOT \u957F\u5EA6\u7B97\u9519: wrote ${p} != ${eotSize}`);
  return { eot: out, meta };
}

// src/core/fonts/embed.ts
var CT_FONTDATA = "application/x-fontdata";
var REL_TYPE_FONT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";
var SLOT_ORDER = ["regular", "bold", "italic", "boldItalic"];
var dec = new TextDecoder();
function xmlDocOf(bytes) {
  return new import_xmldom.DOMParser().parseFromString(dec.decode(bytes), "application/xml");
}
function serialize(doc) {
  const encoded = new TextEncoder().encode(new import_xmldom.XMLSerializer().serializeToString(doc));
  return encoded;
}
function rootOf(doc, partName) {
  const root = doc.documentElement;
  if (!root) throw new Error(`${partName}: documentElement \u4E3A null`);
  return root;
}
function nextFontIndex(parts) {
  let max2 = 0;
  for (const name2 of Object.keys(parts)) {
    const m = /^ppt\/fonts\/font(\d+)\.fntdata$/.exec(name2);
    if (m) max2 = Math.max(max2, Number(m[1]));
  }
  return max2 + 1;
}
function embedFontsPostProcess(pptxBytes, fontPlan) {
  const log = [];
  if (fontPlan.length === 0) return { bytes: pptxBytes, writtenParts: [], facesEmbedded: [], log };
  const partsAB = unzipSync(pptxBytes);
  const parts = {};
  for (const [k, v] of Object.entries(partsAB)) {
    parts[k] = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  for (const p of ["ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "[Content_Types].xml"]) {
    if (!parts[p]) throw new Error(`missing part: ${p}`);
  }
  const assignments = [];
  const relsDoc = xmlDocOf(parts["ppt/_rels/presentation.xml.rels"]);
  const rels = relsDoc.getElementsByTagName("Relationship");
  let maxRId = 0;
  for (let i = 0; i < rels.length; i++) {
    const el = rels.item(i);
    const id = el?.getAttribute("Id") ?? "";
    const m = /^rId(\d+)$/.exec(id);
    if (m) maxRId = Math.max(maxRId, Number(m[1]));
  }
  let nextFontIdx = nextFontIndex(parts);
  fontPlan.forEach((face) => {
    const relTarget = `fonts/font${nextFontIdx}.fntdata`;
    const partName = `ppt/${relTarget}`;
    const rid = `rId${++maxRId}`;
    assignments.push({ face, partName, relTarget, rid, isNew: true });
    nextFontIdx++;
  });
  {
    const doc = xmlDocOf(parts["[Content_Types].xml"]);
    const root = rootOf(doc, "[Content_Types].xml");
    const overrides = doc.getElementsByTagName("Override");
    const existing = /* @__PURE__ */ new Set();
    for (let i = 0; i < overrides.length; i++) existing.add(overrides.item(i)?.getAttribute("PartName") ?? "");
    for (const a of assignments) {
      const pn = `/${a.partName}`;
      if (existing.has(pn)) continue;
      const ov = doc.createElement("Override");
      ov.setAttribute("PartName", pn);
      ov.setAttribute("ContentType", CT_FONTDATA);
      root.appendChild(ov);
    }
    parts["[Content_Types].xml"] = serialize(doc);
  }
  {
    const relsRoot = rootOf(relsDoc, "ppt/_rels/presentation.xml.rels");
    for (const a of assignments) {
      if (!a.isNew) continue;
      const rel = relsDoc.createElement("Relationship");
      rel.setAttribute("Id", a.rid);
      rel.setAttribute("Type", REL_TYPE_FONT);
      rel.setAttribute("Target", a.relTarget);
      relsRoot.appendChild(rel);
      log.push(`${a.face.typeface}(${a.face.slot}) \u2192 ${a.rid} @ ${a.relTarget}`);
    }
    parts["ppt/_rels/presentation.xml.rels"] = serialize(relsDoc);
  }
  const metaByTypeface = /* @__PURE__ */ new Map();
  const writtenParts = [];
  for (const a of assignments) {
    if (!a.isNew && parts[a.partName] !== void 0) continue;
    const { eot, meta } = wrapEot(a.face.bytes);
    parts[a.partName] = eot;
    writtenParts.push(a.partName);
    if (!metaByTypeface.has(a.face.typeface)) metaByTypeface.set(a.face.typeface, meta);
  }
  const facesEmbedded = [];
  {
    const doc = xmlDocOf(parts["ppt/presentation.xml"]);
    const root = rootOf(doc, "ppt/presentation.xml");
    root.setAttribute("embedTrueTypeFonts", "1");
    root.setAttribute("saveSubsetFonts", fontPlan.some((f) => f.subsetted) ? "1" : "0");
    let lst = root.getElementsByTagName("p:embeddedFontLst").item(0);
    if (!lst) {
      const newLst = doc.createElement("p:embeddedFontLst");
      const notesSz = root.getElementsByTagName("p:notesSz").item(0);
      const defaultTextStyle = root.getElementsByTagName("p:defaultTextStyle").item(0);
      if (notesSz && notesSz.nextSibling) root.insertBefore(newLst, notesSz.nextSibling);
      else if (notesSz) root.appendChild(newLst);
      else if (defaultTextStyle) root.insertBefore(newLst, defaultTextStyle);
      else root.appendChild(newLst);
      lst = newLst;
      log.push("presentation.xml \u65B0\u5EFA p:embeddedFontLst");
    }
    const byTypeface = /* @__PURE__ */ new Map();
    for (const f of fontPlan) {
      const arr = byTypeface.get(f.typeface) ?? [];
      arr.push(f);
      byTypeface.set(f.typeface, arr);
    }
    for (const [typeface, faces] of byTypeface) {
      let entry = null;
      const entries = lst.getElementsByTagName("p:embeddedFont");
      for (let i = 0; i < entries.length; i++) {
        const el = entries.item(i);
        const font = el?.getElementsByTagName("p:font").item(0);
        if (font?.getAttribute("typeface") === typeface) {
          entry = el;
          break;
        }
      }
      if (!entry) {
        const newEntry = doc.createElement("p:embeddedFont");
        const font = doc.createElement("p:font");
        font.setAttribute("typeface", typeface);
        const meta = metaByTypeface.get(typeface);
        if (meta) {
          const panoseHex = Array.from(meta.panose).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
          font.setAttribute("panose", panoseHex);
          const signed = meta.charset > 127 ? meta.charset - 256 : meta.charset;
          font.setAttribute("charset", String(signed));
        }
        newEntry.appendChild(font);
        entry = newEntry;
        lst.appendChild(entry);
        log.push(`embeddedFontLst \u65B0\u589E typeface="${typeface}"`);
      }
      const facesBySlot = /* @__PURE__ */ new Map();
      for (const f of faces) facesBySlot.set(f.slot, f);
      for (const slot of SLOT_ORDER) {
        if (!facesBySlot.has(slot)) continue;
        const existing = entry.getElementsByTagName(`p:${slot}`).item(0);
        if (existing) continue;
        const assignment = assignments.find((a) => a.face.typeface === typeface && a.face.slot === slot);
        if (!assignment) continue;
        const el = doc.createElement(`p:${slot}`);
        el.setAttribute("r:id", assignment.rid);
        let insertBefore = null;
        for (const later of SLOT_ORDER.slice(SLOT_ORDER.indexOf(slot) + 1)) {
          const laterEl = entry.getElementsByTagName(`p:${later}`).item(0);
          if (laterEl) {
            insertBefore = laterEl;
            break;
          }
        }
        if (insertBefore) entry.insertBefore(el, insertBefore);
        else entry.appendChild(el);
        facesEmbedded.push({ typeface, slot });
      }
    }
    parts["ppt/presentation.xml"] = serialize(doc);
  }
  const out = {};
  out["[Content_Types].xml"] = [parts["[Content_Types].xml"], { level: 0 }];
  for (const [name2, data] of Object.entries(parts)) {
    if (name2 === "[Content_Types].xml") continue;
    out[name2] = name2.endsWith(".fntdata") ? [data, { level: 6 }] : [data, { level: 0 }];
  }
  return { bytes: zipSync(out), writtenParts, facesEmbedded, log };
}

// src/core/fonts/selfcheck.ts
var import_xmldom2 = __toESM(require_lib(), 1);
var CT_FONTDATA2 = "application/x-fontdata";
var REL_TYPE_FONT2 = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";
function selfCheckEmbedded(pptxBytes, opts) {
  const parts = unzipSync(pptxBytes);
  const failures = [];
  const ok = (cond, msg) => {
    if (!cond) failures.push(msg);
  };
  const fontParts = Object.keys(parts).filter((n) => n.startsWith("ppt/fonts/") && n.endsWith(".fntdata")).sort();
  ok(fontParts.length === opts.fontPlan.length, `fntdata \u90E8\u4EF6\u6570 ${fontParts.length} != fontPlan \u884C\u6570 ${opts.fontPlan.length}`);
  for (const name2 of fontParts) {
    const data = parts[name2];
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const eotSize = dv.getUint32(0, true);
    const version = dv.getUint32(8, true);
    const magic = dv.getUint16(34, true);
    ok(eotSize === data.length, `${name2} EOTSize(${eotSize}) != \u90E8\u4EF6\u957F(${data.length})`);
    ok(version === 131073, `${name2} EOT Version 0x${version.toString(16)} != 0x00020001`);
    ok(magic === 20556, `${name2} EOT MagicNumber 0x${magic.toString(16)} != 0x504C "LP"`);
    const fontDataSize = dv.getUint32(4, true);
    const tailStart = data.length - fontDataSize;
    if (tailStart >= 0 && tailStart + 4 <= data.length) {
      const h = data.subarray(tailStart, tailStart + 4);
      const hex = Array.from(h).map((b) => b.toString(16).padStart(2, "0")).join(" ");
      const isSfnt = hex === "00 01 00 00" || hex === "4f 54 54 4f" || hex === "74 72 75 65";
      ok(isSfnt, `${name2} EOT \u5C3E\u90E8 FontData \u975E\u5408\u6CD5 sfnt\uFF08\u5934 ${hex}\uFF09`);
    }
  }
  {
    const doc = new import_xmldom2.DOMParser().parseFromString(new TextDecoder().decode(parts["[Content_Types].xml"]), "application/xml");
    const overrides = /* @__PURE__ */ new Set();
    const ovr = doc.getElementsByTagName("Override");
    for (let i = 0; i < ovr.length; i++) {
      const el = ovr.item(i);
      if (el?.getAttribute("ContentType") === CT_FONTDATA2) {
        const p = el.getAttribute("PartName") ?? "";
        overrides.add(p.replace(/^\//, ""));
      }
    }
    for (const fp of fontParts) {
      ok(overrides.has(fp), `[Content_Types] \u7F3A Override\uFF1A${fp}`);
    }
  }
  {
    const doc = new import_xmldom2.DOMParser().parseFromString(new TextDecoder().decode(parts["ppt/_rels/presentation.xml.rels"]), "application/xml");
    const fontRels = [];
    const rels = doc.getElementsByTagName("Relationship");
    for (let i = 0; i < rels.length; i++) {
      const el = rels.item(i);
      if (el?.getAttribute("Type") === REL_TYPE_FONT2) {
        fontRels.push({ id: el.getAttribute("Id") ?? "", target: `ppt/${el.getAttribute("Target") ?? ""}` });
      }
    }
    ok(fontRels.length === opts.fontPlan.length, `rels \u4E2D font Relationship \u6570 ${fontRels.length} != fontPlan \u884C\u6570 ${opts.fontPlan.length}`);
    for (const r of fontRels) {
      ok(r.target in parts, `rels Target ${r.target} \u5728\u5305\u91CC\u4E0D\u5B58\u5728`);
    }
    const presDoc = new import_xmldom2.DOMParser().parseFromString(new TextDecoder().decode(parts["ppt/presentation.xml"]), "application/xml");
    const lst = presDoc.getElementsByTagName("p:embeddedFontLst").item(0);
    if (lst) {
      for (const slot of ["regular", "bold", "italic", "boldItalic"]) {
        const els = lst.getElementsByTagName(`p:${slot}`);
        for (let i = 0; i < els.length; i++) {
          const rid = els.item(i)?.getAttribute("r:id");
          const found = fontRels.some((r) => r.id === rid);
          ok(found, `embeddedFontLst \u5F15\u7528\u7684 r:id=${rid} \u5728 rels \u91CC\u4E0D\u5B58\u5728`);
        }
      }
    }
  }
  {
    const doc = new import_xmldom2.DOMParser().parseFromString(new TextDecoder().decode(parts["ppt/presentation.xml"]), "application/xml");
    const root = doc.documentElement;
    if (!root) {
      failures.push("presentation.xml \u65E0 documentElement");
    } else {
      const elems = [];
      for (let i = 0; i < root.childNodes.length; i++) {
        const n = root.childNodes.item(i);
        if (n && n.nodeType === 1) elems.push(n.nodeName);
      }
      const iNotes = elems.indexOf("p:notesSz");
      const iLst = elems.indexOf("p:embeddedFontLst");
      const iDef = elems.indexOf("p:defaultTextStyle");
      ok(iLst >= 0, "p:embeddedFontLst \u672A\u627E\u5230");
      if (iNotes >= 0) ok(iLst > iNotes, `embeddedFontLst(${iLst}) \u987B\u5728 notesSz(${iNotes}) \u4E4B\u540E`);
      if (iDef >= 0) ok(iLst < iDef, `embeddedFontLst(${iLst}) \u987B\u5728 defaultTextStyle(${iDef}) \u4E4B\u524D`);
      ok(root.getAttribute("embedTrueTypeFonts") === "1", 'embedTrueTypeFonts \u5E94\u4E3A "1"');
      const subsets = root.getAttribute("saveSubsetFonts");
      ok(subsets === "1" || subsets === "0", `saveSubsetFonts \u5E94\u4E3A "0"/"1"\uFF08\u5B9E\u9645 ${subsets}\uFF09`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`\u5B57\u4F53\u5D4C\u5165\u81EA\u68C0\u5931\u8D25\uFF08${failures.length} \u9879\uFF09\uFF1A
  - ${failures.join("\n  - ")}`);
  }
}

// src/core/fonts/embed-pipeline.ts
async function embedFontsForPptx(pptxBytes, built, deck, pages, options) {
  const mode = options.mode;
  const rawBytes = pptxBytes.byteLength;
  if (mode === "off") {
    return {
      bytes: pptxBytes,
      summary: { facesEmbedded: [], skipped: [], warnings: [], finalBytes: rawBytes, rawBytes, mode }
    };
  }
  const warnings = [];
  const usage = collectFontUsage(deck, pages);
  const plan = [];
  const skipList = [];
  const subsetAudit = [];
  for (const [typeface, slots] of usage.typefaces) {
    for (const slot of slots) {
      let face = null;
      try {
        face = await resolveTypeface(typeface, slot, { projectDir: options.projectDir });
      } catch (err2) {
        skipList.push({ typeface, slot, reason: `\u89E3\u6790\u5F02\u5E38\uFF1A${err2.message}` });
        continue;
      }
      if (!face) {
        skipList.push({ typeface, slot, reason: "\u672A\u5728 assets/fonts/\u3001\u7CFB\u7EDF\u5B57\u4F53\u4E0E\u663E\u5F0F\u8DEF\u5F84\u627E\u5230" });
        continue;
      }
      if (!face.license.embeddable) {
        skipList.push({ typeface, slot, reason: face.license.label, licenseLabel: face.license.label });
        warnings.push(`fsType=${face.license.fsType ?? "null"} ${typeface}: ${face.license.label}`);
        continue;
      }
      if (face.license.readonly) {
        warnings.push(`fsType=0x${face.license.fsType?.toString(16).padStart(4, "0") ?? "?"} ${typeface}: ${face.license.label}`);
      }
      if (face.license.noSubset) {
        warnings.push(`fsType=${face.license.fsType} ${typeface}: ${face.license.label}`);
      }
      let faceBytes = face.bytes;
      if (face.faceIndex > 0) {
        warnings.push(`${typeface} \u662F TTC face#${face.faceIndex}\uFF0C\u5F53\u524D\u7248\u672C\u5D4C\u5165\u6574\u4E2A TTC \u5BB9\u5668\uFF08\u4F53\u79EF\u504F\u5927\uFF09`);
      }
      const sub = await subsetIfNeeded(faceBytes, usage.charset, mode, face.license);
      if (sub.degradedReason) {
        warnings.push(`${typeface}(${slot})\uFF1A${sub.degradedReason}`);
      }
      if (sub.subsetted) {
        subsetAudit.push({ typeface, slot, beforeBytes: sub.beforeBytes, afterBytes: sub.afterBytes });
      }
      plan.push({ typeface, slot, bytes: sub.bytes, subsetted: sub.subsetted });
    }
  }
  if (plan.length === 0) {
    return {
      bytes: pptxBytes,
      summary: { facesEmbedded: [], skipped: skipList, warnings, finalBytes: rawBytes, rawBytes, mode, subset: subsetAudit }
    };
  }
  const embedded = embedFontsPostProcess(pptxBytes, plan);
  selfCheckEmbedded(embedded.bytes, { fontPlan: plan });
  return {
    bytes: embedded.bytes,
    summary: {
      facesEmbedded: embedded.facesEmbedded,
      skipped: skipList,
      subset: subsetAudit,
      warnings: [...warnings, ...embedded.log],
      finalBytes: embedded.bytes.byteLength,
      rawBytes,
      mode
    }
  };
}
function modeOfExportConfig(deck) {
  const raw = deck.export?.fontEmbed;
  if (raw === "off" || raw === "full" || raw === "subset") return raw;
  return "subset";
}

// src/core/review/fontLicense.ts
async function reviewFontLicenses(deck, pages, options = {}) {
  const usage = collectFontUsage(deck, pages);
  const issues = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [typeface, slots] of usage.typefaces) {
    if (seen.has(typeface)) continue;
    seen.add(typeface);
    const firstSlot = slots.has("regular") ? "regular" : [...slots][0] ?? "regular";
    let face = null;
    try {
      face = await resolveTypeface(typeface, firstSlot, { projectDir: options.projectDir });
    } catch (err2) {
      issues.push({
        page: 0,
        severity: "warning",
        category: "structure",
        description: `\u5B57\u4F53 ${typeface} \u89E3\u6790\u5F02\u5E38\uFF1A${err2.message}`,
        suggestion: "\u68C0\u67E5\u672C\u673A\u5B57\u4F53\u5B89\u88C5\u4E0E assets/fonts/ \u76EE\u5F55"
      });
      continue;
    }
    if (!face) {
      const alts = findAlternatives(typeface);
      issues.push({
        page: 0,
        severity: "warning",
        category: "structure",
        description: `\u5B57\u4F53\u672A\u5B89\u88C5\uFF1A${typeface}\uFF08\u7F3A\u5931\u5C06\u65E0\u6CD5\u5D4C\u5165\uFF0C\u5BFC\u51FA\u540E\u76EE\u6807\u673A\u53EF\u80FD\u56DE\u843D\u7CFB\u7EDF\u5B57\u4F53\uFF09`,
        ...alts.length > 0 ? { suggestion: `\u5EFA\u8BAE\u5B89\u88C5\u8BE5\u5B57\u4F53\uFF0C\u6216\u6539\u7528\u672C\u5730\u66FF\u4EE3\uFF1A${alts.join(" / ")}` } : { suggestion: "\u5EFA\u8BAE\u5B89\u88C5\u8BE5\u5B57\u4F53" }
      });
      continue;
    }
    const lic = face.license;
    if (lic.fsType === null) {
      issues.push({
        page: 0,
        severity: "warning",
        category: "structure",
        description: `\u5B57\u4F53 ${typeface} \u65E0 OS/2 \u8868\uFF08\u8BFB\u4E0D\u5230 fsType\uFF09\uFF0C\u65E0\u6CD5\u5224\u5B9A\u8BB8\u53EF`,
        suggestion: "\u6362\u53EF\u9760\u6E20\u9053\u83B7\u53D6\u8BE5\u5B57\u4F53\uFF0C\u6216\u5728 deck.export.fontEmbed \u8BBE\u4E3A off \u8DF3\u8FC7\u5D4C\u5165"
      });
      continue;
    }
    if ((lic.fsType & 2) !== 0 || (lic.fsType & 512) !== 0) {
      issues.push({
        page: 0,
        severity: "blocker",
        category: "structure",
        description: `\u5B57\u4F53 ${typeface} \u8BB8\u53EF\u7981\u6B62\u5D4C\u5165\uFF08fsType=0x${lic.fsType.toString(16).padStart(4, "0")}\uFF0C${lic.label}\uFF09`,
        suggestion: "\u6539\u6362\u53EF\u5D4C\u5165\u5B57\u4F53\uFF08\u5982\u601D\u6E90/MiSans/\u963F\u91CC\u5988\u5988/\u7AD9\u9177/LXGW \u7B49 fsType=0x0000/0x0008 \u9879\uFF09\uFF0C\u6216\u5728 deck.export.fontEmbed \u8BBE\u4E3A off"
      });
      continue;
    }
    if ((lic.fsType & 4) !== 0) {
      issues.push({
        page: 0,
        severity: "warning",
        category: "structure",
        description: `\u5B57\u4F53 ${typeface} \u4E3A\u53EA\u8BFB\u5D4C\u5165\uFF08Preview & Print\uFF0CfsType=0x${lic.fsType.toString(16).padStart(4, "0")}\uFF09\uFF1A\u76EE\u6807\u673A\u5C06\u770B\u5230\u300C\u53EA\u8BFB\u5D4C\u5165\u5F0F\u5B57\u4F53\u300D\u63D0\u793A`,
        suggestion: lic.label
      });
    }
    if ((lic.fsType & 256) !== 0) {
      issues.push({
        page: 0,
        severity: "warning",
        category: "structure",
        description: `\u5B57\u4F53 ${typeface} \u7981\u6B62\u5B50\u96C6\u5316\uFF08No Subset\uFF09\uFF1A\u5C06\u6574\u5B57\u4F53\u5D4C\u5165\uFF08\u4F53\u79EF\u5927\uFF09`,
        suggestion: lic.label
      });
    }
  }
  return issues;
}

// src/core/export-pipeline.ts
async function buildProjectDeck(cwd, dir) {
  const loaded = await loadProject(cwd, dir);
  const blockers = loaded.issues.filter((i) => i.level === "blocker");
  if (blockers.length > 0) {
    throw new ProjectError("SchemaBlockers", `\u5DE5\u7A0B\u5B58\u5728 ${blockers.length} \u4E2A\u963B\u65AD\u7EA7\u95EE\u9898\uFF0C\u5148\u4FEE\u590D\u518D\u5BFC\u51FA/\u6E32\u67D3`, {
      status: 409,
      detail: blockers.map((b) => `${b.code}: ${b.message}${b.path ? `\uFF08${b.path}\uFF09` : ""}`)
    });
  }
  const pages = loaded.deck.pages.map((rel) => {
    const key = rel.replace(/\\/g, "/");
    const page = loaded.pages.get(key);
    if (!page) throw new ProjectError("PageMissing", `\u9875\u6587\u4EF6\u672A\u52A0\u8F7D\uFF1A${key}`, { status: 409 });
    return page;
  });
  const warnings = [];
  const engine = createOfficeKitEngine();
  const ctx = {
    projectDir: loaded.dir,
    loadMedia: (src) => loadMediaBytes(loaded.dir, src),
    warnings
  };
  const built = await engine.buildDeck({ deck: loaded.deck, pages }, ctx);
  return {
    dir: loaded.dir,
    revision: loaded.manifest.revision,
    built,
    buildWarnings: warnings,
    fontsUsed: built.fontsUsed,
    deck: loaded.deck,
    pages
  };
}
async function saveRawProjectPptx(pipeline) {
  const engine = createOfficeKitEngine();
  return engine.saveDeck(pipeline.built.native);
}
async function saveProjectPptx(pipeline) {
  const engine = createOfficeKitEngine();
  const rawBytes = await engine.saveDeck(pipeline.built.native);
  const mode = modeOfExportConfig(pipeline.deck);
  if (mode === "off") {
    return { bytes: rawBytes, fontEmbed: null };
  }
  const { bytes, summary } = await embedFontsForPptx(rawBytes, pipeline.built, pipeline.deck, pipeline.pages, {
    projectDir: pipeline.dir,
    mode
  });
  return { bytes, fontEmbed: summary };
}
async function loadMediaBytes(projectDir, src) {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  const abs = path7.resolve(projectDir, src);
  const rel = path7.relative(projectDir, abs);
  if (rel.startsWith("..") || path7.isAbsolute(rel)) {
    throw new Error(`\u7D20\u6750\u8DEF\u5F84\u8D8A\u51FA\u5DE5\u7A0B\u76EE\u5F55\uFF1A${src}`);
  }
  return new Uint8Array(await readFile6(abs));
}
async function renderPptxImages(pptxBytes, options = {}) {
  const tmp = await mkdtemp(path7.join(os2.tmpdir(), "ppt-maker-render-"));
  const inputPath = path7.join(tmp, "deck.pptx");
  const outputDir = path7.join(tmp, "out");
  await writeFile3(inputPath, pptxBytes);
  let conv = null;
  try {
    conv = await createConverter();
    const result = await conv.renderImages({
      inputPath,
      outputDir,
      pages: options.pages && options.pages.length > 0 ? options.pages : "all",
      dpi: options.dpi ?? 96
    });
    return {
      result,
      outputDir,
      cleanup: async () => {
        try {
          await conv?.dispose();
        } catch {
        }
        await rm3(tmp, { recursive: true, force: true });
      }
    };
  } catch (err2) {
    await conv?.dispose().catch(() => {
    });
    await rm3(tmp, { recursive: true, force: true }).catch(() => {
    });
    throw err2;
  }
}
async function checkProject(cwd, dir, options = {}) {
  const pipeline = await buildProjectDeck(cwd, dir);
  const pres = pipeline.built.native;
  const review = reviewDeck(pres, { pages: options.pages });
  const fontLicenseIssues = await reviewFontLicenses(pipeline.deck, pipeline.pages, { projectDir: pipeline.dir });
  let missingFonts = [];
  let ai;
  const needsRender = options.withMissingFonts !== false || options.ai !== void 0;
  let pptxBytes = null;
  if (needsRender) {
    try {
      pptxBytes = await saveRawProjectPptx(pipeline);
    } catch {
      pptxBytes = null;
    }
  }
  if (options.withMissingFonts !== false && pptxBytes !== null) {
    try {
      const rendered = await renderPptxImages(pptxBytes, { pages: options.pages, dpi: 24 });
      missingFonts = rendered.result.missingFonts;
      await rendered.cleanup();
    } catch {
    }
  }
  if (options.ai !== void 0 && pptxBytes !== null) {
    const { deps } = options.ai;
    const pageNumbers = resolvedPageNumbers(pres, options.pages);
    try {
      const rendered = await renderPptxImages(pptxBytes, { pages: pageNumbers, dpi: 96 });
      try {
        const images = rendered.result.images.map((img) => ({
          page: img.page ?? img.index + 1,
          absPath: img.path
        }));
        ai = await runAiReview(
          { images, pres, pages: pageNumbers },
          { ...deps, toDisplayPath: (abs) => path7.relative(options.ai.cwd, abs).replace(/\\/g, "/") }
        );
      } finally {
        await rendered.cleanup();
      }
    } catch (err2) {
      ai = { performed: false, reason: `AI \u8D28\u68C0\u672A\u6267\u884C\uFF1A${err2.message}` };
    }
  }
  const issues = [...fontLicenseIssues, ...review.issues];
  for (const family of missingFonts) {
    issues.push({
      page: 0,
      severity: "warning",
      category: "structure",
      description: `\u76EE\u6807\u73AF\u5883\u7F3A\u5C11\u5B57\u4F53\uFF1A${family}`,
      suggestion: "\u5728\u5BFC\u51FA\u65F6\u542F\u7528\u5B57\u4F53\u5D4C\u5165\uFF08export.fontEmbed\uFF09\uFF0C\u6216\u5728\u76EE\u6807\u673A\u5B89\u88C5\u8BE5\u5B57\u4F53"
    });
  }
  if (ai !== void 0) {
    issues.push(...aiIssuesAsReviewIssues(ai));
  }
  return {
    pass: !issues.some((i) => i.severity === "blocker"),
    issues,
    missingFonts,
    buildWarnings: pipeline.buildWarnings,
    ...ai !== void 0 ? { ai } : {}
  };
}
function resolvedPageNumbers(pres, pages) {
  if (pages !== void 0 && pages.length > 0) return [...pages].sort((a, b) => a - b);
  const count = getSlides3(pres).length;
  return Array.from({ length: count }, (_, i) => i + 1);
}

// src/tools/shared.ts
function toolError(err2) {
  if (err2 instanceof ProjectError) {
    return {
      ok: false,
      error: {
        code: err2.code,
        message: err2.message,
        ...err2.status !== void 0 ? { status: err2.status } : {},
        ...err2.detail !== void 0 ? { detail: err2.detail } : {}
      }
    };
  }
  const message = err2 instanceof Error ? err2.message : String(err2);
  return { ok: false, error: { code: "InternalError", message } };
}
function sessionIdOf(exec) {
  const id = exec?.agent?.session?.id;
  return typeof id === "string" && id !== "" ? id : null;
}
function resolveSessionCwd(exec, sessions) {
  const sessionId = sessionIdOf(exec);
  if (sessionId === null) {
    throw new ProjectError("SessionMissing", "\u6267\u884C\u4E0A\u4E0B\u6587\u7F3A\u5C11 agent.session.id\uFF0C\u65E0\u6CD5\u5B9A\u4F4D\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55", { status: 400 });
  }
  if (!sessions || typeof sessions.get !== "function") {
    throw new ProjectError("SessionsUnavailable", "\u5BBF\u4E3B\u672A\u6CE8\u5165 sessions \u670D\u52A1\uFF0C\u65E0\u6CD5\u5B9A\u4F4D\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55", { status: 500 });
  }
  const cwd = sessions.get(sessionId)?.header?.cwd;
  if (typeof cwd !== "string" || cwd === "") {
    throw new ProjectError("SessionCwdMissing", `\u4F1A\u8BDD ${sessionId} \u7F3A\u5C11 cwd\uFF0C\u65E0\u6CD5\u5B9A\u4F4D\u5DE5\u7A0B\u76EE\u5F55\uFF08\u4E0D\u56DE\u843D process.cwd()\uFF09`, { status: 400 });
  }
  return cwd;
}
function renderSummary(line) {
  return ((result) => {
    if (result && result.ok === false) {
      const error = result.error;
      return `\u5931\u8D25 [${error?.code ?? "Error"}] ${error?.message ?? ""}`.trim();
    }
    return line(result);
  });
}

// src/tools/check.ts
function registerCheckTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_check",
    description: "\u5BF9\u5DE5\u7A0B\u8DD1\u89C4\u5219\u8D28\u68C0\uFF1A\u6587\u5B57\u6EA2\u51FA / \u51FA\u754C / \u91CD\u53E0 / \u5BF9\u6BD4\u5EA6 / \u7ED3\u6784\u5065\u5168 / \u7F3A\u5B57\u4F53\u3002\u8FD4\u56DE { ok, pass, issues:[{page,severity,category,elementId,description,suggestion}] }\uFF1Bblocker \u4F1A\u963B\u65AD ppt_export\u3002\u4F20 ai: true \u8FFD\u52A0 AI \u89C6\u89C9\u8D28\u68C0\uFF08\u6700\u7EC8\u6E32\u67D3\u9875\u622A\u56FE\u9001\u5F53\u524D\u8DEF\u7531\u6A21\u578B\uFF0C\u53EA\u51FA\u5EFA\u8BAE\u4E0D\u963B\u65AD\uFF1B\u8DEF\u7531\u4E0D\u652F\u6301\u56FE\u50CF\u65F6\u964D\u7EA7\u4E3A PNG \u8DEF\u5F84\u6E05\u5355\uFF0C\u7531\u4F60\u81EA\u884C read_image \u590D\u6838\uFF09\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["dir"],
      properties: {
        dir: { type: "string", minLength: 1, description: "\u5DE5\u7A0B\u76EE\u5F55\uFF08\u76F8\u5BF9\u4E8E\u4F1A\u8BDD cwd\uFF09" },
        pages: {
          type: "array",
          items: { type: "integer", minimum: 1 },
          description: "\u53EA\u68C0\u67E5\u8FD9\u4E9B\u9875\uFF081 \u8D77\uFF09\uFF1B\u9ED8\u8BA4\u5168\u90E8"
        },
        ai: { type: "boolean", description: "\u9644\u52A0 AI \u89C6\u89C9\u8D28\u68C0\uFF08\u9ED8\u8BA4 false\uFF1B\u53EA\u51FA\u5EFA\u8BAE\u4E0D\u963B\u65AD\uFF09" }
      }
    },
    output: {
      render: renderSummary((r) => {
        const issues = r.issues ?? [];
        const blockers = issues.filter((i) => i.severity === "blocker").length;
        const ai = r.ai;
        const aiNote = ai === void 0 ? "" : ai.performed === true ? "\uFF0CAI \u5DF2\u5BA1" : "\uFF0CAI \u964D\u7EA7";
        return `\u8D28\u68C0\uFF1A${r.pass === true ? "\u901A\u8FC7" : `${blockers} \u4E2A\u963B\u65AD`}\uFF08\u5171 ${issues.length} \u6761${aiNote}\uFF09`;
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const dir = args.dir;
        const ai = args.ai === true;
        const result = await checkProject(cwd, dir, {
          pages: args.pages,
          withMissingFonts: true,
          ...ai ? {
            ai: {
              cwd,
              deps: {
                llm: ctx.llm,
                attachments: ctx.attachments,
                sessions: ctx.sessions,
                sessionId: sessionIdOf(exec)
              }
            }
          } : {}
        });
        return { ok: true, ...result };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/create.ts
function registerCreateTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_create",
    description: "\u521B\u5EFA PPTD v3 \u6F14\u793A\u6587\u7A3F\u5DE5\u7A0B\uFF1A\u5728\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55\u4E0B\u751F\u6210 <dir>/deck.pptd\u3001manifest.json\uFF08revision: 0\uFF09\u3001pages/\u3001media/ \u4E0E .history/ \u951A\u70B9\u5FEB\u7167\u3002\u8FD4\u56DE { ok, manifest }\uFF1B\u540E\u7EED\u7F16\u8F91\u628A manifest.revision \u4F5C\u4E3A ppt_edit \u7684 baseRevision\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["dir"],
      properties: {
        dir: { type: "string", minLength: 1, description: "\u5DE5\u7A0B\u76EE\u5F55\uFF08\u76F8\u5BF9\u4E8E\u4F1A\u8BDD cwd\uFF09" },
        title: { type: "string", description: "\u6F14\u793A\u6587\u7A3F\u6807\u9898" },
        size: {
          type: "array",
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
          description: `[\u5BBD, \u9AD8]\uFF08px\uFF09\uFF0C\u9ED8\u8BA4 [${DEFAULT_SIZE[0]}, ${DEFAULT_SIZE[1]}]\uFF0816:9\uFF09`
        },
        designSystem: { type: "string", description: "\u8BBE\u8BA1\u7CFB\u7EDF\u65CF\uFF08ppt_themes \u53EF\u67E5\uFF09\uFF0C\u8BB0\u5F55\u8FDB manifest" },
        theme: { type: "string", description: "\u4E3B\u9898 id\uFF08design_system/<\u65CF>/<\u4E3B\u9898>\uFF09\uFF0C\u8BB0\u5F55\u8FDB manifest" }
      }
    },
    output: {
      render: renderSummary((r) => `\u5DF2\u521B\u5EFA\u5DE5\u7A0B\uFF1A${r.manifest?.revision === 0 ? "revision 0" : ""}\uFF08ppt_edit \u5F00\u59CB\u7F16\u8F91\uFF09`)
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const size = args.size;
        const { manifest } = await createProject(cwd, {
          dir: args.dir,
          title: args.title,
          size,
          designSystem: args.designSystem ?? null,
          theme: args.theme ?? null,
          sessionId: sessionIdOf(exec)
        });
        return { ok: true, manifest };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/edit.ts
function registerEditTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_edit",
    description: "\u5BF9 PPTD v3 \u5DE5\u7A0B\u5E94\u7528\u4E00\u7EC4\u7F16\u8F91 op\uFF08\u539F\u5B50\u6279\u91CF\uFF1A\u4EFB\u4E00 op \u5931\u8D25\u6574\u6279\u4E0D\u843D\u76D8\uFF09\u3002op \u8BCD\u8868\uFF08\u51BB\u7ED3\uFF09\uFF1Aadd_page / remove_page / move_page / update_page / page_duplicate / add_element / update_element / remove_element\uFF08\u522B\u540D page_add=add_page\u3001page_delete=remove_page\uFF09\u3002\u5E26 baseRevision \u505A\u4E50\u89C2\u9501\uFF1A\u4E0E manifest.revision \u4E0D\u4E00\u81F4\u8FD4\u56DE 409 RevisionMismatch\u3002\u8FD4\u56DE { ok, revision, appliedOps, warnings }\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["dir", "ops"],
      properties: {
        dir: { type: "string", minLength: 1 },
        ops: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["op"],
            properties: { op: { type: "string", enum: [...OP_NAMES] } },
            additionalProperties: true
          }
        },
        baseRevision: {
          type: "integer",
          minimum: 0,
          description: "\u4E50\u89C2\u9501\u57FA\u7EBF\u4FEE\u8BA2\u53F7\uFF1B\u4E0E\u5F53\u524D manifest.revision \u4E0D\u4E00\u81F4\u65F6\u6574\u6279\u62D2\u7EDD\uFF08409\uFF09"
        }
      }
    },
    output: {
      render: renderSummary((r) => {
        const applied = r.appliedOps?.length ?? 0;
        return `\u5DF2\u5E94\u7528 ${applied} \u4E2A op\uFF0Crevision \u2192 ${String(r.revision)}${r.merged === true ? "\uFF08\u5408\u5E76\u7A97\u53E3\u5185\uFF0C\u4FEE\u8BA2\u53F7\u4FDD\u6301\uFF09" : ""}`;
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const result = await editProject(cwd, {
          dir: args.dir,
          ops: args.ops,
          baseRevision: args.baseRevision,
          sessionId: sessionIdOf(exec)
        });
        return { ok: true, revision: result.revision, appliedOps: result.appliedOps, warnings: result.warnings, merged: result.merged };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/export.ts
import { writeFile as writeFile4 } from "fs/promises";
import path8 from "path";
function registerExportTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_export",
    description: "\u628A\u5DE5\u7A0B\u5BFC\u51FA\u4E3A .pptx\uFF1A\u6784\u5EFA\u5F15\u64CE\u4EA7\u7269\u5E76\u843D\u76D8\u5230 <out>\u3002\u9ED8\u8BA4\u5148\u8DD1\u89C4\u5219\u8D28\u68C0\uFF08\u51FA\u754C/\u6587\u5B57\u6EA2\u51FA/\u7ED3\u6784\uFF09\uFF0C\u6709 blocker \u65F6\u62D2\u7EDD\u5BFC\u51FA\uFF1B\u4F20 skipCheck: true \u53EF\u7ED5\u8FC7\u3002\u6210\u529F\u5BFC\u51FA\u540E\u628A\u6458\u8981\u5199\u8FDB manifest.exportReport\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["dir", "out"],
      properties: {
        dir: { type: "string", minLength: 1, description: "\u5DE5\u7A0B\u76EE\u5F55\uFF08\u76F8\u5BF9\u4E8E\u4F1A\u8BDD cwd\uFF09" },
        out: { type: "string", minLength: 1, description: "\u5BFC\u51FA\u6587\u4EF6\u8DEF\u5F84\uFF08\u76F8\u5BF9\u4E8E\u4F1A\u8BDD cwd\uFF0C.pptx\uFF09" },
        skipCheck: { type: "boolean", description: "\u8DF3\u8FC7\u89C4\u5219\u8D28\u68C0\u76F4\u63A5\u5BFC\u51FA\uFF08\u9ED8\u8BA4 false\uFF09" }
      }
    },
    output: {
      render: renderSummary((r) => {
        const p = r.path;
        const check = r.check;
        return `\u5DF2\u5BFC\u51FA ${p ?? ""}\uFF08\u8D28\u68C0 ${check?.pass === true ? "\u901A\u8FC7" : `\u963B\u65AD ${check?.blockerCount ?? 0} \u9879`}\uFF09`;
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const dir = args.dir;
        const out = args.out;
        const skipCheck = args.skipCheck === true;
        if (skipCheck !== true) {
          const check = await checkProject(cwd, dir, { withMissingFonts: true });
          if (!check.pass) {
            const blockers = check.issues.filter((i) => i.severity === "blocker");
            return {
              ok: false,
              error: {
                code: "ExportBlocked",
                message: `\u89C4\u5219\u8D28\u68C0\u53D1\u73B0 ${blockers.length} \u4E2A\u963B\u65AD\u95EE\u9898\uFF0C\u5BFC\u51FA\u5DF2\u53D6\u6D88\uFF08skipCheck \u53EF\u7ED5\u8FC7\uFF09`,
                detail: blockers
              },
              check: { pass: false, blockerCount: blockers.length }
            };
          }
        }
        const pipeline = await buildProjectDeck(cwd, dir);
        const saved = await saveProjectPptx(pipeline);
        const bytes = saved.bytes;
        const absOut = path8.resolve(cwd, out);
        const rel = path8.relative(cwd, absOut);
        if (rel.startsWith("..") || path8.isAbsolute(rel)) {
          throw new ProjectError("PathOutsideCwd", `\u5BFC\u51FA\u8DEF\u5F84\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${out}`, { status: 400 });
        }
        await writeFile4(absOut, bytes);
        const loaded = await loadProject(cwd, dir);
        const report = {
          revision: pipeline.revision,
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          out: path8.relative(cwd, absOut).replace(/\\/g, "/"),
          bytes: bytes.byteLength,
          fontsUsed: pipeline.fontsUsed,
          transition: loaded.deck.export?.transition ?? "fade",
          animations: loaded.deck.export?.animations ?? "auto",
          fontEmbed: saved.fontEmbed ? {
            mode: saved.fontEmbed.mode,
            facesEmbedded: saved.fontEmbed.facesEmbedded.length,
            skipped: saved.fontEmbed.skipped.length,
            rawBytes: saved.fontEmbed.rawBytes,
            finalBytes: saved.fontEmbed.finalBytes,
            warnings: saved.fontEmbed.warnings,
            subset: saved.fontEmbed.subset,
            skippedDetail: saved.fontEmbed.skipped
          } : { mode: "off" },
          buildWarnings: pipeline.buildWarnings
        };
        await writeExportReport(cwd, dir, report);
        return {
          ok: true,
          path: report.out,
          revision: pipeline.revision,
          bytes: bytes.byteLength,
          fontsUsed: pipeline.fontsUsed,
          warnings: pipeline.buildWarnings,
          fontEmbed: saved.fontEmbed ? {
            mode: saved.fontEmbed.mode,
            facesEmbedded: saved.fontEmbed.facesEmbedded,
            facesEmbeddedCount: saved.fontEmbed.facesEmbedded.length,
            skipped: saved.fontEmbed.skipped,
            skippedCount: saved.fontEmbed.skipped.length,
            rawBytes: saved.fontEmbed.rawBytes,
            finalBytes: saved.fontEmbed.finalBytes,
            subset: saved.fontEmbed.subset,
            warnings: saved.fontEmbed.warnings
          } : { mode: "off", facesEmbedded: [], facesEmbeddedCount: 0, skipped: [], skippedCount: 0, rawBytes: bytes.byteLength, finalBytes: bytes.byteLength, warnings: [] },
          check: { pass: true, blockerCount: 0 }
        };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/import.ts
import path11 from "path";
import { access, readFile as readFile9 } from "fs/promises";

// src/core/reverse/apply.ts
import { readFile as readFile8 } from "fs/promises";
import path10 from "path";
import { createHash as createHash3 } from "crypto";

// src/core/reverse/read.ts
import {
  getExtendedProperties,
  getPresentationFonts,
  getShapeBoundsResolved,
  getShapeFlip,
  getShapeId,
  getShapeKind,
  getShapeName as getShapeName2,
  getShapeRotation,
  getShapeText as getShapeText3,
  getSlideAt,
  getSlideCount,
  getSlideLayout,
  getSlideLayoutName,
  getSlideLayoutPartName,
  getSlideLayoutType,
  getSlideNotes,
  getSlidePartName,
  getSlideShapes as getSlideShapes3,
  getSlideSize,
  getSlideTitle,
  getSlides as getSlides4,
  isSlideHidden,
  ungroupShapes
} from "@office-kit/pptx";
async function loadReverseModel(bytes) {
  const { loadPresentation: loadPresentation2 } = await import("@office-kit/pptx");
  const pres = await loadPresentation2(bytes);
  const slideSize = getSlideSize(pres);
  const fonts = getPresentationFonts(pres);
  const core = getExtendedProperties(pres);
  const slides = [];
  const count = getSlideCount(pres);
  const slideHandles = getSlides4(pres);
  for (let i = 0; i < count; i++) {
    const slide = slideHandles[i] ?? getSlideAt(pres, i);
    const slideIndex = i + 1;
    const layout = getSlideLayout(slide);
    const shapes = [];
    for (const shape of getSlideShapes3(slide)) {
      collectShape(
        pres,
        shape,
        slideIndex,
        shapes,
        /* fromGroup */
        false
      );
    }
    slides.push({
      slideIndex,
      partName: getSlidePartName(slide),
      title: getSlideTitle(slide),
      hidden: isSlideHidden(slide),
      notes: getSlideNotes(slide),
      layoutRef: layout ? {
        partName: getSlideLayoutPartName(layout),
        name: getSlideLayoutName(layout),
        type: getSlideLayoutType(layout)
      } : null,
      sectionName: null,
      // sections are presentation-level; recorded per-slide in map.ts when it matters
      shapes,
      raw: slide
    });
  }
  return {
    pres,
    slides,
    slideSize: slideSize ? { width: Number(slideSize.width), height: Number(slideSize.height) } : null,
    fonts: fonts ? {
      majorLatin: fonts.majorLatin,
      majorEastAsian: fonts.majorEastAsian,
      majorComplexScript: fonts.majorComplexScript,
      minorLatin: fonts.minorLatin,
      minorEastAsian: fonts.minorEastAsian,
      minorComplexScript: fonts.minorComplexScript
    } : null,
    sourceApp: core?.application ?? null
  };
}
function collectShape(pres, shape, slideIndex, into, fromGroup) {
  const kind = getShapeKind(shape);
  if (kind === "group") {
    try {
      const children = ungroupShapes(shape);
      if (children.length === 0) {
        into.push(baseRecord(pres, shape, slideIndex, kind, fromGroup, "group"));
      }
      for (const child of children) {
        collectShape(pres, child, slideIndex, into, true);
      }
      return;
    } catch {
      into.push(baseRecord(pres, shape, slideIndex, kind, fromGroup, "group"));
      return;
    }
  }
  into.push(baseRecord(pres, shape, slideIndex, kind, fromGroup));
}
function baseRecord(pres, shape, slideIndex, kind, fromGroup, forceKind) {
  let bounds = null;
  try {
    const resolved = getShapeBoundsResolved(pres, shape);
    if (resolved) {
      bounds = { x: Number(resolved.x), y: Number(resolved.y), w: Number(resolved.w), h: Number(resolved.h) };
    }
  } catch {
    bounds = null;
  }
  return {
    slideIndex,
    shapeId: getShapeId(shape),
    originalName: getShapeName2(shape),
    kind: forceKind ?? kind,
    placeholderType: shape.placeholderType ?? null,
    bounds,
    rotationDeg: (() => {
      try {
        return getShapeRotation(shape);
      } catch {
        return 0;
      }
    })(),
    flip: (() => {
      try {
        const f = getShapeFlip(shape);
        if (f && typeof f === "object") {
          return { horizontal: f.horizontal === true, vertical: f.vertical === true };
        }
        return { horizontal: false, vertical: false };
      } catch {
        return { horizontal: false, vertical: false };
      }
    })(),
    opacity: (() => {
      try {
        const o = shape.opacity;
        return typeof o === "number" ? o : null;
      } catch {
        return null;
      }
    })(),
    text: (() => {
      try {
        return getShapeText3(shape);
      } catch {
        return "";
      }
    })(),
    raw: shape,
    fromGroup
  };
}

// src/core/reverse/map.ts
import {
  getParagraphAlignment,
  getParagraphBullet,
  getParagraphLineSpacing,
  getParagraphSpacing,
  getShapeAdjustValues,
  getShapeAnimation,
  getShapeCustomGeometry,
  getShapeFill,
  getShapeImageBytes,
  getShapeImageCrop,
  getShapeImageFillBytes,
  getShapeImageOpacity,
  getShapeMedia,
  getShapeParagraphCount,
  getShapeParagraphElements,
  getShapePreset,
  getShapeRunFormatEffective,
  getShapeStroke,
  getShapeStrokeDash,
  getShapeTextAnchor,
  getShapeTextDirection,
  getShapeTextWrap,
  getShapeXmlString,
  getSlideAnimations,
  getSlideBackground,
  getSlideBackgroundGradientFill,
  getSlideBackgroundImageBytes,
  getSlideLayout as getSlideLayout2,
  getSlideLayoutBackground,
  getSlideLayoutBackgroundGradientFill,
  getSlideLayoutBackgroundImageBytes,
  getSlideMasterBackground,
  getSlideMasterBackgroundGradientFill,
  getSlideMasterBackgroundImageBytes,
  getSlideTransition,
  getPresentationTheme,
  getTableCellParagraphs,
  getTableCellAlignment,
  getTableCellAnchor,
  getTableCellFill,
  getTableCellSpan,
  getTableCellText,
  getTableColumnWidths,
  getTableDimensions,
  getTableRowHeights,
  getTableCell as getTableCell2,
  getTableStyleId,
  isChartShape,
  isShapeTextBox,
  isTableShape
} from "@office-kit/pptx";
var EMU_PER_PX = 12700;
var DEFAULT_SIZE2 = [960, 540];
function emuToPx(emu2) {
  return Math.round(emu2 / EMU_PER_PX * 100) / 100;
}
function pxBounds(b) {
  return [emuToPx(b.x), emuToPx(b.y), emuToPx(b.w), emuToPx(b.h)];
}
function slideIndexLabel(n) {
  return String(n).padStart(2, "0");
}
function placeholderFor(rec, originalType, label) {
  const boundsPx = rec.bounds ? pxBounds(rec.bounds) : [0, 0, DEFAULT_SIZE2[0] / 4, DEFAULT_SIZE2[1] / 4];
  return {
    elementId: `ph-${rec.slideIndex}-${rec.shapeId}`,
    elementType: "placeholder",
    bounds: boundsPx,
    originalType,
    originalName: rec.originalName,
    label: label ?? PLACEHOLDER_DEFAULT_LABELS[originalType],
    sourceRef: { slideIndex: rec.slideIndex, shapeId: rec.shapeId }
  };
}
function ensurePlaceholder(page, rec, originalType, report, reason) {
  const placeholder = placeholderFor(rec, originalType);
  page.elements.push(placeholder);
  report.dropped.push({
    page: rec.slideIndex,
    shapeId: rec.shapeId,
    originalName: rec.originalName,
    originalType,
    reason,
    placeholder: {
      elementId: placeholder.elementId,
      bounds: placeholder.bounds
    }
  });
}
function elementIdOf(rec) {
  return `el-${rec.slideIndex}-${rec.shapeId}`;
}
function baseElement(rec) {
  return {
    elementId: elementIdOf(rec),
    bounds: rec.bounds ? pxBounds(rec.bounds) : [0, 0, 100, 100],
    rotation: rec.rotationDeg,
    opacity: rec.opacity ?? 1,
    flip: [rec.flip.horizontal, rec.flip.vertical],
    sourceRef: { slideIndex: rec.slideIndex, shapeId: rec.shapeId },
    originalName: rec.originalName
  };
}
var H_ALIGN_MAP = {
  l: "left",
  ctr: "center",
  r: "right",
  just: "justify",
  dist: "distribute",
  justLow: "justify",
  thaiDist: "distribute"
};
var V_ALIGN_MAP = {
  top: "top",
  center: "middle",
  bottom: "bottom",
  t: "top",
  ctr: "middle",
  b: "bottom",
  just: "middle",
  dist: "middle"
};
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
function fmtPx(v) {
  const r = Math.round(v * 100) / 100;
  return String(r);
}
function runToHtml(text, fmt) {
  let inner = escapeHtml(text);
  if (fmt.bold) inner = `<strong>${inner}</strong>`;
  if (fmt.italic) inner = `<em>${inner}</em>`;
  if (fmt.underline === true || typeof fmt.underline === "string" && fmt.underline !== "none") {
    inner = `<u>${inner}</u>`;
  }
  if (typeof fmt.baseline === "number" && fmt.baseline !== 0) {
    inner = fmt.baseline > 0 ? `<sup>${inner}</sup>` : `<sub>${inner}</sub>`;
  }
  const styles = [];
  if (typeof fmt.size === "number" && fmt.size > 0) {
    styles.push(`font-size:${fmtPx(fmt.size)}px`);
  }
  if (typeof fmt.color === "string" && fmt.color !== "") {
    styles.push(`color:${asLiteralColor(fmt.color)}`);
  }
  const families = [];
  if (fmt.font) families.push(fmt.font);
  if (fmt.fontEastAsian && fmt.fontEastAsian !== fmt.font) families.push(fmt.fontEastAsian);
  if (families.length > 0) {
    styles.push(`font-family:${families.join(", ")}`);
  }
  if (styles.length > 0) {
    inner = `<span style="${escapeAttr(styles.join(";"))}">${inner}</span>`;
  }
  return inner;
}
function readRichParagraphs(pres, shape) {
  let paraCount = 0;
  try {
    paraCount = getShapeParagraphCount(shape);
  } catch {
    return null;
  }
  if (paraCount === 0) return null;
  let elements;
  try {
    elements = getShapeParagraphElements(shape);
  } catch {
    return null;
  }
  const out = [];
  for (let p = 0; p < paraCount; p++) {
    const parts = [];
    let runsRead = false;
    const els = elements[p] ?? [];
    let runIndex = -1;
    for (const el of els) {
      if (el.kind === "br") {
        parts.push("<br>");
        continue;
      }
      runIndex += 1;
      const text = typeof el.text === "string" ? el.text : "";
      if (text === "") continue;
      let fmt = el.format ?? {};
      try {
        const eff = getShapeRunFormatEffective(pres, shape, p, runIndex);
        if (eff) {
          fmt = { ...eff };
          runsRead = true;
        }
      } catch {
        if (el.format) runsRead = true;
      }
      parts.push(
        runToHtml(text, {
          font: typeof fmt.font === "string" ? fmt.font : void 0,
          fontEastAsian: typeof fmt.fontEastAsian === "string" ? fmt.fontEastAsian : void 0,
          size: typeof fmt.size === "number" ? fmt.size : void 0,
          color: typeof fmt.color === "string" ? fmt.color : null,
          bold: fmt.bold === true,
          italic: fmt.italic === true,
          underline: fmt.underline ?? false,
          baseline: typeof fmt.baseline === "number" ? fmt.baseline : void 0
        })
      );
    }
    let align = null;
    try {
      const a = getParagraphAlignment(shape, p);
      if (a && H_ALIGN_MAP[a]) align = H_ALIGN_MAP[a];
    } catch {
    }
    let lineSpacingPct = null;
    let lineSpacingPts = null;
    try {
      const ls = getParagraphLineSpacing(shape, p);
      if (ls?.kind === "pct") lineSpacingPct = ls.value;
      else if (ls?.kind === "pts") lineSpacingPts = ls.value;
    } catch {
    }
    let spaceBeforePts = null;
    try {
      const sp = getParagraphSpacing(shape, p);
      if (typeof sp?.beforePts === "number") spaceBeforePts = sp.beforePts;
    } catch {
    }
    let bulletKind = null;
    try {
      const b = getParagraphBullet(shape, p);
      if (b === "bullet" || typeof b === "object" && b !== null && "char" in b) bulletKind = "bullet";
      else if (b === "number" || typeof b === "object" && b !== null && "autoNum" in b) bulletKind = "number";
    } catch {
    }
    out.push({ html: parts.join(""), align, lineSpacingPct, lineSpacingPts, spaceBeforePts, bulletKind, runsRead });
  }
  return out;
}
function paragraphsToHtml(paras) {
  const chunks = [];
  let listTag = null;
  const closeList = () => {
    if (listTag) {
      chunks.push(`</${listTag}>`);
      listTag = null;
    }
  };
  for (const para of paras) {
    const styles = [];
    if (para.align) styles.push(`text-align:${para.align}`);
    if (para.lineSpacingPct !== null) styles.push(`line-height:${para.lineSpacingPct}`);
    else if (para.lineSpacingPts !== null) styles.push(`line-height:${fmtPx(para.lineSpacingPts)}px`);
    if (para.spaceBeforePts !== null) styles.push(`margin-top:${fmtPx(para.spaceBeforePts)}px`);
    const styleAttr = styles.length > 0 ? ` style="${escapeAttr(styles.join(";"))}"` : "";
    if (para.bulletKind) {
      const tag = para.bulletKind === "number" ? "ol" : "ul";
      if (listTag !== tag) {
        closeList();
        chunks.push(`<${tag}>`);
        listTag = tag;
      }
      chunks.push(`<li${styleAttr}>${para.html}</li>`);
    } else {
      closeList();
      chunks.push(`<p${styleAttr}>${para.html}</p>`);
    }
  }
  closeList();
  return chunks.join("");
}
function mapText(rec, pres, fonts, report) {
  const shape = rec.raw;
  const rich = readRichParagraphs(pres, shape);
  const hasRich = rich !== null && rich.some((p) => p.html !== "" || p.align !== null || p.lineSpacingPct !== null || p.lineSpacingPts !== null);
  let hAlign = "left";
  if (rich) {
    for (const p of rich) {
      if (p.align) {
        hAlign = p.align;
        break;
      }
    }
  }
  let vAlign = "top";
  try {
    const anchor = getShapeTextAnchor(shape);
    if (anchor && V_ALIGN_MAP[anchor]) vAlign = V_ALIGN_MAP[anchor];
  } catch {
  }
  const content = {
    text: hasRich ? paragraphsToHtml(rich) : rec.text,
    align: [hAlign, vAlign],
    wrap: (() => {
      try {
        return getShapeTextWrap(shape) !== "none";
      } catch {
        return true;
      }
    })()
  };
  if (rich === null && rec.text !== "") {
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
      feature: "unknown",
      detail: "run \u7EA7\u683C\u5F0F\u8BFB\u53D6\u5931\u8D25\uFF0C\u6587\u672C\u6309\u7EAF\u6587\u672C\u843D\u76D8\uFF08\u5B57\u4F53/\u5B57\u53F7/\u52A0\u7C97/\u5BF9\u9F50\u7EE7\u627F\u4E3B\u9898\u9ED8\u8BA4\uFF09"
    });
  }
  try {
    const direction = getShapeTextDirection(shape);
    if (direction === "eaVert" || direction === "vert") content.textDirection = "vertical";
  } catch {
  }
  if (fonts) {
    content.fontFamily = {
      latin: fonts.minorLatin ?? fonts.majorLatin ?? "Calibri",
      ea: fonts.minorEastAsian ?? fonts.majorEastAsian ?? "Microsoft YaHei"
    };
  }
  return {
    ...baseElement(rec),
    elementType: "text",
    content
  };
}
function mapShape(rec) {
  const shape = rec.raw;
  const element = {
    ...baseElement(rec),
    elementType: "shape"
  };
  try {
    const preset = getShapePreset(shape);
    if (preset && preset !== "rect") element.shapeName = preset;
  } catch {
  }
  try {
    const adjustments = getShapeAdjustValues(shape);
    const values = Object.values(adjustments).filter((v) => typeof v === "number");
    if (values.length > 0) element.adjustments = values;
  } catch {
  }
  try {
    const fill = getShapeFill(shape);
    if (fill.kind === "solid") {
      element.fill = { type: "solid", color: asLiteralColor(fill.color) };
    }
  } catch {
  }
  try {
    const stroke = getShapeStroke(shape);
    if (stroke.kind === "solid") {
      const border = {
        style: "solid",
        width: typeof stroke.widthEmu === "number" ? emuToPx(stroke.widthEmu) : 1,
        color: asLiteralColor(stroke.color)
      };
      try {
        const dash = getShapeStrokeDash(shape);
        if (dash === "dash" || dash === "sysDot") border.style = dash === "dash" ? "dash" : "dot";
      } catch {
      }
      element.border = border;
    }
  } catch {
  }
  return element;
}
function asLiteralColor(raw) {
  if (raw.startsWith("#") || raw.startsWith("scheme:")) return raw;
  return `#${raw.replace(/^#/, "")}`.toUpperCase();
}
function mapImage(rec, media, report) {
  const shape = rec.raw;
  const bytes = (() => {
    try {
      return getShapeImageBytes(shape) ?? getShapeImageFillBytes(shape);
    } catch {
      return null;
    }
  })();
  if (!bytes) {
    return placeholderFor(rec, "unknown", `\u56FE\u7247\u7F3A\u5931\uFF1A${rec.originalName || "\u672A\u547D\u540D"}`);
  }
  const ext = ".png";
  const partName = `ppt/media/image-${rec.slideIndex}-${rec.shapeId}${ext}`;
  media.push({ bytes, ext, partName });
  const element = {
    ...baseElement(rec),
    elementType: "image",
    src: `media/${partName.split("/").pop()}`,
    partName
  };
  try {
    const crop = getShapeImageCrop(shape);
    if (crop) {
      element.crop = {
        left: crop.left ?? 0,
        top: crop.top ?? 0,
        right: crop.right ?? 0,
        bottom: crop.bottom ?? 0
      };
    }
  } catch {
  }
  try {
    const opacity = getShapeImageOpacity(shape);
    if (typeof opacity === "number" && opacity < 1) element.opacity = opacity;
  } catch {
  }
  return element;
}
function mapTable(rec, pres, report) {
  const shape = rec.raw;
  const element = {
    ...baseElement(rec),
    elementType: "table"
  };
  try {
    const dims = getTableDimensions(shape);
    const rowHeights = getTableRowHeights(shape);
    const colWidths = getTableColumnWidths(shape);
    const totalH = rec.bounds?.h ?? rowHeights.reduce((a, b) => a + b, 0);
    const totalW = rec.bounds?.w ?? colWidths.reduce((a, b) => a + b, 0);
    element.columnWidths = colWidths.map((w) => totalW > 0 ? w / totalW : 1 / colWidths.length);
    element.rowHeights = rowHeights.map((h) => totalH > 0 ? h / totalH : 1 / rowHeights.length);
    const rows = [];
    for (let r = 0; r < dims.rows; r++) {
      const row = [];
      for (let c = 0; c < dims.cols; c++) {
        const cell = getTableCell2(shape, r, c);
        const cellObj = { text: "" };
        try {
          const span = getTableCellSpan(cell);
          if (span.rowSpan && span.rowSpan > 1) cellObj.rowSpan = span.rowSpan;
          if (span.gridSpan && span.gridSpan > 1) cellObj.colSpan = span.gridSpan;
        } catch {
        }
        try {
          cellObj.text = getTableCellText(cell);
        } catch {
        }
        try {
          const paras = getTableCellParagraphs(cell);
          if (paras.length > 0) {
            const parts = [];
            for (const el of paras[0].elements) {
              if (el.kind === "r" || el.kind === "fld") parts.push(el.text ?? "");
            }
            if (parts.length > 0) cellObj.text = parts.join("");
          }
        } catch {
        }
        try {
          const fill = getTableCellFill(cell);
          if (fill) {
            cellObj.fill = { type: "solid", color: fill.startsWith("scheme:") || fill.startsWith("#") ? fill : `#${fill}` };
          }
        } catch {
        }
        try {
          const algn = getTableCellAlignment(cell);
          const anchor = getTableCellAnchor(cell);
          const hMap2 = { l: "left", ctr: "center", r: "right", just: "justify", dist: "distributed", justLow: "justify", thaiDist: "distributed" };
          const h = algn ? hMap2[algn] : void 0;
          const v = anchor === "center" ? "middle" : anchor === "bottom" ? "bottom" : anchor === "top" ? "top" : void 0;
          if (h && h !== "left" && typeof cellObj.text === "string" && cellObj.text !== "" && !cellObj.text.includes("<")) {
            cellObj.text = `<p style="text-align:${h}">${escapeHtml(cellObj.text)}</p>`;
          }
          if (h || v) cellObj.align = [h ?? "left", v ?? "middle"];
        } catch {
        }
        row.push(cellObj);
      }
      rows.push(row);
    }
    element.rows = rows;
  } catch (err2) {
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
      feature: "unknown",
      detail: `\u8868\u683C\u51E0\u4F55/\u5355\u5143\u683C\u8BFB\u53D6\u5931\u8D25\uFF1A${err2.message}`
    });
  }
  try {
    const styleId = getTableStyleId(shape);
    if (styleId) {
      element.builtinStyle = { id: styleId };
      report.degraded.push({
        page: rec.slideIndex,
        elementId: elementIdOf(rec),
        feature: "table.styleId",
        detail: "\u5185\u7F6E\u8868\u683C\u6837\u5F0F id \u8BB0\u5165 builtinStyle\uFF1B\u663E\u5F0F\u5355\u5143\u683C\u586B\u5145/\u5BF9\u9F50\u5DF2\u6309\u5B57\u9762\u91CF\u8FD8\u539F\uFF0C\u6837\u5F0F\u8868\u6D3E\u751F\u7684\u6761\u7EB9\u4E0E\u9996\u884C\u5F3A\u8C03\u4E0D\u8FD8\u539F",
        originalValue: styleId
      });
    }
  } catch {
  }
  void pres;
  return element;
}
function mapLine(rec) {
  return {
    ...baseElement(rec),
    elementType: "line",
    points: "0,0 100,100"
  };
}
function resolveEffectiveBackground(rawSlide, pres) {
  let layout = null;
  try {
    layout = getSlideLayout2(rawSlide);
  } catch {
    layout = null;
  }
  const slideBg = (() => {
    try {
      return getSlideBackground(rawSlide);
    } catch {
      return { kind: "inherit" };
    }
  })();
  const readLevel = (bg, gradient, imageBytes, level) => {
    if (bg.kind === "solid") {
      return { bg, solidColor: bg.color, gradient, imageBytes, level };
    }
    if (bg.kind === "gradient") {
      if (gradient && gradient.stops.length > 0) {
        return { bg, solidColor: null, gradient, imageBytes, level };
      }
      return null;
    }
    if (bg.kind === "image") {
      if (imageBytes) return { bg, solidColor: null, gradient, imageBytes, level };
      return null;
    }
    return null;
  };
  if (slideBg.kind !== "inherit") {
    let gradient = null;
    let imageBytes = null;
    try {
      if (slideBg.kind === "gradient") {
        const g = getSlideBackgroundGradientFill(rawSlide);
        if (g) gradient = { stops: g.stops.map((s) => ({ offset: s.offset, color: String(s.color) })) };
      } else if (slideBg.kind === "image") {
        imageBytes = getSlideBackgroundImageBytes(rawSlide);
      }
    } catch {
    }
    const src = readLevel(slideBg, gradient, imageBytes, "slide");
    if (src) return src;
  }
  if (layout) {
    let layoutBg = null;
    try {
      layoutBg = getSlideLayoutBackground(layout);
    } catch {
      layoutBg = null;
    }
    if (layoutBg && layoutBg.kind !== "inherit") {
      let gradient = null;
      let imageBytes = null;
      try {
        if (layoutBg.kind === "gradient") {
          const g = getSlideLayoutBackgroundGradientFill(layout);
          if (g) gradient = { stops: g.stops.map((s) => ({ offset: s.offset, color: String(s.color) })) };
        } else if (layoutBg.kind === "image") {
          imageBytes = getSlideLayoutBackgroundImageBytes(pres, layout);
        }
      } catch {
      }
      const src = readLevel(layoutBg, gradient, imageBytes, "layout");
      if (src) return src;
    }
    let masterBg = null;
    try {
      masterBg = getSlideMasterBackground(pres, layout);
    } catch {
      masterBg = null;
    }
    if (masterBg && masterBg.kind !== "inherit") {
      let gradient = null;
      let imageBytes = null;
      try {
        if (masterBg.kind === "gradient") {
          const g = getSlideMasterBackgroundGradientFill(pres, layout);
          if (g) gradient = { stops: g.stops.map((s) => ({ offset: s.offset, color: String(s.color) })) };
        } else if (masterBg.kind === "image") {
          imageBytes = getSlideMasterBackgroundImageBytes(pres, layout);
        }
      } catch {
      }
      const src = readLevel(masterBg, gradient, imageBytes, "master");
      if (src) return src;
    }
  }
  return null;
}
function applyBackgroundChain(rawSlide, pres, slideIndex, page, media, report) {
  let src = null;
  try {
    src = resolveEffectiveBackground(rawSlide, pres);
  } catch {
    src = null;
  }
  if (!src) return;
  if (src.solidColor !== null) {
    page.background = { type: "solid", color: asLiteralColor(src.solidColor) };
  } else if (src.gradient) {
    page.background = {
      type: "gradient",
      gradientType: "linear",
      stops: src.gradient.stops.map((s) => ({ position: s.offset, color: asLiteralColor(s.color) }))
    };
  } else if (src.imageBytes) {
    const partName = `ppt/media/bg-${slideIndex}-${src.level}.png`;
    media.push({ bytes: src.imageBytes, ext: ".png", partName });
    page.background = { type: "image", src: `media/${partName.split("/").pop()}` };
  }
  if (src.level !== "slide") {
    report.degraded.push({
      page: slideIndex,
      elementId: null,
      feature: "unknown",
      detail: `\u9875\u9762\u80CC\u666F\u7EE7\u627F\u81EA${src.level === "layout" ? "\u7248\u5F0F" : "\u6BCD\u7248"}\uFF08slide \u672A\u663E\u5F0F\u8BBE\u7F6E\uFF09\uFF0C\u5DF2\u6309\u6700\u7EC8\u751F\u6548\u503C\u843D\u76D8`
    });
  }
}
var GRAPHIC_DATA_URI_TYPES = [
  ["drawingml/2006/diagram", "smartArt"],
  ["drawingml/2006/chart", "chart"],
  ["oleobject", "ole"],
  ["drawingml/2006/3d", "object3d"]
];
function classifyUnhandledShape(shape, kind) {
  let xml = "";
  try {
    xml = getShapeXmlString(shape);
  } catch {
    xml = "";
  }
  if (xml !== "") {
    const uriMatch = /a:graphicData[^>]*\suri="([^"]+)"/.exec(xml);
    if (uriMatch) {
      const uri = uriMatch[1];
      for (const [fragment, type] of GRAPHIC_DATA_URI_TYPES) {
        if (uri.includes(fragment)) {
          return { originalType: type, reason: `graphicData URI ${uri} \u4E0D\u6620\u5C04\u4E3A PPTD \u5143\u7D20` };
        }
      }
      return { originalType: "unknown", reason: `graphicData URI ${uri} \u672A\u5EFA\u6A21` };
    }
    if (/<p:oleObj[\s>]|<p:graphicFrame[^>]*>[\s\S]*oleObj/.test(xml)) {
      return { originalType: "ole", reason: "OLE \u5D4C\u5165\u5BF9\u8C61\u4E0D\u6620\u5C04\u4E3A PPTD \u5143\u7D20" };
    }
    if (/<p:sp[^>]*>[\s\S]*scene3d|sp3d/.test(xml)) {
      return { originalType: "object3d", reason: "\u4E09\u7EF4\u56FE\u5F62\u4E0D\u6620\u5C04\u4E3A PPTD \u5143\u7D20" };
    }
  }
  try {
    const media = getShapeMedia(shape);
    if (media) {
      return { originalType: "media", reason: `\u5A92\u4F53\u526A\u8F91\uFF08${media.kind}\uFF09\u4E0D\u6620\u5C04\u4E3A PPTD \u5143\u7D20` };
    }
  } catch {
  }
  if (kind === "graphicFrame") {
    return { originalType: "unknown", reason: "graphicFrame \u65E0 graphicData URI\uFF0C\u65E0\u6CD5\u5F52\u7C7B" };
  }
  return null;
}
function mapPage(slide, pres, fonts, media, report) {
  const page = {
    elements: []
  };
  if (slide.hidden) page.hidden = true;
  if (slide.layoutRef) {
    page.layoutRef = {
      partName: slide.layoutRef.partName,
      ...slide.layoutRef.name !== void 0 ? { name: slide.layoutRef.name } : {},
      ...slide.layoutRef.type !== void 0 ? { type: slide.layoutRef.type } : {}
    };
  }
  if (slide.notes !== null && slide.notes !== "") page.notes = slide.notes;
  if (slide.title !== null && slide.title !== "") page.title = slide.title;
  const rawSlide = slide.raw;
  applyBackgroundChain(rawSlide, pres, slide.slideIndex, page, media, report);
  try {
    const transition = getSlideTransition(rawSlide);
    if (transition) {
      page.transition = {
        effect: transition.effect,
        ...transition.preset !== void 0 ? { preset: transition.preset } : {}
      };
    }
  } catch {
  }
  for (const rec of slide.shapes) {
    if (rec.bounds === null) {
      ensurePlaceholder(page, rec, "unknown", report, "\u5F62\u72B6\u65E0\u53EF\u7528\u51E0\u4F55\uFF08own / layout / master \u4E09\u94FE\u90FD\u7F3A <a:xfrm>\uFF09");
      continue;
    }
    try {
      const rawShape = rec.raw;
      if (isTableShape(rawShape)) {
        page.elements.push(mapTable(rec, pres, report));
        continue;
      }
      if (isChartShape(rawShape)) {
        ensurePlaceholder(page, rec, "chart", report, "\u539F\u751F\u56FE\u8868\u90E8\u4EF6\u4E0D\u6620\u5C04\u4E3A PPTD \u5143\u7D20");
        continue;
      }
      switch (rec.kind) {
        case "shape": {
          if (isShapeTextBox(rawShape)) {
            page.elements.push(mapText(rec, pres, fonts, report));
            break;
          }
          let isCustom = false;
          try {
            if (getShapeCustomGeometry(rawShape)) {
              isCustom = true;
            }
          } catch {
          }
          if (isCustom) {
            report.degraded.push({
              page: rec.slideIndex,
              elementId: elementIdOf(rec),
              feature: "unknown",
              detail: "\u81EA\u5B9A\u4E49\u51E0\u4F55\u5F62\u72B6\uFF08custGeom\uFF09\u6309 rect \u843D\u76D8\uFF0C\u8DEF\u5F84\u6570\u636E\u672A\u4FDD\u7559"
            });
          }
          page.elements.push(mapShape(rec));
          break;
        }
        case "connector":
          page.elements.push(mapLine(rec));
          break;
        case "graphicFrame": {
          const cls = classifyUnhandledShape(rawShape, rec.kind);
          ensurePlaceholder(
            page,
            rec,
            cls?.originalType ?? "unknown",
            report,
            cls?.reason ?? "graphicFrame \u65E0\u6CD5\u5F52\u7C7B"
          );
          break;
        }
        case "picture": {
          const cls = classifyUnhandledShape(rawShape, rec.kind);
          if (cls && cls.originalType === "media") {
            ensurePlaceholder(page, rec, "media", report, cls.reason);
          } else {
            page.elements.push(mapImage(rec, media, report));
          }
          break;
        }
        default: {
          const textBox = isShapeTextBox(rawShape);
          if (textBox || rec.text !== "") {
            page.elements.push(mapText(rec, pres, fonts, report));
          } else {
            page.elements.push(mapShape(rec));
          }
        }
      }
    } catch (err2) {
      ensurePlaceholder(page, rec, "unknown", report, `\u5F62\u72B6\u6620\u5C04\u629B\u9519\uFF1A${err2.message}`);
    }
  }
  try {
    const animations = getSlideAnimations(rawSlide);
    if (animations && animations.length > 0) {
      const mapped = [];
      for (const step of animations) {
        const target = step.target;
        const shapeId = target?.shapeId;
        const effect = step.effect ?? null;
        const originalEffect = step.originalEffect;
        const elementId = shapeId !== void 0 && shapeId !== null ? `el-${slide.slideIndex}-${shapeId}` : `el-${slide.slideIndex}-0`;
        mapped.push({
          elementId,
          effect,
          ...originalEffect !== void 0 ? { originalEffect } : {},
          ...step.start !== void 0 ? { trigger: step.start } : {},
          ...step.durationMs !== void 0 && step.durationMs !== null ? { durationMs: step.durationMs } : {},
          ...step.delayMs !== void 0 && step.delayMs !== null ? { delayMs: step.delayMs } : {}
        });
      }
      page.animations = mapped;
    }
  } catch {
  }
  return page;
}
function mapReverseModel(read, options) {
  const pres = read.pres;
  const slideCount = read.slides.length;
  const sizePx = read.slideSize ? [emuToPx(read.slideSize.width), emuToPx(read.slideSize.height)] : DEFAULT_SIZE2;
  const pages = [];
  const media = [];
  const report = {
    version: "v3",
    profile: "reverse",
    source: {
      path: options.sourcePath,
      sha1: options.sourceSha1,
      slideCount,
      size: sizePx,
      ...read.sourceApp !== null ? { app: read.sourceApp } : {}
    },
    summary: {
      pages: slideCount,
      elements: 0,
      placeholders: 0,
      dropped: 0,
      degraded: 0,
      unmodeledParts: []
    },
    dropped: [],
    degraded: []
  };
  for (const slide of read.slides) {
    pages.push(mapPage(slide, pres, read.fonts, media, report));
  }
  const themeColors = getPresentationTheme(pres);
  const deck = {
    version: "v3",
    profile: "reverse",
    size: sizePx,
    // R3：母版 txStyles 不可完整还原；主题字体落到 title/body 两个
    // textStyles 槽位，作为占位符未显式设字体时的默认（render 端 run 级
    // 富文本已逐字携带字体，textStyles 只兜底空文本与新建文本框）。
    // 导出端同时用它们回写 major/minor 字体方案（setPresentationFonts）。
    ...read.fonts || themeColors ? {
      theme: {
        ...themeColors ? {
          colors: {
            dark1: themeColors.dark1,
            light1: themeColors.light1,
            dark2: themeColors.dark2,
            light2: themeColors.light2,
            accent1: themeColors.accent1,
            accent2: themeColors.accent2,
            accent3: themeColors.accent3,
            accent4: themeColors.accent4,
            accent5: themeColors.accent5,
            accent6: themeColors.accent6,
            hyperlink: themeColors.hyperlink,
            followedHyperlink: themeColors.followedHyperlink
          }
        } : {},
        ...read.fonts ? {
          textStyles: {
            title: {
              fontFamily: {
                latin: read.fonts.majorLatin ?? "Calibri",
                ea: read.fonts.majorEastAsian ?? read.fonts.majorLatin ?? "Calibri"
              }
            },
            body: {
              fontFamily: {
                latin: read.fonts.minorLatin ?? "Calibri",
                ea: read.fonts.minorEastAsian ?? read.fonts.minorLatin ?? "Calibri"
              }
            }
          }
        } : {}
      }
    } : {},
    export: { fontEmbed: "subset", transition: "fade", animations: "auto" },
    pages: pages.map((_, i) => `pages/${slideIndexLabel(i + 1)}.page`),
    source: {
      path: options.sourcePath,
      sha1: options.sourceSha1,
      slideCount,
      size: sizePx,
      ...read.sourceApp !== null ? { app: read.sourceApp } : {}
    }
  };
  report.summary.elements = pages.reduce((sum, p) => sum + p.elements.length, 0);
  report.summary.placeholders = pages.reduce(
    (sum, p) => sum + p.elements.filter((e) => e?.elementType === "placeholder").length,
    0
  );
  report.summary.dropped = report.dropped.length;
  report.summary.degraded = report.degraded.length;
  void getShapeAnimation;
  return { deck, pages, media, report };
}

// src/core/reverse/writeProject.ts
import { createHash as createHash2 } from "crypto";
import { mkdir as mkdir4, readFile as readFile7, rename as rename3, writeFile as writeFile5 } from "fs/promises";
import path9 from "path";
var import_yaml2 = __toESM(require_dist(), 1);
function sha1Of2(buffer) {
  return createHash2("sha1").update(buffer).digest("hex");
}
function safeFileStem(stem) {
  return stem.replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
}
async function writeReverseProject(mapped, options) {
  const absDir = resolveProjectDir(options.cwd, options.dir);
  const created = await createProject(options.cwd, {
    dir: options.dir,
    title: options.title ?? mapped.deck.title,
    size: mapped.deck.size,
    designSystem: null,
    theme: null,
    sessionId: options.sessionId ?? null
  });
  const mediaRoot = path9.join(absDir, "media");
  const objectsRoot = path9.join(mediaRoot, ".objects");
  await mkdir4(objectsRoot, { recursive: true });
  const seen = /* @__PURE__ */ new Map();
  let mediaCount = 0;
  for (const asset of mapped.media) {
    const hash = sha1Of2(asset.bytes);
    const existing = seen.get(hash);
    if (existing) {
      remapMediaSrc(mapped, asset.partName, existing);
      continue;
    }
    const objectName = `${hash}${asset.ext}`;
    const objectPath = path9.join(objectsRoot, objectName);
    await writeFile5(objectPath, Buffer.from(asset.bytes));
    const aliasName = `${safeFileStem(path9.basename(asset.partName, asset.ext))}-${hash.slice(0, 8)}${asset.ext}`;
    const aliasPath = path9.join(mediaRoot, aliasName);
    await writeFile5(aliasPath, Buffer.from(asset.bytes));
    seen.set(hash, `media/${aliasName}`);
    mediaCount++;
    remapMediaSrc(mapped, asset.partName, `media/${aliasName}`);
  }
  const emptyDeck = { ...mapped.deck, pages: [] };
  const deckPath = path9.join(absDir, "deck.pptd");
  const tmpDeck = `${deckPath}.tmp-${process.pid}`;
  await writeFile5(tmpDeck, stringifyDeck(emptyDeck), "utf8");
  await rename3(tmpDeck, deckPath);
  await bumpManifestChecksum(absDir);
  const ops = [];
  for (let i = 0; i < mapped.pages.length; i++) {
    const page = mapped.pages[i];
    ops.push({
      op: "add_page",
      page: `pages/${String(i + 1).padStart(2, "0")}.page`,
      content: page
    });
  }
  const edited = await editProject(options.cwd, {
    dir: options.dir,
    ops,
    baseRevision: created.manifest.revision,
    sessionId: options.sessionId ?? null
  });
  const reportPath = path9.join(absDir, "import.report.yml");
  await writeFile5(reportPath, (0, import_yaml2.stringify)(mapped.report), "utf8");
  return {
    projectDir: absDir,
    pageCount: mapped.pages.length,
    mediaCount,
    revision: edited.revision,
    dropped: mapped.report.dropped,
    degraded: mapped.report.degraded
  };
}
async function bumpManifestChecksum(projectDir) {
  const manifestPath = path9.join(projectDir, "manifest.json");
  const raw = await readFile7(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  const deckText = await readFile7(path9.join(projectDir, "deck.pptd"), "utf8");
  const tmp = `${manifestPath}.tmp-${process.pid}`;
  await writeFile5(
    tmp,
    `${JSON.stringify({ ...manifest, checksum: checksumOf(deckText, /* @__PURE__ */ new Map()) }, null, 2)}
`,
    "utf8"
  );
  await rename3(tmp, manifestPath);
  void ProjectError;
}
function remapMediaSrc(mapped, partName, alias) {
  for (const page of mapped.pages) {
    for (const element of page.elements) {
      const rec = element;
      if (rec.partName === partName) {
        rec.src = alias;
        delete rec.partName;
      }
    }
    const bg = page.background;
    if (bg && typeof bg === "object" && bg.partName === partName) {
      bg.src = alias;
      delete bg.partName;
    }
  }
}

// src/core/reverse/apply.ts
var ReverseImportError = class extends Error {
  code;
  detail;
  constructor(code, message, detail) {
    super(message);
    this.name = "ReverseImportError";
    this.code = code;
    this.detail = detail;
  }
};
async function sourceBytes(cwd, source) {
  if (source instanceof Uint8Array) return { bytes: source, path: "<bytes>" };
  const abs = path10.resolve(cwd, source);
  const rel = path10.relative(path10.resolve(cwd), abs);
  if (rel.startsWith("..") || path10.isAbsolute(rel)) {
    throw new ReverseImportError("SourceOutsideCwd", `\u6E90\u6587\u4EF6\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${source}\uFF08\u89E3\u6790\u5230 ${abs}\uFF09`);
  }
  try {
    const bytes = await readFile8(abs);
    return { bytes: new Uint8Array(bytes), path: abs };
  } catch (err2) {
    throw new ReverseImportError("SourceNotFound", `\u6E90\u6587\u4EF6\u8BFB\u4E0D\u5230\uFF1A${abs}`, err2);
  }
}
async function reverseImport(options) {
  const { bytes, path: sourceAbs } = await sourceBytes(options.cwd, options.source);
  const sha1 = createHash3("sha1").update(bytes).digest("hex");
  let read;
  try {
    read = await loadReverseModel(bytes);
  } catch (err2) {
    throw new ReverseImportError(
      "ParseFailed",
      `@office-kit/pptx \u65E0\u6CD5\u89E3\u6790\u6E90\u6587\u4EF6\uFF08\u53EF\u6539\u7528 mode:'surgical' \u76F4\u63A5\u5C0F\u6539\uFF09\uFF1A${err2.message}`,
      err2
    );
  }
  const mapped = mapReverseModel(read, { sourcePath: sourceAbs, sourceSha1: sha1 });
  return writeReverseProject(mapped, {
    cwd: options.cwd,
    dir: options.targetDir,
    title: options.title,
    sessionId: options.sessionId ?? null
  });
}

// src/tools/import.ts
async function manifestRevisionOf(projectDir) {
  const raw = await readFile9(path11.join(projectDir, "manifest.json"), "utf8");
  const parsed = JSON.parse(raw);
  if (typeof parsed?.revision !== "number") return -1;
  return parsed.revision;
}
function registerImportTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_import",
    description: "\u628A\u4E00\u4E2A .pptx \u5168\u91CF\u9006\u5411\u6210 PPTD v3 \u5DE5\u7A0B\uFF08opt-in \u9AD8\u9636\u52A8\u4F5C\uFF1B\u5BF9\u5BFC\u5165 deck \u7684\u8F7B\u6539\u8BF7\u7528 ppt_patch\uFF09\u3002\u4EA7\u51FA deck.pptd + pages/*.page + media/\uFF08sha1 \u53BB\u91CD\uFF09+ import.report.yml\uFF1B\u4E0D\u652F\u6301\u5143\u7D20\uFF08chart/smartart/ole/media/3d/group\uFF09\u5728\u539F\u4F4D\u7F6E\u63D2\u7070\u5E95\u5360\u4F4D\u5F62\u72B6\u5E76\u8BB0 dropped\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["source"],
      properties: {
        source: { type: "string", minLength: 1, description: ".pptx \u6E90\u6587\u4EF6\u8DEF\u5F84\uFF08\u76F8\u5BF9\u4F1A\u8BDD cwd\uFF09" },
        targetDir: {
          type: "string",
          minLength: 1,
          description: "\u76EE\u6807\u5DE5\u7A0B\u76EE\u5F55\uFF08\u76F8\u5BF9 cwd\uFF09\uFF1B\u7F3A\u7701\u53D6\u6E90\u6587\u4EF6\u540D\u53BB\u6269\u5C55\u540D"
        },
        title: { type: "string", description: "\u5DE5\u7A0B\u6807\u9898\uFF1B\u7F3A\u7701\u6CBF\u7528\u6E90\u6587\u4EF6\u540D" },
        open: {
          type: "boolean",
          description: "true = \u5199\u5B8C\u8BF7\u6C42\u5DE5\u4F5C\u53F0\u6253\u5F00\u8BE5\u5DE5\u7A0B\uFF08\u9ED8\u8BA4 true\uFF09"
        },
        mode: {
          type: "string",
          enum: ["full", "surgical"],
          description: "full\uFF08\u9ED8\u8BA4\uFF09= \u5168\u91CF\u9006\u5411\uFF1Bsurgical = \u65E9\u9000\uFF08\u4EC5\u7ED9\u63D0\u793A\uFF0C\u4E0D\u5EFA\u5DE5\u7A0B\uFF09"
        }
      }
    },
    output: {
      render: renderSummary((r) => {
        if (r.mode === "surgical") return `surgical \u6A21\u5F0F\uFF1A\u8BF7\u7528 ppt_patch \u76F4\u63A5\u5BF9 ${String(r.source)} \u505A\u8F7B\u6539`;
        return `\u5DF2\u5BFC\u5165 ${String(r.pageCount)} \u9875 / \u5A92\u4F53 ${String(r.mediaCount)} \u4EF6 / dropped ${String(r.dropped)} / degraded ${String(r.degraded)}`;
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const source = String(args.source ?? "");
        const mode = args.mode ?? "full";
        if (mode === "surgical") {
          return {
            ok: true,
            mode: "surgical",
            source,
            guidance: "\u5BF9\u5BFC\u5165 .pptx \u7684\u8F7B\u6539\uFF08\u6539\u5B57/\u6362\u56FE/\u8C03\u9875\u5E8F\uFF09\u8BF7\u7528 ppt_patch\uFF1A\u76F4\u63A5 patch \u5F62\u72B6\u540E\u53E6\u5B58\uFF0C\u4E0D\u7ECF PPTD \u5F80\u8FD4\uFF0C\u4FDD\u7559 SmartArt/\u56FE\u8868/OLE \u672A\u5EFA\u6A21\u90E8\u4EF6"
          };
        }
        const sourceAbs = path11.resolve(cwd, source);
        try {
          await access(sourceAbs);
        } catch {
          throw new ProjectError("SourceNotFound", `\u6E90\u6587\u4EF6\u8BFB\u4E0D\u5230\uFF1A${sourceAbs}`, { status: 404 });
        }
        const targetDir = typeof args.targetDir === "string" && args.targetDir !== "" ? args.targetDir : path11.basename(source, path11.extname(source));
        const title = typeof args.title === "string" ? args.title : path11.basename(source, path11.extname(source));
        const open = args.open !== false;
        const result = await reverseImport({
          cwd,
          source: sourceAbs,
          targetDir,
          title,
          sessionId: sessionIdOf(exec)
        });
        if (open) {
          const abs = resolveProjectDir(cwd, targetDir);
          const rel = path11.relative(cwd, abs).replace(/\\/g, "/");
          const sessionId = sessionIdOf(exec);
          const bridge = ctx.pptMaker;
          if (sessionId && bridge && typeof bridge.registerProject === "function" && typeof bridge.requestOpen === "function") {
            const { key } = bridge.registerProject(sessionId, cwd, rel);
            bridge.requestOpen(sessionId, key);
          }
        }
        return {
          ok: true,
          projectDir: path11.relative(cwd, result.projectDir).replace(/\\/g, "/"),
          pageCount: result.pageCount,
          mediaCount: result.mediaCount,
          revision: await manifestRevisionOf(result.projectDir),
          dropped: result.dropped.length,
          degraded: result.degraded.length,
          droppedList: result.dropped,
          degradedList: result.degraded
        };
      } catch (err2) {
        if (err2 instanceof ReverseImportError) {
          return toolError(
            new ProjectError(err2.code, err2.message, {
              status: err2.code === "SourceNotFound" ? 404 : err2.code === "SourceOutsideCwd" ? 400 : 409,
              detail: err2.detail
            })
          );
        }
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/open.ts
import path12 from "path";
import { access as access2, readFile as readFile10 } from "fs/promises";
async function ensureProjectDir(cwd, dir) {
  const abs = resolveProjectDir(cwd, dir);
  try {
    await access2(path12.join(abs, "manifest.json"));
    const raw = await readFile10(path12.join(abs, "manifest.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.revision !== "number") throw new Error("revision \u7F3A\u5931");
  } catch (err2) {
    throw new ProjectError("ProjectNotFound", `\u76EE\u6807\u4E0D\u662F\u53EF\u6253\u5F00\u7684 PPTD v3 \u5DE5\u7A0B\uFF08manifest.json \u8BFB\u4E0D\u51FA\u6765\uFF09\uFF1A${abs}`, {
      status: 404,
      detail: err2 instanceof Error ? err2.message : String(err2)
    });
  }
  return abs;
}
function registerOpenTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_open",
    description: "\u628A\u5DE5\u4F5C\u53F0\uFF08\u53F3\u4FA7\u680F\uFF09\u6253\u5F00\u5230\u6307\u5B9A\u7684 PPTD v3 \u5DE5\u7A0B\u76EE\u5F55\u3002\u53EA\u5728\u9762\u677F\u6D3B\u8DC3\u7684\u4F1A\u8BDD\u91CC\u901A\u8FC7\u8F6E\u8BE2\u751F\u6548\uFF1B\u4E0D\u4FEE\u6539\u5DE5\u7A0B\u6587\u4EF6\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["dir"],
      properties: {
        dir: { type: "string", minLength: 1, description: "\u5DE5\u7A0B\u76EE\u5F55\uFF0C\u76F8\u5BF9\u4F1A\u8BDD cwd" }
      }
    },
    output: {
      render: renderSummary((r) => `\u5DF2\u8BF7\u6C42\u6253\u5F00 ${String(r.dir ?? "")}`)
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const sessionId = sessionIdOf(exec);
        if (!sessionId) {
          throw new ProjectError("SessionMissing", "\u6267\u884C\u4E0A\u4E0B\u6587\u7F3A\u5C11 agent.session.id", { status: 400 });
        }
        const dir = String(args.dir ?? "");
        const abs = await ensureProjectDir(cwd, dir);
        const rel = path12.relative(cwd, abs).replace(/\\/g, "/");
        const bridge = ctx.pptMaker;
        if (bridge && typeof bridge.registerProject === "function" && typeof bridge.requestOpen === "function") {
          const { key } = bridge.registerProject(sessionId, cwd, rel);
          bridge.requestOpen(sessionId, key);
          return { ok: true, dir: rel, requested: true };
        }
        return { ok: true, dir: rel, requested: false };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/patch.ts
import { readFile as readFile11 } from "fs/promises";
import path13 from "path";
import { createHash as createHash4 } from "crypto";
import {
  findShapeById,
  findShapesAtPoint,
  findShapesByName,
  getShapeId as getShapeId2,
  getSlideAt as getSlideAt2,
  getSlideCount as getSlideCount2,
  getSlides as getSlides5,
  loadPresentation,
  moveSlide,
  savePresentation as savePresentation2,
  setShapeImage,
  setShapeText
} from "@office-kit/pptx";
import { listPackageParts } from "@office-kit/pptx";
function pickShape(pres, ref) {
  const slide = getSlideAt2(pres, ref.slide - 1);
  if (!slide) {
    throw new ProjectError("SlideIndexOutOfRange", `\u6E90\u6587\u4EF6\u6CA1\u6709\u7B2C ${ref.slide} \u9875`, { status: 404 });
  }
  if (ref.shapeId !== void 0) {
    const shape = findShapeById(slide, ref.shapeId);
    if (!shape) throw new ProjectError("ShapeNotFound", `\u7B2C ${ref.slide} \u9875\u6CA1\u6709 shapeId=${ref.shapeId} \u7684\u5F62\u72B6`, { status: 404 });
    return shape;
  }
  if (typeof ref.shapeName === "string" && ref.shapeName !== "") {
    const hits = findShapesByName(slide, ref.shapeName);
    if (hits.length === 0) throw new ProjectError("ShapeNotFound", `\u7B2C ${ref.slide} \u9875\u6CA1\u6709\u540D\u4E3A "${ref.shapeName}" \u7684\u5F62\u72B6`, { status: 404 });
    if (hits.length > 1) {
      throw new ProjectError("ShapeAmbiguous", `\u7B2C ${ref.slide} \u9875\u6709 ${hits.length} \u4E2A\u5F62\u72B6\u90FD\u53EB "${ref.shapeName}"\uFF0C\u8BF7\u6539\u7528 shapeId`, { status: 409 });
    }
    return hits[0];
  }
  if (Array.isArray(ref.at) && ref.at.length === 2) {
    const hits = findShapesAtPoint(slide, ref.at[0], ref.at[1]);
    if (hits.length === 0) {
      throw new ProjectError("ShapeNotFound", `\u7B2C ${ref.slide} \u9875\u5750\u6807 (${ref.at[0]},${ref.at[1]}) \u6CA1\u6709\u547D\u4E2D\u4EFB\u4F55\u5F62\u72B6`, { status: 404 });
    }
    return hits[0];
  }
  throw new ProjectError("ShapeRefRequired", "patch \u9700\u8981 shapeId / shapeName / at \u4E09\u8005\u81F3\u5C11\u5176\u4E00", { status: 400 });
}
async function readImageBytes(cwd, image) {
  if (typeof image.bytes === "string" && image.bytes !== "") {
    return new Uint8Array(Buffer.from(image.bytes, "base64"));
  }
  if (typeof image.src === "string" && image.src !== "") {
    const abs = path13.resolve(cwd, image.src);
    const rel = path13.relative(path13.resolve(cwd), abs);
    if (rel.startsWith("..") || path13.isAbsolute(rel)) {
      throw new ProjectError("PathOutsideCwd", `\u56FE\u7247\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${image.src}`, { status: 400 });
    }
    const buffer = await readFile11(abs);
    return new Uint8Array(buffer);
  }
  throw new ProjectError("ImageBytesMissing", "replace_image \u9700\u8981 image.bytes(Base64) \u6216 image.src\uFF08cwd \u5185\u8DEF\u5F84\uFF09", { status: 400 });
}
function relativeOrSelf(cwd, abs) {
  const rel = path13.relative(cwd, abs);
  return rel.startsWith("..") || path13.isAbsolute(rel) ? abs : rel.replace(/\\/g, "/");
}
function diffParts(before, after) {
  const lost = [];
  const gained = [];
  for (const part of before) if (!after.has(part)) lost.push(part);
  for (const part of after) if (!before.has(part)) gained.push(part);
  return { lost, gained };
}
function registerPatchTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_patch",
    description: "\u5BF9 .pptx \u505A\u5916\u79D1\u624B\u672F\u5F0F\u8F7B\u6539\uFF08\u6539\u5B57/\u6362\u56FE/\u8C03\u9875\u5E8F\uFF09\uFF0C\u4E0D\u7ECF PPTD \u9006\u5411\u3002**\u5E93\u4E0D\u5EFA\u6A21\u7684\u90E8\u4EF6**\uFF08SmartArt/\u5D4C\u5165 Excel/OLE \u7B49\uFF09\u5728 L1 passthrough \u4E0B\u539F\u6837\u4FDD\u7559\u3002shape \u7528 shapeId / shapeName / at([xEmu,yEmu]) \u4E09\u9009\u4E00\u5F15\u7528\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["source", "ops"],
      properties: {
        source: { type: "string", minLength: 1, description: ".pptx \u6E90\u6587\u4EF6\uFF08\u76F8\u5BF9 cwd\uFF09" },
        out: {
          type: "string",
          description: "\u8F93\u51FA\u8DEF\u5F84\uFF08\u76F8\u5BF9 cwd\uFF09\uFF1B\u7F3A\u7701 <\u6E90\u540D>-patched.pptx\uFF1B\u7EDD\u4E0D\u539F\u5730\u5199\u6E90\u6587\u4EF6"
        },
        ops: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["op", "slide"],
            properties: {
              op: { type: "string", enum: ["set_text", "replace_image", "move_page"] },
              slide: { type: "integer", minimum: 1 },
              shapeId: { type: "integer" },
              shapeName: { type: "string" },
              at: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
              text: { type: "string" },
              toIndex: { type: "integer", minimum: 0 },
              image: {
                type: "object",
                additionalProperties: false,
                properties: {
                  bytes: { type: "string", description: "base64 \u56FE\u7247\u5B57\u8282" },
                  src: { type: "string", description: "cwd \u5185\u56FE\u7247\u8DEF\u5F84" }
                }
              }
            },
            additionalProperties: true
          }
        }
      }
    },
    output: {
      render: renderSummary((r) => {
        const lost = Array.isArray(r.lostParts) ? r.lostParts.length : 0;
        return `\u5DF2\u5199\u5165 ${String(r.out ?? "")}\uFF08${String(r.appliedOps)} \u4E2A op\uFF1B\u672A\u5EFA\u6A21\u90E8\u4EF6 ${String(r.unchangedParts)} \u4EF6\u5168\u6570\u4FDD\u7559\uFF0C\u4E22\u4EF6 ${lost}\uFF09`;
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const source = String(args.source ?? "");
        const ops = args.ops;
        if (!Array.isArray(ops) || ops.length === 0) {
          throw new ProjectError("OpsEmpty", "ops \u5FC5\u987B\u662F\u975E\u7A7A\u6570\u7EC4", { status: 400 });
        }
        const sourceAbs = path13.resolve(cwd, source);
        const rel = path13.relative(path13.resolve(cwd), sourceAbs);
        if (rel.startsWith("..") || path13.isAbsolute(rel)) {
          throw new ProjectError("PathOutsideCwd", `\u6E90\u6587\u4EF6\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${source}`, { status: 400 });
        }
        const sourceBytes2 = new Uint8Array(await readFile11(sourceAbs));
        const beforeSha1 = createHash4("sha1").update(sourceBytes2).digest("hex");
        const pres = await loadPresentation(sourceBytes2);
        const slides = getSlides5(pres);
        if (slides.length === 0) throw new ProjectError("NoSlides", "\u6E90\u6587\u4EF6\u6CA1\u6709\u9875\u9762", { status: 409 });
        const beforeParts = new Set(listPackageParts(pres).map((p) => p.name));
        const appliedOps = [];
        for (let i = 0; i < ops.length; i++) {
          const op = ops[i];
          const slideIndex = op.slide;
          if (slideIndex < 1 || slideIndex > getSlideCount2(pres)) {
            throw new ProjectError("SlideIndexOutOfRange", `ops[${i}] slide=${slideIndex} \u8D85\u754C\uFF081..${getSlideCount2(pres)}\uFF09`, { status: 400 });
          }
          switch (op.op) {
            case "set_text": {
              const shape = pickShape(pres, op);
              if (typeof op.text !== "string") throw new ProjectError("TextRequired", `ops[${i}] set_text \u9700\u8981 text \u5B57\u7B26\u4E32`, { status: 400 });
              setShapeText(shape, op.text, { newlines: "paragraph" });
              appliedOps.push(`set_text p${slideIndex}#${getShapeId2(shape)} \xAB${op.text.slice(0, 30)}\xBB`);
              break;
            }
            case "replace_image": {
              const shape = pickShape(pres, op);
              if (!op.image) throw new ProjectError("ImageRequired", `ops[${i}] replace_image \u9700\u8981 image \u5B57\u6BB5`, { status: 400 });
              const bytes = await readImageBytes(cwd, op.image);
              setShapeImage(shape, bytes);
              appliedOps.push(`replace_image p${slideIndex}#${getShapeId2(shape)} (${bytes.byteLength} bytes)`);
              break;
            }
            case "move_page": {
              const target = op.toIndex;
              if (typeof target !== "number" || !Number.isInteger(target) || target < 0 || target >= slides.length + 1) {
                throw new ProjectError("MoveTargetInvalid", `ops[${i}] move_page.toIndex=${String(target)} \u975E\u6CD5\uFF080..${slides.length}\uFF09`, { status: 400 });
              }
              const slide = getSlideAt2(pres, slideIndex - 1);
              if (!slide) throw new ProjectError("SlideIndexOutOfRange", `\u6E90\u6587\u4EF6\u6CA1\u6709\u7B2C ${slideIndex} \u9875`, { status: 404 });
              moveSlide(pres, slide, target);
              appliedOps.push(`move_page p${slideIndex} \u2192 ${target}`);
              break;
            }
            default: {
              const unknown = op.op;
              throw new ProjectError("OpUnknown", `ops[${i}] \u672A\u77E5 op\uFF1A${String(unknown)}\uFF08\u51BB\u7ED3\u8BCD\u8868 set_text / replace_image / move_page\uFF09`, { status: 400 });
            }
          }
        }
        const outBytes = await savePresentation2(pres);
        const afterPres = await loadPresentation(outBytes);
        const afterParts = new Set(listPackageParts(afterPres).map((p) => p.name));
        const { lost } = diffParts(beforeParts, afterParts);
        const sourceStem = path13.basename(source, path13.extname(source));
        const outRel = typeof args.out === "string" && args.out !== "" ? args.out : `${sourceStem}-patched.pptx`;
        const outAbs = path13.resolve(path13.resolve(cwd), outRel);
        const outRelChecked = path13.relative(path13.resolve(cwd), outAbs);
        if (outRelChecked.startsWith("..") || path13.isAbsolute(outRelChecked)) {
          throw new ProjectError("PathOutsideCwd", `\u8F93\u51FA\u8DEF\u5F84\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${outRel}`, { status: 400 });
        }
        await (await import("fs/promises")).writeFile(outAbs, Buffer.from(outBytes));
        return {
          ok: true,
          out: relativeOrSelf(cwd, outAbs),
          bytes: outBytes.byteLength,
          appliedOps: appliedOps.length,
          appliedList: appliedOps,
          unchangedParts: lost.length === 0 ? beforeParts.size : beforeParts.size - lost.length,
          lostParts: lost,
          beforeSha1,
          afterSha1: createHash4("sha1").update(outBytes).digest("hex"),
          sessionId: sessionIdOf(exec)
        };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/redo.ts
function registerRedoTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_redo",
    description: "\u91CD\u505A\uFF1Aundo \u4E4B\u540E\u6CBF history \u65E5\u5FD7\u5411\u56DE\u653E\u5230\u66F4\u65B0\u7684\u4FEE\u8BA2\uFF08\u65B0\u7F16\u8F91\u4F1A\u526A\u6389\u88AB\u653E\u5F03\u7684\u5206\u652F\uFF0C\u4E4B\u540E\u65E0\u53EF\u91CD\u505A\uFF09\u3002\u8FD4\u56DE { ok, revision, redoneOps, warnings }\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["dir"],
      properties: {
        dir: { type: "string", minLength: 1 },
        steps: { type: "integer", minimum: 1, maximum: 20, description: "\u91CD\u505A\u6B65\u6570\uFF081\u201320\uFF0C\u9ED8\u8BA4 1\uFF09" }
      }
    },
    output: {
      render: renderSummary((r) => `\u5DF2\u91CD\u505A\u5230 revision ${String(r.revision)}\uFF08${r.redoneOps?.length ?? 0} \u4E2A op\uFF09`)
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const result = await redoProject(cwd, args.dir, args.steps ?? 1);
        return { ok: true, revision: result.revision, redoneOps: result.undoneOps, warnings: result.warnings };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/render.ts
import { mkdir as mkdir5, readFile as readFile12, writeFile as writeFile6 } from "fs/promises";
import path14 from "path";
function registerRenderTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_render",
    description: "\u628A\u5DE5\u7A0B\u6E32\u67D3\u6210\u6BCF\u9875 PNG \u9884\u89C8\uFF1A\u7ECF\u5F15\u64CE\u6784\u5EFA\u6700\u7EC8 pptx \u5B57\u8282\u540E\u7531 libreoffice-kit \u5149\u6805\u5316\uFF0896dpi\uFF09\u3002\u8FD4\u56DE { ok, images:[{page,path}] }\uFF0C\u56FE\u7247\u843D\u5728\u5DE5\u7A0B\u76EE\u5F55 .previews/ \u4E0B\uFF1B\u7528\u4E8E\u4EBA\u773C\u6838\u5BF9\u7248\u9762\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["dir"],
      properties: {
        dir: { type: "string", minLength: 1, description: "\u5DE5\u7A0B\u76EE\u5F55\uFF08\u76F8\u5BF9\u4E8E\u4F1A\u8BDD cwd\uFF09" },
        pages: {
          type: "array",
          items: { type: "integer", minimum: 1 },
          description: "\u53EA\u6E32\u67D3\u8FD9\u4E9B\u9875\uFF081 \u8D77\uFF09\uFF1B\u9ED8\u8BA4\u5168\u90E8"
        },
        dpi: { type: "integer", minimum: 24, maximum: 600, description: "\u6E32\u67D3\u5206\u8FA8\u7387\uFF0C\u9ED8\u8BA4 96" }
      }
    },
    output: {
      render: renderSummary((r) => {
        const images = r.images ?? [];
        return `\u5DF2\u6E32\u67D3 ${images.length} \u9875\u9884\u89C8`;
      })
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const dir = args.dir;
        const pipeline = await buildProjectDeck(cwd, dir);
        const bytes = await saveRawProjectPptx(pipeline);
        const rendered = await renderPptxImages(bytes, {
          pages: args.pages,
          dpi: args.dpi ?? 96
        });
        try {
          const previewDir = path14.join(pipeline.dir, ".previews");
          await mkdir5(previewDir, { recursive: true });
          const images = [];
          for (const image of rendered.result.images) {
            const page = image.page ?? image.index + 1;
            const target = path14.join(previewDir, `page-${String(page).padStart(2, "0")}.png`);
            const bytesIn = await readFile12(image.path);
            await writeFile6(target, bytesIn);
            images.push({
              page,
              path: path14.relative(cwd, target).replace(/\\/g, "/"),
              width: image.width,
              height: image.height
            });
          }
          return {
            ok: true,
            revision: pipeline.revision,
            images,
            missingFonts: rendered.result.missingFonts,
            warnings: pipeline.buildWarnings
          };
        } finally {
          await rendered.cleanup();
        }
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/core/theme.ts
import { readdir as readdir4, readFile as readFile13 } from "fs/promises";
import path15 from "path";
async function listThemes(packageRoot, designSystem) {
  const root = path15.join(packageRoot, "skills", "ppt-maker", "reference", "design_system");
  const out = [];
  const families = await readdir4(root, { withFileTypes: true }).catch(() => []);
  for (const family of families) {
    if (!family.isDirectory()) continue;
    if (designSystem !== void 0 && family.name !== designSystem) continue;
    const familyDir = path15.join(root, family.name);
    const themes = await readdir4(familyDir, { withFileTypes: true }).catch(() => []);
    for (const entry of themes) {
      if (!entry.isDirectory()) continue;
      const designFile = path15.join(familyDir, entry.name, "design.md");
      let name2 = null;
      try {
        const text = await readFile13(designFile, "utf8");
        const heading = /^#\s+(.+)$/m.exec(text);
        name2 = heading ? heading[1].trim() : null;
      } catch {
        continue;
      }
      out.push({
        designSystem: family.name,
        theme: entry.name,
        name: name2,
        path: path15.relative(packageRoot, designFile).replace(/\\/g, "/")
      });
    }
  }
  return out.sort((a, b) => a.designSystem.localeCompare(b.designSystem) || a.theme.localeCompare(b.theme));
}

// src/tools/themes.ts
function registerThemesTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_themes",
    description: "\u5217\u51FA\u63D2\u4EF6\u5185\u7F6E\u7684\u8BBE\u8BA1\u7CFB\u7EDF\u4E3B\u9898\uFF08skills/ppt-maker/reference/design_system/<\u65CF>/<\u4E3B\u9898>/design.md\uFF09\u3002\u53EF\u9009 designSystem \u53C2\u6570\u6309\u65CF\u8FC7\u6EE4\uFF1B\u8FD4\u56DE { ok, themes: [{ designSystem, theme, name, path }] }\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        designSystem: { type: "string", description: "\u53EA\u5217\u51FA\u8BE5\u8BBE\u8BA1\u7CFB\u7EDF\u65CF\u4E0B\u7684\u4E3B\u9898" }
      }
    },
    output: {
      render: renderSummary((r) => `\u5171 ${r.themes?.length ?? 0} \u4E2A\u4E3B\u9898`)
    },
    execute: async (args) => {
      try {
        const themes = await listThemes(PACKAGE_ROOT, args.designSystem);
        return { ok: true, themes };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/undo.ts
function registerUndoTool(ctx) {
  const off = ctx.tools.register({
    name: "ppt_undo",
    description: "\u64A4\u9500\uFF1A\u628A\u5DE5\u7A0B\u6062\u590D\u5230 history \u65E5\u5FD7\u4E2D\u66F4\u65E9\u7684\u4FEE\u8BA2\uFF08manifest.revision \u4E3A\u6E38\u6807\uFF1B\u5FEB\u7167 append-only\uFF0C\u7B2C 0 \u53F7\u951A\u70B9\u6C38\u4E0D\u9A71\u9010\uFF09\u3002\u8FD4\u56DE { ok, revision, undoneOps, warnings }\uFF1B\u6062\u590D\u65F6\u6821\u9A8C media \u54C8\u5E0C\uFF0C\u7F3A\u5931/\u88AB\u6539\u7684\u7D20\u6750\u8FDB warnings\u3002",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["dir"],
      properties: {
        dir: { type: "string", minLength: 1 },
        steps: { type: "integer", minimum: 1, maximum: 20, description: "\u64A4\u9500\u6B65\u6570\uFF081\u201320\uFF0C\u9ED8\u8BA4 1\uFF09" }
      }
    },
    output: {
      render: renderSummary((r) => `\u5DF2\u64A4\u9500\u5230 revision ${String(r.revision)}\uFF08${r.undoneOps?.length ?? 0} \u4E2A op\uFF09`)
    },
    execute: async (args, exec) => {
      try {
        const cwd = resolveSessionCwd(exec, ctx.sessions);
        const result = await undoProject(cwd, args.dir, args.steps ?? 1);
        return { ok: true, revision: result.revision, undoneOps: result.undoneOps, warnings: result.warnings };
      } catch (err2) {
        return toolError(err2);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/index.ts
var name = "dsh-ppt-maker";
var inject = ["tools", "sessions", "skills", "llm", "attachments", "webServer"];
var SKILL_DIR = path16.join(PACKAGE_ROOT, "skills", "ppt-maker");
var SKILL_FILE = path16.join(SKILL_DIR, "SKILL.md");
function readSkillFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}
var hostModulesPromise = null;
function loadHostModules() {
  if (!hostModulesPromise) {
    const routesUrl = pathToFileURL(path16.join(PACKAGE_ROOT, "plugin", "host", "routes.mjs")).href;
    const storeUrl = pathToFileURL(path16.join(PACKAGE_ROOT, "plugin", "host", "store.mjs")).href;
    hostModulesPromise = Promise.all([import(routesUrl), import(storeUrl)]).then(
      ([routes, store]) => ({ routes, store })
    );
  }
  return hostModulesPromise;
}
function buildPptMakerBridge(store) {
  return {
    registerProject(sessionId, cwd, dir) {
      return store.registerProject(sessionId, cwd, dir);
    },
    requestOpen(sessionId, key) {
      store.requestOpen(sessionId, key);
    }
  };
}
function registerRoutes(ctx, bridge) {
  if (typeof ctx.effect !== "function") return () => {
  };
  const disposer = ctx.effect(() => {
    const webServer = ctx.webServer;
    if (!webServer || typeof webServer.register !== "function") {
      ctx.logger?.warn?.("[dsh-ppt-maker] webServer \u4E0D\u53EF\u7528\uFF0C\u53F3\u4FA7\u680F\u9762\u677F\u5C06\u65E0\u6CD5\u8BFB\u5199\u5DE5\u7A0B");
      return void 0;
    }
    const sessions = ctx.sessions;
    const resolveCwd = (sessionId) => {
      if (!sessions || typeof sessions.get !== "function") return null;
      const header = sessions.get(String(sessionId))?.header;
      return typeof header?.cwd === "string" ? header.cwd : null;
    };
    let dispose = () => {
    };
    let cancelled = false;
    void loadHostModules().then(({ routes }) => {
      if (cancelled) return;
      const handler = routes.createApiHandler({
        resolveCwd,
        log: (message) => ctx.logger?.warn?.(`[dsh-ppt-maker] ${message}`),
        core: {
          loadProject,
          editProject,
          undoProject,
          redoProject,
          buildProjectDeck,
          saveProjectPptx,
          writeExportReport,
          ProjectError
        }
      });
      dispose = webServer.register({ kind: "prefix", path: routes.API_PREFIX, handler });
    }).catch((err2) => {
      ctx.logger?.warn?.(`[dsh-ppt-maker] webServer \u8DEF\u7531\u6CE8\u518C\u5931\u8D25: ${err2.message}`);
    });
    return () => {
      cancelled = true;
      dispose();
    };
  });
  void bridge;
  return typeof disposer === "function" ? disposer : () => {
  };
}
function registerSkill(ctx) {
  if (!ctx.skills || !existsSync2(SKILL_FILE)) return () => {
  };
  try {
    const source = readFileSync(SKILL_FILE, "utf8");
    const frontmatter = readSkillFrontmatter(source);
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    const off = ctx.skills.register({
      name: frontmatter.name,
      description: frontmatter.description,
      ...frontmatter.whenToUse !== void 0 ? { whenToUse: frontmatter.whenToUse } : {},
      content: body.trim(),
      // `register()` fills `provider` but not `source`, and the registry's load
      // path (SkillRegistry.get → validateDefinition) requires both to be
      // strings — without `source` the skill catalogs fine and then throws on
      // first load.
      source: "bundled",
      resourceBase: { kind: "directory", path: SKILL_DIR }
    });
    return typeof off === "function" ? off : () => {
    };
  } catch (err2) {
    ctx.logger?.warn?.(`[dsh-ppt-maker] could not register the skill: ${err2.message}`);
    return () => {
    };
  }
}
function apply(ctx) {
  const offs = [registerSkill(ctx)];
  let cachedBridge;
  const resolveBridge = () => cachedBridge;
  if (ctx.tools) {
    for (const register of [
      registerCreateTool,
      registerThemesTool,
      registerEditTool,
      registerUndoTool,
      registerRedoTool,
      registerRenderTool,
      registerExportTool,
      registerCheckTool,
      // PR 2 tools (raw JSON-Schema; rely on the optional bridge for ppt_open /
      // the open=true path of ppt_import).
      registerImportTool,
      registerOpenTool,
      registerPatchTool
    ]) {
      try {
        const off = register({
          tools: ctx.tools,
          sessions: ctx.sessions,
          llm: ctx.llm,
          attachments: ctx.attachments,
          pptMaker: void 0,
          // Lazy getter: the bridge is filled in once the host-store module
          // finishes loading (microtask after apply). Tool calls always come
          // after apply, so by the time execute runs the bridge is present.
          ...register === registerImportTool || register === registerOpenTool ? {
            get pptMaker() {
              return resolveBridge();
            }
          } : {}
        });
        if (typeof off === "function") offs.push(off);
      } catch (err2) {
        ctx.logger?.warn?.(`[dsh-ppt-maker] tool registration failed: ${err2.message}`);
      }
    }
  }
  const effectOff = registerRoutes(
    ctx,
    new Proxy(
      {},
      {
        get(_t, prop) {
          const bridge = resolveBridge();
          if (!bridge) return void 0;
          return bridge[prop];
        }
      }
    )
  );
  if (typeof effectOff === "function") offs.push(effectOff);
  void loadHostModules().then(({ store }) => {
    cachedBridge = buildPptMakerBridge(store);
  }).catch((err2) => {
    ctx.logger?.warn?.(`[dsh-ppt-maker] host store \u88C5\u8F7D\u5931\u8D25: ${err2.message}`);
  });
  ctx.effect?.(() => () => {
    for (const off of offs.splice(0)) {
      try {
        off();
      } catch {
      }
    }
  });
}
export {
  PACKAGE_ROOT,
  apply,
  inject,
  name
};
