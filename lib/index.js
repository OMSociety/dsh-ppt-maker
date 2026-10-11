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

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports) {
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

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports) {
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
    function visit_(key, node, visitor, path15) {
      const ctrl = callVisitor(key, node, visitor, path15);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path15, ctrl);
        return visit_(key, ctrl, visitor, path15);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path15 = Object.freeze(path15.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path15);
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
          path15 = Object.freeze(path15.concat(node));
          const ck = visit_("key", node.key, visitor, path15);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path15);
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
    async function visitAsync_(key, node, visitor, path15) {
      const ctrl = await callVisitor(key, node, visitor, path15);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path15, ctrl);
        return visitAsync_(key, ctrl, visitor, path15);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path15 = Object.freeze(path15.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path15);
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
          path15 = Object.freeze(path15.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path15);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path15);
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
    function callVisitor(key, node, visitor, path15) {
      if (typeof visitor === "function")
        return visitor(key, node, path15);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path15);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path15);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path15);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path15);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path15);
      return void 0;
    }
    function replaceNode(key, path15, node) {
      const parent = path15[path15.length - 1];
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

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports) {
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

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports) {
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

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports) {
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

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
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

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports) {
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

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports) {
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

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports) {
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

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports) {
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

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path15, value) {
      let v = value;
      for (let i = path15.length - 1; i >= 0; --i) {
        const k = path15[i];
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
    var isEmptyPath = (path15) => path15 == null || typeof path15 === "object" && !!path15[Symbol.iterator]().next().done;
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
      addIn(path15, value) {
        if (isEmptyPath(path15))
          this.add(value);
        else {
          const [key, ...rest] = path15;
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
      deleteIn(path15) {
        const [key, ...rest] = path15;
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
      getIn(path15, keepScalar) {
        const [key, ...rest] = path15;
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
      hasIn(path15) {
        const [key, ...rest] = path15;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path15, value) {
        const [key, ...rest] = path15;
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

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
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

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
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

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
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

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports) {
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

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
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

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
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

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
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

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports) {
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

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
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

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
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

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports) {
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

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
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

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports) {
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

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports) {
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

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports) {
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

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports) {
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

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
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

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports) {
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

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports) {
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

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports) {
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

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
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

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
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

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports) {
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

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports) {
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

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
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

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports) {
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
      addIn(path15, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path15, value);
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
      deleteIn(path15) {
        if (Collection.isEmptyPath(path15)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path15) : false;
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
      getIn(path15, keepScalar) {
        if (Collection.isEmptyPath(path15))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path15, keepScalar) : void 0;
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
      hasIn(path15) {
        if (Collection.isEmptyPath(path15))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path15) : false;
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
      setIn(path15, value) {
        if (Collection.isEmptyPath(path15)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path15), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path15, value);
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

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports) {
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
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
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

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports) {
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

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
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

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
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

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
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

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
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

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
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

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports) {
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

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
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

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports) {
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

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
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

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
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

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
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

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
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

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports) {
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

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports) {
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

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports) {
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

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
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

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
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

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
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
    visit2.itemAtPath = (cst, path15) => {
      let item = cst;
      for (const [field, index] of path15) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit2.parentCollection = (cst, path15) => {
      const parent = visit2.itemAtPath(cst, path15.slice(0, -1));
      const field = path15[path15.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path15, item, visitor) {
      let ctrl = visitor(item, path15);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path15.concat([[field, i]])), token.items[i], visitor);
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
            ctrl = ctrl(item, path15);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path15) : ctrl;
    }
    exports.visit = visit2;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports) {
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

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports) {
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

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports) {
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

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports) {
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

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports) {
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

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
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

// src/index.ts
import { existsSync, readFileSync } from "fs";
import path14 from "path";
import { pathToFileURL } from "url";

// src/root.ts
import path from "path";
import { fileURLToPath } from "url";
var PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// src/core/export-pipeline.ts
import { mkdtemp, readFile as readFile4, rm as rm3, writeFile as writeFile3 } from "fs/promises";
import os from "os";
import path5 from "path";
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
function blocker(code, message, path15, detail) {
  return { code, level: "blocker", message, ...path15 === void 0 ? {} : { path: path15 }, ...detail === void 0 ? {} : { detail } };
}
function warning(code, message, path15, detail) {
  return { code, level: "warning", message, ...path15 === void 0 ? {} : { path: path15 }, ...detail === void 0 ? {} : { detail } };
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
  } catch (err) {
    return {
      value: null,
      issues: [blocker(ERROR_CODES.SchemaError, `deck.pptd \u4E0D\u662F\u5408\u6CD5 YAML\uFF1A${err.message}`, sourcePath)]
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
  } catch (err) {
    return {
      value: null,
      issues: [blocker(ERROR_CODES.SchemaError, `\u9875\u6587\u4EF6\u4E0D\u662F\u5408\u6CD5 YAML\uFF1A${err.message}`, sourcePath)]
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
function validateDeckShape(deck, path15) {
  const issues = [];
  if (deck.version !== "v3") {
    issues.push(
      blocker(ERROR_CODES.VersionError, `version \u7F3A\u5931\u6216\u4E0D\u4E3A "v3"\uFF08\u5B9E\u9645\uFF1A${JSON.stringify(deck.version)}\uFF09`, `${path15}#version`, {
        expected: "v3",
        actual: deck.version ?? null
      })
    );
  }
  if (deck.profile !== void 0 && deck.profile !== "generate" && deck.profile !== "reverse") {
    issues.push(
      blocker(ERROR_CODES.UnknownProfileError, `profile \u53D6\u503C\u5FC5\u987B\u662F generate / reverse\uFF08\u5B9E\u9645\uFF1A${JSON.stringify(deck.profile)}\uFF09`, `${path15}#profile`)
    );
  }
  if (!isSizePair(deck.size)) {
    issues.push(
      blocker(ERROR_CODES.SchemaError, "size \u5FC5\u586B\uFF0C\u4E14\u4E3A [\u5BBD, \u9AD8] \u4E24\u4E2A\u6B63\u6570", `${path15}#size`, { actual: deck.size ?? null })
    );
  } else if (deck.size[0] <= 0 || deck.size[1] <= 0) {
    issues.push(blocker(ERROR_CODES.SchemaError, "size \u7684\u5BBD\u9AD8\u5FC5\u987B > 0", `${path15}#size`, { actual: deck.size }));
  }
  if (deck.title !== void 0 && typeof deck.title !== "string") {
    issues.push(blocker(ERROR_CODES.SchemaError, "title \u5FC5\u987B\u662F\u5B57\u7B26\u4E32", `${path15}#title`));
  }
  if (!Array.isArray(deck.pages)) {
    issues.push(blocker(ERROR_CODES.SchemaError, "pages \u5FC5\u586B\uFF0C\u4E14\u4E3A\u9875\u6587\u4EF6\u76F8\u5BF9\u8DEF\u5F84\u6570\u7EC4", `${path15}#pages`));
  } else {
    deck.pages.forEach((entry, i) => {
      if (typeof entry !== "string" || !isSafeRelativePath(entry)) {
        issues.push(
          blocker(ERROR_CODES.SchemaError, '\u9875\u8DEF\u5F84\u5FC5\u987B\u662F\u5DE5\u7A0B\u76EE\u5F55\u5185\u7684\u76F8\u5BF9\u8DEF\u5F84\uFF08\u4E0D\u5F97\u4E3A\u7EDD\u5BF9\u8DEF\u5F84\u6216\u542B ".."\uFF09', `${path15}#pages[${i}]`, {
            actual: entry
          })
        );
      }
    });
  }
  issues.push(...validateExportConfig(deck.export, `${path15}#export`));
  return issues;
}
function validateExportConfig(raw, path15) {
  const issues = [];
  if (raw === void 0) return issues;
  if (!isRecord(raw)) {
    return [blocker(ERROR_CODES.ExportFieldValueError, "export \u5FC5\u987B\u662F\u5BF9\u8C61", path15)];
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
        blocker(ERROR_CODES.ExportFieldValueError, `export.${key} \u53D6\u503C\u5FC5\u987B\u5728 ${allowed.join(" / ")} \u5185`, `${path15}.${key}`, {
          allowed,
          actual: value
        })
      );
    }
  }
  for (const key of Object.keys(raw)) {
    if (!(key in domains)) {
      issues.push(warning(ERROR_CODES.ExportFieldValueError, `export \u91CC\u7684\u672A\u77E5\u5B57\u6BB5 "${key}" \u5C06\u88AB\u5FFD\u7565`, `${path15}.${key}`));
    }
  }
  return issues;
}
function collectThemeRefs(value, path15, out = []) {
  if (typeof value === "string") {
    if (value.startsWith(THEME_REF_PREFIX) && value.length > 1) out.push({ key: value.slice(1), path: path15 });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectThemeRefs(item, `${path15}[${i}]`, out));
    return out;
  }
  if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) collectThemeRefs(v, `${path15}.${k}`, out);
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
  const path15 = options.path ?? "deck.pptd";
  const profile = options.profile ?? profileOf(deck);
  const issues = [...validateDeckShape(deck, path15)];
  if (profile === "reverse") {
    issues.push(...validateDeckSource(deck.source, `${path15}#source`));
  } else {
    if (deck.source !== void 0) {
      issues.push(
        blocker(ERROR_CODES.ProfileViolationError, "deck.source \u662F\u9006\u5411\u65B9\u8A00\u4E13\u5C5E\u5B57\u6BB5\uFF0C\u751F\u6210\u65B9\u8A00\u4E0D\u5F97\u51FA\u73B0", `${path15}#source`)
      );
    }
    const themeKeys = themeKeysOf(deck.theme);
    for (const ref of collectThemeRefs(deck, path15)) {
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
function validateDeckSource(source, path15) {
  const issues = [];
  if (!isRecord(source)) {
    return [blocker(ERROR_CODES.SourceRequiredError, "profile: reverse \u65F6 deck.source \u5FC5\u586B", path15)];
  }
  if (typeof source.path !== "string" || source.path === "") {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, "source.path \u5FC5\u586B\uFF08\u6E90 .pptx \u8DEF\u5F84\uFF09", `${path15}.path`));
  }
  if (!isFiniteNumber(source.slideCount)) {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, "source.slideCount \u5FC5\u586B\uFF08\u6E90\u6587\u4EF6\u9875\u6570\uFF09", `${path15}.slideCount`));
  }
  if (!isSizePair(source.size)) {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, "source.size \u5FC5\u586B\uFF08\u6E90\u6587\u4EF6\u9875\u9762\u5C3A\u5BF8 [\u5BBD, \u9AD8]\uFF09", `${path15}.size`));
  }
  return issues;
}
function validatePage(page, options = {}) {
  const profile = options.profile ?? DEFAULT_PROFILE;
  const path15 = options.path ?? "pages/?.page";
  const issues = [];
  const raw = page;
  if (profile === "generate") {
    for (const field of REVERSE_ONLY_PAGE_FIELDS) {
      if (raw[field] !== void 0) {
        issues.push(
          blocker(ERROR_CODES.ProfileViolationError, `Page.${field} \u662F\u9006\u5411\u65B9\u8A00\u4E13\u5C5E\u5B57\u6BB5\uFF0C\u751F\u6210\u65B9\u8A00\u4E0D\u5F97\u51FA\u73B0`, `${path15}#${field}`)
        );
      }
    }
  } else if (page.pageType !== void 0) {
    issues.push(
      blocker(ERROR_CODES.ProfileViolationError, "Page.pageType \u662F\u751F\u6210\u65B9\u8A00\u4E13\u5C5E\u5B57\u6BB5\uFF0C\u9006\u5411\u65B9\u8A00\u4E0D\u4F7F\u7528", `${path15}#pageType`)
    );
  }
  if (page.transition !== void 0) issues.push(...validatePageTransition(page.transition, `${path15}#transition`));
  if (!Array.isArray(page.elements)) {
    issues.push(blocker(ERROR_CODES.SchemaError, "elements \u5FC5\u586B\uFF0C\u4E14\u4E3A\u5143\u7D20\u6570\u7EC4", `${path15}#elements`));
    return issues;
  }
  const seen = /* @__PURE__ */ new Set();
  page.elements.forEach((element, index) => {
    issues.push(...validateElement(element, { profile, path: `${path15}#elements[${index}]`, seen }));
  });
  issues.push(...validateAnimations(page.animations, { path: `${path15}#animations`, elements: page.elements, profile }));
  if (profile === "reverse") {
    for (const ref of collectThemeRefs(page, path15)) {
      issues.push(
        blocker(ERROR_CODES.ProfileViolationError, `\u9006\u5411\u65B9\u8A00\u4E0D\u5141\u8BB8 $key \u4E3B\u9898\u5F15\u7528\uFF08$${ref.key}\uFF1BR2/R4 \u8981\u6C42\u5B57\u9762\u91CF\uFF09`, ref.path, { key: ref.key })
      );
    }
  } else if (options.themeKeys) {
    for (const ref of collectThemeRefs(page, path15)) {
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
  const { profile, path: path15 } = ctx;
  const issues = [];
  if (!isRecord(element)) {
    return [blocker(ERROR_CODES.SchemaError, "\u5143\u7D20\u5FC5\u987B\u662F\u6620\u5C04\u5BF9\u8C61", path15)];
  }
  const target = element;
  if (typeof target.elementId !== "string" || target.elementId === "") {
    issues.push(blocker(ERROR_CODES.SchemaError, "elementId \u5FC5\u586B\uFF0C\u4E14\u4E3A\u975E\u7A7A\u5B57\u7B26\u4E32", `${path15}#elementId`));
  } else if (ctx.seen.has(target.elementId)) {
    issues.push(blocker(ERROR_CODES.SchemaError, `elementId "${target.elementId}" \u5728\u540C\u4E00\u9875\u5185\u91CD\u590D`, `${path15}#elementId`));
  } else {
    ctx.seen.add(target.elementId);
  }
  const elementType = target.elementType;
  const allowed = profile === "generate" ? GENERATE_ELEMENT_TYPES : REVERSE_ELEMENT_TYPES;
  if (typeof elementType !== "string") {
    issues.push(blocker(ERROR_CODES.SchemaError, "elementType \u5FC5\u586B", `${path15}#elementType`));
  } else if (profile === "generate" && elementType === "placeholder") {
    issues.push(
      blocker(ERROR_CODES.PlaceholderNotAllowedError, 'profile: generate \u7684\u5DE5\u7A0B\u91CC\u4E0D\u5141\u8BB8 elementType: "placeholder"', `${path15}#elementType`)
    );
  } else if (profile === "reverse" && (elementType === "icon" || elementType === "chart")) {
    issues.push(
      blocker(ERROR_CODES.ProfileViolationError, `\u9006\u5411\u65B9\u8A00\u4E0D\u4EA7\u51FA ${elementType} \u5143\u7D20\uFF08\u6E90\u56FE\u6807\u6309 shape/image\u3001\u56FE\u8868\u8D70 dropped + placeholder \u6620\u5C04\uFF09`, `${path15}#elementType`)
    );
  } else if (!allowed.includes(elementType)) {
    issues.push(
      blocker(ERROR_CODES.SchemaError, `elementType "${elementType}" \u4E0D\u5728 ${profile} \u65B9\u8A00\u5141\u8BB8\u7684\u53D6\u503C\u5185`, `${path15}#elementType`, {
        allowed
      })
    );
  }
  const isPlaceholder = elementType === "placeholder";
  if (!("bounds" in element) || element.bounds === void 0) {
    issues.push(
      profile === "reverse" ? blocker(ERROR_CODES.ExplicitGeometryRequiredError, "\u9006\u5411\u65B9\u8A00\u5143\u7D20\u5FC5\u987B\u663E\u5F0F\u7ED9\u51FA bounds", `${path15}#bounds`) : blocker(ERROR_CODES.SchemaError, "bounds \u5FC5\u586B\uFF08[x, y, w, h]\uFF09", `${path15}#bounds`)
    );
  } else if (!isBounds(element.bounds)) {
    issues.push(blocker(ERROR_CODES.SchemaError, "bounds \u5FC5\u987B\u662F [x, y, w, h] \u56DB\u4E2A\u6570", `${path15}#bounds`, { actual: element.bounds }));
  }
  if (profile === "reverse" && !isPlaceholder) {
    for (const field of ["rotation", "opacity", "flip"]) {
      if (element[field] === void 0) {
        issues.push(
          blocker(ERROR_CODES.ExplicitGeometryRequiredError, `\u9006\u5411\u65B9\u8A00\u5143\u7D20\u5FC5\u987B\u663E\u5F0F\u5199\u51FA ${field}\uFF08\u5373\u4F7F\u7B49\u4E8E\u9ED8\u8BA4\u503C\uFF09`, `${path15}#${field}`)
        );
      }
    }
  }
  if (profile === "generate") {
    for (const field of REVERSE_ONLY_ELEMENT_FIELDS) {
      if (element[field] !== void 0) {
        issues.push(
          blocker(ERROR_CODES.ProfileViolationError, `\u5143\u7D20\u5B57\u6BB5 "${field}" \u662F\u9006\u5411\u65B9\u8A00\u4E13\u5C5E\uFF0C\u751F\u6210\u65B9\u8A00\u4E0D\u5F97\u51FA\u73B0`, `${path15}#${field}`)
        );
      }
    }
  }
  if (isPlaceholder) {
    const originalType = element.originalType;
    if (originalType === void 0) {
      issues.push(blocker(ERROR_CODES.PlaceholderFieldError, "placeholder \u7684 originalType \u5FC5\u586B", `${path15}#originalType`));
    } else if (typeof originalType !== "string" || !PLACEHOLDER_ORIGINAL_TYPES.includes(originalType)) {
      issues.push(
        blocker(ERROR_CODES.PlaceholderFieldError, `placeholder.originalType \u4E0D\u5728\u7C7B\u522B\u8868\u5185\uFF08${PLACEHOLDER_ORIGINAL_TYPES.join(" / ")}\uFF09`, `${path15}#originalType`, {
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
    const path15 = `${ctx.path}[${index}]`;
    if (!isRecord(raw)) {
      issues.push(blocker(ERROR_CODES.SchemaError, "\u52A8\u753B\u6761\u76EE\u5FC5\u987B\u662F\u6620\u5C04\u5BF9\u8C61", path15));
      return;
    }
    const anim = raw;
    if (typeof anim.elementId !== "string" || anim.elementId === "") {
      issues.push(blocker(ERROR_CODES.AnimationTargetError, "\u52A8\u753B elementId \u5FC5\u586B", `${path15}#elementId`));
    } else if (placeholderIds.has(anim.elementId)) {
      issues.push(
        blocker(ERROR_CODES.AnimationTargetError, `\u52A8\u753B\u4E0D\u5F97\u6307\u5411 placeholder \u5143\u7D20\uFF08${anim.elementId}\uFF09`, `${path15}#elementId`)
      );
    } else if (!elementIds.has(anim.elementId)) {
      issues.push(
        blocker(ERROR_CODES.AnimationTargetError, `\u52A8\u753B elementId "${anim.elementId}" \u672A\u5F15\u7528\u672C\u9875\u5DF2\u5B58\u5728\u7684\u5143\u7D20`, `${path15}#elementId`)
      );
    }
    const effect = anim.effect;
    const isNullEffect = effect === null;
    if (isNullEffect) {
      if (anim.originalEffect === void 0) {
        issues.push(
          blocker(ERROR_CODES.OriginalEffectRequiredError, "effect: null \u65F6\u5FC5\u987B\u5199 originalEffect\uFF08\u6E90 preset \u539F\u6837\u6807\u8BC6\uFF09", `${path15}#originalEffect`)
        );
      }
    } else if (typeof effect !== "string" || !ANIMATION_EFFECT_SET.has(effect)) {
      issues.push(
        blocker(ERROR_CODES.UnknownAnimationEffectError, `effect \u4E0D\u5728 95 \u4E2A preset \u8BCD\u8868\u5185\uFF1A${JSON.stringify(effect)}`, `${path15}#effect`)
      );
    }
    if (anim.trigger !== void 0 && !ANIMATION_TRIGGERS.includes(anim.trigger)) {
      issues.push(
        blocker(ERROR_CODES.SchemaError, `trigger \u53D6\u503C\u5FC5\u987B\u662F ${ANIMATION_TRIGGERS.join(" / ")}`, `${path15}#trigger`, { actual: anim.trigger })
      );
    }
    const effectName = typeof effect === "string" ? effect : null;
    if (anim.durationMs !== void 0 && anim.durationMs !== null) {
      if (!isFiniteNumber(anim.durationMs) || anim.durationMs <= 0) {
        issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "durationMs \u5FC5\u987B > 0", `${path15}#durationMs`, { actual: anim.durationMs }));
      } else if (effectName !== null && ANIMATION_DURATION_FORBIDDEN.includes(effectName)) {
        issues.push(
          blocker(ERROR_CODES.AnimationDurationNotAllowedError, `${effectName} \u4E0D\u63A5\u53D7 durationMs\uFF08\u77AC\u65F6\u6216\u6548\u679C\u4FDD\u6301\u5230\u672C\u9875\u7ED3\u675F\uFF09`, `${path15}#durationMs`)
        );
      }
    }
    if (anim.delayMs !== void 0 && (!isFiniteNumber(anim.delayMs) || anim.delayMs < 0)) {
      issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "delayMs \u5FC5\u987B >= 0", `${path15}#delayMs`, { actual: anim.delayMs }));
    }
    issues.push(...validateAnimationOptions(anim, path15, effectName));
    issues.push(...validateAnimationSequence(anim, index, animations, path15));
    if (profile === "generate") {
      for (const field of REVERSE_ONLY_ANIMATION_FIELDS) {
        if (raw[field] !== void 0) {
          issues.push(
            blocker(ERROR_CODES.ProfileViolationError, `\u52A8\u753B\u8BB0\u5F55\u5B57\u6BB5 "${field}" \u662F\u9006\u5411\u65B9\u8A00\u4E13\u5C5E\uFF0C\u751F\u6210\u65B9\u8A00\u4E0D\u5F97\u51FA\u73B0`, `${path15}#${field}`)
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
function validateAnimationOptions(anim, path15, effectName) {
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
          `${path15}#${option}`,
          { applicableTo: ANIMATION_OPTION_APPLICABILITY[option] }
        )
      );
    }
  }
  if (anim.direction !== void 0) {
    const domain = ANIMATION_DIRECTION_DOMAIN[effectName];
    if (domain !== void 0 && !domain.includes(String(anim.direction))) {
      issues.push(
        blocker(ERROR_CODES.AnimationOptionValueError, `direction "${anim.direction}" \u8D85\u51FA ${effectName} \u7684\u65B9\u5411\u96C6\u5408`, `${path15}#direction`, {
          allowed: domain
        })
      );
    }
  }
  if (anim.orientation !== void 0 && !ANIMATION_ORIENTATIONS.includes(String(anim.orientation))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "orientation \u53D6\u503C\u5FC5\u987B\u662F horizontal / vertical", `${path15}#orientation`));
  }
  if (anim.inOut !== void 0 && !ANIMATION_IN_OUT.includes(String(anim.inOut))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "inOut \u53D6\u503C\u5FC5\u987B\u662F in / out", `${path15}#inOut`));
  }
  if (anim.shape !== void 0 && !ANIMATION_SHAPES.includes(String(anim.shape))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "shape \u53D6\u503C\u5FC5\u987B\u662F circle / box / diamond / plus", `${path15}#shape`));
  }
  if (anim.spokes !== void 0 && !ANIMATION_SPOKES.includes(Number(anim.spokes))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "spokes \u53D6\u503C\u9650 1 / 2 / 3 / 4 / 8", `${path15}#spokes`, { actual: anim.spokes }));
  }
  if (anim.spinDegrees !== void 0 && (!isFiniteNumber(anim.spinDegrees) || anim.spinDegrees <= 0)) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "spinDegrees \u5FC5\u987B > 0", `${path15}#spinDegrees`));
  }
  if (anim.scalePercent !== void 0 && (!isFiniteNumber(anim.scalePercent) || anim.scalePercent <= 0)) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "scalePercent \u5FC5\u987B > 0", `${path15}#scalePercent`));
  }
  if (anim.transparencyPercent !== void 0 && (!isFiniteNumber(anim.transparencyPercent) || anim.transparencyPercent < 0 || anim.transparencyPercent > 100)) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "transparencyPercent \u53D6\u503C\u5FC5\u987B\u5728 [0, 100]", `${path15}#transparencyPercent`));
  }
  if (anim.build !== void 0 && !ANIMATION_TEXT_BUILDS.includes(String(anim.build))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, "build \u53D6\u503C\u5FC5\u987B\u662F asOneObject / allAtOnce / byParagraph", `${path15}#build`));
  }
  if (anim.build !== void 0 && anim.build !== "asOneObject" && ANIMATION_BUILD_RESTRICTED.includes(effectName)) {
    issues.push(
      blocker(ERROR_CODES.AnimationOptionNotApplicableError, `${effectName} \u53EA\u52A8\u753B\u5F62\u72B6\u672C\u8EAB\uFF0C\u4E0D\u63A5\u53D7 build: ${anim.build}`, `${path15}#build`)
    );
  }
  return issues;
}
function validateAnimationSequence(anim, index, all, path15) {
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
      `${path15}#trigger`,
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
function validatePageTransition(raw, path15) {
  const issues = [];
  if (!isRecord(raw)) {
    return [blocker(ERROR_CODES.SchemaError, "transition \u5FC5\u987B\u662F\u5BF9\u8C61", path15)];
  }
  const transition = raw;
  const effect = transition.effect;
  if (typeof effect !== "string" || effect === "") {
    issues.push(blocker(ERROR_CODES.UnknownTransitionEffectError, "transition.effect \u5FC5\u586B", `${path15}#effect`));
    return issues;
  }
  if (!TRANSITION_EFFECT_SET.has(effect)) {
    if (transition.unmodeled === true) {
      issues.push(
        warning(ERROR_CODES.UnmodeledTransitionWarning, `\u8F6C\u573A\u6548\u679C "${effect}" \u672A\u5EFA\u6A21\uFF0C\u5BFC\u51FA\u65F6\u8DF3\u8FC7\u8BE5\u9875\u8F6C\u573A`, `${path15}#effect`)
      );
    } else {
      issues.push(
        blocker(ERROR_CODES.UnknownTransitionEffectError, `transition.effect "${effect}" \u4E0D\u5728\u9644\u5F55 B.1 \u7684 42 \u4E2A token \u5185\u4E14\u672A\u7F6E unmodeled: true`, `${path15}#effect`)
      );
    }
  }
  if (effect === "prstTrans") {
    const preset = transition.preset;
    if (typeof preset !== "string" || !TRANSITION_PRESET_SET.has(preset)) {
      issues.push(
        blocker(ERROR_CODES.TransitionPresetRequiredError, "effect: prstTrans \u65F6 preset \u5FC5\u586B\uFF0C\u4E14\u5FC5\u987B\u5728\u9644\u5F55 B.2 \u7684 12 \u4E2A token \u5185", `${path15}#preset`, {
          actual: preset ?? null
        })
      );
    }
  }
  if (transition.direction !== void 0) {
    const domain = TRANSITION_DIRECTION_DOMAIN[effect];
    if (domain === void 0) {
      issues.push(
        blocker(ERROR_CODES.TransitionDirectionMismatchError, `${effect} \u4E0D\u63A5\u53D7 direction`, `${path15}#direction`, { actual: transition.direction })
      );
    } else if (!domain.includes(String(transition.direction))) {
      issues.push(
        blocker(ERROR_CODES.TransitionDirectionMismatchError, `direction "${transition.direction}" \u4E0E ${effect} \u7684\u65B9\u5411\u57DF\u4E0D\u5339\u914D`, `${path15}#direction`, {
          allowed: domain
        })
      );
    }
  }
  for (const [option, scope] of Object.entries(TRANSITION_OPTION_SCOPE)) {
    if (transition[option] !== void 0 && !scope.includes(effect)) {
      issues.push(
        blocker(ERROR_CODES.TransitionOptionNotApplicableError, `\u9009\u9879 ${option} \u4E0D\u9002\u7528\u4E8E\u8F6C\u573A effect ${effect}`, `${path15}#${option}`)
      );
    }
  }
  if (transition.speed !== void 0 && !["slow", "med", "fast"].includes(String(transition.speed))) {
    issues.push(blocker(ERROR_CODES.SchemaError, "transition.speed \u53D6\u503C\u5FC5\u987B\u662F slow / med / fast", `${path15}#speed`));
  }
  if (transition.durationMs !== void 0 && (!isFiniteNumber(transition.durationMs) || transition.durationMs <= 0)) {
    issues.push(blocker(ERROR_CODES.SchemaError, "transition.durationMs \u5FC5\u987B > 0", `${path15}#durationMs`));
  }
  if (transition.spokes !== void 0 && ![1, 2, 3, 4, 8].includes(Number(transition.spokes))) {
    issues.push(blocker(ERROR_CODES.TransitionOptionNotApplicableError, "transition.spokes \u53D6\u503C\u9650 1 / 2 / 3 / 4 / 8", `${path15}#spokes`));
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
  for (const path15 of declared) {
    const key = path15.replace(/\\/g, "/");
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
  } catch (err) {
    throw new ProjectError("ManifestCorrupt", `\u5DE5\u7A0B\u8D26\u672C\u635F\u574F\uFF1A${err.message}`, { status: 409 });
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
    } catch (err) {
      if (err instanceof ProjectError) throw err;
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
  const max = snapshots.length > 0 ? snapshots[snapshots.length - 1].revision : 0;
  const target = Math.min(max, loaded.manifest.revision + steps);
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
  setParagraphLineSpacing,
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
    if (typeof value === "string") return { font: value, fontEastAsian: value };
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
    if (typeof value === "string" && value !== "") into.add(value);
    else if (value && typeof value === "object") {
      const rec = value;
      if (typeof rec.latin === "string") into.add(rec.latin);
      if (typeof rec.ea === "string") into.add(rec.ea);
    }
  }
};
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
  } catch (err) {
    ctx.warnings.push(`${where}\uFF1A\u7D20\u6750\u52A0\u8F7D\u5931\u8D25 ${src}\uFF1A${err.message}`);
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
        } catch (err) {
          ctx.warnings.push(`${where}\uFF1A\u81EA\u5B9A\u4E49\u51E0\u4F55\u5199\u5165\u5931\u8D25\uFF1A${err.message}`);
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
  const color = resolver.color(labelStyle.color) ?? "#6B7280";
  const alignPair = Array.isArray(labelStyle.align) ? labelStyle.align : ["center", "middle"];
  setShapeParagraphs(shape, [
    {
      align: ALIGN_MAP[alignPair[0]] ?? "center",
      runs: [{ text: label, format: { size: fontSize, color } }]
    }
  ]);
  applyTextBodyProps(
    shape,
    { align: alignPair, wrap: true, font: {} },
    ctx.warnings,
    where
  );
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
    } catch (err) {
      ctx.warnings.push(`${where}\uFF1A\u5408\u5E76\u5355\u5143\u683C (${merge.row},${merge.col}) \u5931\u8D25\uFF1A${err.message}`);
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
      const [tb, lr, b2, l2] = [spec[0], spec[1], spec[2], spec[3]];
      if (spec.length === 2) {
        setTableCellBorders(cell, { top: one(tb), bottom: one(tb), left: one(lr), right: one(lr) });
      } else if (spec.length === 4) {
        setTableCellBorders(cell, { top: one(tb), right: one(lr), bottom: one(b2), left: one(l2) });
      } else {
        ctx.warnings.push(`${where}\uFF1ABorderSpec \u6570\u7EC4\u957F\u5EA6\u987B\u4E3A 2 \u6216 4`);
      }
    } else if (typeof spec === "object" && spec !== null) {
      const b = one(spec);
      if (b) setTableCellBorders(cell, { top: b, right: b, bottom: b, left: b });
    }
  } catch (err) {
    ctx.warnings.push(`${where}\uFF1A\u5355\u5143\u683C\u8FB9\u6846\u8BBE\u7F6E\u5931\u8D25\uFF1A${err.message}`);
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
function svgPathToCustomGeometry(path15, viewBox, ctx, where) {
  const tokens = path15.match(/[MmLlHhVvCcSsQqZzAa]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g);
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
    } catch (err) {
      skipped++;
      ctx.warnings.push(`${pageLabel}\uFF1A\u52A8\u753B ${anim.effect}@${anim.elementId} \u5199\u5165\u5931\u8D25\uFF1A${err.message}`);
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
  } catch (err) {
    ctx.warnings.push(`${pageLabel}\uFF1A\u8F6C\u573A ${transition.effect} \u5199\u5165\u5931\u8D25\uFF1A${err.message}`);
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
          } catch (err) {
            warnings.push(`${pageLabel}\uFF1A\u5143\u7D20 ${String(record.elementId)}\uFF08${String(type)}\uFF09\u6784\u5EFA\u5931\u8D25\uFF1A${err.message}`);
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
            } catch (err) {
              warnings.push(`${pageLabel}\uFF1A\u9ED8\u8BA4\u6DE1\u5165\u8F6C\u573A\u5199\u5165\u5931\u8D25\uFF1A${err.message}`);
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
      } catch (err) {
        ctx.warnings.push(`\u5143\u7D20 ${String(element.elementId)}\uFF1A\u586B\u5145\u7D20\u6750\u52A0\u8F7D\u5931\u8D25 ${fill.src}\uFF1A${err.message}`);
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
  } catch (err) {
    return {
      performed: false,
      reason: `\u56FE\u7247\u5165\u5E93\u5931\u8D25\uFF08${err.message}\uFF09\uFF1B\u5DF2\u964D\u7EA7\uFF1A\u8BF7\u4E3B\u6A21\u578B\u81EA\u884C read_image \u4E0B\u5217 PNG`,
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
    fontsUsed: built.fontsUsed
  };
}
async function saveProjectPptx(pipeline) {
  const engine = createOfficeKitEngine();
  return engine.saveDeck(pipeline.built.native);
}
async function loadMediaBytes(projectDir, src) {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  const abs = path5.resolve(projectDir, src);
  const rel = path5.relative(projectDir, abs);
  if (rel.startsWith("..") || path5.isAbsolute(rel)) {
    throw new Error(`\u7D20\u6750\u8DEF\u5F84\u8D8A\u51FA\u5DE5\u7A0B\u76EE\u5F55\uFF1A${src}`);
  }
  return new Uint8Array(await readFile4(abs));
}
async function renderPptxImages(pptxBytes, options = {}) {
  const tmp = await mkdtemp(path5.join(os.tmpdir(), "ppt-maker-render-"));
  const inputPath = path5.join(tmp, "deck.pptx");
  const outputDir = path5.join(tmp, "out");
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
  } catch (err) {
    await conv?.dispose().catch(() => {
    });
    await rm3(tmp, { recursive: true, force: true }).catch(() => {
    });
    throw err;
  }
}
async function checkProject(cwd, dir, options = {}) {
  const pipeline = await buildProjectDeck(cwd, dir);
  const pres = pipeline.built.native;
  const review = reviewDeck(pres, { pages: options.pages });
  let missingFonts = [];
  let ai;
  const needsRender = options.withMissingFonts !== false || options.ai !== void 0;
  let pptxBytes = null;
  if (needsRender) {
    try {
      pptxBytes = await saveProjectPptx(pipeline);
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
          { ...deps, toDisplayPath: (abs) => path5.relative(options.ai.cwd, abs).replace(/\\/g, "/") }
        );
      } finally {
        await rendered.cleanup();
      }
    } catch (err) {
      ai = { performed: false, reason: `AI \u8D28\u68C0\u672A\u6267\u884C\uFF1A${err.message}` };
    }
  }
  const issues = [...review.issues];
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
function toolError(err) {
  if (err instanceof ProjectError) {
    return {
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...err.status !== void 0 ? { status: err.status } : {},
        ...err.detail !== void 0 ? { detail: err.detail } : {}
      }
    };
  }
  const message = err instanceof Error ? err.message : String(err);
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
      } catch (err) {
        return toolError(err);
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
      } catch (err) {
        return toolError(err);
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
      } catch (err) {
        return toolError(err);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/export.ts
import { writeFile as writeFile4 } from "fs/promises";
import path6 from "path";
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
        const bytes = await saveProjectPptx(pipeline);
        const absOut = path6.resolve(cwd, out);
        const rel = path6.relative(cwd, absOut);
        if (rel.startsWith("..") || path6.isAbsolute(rel)) {
          throw new ProjectError("PathOutsideCwd", `\u5BFC\u51FA\u8DEF\u5F84\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${out}`, { status: 400 });
        }
        await writeFile4(absOut, bytes);
        const loaded = await loadProject(cwd, dir);
        const report = {
          revision: pipeline.revision,
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          out: path6.relative(cwd, absOut).replace(/\\/g, "/"),
          bytes: bytes.byteLength,
          fontsUsed: pipeline.fontsUsed,
          transition: loaded.deck.export?.transition ?? "fade",
          animations: loaded.deck.export?.animations ?? "auto",
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
          check: { pass: true, blockerCount: 0 }
        };
      } catch (err) {
        return toolError(err);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/import.ts
import path9 from "path";
import { access, readFile as readFile7 } from "fs/promises";

// src/core/reverse/apply.ts
import { readFile as readFile6 } from "fs/promises";
import path8 from "path";
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
  getShapeAdjustValues,
  getShapeAnimation,
  getShapeCustomGeometry,
  getShapeFill,
  getShapeImageBytes,
  getShapeImageCrop,
  getShapeImageFillBytes,
  getShapeImageOpacity,
  getShapePreset,
  getShapeStroke,
  getShapeStrokeDash,
  getShapeTextDirection,
  getShapeTextWrap,
  getSlideAnimations,
  getSlideBackground,
  getSlideBackgroundGradientFill,
  getSlideBackgroundImageBytes,
  getSlideTransition,
  getTableCellParagraphs,
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
function mapText(rec, fonts) {
  const shape = rec.raw;
  const content = {
    text: rec.text,
    align: ["left", "top"],
    wrap: (() => {
      try {
        return getShapeTextWrap(shape) !== "none";
      } catch {
        return true;
      }
    })()
  };
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
        row.push(cellObj);
      }
      rows.push(row);
    }
    element.rows = rows;
  } catch (err) {
    report.degraded.push({
      page: rec.slideIndex,
      elementId: elementIdOf(rec),
      feature: "unknown",
      detail: `\u8868\u683C\u51E0\u4F55/\u5355\u5143\u683C\u8BFB\u53D6\u5931\u8D25\uFF1A${err.message}`
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
        detail: "\u5185\u7F6E\u8868\u683C\u6837\u5F0F id \u8BB0\u5165 builtinStyle\uFF0C\u6E32\u67D3\u4EE5 rows \u5B57\u9762\u91CF\u4E3A\u51C6",
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
function mapPage(slide, pres, media, report) {
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
  try {
    const bg = getSlideBackground(rawSlide);
    if (bg.kind === "solid") {
      page.background = { type: "solid", color: asLiteralColor(bg.color) };
    } else if (bg.kind === "gradient") {
      const g = getSlideBackgroundGradientFill(rawSlide);
      if (g) {
        page.background = {
          type: "gradient",
          gradientType: "linear",
          stops: g.stops.map((s) => ({ position: s.offset, color: asLiteralColor(String(s.color)) }))
        };
      }
    } else if (bg.kind === "image") {
      const bytes = getSlideBackgroundImageBytes(rawSlide);
      if (bytes) {
        const partName = `ppt/media/bg-${slide.slideIndex}.png`;
        media.push({ bytes, ext: ".png", partName });
        page.background = { type: "image", src: `media/${partName.split("/").pop()}` };
      }
    }
  } catch {
  }
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
            page.elements.push(mapText(rec, null));
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
        case "picture":
          page.elements.push(mapImage(rec, media, report));
          break;
        case "connector":
          page.elements.push(mapLine(rec));
          break;
        default: {
          const textBox = isShapeTextBox(rawShape);
          if (textBox || rec.text !== "") {
            page.elements.push(mapText(rec, null));
          } else {
            page.elements.push(mapShape(rec));
          }
        }
      }
    } catch (err) {
      ensurePlaceholder(page, rec, "unknown", report, `\u5F62\u72B6\u6620\u5C04\u629B\u9519\uFF1A${err.message}`);
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
    pages.push(mapPage(slide, pres, media, report));
  }
  const deck = {
    version: "v3",
    profile: "reverse",
    size: sizePx,
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
import { mkdir as mkdir4, readFile as readFile5, rename as rename3, writeFile as writeFile5 } from "fs/promises";
import path7 from "path";
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
  const mediaRoot = path7.join(absDir, "media");
  const objectsRoot = path7.join(mediaRoot, ".objects");
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
    const objectPath = path7.join(objectsRoot, objectName);
    await writeFile5(objectPath, Buffer.from(asset.bytes));
    const aliasName = `${safeFileStem(path7.basename(asset.partName, asset.ext))}-${hash.slice(0, 8)}${asset.ext}`;
    const aliasPath = path7.join(mediaRoot, aliasName);
    await writeFile5(aliasPath, Buffer.from(asset.bytes));
    seen.set(hash, `media/${aliasName}`);
    mediaCount++;
    remapMediaSrc(mapped, asset.partName, `media/${aliasName}`);
  }
  const emptyDeck = { ...mapped.deck, pages: [] };
  const deckPath = path7.join(absDir, "deck.pptd");
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
  const reportPath = path7.join(absDir, "import.report.yml");
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
  const manifestPath = path7.join(projectDir, "manifest.json");
  const raw = await readFile5(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  const deckText = await readFile5(path7.join(projectDir, "deck.pptd"), "utf8");
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
  const abs = path8.resolve(cwd, source);
  const rel = path8.relative(path8.resolve(cwd), abs);
  if (rel.startsWith("..") || path8.isAbsolute(rel)) {
    throw new ReverseImportError("SourceOutsideCwd", `\u6E90\u6587\u4EF6\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${source}\uFF08\u89E3\u6790\u5230 ${abs}\uFF09`);
  }
  try {
    const bytes = await readFile6(abs);
    return { bytes: new Uint8Array(bytes), path: abs };
  } catch (err) {
    throw new ReverseImportError("SourceNotFound", `\u6E90\u6587\u4EF6\u8BFB\u4E0D\u5230\uFF1A${abs}`, err);
  }
}
async function reverseImport(options) {
  const { bytes, path: sourceAbs } = await sourceBytes(options.cwd, options.source);
  const sha1 = createHash3("sha1").update(bytes).digest("hex");
  let read;
  try {
    read = await loadReverseModel(bytes);
  } catch (err) {
    throw new ReverseImportError(
      "ParseFailed",
      `@office-kit/pptx \u65E0\u6CD5\u89E3\u6790\u6E90\u6587\u4EF6\uFF08\u53EF\u6539\u7528 mode:'surgical' \u76F4\u63A5\u5C0F\u6539\uFF09\uFF1A${err.message}`,
      err
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
  const raw = await readFile7(path9.join(projectDir, "manifest.json"), "utf8");
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
        const sourceAbs = path9.resolve(cwd, source);
        try {
          await access(sourceAbs);
        } catch {
          throw new ProjectError("SourceNotFound", `\u6E90\u6587\u4EF6\u8BFB\u4E0D\u5230\uFF1A${sourceAbs}`, { status: 404 });
        }
        const targetDir = typeof args.targetDir === "string" && args.targetDir !== "" ? args.targetDir : path9.basename(source, path9.extname(source));
        const title = typeof args.title === "string" ? args.title : path9.basename(source, path9.extname(source));
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
          const rel = path9.relative(cwd, abs).replace(/\\/g, "/");
          const sessionId = sessionIdOf(exec);
          const bridge = ctx.pptMaker;
          if (sessionId && bridge && typeof bridge.registerProject === "function" && typeof bridge.requestOpen === "function") {
            const { key } = bridge.registerProject(sessionId, cwd, rel);
            bridge.requestOpen(sessionId, key);
          }
        }
        return {
          ok: true,
          projectDir: path9.relative(cwd, result.projectDir).replace(/\\/g, "/"),
          pageCount: result.pageCount,
          mediaCount: result.mediaCount,
          revision: await manifestRevisionOf(result.projectDir),
          dropped: result.dropped.length,
          degraded: result.degraded.length,
          droppedList: result.dropped,
          degradedList: result.degraded
        };
      } catch (err) {
        if (err instanceof ReverseImportError) {
          return toolError(
            new ProjectError(err.code, err.message, {
              status: err.code === "SourceNotFound" ? 404 : err.code === "SourceOutsideCwd" ? 400 : 409,
              detail: err.detail
            })
          );
        }
        return toolError(err);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/open.ts
import path10 from "path";
import { access as access2, readFile as readFile8 } from "fs/promises";
async function ensureProjectDir(cwd, dir) {
  const abs = resolveProjectDir(cwd, dir);
  try {
    await access2(path10.join(abs, "manifest.json"));
    const raw = await readFile8(path10.join(abs, "manifest.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.revision !== "number") throw new Error("revision \u7F3A\u5931");
  } catch (err) {
    throw new ProjectError("ProjectNotFound", `\u76EE\u6807\u4E0D\u662F\u53EF\u6253\u5F00\u7684 PPTD v3 \u5DE5\u7A0B\uFF08manifest.json \u8BFB\u4E0D\u51FA\u6765\uFF09\uFF1A${abs}`, {
      status: 404,
      detail: err instanceof Error ? err.message : String(err)
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
        const rel = path10.relative(cwd, abs).replace(/\\/g, "/");
        const bridge = ctx.pptMaker;
        if (bridge && typeof bridge.registerProject === "function" && typeof bridge.requestOpen === "function") {
          const { key } = bridge.registerProject(sessionId, cwd, rel);
          bridge.requestOpen(sessionId, key);
          return { ok: true, dir: rel, requested: true };
        }
        return { ok: true, dir: rel, requested: false };
      } catch (err) {
        return toolError(err);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/patch.ts
import { readFile as readFile9 } from "fs/promises";
import path11 from "path";
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
    const abs = path11.resolve(cwd, image.src);
    const rel = path11.relative(path11.resolve(cwd), abs);
    if (rel.startsWith("..") || path11.isAbsolute(rel)) {
      throw new ProjectError("PathOutsideCwd", `\u56FE\u7247\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${image.src}`, { status: 400 });
    }
    const buffer = await readFile9(abs);
    return new Uint8Array(buffer);
  }
  throw new ProjectError("ImageBytesMissing", "replace_image \u9700\u8981 image.bytes(Base64) \u6216 image.src\uFF08cwd \u5185\u8DEF\u5F84\uFF09", { status: 400 });
}
function relativeOrSelf(cwd, abs) {
  const rel = path11.relative(cwd, abs);
  return rel.startsWith("..") || path11.isAbsolute(rel) ? abs : rel.replace(/\\/g, "/");
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
        const sourceAbs = path11.resolve(cwd, source);
        const rel = path11.relative(path11.resolve(cwd), sourceAbs);
        if (rel.startsWith("..") || path11.isAbsolute(rel)) {
          throw new ProjectError("PathOutsideCwd", `\u6E90\u6587\u4EF6\u5FC5\u987B\u4F4D\u4E8E\u4F1A\u8BDD cwd \u5185\uFF1A${source}`, { status: 400 });
        }
        const sourceBytes2 = new Uint8Array(await readFile9(sourceAbs));
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
        const sourceStem = path11.basename(source, path11.extname(source));
        const outRel = typeof args.out === "string" && args.out !== "" ? args.out : `${sourceStem}-patched.pptx`;
        const outAbs = path11.resolve(path11.resolve(cwd), outRel);
        const outRelChecked = path11.relative(path11.resolve(cwd), outAbs);
        if (outRelChecked.startsWith("..") || path11.isAbsolute(outRelChecked)) {
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
      } catch (err) {
        return toolError(err);
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
      } catch (err) {
        return toolError(err);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/tools/render.ts
import { mkdir as mkdir5, readFile as readFile10, writeFile as writeFile6 } from "fs/promises";
import path12 from "path";
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
        const bytes = await saveProjectPptx(pipeline);
        const rendered = await renderPptxImages(bytes, {
          pages: args.pages,
          dpi: args.dpi ?? 96
        });
        try {
          const previewDir = path12.join(pipeline.dir, ".previews");
          await mkdir5(previewDir, { recursive: true });
          const images = [];
          for (const image of rendered.result.images) {
            const page = image.page ?? image.index + 1;
            const target = path12.join(previewDir, `page-${String(page).padStart(2, "0")}.png`);
            const bytesIn = await readFile10(image.path);
            await writeFile6(target, bytesIn);
            images.push({
              page,
              path: path12.relative(cwd, target).replace(/\\/g, "/"),
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
      } catch (err) {
        return toolError(err);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/core/theme.ts
import { readdir as readdir3, readFile as readFile11 } from "fs/promises";
import path13 from "path";
async function listThemes(packageRoot, designSystem) {
  const root = path13.join(packageRoot, "skills", "ppt-maker", "reference", "design_system");
  const out = [];
  const families = await readdir3(root, { withFileTypes: true }).catch(() => []);
  for (const family of families) {
    if (!family.isDirectory()) continue;
    if (designSystem !== void 0 && family.name !== designSystem) continue;
    const familyDir = path13.join(root, family.name);
    const themes = await readdir3(familyDir, { withFileTypes: true }).catch(() => []);
    for (const entry of themes) {
      if (!entry.isDirectory()) continue;
      const designFile = path13.join(familyDir, entry.name, "design.md");
      let name2 = null;
      try {
        const text = await readFile11(designFile, "utf8");
        const heading = /^#\s+(.+)$/m.exec(text);
        name2 = heading ? heading[1].trim() : null;
      } catch {
        continue;
      }
      out.push({
        designSystem: family.name,
        theme: entry.name,
        name: name2,
        path: path13.relative(packageRoot, designFile).replace(/\\/g, "/")
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
      } catch (err) {
        return toolError(err);
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
      } catch (err) {
        return toolError(err);
      }
    }
  });
  return typeof off === "function" ? off : void 0;
}

// src/index.ts
var name = "dsh-ppt-maker";
var inject = ["tools", "sessions", "skills", "llm", "attachments", "webServer"];
var SKILL_DIR = path14.join(PACKAGE_ROOT, "skills", "ppt-maker");
var SKILL_FILE = path14.join(SKILL_DIR, "SKILL.md");
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
    const routesUrl = pathToFileURL(path14.join(PACKAGE_ROOT, "plugin", "host", "routes.mjs")).href;
    const storeUrl = pathToFileURL(path14.join(PACKAGE_ROOT, "plugin", "host", "store.mjs")).href;
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
    }).catch((err) => {
      ctx.logger?.warn?.(`[dsh-ppt-maker] webServer \u8DEF\u7531\u6CE8\u518C\u5931\u8D25: ${err.message}`);
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
  if (!ctx.skills || !existsSync(SKILL_FILE)) return () => {
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
  } catch (err) {
    ctx.logger?.warn?.(`[dsh-ppt-maker] could not register the skill: ${err.message}`);
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
      } catch (err) {
        ctx.logger?.warn?.(`[dsh-ppt-maker] tool registration failed: ${err.message}`);
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
  }).catch((err) => {
    ctx.logger?.warn?.(`[dsh-ppt-maker] host store \u88C5\u8F7D\u5931\u8D25: ${err.message}`);
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
