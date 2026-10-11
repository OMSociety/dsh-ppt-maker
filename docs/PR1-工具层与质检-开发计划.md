# PR 1：工具层 + 规则质检 开发计划

> 本文档 = 子代理初版计划 + 盘问决策 + 三方审查修正的最终收敛。前置阅读：ROADMAP.md。

## 0. 范围与前置

- **开工即改名**：package.json name → dsh-ppt-maker；plugin/index.mjs 的 name 常量与 `skills/kimi-ppt` 硬编码路径、cordis.patch.yml 的 name 断言、README 路径串、locale 同步改；技能 key 换新（不再叫 kimi-ppt）。提醒用户同步 ~/.dsh/AGENTS.md 路由表。
- peerDeps 收窄 `>=0.2.0-rc.2 <0.3.0-0`；顺手加 `"engines": {"dsh": ">=0.2.0-rc.2 <0.3.0-0"}`（声明性）。
- 引擎 pin `@office-kit/pptx@0.24.0`（不是 0.21.0；0.24.0 动画 95 preset、转场含 morph）。
- D0 spike 已完成才可正式开工（字体嵌入双机实测 / L1 passthrough 比对 / libreoffice-kit 出图冒烟）。

## 1. 目录结构

```
dsh-ppt-maker/
├── package.json            # name=dsh-ppt-maker，deps: @office-kit/pptx@0.24.0 pin、yaml、fflate、@xmldom/xmldom
├── plugin/index.mjs        # 薄壳：import ../lib/index.js
├── src/
│   ├── index.ts            # apply(ctx)，inject=['webServer','sessions','tools','skills']（llm/attachments 见 §6）
│   ├── tools/              # create.ts themes.ts edit.ts undo.ts redo.ts render.ts check.ts export.ts import.ts（import 属 PR2 但接口在 PR1 冻结）
│   ├── core/
│   │   ├── pptd/schema.ts  # PPTD v3 类型定义（自家契约）
│   │   ├── pptd/parse.ts   # YAML→AST（yaml 包）
│   │   ├── engine/         # 引擎接口层：PPTD 不暴露库 API（换引擎保险）
│   │   │   ├── types.ts    # 引擎接口定义
│   │   │   └── officekit.ts# @office-kit/pptx 实现
│   │   ├── project/store.ts    # 工程读写（manifest.json 单一写者）
│   │   ├── project/history.ts  # 修订号 + 快照（append-only + 游标，见 §4）
│   │   └── review/         # 规则质检（见 §6）
│   └── py/escape-hatch.ts  # Python 逃生舱封装（破损文件用，默认不启用）
├── lib/                    # 构建产物（tsup/esbuild 单文件 ESM），必须提交
└── tests/                  # vitest
```

## 2. 工具清单（raw JSON-Schema，ctx.tools.register）

| 工具 | 职责 | 关键参数 | 返回要点 |
|---|---|---|---|
| `ppt_create` | 新建工程 | dir/title/size/designSystem/theme | {ok, manifest:{revision:0,...}} |
| `ppt_themes` | 列设计系统 | designSystem? | {themes:[...]} |
| `ppt_edit` | 原子编辑 | dir + ops[]（add_page/remove_page/move_page/update_page/add_element/update_element/remove_element/page_add/page_delete/page_duplicate） | {ok, revision, appliedOps, warnings} |
| `ppt_undo` | 撤销 | dir, steps≤20 | {ok, revision, undoneOps} |
| `ppt_redo` | 重做 | dir, steps | 同上（PR1 就定型 redo，不留到 PR2） |
| `ppt_render` | 渲染预览 | dir, pages? | {ok, images:[{page,path}]}（libreoffice-kit 渲染成品页 PNG） |
| `ppt_check` | 质检 | dir, pages?, ai?（默认 false） | {ok, pass, issues:[{page,severity,category,elementId,description,suggestion}]} |
| `ppt_export` | 导出 pptx | dir, out, skipCheck? | {ok, path, revision, check:{pass,blockerCount}} |

规格冻结项（PR2/PR3 依赖）：op 数组形态、revision 字段、.history 结构、`baseRevision mismatch → 409` 乐观锁语义——PR1 冻结后不改。

## 3. 磁盘格式

```
<dir>/deck.pptd      # v3 清单
     manifest.json   # {revision, createdAt, designSystem, theme, checksum}（工具层独占写）
     pages/*.page    # 单页 YAML
     media/          # 素材
     .history/       # 快照（见 §4）
     import.report.yml  # 逆向报告（PR2 产物）
```

## 4. 修订号与快照（append-only + 游标模型）

- **模型**：.history/ 是 append-only 日志（r0001, r0002, ...），manifest.revision 是游标。**不做 LIFO 弹栈**——redo 天然成立（游标前移），PR2 不返工。
- **快照内容**：deck.pptd + pages/ 全量 + meta.json（op 摘要、时间戳）；**assets 按内容哈希去重**（media/.objects/<sha1>，快照只存引用清单）；**不存 pptx 字节**（嵌入字体后每版 10–20MB，pptx 永远是派生物）。
- **三条细则**：① 合并窗口——同会话 N 秒内微小编辑合并一条快照，防 20 上限被瞬间打满；② 第 0 号创建快照不驱逐；③ 恢复时校验 media 哈希清单，缺失报警而非静默坏图。
- 上限 20 条，超出删最旧（锚点保护除外）。
- 并发：按 dir 加互斥锁（Map<dir, Promise 链>）。

## 5. 引擎接口层（风控三件套之一）

- `engine/types.ts` 定义引擎接口（createSlide/addText/addShape/addImage/addTable/addChart/setTransition/setAnimation/save...），PPTD AST 与库 API 之间完全隔离。
- `engine/officekit.ts` 是唯一 import @office-kit/pptx 的文件。换回 python-pptx/PptxGenJS 时只动这一个文件。
- **一致性测试**：20 份真实语料（D0 后采集）双向对拍——PPTD→pptx→loadPresentation→断言关键字段，进 CI。
- 能力兜底：库不支持的特性收集进 warnings 返回，不静默丢。

## 6. 质检（规则为主 + AI 按需）

**规则层（阻断式，默认跑）**，弹药全部实测存在：
- 文字溢出：`@office-kit/pptx-preview` 的 `auditTextLayout`
- 出界：`findShapesOutsideCanvas`；重叠：`findOverlappingShapePairs`
- 对比度：`resolveDeckBodyTextColor` + `getShapeFillColorResolved`，对比度公式自算
- 缺字体：宿主 `libreoffice-kit` 的 `missingFonts` 诊断
- 整体健全：`validatePresentation`

**AI 层（按需，ai:true 才跑）**：
- 通路已实测确认（DSH 域审查）：`inject` 加 `llm` + `attachments`；`ctx.llm.stream({provider, model, messages})`；provider/model 从 `session.requestHeader().config` 取；视觉能力用 `ctx.llm.resolveModelInfo(provider,model).inputModalities?.includes('image')` 门控；图片先 `ctx.attachments.saveImages` 入附件库拿 ImageAttachmentRef（**不能直接塞 base64**）。
- 截图源 = libreoffice-kit 渲染的成品页 PNG（**不是** Pillow 中间格式模拟图——质检的对象永远是最终 pptx）。
- 路由不支持视觉时降级：布局数据文本核对 + 让主模型自己 `read_image`（结果文本给路径）。
- AI 层只出建议不阻断；规则层 blocker 才阻断导出（skipCheck 可绕过）。

## 7. cwd 与安全

- cwd 获取：`exec.agent.session.id` → `ctx.sessions.get(id).header.cwd`；缺 cwd 给可读报错，**不回落 process.cwd()**。
- dir 参数必须 resolve 在会话 cwd 内（store.ts 统一校验，安全红线）。

## 8. 测试

- vitest 单测：parse/schema、引擎映射（mock 库）、store/history（含合并窗口/锚点保护/哈希校验/undo-redo 游标）。
- 金样：fixtures 经 TS 链路导出 pptx，解包 OOXML 断言关键节点。
- 语料对拍：20 份真实 pptx round-trip（§5）。
- e2e：内存 ctx stub 注册全部工具，create→edit×3→undo→redo→render→check→export 全链。
- 质检：mock LLM 返回固定 JSON，测解析/校验/报告落盘；模态门控分支。

## 9. 实施步骤

1. D0 spike 通过 + 改名（package.json/plugin/cordis.patch.yml/locale/README）+ 构建骨架（无依赖）
2. pptd/schema.ts + parse.ts（PPTD v3）
3. engine/ 接口层 + officekit 实现（text/shape/image/bg 最小集）
4. project/store.ts + history.ts（append-only + 游标 + 哈希去重 + 三细则）
5. ppt_create/ppt_themes/ppt_edit/ppt_undo/ppt_redo（工程闭环）
6. ppt_render（libreoffice-kit）+ ppt_export（引擎 save）
7. 规则质检 + ppt_check；AI 层（llm/attachments 通路，spike 先行）
8. e2e + 语料对拍 + SKILL.md（新技能 key，「工具优先」指引）+ README/CHANGELOG
9. 打包验证：check-mounts 清零、lib/ 提交、peerDeps 两闸、dsh plugin add 装载实测

## 10. 风险与开放问题

- ~~LLM 通路~~：已确认可行（见 §6）， spike 收敛为「resolveModelInfo 门控 + read_image 兜底」半日验证。
- 富文本折叠（规格 1.2 六级优先级链）实现复杂，需逐条对测。
- libreoffice-kit 是 MPL-2.0：调用其 CLI/API 合规（不链改源码），README 注明。
- skills/kimi-ppt/ 目录改名后，Python 逃生舱脚本路径同步改。
