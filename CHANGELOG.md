# Changelog

本项目的更改记录在此文件。

All notable changes to this project are documented in this file.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.2] - 2026-11-24

### 新增

- **`export.transitionMs` 调整转场时长。** 毫秒数（1–60000），对所有 deck 级转场生效。

### 变更

- **默认转场改为平滑，平滑 2 秒、其余 0.7 秒。**

### Added

- **`export.transitionMs` sets the transition duration.** Milliseconds (1–60000), applied to every deck-level transition.

### Changed

- **The default transition is now Morph, at 2 seconds; the others run 0.7 seconds.**

## [2.0.1] - 2026-11-24

### 变更

- **默认页面转场改为平滑（`morph`）。** `export.transition` 的默认值与新建工程写入的值由 `fade` 改为 `morph`，导出写成 `<p159:morph option="byObject"/>`：相邻页保留同名元素时做位移与缩放动画，不识别平滑的软件回退为淡入淡出；`fade`、`auto`、`none` 仍可显式选用。

### 修复

- **插件安装不再被构建脚本拦截。** 依赖的 `@deepseek-ai/libreoffice-kit` 固定为 0.1.2：0.2.x 起新增的 `koffi` 带安装脚本，pnpm 默认拒绝执行，`dsh plugin add` 以 `ERR_PNPM_IGNORED_BUILDS` 失败，用户需手动放行；0.1.2 没有该依赖，安装不需要任何额外声明。

### Changed

- **The default page transition is now Morph (`morph`).** The default of `export.transition` and the value written into new projects change from `fade` to `morph`. The export writes `<p159:morph option="byObject"/>`, which animates movement and scaling between same-named objects on adjacent pages and falls back to a fade in software that does not know Morph; `fade`, `auto` and `none` stay selectable.

### Fixed

- **Installing the plugin is no longer blocked by a build script.** `@deepseek-ai/libreoffice-kit` is pinned to 0.1.2: from 0.2.x it pulls in `koffi`, which has an install script that pnpm refuses to run by default, so `dsh plugin add` failed with `ERR_PNPM_IGNORED_BUILDS` and the user had to allow the build by hand. 0.1.2 has no such dependency, so installation needs no extra declaration.
## [2.0.0] - 2026-11-23

### 更新说明

2.0.0 采用 PPTD `schema: 2`；`docs/pptd-spec.md` 提供全量自包含的工程格式与工作流规格，工具链对不支持的 schema 返回 `UnsupportedSchemaError` 及迁移指引。

### 新增

- **SVG 页面轨**：`.page` 支持 `pageType: svg`，整页 SVG 经 vendored 转换器编译为原生 DrawingML（文本框/自选图形，PowerPoint 内可逐元素编辑），与普通页统一构建、质检与导出。新增 `ppt_svg` 工具（put / compile，工具总数 12 个）与 `ppt_edit` 的 `update_svg_source` 操作；编译产物按 SVG 内容 + 转换器版本 + 主题哈希缓存；源页导入主画布时统一页面尺寸与坐标单位，无换行文本保持单行。转换器来自 ppt-master（MIT，Copyright (c) 2025-2026 Hugo He），Python 环境由 `scripts/prepare-vendor-env.mjs` 一键准备。
- **母版与版式**：`deck.masters` 声明真实 OOXML 母版/版式（共享装饰图形 + 占位框），页以 `layoutRef: {name}` 挂接；挂不存在的版式名返回 `UnknownLayoutError`（spec §3.4）。
- **图表**：`chart` 元素支持散点、气泡（每系列独立 x / y / size 列，可按列值分组成系列）、雷达（`areaColor: false` 画轮廓）与 K 线（`candlestick`，有无 `open` 分别写开高低收与高低收），图例按 `legend` 写出；支持横向条形图（`yAxis.type: "category"`）、堆叠、数值标签、坐标轴开关与空值；图表容器、系列与饼切片支持图案填充（`PatternFill`），绘图区位置写 `plotLayout`，饼 / 环形图支持 `innerRadius`、`startAngle` 与逐点标签 `dataLabels.points`。
- **逆向保真**：导入时原始 .pptx 存档至 `source/original.pptx`；导出以源存档为骨架，内容未变的页原样沿用（SmartArt、OLE 等未映射对象随之保留），改过的页按 PPTD 重建并挂回源版式，页上未映射对象按占位位置从源存档拷回原件，主题与母版来自源文件（spec §10.4）。媒体海报帧、嵌入对象替代图等预览图随占位导入，工作台据此显示。
- **逆向映射**：源文件的组合关系记入元素 `group` 并在重建页按原层级还原（spec §6.0）；原生条形、柱形、折线、面积、饼图、环形图、散点、气泡、雷达与股价图逆向为可编辑的 PPTD chart，系列色、逐点色、图案填充、绘图区位置与逐点标签按源文件解析（spec §10.5）；带绘图缓存的 SmartArt 展开为一组可编辑形状（spec §10.6）；文字渐变、文字描边、文字阴影与形状、背景的图案填充按原样导入导出（`content.gradient`、`content.outline`、`content.shadow`、`PatternFill`）。
- **PDF 导出**：`ppt_export` 传 `pdf` 时同时导出 PDF。
- **工作台**：SVG 页整页真实预览；table、chart 元素用 DOM / SVG 直渲，支持柱、折线、面积、饼 / 环形图、散点、气泡、雷达、K 线与图案填充；版本历史显示可读的编辑说明；README 预览由正式 client 组件与真实 PPTD 数据直接生成。
- **质量门**：文字溢出按工程实际字体的真实字形宽度量测（fontkit 量测器，解析失败自动回退启发式）；对比度判定细化到逐 run 文字颜色；`ppt_render` 结果列出每页预览图的绝对路径，供 `read_image` 看图；质检落账记录页面覆盖，未覆盖全页的落账不能放行整份导出（`QaCoverageIncomplete`）。
- **统一发布管线**：`src/core/release/` 收口模型导出与面板导出——QA 指纹门禁（deck + pages + media + 检查器版本 + SVG 转换器版本）→ 构建 + 字体嵌入 → postflight 回读（ZIP 重解析 + 库级校验）→ SHA-256 落账。面板导出在质检落账缺失、只覆盖部分页或已过期时就地跑全页规则质检，有阻断才以 409 `QaBlocked` 拦下并列出问题；导出文件命名为 `<工程目录名>-r<修订>.pptx`，落在工程 `export/` 下。
- **主题可执行化**：30 个设计系统主题各配机器可读 `theme.yml`（颜色/字体），`ppt_create` 选定主题后真实写入 `deck.theme`。
- **内置技能重写**：`skills/ppt-maker/SKILL.md` 按「定方向 → 建页 → 看渲染图改稿 → 质检 → 导出」组织，增加审稿自问角度与一次写对的字段要点。

### 变更

- `docs/pptd-spec.md` 重写为全量自包含规格（§0–§11 + 附录 A/B），不再承继上游快照。
- 写操作一律必带 `baseRevision`：`ppt_edit`、`ppt_undo`、`ppt_redo`、`ppt_svg` 挂页，以及面板的撤销、重做与历史恢复；基线过期返回 409 `RevisionMismatch` 并附最新 revision。
- 元素字段按规格校验：text 需 `content.text`，shape 需 `shapeName`，line 需 `viewBox` 与 `points`，`fill` 需对象，表格行列比例之和为 1，图表数据按 spec §11.6 的九个错误码校验。文本、备注、标题等字面字段按原文处理，`$` 引用只在样式字段解析。
- 面板路由：同源判定要求 Origin 与 Host 同主机（局域网地址可用）；`/ppt-maker/api/*` 的所有请求先经 `ctx.connection.requestRejection` 完成宿主统一访问检查，401/403 在路由解析、会话工作目录解析与请求体读取之前结束；内部错误统一返回 500 且不回显路径，缺失文件返回 404；SVG 媒体响应带 `nosniff` 与沙箱 CSP。
- `ppt_check` 结果标明质检覆盖页；校验阻断的错误消息直接列出前 5 条问题。字体嵌入幂等且产物字节确定，`check:build` 按内容哈希比对 `lib/` 产物。

### 移除

- `skills/ppt-maker/reference/pptd.md`（增量承继的上游快照）：全部条款已内化进 `docs/pptd-spec.md`。
- 1.x PPTD 工程格式支持：协议直接换代到 `schema: 2`，不含旧格式兼容层。
- `customFonts` 字段：字体文件放工程 `assets/fonts/`，写了 `customFonts` 返回 `SchemaError`。
- 逆向导入写入的 `page.title`。

### 修复

- `ppt_render` 与面板的 PPTX 预览统一经 PDF 渲染，按请求 DPI 输出完整画布，Windows 显示缩放（如 125%）下不再放大裁切。
- `ppt_import` 对缺失或空白 `source` 返回可序列化的 `InvalidArgument`；同页重复 `shapeId` 生成唯一元素 ID 并保持占位、报告与动画引用一致；`transition.effect` 为 `none` 时省略页面转场，点击动画映射为 `onClick`（[#13](https://github.com/OMSociety/dsh-ppt-maker/issues/13)）。
- 逆向导入：非文本框形状内的文字拆为形状加叠放文本并记入降级报告；`normAutofit` 缩放计入字号与行距；连接线按实际端点、翻转与箭头导入；合并单元格的覆盖格省略；图片按真实格式保存扩展名；组合内的形状只导入一次。
- 导出：元素 `opacity` 写入实色与渐变填充、实色描边、图片和文字透明度，无法写入时给出警告；表格跳过旋转并警告；文本元素 `content.align` 的水平对齐写入 PPTX；自定义形状路径支持 `S`、`Q`、`A` 指令。
- 原生表格挂「无样式、无网格」表格样式，单元格边框逐边显式写出（未写的边按规格默认黑色 1px，`null` 为无线），WPS 与 PowerPoint 不再叠加内置样式的白色网格线；单元格未写 `align` 时按规格默认 `[center, middle]` 写入垂直居中；表格末行未单独设置样式时继续应用 `bodyStyles`。
- 质检：对比度在元素无填充时回落到页面背景；`fontEmbed: off` 时许可证检查不误报；字形量测按实际字重注册字体。
- 工作台：外部改动与冲突横幅按当前工程重新加载；导出不推进编辑基线；重做后刷新撤销状态；请求超时给出提示；带属性的富文本往返保真，超链接安全渲染，脚本类标签连同内容剔除；版本历史只显示最后一次请求的预览；抽屉支持焦点管理与 Esc；画布元素可键盘操作并带无障碍标签；最后一页不可删且删除前确认；越界元素给出提示；缩略图文字对齐与画布一致；表格按逐边边框渲染；工程读取失败时显示错误；画布缩放与位置对齐到设备像素，贴边色块边缘不再透出底色细线。
- `ppt_open` 与 `ppt_import` 在面板桥晚于工具就绪时仍能发出打开请求；`ppt_open` 无面板桥时如实说明未发出请求；`ppt_patch` 报告保留与丢失的部件数。

### Added

- **SVG page track**: `.page` supports `pageType: svg`; the vendored converter compiles each full-page SVG into native DrawingML (text boxes and shapes, editable element by element in PowerPoint), with the same build, quality-check, and export pipeline as native pages. The `ppt_svg` tool (put / compile; 12 tools in total) and the `update_svg_source` operation in `ppt_edit` are new; compiled artifacts are cached by SVG content + converter version + theme hash; source pages imported into the main canvas share its page size and coordinate units, and non-wrapping text stays on one line. The converter comes from ppt-master (MIT, Copyright (c) 2025-2026 Hugo He), and `scripts/prepare-vendor-env.mjs` prepares its Python environment.
- **Masters and layouts**: `deck.masters` declares real OOXML masters/layouts (shared decorative shapes + placeholder frames), and pages attach through `layoutRef: {name}`; unknown layout names return `UnknownLayoutError` (spec §3.4).
- **Charts**: `chart` elements support scatter and bubble (per-series x / y / size columns, groupable by a column value), radar (`areaColor: false` draws an outline) and candlestick (with or without `open`, written as open-high-low-close or high-low-close), with legends following `legend`; horizontal bars (`yAxis.type: "category"`), stacking, value labels, axis switches, and null values; pattern fills (`PatternFill`) on chart containers, series, and pie slices; `plotLayout` for plot-area placement; and `innerRadius`, `startAngle`, and per-point labels (`dataLabels.points`) on pie and doughnut charts.
- **Import fidelity**: the original .pptx is archived at `source/original.pptx` during import; export uses that archive as the skeleton, keeping unchanged pages as-is (unmapped objects such as SmartArt and OLE stay intact) and rebuilding edited pages from PPTD on their source layouts while copying unmapped objects back from the archive at their placeholder positions, with theme and masters taken from the source file (spec §10.4). Preview images such as media poster frames and OLE fallback pictures import with the placeholder and show in the workbench.
- **Import mapping**: source groups are recorded in each element's `group` path and rebuilt pages restore the original nesting (spec §6.0); native bar, column, line, area, pie, doughnut, scatter, bubble, radar, and stock charts import as editable PPTD charts, with series colors, per-point colors, pattern fills, plot-area placement, and per-point labels resolved from the source file (spec §10.5); SmartArt graphics with a drawing cache expand into a group of editable shapes (spec §10.6); gradient text, text outlines, text shadows, and pattern fills on shapes and backgrounds round-trip as authored (`content.gradient`, `content.outline`, `content.shadow`, `PatternFill`).
- **PDF export**: `ppt_export` accepts `pdf` to write a PDF alongside the .pptx.
- **Workbench**: full-page SVG previews; direct DOM/SVG rendering for table and chart elements, covering bar, line, area, pie, doughnut, scatter, bubble, radar and candlestick charts with pattern fills; readable edit descriptions in the version history; README previews generated directly from the production client components and real PPTD data.
- **Quality gates**: text overflow is measured with real glyph widths from the project's fonts (fontkit measurer, with heuristic fallback when parsing fails); contrast checks use per-run text colors; `ppt_render` lists the absolute path of every preview image for `read_image`; quality-check records include page coverage, and partial-page checks cannot authorize full-deck export (`QaCoverageIncomplete`).
- **Unified release pipeline**: `src/core/release/` handles both model-driven and panel exports—QA fingerprint gate (deck + pages + media + checker version + SVG converter version) → build + font embedding → postflight readback (ZIP reparse + library validation) → SHA-256 record. Panel export runs a full-deck rule check on the spot when the QA record is missing, partial, or stale, and only a blocker stops it with 409 `QaBlocked` listing the issues; exported files are named `<project folder>-r<revision>.pptx` under the project's `export/`.
- **Executable themes**: each of the 30 design-system themes has a machine-readable `theme.yml` (colors/fonts), and `ppt_create` writes the selected theme into `deck.theme`.
- **Rewritten built-in skill**: `skills/ppt-maker/SKILL.md` follows direction → building pages → reviewing rendered images → quality check → export, with self-review questions for design and field-level guidance for getting pages right the first time.

### Changed

- `docs/pptd-spec.md` is now a complete, self-contained specification (§0–§11 + appendices A/B) rather than an extension of an upstream snapshot.
- Every write requires `baseRevision`: `ppt_edit`, `ppt_undo`, `ppt_redo`, `ppt_svg` page attachment, and the panel's undo, redo, and history restore; a stale baseline returns 409 `RevisionMismatch` with the latest revision.
- Element fields are validated against the spec: text needs `content.text`, shape needs `shapeName`, line needs `viewBox` and `points`, `fill` must be an object, table row/column ratios sum to 1, and chart data is checked with the nine error codes in spec §11.6. Literal fields such as text, notes, and titles are taken verbatim; `$` references resolve only in style fields.
- Panel routes: same-origin checks require Origin and Host to name the same host (LAN addresses work); every `/ppt-maker/api/*` request first passes through `ctx.connection.requestRejection` for unified host access checks, with 401/403 responses ending before route parsing, session working-directory resolution, and request-body reading; internal errors return 500 without echoing paths, missing files return 404, and SVG media responses carry `nosniff` and a sandbox CSP.
- `ppt_check` results state which pages were checked; validation-blocker messages list the first five issues. Font embedding is idempotent with byte-deterministic output, and `check:build` compares `lib/` artifacts by content hash.

### Removed

- `skills/ppt-maker/reference/pptd.md` (the incremental upstream snapshot): all clauses are incorporated into `docs/pptd-spec.md`.
- Support for the 1.x PPTD project format: the protocol moves directly to `schema: 2` without a legacy compatibility layer.
- The `customFonts` field: font files go in the project's `assets/fonts/`, and `customFonts` returns `SchemaError`.
- `page.title` written by import.

### Fixed

- `ppt_render` and the panel render PPTX previews through PDF at the requested DPI with the full canvas preserved, so Windows display scaling (for example 125%) no longer enlarges and crops them.
- `ppt_import` returns a serializable `InvalidArgument` for a missing or blank `source`; duplicate `shapeId` values on one page produce unique element IDs while preserving placeholder, report, and animation references; `transition.effect` set to `none` omits the page transition, and click animations map to `onClick` ([#13](https://github.com/OMSociety/dsh-ppt-maker/issues/13)).
- Import: text inside non-text-box shapes is split into a shape plus an overlaid text element and recorded as degraded; `normAutofit` scaling is applied to font size and line spacing; connectors import with their real endpoints, flips, and arrows; covered cells of merged ranges are omitted; images keep an extension matching their real format; shapes inside groups are imported once.
- Export: element `opacity` is written to solid and gradient fills, solid strokes, images, and text, with a warning where it cannot be written; tables skip rotation with a warning; horizontal alignment from a text element's `content.align` is written to PPTX; custom shape paths support the `S`, `Q`, and `A` commands.
- Native tables use the "No Style, No Grid" table style and write every cell border side explicitly (unwritten sides take the spec default of 1px black, `null` means no line), so WPS and PowerPoint no longer add the built-in style's white grid lines; cells without `align` take the spec default `[center, middle]`, including vertical centering; the last table row continues to use `bodyStyles` when it has no dedicated style.
- Quality checks: contrast falls back to the page background when an element has no fill; license checks no longer misfire with `fontEmbed: off`; glyph measurement registers fonts by actual weight.
- Workbench: external-change and conflict banners reload the current project; export leaves the edit baseline unchanged; redo refreshes undo state; request timeouts show a message; rich text with attributes round-trips intact, links render safely, and script-like tags are dropped with their content; version history shows only the latest requested preview; drawers manage focus and close on Esc; canvas elements are keyboard-operable with accessible labels; the last page cannot be deleted and deletion asks for confirmation; out-of-canvas elements show a notice; thumbnail text alignment matches the canvas; tables render per-edge borders; project read failures show an error; the canvas scale and position snap to device pixels, so edge-to-edge blocks no longer show a thin line of the background color.
- `ppt_open` and `ppt_import` send open requests even when the panel bridge becomes ready after the tools; without a panel bridge `ppt_open` states that no request was sent; `ppt_patch` reports kept and lost part counts.

## [1.0.1] - 2026-11-02

### 新增

- `tests/corpus/` 随仓库分发 20 份脱敏 pptx；干净克隆可直接运行 25 个语料用例。
- `scripts/desensitize-corpus.mjs`：语料脱敏（地点、日期、届次换成占位），带 `--check` 复查模式。
- `THIRD_PARTY_NOTICES.md`：列出内联进 `lib/index.js` 的第三方代码及其许可。
- `.github/workflows/ci.yml`：安装、类型检查、挂载核对、构建漂移核对与轻量单测。

### 变更

- `package-lock.json` 的解析地址统一到 `registry.npmjs.org`（原混有 38 条镜像地址，npm 12 默认拒绝从非 registry 主机取包，`npm ci` 直接失败）。
- `allowScripts` 按包名放行 `esbuild`，不再钉死已被上游抬走的 `0.27.7`。
- `dsh.manifestVersion` 补为 `1`。

### 修复

- 干净克隆上 `npm ci` 因镜像地址失败的问题。

### Added

- `tests/corpus/` ships 20 desensitized pptx files with the repository; a clean clone can run all 25 corpus cases directly.
- `scripts/desensitize-corpus.mjs` desensitizes the corpus (locations, dates, and edition numbers replaced with placeholders) and provides a `--check` verification mode.
- `THIRD_PARTY_NOTICES.md` lists third-party code bundled into `lib/index.js` and its licenses.
- `.github/workflows/ci.yml` runs installation, type checking, mount verification, build-drift verification, and lightweight unit tests.

### Changed

- Resolution URLs in `package-lock.json` now consistently use `registry.npmjs.org` (previously mixed with 38 mirror URLs; npm 12 rejects fetching from non-registry hosts by default, causing `npm ci` to fail).
- `allowScripts` permits `esbuild` by package name instead of pinning the superseded upstream version `0.27.7`.
- `dsh.manifestVersion` is set to `1`.

### Fixed

- `npm ci` failures caused by mirror URLs in clean clones.
