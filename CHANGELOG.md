# Changelog

本项目的更改记录在此文件。

All notable changes to this project are documented in this file.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-18

### 更新说明

2.0.0 采用 PPTD `schema: 2`；`docs/pptd-spec.md` 提供全量自包含的工程格式与工作流规格，工具链对不支持的 schema 返回 `UnsupportedSchemaError` 及迁移指引。

### Added

- **规划契约**：工程内 `brief.md`（需求：用途/受众/核心信息）与 `plan.yml`（页面规划：页文件/标题/轨道/意图）成为一等产物；新增 `ppt_plan` 工具（get / setBrief / setPlan），`ppt_edit` 新增 `update_plan` 操作。
- **SVG 页面轨**：`.page` 支持 `pageType: svg`，整页 SVG 经 vendored 转换器编译为原生 DrawingML（文本框/自选图形，PowerPoint 内可逐元素编辑），与普通页统一构建、统一质检、统一导出。新增 `ppt_svg` 工具（put / compile），`ppt_edit` 新增 `update_svg_source` 操作；编译产物按 SVG 内容 + 转换器版本 + 主题哈希缓存。转换器来自 ppt-master（MIT，Copyright (c) 2025-2026 Hugo He），Python 环境由 `scripts/prepare-vendor-env.mjs` 一键准备。
- **母版与版式**：`deck.masters` 声明真实 OOXML 母版/版式（共享装饰图形 + 占位框），页以 `layoutRef: {name}` 挂接；挂不存在的版式名会被 `UnknownLayoutError` 拦下（spec §3.5）。
- **工作台**：SVG 页整页真实预览；table/chart 元素 DOM/SVG 直渲；规划抽屉（brief + plan 只读视图）；README 预览由正式 client 组件与真实 PPTD 数据直接生成。
- **逆向保真**：导入时原始 .pptx 存档至 `source/original.pptx`；自导入后零编辑的 deck 导出时整份从源存档逐页恢复（chart/SmartArt/连接器等对象随源存档保留），任何内容编辑即整份回退 PPTD 重建（spec §10.4）。
- **质量门**：文字溢出按工程实际字体的真实字形宽度量测（fontkit 量测器，解析失败自动回退启发式）；对比度判定细化到逐 run 文字颜色；`ppt_render` 在宿主支持时随结果直接返回图片内容块；质检落账记录页面覆盖，未覆盖全页的落账不能放行整份导出（`QaCoverageIncomplete`）。
- **统一发布管线**：`src/core/release/` 收口模型导出与面板导出——QA 指纹门禁（deck + pages + plan + media + 检查器版本 + SVG 转换器版本）→ 构建 + 字体嵌入 → postflight 回读（ZIP 重解析 + 库级校验）→ SHA-256 落账。
- **主题可执行化**：30 个设计系统主题各配机器可读 `theme.yml`（颜色/字体），`ppt_create` 选定主题后真实写入 `deck.theme`。

### Changed

- 工具表面从 11 个扩展到 13 个（新增 `ppt_plan`、`ppt_svg`）。
- `docs/pptd-spec.md` 重写为全量自包含规格（§0–§11 + 附录 A/B），不再承继上游快照。

### Removed

- `skills/ppt-maker/reference/pptd.md`（增量承继的上游快照）：全部条款已内化进 `docs/pptd-spec.md`。
- 1.x PPTD 工程格式支持：协议直接换代到 `schema: 2`，不含旧格式兼容层。

### Fixed

- 工作台按 PPTD 顶层的 `data` / `series` / `rows` 渲染 chart/table；SVG 页在缩略图与画布中直渲；PPTX 预览统一经 PDF 渲染，按请求 DPI 输出完整画布。
- SVG 源页导入主画布时统一页面尺寸与坐标单位；无换行文本在 LibreOffice 与 PDF 渲染中保持单行。
- `ppt_import` 对缺失或空白 `source` 返回可序列化的 `InvalidArgument`；同页重复 `shapeId` 生成唯一元素 ID 并保持占位、报告与动画引用一致；`transition.effect` 为 `none` 时省略页面转场，点击动画映射为 `onClick`（#13）。
- 原生横向柱图按类目轴交换数据通道，堆叠、系列配色、数值标签、坐标轴开关与空值在工作台和 PPTX 导出中保持一致；表格末行未单独设置样式时继续应用 `bodyStyles`。

## [1.0.1] - 2026-11-02

### Added

- `tests/corpus/` 随仓库分发 20 份脱敏 pptx；干净克隆可直接运行 25 个语料用例。
- `scripts/desensitize-corpus.mjs`：语料脱敏（地点、日期、届次换成占位），带 `--check` 复查模式。
- `THIRD_PARTY_NOTICES.md`：列出内联进 `lib/index.js` 的第三方代码及其许可。
- `.github/workflows/ci.yml`：安装、类型检查、挂载核对、构建漂移核对与轻量单测。

### Changed

- `package-lock.json` 的解析地址统一到 `registry.npmjs.org`（原混有 38 条镜像地址，npm 12 默认拒绝从非 registry 主机取包，`npm ci` 直接失败）。
- `allowScripts` 按包名放行 `esbuild`，不再钉死已被上游抬走的 `0.27.7`。
- `dsh.manifestVersion` 补为 `1`。

### Fixed

- 干净克隆上 `npm ci` 因镜像地址失败的问题。