---
name: ppt-maker
description: 设计、生成、重做与导出 PPT 演示文稿：从内容出发设计整套页面，成品逐元素可编辑。工具优先：用插件注册的十二个 ppt_* 工具完成创建/编辑/撤销/重做/渲染/质检/导出，以及把既有 .pptx 逆向成 PPTD 工程或外科手术式轻改（引擎 @office-kit/pptx，本地纯 TS 构建最终 pptx，成品逐元素可编辑）；Python 脚本是逃生舱，只在库拒收的破损文件上启用。内置学术/咨询/金融/促销/工作五族共 30 套设计系统。当用户要求 PPT、PowerPoint、PPTX、幻灯片、演示文稿、答辩/汇报/路演/讲义/课件、信息图、海报，或要求套用设计风格、美化或改写已有 PPT、转换 .pptd/.pptx 时使用。只需查看、转换格式或提取一份现成 Office 文件内容、不涉及设计与改稿时，用会话里的通用 Office 能力。
---

# ppt-maker：把内容做成好用、好看、好改的 PPT

你交付的不是「一组填了字的页面」，而是一份**完成度足以直接交付、打开就能接着改**的演示文稿：每页只承载一件事，一眼看出重点，全套视觉像同一个人设计的，导出的 .pptx 里每个字、每个形状都能在 PowerPoint 里直接选中修改。

工作方式只有一条主线：**用 PPTD 写页面 → 用工具渲染出真实成品图 → 亲眼看 → 改 → 质检 → 导出**。PPTD 是 YAML 写的中间格式（`deck.pptd` + 每页一个 `pages/*.page`），完整规格在插件包根目录的 `docs/pptd-spec.md`（相对本技能目录为 `../../docs/pptd-spec.md`）；写不确定的字段先查规格，别凭印象猜。

## 一、工具

十二个工具全部由插件注册，参数里的 `dir` 是工程目录（相对会话工作目录）。做 PPT 一律走工具，不要自己写脚本调库。

| 工具 | 用途 | 关键返回 |
|---|---|---|
| `ppt_themes` | 列出内置设计系统 | `themes[]`，`executable: true` 的主题能直接写入主题表 |
| `ppt_create` | 新建工程 | `manifest.revision`（=0，之后所有写操作的基准） |
| `ppt_edit` | 批量原子编辑（一次一串 ops，任一失败整批不落盘） | `revision`、`warnings` |
| `ppt_undo` / `ppt_redo` | 撤销 / 重做 | `revision` |
| `ppt_svg` | SVG 页面轨：写 SVG 源并挂页，或立即编译早检 | `ref`、`compiled` |
| `ppt_render` | 构建最终 pptx 并光栅化成每页 PNG | `images[].absolutePath` |
| `ppt_check` | 规则质检（`ai: true` 追加 AI 视觉建议） | `pass`、`issues[]` |
| `ppt_export` | 导出 .pptx，可同时出 PDF（质检门禁 + 字体嵌入 + 回读校验） | `path`、`pdf`、`sha256` |
| `ppt_import` | 把既有 .pptx 全量逆向成 PPTD 工程 | `dir`、`report` |
| `ppt_patch` | 对 .pptx 做外科手术式轻改（改字 / 换图 / 调页序） | `path`、`lostParts` |
| `ppt_open` | 在右侧栏「PPT 工作台」打开工程，用户可在里面直接看、点、改 | `requested` |

**乐观锁**：`ppt_edit`、`ppt_undo`、`ppt_redo`、带 `page` 的 `ppt_svg` 都必须带 `baseRevision`，值取**上一次写操作返回的 `revision`**（`ppt_create` 之后是 0）。别自己 +1 推算：30 秒内的连续编辑会合并成一个修订，修订号不一定变。返回 409 说明工程在你之后被改过（多半是用户在工作台里动了手），409 的 `error.detail.expected` 就是当前修订号；先弄清对方改了什么再改，不要盲目重试。

## 二、工作流

### 1. 弄清楚这份 PPT 要做什么

动手前先回答四个问题：**给谁看、看完希望他知道或做什么、只能记住一句话的话是哪句、以什么方式被看到**（投屏、发送阅读、打印、展陈、存档……）。答案会影响信息密度、页数与阅读路径的取舍。

- 先读完用户给的全部文件与链接。材料撑不起页数时先检索补充（用户说不扩展除外）。
- 页数、风格、受众有冲突或说不清时，用 `ask_user_question` 一次问一件事，把推荐项放第一位并标 `(Recommended)`。不要替用户脑补关键取舍。

### 2. 建工程

`ppt_create` 建工程（`dir`、`title`，选了设计系统就带 `designSystem` / `theme`）；改已有的 PPT 见第六节。

### 3. 定视觉方向，再建页

先定一套贯穿全篇的视觉系统，再逐页落地（见第三节）。然后：

- `ppt_edit` 用 `add_page` / `add_element` / `update_element` / `update_page` 批量建页。页面参数写文件相对路径，如 `page: "pages/01.page"`。
- 选了 `executable` 主题时，`deck.theme` 里已有 colors / textStyles / tableStyles，页内用 `$key` 引用（如 `style: "$title"`、`color: "$primary"`），全篇改色只需改主题表。
- 共享装饰（品牌色条、页脚、角标）写进 `deck.masters` 母版与版式（规格 §3.4），页用 `layoutRef` 挂接，不要每页复制一遍。

页数多时，先做出能代表整体风格的几页，`ppt_render` 出图自查；方向拿不准就给用户看一眼再铺开。

### 4. 看图，改到满意

`ppt_render` 渲染的是**最终 pptx 的真实光栅化结果**，不是示意图。对返回的每个 `absolutePath` 调 `read_image` 逐页看，像设计师审稿一样挑毛病：

- 重点是不是一眼就能看到？视线从哪里进、到哪里结束？
- 对齐：同一列元素的左边缘是否真的在一条线上？小图标与旁边文字是否垂直居中？
- 间距是否有节奏（同级间距相等、组间大于组内）？有没有挤在角落或大片无意义的空？
- 文字有没有被裁、压住画面、和背景对比不足？
- 换一页看，配色、字号层级、页边距是否一致？

可疑处放大渲染（`dpi: 288`）再判断。改完重渲，直到你自己愿意把它署上名交出去。

### 5. 质检

`ppt_check` 默认全页规则质检：文字溢出按工程实际字体的真实字形量宽，对比度逐段判定，另查出界、重叠、结构、缺字体。

- **blocker**（溢出 / 出界 / 结构损坏）必须修，否则不能导出。
- **warning** 逐条过目。有意的叠放（文字压在色块上、斜线穿过圆）会报重叠，确认是设计意图即可。
- `ai: true` 追加多模态视觉建议，只出建议不阻断；当前模型路由不支持图像时会降级成 PNG 路径清单，由你自己 `read_image` 复核。
- 只检部分页（带 `pages`）的结果不能放行整份导出。

### 6. 导出与交付

`ppt_export` 先比对质检指纹：质检之后工程有任何改动都会判过期并拒绝，重新跑一遍 `ppt_check` 即可。随后构建、嵌入字体、回读校验（成品 ZIP 重新解析，有错误就拒绝落盘），成功后返回 SHA-256 并写入 `manifest.exportReport`。`skipCheck: true` 只跳过质检门禁，回读校验照跑。用户要 PDF 时传 `pdf: "<路径>.pdf"`，同一次导出会把成品转成 PDF。

用户在工作台里点「导出 .pptx」时，插件会就地补跑全页规则质检，有 blocker 才拦下并列出问题。

交付时给出可点击的绝对路径：工程目录与最终 `.pptx`。需要让用户继续手改时，用 `ppt_open` 把工程打开到右侧栏。

会话里如果还有通用的 Office 工具，可以配合使用：用它们读取或预览用户给的旧格式 `.ppt`、`.odp`，或把导出的 `.pptx` 转成其他格式。读一份现成 PPT 的内容时，先用它们看一遍原稿，再决定用 `ppt_patch` 轻改还是用 `ppt_import` 重做。这些工具是否存在、叫什么名字，以当前会话实际提供的为准。

## 三、怎样做出好看的页

这一节是审稿时可以拿来自问的几个角度，不是规则。用户给了风格、品牌或参考稿，以它们为准；内容本身需要时，任何一条都可以被打破。

**焦点**。这页最想让人看到的是什么？它在画面上是否足够突出，其余元素是在衬托它还是在和它抢？

**形式与信息**。这页的信息更像数量、比例、顺序、对比、层级，还是一段叙述、一种氛围？选中的版式是在表达它，还是只是先有了版式再往里填字？同一个内容往往有好几种表达，值得多试一种再定。

**一致与变化**。翻页时它像不像同一份作品——色彩、字体、边距、页眉页脚是否有一套贯穿的逻辑？与此同时，连续几页是不是在重复同一种排法？

**对齐、间距与层级**。元素的边缘与中线是否有意落在一起，间距是否有节奏，字号、字重、颜色是否让人一眼分出主次？这些毛病很少有人说得出来，但会让人觉得「不舒服」，放大渲染最容易看出来。

**留白与密度**。空白是在托住内容，还是让画面显得没做完？元素是在传达信息，还是在填空？密度和它被看到的方式是否相称？

**语言**。标题和正文是否说的是具体的事实、数字与判断？能更短的地方，是否已经更短？
**参考资料**（按需读，不必全读）：

- 场景规范：`reference/slides_categories.md` 及 `reference/slides_categories/` 下的学术、商业计划、管理汇报、技术工程、教育培训、品牌创意、分析决策七类。
- 设计系统：`reference/design_system/<族>/<主题>/design.md`。用户指定了就以那一套为准；没指定时预设只是起点之一，也可以完全自定风格。
- 海报与信息图：`reference/general-poster.md`，单页强视觉交付按它的画布比例与质量基线做。
- 形状：`reference/shapes.md`（177 个预设形状及调整参数）；字体：`reference/fonts.md`、`reference/local-fonts.md`；动画词表：`reference/animation-tokens.md`。

## 四、一次写对的要点

这些是最常让页面「写了却不显示」或被质检拦下的地方：

- **文本样式写在 `content` 里**：`content: {text, fontSize, color, bold, fontFamily, align, lineHeight, letterSpacing, padding, outline, shadow}`；元素顶层只放 `elementId`、`elementType`、`bounds`、`rotation`、`opacity` 等几何属性。
- **文本框高度给足**：单行高度约为 `fontSize × 1.3`，再留几像素余量；多行按行数乘。框太矮会报溢出 blocker。大字号标题尤其要留够高度。
- **形状不能内嵌文字**：带字的色块 = 一个 `shape` + 一个叠在上面的 `text`。
- **填充写成对象**：`fill: {type: "solid", color: "#d0021b"}`；渐变要 ≥2 个停靠点。写成字符串会被拒。
- **自定义形状**：`shapeName: "custom"` 必须同时给 `viewBox` 与 `path`（支持 `M L H V C S Q A Z`），且 `viewBox` 宽高比等于 `bounds` 宽高比，否则会被拉伸变形。
- **出血效果**：形状超出画布会被判出界。想要「圆被页边裁掉一角」「斜带贯穿到边」的效果，用 `custom` 路径把形状直接画成裁切后的轮廓，`bounds` 保持在画布内。
- **线条**：`line` 必须给 `viewBox` 与 `points`（至少两点）；粗斜线用细长的 `custom` 平行四边形更可控。
- **横向条形图**：`yAxis.type: "category"`，系列的 `encode.x` 指向数值列、`encode.y` 指向类目列。要每个类目一种颜色：每个类目建一个系列、同设 `stack: "value"`，数据行里其他系列的格子留 `null`。关图例用 `legend.show: false`，标数值用 `dataLabels.show: true`。
- **图表填充与逐点标签**：柱、面积、饼的系列填充可写图案；饼图的 `dataLabels.points` 能给单个切片换位置、字号与颜色——把一个点的标签用 `offset` 挪到环中心、其余点 `show: false`，就成了环中央的大字；数字长又离切片远时补 `size: {w, h}` 给足标签框，否则会逐字折行。图表的绘图区位置写 `plotLayout`。
- **表格**：`rows` 是二维数组，`columnWidths`、`rowHeights` 是比例且各自加起来为 1，`rowHeights` 的项数等于行数。只要底部细横线：`border: [null, null, {style: solid, width: 1, color: "#c4bcab"}, null]`（顺序为上、右、下、左）。表格不能旋转。
- **图片**：放进 `media/` 再用相对路径引用；保持原始宽高比，**严禁拉伸变形**。配图优先级：用户材料 → 官方来源 → 检索到的真实图片 → 生成图；不放与页面结论无关的凑数图。

### 更多可用的表达手段

- **组合 `group`**：同一个 `group` 路径的元素导出后在 PowerPoint 里是一个组合，可整体拖动、缩放。写法 `group: ["g-step-1"]`；可嵌套，外层在前：`["g-flow", "g-step-1"]`。适合把总是一起改的元素（图标与标签、色块与上面的数字、流程节点的底框与说明）绑在一起。
- **文本内边距 `content.padding`**：`[上, 右, 下, 左]`（px），默认 `[3.6, 7.2, 3.6, 7.2]`。需要文字与色块边缘、线条或另一列文字严格对齐时设成 `[0, 0, 0, 0]`，再用 `bounds` 精确定位。
- **字间距 `content.letterSpacing` 与分散对齐 `align: "distributed"`**：字间距单位为 pt，可为负；`distributed` 让每行文字撑满框宽。
- **形状调整值 `adjustments`**：控制预设形状的圆角大小、箭杆粗细、弧形起止角度、星形内径等，参数顺序与默认值见 `reference/shapes.md`。成品里用户还能拖黄色手柄继续调。
- **渐变描边 `border.gradient`**：线条与形状轮廓按渐变绘制，停靠点颜色可写 `#RRGGBBAA` 带透明度（如实色渐隐到 `#RRGGBB00`）。
- **图案填充 `fill: {type: "pattern", preset, foreground, background}`**：OOXML 预设图案（斜线、网格、点阵、砖纹等，预设名见规格 §5）。
- **文字渐变、描边与阴影**：`content.gradient`（整段文字共用一个渐变）、`content.outline: {width, color}`、`content.shadow: {blur, color, offset}`。形状、线条与图片的投影写在元素顶层 `shadow`。

## 五、SVG 页面轨

整页的视觉复杂到 PPTD 元素难以表达时（精细渐变、自由曲线、多层叠加的封面或章节页），把这一页画成一份 SVG：

1. 先用 `ppt_edit` 建一页 `pageType: svg`、`svgSource.ref` 指向源文件的空页。
2. `ppt_svg action: put` 把 SVG 写到 `media/svg/<名称>.svg`，带 `page` 直接挂页。
3. `ppt_svg action: compile` 立即编译早检。

SVG 画布用 deck 尺寸（同比例的 `viewBox`），字体用 deck 里声明过的字体。导出时整页编译成 DrawingML 原生形状，成品里的文字和形状依然可选中、可编辑。SVG 页不支持元素级 `update_element`，要改就改源后重新 `put`。编译失败会直接报错，不会悄悄换成占位页。首次使用报 `SvgCompilerMissing` 时，按报错给出的绝对路径运行 `node <插件包根目录>/scripts/prepare-vendor-env.mjs` 建 Python 环境（需 Python 3.10+，约 50MB；默认清华源，可用环境变量 `PIP_INDEX` 换源）。

## 六、改已有的 PPT

- **只改几个字、换张图、调页序**：用 `ppt_patch`。它直接动原文件，不逆向你没碰的部分，SmartArt、嵌入表格等库不建模的部件原样保留。看返回的 `lostParts`，不为 0 时要告诉用户。
- **要大改或重新设计**：用 `ppt_import` 全量逆向成 PPTD 工程，改完再 `ppt_export`。常见的原生图表会变成可编辑的 `chart`，SmartArt 会展开成一组可编辑形状，组合关系记在 `group` 里。导入后先读 `import.report.yml`：`dropped` 是没能转换、原位放了占位的对象（OLE、媒体、三维、少见图表类型等），`degraded` 是转换时有损失的属性（如自动缩字、带字形状被拆成形状加文字、SmartArt 展开后不再自动排版）。把这些如实告诉用户。导出以原文件为骨架：没改的页原样沿用；改过的页按 PPTD 重建，页上的占位会从原文件拷回原件。占位只是原件的替身，不要去编辑它的内容，要改就整个换成你自己画的元素。只改几个字、换张图时，`ppt_patch` 仍然更轻更稳。
- **复刻图片或 PDF**：尽量 1:1。看不清处放大观察；照片、头像等无法用图形近似的内容裁出来存 `media/` 作为图片插入。

## 七、字体嵌入

导出时自动把实际用到的字体嵌入 .pptx，对方电脑没装字体也能正常显示。`deck.pptd` 的 `export.fontEmbed` 有三档：`subset`（默认，只嵌用到的字符；对方新增文字可能缺字）、`full`（整字体嵌入，可自由编辑，体积大）、`off`（不嵌入）。字体文件放在工程的 `assets/fonts/` 下。

嵌入受字体许可约束：禁止嵌入的字体会被跳过并给出警告，`ppt_check` 会提前列出每款字体的判定和替代建议。嵌入意味着随文件分发字体，授权责任在用户；内置设计系统推荐的免费商用字体（思源系、MiSans、阿里妈妈系、站酷、LXGW 等）一般可嵌，以运行时实测结果为准。

## 八、动画与备注

默认不加，用户要求或用于现场演示时再加；动画用来安排信息出现的顺序。页面转场由 `export.transition` 控制（默认 `fade`）。动画词表 95 个、转场 42 个见 `reference/animation-tokens.md`，完整规则见规格附录 A/B。演讲备注写在页的 `notes` 字段，同样按需添加。

## 九、Python 逃生舱

`scripts/` 下的 `pptd_to_pptx.py`、`pptd_to_png.py`、`check_fonts.py` 只用于引擎拒收的破损文件，或工具确实覆盖不了的边角场景。它们对表格、图表、动画只支持一个子集，常规创建、编辑、导出不要走这条路。依赖 `PyYAML`、`Pillow`、`python-pptx`，缺包时先装齐。
