---
name: ppt-maker
description: 生成/编辑/逆向/导出 PPT 与演示文稿。工具优先：用插件注册的十一个 ppt_* 工具完成创建/编辑/撤销/重做/渲染/质检/导出，以及把既有 .pptx 逆向成 PPTD 工程或外科手术式轻改（引擎 @office-kit/pptx，本地纯 TS 构建最终 pptx）；Python 脚本（pptd_to_pptx.py 等）是逃生舱，只在库拒收的破损文件上启用。内置学术/咨询/金融/促销/工作等设计系统。当用户要求 PPT、PowerPoint、PPTX、幻灯片、演示文稿、答辩/汇报/讲义、信息图、海报，或要求套用设计风格、转换 .pptd/.pptx 时使用。
---

# ppt-maker：PPT 生成与本地导出

用 PPTD（YAML 中间格式，单页自包含）写 deck，**工具层直接产出最终 .pptx**。

## 工具优先

做 PPT 一律先走工具，不要手写脚本调库。十一个工具（全部 raw JSON-Schema 注册，参数里有 `dir` 的都是工程目录，相对会话 cwd）：

| 工具 | 干什么 | 关键返回 |
|---|---|---|
| `ppt_create` | 新建工程 | `{ok, manifest:{revision:0,...}}` |
| `ppt_themes` | 列设计系统/主题 | `{ok, themes:[...]}` |
| `ppt_edit` | 原子编辑（ops 数组批量） | `{ok, revision, appliedOps, warnings}` |
| `ppt_undo` / `ppt_redo` | 撤销/重做（游标移动，append-only 快照） | `{ok, revision}` |
| `ppt_render` | 渲染每页 PNG 预览（libreoffice-kit 光栅化最终 pptx） | `{ok, images:[{page,path}]}` |
| `ppt_check` | 质检（规则层默认跑；`ai:true` 追加 AI 视觉质检） | `{ok, pass, issues:[...]}` |
| `ppt_export` | 导出 .pptx（规则质检 blocker 会拦住，`skipCheck:true` 绕过） | `{ok, path, revision, check}` |
| `ppt_import` | 把既有 .pptx 逆向成 PPTD 工程（`mode:'full'`；`surgical` 只回提示不建工程） | `{ok, dir, report}` |
| `ppt_patch` | 对 .pptx 外科手术式轻改（改字/换图/调页序），库不建模的部件原样保留 | `{ok, path, lostParts}` |
| `ppt_open` | 用右侧栏工作台打开一个工程（只登记打开请求，不改工程） | `{ok}` |

**质检分两层**：规则层（文字溢出/出界/重叠/对比度/结构/缺字体）是阻断式，blocker 不修掉就不给导出；AI 层（`ppt_check` 传 `ai: true`）只出建议不阻断——把最终渲染页 PNG 送当前路由的多模态模型看配色/层级/平衡。路由不支持图像输入时，AI 层降级为返回 PNG 路径清单 + 版式指标摘要，由你（主模型）自行 `read_image` 复核。

## 交付产物（默认必须齐备）

1. **可编辑 PPTD 工程目录**：`deck.pptd` + `pages/*.page` + `media/` + `manifest.json`（账本）+ `.history/`（快照）；
2. **本地生成的 `.pptx`**（`ppt_export` 产物）。

## 工作流

### 一、需求确认（先问清，别猜）

| 维度 | 取值 |
|---|---|
| 目的 | 新建 / 编辑现有 PPT / 从图片·PDF·大纲复刻 |
| 设计方向 | 自定 / 指定设计系统 / 套模板 / 风格迁移 |
| 输入 | 仅主题 / 完整文档 / 逐页大纲 |
| 页数 | 用户指定优先；只给文档时先给页数估算并确认 |

- 先读完用户上传的全部文件与 URL。PPTD 的格式约束读 `docs/pptd-spec.md`（仓库内）；上游继承字段的细则读 `reference/pptd.md`。
- 内容不足以撑满演示时，先用检索补充材料（除非用户明确说不扩展）。
- 需求冲突或无法判定时**先问用户**：调用 `ask_user_question` 把冲突项摆成选项（推荐项放首位并加 `(Recommended)`），一次一问；不要自行脑补。

### 二、用工具建工程

1. `ppt_themes` 看有哪些设计系统（学术/咨询/金融/促销/工作），用户指定了就用指定族，没指定就按场景挑一个；自定风格不要硬套预设。
2. `ppt_create` 建工程（给 `dir`/`title`/`designSystem`/`theme`），拿回 `manifest.revision`（乐观锁的基准）。
3. `ppt_edit` 批量加页加元素：一次调用发一串 ops（`add_page` / `add_element` / `update_element` / …），原子生效。**每次都要带上一次的 `baseRevision`**，返回 409 就是游标过期，重新读再改。
4. 改错了用 `ppt_undo` / `ppt_redo`（合并窗内的连续编辑算一步）。

### 三、生成内容的纪律

- **新建**：按场景读 `reference/slides_categories.md` 对应场景的规范；指定设计系统时只读该主题（`reference/design_system/<族>/<子风格>/design.md`），**严禁混搭**。
- **海报/信息图**：单页、强视觉的交付先读 `reference/general-poster.md`，按其中的画布比例与质量基线设计，不套普通内容页模板。
- **复刻**（图片/PDF → PPTD）：尽量 1:1。看不清的位置用网格线、放大观察；照片/头像这类无法用图形近似的，存 `media/` 后作为图片元素插入。
- **编辑现有 PPT**：既有 .pptx 走 `ppt_import`（全量逆向成 PPTD 工程，改完再 `ppt_export`）或 `ppt_patch`（只改字/换图/调页序，不逆向你没动的东西）；已在 PPTD 工程里的直接 `ppt_edit`。
- **版式纪律**：多页 deck 避免版式雷同——同一套「三张等宽卡片」不要页页复用，按内容换用非对称两栏、Zig-Zag 交错、整幅图配文字条、时间轴等；层级用字重与色彩对比控制，不靠超大字号撑场面。
- **语体纪律**：少用抽象套话与 AI 腔（"闭环/赋能/解构/主战场/看似…实则…/不是 A 而是 B"），以事实和证据说话。

**配图纪律**

1. 优先级：用户材料 → 官方/权威来源 → 检索到的相关图 → 生成图。
2. 涉及产品、人物、地点、事件、界面、实验对象时优先用真实图片。
3. 先批量备好图再按比例排版；存 `media/`，**严禁拉伸变形**。
4. 不放与页面结论无关的凑数图。

### 四、校验（导出前必做）

1. **规则质检**：`ppt_check`（默认全页）。blocker（文字溢出/出界/结构坏）必须修；warning（重叠/对比度/缺字体）逐条过目。
2. **视觉 QA**：`ppt_render` 出每页 PNG（最终 pptx 光栅化，所见即所得），逐页核对：图片清晰不变形、文字未压住关键画面、元素未越界、文字与背景对比足够、对齐/间距/字号层级统一。可疑页 `read_image` 全分辨率确认后再改，改完重跑直到全部通过。
3. **AI 深检（按需）**：`ppt_check` 传 `ai: true`。路由不支持图像时会降级成 PNG 路径清单 + 版式摘要，由你自行 `read_image` 完成视觉复核。

### 五、导出与交付

`ppt_export` 落盘最终 .pptx（默认先跑规则质检，blocker 拦下；`skipCheck: true` 可绕过但不建议）。成功后摘要在 `manifest.exportReport` 落账。

### 字体嵌入（本地 TS 链路原生，默认开启）

导出时自动把 deck 实际用到的字体嵌入 .pptx（`ppt/fonts/*.fntdata` + `embeddedFontLst`，EOT 封装），目标机未装字体也能正确渲染。

- **三档模式**（`deck.pptd` 的 `export.fontEmbed`）：`subset`（默认，只嵌用到的字符，体积小；他人在 PowerPoint 里新增未覆盖字符会豆腐块，与 PowerPoint 官方默认一致）、`full`（整字体嵌入，可自由编辑，体积大）、`off`（不嵌入）。
- **许可闸**：逐字体读 OS/2.fsType——Restricted / BitmapOnly 跳过并在摘要给出警告；Preview & Print 嵌入但目标机只读；No Subset 强制整字体。`ppt_check` 会提前列出每款字体的许可判定与缺失替代建议，不动导出也可见。
- **授权口径**：嵌入即随文件再分发，字体授权责任在用户侧；内置设计系统推荐的免费商用字体（MiSans / 思源系 / 阿里妈妈系 / 站酷 / LXGW 等）一般可嵌，一律以运行时实测 fsType 为准。
- **淡入淡出**：`export.transition`（默认 `fade`）页面级转场、`export.animations`（默认 `auto`）按 `.page` 的 `animations` 字段写入元素入场动画，均与既有导出语义一致。

- **交付清单**：给出绝对路径的可点击链接——工程目录、`.pptd`、`pages/`、`media/`、`.pptx`；结尾补一句后续操作提示。
- **手动微调**：直接改 `.page` / `.pptd` 文件，然后 `ppt_render` 复核 + `ppt_export` 重出（工具层会发现磁盘内容与账本不一致并给 warning）。

### 六、Python 逃生舱（默认不启用）

`scripts/` 下的 Python 脚本（`pptd_to_pptx.py` / `pptd_to_png.py` / `check_fonts.py`）是**逃生舱**：只在引擎库拒收的破损文件、或工具层明确覆盖不了的边角场景启用。常规创建/编辑/导出**不要走这条路**（本地轨道对表格/图表/动画的支持是真子集，会打 `dropped` 降级清单）。运行依赖 pip 包 `PyYAML` / `Pillow` / `python-pptx`（按脚本取用），缺包时先装齐再跑。

## 动画与备注

默认**不加**（阅读/自学/打印/发送类 deck 不需要）。用户明确要求或确属现场演示时才加，每页 1~3 组，优先 fade/fly/zoom；`notes` 同理。动画词表 95 个、转场 42 个的速查见 `reference/animation-tokens.md`；完整规范与易混淆 token 辨析见 `docs/pptd-spec.md` 附录 A/B（仓库内）。
