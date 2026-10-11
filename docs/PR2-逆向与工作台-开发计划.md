# PR 2：PPTX 逆向 + 右侧栏工作台 开发计划

> 本文档 = 子代理初版计划 + 盘问决策 + 三方审查修正的最终收敛。前置阅读：ROADMAP.md、PR1 计划（规格冻结项以 PR1 实际代码为准）。

## 1. 逆向架构（全 TS，砍掉 python-pptx 主线）

**分层**：
1. **读取**：`@office-kit/pptx` 的 `loadPresentation` 首遍解析 + 形状遍历族（getShapeKind/getShapeText/getShapeImageBytes/getSlideTables/getSlideCharts/getSlideTransition/getShapeAnimation…）。映射不到的部分用 `readPackagePart`/`getSlideXmlString` 读原 XML 下探（fflate + @xmldom/xmldom，依赖 PR1 已引入的公共层）。
2. **映射**：PresentationData → PPTD v3 AST。逆向方言走**绝对几何超集**（生成语料走设计系统槽位，逆向语料只能走绝对几何——PPTD v3 规格显式定义此超集）。
3. **输出**：deck.pptd + pages/*.page + media/（sha1 去重）+ import.report.yml（两级报告：dropped=元素整体跳过[chart/smartart/group/media/ole/3d]，degraded=元素保留但特性丢失）。
4. **不支持元素插占位提示**（盘问 g12 确认）：在原位置插入占位形状（灰底+「此处原为图表」文字），导入后不丢版面信息。
5. **逃生舱**：库拒收的破损/怪文件退回 python-pptx 路线（py/escape-hatch.ts，默认不启用）。

**python-pptx 的保留角色**：开发期 ground-truth 交叉验证器（对拍用），不进运行时主线。

## 2. 外科手术模式（轻改不走有损逆向）

多数对导入 deck 的诉求是轻改（改字/换图/调页序）——**不走 PPTX→PPTD→重导出**（往返一次 70% 保真×2，用户图表就没了）。正确路径：

```
loadPresentation → 直接 patch 形状文本/图片/页序 → savePresentation
```

库 L1 契约（「Parts it does not model survive the round trip」，CI 用 Open XML SDK Validator + ECMA-376 XSD 把关）保住 SmartArt/OLE/图表。全量逆向 PPTD 只为「remix 进我的设计系统」服务，是 opt-in 高阶动作。

## 3. 工具接口（新增）

```js
// ppt_import —— PPTX → PPTD 工程（全量逆向，opt-in）
{ name:'ppt_import', parameters:{ source, targetDir?, title?, open?=true, mode?:'full'|'surgical' } }
// → { ok, projectDir, pageCount, mediaCount, revision, dropped:[...], degraded:[...] }

// ppt_open —— 工作台打开已有工程/ pptx（surgical 模式）
{ name:'ppt_open', parameters:{ path, mode?:'surgical'|'pptd' } }

// ppt_patch —— 外科手术编辑（不改写整个文件）
{ name:'ppt_patch', parameters:{ source /*.pptx*/, ops[] /*set_text/replace_image/move_page*/, out? } }
```

ppt_open 复用 openRequest 机制：写 per-session 状态，客户端轮询 /state 发现后自动 openTab。

## 4. 工作台（自研完整编辑器——已定案）

> 形态决策史：D0 spike 实测 @office-kit/pptx-editor@0.1.0 可嵌入（esbuild 一次打穿、Shadow DOM 隔离、Chromium 冒烟零报错，报告在 WorkBench/spike-pptx-editor/REPORT.md），且中文界面可通过构建期劫持 ja 通道实现（~2400 条字符串替换）。但用户拍板**自研编辑器**：完全掌控中文、主题、交互。pptx-editor 方案留作后备（若自研超期严重可回退）。

```
client/panel.tsx       顶栏 Toolbar + 三栏（ThumbStrip | Stage | Inspector）
client/ProjectList.tsx 工程卡片列表 + 导入按钮
client/ThumbStrip.tsx  页缩略图竖条：点选、HTML5 拖拽排序、复制/删除/新增
client/Stage.tsx       画布：libreoffice-kit 渲染页 PNG + ElementOverlay
client/ElementOverlay.tsx  透明选择框：单击选中、双击进文字编辑
client/TextEditor.tsx  就地 contentEditable，Ctrl+Enter/失焦提交、Esc 取消
client/Inspector.tsx   属性面板：文字/字号/颜色/对齐/bounds 数值/替换图片
client/Toolbar.tsx     撤销/重做/导出/保存态/冲突提示条
```

**登记**（fishpai 三段式，骨架照抄 D:\WorkSpace\Github\dsh-fishpai\client\index.tsx:147-218）：
- `ctx.inject(['sidebarRightTabs','sidebarRight'], cb)` 内 tabs.register({id, kind:'ppt', priority:'extension', title, guide})
- slots.inject('sidebar.right.pane.tab' / 'sidebar.right.pane.tab.title') 注册 PanelHost / Title
- `sidebarRight.openTab('ppt')` 程序化打开
- 注意 inject 回调异步（cordis 先 await Promise.resolve）
- `dsh.client.inject` 写 `"@deepseek-ai/dsh-client-ui-sidebar-right"`
- bundle：`window.__ModuleLoader__.load({id:'dsh-ppt-maker', factory})`，esbuild 产物 lib/client.js 随包提交；样式只用 --dsw-alias-*（阴影 --dsw-shadow-lv1/2/3）；图标全内联；只 require 9 项平台种子

**per-session store**：Map<sessionId, PptStore>，存 projects/activeKey/manifest/pageCache/currentPage/selection/draft（未提交草稿，防轮询覆盖）/thumbs(?rev=N 缓存击穿)/canUndo/canRedo/saving/conflict/externalChange/lastSeenRevision。草稿与磁盘状态分离：轮询发现 revision 变化时无草稿静默重载、有草稿只亮「外部已修改」提示条（绝不静默覆盖人的手改）。

## 5. 编辑通路

全部编辑收敛一条通路：`POST /ppt-maker/api/edit {sessionId, key, baseRevision, ops[]}`，与 ppt_edit 工具共用 PR1 的 op 应用引擎。面板操作只是构造 op 数组。409 → conflict 态提示刷新。

- 点选编辑文字：双击 → TextEditor → update_element set:{content:{text}}
- 图片替换：file input → POST /media/upload（宿主生成文件名，时间戳+白名单扩展名）→ update_element set:{src}
- 页序拖拽：ThumbStrip HTML5 drag → move_page op
- 撤销/重做：POST /undo /redo → 复用 PR1 append-only 快照 + 游标（PR1 已定型 redo）

## 6. 缩略图与预览

- **缩略图**：libreoffice-kit `renderImages` 渲染成品 pptx 页面 PNG（不是 Pillow 中间格式模拟图）。路由 GET /thumb → PNG；按 (page, revision) 磁盘缓存。
- **LibreOffice 精确预览**（盘问 g13 确认进本 PR）：「精确预览」按钮重新走导出→renderImages 全页，供最终核对。
- Pillow 退出舞台。

## 7. 宿主 API（webServer 路由）

选 webServer 前缀路由（排除 typert RPC——出树解析官方包不可靠 + 二进制载荷不适配；排除纯工具调用——浏览器调不到模型工具）。

路由表：GET /state /project /page /thumb /media；POST /edit /media/upload /undo /redo /export /import /active /tab-opened。

**防护必须自己做（宿主层零防护）**，照抄 fishpai plugin/host/routes.mjs：
- sameOrigin：拒 sec-fetch-site: cross-site、Host 归一后必须环路字面量、拒 Origin:null、Origin.host===Host.host（防 DNS rebinding）
- MAX_BODY 8MB 流式超限回 413；写方法先卡 content-type 含 application/json
- 二进制：res.writeHead(200,{'content-type':mime}); res.end(bytes)

**package.json 三处接线（DSH 域审查挖出的缺口，PR2 必补）**：
- 加 `"dsh": { "client": { "platform": "web" } }` 段
- exports 加 `"./client": "./lib/client.js"`
- files 加 `"lib"`

## 8. 客户端构建

照抄 fishpai scripts/build-client.mjs：esbuild entry client/index.tsx → lib/client.js，format cjs、platform browser、target es2020、jsx automatic、charset utf8；external 含 react 系与 @deepseek-ai/*（守卫）；产物包 __ModuleLoader__。peerDependencies 加 dsh-client-ui-sidebar-right / dsh-client-ui-renderer / dsh-host-webserver / dsh-session / dsh-skill / dsh-tools（>=0.2.0-rc.2 <0.3.0-0）。

守卫测试：种子表逐字核对产物 require；esbuild metafile 核对进产物的只有本仓库 client/ 源码；check:build（git diff --exit-code -- lib/）进 CI；check-mounts.mjs --check error 清零（warn 档含 list/keyed 冲突也不可忽略）。

## 9. 测试

- 逆向：用库在测试内现造 fixture pptx（多段落 run/形状 adjustments/图片 crop/表格合并/连接线）→ 转换 → 断言 PPTD 字段；chart/smartart 断言进 dropped + 占位提示存在；round-trip 对拍。
- 宿主（node --test）：sameOrigin 各分支、413/409/415、/edit op 应用与 revision 推进、undo/redo 游标、/media/upload 白名单上限。
- 客户端：bundle 守卫、store 单测（mock api 时序与冲突态）、check-mounts。
- 端到端手测清单：装 profile → 面板开工程 → 改字 → 换图 → 拖页序 → 撤销重做 → 导出 → PowerPoint/WPS 核对 → 模型侧 ppt_import + ppt_open 自动弹面板。

## 10. 实施步骤

S0 对齐 PR1 冻结项（op 名/revision/.history）→ S1 逆向引擎（loadPresentation 映射层）→ S2 宿主 project store + 只读路由 → S3 ppt_import/ppt_patch/ppt_open + /import → S4 缩略图（libreoffice-kit）→ S5 编辑通路（/edit /undo /redo /export /media/upload）→ S6 客户端骨架三段式（可与 S1–S5 并行）→ S7 ProjectList+ThumbStrip+Stage → S8 TextEditor+Inspector+图片替换 → S9 页序拖拽+页增删+Toolbar+轮询 → S10 测试补齐+bundle 守卫+CI → S11 文档/版本报备。

## 11. 风险

- pptx-editor spike 失败 → 回退完整编辑器，工作量 +2 周（已接受）。
- 逆向长尾（主题色解析失败率、竖排文字、custGeom）→ 两级清单覆盖 + 首轮真实用户 deck 回收映射缺口。
- 大 deck 性能（50+ 页）→ (page,revision) 缓存 + 可视区懒加载。
- 外科手术模式的命中检测（findShapesAtPoint/pointInShape + getShapeBoundsResolved）待 spike 验证细节。
