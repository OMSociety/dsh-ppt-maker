# Changelog

本项目的更改记录在此文件。

All notable changes to this project are documented in this file.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-16

首个发布版。项目重写为 `dsh-ppt-maker`，与旧作 `dsh-kimi-ppt` 无兼容承诺；PPTD 契约自主维护、不跟踪上游。宿主契约：`peerDependencies` 要求 DSH `>=0.2.0-rc.2 <0.3.0-0`；`ppt_render` 与质检 PNG 硬依赖 `@deepseek-ai/libreoffice-kit@0.1.2`（约 183MB/平台，随包安装）。字体嵌入的端到端冒烟需要一份可用的系统 TTF（默认 `simhei.ttf`，可用 `PPT_TEST_FONT` 指定），未找到时该用例显式跳过，不影响产物功能。

First release. Rewritten as `dsh-ppt-maker` with no compatibility promise to its predecessor `dsh-kimi-ppt`; the PPTD contract is self-maintained and does not track upstream. Host contract: `peerDependencies` require DSH `>=0.2.0-rc.2 <0.3.0-0`; `ppt_render` and QA PNGs hard-depend on `@deepseek-ai/libreoffice-kit@0.1.2` (~183MB per platform, installed with the package). The font-embedding end-to-end smoke needs an available system TTF (default `simhei.ttf`, overridable with `PPT_TEST_FONT`); it skips explicitly when none is found, with no effect on the shipped functionality.

### 新增

- **十一个 `ppt_*` 工具**（raw JSON-Schema 注册，引擎 `@office-kit/pptx@0.24.0` 本地纯 TS 直出最终 .pptx）：`ppt_create` / `ppt_themes` / `ppt_edit`（ops 批量 + baseRevision 乐观锁）/ `ppt_undo` / `ppt_redo` / `ppt_render` / `ppt_check` / `ppt_export` / `ppt_import` / `ppt_open` / `ppt_patch`。
- **PPTD 契约**（`deck.pptd` + `pages/*.page` 的 YAML DSL）：单页自包含、可视即所得；双方言（`generate` 生成 / `reverse` 逆向超集）；格式身份由必填结构字段承担，无版本字段。
- **右侧栏三栏工作台**：缩略图 + 画布 + 属性面板，PPTD 页 AST 直接渲染为 DOM（矢量、秒出、与选择框同坐标系）；双击就地改文字、拖拽调页序、图片一键替换、撤销/重做、版本历史（画布直渲预览任意快照并一键恢复）、409 冲突提示与「外部已修改」横幅；导出成功在页脚挂「打开方式」菜单（系统关联应用 + 显示文件位置）。
- **双向性**：`ppt_import` 把既有 .pptx 全量逆向成 PPTD 工程（图表/SmartArt/OLE 等未建模部件自动落灰底占位，dropped/degraded 两级报告）；`ppt_patch` 外科手术式轻改（改字/换图/调页序）不走 PPTD 往返，库级 L1 passthrough 保住未建模部件。
- **质检分层**：规则层（文字溢出/出界/重叠/对比度/结构健全/缺字体）阻断式，blocker 拦导出；AI 层按需（`ppt_check ai:true`）把最终渲染页 PNG 送多模态模型，只出建议不阻断；结果落账 `manifest.qaReport` 随 revision 可追溯。
- **字体嵌入**：导出自动嵌入实际用到的字体（EOT 封装 `fntdata` + `embeddedFontLst`）；子集/整字体/关闭三档（`export.fontEmbed`）；逐字体 OS/2.fsType 许可闸（Restricted/BitmapOnly 跳过并警告、Preview&Print 只读、No Subset 强制整字体）；`ppt_check` 预检许可与替代建议。
- **转场与动画**：页面级转场（`export.transition`：`fade` 默认 / `none` / `auto` 策展轮换 fade→push→wipe）与元素入场动画（`export.animations`，95 种 preset 词表），本地链路原生写出。
- **修订与快照**：`manifest.json` 单一写者 + append-only 快照（游标模型，undo/redo 天然成立）+ baseRevision 乐观锁（409）。
- **设计系统**：内置学术 / 咨询 / 金融 / 促销 / 工作五族预设主题（`skills/ppt-maker/reference/design_system/<族>/<子风格>/design.md`），`ppt_themes` 列举。
- **Python 逃生舱**（默认不启用）：`skills/ppt-maker/scripts/` 的 `pptd_to_pptx.py` / `pptd_to_png.py` / `check_fonts.py`，只在引擎库拒收的破损文件等边角场景启用；常规创建/编辑/导出不走这条路。

### Added

- Eleven `ppt_*` tools (raw JSON-Schema, engine `@office-kit/pptx@0.24.0`, local pure-TS build of the final .pptx): create / themes / edit (op batches with a baseRevision optimistic lock) / undo / redo / render / check / export / import / open / patch.
- The PPTD contract (YAML DSL of `deck.pptd` + `pages/*.page`): self-contained pages, WYSIWYG; two dialects (`generate` / `reverse` superset). Format identity is carried by required structural fields; no version field.
- Right-rail three-pane workbench: thumbnail strip + canvas + inspector, rendering the PPTD page AST directly as DOM (vector, instant, same coordinate system as the selection box). Double-click inline text editing, drag to reorder pages, one-click image replacement, undo/redo, version history (canvas-rendered snapshot preview with one-click restore), 409 conflict banner and "externally modified" notice; a successful export pins an "open with" menu (system associations + reveal in folder) in the footer status bar.
- Two-way editing: `ppt_import` reverse-engineers an existing .pptx into a PPTD project (unmodeled parts like charts/SmartArt/OLE fall back to grey placeholders, with a two-level dropped/degraded report); `ppt_patch` surgically edits .pptx (text/image/page-order) without the PPTD round-trip, preserving unmodeled parts via library-level L1 passthrough.
- Layered QA: the rule layer (text overflow / out-of-bounds / overlap / contrast / structure / missing fonts) blocks exports on a blocker; the AI layer (opt-in, `ppt_check ai:true`) sends final rendered PNGs to a multimodal model and only advises. Results are recorded in `manifest.qaReport`, traceable per revision.
- Font embedding: export automatically embeds the fonts actually used (EOT-wrapped `fntdata` + `embeddedFontLst`); three modes via `export.fontEmbed` (subset / full / off); a per-font OS/2.fsType license gate (Restricted/BitmapOnly skipped with a warning, Preview&Print read-only on target, No Subset forces full embedding); `ppt_check` pre-flights licenses and suggests fallbacks.
- Transitions and animations: page-level transitions (`export.transition`: `fade` default / `none` / `auto` curated rotation fade→push→wipe) and element entrance animations (`export.animations`, 95-preset vocabulary), written natively by the local pipeline.
- Revisions and snapshots: `manifest.json` single writer + append-only snapshots (a cursor model that makes undo/redo trivial) + baseRevision optimistic locking (409).
- Design systems: five built-in families (academic / consulting / finance / promotion / work) under `skills/ppt-maker/reference/design_system/`, listed by `ppt_themes`.
- Python escape hatches (off by default): `pptd_to_pptx.py` / `pptd_to_png.py` / `check_fonts.py` under `skills/ppt-maker/scripts/`, reserved for broken files the engine library refuses and similar corners; everyday create/edit/export never takes this path.
