# Changelog

本项目的更改记录在此文件。

All notable changes to this project are documented in this file.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [未发布]

### 修复

- **P0：插件整体不挂载（全部 `ppt_*` 工具与 webServer 路由消失，技能却注册成功）**：根因是 `src/index.ts` 的 `inject` 把 `llm` / `attachments` 两个插件装载上下文不保证提供的服务写进了声明——Cordis 对注入但缺席的服务会把 `apply()` 无限期挂起且全程静默。`inject` 收窄为 `['tools', 'sessions', 'skills', 'webServer']`（与官方工具包同口径）；`llm` / `attachments` 改为工具执行时经 `ctx.get()` 懒取（dsh-config-manager 同款纪律），缺席时 AI 质检按既有逻辑显式降级。回归测试锁定：inject 不得含 `llm`/`attachments`；`ctx.get` 在场或缺席都不影响注册。
- **预览渲染：旋转形状被裁成碎片**（`scripts/pptd_to_png.py`）：`Image.rotate(expand=False)` 在原 bounds 内旋转，宽扁条带稍转即被四角裁剪（452×14 转 -22° 只剩中心一截）。改为 `expand=True` 取旋转外接框、按 bounds 中心对齐贴回，与 PPT `rot` 语义一致。
- **预览渲染：文本不受 bounds 宽度约束、超宽互相覆盖**（同文件）：`draw_text` 只按段落断行、从不按宽度折行（`wrap` 字段被无视）。新增贪心折行（逐字试排、优先空格断词、CJK 按字断，spec 默认 `wrap:true` 生效；显式 `wrap:false` 保持原样），垂直居中/底对齐随折行后的实际行高定位。PPTX 导出链（`pptd_to_pptx.py` 原生 `word_wrap`/`rotation`）不受影响，两链不同源。

## [1.0.0] - 2026-10-12

dsh-ppt-maker 重写首发（原 dsh-kimi-ppt 改头换面，版本重启 1.0.0，不考虑旧兼容）。

### 新增

- **工具层（PR1）**：八个 `ppt_*` 工具（raw JSON-Schema 注册）——`ppt_create` / `ppt_themes` / `ppt_edit` / `ppt_undo` / `ppt_redo` / `ppt_render` / `ppt_export` / `ppt_check`。引擎 `@office-kit/pptx@0.24.0` pin，本地纯 TS 直出最终 .pptx；预览 `@office-kit/pptx-preview`，渲染 `@deepseek-ai/libreoffice-kit@0.1.2`。
- **逆向与外科手术（PR2）**：新增 `ppt_import`（PPTX → PPTD v3 全量逆向，`src/core/reverse/`，dropped/degraded 两级报告 + 占位形状落回原位）、`ppt_open`（请求右侧栏打开工程，per-session openRequest，TTL 60s）、`ppt_patch`（对 .pptx 轻改——set_text / replace_image / move_page，不经 PPTD 往返，库 L1 passthrough 保住 SmartArt/OLE/图表）。
- **右侧栏工作台（PR2）**：自研三栏编辑器（缩略图条 + 画布 + 属性面板）：双击就地改字、HTML5 拖拽调页序、复制/删除/新增页、替换图片、撤销/重做、「精确预览」整页重渲；样式只走 `--dsw-alias-*`；产物经 `esbuild` 打成 `lib/client.js`（DSH `__ModuleLoader__` 形态）随包提交。
- **宿主 webServer 路由（PR2）**：`/ppt-maker/api` 前缀（`/state` / `/project` / `/page` / `/thumb` / `/media` / `/edit` / `/media/upload` / `/undo` / `/redo` / `/export` / `/active` / `/tab-opened`），防护口径对齐 fishpai：同源校验（拒 cross-site / 环路字面量 Host / Origin 不匹配/为 null）、8MB 流式 413、写方法 415、ProjectError.status 归一 409/404。
- **PPTD v3 自主契约**：`deck.pptd` + `pages/*.page` 单页自包含；双方言（generate 生成 / reverse 逆向超集）；动画词表 95 / 转场 42 与引擎 d.ts 逐字对拍。
- **引擎接口层**：`engine/types.ts` 定义 DeckEngine 接口，`engine/officekit.ts` 是唯一写入侧 import `@office-kit/pptx` 的文件，`core/reverse/` 是逆向读取侧第二个（且唯一另一个）合法 import 点；富文本编译器 `richtext.ts` 覆盖 p/li/span/strong/em/u/s/sup/sub/a。
- **修订与快照**：manifest.json 单一写者；append-only 快照 + 游标模型（undo/redo 天然成立）；baseRevision 乐观锁 409；合并窗内连续编辑合并一条快照；第 0 号创建快照不驱逐；恢复时 media 哈希校验。
- **规则质检层**：文字溢出（auditTextLayout）、出界、重叠、对比度（WCAG ≥3）、结构健全（validatePresentation）、缺字体（missingFonts 诊断）；blocker 阻断 `ppt_export`（`skipCheck:true` 可绕过）。
- **AI 质检层（PR1-C）**：`ppt_check ai:true` 把 libreoffice-kit 渲染的最终成品页 PNG 经 `ctx.attachments.saveImages` 入库后送当前路由多模态模型（`ctx.llm.stream`），审配色/层级/平衡/图版搭配；只出建议不阻断。路由不支持图像输入（`resolveModelInfo().inputModalities` 不含 image）时降级为 PNG 路径清单 + 版式指标摘要，由主模型自行 `read_image` 复核。
- **语料对拍**：`tests/corpus/` 20 份脱敏 pptx（10 份真实变体 + 10 份合成）→ `loadPresentation` 断言关键字段（页数台账 / 画布尺寸 / 图表与表格计数 / 隐藏页 / 备注 / 脱敏红线抽查），进 CI。
- **字体嵌入（PR3）**：本地导出链路原生嵌入实际用到的字体——`ppt/fonts/*.fntdata`（EOT 0x00020001 封装）+ `[Content_Types]` Override + rels font Relationship + `presentation.xml` 根属性 `embedTrueTypeFonts` 与 `p:embeddedFontLst`（含 panose/charset，插位 notesSz 之后 / defaultTextStyle 之前）。三档模式 `export.fontEmbed`：`subset`（默认，subset-font/HarfBuzz WASM 按 deck 去重字符集 + 保底字符集子集化）、`full`（整字体）、`off`。fsType 许可闸逐 face 判定：Restricted / BitmapOnly 跳过 + 摘要警告，Preview & Print 嵌入 + 只读警告，No Subset 强制整字体；`ppt_check` 新增字体许可预检（不动导出也可见，缺字体给替代建议）。导出摘要与 `manifest.exportReport` 落账嵌入 face 数 / 跳过原因 / 子集前后体积 / 警告列表；注入后自检（部件数 / EOT 头 / rId 双向一致 / embeddedFontLst 插位）失败即导出失败，headless 裁决（t2embed!TTLoadEmbeddedFont）进测试门。
- **转场与动画本地化（PR3）**：页面级淡入淡出转场（`export.transition`，默认 fade）与元素入场动画（`export.animations`，默认 auto 按 `.page` 显式声明，95 种 preset 词表）由本地引擎原生写出，与原桌面增强轨道产物语义逐项对齐。

### 弃用

- 桌面增强轨道（kimi.com 网页编辑器导出，`skills/ppt-maker/scripts/export_pptx.py` / `export_images.py`）：增量能力（字体嵌入 + 淡入淡出）已由本地 TS 链路原生提供，本版起标 deprecated，运行时在 stderr 打印弃用提示，将于下个次版本删除。

### 变更

- 包名 `dsh-kimi-ppt` → `dsh-ppt-maker`；技能 key 同步换新（`skills/ppt-maker`）；`cordis.patch.yml` / locale / README 全部对齐。
- `peerDependencies` 收窄为 `>=0.2.0-rc.2 <0.3.0-0`（放弃 0.1.x），并声明 `engines.dsh` 同区间。
- Python 脚本降级为逃生舱（默认不启用）；桌面增强轨道（字体嵌入/淡入淡出）deprecated，PR3 限期删除。

### 移除

- 对 `kimi.com` / `statics.moonshot.cn` 的主链依赖（桌面增强轨道仍引用，已 deprecated）。

## [1.2.0] - 2026-10-09

### 新增

- 本地导出的图片按 `fit` 规范实现三种模式（`cover` 默认 / `contain` / `fill`）与 `crop` 裁剪：`skills/kimi-ppt/scripts/pptd_to_pptx.py` 写 `a:srcRect`，`skills/kimi-ppt/scripts/pptd_to_png.py` 按同语义渲染。
- 本地导出的 `table` 接入主题样式的最小映射：`style`（`$key` 或内联）与 `cell.textStyle` 解引用 `theme.tableStyles` / `theme.textStyles`，覆盖首行强调、边框、纯色填充、zebra 条纹与字号/色/粗斜/字体族；单元格内联字段优先。
- 两条本地命令结束时向 stderr 打印 `dropped` 降级清单（`dropped: <类型>/<元素>: <原因>`，末行 `dropped total: N`）。
- `skills/kimi-ppt/scripts/check_fonts.py` 枚举已装字体时合并 HKLM 与 HKCU（每用户字体安装落 HKCU），并把实装名匹配收紧到词边界。
- `find_download` 在多个候选共享同一最新时间戳时判定为歧义下载、报错放弃，并只接受严格最新的 `.pptx`。

### 修复

- 本地导出把图片按 `bounds` 拉伸：现按 `fit`（默认 `cover`）等比裁剪或居中留白。
- `line` 元素的 `points` 从 `viewBox` 映射到 `bounds` 并取首末点为端点；PNG 预览的坐标映射补上 `scale`，同一 deck 在不同 `scale` 下形状一致。
- PNG 预览补齐 rotation 绘制与 `custom` 灰描边（与导出一致）；无 `fill` 的 shape 按规范渲染为无填充，两轨口径一致。
- 直角三角形枚举名与文档对齐（`rtTriangle`）。
- 空 `pages` 两条命令一致报错退出；`--help` 不再触发依赖安装副作用；`.preview` 等派生目录不再混入导出载荷；WebSocket 握手异常转为友好报错；清理死代码与失效默认值。

### 变更

- `peerDependencies` 区间改为两段式 `>=0.1.5-rc.2 <0.2.0-0 || >=0.2.0-rc.1 <0.3.0-0`：DSH 安装闸按 `includePrerelease` 判定，包管理器解析 peer 时不带该选项，各预发布元组须单列一段；本版在 DSH 0.2.0-rc.2 上验证。
- `skills/kimi-ppt/SKILL.md` 的本地轨道能力清单与实际行为对齐（含 `dropped` 计数说明）；`README.md` 的安装说明（桌面版在应用内安装）、脚本路径、依赖口径（Chrome 或 Edge、`agent-browser` 自动安装、`statics.moonshot.cn`）与两条轨道表述对齐。
- `skills/kimi-ppt/reference/design_system/` 各 `design.md` 的标题类别词与术语统一；`skills/kimi-ppt/reference/local-fonts.md` 更正字体文件名拼写。
- `CHANGELOG.md` 自 1.1.1 起随 npm 包发布。

### Added

- Local image export now implements the `fit` modes (`cover` default / `contain` / `fill`) and `crop` per the spec: `skills/kimi-ppt/scripts/pptd_to_pptx.py` writes `a:srcRect`, and `skills/kimi-ppt/scripts/pptd_to_png.py` renders the same semantics.
- The local `table` export maps theme styles minimally: `style` (`$key` or inline) and `cell.textStyle` resolve `theme.tableStyles` / `theme.textStyles`, covering header emphasis, borders, solid fills, zebra bands, and size/colour/bold/italic/family; inline cell fields win.
- Both local commands print a `dropped` degradation list to stderr (`dropped: <type>/<element>: <reason>`, ending with `dropped total: N`).
- `skills/kimi-ppt/scripts/check_fonts.py` merges HKLM and HKCU when enumerating installed fonts (per-user installs land in HKCU), and tightens installed-name matching to word boundaries.
- `find_download` reports an ambiguous download and gives up when several candidates share the newest timestamp, and only accepts the strictly newest `.pptx`.

### Fixed

- Local export stretched images to `bounds`; it now crops or letterboxes per `fit` (default `cover`).
- `line` elements map `points` from `viewBox` to `bounds` and use the first/last point as endpoints; the PNG preview now applies the `scale` factor, so one deck renders identically at any scale.
- The PNG preview draws rotation and the `custom` grey outline (matching the export track); shapes without `fill` render unfilled per the spec, consistently across both tracks.
- The right-triangle enum name is aligned with the docs (`rtTriangle`).
- Empty `pages` fails fast on both commands; `--help` no longer triggers dependency installation; derived directories such as `.preview` no longer leak into the export payload; WebSocket handshake errors turn into friendly messages; dead code and stale defaults removed.

### Changed

- The `peerDependencies` range is now two-segment `>=0.1.5-rc.2 <0.2.0-0 || >=0.2.0-rc.1 <0.3.0-0`: the DSH install gate evaluates with `includePrerelease` while package managers do not, so each prerelease tuple needs its own segment; this release is verified on DSH 0.2.0-rc.2.
- `skills/kimi-ppt/SKILL.md`'s local-track capability list is aligned with the actual behaviour (including the `dropped` counter); `README.md` install notes (desktop installs happen in the app), script paths, dependency wording (Chrome or Edge, automatic `agent-browser` install, `statics.moonshot.cn`), and the two-track descriptions are aligned.
- Titles and terminology unified across `skills/kimi-ppt/reference/design_system/` `design.md` files; a font filename typo fixed in `skills/kimi-ppt/reference/local-fonts.md`.
- `CHANGELOG.md` has shipped inside the npm package since 1.1.1.

## [1.1.2] - 2026-10-04

### 新增

- 插件有了自己的图标：包根 `icon.svg`（36×36，橙蓝双卡层叠 + 两道白色文字条），由 `package.json` 顶层 `icon` 字段声明并列入 `files`。插件列表里不再显示 DSH 的默认图形。
- 插件列表里的显示名与描述有了中英两份（`locale/en.json`、`locale/zh.json` 的 `meta.title` 与 `meta.description`），标题中英都写作「Kimi PPT」；`package.json` 的 `exports` 与 `files` 相应放行 `locale/*.json`。此前该处回退成包名与英文 `description`，在中文界面里中英混排。

### Added

- The plugin now ships its own icon: `icon.svg` at the package root (36×36, an orange slide behind a blue one, with two white text bars), declared through the top-level `icon` field in `package.json` and listed in `files`. The plugin list no longer falls back to the default DSH artwork.
- The plugin's display name and description in the plugin list now ship in both languages (`meta.title` and `meta.description` in `locale/en.json` and `locale/zh.json`), titled `Kimi PPT` in both; `exports` and `files` in `package.json` admit `locale/*.json` accordingly. The list previously fell back to the package name and the English `description`, mixing languages inside a Chinese interface.

## [1.1.1] - 2026-09-28

### 修复

- 注册 `kimi-ppt` 技能时补上 `source`，加载该技能不再报 `loaded skill "kimi-ppt" source must be a string`。

### 变更

- 声明宿主依赖区间 `>=0.1.5-rc.2 <0.3.0-0`（`peerDependencies`：`@deepseek-ai/dsh-skill`）。DSH 0.1.7-rc.1 起的兼容闸按该字段逐条判定插件能否在宿主上加载；本插件在 DSH 0.2.0-rc.1 上安装与加载正常。

### Fixed

- Skill registration now passes `source`, so the `kimi-ppt` skill no longer raises `loaded skill "kimi-ppt" source must be a string` when it is loaded.

### Changed

- Declared the host range `>=0.1.5-rc.2 <0.3.0-0` in `peerDependencies` (`@deepseek-ai/dsh-skill`). The compatibility gate in dsh 0.1.7-rc.1 and later checks this field entry by entry to decide whether the plugin may load on the host; this plugin installs and loads normally on dsh 0.2.0-rc.1.

## [1.1.0] - 2026-09-14

### 修复

- `skills/kimi-ppt/scripts/check_fonts.py`：规范名 → 实装名映射表补齐 `思源黑体 CN`；缺失字体没有对应替代建议时，报告不再输出 `替代 None`。
- `skills/kimi-ppt/reference/fonts.md`：`Stylized font` 列取值与字体类型对齐——`阿里妈妈刀隶体`、`阿里妈妈东方大楷`、`站酷文艺体`、`飞波正点体`、`得意黑`、`ZCOOL KuaiLe` 标记为风格化字体（原取值按「有无使用限制」填写，与列名语义相反）。
- `skills/kimi-ppt/scripts/pptd_to_pptx.py`：模块文档字符串与实现对齐——`table` 已支持，`icon` / `chart` 静默跳过，`image` 需本地文件，未知 `shapeName` 退化为矩形。

### 变更

- `skills/kimi-ppt/SKILL.md` 补齐开箱所需事实：`.pptd` 必须声明 `version: v2`；两条轨道的依赖与边界（Node.js 18+ 含 npm、Chrome 或 Edge、`agent-browser ≥0.33.2` 由脚本经 npm 安装或升级、自动安装范围 `PyYAML` / `Pillow` / `websocket-client`、本地轨道的元素支持为真子集、输出已存在须 `--force`）。
- 预览命令简化为 `python scripts/pptd_to_png.py <deck.pptd>`（缺省输出 `<工程目录>/.preview`），并说明预览不渲染 `table` / `icon` / `chart`；示例占位符统一为 `<工程目录>`。
- 叙述通用化，去掉对特定机器与平台的假设；术语统一为「本地轨道 / 桌面增强轨道」，映射表口径统一为「以 `skills/kimi-ppt/scripts/check_fonts.py` 在本机的输出为准」。
- `skills/kimi-ppt/reference/local-fonts.md`：`精品点阵体`、`LXGW Bright`、`ZCOOL KuaiLe` 独立为「中英混排（Mixed CJK–Latin）」分组，与 `fonts.md` 分组一致；删除与 `skills/kimi-ppt/SKILL.md` 重复的规则声明，并标注映射表为常见实装名参考。
- `skills/kimi-ppt/reference/slides_categories.md`：用法说明由三条列表合并为一句，章节编号统一为 `1.` / `2.`。

### 移除

- `skills/kimi-ppt/SKILL.md` 的本地编辑器入口 `npx open-kimi-ppt-skill serve`：上游 npm 包 `open-kimi-ppt-skill` 已于 2026-08-07 下架，该入口不可用；手动编辑统一为「改 `.page` → `skills/kimi-ppt/scripts/pptd_to_png.py` 预览 → 重导出」。

### Fixed

- `skills/kimi-ppt/scripts/check_fonts.py`: the canonical name to installed name mapping table now includes `思源黑体 CN`; when a missing font has no corresponding substitution suggestion, the report no longer prints `替代 None`.
- `skills/kimi-ppt/reference/fonts.md`: the values in the `Stylized font` column are now aligned with the font type — `阿里妈妈刀隶体`, `阿里妈妈东方大楷`, `站酷文艺体`, `飞波正点体`, `得意黑` and `ZCOOL KuaiLe` are marked as stylized fonts (the previous values were filled in by "whether there are usage restrictions", which is the opposite of what the column name means).
- `skills/kimi-ppt/scripts/pptd_to_pptx.py`: the module docstring is now aligned with the implementation — `table` is already supported, `icon` / `chart` are silently skipped, `image` requires a local file, and an unknown `shapeName` degrades to a rectangle.

### Changed

- `skills/kimi-ppt/SKILL.md` now includes the facts needed to get started: a `.pptd` must declare `version: v2`; the dependencies and boundaries of the two tracks (Node.js 18+ with npm, Chrome or Edge, `agent-browser ≥0.33.2` installed or upgraded by the script via npm, the automatic installation scope `PyYAML` / `Pillow` / `websocket-client`, the element support of the local track being a proper subset, and `--force` being required when the output already exists).
- The preview command is simplified to `python scripts/pptd_to_png.py <deck.pptd>` (the default output is `<工程目录>/.preview`), and it is now documented that the preview does not render `table` / `icon` / `chart`; the example placeholder is unified as `<工程目录>`.
- The wording is generalized, removing assumptions about a specific machine and platform; the terminology is unified as "local track / desktop enhancement track", and the mapping table guidance is unified as "based on the output of `skills/kimi-ppt/scripts/check_fonts.py` on the local machine".
- `skills/kimi-ppt/reference/local-fonts.md`: `精品点阵体`, `LXGW Bright` and `ZCOOL KuaiLe` are split out into a "Mixed CJK–Latin" group, consistent with the grouping in `fonts.md`; the rule statements duplicated with `skills/kimi-ppt/SKILL.md` are removed, and the mapping table is annotated as a reference for common installed names.
- `skills/kimi-ppt/reference/slides_categories.md`: the usage notes are merged from three list items into one sentence, and the section numbering is unified as `1.` / `2.`.

### Removed

- The local editor entry point `npx open-kimi-ppt-skill serve` in `skills/kimi-ppt/SKILL.md`: the upstream npm package `open-kimi-ppt-skill` was unpublished on 2026-08-07, so that entry point is unavailable; manual editing is unified as "edit `.page` → preview with `skills/kimi-ppt/scripts/pptd_to_png.py` → re-export".

## [1.0.3] - 2026-09-12

### 变更

- **字体路径动态解析与跨平台健壮性增强**：`skills/kimi-ppt/scripts/check_fonts.py` 与 `skills/kimi-ppt/scripts/pptd_to_png.py` 在 Windows 环境下优先读取 `%SystemRoot%\Fonts` 及当前用户字体目录（`~\AppData\Local\Microsoft\Windows\Fonts`），不再硬编码 `C:\Windows\Fonts`；POSIX 环境增加 `~/.local/share/fonts` 探测支持。
- **脱敏与通用化表述优化**：`skills/kimi-ppt/reference/local-fonts.md` 脱敏「本机」口吻，优化为面向各机型通用实装名称与典型免费商用字体推荐。
- **冗余清理**：清理分发与备份中遗留的 `__pycache__` 编译缓存。

## [1.0.2] - 2026-09-12

### 新增

- **字体解析跨平台**：`skills/kimi-ppt/scripts/check_fonts.py` 与 `skills/kimi-ppt/scripts/pptd_to_png.py` 不再写死 `C:\Windows\Fonts`——Windows 仍读字体注册表，Linux / macOS 改扫系统字体目录（fontconfig / Font Book 常用路径，去掉字重后缀还原族名），并新增系统兜底字体解析（按需选 bold/常规字形），预览渲染在非 Windows 机器上不再因找不到字体而失败。

### 修复

- `skills/kimi-ppt/reference/local-fonts.md` 里的两处失效引用（指向已被中文版 `skills/kimi-ppt/SKILL.md` 删除的旧小节名 `Font availability check`）改为指向现行「三、字体核对（防豆腐块）」。

### 变更

- `skills/kimi-ppt/reference/local-fonts.md` 明确**映射表是某台基准机的快照、不是通用事实**：换机器先跑 `skills/kimi-ppt/scripts/check_fonts.py`，以脚本输出为准；`skills/kimi-ppt/SKILL.md` 相应把「写本机实装名」改为「写目标机的实装名」，并说明字体目录的平台差异。

## [1.0.1] - 2026-09-09

### 变更

- `skills/kimi-ppt/SKILL.md` 由英文叙述改为**中文精炼版**：按「需求确认 → 前置检查 → 字体核对 → 生成 → 校验 → 导出交付」六步重排，篇幅从 217 行压到 116 行，去除与 `skills/kimi-ppt/reference/` 重复的英文长段说明。
- 补齐被原版分散在正文中的关键约束：需求确认四维度表、工程目录布局、复刻/编辑/套模板/风格迁移四类生成策略、配图四条纪律、导出后 CT_Slide 根级 `transition` 校验、动画与备注默认不加。
- 明确**本地轨道为默认**：`skills/kimi-ppt/scripts/pptd_to_pptx.py`（纯本地、离线）优先，`skills/kimi-ppt/scripts/export_pptx.py`（字体嵌入 + 淡入淡出）作为桌面增强轨道，沙箱受限时直接回退、不反复重试。
