---
name: ppt-maker
description: 生成/编辑/逆向/导出 PPT 与演示文稿。工具优先：用插件注册的十三个 ppt_* 工具完成创建/编辑/撤销/重做/渲染/质检/导出，以及把既有 .pptx 逆向成 PPTD 工程或外科手术式轻改（引擎 @office-kit/pptx，本地纯 TS 构建最终 pptx）；Python 脚本（pptd_to_pptx.py 等）是逃生舱，只在库拒收的破损文件上启用。内置学术/咨询/金融/促销/工作等设计系统。当用户要求 PPT、PowerPoint、PPTX、幻灯片、演示文稿、答辩/汇报/讲义、信息图、海报，或要求套用设计风格、转换 .pptd/.pptx 时使用。
---

# ppt-maker：PPT 生成与本地导出

用 PPTD（YAML 中间格式，单页自包含）写 deck，**工具层直接产出最终 .pptx**。

## 工具优先

做 PPT 一律先走工具，不要手写脚本调库。十三个工具（全部 raw JSON-Schema 注册，参数里有 `dir` 的都是工程目录，相对会话 cwd）：

| 工具 | 干什么 | 关键返回 |
|---|---|---|
| `ppt_create` | 新建工程 | `{ok, manifest:{revision:0,...}}` |
| `ppt_themes` | 列设计系统/主题 | `{ok, themes:[...]}` |
| `ppt_plan` | 读写规划契约 brief.md / plan.yml（get / setBrief / setPlan） | `{ok, brief?, plan?, issues?, revision?}` |
| `ppt_edit` | 原子编辑（ops 数组批量） | `{ok, revision, appliedOps, warnings}` |
| `ppt_undo` / `ppt_redo` | 撤销/重做（游标移动，append-only 快照；须带 baseRevision） | `{ok, revision}` |
| `ppt_render` | 渲染每页 PNG 预览（libreoffice-kit 光栅化最终 pptx） | `{ok, images:[{page,path,absolutePath}]}` |
| `ppt_check` | 质检（规则层默认跑；`ai:true` 追加 AI 视觉质检） | `{ok, pass, issues:[...]}` |
| `ppt_export` | 导出 .pptx（需质检通过且指纹未过期；`skipCheck:true` 绕过门禁但 postflight 不跳） | `{ok, path, revision, sha256, postflight, check}` |
| `ppt_svg` | SVG 页面轨：写 SVG 源（media/svg/）并挂页，或立即编译早检 | `{ok, ref, compiled?, fonts?}` |
| `ppt_import` | 把既有 .pptx 逆向成 PPTD 工程（`mode:'full'`；`surgical` 只回提示不建工程） | `{ok, dir, report}` |
| `ppt_patch` | 对 .pptx 外科手术式轻改（改字/换图/调页序），库不建模的部件原样保留 | `{ok, path, lostParts}` |
| `ppt_open` | 用右侧栏工作台打开一个工程（只登记打开请求，不改工程） | `{ok}` |

**质检分两层**：规则层（文字溢出/出界/重叠/对比度/结构/缺字体）是阻断式，blocker 不修掉就不给导出；AI 层（`ppt_check` 传 `ai: true`）只出建议不阻断——把最终渲染页 PNG 送当前路由的多模态模型看配色/层级/平衡。路由不支持图像输入时，AI 层降级为返回 PNG 路径清单 + 版式指标摘要，由你（主模型）自行 `read_image` 复核。

**指纹门禁**：`ppt_check` 通过时把「质检那一刻的工程内容指纹」（deck + pages + plan + media + 质检规则版本）写进 `manifest.qaReport`；`ppt_export` 重新计算指纹比对——质检之后工程又有任何改动（编辑、加页、换图）都会判 stale 并拒导出，重新跑一遍 `ppt_check` 即可。这是硬约束：导出的每一份 .pptx 都能回答「它过的是哪一版质检」。

## 交付产物（默认必须齐备）

1. **可编辑 PPTD 工程目录**：`deck.pptd` + `pages/*.page` + `media/` + `brief.md` + `plan.yml` + `manifest.json`（账本）+ `.history/`（快照）；
2. **本地生成的 `.pptx`**（`ppt_export` 产物）。

## 工作流

### 一、需求确认（先问清，别猜）

| 维度 | 取值 |
|---|---|
| 目的 | 新建 / 编辑现有 PPT / 从图片·PDF·大纲复刻 |
| 设计方向 | 自定 / 指定设计系统 / 套模板 / 风格迁移 |
| 输入 | 仅主题 / 完整文档 / 逐页大纲 |
| 页数 | 用户指定优先；只给文档时先给页数估算并确认 |

- 先读完用户上传的全部文件与 URL。PPTD 的格式约束读全量规格 `docs/pptd-spec.md`（插件包根目录；相对本技能目录为 `../../docs/pptd-spec.md`，自包含）。
- 内容不足以撑满演示时，先用检索补充材料（除非用户明确说不扩展）。
- 需求冲突或无法判定时**先问用户**：调用 `ask_user_question` 把冲突项摆成选项（推荐项放首位并加 `(Recommended)`），一次一问；不要自行脑补。

### 二、规划契约（brief + plan，默认路径）

拿到需求后先落两份工程文件，再动手建页：

1. **brief.md**：写在工程目录根（`ppt_create` 之后就有地方放），散文写清 `目的 / 受众 / 核心信息 / 语气 / 形态（deck|poster|infographic）/ 页数`。它是后续所有取舍的依据。
2. **plan.yml**：逐页规划 `{page, title, type: native|svg, intent, module}`，用 `ppt_plan` 的 `setPlan` 写入（校验不过会被拒）。先 `status: draft`，**给用户过目确认后**再 `setPlan` 改成 `status: confirmed`，然后按 plan 建页。plan 与 deck 页表不一致时工具会报 warning——以实际页表为准修正 plan，别放着不管。

**Quick 路径（显式才走）**：用户明确说「直接做 / 不用规划 / 快速出稿」时跳过 plan 确认与 P01–P05 早检，一把做完再整体质检。brief.md 仍要写（三十秒的事），它是质检与改稿的参照。

### 三、用工具建工程

1. `ppt_themes` 看有哪些设计系统（学术/咨询/金融/促销/工作，每项带 `executable` 标记——为 `true` 时 `ppt_create` 会把该主题的主题表（`theme.yml`：colors/textStyles/tableStyles）直接写进 `deck.theme`，页内用 `$key` 引用即可），用户指定了就用指定族，没指定就按场景挑一个；自定风格不要硬套预设。
2. `ppt_create` 建工程（给 `dir`/`title`/`designSystem`/`theme`），拿回 `manifest.revision`（乐观锁的基准）。
3. `ppt_edit` 批量加页加元素：一次调用发一串 ops（`add_page` / `add_element` / `update_element` / …），原子生效。**每次都要带上一次的 `baseRevision`**，返回 409 就是游标过期，重新读再改。
4. 改错了用 `ppt_undo` / `ppt_redo`（合并窗内的连续编辑算一步），同样必须带当前 `baseRevision`；`ppt_plan` 的 `setBrief` / `setPlan` 与 `ppt_svg` 带 `page` 挂页也一样。修订号取上一次写入返回的 `revision`，或 `ppt_plan action:get` 返回的 `revision`。

**P01–P05 早检（默认路径必做）**：页数 ≥ 5 的 deck，先按 plan 做完前 5 页就停下来——`ppt_render` 出这 5 页 PNG，自查后交给用户确认「方向对不对」。确认通过才继续后面页面；要返工也只浪费 5 页。页数 < 5 或 Quick 路径跳过此门。

**SVG 页面轨（整页视觉复杂时启用）**：当一页的设计复杂度超出 PPTD 元素的表达力（精细渐变、自由曲线、多层组合的装饰性版面——典型如封面、章节页、海报式单页），把整页画成一份受约束的 SVG（画布 = deck 尺寸，字体用 deck.theme 里声明过的），然后用 `ppt_svg` 落进工程：

1. `ppt_svg` `action:'put'` 写源到 `media/svg/<name>.svg`，带 `page` 参数时直接挂页（页须先用 `ppt_edit` 建成 `pageType: svg`、`svgSource.ref` 指向该源的空页）；
2. `ppt_svg` `action:'compile'` 立即编译早检（也顺手暖了缓存）；
3. 引擎导出时整页编译为 DrawingML 原生形状并入成品 deck——成品里仍是可选中、可编辑的文本与形状。

SVG 页是整页编译，不拆成 PPTD 元素；页内元素级编辑（`update_element` 等）对它不适用，改源重挂才是正道。编译失败（源缺失/语法不支持/编译器环境缺失）一律报错拒建，不会静默降级成占位页。首次使用若报 `SvgCompilerMissing`，按报错给出的绝对路径跑 `node <插件包根目录>/scripts/prepare-vendor-env.mjs` 建 Python 环境（需 Python 3.10+，约 50MB，默认清华源，可用环境变量 `PIP_INDEX` 换源）。

### 四、生成内容的纪律

- **新建**：按场景读 `reference/slides_categories.md` 对应场景的规范；指定设计系统时只读该主题（`reference/design_system/<族>/<子风格>/design.md`），**严禁混搭**。
- **海报/信息图**：单页、强视觉的交付先读 `reference/general-poster.md`，按其中的画布比例与质量基线设计，不套普通内容页模板。
- **复刻**（图片/PDF → PPTD）：尽量 1:1。看不清的位置用网格线、放大观察；照片/头像这类无法用图形近似的，存 `media/` 后作为图片元素插入。
- **编辑现有 PPT**：既有 .pptx 走 `ppt_import`（全量逆向成 PPTD 工程，改完再 `ppt_export`）或 `ppt_patch`（只改字/换图/调页序，不逆向你没动的东西）；已在 PPTD 工程里的直接 `ppt_edit`。
- **版式纪律**：多页 deck 避免版式雷同——同一套「三张等宽卡片」不要页页复用，按内容换用非对称两栏、Zig-Zag 交错、整幅图配文字条、时间轴等；层级用字重与色彩对比控制，不靠超大字号撑场面。
- **母版与版式（deck.masters）**：多页 deck 的共享装饰（品牌色条、页脚带、固定角标）写进 `deck.masters`（spec §3.5）而不是每页重复——母版声明 `shapes`（shape/text/line），每个 `layouts[]` 给独立 `name`，页用 `layoutRef: {name: "<版式名>"}` 挂接；占位框（`placeholders`）声明 title/body/picture 等位置。页自身的装饰仍写页内 `elements`；`deck.masters` 仅生成方言可用，版式名全 deck 唯一，挂不存在的版式名会被 `UnknownLayoutError` 拦下。
- **语体纪律**：少用抽象套话与 AI 腔（"闭环/赋能/解构/主战场/看似…实则…/不是 A 而是 B"），以事实和证据说话。

**配图纪律**

1. 优先级：用户材料 → 官方/权威来源 → 检索到的相关图 → 生成图。
2. 涉及产品、人物、地点、事件、界面、实验对象时优先用真实图片。
3. 先批量备好图再按比例排版；存 `media/`，**严禁拉伸变形**。
4. 不放与页面结论无关的凑数图。

### 五、校验（导出前必做）

1. **规则质检**：`ppt_check`（默认全页；文字溢出按工程实际字体的真实字形宽度量测，对比度逐 run 判定）。blocker（文字溢出/出界/结构坏）必须修；warning（重叠/对比度/缺字体）逐条过目。**不要只检部分页就导出**——落账带页面覆盖记录，未覆盖全页时 `ppt_export` 会以 `QaCoverageIncomplete` 拒导出。
2. **视觉 QA**：`ppt_render` 出每页 PNG（最终 pptx 光栅化，所见即所得；结果给出每页图片的 absolutePath，对它调 `read_image` 看图），逐页核对：图片清晰不变形、文字未压住关键画面、元素未越界、文字与背景对比足够、对齐/间距/字号层级统一。可疑页放大确认后再改，改完重跑直到全部通过。
3. **AI 深检（按需）**：`ppt_check` 传 `ai: true`。路由不支持图像时会降级成 PNG 路径清单 + 版式摘要，由你自行 `read_image` 完成视觉复核。

### 六、导出与交付

`ppt_export` 落盘最终 .pptx：先过指纹门禁（qaReport 缺失/未过/过期/未覆盖全页都会拒），再构建 + 嵌字体，最后 postflight 回读校验（重新解析成品 ZIP、库级 validate，任何 error 都会拒落盘）。`skipCheck: true` 只绕门禁，postflight 不跳。成功产出带 SHA-256 摘要，随 `manifest.exportReport` 落账——拿到 sha256 就能核对「交付出去的就是通过质检的那一份」。

### 字体嵌入（本地 TS 链路原生，默认开启）

导出时自动把 deck 实际用到的字体嵌入 .pptx（`ppt/fonts/*.fntdata` + `embeddedFontLst`，EOT 封装），目标机未装字体也能正确渲染。

- **三档模式**（`deck.pptd` 的 `export.fontEmbed`）：`subset`（默认，只嵌用到的字符，体积小；他人在 PowerPoint 里新增未覆盖字符会豆腐块，与 PowerPoint 官方默认一致）、`full`（整字体嵌入，可自由编辑，体积大）、`off`（不嵌入）。
- **许可闸**：逐字体读 OS/2.fsType——Restricted / BitmapOnly 跳过并在摘要给出警告；Preview & Print 嵌入但目标机只读；No Subset 强制整字体。`ppt_check` 会提前列出每款字体的许可判定与缺失替代建议，不动导出也可见。
- **授权口径**：嵌入即随文件再分发，字体授权责任在用户侧；内置设计系统推荐的免费商用字体（MiSans / 思源系 / 阿里妈妈系 / 站酷 / LXGW 等）一般可嵌，一律以运行时实测 fsType 为准。
- **淡入淡出**：`export.transition`（默认 `fade`）页面级转场、`export.animations`（默认 `auto`）按 `.page` 的 `animations` 字段写入元素入场动画，均与既有导出语义一致。

- **交付清单**：给出绝对路径的可点击链接——工程目录、`.pptd`、`pages/`、`media/`、`.pptx`；结尾补一句后续操作提示。
- **手动微调**：直接改 `.page` / `.pptd` 文件，然后 `ppt_render` 复核 + `ppt_export` 重出（工具层会发现磁盘内容与账本不一致并给 warning）。

### 七、Python 逃生舱（默认不启用）

`scripts/` 下的 Python 脚本（`pptd_to_pptx.py` / `pptd_to_png.py` / `check_fonts.py`）是**逃生舱**：只在引擎库拒收的破损文件、或工具层明确覆盖不了的边角场景启用。常规创建/编辑/导出**不要走这条路**（本地轨道对表格/图表/动画的支持是真子集，会打 `dropped` 降级清单）。运行依赖 pip 包 `PyYAML` / `Pillow` / `python-pptx`（按脚本取用），缺包时先装齐再跑。

## 动画与备注

默认**不加**（阅读/自学/打印/发送类 deck 不需要）。用户明确要求或确属现场演示时才加，每页 1~3 组，优先 fade/fly/zoom；`notes` 同理。动画词表 95 个、转场 42 个的速查见 `reference/animation-tokens.md`；完整规范与易混淆 token 辨析见 `docs/pptd-spec.md` 附录 A/B（插件包根目录）。
