# PPTD 方言规格

PPTD（PPT-DSL，PPT 领域专用描述语言）是 PowerPoint 演示文稿的 YAML 抽象层：用 Agent 友好、单页自包含、人可肉眼审查的方式描述、生成与编辑幻灯片，并与 `.pptx` 双向转换。

本文件是 PPTD（v2，`schema: 2`）的规范性文档（normative document），全量自包含：PPTD 工程结构与双方言的全部约束以本文件为准。

---

## 0. 写法约定

- 结构用 **TS interface** 描述，配**字段表**与**最小 YAML 示例**。
- **默认值**写在 TS 行尾注释 `// 默认: X`；X 可为字面量（`1` / `"rect"` / `[0, 0]`）或描述性短语（`不应用` / `沿继承链回落` / `由引擎按 preset 给出`）。
- **约束**写在 TS 行尾注释或代码块下方，统一用区间/不等式记法（`[0, 1]` / `> 0`）或文字描述。
- **方言归属**：只属于某一方言（dialect）的字段，注释里标 `// 仅逆向方言` 或 `// 仅生成方言`；两方言通用的字段不标。
- **引擎版本锚**：动画与转场词表逐字取自 `@office-kit/pptx@0.24.0` 的类型声明，出处行号在附录 A / 附录 B 标注。PPTD 只暴露**词表**（vocabulary），不暴露引擎 API：引擎更换时由引擎接口层负责词表映射。

---

## 1. 全局约定

### 1.1 语法

- YAML 1.2；
- `: # { }` 等特殊字符须加引号或用块标量（block scalar）；
- `content.text` 这类富字段一律用 `|` 块标量独立成块。

### 1.2 坐标系与单位

- 全部几何与尺寸单位为 **px**，原点 `(0, 0)` 在页面左上角；
- 本规格定义 **1px = 1pt**（`fontSize: 18` 即 PPTX 里的 18pt）；
- 演示文稿默认尺寸 16:9 → `[960, 540]`，4:3 → `[720, 540]`；海报默认尺寸 16:9 → `[1280, 720]`、9:16 → `[720, 1280]`、4:3 → `[1280, 960]`、3:4 → `[960, 1280]`、1:1 → `[1080, 1080]`；
- 元素层叠顺序由 `Page.elements` 数组顺序决定，越靠后层级越高。

逆向方言精度口径：`bounds`、`rotation`、`opacity` 等由 OOXML 单位（EMU / 60000 分之一度）换算而来的值，**保留到小数点后两位**，不做整数取整；换算式 `px = EMU / 12700`（1px = 1pt = 12700 EMU）。

### 1.3 样式优先级与默认值

样式的有效值（effective value）按优先级链解析：链上靠前的来源优先，全部缺省时回落到链尾的默认值。

#### 1.3.1 文本框内文字样式（六级链）

| 优先级（高→低） | 来源 |
|---|---|
| 1 | 富文本语义标签（`<strong>` / `<em>` / `<u>` 等，见 §6.1 富文本规则） |
| 2 | `<span style="...">` 内联样式 |
| 3 | `<p style="...">` 段落样式 |
| 4 | `Text.content` 上直接设置的样式字段（`color` / `fontSize` / `bold` 等） |
| 5 | `Text.content.style` 引用的 `TextStyleConfig`（`$key`） |
| 6 | 默认值（见下表） |

文本默认值表：

| 字段 | 默认值 |
|---|---|
| `color` | `#000000` |
| `fontSize` | `18` |
| `fontFamily` | `MiSans` |
| `bold` | `false` |
| `italic` | `false` |
| `lineHeight` | `1` |
| `letterSpacing` | `0` |
| `marginTop` | `0` |
| `backgroundColor` | 不应用 |

`lineHeight`（倍数）与 `lineHeightPx`（固定 px）互斥、同设时 `lineHeightPx` 优先。

#### 1.3.2 表格单元格样式（九级链）

| 优先级（高→低） | 来源 |
|---|---|
| 1 | 富文本语义标签 |
| 2 | `<span style="...">` 内联样式 |
| 3 | `<p style="...">` 段落样式 |
| 4 | `Cell` 内联字段（`color` / `fill` / `align` 等直接写在 Cell 上） |
| 5 | `Cell.textStyle` 引用的 `TextStyleConfig`（`$key`；仅取文本字段，不含 `fill` / `border` / `align`） |
| 6 | `TableStyleConfig` 的行/列类别样式（`firstRowStyle` / `lastRowStyle` / `firstColumnStyle` / `lastColumnStyle`）：行类别与列类别冲突时按 `rowOverColumn` 裁决，默认 `true` 即行胜 |
| 7 | `TableStyleConfig.bodyStyles`：按数据行（去掉首行后）序号循环应用 |
| 8 | `TableStyleConfig.cellStyle`：整表基线样式 |
| 9 | 默认值（见下表） |

单元格默认值表：

| 字段 | 默认值 |
|---|---|
| `fill` | 不应用（透明） |
| `border` | `{style: solid, width: 1, color: "#000000"}` |
| `align` | `[center, middle]` |
| `fontSize` | 按单元格高度自适应 |
| 文本字段（`color` / `fontFamily` / `bold` / `italic` / `lineHeight` / `letterSpacing` / `marginTop`） | 同 §1.3.1 文本默认值表 |

#### 1.3.3 图表样式

**1. 系列主体色**（`fill` / `lineColor` / `areaColor` 等，按系列类型的主色字段）：

| 优先级（高→低） | 来源 |
|---|---|
| 1 | 系列显式 `fill` / `lineColor` / `areaColor` |
| 2 | `seriesDefaults` 同名字段 |
| 3 | `Theme.colors` 按系列序循环取色 |

例外：`scatter` 的标记色链是 `marker.fill` > `series.fill` > 主题循环——`marker.fill` 优先于 `series.fill`。

**2. 字体**：子组件 `fontFamily`（`title` / `legend` / `dataLabels` / `axis.label` 等各自的 `fontFamily`）> `Chart.fontFamily` > 主题 / 母版字体。

**3. dataLabels**：`series[i].dataLabels` > `Chart.dataLabels` > 不显示；子字段按**一层浅合并**（系列级只覆盖它写出的子字段，未写的从 chart 级回落）。

**4. `seriesDefaults` 合并**：`seriesDefaults` 与各 series 做**一层深合并**——标量字段以系列显式值覆盖；对象字段递归一层浅合并；数组字段整体替换（不逐元素合并）。`seriesDefaults` 内禁止 `type` 与 `encode`；仅对多系列类型生效：`bar` / `line` / `area` / `scatter` / `bubble` / `candlestick` / `radar`。

**5. `boolean | Config` 约定**：值为 `boolean` 或配置对象的字段（`marker` / `legend` / `label` / `axisLine` / `gridLine` / `colorbar` 等）统一遵守：`false` = 关闭；`true` = 以默认配置开启；对象 = 开启并按对象自定义。唯一例外：`scatter.marker` 不能为 `false`（散点必须有标记，见 §6.7）。

**逆向方言不参与优先级链回落**。逆向方言要求样式值在导入时解析为字面量（见 §2.3 R2/R4），因此每个样式位置都有显式值；优先级链只在生成方言（以及逆向工程被改写为生成方言后）发挥回落作用。

### 1.4 工程结构

```
<工程目录>/
  deck.pptd            # 主入口（必需；固定此文件名）
  brief.md             # 散文简报（可选；见 §3.4）
  plan.yml             # 逐页计划（可选；见 §3.4）
  manifest.json        # 工程账本：revision / designSystem / theme / checksum / exportReport（工具层独占写）
  pages/               # 页文件目录，每页一个 .page
    01_cover.page
    02_intro.page
  media/               # 图片等素材（逆向导入按 sha1 去重）
    svg/               # svg 页设计源（见 §4.2）
  .history/            # 修订快照（append-only 日志 + revision 游标）
  import.report.yml    # 逆向导入报告（仅逆向工程；见 §10.3）
```

路径规则：

1. **完全自包含**：所有被引用文件必须位于 `deck.pptd` 所在目录内，禁止引用目录外文件；
2. **只支持相对路径**（相对 `deck.pptd` 所在目录）：`pages/01_cover.page`、`media/image1.jpg`；
3. **素材支持 URL**：`Image.src`、`ImageFill.src` 可为 `https://...`（jpg/jpeg/png/gif）；
4. **主入口必需且文件名固定为 `deck.pptd`**：一切加载必须经 `deck.pptd`，单个 `.page` 不能直接交给转换/校验命令；文件名固定是因为 `manifest.json` 与 `.history/` 需要稳定的工程根锚点。

`brief.md` 与 `plan.yml` 是规划元数据，不是 deck 内容：**二者不参与 undo 快照与 manifest checksum**（见 §3.4）。

### 3.5 母版与版式（deck.masters，仅生成方言）

PPTD 的元素轨（§6）逐页画全部内容；母版/版式轨解决的是另一半诉求：**跨页共享的装饰图形与占位框只画一次**，各页挂版式后自动继承，且 PowerPoint 的「新建幻灯片」能沿用同一套骨架。

deck 级可选字段：

```ts
interface Presentation {
  // ……见 §3.1……
  masters?: MasterSpec[];   // 仅生成方言；缺省 = 引擎默认空白母版（现状行为）
}

interface MasterSpec {
  name: string;                    // 母版名（人读，唯一）
  background?: Background;         // 母版背景（§4.1 同构）
  shapes?: ElementBase[];          // 装饰图形：shape / image / line / text（静态内容）
  layouts: LayoutSpec[];           // 该母版下的版式，至少 1 个
}

interface LayoutSpec {
  name: string;                    // 版式名，页内以它引用（唯一）
  shapes?: ElementBase[];          // 版式级装饰图形（盖在母版装饰之上）
  placeholders?: LayoutPlaceholderSpec[];
}

interface LayoutPlaceholderSpec {
  kind: "title" | "body" | "content" | "picture" | "chart" | "table";
  bounds: [number, number, number, number];   // px，同 §1.2
}
```

页侧挂接：`Page.layoutRef`（§6.8 之外两方言通用）在生成方言里写作 `{ name: "<layout 名>" }`；引擎按 `deck.masters[*].layouts[*].name` 解析，找不到 → blocker `UnknownLayoutError`。

**语义边界**：

- 母版/版式只承载**静态装饰**与**占位框**；页的实际内容仍由 `elements` 逐页给出（PPTD 不做「内容自动填进占位」的隐式匹配）；
- 母版/版式的 `shapes` 不支持动画与转场（动画/转场是页级概念，见 §7 / §8）；
- 逆向方言不写 `masters`：逆向工程用 §10.4 的源存档整页恢复保住原始母版，不重建。

---

## 2. 双方言（two profiles）

PPTD 显式区分两个**方言**（dialect）：同一套 schema 的两个子集/超集约束档，由 deck 级 `profile` 字段声明。

| 方言 | 面向 | 核心特征 |
|---|---|---|
| **生成方言**（generation dialect） | Agent 生成新 deck、人改写 | 设计系统槽位（design-system slots）+ 生成语义（generation semantics）：`$key` 主题引用、`pageType` 语义标签、允许字段省略并由引擎/继承链自适应 |
| **逆向方言**（reverse dialect） | 从既有 `.pptx` 导入 | 绝对几何超集（absolute-geometry superset）：几何与样式一律显式字面量、带溯源字段，容纳从 pptx 读到的一切可映射元素与生成方言不产出的字段 |

### 2.0 schema 版本

deck.pptd 必须有 `schema` 字段声明协议版本：

```ts
interface Presentation {
  schema: number;   // 必填；整数；本规格支持：2
  // 其余字段见 §3.1
}
```

- `schema` 必填、必须是整数、取值必须在支持集 `{2}` 内；
- **schema 闸先于一切其它校验**：`schema` 缺失或为 `null` → blocker `UnsupportedSchemaError`；`schema` 不是整数（字符串、小数、布尔等）→ blocker `SchemaError`；整数值不在支持集 → blocker `UnsupportedSchemaError`。闸未通过即返回，不再级联报后续违规。

### 2.1 profile 字段与判定

```ts
type Profile = "generate" | "reverse";

interface Presentation {
  profile?: Profile;   // 默认 "generate"
  // 其余字段见 §3.1
}
```

判定规则：

1. `profile` 是 deck 级字段，**一个工程只有一个方言**，不允许页级混用；
2. 省略 `profile` 即 `"generate"`；
3. `ppt_import` 全量逆向产出的工程必须写 `profile: reverse`；
4. 校验器（checker）按 `profile` 选择校验档（见 §2.5），两档不通用；
5. 逆向工程被人工改写成生成方言是允许的动作，但必须**整体**改写：把 `profile` 改为 `generate`，同时满足生成方言的全部约束（去掉 `sourceRef` / `builtinStyle` / `placeholder` 等逆向专属字段，颜色改回 `$key` 或字面量），改完由校验器按生成档复验。不支持半逆向半生成的中间态。

### 2.2 生成方言（generation dialect）

**设计系统槽位**：生成方言的第一等公民是 `Theme`（见 §3.3）——`theme.colors` / `theme.textStyles` / `theme.tableStyles` 三张表，页内用 `$<key>` 引用：

| 主题表 | 引用位置 | 示例 |
|---|---|---|
| `colors` | 任意 `Color` 字段 | `$primary` |
| `textStyles` | `TextContent.style` / `Cell.textStyle` | `$title` |
| `tableStyles` | `Table.style` | `$default` |

**生成语义**（generation semantics）：

- G1 **可省略即可自适应**：标 `?` 的对象型图表字段省略等价于 `{}`（见 §6.7.2 通用规则第 5 条）；`fontSize` 省略时文本按链回落、图表按尺寸自适应；坐标轴 `min`/`max` 省略时按数据自适应。
- G2 **`$key` 优先**：颜色/文字样式/表格样式优先写主题引用而非字面量，换设计系统只改 `theme`。
- G3 **语义标签驱动排版**：`Page.pageType`（`cover` / `table_of_contents` / `chapter` / `content` / `final` 或任意自定义串）是语义标签，不影响渲染，供设计系统与质检判断版式惯例。保留值 `svg` 例外：`pageType: svg` 声明一个 svg 页，有结构化约束（见 §4.2）。
- G4 **元素类型封闭**：只有 `text` / `shape` / `line` / `image` / `icon` / `table` / `chart` 七类；`placeholder` 不允许出现（见 §11）。
- G5 **转场只在 deck 级**：由 `export.transition` 统一施加，页级不写转场。
- G6 **动画词表开放、书写克制**：95 个 preset 全部可用（附录 A），但默认不加动画；加了就遵守 §7.7 纪律。

### 2.3 逆向方言（reverse dialect）

逆向方言是**绝对几何超集**：它容纳从 pptx 导入的一切可映射元素，代价是不再享受生成语义的自适应与主题回落。硬规则（R = rule）：

- **R1 几何必须显式**。每个元素必须带 `bounds: [x, y, w, h]`；`rotation` / `opacity` / `flip` 即使等于默认值也显式写出（源文件里有 `<a:xfrm>` 就照实记录）。组合形状（group）在导入时已展平（flatten），子形状按解析后的绝对坐标（`getShapeBoundsResolved` 口径）逐个成元素。
- **R2 颜色必须字面量**。逆向方言的 `Color` 取值域收窄为两种字面量形式，**不允许 `$key`**：

  ```ts
  type ReverseColor = HexColor | SchemeRef;
  type HexColor = string;          // "#RRGGBB" 或 "#RRGGBBAA"
  type SchemeRef = `scheme:${SchemeColorToken}`;   // 主题槽位原样保留，如 "scheme:accent2"
  type SchemeColorToken =
    | "bg1" | "tx1" | "bg2" | "tx2"
    | "accent1" | "accent2" | "accent3" | "accent4" | "accent5" | "accent6"
    | "hlink" | "folHlink" | "phClr" | "lt1" | "dk1" | "lt2" | "dk2";
  ```

  解析口径：源文件里引用主题槽位（`<a:schemeClr>`）的颜色，若能按 `getEffectiveColorMap` / `resolveDrawingColor` 稳定解出 sRGB，则写 HEX；若该颜色带色彩变换链（color transforms）或跟随版式/母版覆盖（`clrMapOvr`）而无法无损落到单一 HEX，则保留 `scheme:<token>` + `colorTransforms`（见 §7.1 `AnimationColor` 同款结构），并在 `import.report.yml` 记 `theme.colorTransform` 降级。
- **R3 字体必须字面量**。`fontFamily` 写目标机实装名（字符串或 `{latin, ea}`），不写主题字体别名；源文件里的 `+mn-lt` / `+mj-ea` 这类主题字体引用按 `getPresentationFonts` 解成实装名。
- **R4 样式必须字面量**。`TextContent.style` / `Cell.textStyle` / `Table.style` 不写 `$key`；从版式/母版继承而来的样式按**有效值**（effective value，`getShapeRunFormatEffective` / `getTableCellRunFormatEffective` / `getShapeFillEffective` 口径）解析后内联到元素上。`theme` 在逆向工程里可以整体省略。
- **R5 溯源字段**。deck 级 `source`（§3.1）、元素级 `sourceRef`（§6.8）记录来源，供质检、工作台与再次导入对账。
- **R6 超集字段可用**。生成方言不产出的字段在逆向方言合法：`placeholder` 元素、`Page.transition`、`Table.builtinStyle`、`Image.imageAdjust`、`Line.glue`、`Page.hidden` / `sectionName`、动画未建模步骤记录（§7.6）。
- **R7 不引入自适应语义**。任何依赖"自动适配"的取值在逆向方言必须写显式值；确实无法解析的（例如源图表的自适应字号）不猜测，走 §10 的 dropped / degraded 两级记录。

### 2.4 两方言字段差异总表

| 维度 | 生成方言 | 逆向方言 |
|---|---|---|
| `deck.schema` | `2`（必填，见 §2.0） | `2`（必填，见 §2.0） |
| `deck.profile` | `generate`（或省略） | `reverse`（必写） |
| `deck.theme` | 推荐，`$key` 引用的落点 | 可省略；不写 `$key` |
| `deck.source` | 不使用 | 必填（§3.1） |
| `deck.export` | 三字段全可用 | 三字段全可用（`transition` 受页级覆盖，见 §8.2） |
| `bounds` | 必填 | 必填，且由 EMU 换算、保留两位小数 |
| `rotation`/`opacity`/`flip` | 省略即默认 | 源文件有变换就显式写出 |
| `Color` 取值域 | HEX6 / HEX8 / `$key` | HEX6 / HEX8 / `scheme:<token>`(+`colorTransforms`) |
| `fontFamily` | 设计系统字体名或 `{latin, ea}` | 目标机实装名或 `{latin, ea}` |
| 样式引用 | `style: "$title"` 等 | 内联字面量 |
| `Page.pageType` | 推荐使用；保留值 `svg` 见 §4.2 | 不使用（源 pptx 无此概念） |
| `Page.svgSource` | 仅 svg 页必填（§4.2） | 不使用 |
| `Page.transition` | 不允许（`ProfileViolationError`） | 可选，记录源文件页级转场 |
| `Page.hidden` / `sectionName` | 不允许 | 可选 |
| `Page.layoutRef` | 可选（`{name}` 挂 deck.masters 版式，§3.5） | 可选（源页版式溯源） |
| `deck.masters` | 可选（母版/版式声明，§3.5） | 不允许（用源存档整页恢复，§10.4） |
| 元素类型 | 七类（含 `icon` / `chart`） | `text` / `shape` / `line` / `image` / `table` / `placeholder`（不产出 `icon` / `chart`） |
| `elementType: "placeholder"` | 不允许（`PlaceholderNotAllowedError`） | 允许，承载 dropped 元素（§10.2） |
| `Table.builtinStyle` | 不允许 | 可选 |
| `Image.imageAdjust` | 不允许 | 可选 |
| `Line.glue` | 不允许 | 可选 |
| `animations[].effect` | 95 preset 之一，必填 | 95 preset 之一或 `null`（未建模步骤，配 `originalEffect`） |
| 动画附加字段 | 不使用 | `presetId` / `presetClass` / `playable` / `editable` / `sequence` / `valueAfterEnd` / `buildLevel` |
| 校验档 | generate 档 | reverse 档（§2.5） |

### 2.5 校验分档

| 档 | 触发 | 检查内容 |
|---|---|---|
| generate 档 | `profile` 为 `generate` 或省略 | 本规格全部结构约束 + `$key` 引用必须在 `theme` 中存在 + `export` 字段取值域 + 动画词表与选项适用性（§7.3）+ 不得出现逆向专属字段 |
| reverse 档 | `profile: reverse` | 结构约束中**与字面量不冲突**的部分 + R1–R7 全部硬规则 + `placeholder` 字段完整性 + 动画/转场记录字段完整性 + `source` 必填 |

两档共用：schema 闸（§2.0，先于一切）、图表数据完整性错误码（§6.7.1 `ChartData` 约束，错误码见 §11.6）、几何出界与文字溢出质检（由规则质检层执行，不属本规格）。错误码总表见 §11。

---

## 3. 主入口 deck.pptd

### 3.1 Presentation

```ts
interface Presentation {
  schema: number;              // 必填；整数；支持集 {2}；见 §2.0
  profile?: Profile;           // 默认 "generate"；见 §2
  title?: string;              // 默认无标题
  size: [number, number];      // 必填，[宽, 高]；推荐值见 §1.2
  customFonts?: CustomFont[];  // 默认不加载自定义字体；见 §3.3
  theme?: Theme;               // 生成方言推荐；逆向方言可省；见 §3.3
  export?: ExportConfig;       // 默认全取缺省值；见 §3.2
  pages: string[];             // 必填，页文件相对路径列表，如 "pages/01_cover.page"
  source?: DeckSource;         // 仅逆向方言，且必填
}

interface DeckSource {
  path: string;                // 源 .pptx 的路径（导入时的原样记录，可为绝对路径）
  sha1?: string;               // 源文件内容哈希，供重复导入对账
  slideCount: number;          // 源文件页数
  size: [number, number];      // 源文件页面尺寸（px，与 deck.size 同源）
  app?: string;                // 源文件的生成应用名（读自扩展属性）
}
```

> **提示**：`CustomFont.src` 是 Google Fonts CSS URL，离线环境下不可达；导出字体嵌入（§9）只认工程内 `assets/fonts/` 与目标机实装字体，不从该 URL 拉取。

**生成方言示例**：

```yaml
schema: 2
profile: generate
title: 年度工作总结
size: [960, 540]
theme:
  colors:
    primary: "#2563EB"
    accent: "#F59E0B"
    text: "#1F2937"
  textStyles:
    title: {fontSize: 40, color: "$primary"}
    body: {fontSize: 18, color: "$text", lineHeight: 1.6}
  tableStyles:
    default:
      firstRowStyle:
        fill: {type: solid, color: "$primary"}
        color: "#ffffff"
        bold: true
      bodyStyles:
        - {fill: {type: solid, color: "#f8fafc"}}
        - {fill: {type: solid, color: "#ffffff"}}
export:
  fontEmbed: subset
  transition: fade
  animations: auto
pages:
  - pages/01_cover.page
  - pages/02_content.page
```

**逆向方言示例**：

```yaml
schema: 2
profile: reverse
title: 第三章 研究方法（导入）
size: [960, 540]
source:
  path: "D:/inbox/thesis-defense.pptx"
  sha1: "9f2c1a7be4d0c8f3a1e6b5d4c3a2918f7e6d5c4b"
  slideCount: 24
  size: [960, 540]
  app: "Microsoft Office PowerPoint"
export:
  fontEmbed: subset
  transition: none
  animations: auto
pages:
  - pages/01.page
  - pages/02.page
```

### 3.2 export：导出契约

deck 级字段，控制导出产物（`.pptx`）的三项全局行为。三字段互相独立，全部可省，省略即取默认值。

```ts
interface ExportConfig {
  fontEmbed?: "subset" | "full" | "off";   // 默认 "subset"；字体嵌入档位，见 §9
  transition?: "fade" | "none" | "auto";    // 默认 "fade"；deck 级转场，见 §8.1
  animations?: "auto" | "off";             // 默认 "auto"；是否写出页级动画，见 §7.8
}
```

| 字段 | 取值 | 语义 |
|---|---|---|
| `fontEmbed` | `subset`（默认） | 嵌入工程实际用到的字体，按字符集子集化（CJK 场景体积降一个数量级）；受 fsType 许可闸约束（§9.1） |
| | `full` | 嵌入整字体，不子集化；目标机可自由编辑新增字符，代价是产物体积 |
| | `off` | 不嵌入字体；目标机需自行安装，否则回落替代字体并触发 `missingFonts` 警告 |
| `transition` | `fade`（默认） | 对没有页级转场记录的页写淡入淡出转场（`spd="fast"`、`advClick="1"`）；逆向方言里已有 `page.transition` 的页以页级为准 |
| | `none` | 导出产物任何页根级都不写 `<p:transition>`（含逆向方言的页级记录） |
| | `auto` | 对没有页级转场记录的页按策展词表逐页轮换 `fade → push(dir=r) → wipe(dir=r)`（`spd="fast"`、`advClick="1"`）；策展词表是引擎层的固定常量，目的是让 AI 生成的 deck 页间有节奏变化而非清一色淡入；逆向方言里已有 `page.transition` 的页仍以页级为准 |
| `animations` | `auto`（默认） | 按各页 `animations` 数组写出 `<p:timing>`；逆向方言里 `effect: null` 的未建模步骤跳过并计入导出摘要 |
| | `off` | 不写任何 `<p:timing>`，页级 `animations` 保留在 PPTD 里但不落到产物 |

`export` 字段落账：每次导出把实际执行结果（嵌入 face 数、跳过原因、子集前后体积、写出的转场页数、写出的动画步骤数）写入 `manifest.json` 的 `exportReport`，随 `revision` 可追溯。

`qaReport` 字段落账：`ppt_check` 与 `ppt_export`（含被质检阻断的路径）都把最近一次质检结果（pass、issue/blocker 计数、完整 issues 列表、检查页子集）写入 `manifest.json` 的 `qaReport`，`revision`/`checkedAt` 由账本现场盖戳——「当初为什么没过」永远可追溯。

### 3.3 Theme 与子结构

```ts
interface Theme {
  colors?: Record<string, Color>;                    // 主题色表，页内以 $key 引用
  textStyles?: Record<string, TextStyleConfig>;      // 文字样式表
  tableStyles?: Record<string, TableStyleConfig>;    // 表格样式表
}
```

三张表的引用位置：

| 主题表 | 引用位置 | 示例 |
|---|---|---|
| `colors` | 任意 `Color` 字段 | `$primary` |
| `textStyles` | `TextContent.style` / `Cell.textStyle` | `$title` |
| `tableStyles` | `Table.style` | `$default` |

```ts
interface TextStyleConfig {
  color?: Color;
  fontSize?: number;
  fontFamily?: FontFamily;
  bold?: boolean;
  italic?: boolean;
  backgroundColor?: Color;
  lineHeight?: number;        // 倍数；与 lineHeightPx 互斥，同设时 lineHeightPx 优先
  lineHeightPx?: number;      // 固定 px
  letterSpacing?: number;
  marginTop?: number;         // 段前间距（px）
}

interface CellStyle extends TextStyleConfig {
  fill?: Fill;
  border?: BorderSpec;        // 分边语义见 §5 › Border
  align?: Alignment;
}

interface TableStyleConfig {
  cellStyle?: CellStyle;            // 整表基线样式（九级链第 8 级）
  firstRowStyle?: CellStyle;        // 行/列类别样式（九级链第 6 级）：
  lastRowStyle?: CellStyle;         //   逐格独立应用，不是整行整列一个样式对象；
  firstColumnStyle?: CellStyle;     //   要给整表加外框，用 BorderSpec 在首行上沿、
  lastColumnStyle?: CellStyle;      //   末行下沿、首列左沿、末列右沿分边设置
  bodyStyles?: CellStyle[];         // 数据行（去掉首行后）按序号循环应用（九级链第 7 级）
  rowOverColumn?: boolean;          // 默认 true；行类别与列类别冲突时行胜
}

interface CustomFont {
  family: string;   // 字体名，必须与 Google Fonts 上的名字逐字一致
  src: string;      // Google Fonts CSS URL；只带默认字重
}
```

### 3.4 工程级文件：brief.md 与 plan.yml

两个**可选**的工程级文件，承载「要做什么」的规划元数据，与「做成了什么」的 deck 内容分离。二者的账本地位：**不参与 undo 快照与 manifest checksum**——它们是建议性（advisory）工程元数据，不是 deck 内容。

#### 3.4.1 brief.md

散文简报，记录这份 deck 的简报（brief）。正文是自由散文；允许出现以下结构化行（每行一个，空值省略）：

```markdown
# <标题>

- **目的**：这份 deck 要达成什么
- **受众**：读者是谁
- **核心信息**：一句话主旨
- **语气**：正式 / 活泼 / …
- **形态**：deck | poster | infographic
- **页数**：12
```

```ts
interface Brief {
  purpose?: string;
  audience?: string;
  coreMessage?: string;
  tone?: string;
  mode?: "deck" | "poster" | "infographic";
  pageCount?: number;        // 约束 > 0
}
```

校验：`purpose` / `audience` / `coreMessage` / `tone` 必须是字符串；`mode` 必须在三值词表内；`pageCount` 必须是 > 0 的数；违反均为 blocker `SchemaError`。读取是宽容的：散文部分原样保留，只解析上述结构化行。

#### 3.4.2 plan.yml

逐页计划，生成开工前先定页表；先 `status: draft`，确认后改 `confirmed`，再按 plan 建页。

```ts
interface Plan {
  version?: 1;                          // 省略即 1；写出时必须为 1
  status?: "draft" | "confirmed";
  pages: PlanPage[];                    // 必填，非空
}

interface PlanPage {
  page: string;                         // 必填，非空；页文件相对路径，全表查重
  title?: string;
  type?: "native" | "svg";              // 默认 "native"
  svgRef?: string;                      // type 为 svg 时必填（非空）
  intent?: string;                      // 这页要表达什么
  module?: string;                      // 所属模块/章节
}
```

校验（除注明外均为 blocker `SchemaError`）：顶层必须是映射；`version` 写出时必须为 `1`；`status` 必须在词表内；`pages` 必填非空数组；条目应为映射对象（纯字符串条目给 warning）；`page` 必填非空且全表查重；`type` 在词表内；`type: svg` 必带非空 `svgRef`；`title` 必须是字符串。

plan 与 `deck.pages` 的一致性只做**交叉提醒**：plan 声明的页尚未出现在 `deck.pages`（计划领先于执行）、或 `deck.pages` 里的页未列入 plan，各产生一条 **warning**，不产生 blocker。

示例：

```yaml
version: 1
status: draft
pages:
  - page: pages/01_cover.page
    title: 封面
    type: svg
    svgRef: media/svg/cover.svg
    intent: 开场，一句话主旨
  - page: pages/02_trend.page
    title: 年度趋势
    intent: 用折线图讲三年变化
    module: 证据
```

---

## 4. 页面文件（.page）

### 4.1 Page

```ts
interface Page {
  pageType?: "cover" | "table_of_contents" | "chapter" | "content" | "final" | "svg" | string;
                                    // 默认无；仅生成方言使用（语义标签，不影响渲染）；
                                    // 保留值 "svg" 见 §4.2
  background?: Fill;                // 默认 {type: solid, color: "#FFFFFF"}
  notes?: string;                   // 默认无；演讲者备注，纯文本
  elements: Element[];              // 必填；越靠后层级越高；svg 页必须为空数组 []（§4.2）
  animations?: Animation[];         // 默认无；按数组顺序编排，见 §7；svg 页不支持（§4.2）
  svgSource?: SvgSource;            // 仅生成方言 svg 页必填（§4.2）
  transition?: PageTransition;      // 仅逆向方言；源文件页级转场记录，见 §8.2
  hidden?: boolean;                 // 仅逆向方言，默认 false；源文件里的隐藏页
  layoutRef?: LayoutRef;            // 仅逆向方言；源页所用版式（slide layout）溯源
  sectionName?: string;             // 仅逆向方言；源文件里的节（section）名
}

interface LayoutRef {
  partName: string;                // 版式部件名，如 "ppt/slideLayouts/slideLayout3.xml"
  name?: string;                   // 版式显示名
  type?: string;                   // 版式类型 token（ST_SlideLayoutType），源文件缺失时为 null
  masterPartName?: string;         // 所属母版部件名
}
```

`background` 的取值类型 `Fill` 见 §5。逆向方言的页面背景若为图案填充（pattern fill），按 §10.1 记 `background.patternFill` 降级并落到最接近的 solid/gradient 字面量。

**生成方言示例**：

```yaml
pageType: cover
background: {type: solid, color: "$primary"}
notes: 开场自我介绍，30 秒
elements:
  - elementId: title1
    elementType: text
    bounds: [100, 200, 760, 80]
    content:
      style: "$title"
      align: [center, middle]
      text: 年度工作总结
```

**逆向方言示例**：

```yaml
hidden: false
layoutRef:
  partName: "ppt/slideLayouts/slideLayout2.xml"
  name: "标题和内容"
  type: "obj"
  masterPartName: "ppt/slideMasters/slideMaster1.xml"
sectionName: "第三章"
transition:
  effect: fade
  speed: fast
  advanceOnClick: true
elements:
  - elementId: el-3-4
    elementType: text
    bounds: [83.46, 45.12, 793.07, 60.00]
    rotation: 0
    opacity: 1
    flip: [false, false]
    sourceRef: {slideIndex: 3, shapeId: 4}
    originalName: "标题 1"
    content:
      fontSize: 32
      color: "#1F2937"
      fontFamily: {latin: "Calibri", ea: "Microsoft YaHei"}
      align: [left, middle]
      text: 3.2 数据采集
  - elementId: ph-3-12
    elementType: placeholder
    bounds: [83.46, 140.00, 793.07, 330.00]
    originalType: chart
    originalName: "Chart 1"
    sourceRef: {slideIndex: 3, shapeId: 12}
```

### 4.2 svg 页（pageType: svg，仅生成方言）

svg 页把整页设计源托管给一份 SVG 文件：页面对象不直接列元素，而是以 `svgSource` 指向 `media/svg/` 下的一份 `.svg`。一个页面要么是 native 页（`elements` 列出元素），要么是 svg 页（`svgSource` 指设计源），二者不兼得。

```ts
interface SvgSource {
  ref: string;                    // 设计源相对路径，约束见下
  viewBox?: [number, number];     // 可选；SVG 视口尺寸 [宽, 高]
}
```

规则：

1. **方言限定**：`pageType: svg` 仅生成方言可用；逆向方言页出现 `pageType`（含 `svg`）报 blocker `ProfileViolationError`。
2. **`svgSource.ref` 必填非空**，且必须是 `media/svg/` 下的安全相对路径：非绝对路径、不含 `..`、以 `media/svg/` 开头、以 `.svg` 结尾（大小写不敏感）；违反报 blocker `SchemaError`。
3. **`elements` 必须为空数组 `[]`**——设计源在 `svgSource.ref`，页内不再列元素；违反报 blocker `SchemaError`。
4. **不支持页内 `animations`**（编译器阶段不支持）；写了报 blocker `SchemaError`。

示例：

```yaml
pageType: svg
svgSource: {ref: media/svg/cover.svg}
notes: 封面由设计稿直接给出
elements: []
```

### 4.3 编辑 ops：update_plan 与 update_svg_source

两个编辑 op（`ppt_edit` 的 `ops[]` 条目）分别维护 §3.4 的 plan 与 §4.2 的 svg 设计源：

| op | 参数 | 语义 |
|---|---|---|
| `update_plan` | `plan: Plan`（对象，见 §3.4.2） | 校验 `plan`（同 §3.4.2 全部规则）后**整体替换** `plan.yml`；任一 blocker 则整个 op 失败、不落盘 |
| `update_svg_source` | `page: string`（页路径）+ `source: {ref, viewBox?}` | 仅 svg 页可用：目标页必须是 `pageType: svg`，否则 op 失败；`ref` 约束同 §4.2（`media/svg/` 下、`.svg` 结尾、安全相对路径），违反 op 失败；成功即改写该页的 `svgSource` |

---

## 5. 共享类型

```ts
/** 颜色：HEX6 / HEX8 字面量，或主题引用 $key（逆向方言收窄见 §2.3 R2） */
type Color = string;   // "#RRGGBB" | "#RRGGBBAA" | "$<key>"

/** 字体：单一族名，或西文/东亚分设 */
type FontFamily = string | { latin: string; ea: string };

type HorizontalAlign = "left" | "center" | "right" | "justify" | "distributed";
type VerticalAlign = "top" | "middle" | "bottom";
/** 对齐：[水平, 垂直] */
type Alignment = [HorizontalAlign, VerticalAlign];

type LineStyle = "solid" | "dash" | "dot";

interface Border {
  style?: LineStyle;   // 默认 "solid"
  width?: number;      // 默认 1
  color?: Color;       // 默认 "#000000"
}

/**
 * 分边边框：
 * - null         → 清除（无边框）
 * - Border       → 四边同设
 * - [上下, 左右]  → 二元数组
 * - [上, 右, 下, 左] → 四元数组，顺时针
 * 数组元素为 null 表示该边无边框。
 */
type BorderSpec = null | Border | [Border | null, Border | null] | [Border | null, Border | null, Border | null, Border | null];

interface Shadow {
  blur: number;                 // 模糊半径（px）
  color: Color;
  offset?: [number, number];    // 默认 [0, 0]
}

interface ColorStop {
  position: number;             // 渐变位置，[0, 1]
  color: Color;
}

/** 图片适配模式 */
interface ImageFit {
  mode: "fill" | "contain" | "cover";
  // fill    拉伸铺满（可变形）
  // contain 等比缩放至完整容纳（可能留白）
  // cover   等比缩放至铺满并裁掉溢出（默认）
}

/**
 * 图片裁剪：四边裁剪比例，各边默认 0。
 * 正值向内裁，负值向外扩（补透明）。
 * 约束：left + right < 1 且 top + bottom < 1。
 */
interface ImageCrop {
  left?: number;   // 默认 0
  top?: number;    // 默认 0
  right?: number;  // 默认 0
  bottom?: number; // 默认 0
}

interface SolidFill {
  type: "solid";
  color: Color;
}

interface GradientFill {
  type: "gradient";
  gradientType: "linear" | "radial";
  stops: ColorStop[];           // 至少 2 个
  angle?: number;               // 仅 linear；[0, 360)，0 = 从左到右，顺时针增长；默认 0
}

interface ImageFill {
  type: "image";
  src: string;                  // 相对路径或 https URL（jpg/jpeg/png/gif）
  fit?: "fill" | "contain" | "cover";  // 默认 "cover"
  crop?: ImageCrop;             // 裁剪必先应用（渲染次序：crop → fit）
  opacity?: number;             // [0, 1]，默认 1
}

type Fill = SolidFill | GradientFill | ImageFill;
```

另有两个共享类型，供 §7 动画与 §2.3 R2 逆向颜色复用：

```ts
/** DrawingML 色彩变换（color transforms）链：百分比类取小数，色相类取角度 */
type ColorTransform =
  | { kind: "comp" | "inv" | "gray" | "gamma" | "invGamma" }
  | {
      kind:
        | "tint" | "shade" | "alpha" | "alphaOff" | "alphaMod"
        | "hue" | "hueOff" | "hueMod" | "sat" | "satOff" | "satMod"
        | "lum" | "lumOff" | "lumMod"
        | "red" | "redOff" | "redMod" | "green" | "greenOff" | "greenMod"
        | "blue" | "blueOff" | "blueMod";
      value: number;
    };

/** 主题槽位引用；逆向方言用它无损保留带变换链的主题色 */
type SchemeRef = `scheme:${SchemeColorToken}`;
```

---

## 6. 元素

### 6.0 ElementBase 与元素联合

```ts
interface ElementBase {
  elementId: string;    // 必填；页内唯一
  elementType: "text" | "shape" | "line" | "image" | "icon" | "table" | "chart" | "placeholder";
  bounds: [number, number, number, number];   // 必填；[x, y, w, h]，见 §1.2
}

type Element =
  | Text | Shape | Line | Image | Icon | Table | Chart
  | Placeholder;    // 仅逆向方言（§10.2）
```

元素类型与方言的可用性：

| 元素 | 生成方言 | 逆向方言 |
|---|---|---|
| `text` / `shape` / `line` / `image` / `table` | 产出 | 产出 |
| `icon` | 产出 | 不产出（源文件里的图标按 `shape`（custGeom）或 `image` 映射） |
| `chart` | 产出 | 不产出（原生图表部件走 dropped + placeholder，见 §10.1） |
| `placeholder` | 不允许 | 产出 |

### 6.1 Text

```ts
interface Text extends ElementBase {
  elementType: "text";
  rotation?: number;            // 默认 0；角度，顺时针
  opacity?: number;             // 默认 1；[0, 1]
  flip?: [boolean, boolean];    // 默认 [false, false]；[水平, 垂直]
  content: TextContent;
}

interface TextContent {
  text: string;                          // 必填；富文本（规则见下）；一律用 | 块标量独立成块
  style?: string;                        // $key，引用 theme.textStyles（生成方言）
  color?: Color;
  fontSize?: number;
  fontFamily?: FontFamily;
  bold?: boolean;
  italic?: boolean;
  backgroundColor?: Color;
  lineHeight?: number;                   // 倍数；与 lineHeightPx 互斥，同设时 lineHeightPx 优先
  lineHeightPx?: number;                 // 固定 px
  letterSpacing?: number;
  marginTop?: number;                    // 段前间距（px）
  textDirection?: "horizontal" | "vertical";   // 默认 "horizontal"
  wrap?: boolean;                        // 默认 true；false 则文字溢出框外不换行
  align?: Alignment;                     // 默认 [left, top]
  gradient?: GradientFill;               // 文字渐变填充（与 color 互斥，gradient 优先）
  shadow?: Shadow;
}
```

**示例**：

```yaml
- elementId: title1
  elementType: text
  bounds: [100, 200, 760, 80]
  content:
    style: "$title"
    align: [center, middle]
    text: 年度工作总结

- elementId: note
  elementType: text
  bounds: [60, 480, 300, 40]
  content:
    fontSize: 12
    color: "#6B7280"
    text: 数据来源：年报

- elementId: quote
  elementType: text
  bounds: [120, 150, 720, 200]
  content:
    fontSize: 24
    align: [left, top]
    text: |
      <p>第一句话。</p>
      <p>第二句话，含<strong>重点</strong>。</p>
```

#### 6.1.1 富文本规则

`TextContent.text`（以及 `Cell.text`、`label` 等富字段）支持一个 HTML 子集：

**标签表**：

| 标签 | 语义 |
|---|---|
| `<p>` | 段落 |
| `<span>` | 行内样式容器（内联样式只允许写在 span 上，见下 style 映射） |
| `<strong>` / `<em>` / `<u>` / `<s>` | 粗体 / 斜体 / 下划线 / 删除线 |
| `<sup>` / `<sub>` | 上标 / 下标 |
| `<a href="...">` | 超链接；支持 `https://`、`http://`、`mailto:`；自动渲染为蓝色下划线 |
| `<ul>` / `<ol>` / `<li>` | 无序 / 有序列表与列表项 |

**style 映射**（各标签允许的 CSS 属性）：

| 标签 | 允许属性 |
|---|---|
| `<p>` | `text-align`、`line-height`（无单位 = 倍数，带 `px` = 固定）、`margin-top`、`margin-left`、`margin-right`；**禁** `letter-spacing` |
| `<li>` | `text-align`、`line-height`、`letter-spacing`、`margin-top`、`margin-left`、`list-style*` |
| `<span>` | `color`、`font-size`（px）、`font-family`、`background-color` |

**纯文本简写**：单行纯文本等价于一个 `<p>`；多行（块标量）逐行各成一个 `<p>`。`<br/>` 不保证往返保留。

**LaTeX 公式**：`\(...\)` 包裹的 LaTeX 可独立成段或与文字混排；公式内部禁止富文本标签；公式只继承 `color` 与 `font-size` 两个样式；可用 `<p>` 包裹控制对齐。

### 6.2 Shape

```ts
interface Shape extends ElementBase {
  elementType: "shape";
  shapeName: string;            // 形状名；全 177 形状见仓库内 skills/ppt-maker/reference/shapes.md
  adjustments?: number[];       // 调整值，按 OOXML 参数序；默认全 0
  viewBox?: [number, number];   // [viewBoxW, viewBoxH]；仅 shapeName: "custom" 必填
  path?: string;                // 自定义路径；仅 shapeName: "custom" 必填
  rotation?: number;            // 默认 0
  opacity?: number;             // 默认 1；[0, 1]
  flip?: [boolean, boolean];    // 默认 [false, false]
  fill?: Fill;                  // 默认不应用（无填充）
  border?: Border;              // 默认不应用（无边框）
  shadow?: Shadow;              // 默认不应用
}
```

约束与惯例：

- **shape 不支持内嵌文本**：要带文字的形状 = 一个 Shape + 一个叠放的 Text。
- **custom 路径**：`path` 支持指令 `M L H V C S Q A Z`；镂空（挖洞）= 外轮廓顺时针（sweep=1）+ 内轮廓逆时针（sweep=0）。
- **viewBox 独立拉伸**：`viewBox` 是路径自己的坐标系，绘制时拉伸到 `bounds`；要保持不变形需等比，即 `viewBoxW : viewBoxH = bounds.w : bounds.h`。

常用形状与默认 adjustments：

| shapeName | adjustments | shapeName | adjustments |
|---|---|---|---|
| `rect` | — | `donut` | `[25000]` |
| `roundRect` | `[16667]` | `star5` | `[19098, 105146, 110557]` |
| `ellipse` | — | `rightArrow` | `[50000, 50000]` |
| `triangle` | `[50000]` | `wedgeRectCallout` | `[-20833, 62500]` |
| `diamond` | — | `bracePair` | `[8333]` |
| `homePlate` | `[50000]` | `chevron` | `[50000]` |

全 177 个形状名与参数见仓库内 `skills/ppt-maker/reference/shapes.md`。

### 6.3 Line

```ts
type ArrowType = "arrow" | "stealth" | "diamond" | "oval";

interface Line extends ElementBase {
  elementType: "line";
  viewBox: [number, number];    // 必填；[viewBoxW, viewBoxH]，路径点的坐标系
  points: string;               // 必填；"x1,y1 x2,y2 ..."，至少 2 个点；首末是过点，中间是控制点；所有点须在 viewBox 内
  curve?: "sharp" | "round" | "smooth";   // 默认 "round"
  arrow?: [ArrowType | null, ArrowType | null];   // [起点, 终点]；默认 [null, null]
  border?: Border;              // 默认 {style: "solid", width: 1, color: "#000000"}
  shadow?: Shadow;              // 默认不应用
}
```

`viewBox` 同样是独立坐标系、绘制时拉伸到 `bounds`；等比要求同 §6.2（`viewBoxW : viewBoxH = bounds.w : bounds.h`）。

### 6.4 Image

```ts
/** 形状定义：与 Shape 的 shapeName/adjustments/viewBox/path 一一对应 */
interface ShapeDef {
  shapeName: string;
  adjustments?: number[];
  viewBox?: [number, number];   // 仅 custom 必填
  path?: string;                // 仅 custom 必填
}

interface Image extends ElementBase {
  elementType: "image";
  src: string;                  // 必填；相对路径或 https URL（jpg/jpeg/png/gif）
  cropShape?: ShapeDef;         // 裁剪形状；默认矩形（不裁形）
  fit?: "fill" | "contain" | "cover";   // 默认 "cover"（语义见 §5 ImageFit）
  crop?: ImageCrop;             // 裁剪必先应用（见下渲染次序）
  rotation?: number;            // 默认 0
  opacity?: number;             // 默认 1；[0, 1]
  flip?: [boolean, boolean];    // 默认 [false, false]
  border?: Border;              // 默认不应用
  shadow?: Shadow;              // 默认不应用
}
```

**渲染次序**：`crop` → `fit` → `cropShape`。三者互相独立，可同时设置：先把原图按 `crop` 裁剪，再按 `fit` 适配到 `bounds`，最后按 `cropShape` 裁出形状。

### 6.5 Icon

```ts
interface Icon extends ElementBase {
  elementType: "icon";
  iconName: string;             // 必填；"style:name"，如 "fas:house"；Font Awesome 7.x 免费集
  fill?: Fill;                  // 默认黑色实心（{type: solid, color: "#000000"}）
}
```

`style` 前缀：`fas`（solid，最常用）/ `far`（regular）/ `fab`（brands）。图标检索：<https://fontawesome.com/search?ic=free-collection>。

### 6.6 Table

```ts
interface Table extends ElementBase {
  elementType: "table";
  columnWidths: number[];       // 必填；列宽比例，各项 [0, 1] 且和为 1
  rowHeights: number[];         // 必填；行高比例，各项 [0, 1] 且和为 1
  rows: Cell[][];               // 必填；合并区被覆盖的格子从数组中省略（不是 null 占位）
  style?: string;               // $key，引用 theme.tableStyles（生成方言）
  fill?: Fill;                  // 表级填充；默认不应用
  shadow?: Shadow;              // 默认不应用
}

interface Cell {
  text?: string;                // 默认空串；富文本规则同 §6.1.1
  textStyle?: string;           // $key，引用 theme.textStyles（仅取文本字段）
  color?: Color;
  fontSize?: number;
  fontFamily?: FontFamily;
  bold?: boolean;
  italic?: boolean;
  backgroundColor?: Color;
  lineHeight?: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  marginTop?: number;
  fill?: Fill;
  border?: BorderSpec;          // 分边语义见 §5
  align?: Alignment;            // 默认 [center, middle]
  rowSpan?: number;             // 默认 1
  colSpan?: number;             // 默认 1
}
```

约束与惯例：

- **合并单元格**：`rowSpan` / `colSpan` 大于 1 的格子向右/向下覆盖；被覆盖的格子**从 `rows` 数组里省略**（不写、也不写 `null`）。例如一个 2×2 合并占满首行两列、前两行时，第二行数组相应少两格。
- **PPT 原生表格限制**：不可整体旋转/翻转、无全局不透明度；需要这些效果时先把表格渲染为图片再按 `Image` 处理。
- 单元格样式按 §1.3.2 九级链解析。

**合并示例**（3 列 2 行，首行前两列横向合并）：

```yaml
- elementId: tbl1
  elementType: table
  bounds: [60, 100, 600, 160]
  columnWidths: [0.4, 0.3, 0.3]
  rowHeights: [0.5, 0.5]
  rows:
    - - {text: "合并标题", colSpan: 2, bold: true}
      - {text: "右列"}
    - - {text: "a"}
      - {text: "b"}
      - {text: "c"}
```

### 6.7 Chart

PPTD 的 chart 元素采用 ECharts 式建模：**图表顶层没有 `type` 字段**，由每个 `series[i].type` 自行决定形态。共支持 13 种系列类型，按类型名平铺，地位平等：

`bar` / `line` / `area` / `scatter` / `bubble` / `candlestick` / `pie` / `radar` / `waterfall` / `heatmap` / `treemap` / `sunburst` / `sankey`

每种类型在自己小节的第一行声明**系列约束**：同一图表内允许的最大数量，以及允许与哪些类型混排。

#### 6.7.1 顶层结构与数据方言

```ts
interface Chart extends ElementBase {
  elementType: "chart";

  data: ChartData;                 // 必填
  series: SeriesConfig[];          // 必填；长度 ≥ 1
  seriesDefaults?: SeriesDefaults; // 默认不应用；按 series.type 分组的公共默认值，与各系列合并

  // —— 直角坐标系（按 series.type 条件生效，见 §6.7.5）——
  xAxis?: AxisConfig | AxisConfig[];   // 默认按数据自适应；数组形式经 series[i].xAxisIndex 引用
  yAxis?: AxisConfig | AxisConfig[];   // 默认按数据自适应；数组形式经 series[i].yAxisIndex 引用
  barWidth?: number;                   // 默认自适应；(0, 1]，柱宽 / 类目槽宽比
  barGap?: number;                     // 默认 0（贴紧）；[0, 1)，多柱并列时的柱间距
  categoryGap?: number;                // 默认 0.2；[0, 1)，类目槽之间的空白占比

  // —— 雷达坐标系（仅 radar 系列）——
  spokeAxis?: SpokeAxisConfig;         // 默认按数据自适应；辐条轴 + 蛛网网格

  // —— 全局组件 ——
  title?: string | TitleConfig;        // 默认无标题
  legend?: boolean | LegendConfig;     // 默认随类型（见 LegendConfig 的默认值表）
  dataLabels?: DataLabelConfig;        // 默认不应用；全局默认，可被 series.dataLabels 覆盖
  fontFamily?: FontFamily;             // 默认沿主题 / 母版字体回落

  // —— 图表外框（控制整个图表元素的矩形容器，与系列配色独立）——
  fill?: Fill;                         // 默认不应用
  border?: Border;                     // 默认不应用
  shadow?: Shadow;                     // 默认不应用
}

type SeriesConfig =
  | BarSeries | LineSeries | AreaSeries | ScatterSeries | BubbleSeries
  | CandlestickSeries | PieSeries | RadarSeries | WaterfallSeries
  | HeatmapSeries | TreemapSeries | SunburstSeries | SankeySeries;
```

`fill` / `border` / `shadow` 控制的是**图表元素的矩形外框**（作用于整个图表容器），与系列本体配色无关。

**PPT 原生图表限制**：不可整体旋转/翻转；也不存在一个覆盖「标题、坐标轴、图例、标签与系列」的图表级整体不透明度属性。需要整体旋转/翻转/不透明度时，先把图表渲染为图片，再按 `Image` 元素（§6.4）处理。

```ts
interface ChartData {
  cols: string[];                        // 列名；唯一、非空字符串
  rows: (number | string | null)[][];    // 每行长度 = cols.length
}
```

**数据完整性约束**（校验器检查，错误码表见 §11.6）：

- `cols` 中出现重复列名 → `DuplicateColumnError`
- `cols` 中含空字符串 → `EmptyColumnError`
- `rows[i].length !== cols.length` → `RowLengthError`
- encode 引用的列名不在 `cols` 中 → `UnknownColumnError`
- 同一列被多个系列引用是合法的（如同一 y 列先画柱再画线）
- 数值通道（`y` / `value` / `open` / `high` / `low` / `close` / `size` / `flow`）的列值为字符串时按数字解析，解析失败 → `NonNumericValueError`

**缺失单元格写法**：填 `null`，如 `[null, null, 2, 3]`。**不推荐**连续逗号 `[, , 2, 3]`——严格 YAML 解析器会报错。

#### 6.7.2 通用规则

1. **系列的 `fill` 类型**：`Color | GradientFill`；字符串视为纯色 Color（HEX8 或 `$xxx` 主题引用），对象视为 GradientFill（`type: "gradient"`）；部分类型支持 `(Color | GradientFill)[]` 数组形式（按切片/节点循环）。**系列级 fill 不支持 ImageFill**。
2. **类型混排**：一张图的 `series[]` 允许包含哪些类型，由各类型小节的「系列约束」决定；校验器据此检查。
3. **条件生效的顶层字段**：`xAxis` / `yAxis` / `barWidth` / `barGap` / `categoryGap` / `spokeAxis` 是**坐标系级**配置，按 `series[].type` 集合条件生效（适用性明细见 §6.7.5 速查表）。
4. **Color 主题引用域**：所有 `Color` 类型的字段（含嵌套数组与对象里的每一处 Color 位置）都支持 `$xxx` 主题引用——如 `upBars: {fill: "$success"}`、`colorScheme: ["$bg", "$primary"]`、`fill: ["$primary", "$accent"]`。
5. **可选对象字段的缺省语义**：所有带 `?` 的**对象型**字段（`xAxis` / `yAxis` / `spokeAxis` / `colorScale` / `marker` / `dataLabels` 等）省略时等价于该对象的空配置 `{}`，子字段各取默认值——即「坐标轴/网格/标签等默认照常渲染，只是参数自动推断」。这与 ElementBase 的 `fill` / `border` / `shadow` 省略即**不应用**不同。

**bar / waterfall 方向**：由轴类型决定——`xAxis.type === "category"` 时为纵向（默认），`yAxis.type === "category"` 时为横向。`axis.type` 默认按数据列推断（字符串 → category，数字 → value）；数值列需要当类目用时（如年份）显式写 `axis.type: "category"`。横向时 `encode.x` 引用数值列、`encode.y` 引用类目列，`numberFormat` 写在数值轴一侧。scatter / bubble 的 x、y 都是数值通道，没有方向概念。

#### 6.7.3 共享配置组件

```ts
interface TextStyle {
  color?: Color;            // 默认沿继承链回落（主题文字色 / PPTX 母版）
  fontSize?: number;        // 默认随图表尺寸自适应
  fontFamily?: FontFamily;  // 默认沿继承链回落到 Chart.fontFamily 或主题字体
}
```

文本样式三件套，被 TitleConfig / LegendConfig / DataLabelConfig / AxisConfig.label / SpokeAxisConfig.label 继承复用；字体优先级链见 §1.3.3。

```ts
interface LineStyleConfig {
  style?: "solid" | "dash" | "dot";    // 默认 "solid"
  color?: Color;                       // 默认回落主题
  width?: number;                      // 默认 1
}
```

通用线条样式，被 AxisConfig / SpokeAxisConfig 的 `axisLine` / `gridLine` 复用。

```ts
interface TitleConfig extends TextStyle {
  text: string;   // 必填；fontSize 默认随图表尺寸自适应
}

interface LegendConfig extends TextStyle {
  show?: boolean;                                  // 默认随类型（见下表）
  position?: "top" | "bottom" | "left" | "right";  // 默认 "bottom"
}
```

`show` 按类型的默认值：

| 类型 | 默认 |
|---|---|
| bar / line / area / scatter / bubble / candlestick / pie / radar | `true` |
| waterfall | `false` |
| treemap / sunburst / sankey | `false`（名称与数值已直接画在图上） |
| heatmap | 不使用 `chart.legend`（由 series.colorbar 控制） |

`legend: false` 或 `legend: {show: false}` 即关闭，**对全部 13 种类型生效**；`legend: true` 或对象形式只对上表中适用的类型有视觉效果。

```ts
interface DataLabelConfig extends TextStyle {
  show?: boolean;                      // 默认 false
  content?: "value" | "percentage" | "category";  // 默认随类型（见 §6.7.5 速查表）
  numberFormat?: string;               // 默认不格式化；Excel 数字格式串（见下）
}
```

**numberFormat 标准**：取 Excel 数字格式串子集——`0`（整数）/ `0.0`（一位小数）/ `0%`（百分比）/ `0.0%`（带小数百分比）/ `#,##0`（千分位）/ `0.0E+00`（科学计数法）。`[Red]` 颜色段、负数分段、条件格式等高级语法**不支持**。

```ts
interface MarkerConfig {
  shape?: "circle" | "rect" | "diamond" | "triangle";  // 默认 "circle"
  fill?: Color | GradientFill;         // 默认跟随系列本体色
  border?: Border;                     // 默认不应用
  size?: number;                       // 默认随图表尺寸自适应；单位 px
}
```

```ts
interface AxisConfig {
  show?: boolean;                      // 默认 true
  type?: "category" | "value";         // 默认按数据列推断（字符串 → category，数字 → value）
  min?: number;                        // 默认按数据自适应；仅数值轴生效
  max?: number;                        // 默认按数据自适应；仅数值轴生效
  reverse?: boolean;                   // 默认 false；true = 轴方向反转（最大值在原点侧）
  title?: string | TitleConfig;        // 默认无标题；推荐字符串形式，特殊样式才用对象
  label?: boolean | (TextStyle & {     // 默认 true；刻度标签
    numberFormat?: string;             // 默认不格式化；仅数值轴生效
  });
  axisLine?: boolean | (LineStyleConfig & {  // 默认 true
    arrow?: boolean | "start" | "end" | "both";  // 默认 false；true 等价于 "end"
  });
  gridLine?: boolean | LineStyleConfig;      // 默认 true
}

interface SeriesDefaults {
  bar?: Partial<Omit<BarSeries, "type" | "encode">>;
  line?: Partial<Omit<LineSeries, "type" | "encode">>;
  area?: Partial<Omit<AreaSeries, "type" | "encode">>;
  scatter?: Partial<Omit<ScatterSeries, "type" | "encode">>;
  bubble?: Partial<Omit<BubbleSeries, "type" | "encode">>;
  candlestick?: Partial<Omit<CandlestickSeries, "type" | "encode">>;
  radar?: Partial<Omit<RadarSeries, "type" | "encode">>;
}
```

为该类型的所有系列提供公共默认值，避免多系列重复书写。合并算法与可用类型范围见 §1.3.3。

```ts
/** 仅 radar 系列使用 */
interface SpokeAxisConfig {
  show?: boolean;                      // 默认 true
  min?: number;                        // 默认 0；所有维度共用的数值轴下限
  max?: number;                        // 默认按数据自适应；所有维度共用的数值轴上限
  label?: boolean | (TextStyle & {     // 默认 true；刻度标签
    numberFormat?: string;             // 默认不格式化
  });
  axisLine?: boolean | LineStyleConfig;   // 默认 true；圆心到外圈的辐条线
  gridLine?: boolean | LineStyleConfig;   // 默认 true；蛛网网格线（连接各辐条端点的同心多边形）
}

/** 曲线类公共字段，line / area / radar 共享 */
interface LinearSeriesBase {
  smooth?: boolean;                       // 默认 false
  lineStyle?: "solid" | "dash" | "dot";   // 默认 "solid"
  width?: number;                         // 默认 2
  marker?: false | MarkerConfig;          // 默认不应用
  nullHandling?: "zero" | "gap" | "connect";  // line/area 默认 "gap"，radar 默认 "connect"
  lineColor?: Color | GradientFill;       // 默认跟随主题色循环；line 的线色 / area+radar 的多边形描边色
}
```

同一图表内多个 line/area/radar 系列若设置了不同的 `nullHandling`，只有**第一个非空值**生效、其余系列跟随；不支持多种空值处理并存。

#### 6.7.4 系列类型

**bar**

> 系列约束：可与 `line / area / scatter / bubble` 自由混排，也可与 `candlestick` 混排；同一图表内 bar 系列数量不限。

```ts
interface BarSeries {
  type: "bar";
  encode: { x: string; y: string };    // 必填
  name?: string;                       // 默认取 encode.y 列名；仅供图例显示
  xAxisIndex?: number;                 // 默认 0；仅 chart.xAxis 为数组时有意义
  yAxisIndex?: number;                 // 默认 0；仅 chart.yAxis 为数组时有意义
  stack?: "value" | "percent";         // 默认不堆叠；"value" 直接求和，"percent" 归一化到 100%
  symbol?: ShapeDef;                   // 默认普通矩形柱；象形柱形状定义（ShapeDef 见 §6.4）
  fill?: Color | GradientFill;         // 默认跟随主题色循环
  border?: Border;                     // 默认不应用
  dataLabels?: DataLabelConfig;        // 默认不显示；content 只取 "value"
}
```

**line**

> 系列约束：可与 `bar / area / scatter / bubble` 自由混排，也可与 `candlestick` 混排。

```ts
interface LineSeries extends LinearSeriesBase {
  type: "line";
  encode: { x: string; y: string };    // 必填
  name?: string;                       // 默认取 encode.y 列名
  xAxisIndex?: number;                 // 默认 0
  yAxisIndex?: number;                 // 默认 0
  dataLabels?: DataLabelConfig;        // 默认不显示；content 只取 "value"
}
```

line 没有面积，故不提供 `fill`；其余曲线类字段见 LinearSeriesBase。

**area**

> 系列约束：可与 `bar / line / scatter / bubble` 自由混排，也可与 `candlestick` 混排。

```ts
interface AreaSeries extends LinearSeriesBase {
  type: "area";
  encode: { x: string; y: string };    // 必填
  name?: string;                       // 默认取 encode.y 列名
  xAxisIndex?: number;                 // 默认 0
  yAxisIndex?: number;                 // 默认 0
  stack?: "value" | "percent" | "stream";  // 默认不堆叠；"stream" = streamgraph（仅 area）
  areaColor?: Color | GradientFill;    // 默认由 lineColor 半透明派生
  dataLabels?: DataLabelConfig;        // 默认不显示
}
```

**堆叠组规则**：同一图表内，**所有设置了 `stack` 的同类型系列自动归入同一堆叠组**，无需显式组标识。同一图表内同类型至多一个堆叠组——所有设置 `stack` 的系列必须取相同值（全 `"value"` / 全 `"percent"` / 全 `"stream"`），混用 → `StackModeMismatchError`；未设置 `stack` 的系列独立显示。需要多个独立堆叠组时拆成多个图表元素。

**`stream` 仅适用于 area**：`value` 归一化 + 中心基线偏移，堆叠区域以 y=0 上下对称，呈 streamgraph 形态。

**scatter**

> 系列约束：可与 `bar / line / area / bubble` 自由混排。

```ts
interface ScatterSeries {
  type: "scatter";
  encode: { x: string; y: string };    // 必填；各系列引用自己的 x/y 列对
  name?: string;                       // 默认取 encode.y 列名
  yAxisIndex?: number;                 // 默认 0
  dataFilter?: { col: string; value: string | number };  // 默认不过滤；可选：配长表分组
  marker?: MarkerConfig;               // 默认 {shape: "circle"}；不能写 false
  fill?: Color | GradientFill;         // 默认跟随主题色循环；作为 marker 的默认填充色（marker.fill 优先）
  border?: Border;                     // 默认不应用；作为 marker 的默认描边（marker.border 优先）
  dataLabels?: DataLabelConfig;        // 默认不显示；content 只取 "value"
}
```

**bubble**

> 系列约束：可与 `bar / line / area / scatter` 自由混排。

```ts
interface BubbleSeries {
  type: "bubble";
  encode: { x: string; y: string; size: string };  // 必填
  name?: string;                       // 默认取 encode.y 列名
  yAxisIndex?: number;                 // 默认 0
  dataFilter?: { col: string; value: string | number };  // 默认不过滤；col 列等于 value 的行作为本系列数据
  sizeScale?: "linear" | "sqrt" | "log";  // 默认 "sqrt"
  sizeRange?: [number, number];        // 默认随图表尺寸自适应；气泡半径范围，单位 px
  fill?: Color | GradientFill;         // 默认跟随主题色循环；气泡填充色
  border?: Border;                     // 默认不应用
  dataLabels?: DataLabelConfig;        // 默认不显示；content 只取 "value"
}
```

**sizeScale**：`sqrt`（默认）让面积与 size 成正比；`linear` 让半径与 size 成正比；`log` 适合数量级差异大的场景。size 为负按 0 处理。多分组用宽表 + null 补齐，每个系列引用自己的 `x/y/size` 列三元组。

**candlestick**

> 系列约束：只能与 `bar / line / area` 混排（常见用法：K 线本体 + 叠加 MA 均线的 line）。

```ts
interface CandlestickSeries {
  type: "candlestick";
  /**
   * encode.open 可选 → 决定渲染模式
   *   提供 open → OHLC K 线（4 系列渲染；实体表达开收方向）
   *   省略 open → HLC 高低收（3 系列渲染；竖线 + 收盘处圆点，无实体）
   */
  encode: { x: string; high: string; low: string; close: string; open?: string };
  xAxisIndex?: number;                 // 默认 0
  yAxisIndex?: number;                 // 默认 0
  upBars?:   { fill?: Color; border?: Border };  // 上涨柱（close > open）样式；仅 OHLC 模式生效
  downBars?: { fill?: Color; border?: Border };  // 下跌柱（close ≤ open）样式；仅 OHLC 模式生效
  wickStyle?: Border;                  // 影线（高低竖线）样式；HLC / OHLC 通用
}
```

**日期列处理**：日期列（如 `"2024-01-01"`）按字符串类目处理，按 `rows` 出现顺序在 x 轴等距排布，自然跳过非交易日。需要按真实日期间隔精确排布时，建议手工用 null 行补齐空交易日。

**pie**

> 系列约束：`series` 数组只能有 1 个元素，不得与其他类型共存。

```ts
interface PieSeries {
  type: "pie";
  encode: { category: string; value: string };  // 必填
  innerRadius?: number;                // 默认 0；[0, 1]；> 0 即环形图
  startAngle?: number;                 // 默认 0（12 点方向）
  fill?: Color | GradientFill | (Color | GradientFill)[];  // 默认跟随主题色循环；数组按切片循环
  border?: Border;                     // 默认不应用
  dataLabels?: DataLabelConfig;        // 默认不显示；content 取 "value" | "percentage" | "category"，默认 "value"
}
```

**角度方向**：固定**顺时针**为正；0° = 12 点位置，90° = 3 点，180° = 6 点，270° = 9 点。

**radar**

> 系列约束：同一图表内允许多个 radar 系列（共用一组辐条），但所有系列类型必须都是 `radar`，不得与其他类型共存。

```ts
interface RadarSeries extends LinearSeriesBase {
  type: "radar";
  encode: { category: string; y: string };  // 必填；category 列放辐条标签
  name?: string;                       // 默认取 encode.y 列名
  areaColor?: Color | GradientFill;    // 默认由 lineColor 半透明派生；多边形填充色
  dataLabels?: DataLabelConfig;        // 默认不显示；content 只取 "value"
}
```

雷达图的辐条轴线、蛛网网格与数值范围（min/max）统一由图表顶层 `spokeAxis` 配置，多系列共享。

**维度列共享约束**：同一图表内所有 radar 系列必须引用同一个 `category` 列（即所有多边形共用同一组辐条标签）。要展示辐条标签不同的雷达图，用多个图表元素。校验器检查：所有 radar 系列的 `encode.category` 必须相同。

**waterfall**

> 系列约束：`series` 数组只能有 1 个元素，不得与其他类型共存。

```ts
interface WaterfallSeries {
  type: "waterfall";
  encode: {
    x: string;              // 类目列
    y: string;              // 数值列（浮动柱放增减量；总计柱放累计总值的绝对量）
    isTotal?: string;       // 默认省略 = 全是浮动柱；指定 bool 列后 true = 总计柱（期初/小计/期末），false/null = 浮动柱
  };
  totalBars?:    { fill?: Color; border?: Border };  // 总计柱（期初/小计/期末，isTotal=true）样式
  increaseBars?: { fill?: Color; border?: Border };  // 浮动上升柱（y > 0）样式
  decreaseBars?: { fill?: Color; border?: Border };  // 浮动下降柱（y < 0）样式
  dataLabels?: DataLabelConfig;  // 默认不显示；content 取 "value" | "category"，默认 "value"
}
```

**配色**：waterfall 不使用 `fill`，按 isTotal 与 y 的正负经 `totalBars` / `increaseBars` / `decreaseBars` 三类映射；所有总计柱（期初/小计/期末）共用 `totalBars`。

**isTotal 语义**：可出现在任意位置（首行 / 中间小计 / 末行都合法）；每个 `isTotal=true` 是独立总计柱，其 y 值应等于「上一总计柱 y + 其间全部浮动柱 y 之和」——不等时校验器输出 `WaterfallTotalMismatchWarning`（首行总计柱的 y 直接定义）。`isTotal` 列只接受 bool 或 null；字符串 `"true"` 或数字 `1` 都 → `InvalidValueError`。

**heatmap**

> 系列约束：`series` 数组只能有 1 个元素，不得与其他类型共存。

```ts
interface HeatmapSeries {
  type: "heatmap";
  encode: { x: string; y: string; value: string };  // 必填；x、y 列必须是类目（字符串），value 为数值
  colorScheme?: Color[];               // 默认回落主题；渐变色带端点
  colorScale?: {
    type?: "linear" | "diverging";     // 默认 "linear"
    domain?: [number, number];         // 默认取数据范围；type=diverging 时默认 [-max(|v|), +max(|v|)]，0 居中
  };
  colorbar?: boolean | LegendConfig;   // 默认 true；色带图例；position 默认 "right"
  dataLabels?: DataLabelConfig;        // 默认不显示
}
```

**配色**：`colorScheme` 作为渐变端点，按 `colorScale.type` 插值——`linear` 要求 `colorScheme` 长度 ≥ 2、端点间插值；`diverging` 要求长度 = 3（低 / 中 / 高），中点由 `domain` 的中点确定，常用于「负-中-正」场景。

**数据排布**：x / y 列固定为类目（字符串）；轴上的类目顺序按 `rows` 首次出现顺序；`rows` 中未出现的 (x, y) 组合视为缺失格，渲染为透明（PPTX 中为底色）。要完整矩阵时，建议显式列出所有 (x, y) 组合、缺失值用 null。

heatmap 不使用 `chart.legend`，由 `colorbar` 取代；`colorbar: false` 即关闭色带条。

**treemap**

> 系列约束：`series` 数组只能有 1 个元素，不得与其他类型共存。

```ts
interface TreemapSeries {
  type: "treemap";
  encode: {
    category: string;   // 节点名列
    value: string;      // 数值列
    parent?: string;    // 父节点列；null/缺省/空串 = 根节点（允许多根）
  };
  levels?: number;                     // 默认显示全部层级
  fill?: Color | GradientFill
       | (Color | GradientFill)[]
       | (Color | GradientFill)[][];   // 默认跟随主题色循环；派生规则见下
  border?: Border;                     // 默认不应用
  dataLabels?: DataLabelConfig;        // 默认不显示；content 取 "value" | "category"，默认 "category"
}
```

**颜色派生规则**：

- `fill: Color | GradientFill`（单值）：所有根节点共用该色；子节点沿 HSL.L 维度逐级降明度 10% 派生（`L_new = max(0, L_old - 10)`）。
- `fill: (Color | GradientFill)[]`（一维数组）：按根节点出现顺序循环；各根节点的子节点仍逐级降明度 10% 派生。
- `fill: (Color | GradientFill)[][]`（二维数组）：外层按根节点循环，内层直接指定各层级（绕过自动派生）；内层数组不够覆盖所有层级时，剩余层级仍按降明度 10% 派生。

**sunburst**

> 系列约束：`series` 数组只能有 1 个元素，不得与其他类型共存。

```ts
interface SunburstSeries {
  type: "sunburst";
  encode: { category: string; value: string; parent?: string };  // 必填
  levels?: number;                     // 默认显示全部层级
  fill?: Color | GradientFill | (Color | GradientFill)[];  // 默认跟随主题色循环；数组按顶层节点循环
  border?: Border;                     // 默认不应用
  dataLabels?: DataLabelConfig;        // 默认不显示；content 取 "value" | "category"，默认 "category"
}
```

**sankey**

> 系列约束：`series` 数组只能有 1 个元素，不得与其他类型共存。

```ts
interface SankeySeries {
  type: "sankey";
  encode: {
    source: string;   // 源节点列
    target: string;   // 目标节点列
    flow: string;     // 流量列
  };
  nodeAlign?: "left" | "right" | "justify";  // 默认 "justify"
  fill?: Color | GradientFill                     // 默认跟随主题色循环（按节点拓扑序取色）
       | (Color | GradientFill)[]                 // 数组按节点循环
       | Record<string, Color | GradientFill>;    // 按节点名映射；未指定的节点回落主题色循环
  border?: Border;                     // 默认不应用
  dataLabels?: DataLabelConfig;        // 默认不显示；content 取 "value" | "category"，默认 "value"
}
```

**图约束**：sankey 限定为**有向无环图（DAG）**；source/target 列构成环时 → `CyclicGraphError`。

**节点次序**：`source` 与 `target` 列去重后按拓扑序排列。`fill` 为数组时按该顺序循环，数组长度 < 节点数时回绕复用、> 节点数时截断；对象形式按节点名精确匹配。

#### 6.7.5 字段速查

**encode 通道**

| 类型 | encode 通道 |
|---|---|
| bar / line / area | `x` + `y` |
| scatter | `x` + `y`（多系列用宽表 + null 补齐） |
| bubble | `x` + `y` + `size`（多系列用宽表 + null 补齐） |
| candlestick | K 线：`x` + `open` + `close` + `low` + `high`；叠加：`x` + `y` |
| pie | `category` + `value` |
| radar | `category` + `y` |
| waterfall | `x` + `y` + 可选 `isTotal`（bool 列） |
| heatmap | `x` + `y` + `value` |
| treemap / sunburst | `category` + `value` + 可选 `parent` |
| sankey | `source` + `target` + `flow` |

**命名约定**：直角坐标系（bar/line/area/scatter/bubble/candlestick/waterfall/heatmap）用 `x` / `y` 表示横/纵轴；非直角的类目字段统一 `category`（pie/radar/treemap/sunburst）；sankey 图边端点用 `source` / `target`。

**颜色机制**

| 类型 | 颜色字段 | 说明 |
|---|---|---|
| bar | `series[].fill` | 柱体填充色 |
| line | `series[].lineColor` | 线色（无面积） |
| area | `series[].lineColor` + `series[].areaColor` | 描边色 + 面积色（面积色省略时由 lineColor 半透明派生） |
| radar | `series[].lineColor` + `series[].areaColor` | 多边形描边 + 填充（同 area） |
| scatter | `series[].fill` / `marker.fill` | 系列级是 marker 默认色；`marker.fill` 优先 |
| bubble | `series[].fill` | 气泡填充色 |
| candlestick | `upBars` / `downBars`（实体填充+描边）+ 各叠加系列自己的 `lineColor`/`fill` | K 线本体按涨跌映射；叠加 line/bar 用自身配色 |
| pie / sunburst / sankey | 单系列的 `fill` 数组，按数据点/节点循环 | 数组长度循环复用 |
| treemap | 单系列的 `fill`（单值 / 一维数组 / 二维数组） | 同 pie 等；子节点沿 HSL.L 维度从父节点递减（`L_new = max(0, L_old - 10)`） |
| heatmap | `series[].colorScheme` + `series[].colorScale` | 渐变色带按值映射；`linear` 端点插值，`diverging` 三色中点对齐 |
| waterfall | `series[].totalBars` / `increaseBars` / `decreaseBars` | 映射为总计 / 上升 / 下降三类；不参与主题色循环 |

**顶层字段适用性**

| 顶层字段 | 适用系列类型 |
|---|---|
| `xAxis` | bar / line / area / scatter / bubble / candlestick / waterfall / heatmap |
| `yAxis` | bar / line / area / scatter / bubble / candlestick / waterfall / heatmap |
| `barWidth` / `barGap` | bar / waterfall（柱布局参数） |
| `categoryGap` | bar / candlestick / waterfall（类目间距参数） |
| `spokeAxis` | radar（含辐条轴线 + 蛛网网格 + min/max） |
| `legend` | bar / line / area / scatter / bubble / candlestick / pie / radar / waterfall |
| `title` | 全部 |
| `dataLabels` | 全部（candlestick：仅对叠加系列生效；K 线本体经 upBars/downBars 表达涨跌） |
| `fontFamily` | 全部 |

**轴单值 vs 数组规则**：副轴永远放在**数值轴所在的一侧**——纵向图用 `yAxis` 数组 + `yAxisIndex`，横向图用 `xAxis` 数组 + `xAxisIndex`。任何系列使用 `xAxisIndex > 0` / `yAxisIndex > 0` 时，对应的 `xAxis` / `yAxis` 必须是数组（长度 ≥ max(index) + 1）。

**类型混排兼容**

```text
bar / line / area / scatter / bubble 可互相自由混排；candlestick 只能与 bar / line / area 混排
```

其余 7 种类型各自独占 series 数组，详细约束见对应小节第一行。

**dataLabels.content 取值**

| 类型 | 允许值 | 默认 |
|---|---|---|
| bar / line / area / scatter / bubble / radar / heatmap | `value` | `value` |
| candlestick（仅叠加系列） | `value` | `value` |
| pie | `value` / `percentage` / `category` | `value` |
| waterfall | `value` / `category` | `value` |
| treemap / sunburst | `value` / `category` | `category` |
| sankey | `value` / `category` | `value` |

写出此表之外的值 → `InvalidValueError`。K 线本体不支持 dataLabels。

#### 6.7.6 示例

**堆叠柱状图**

```yaml
- elementId: c1
  elementType: chart
  bounds: [50, 100, 600, 400]
  data:
    cols: [quarter, revenue, cost]
    rows:
      - [Q1, 120, 220]
      - [Q2, 132, 182]
      - [Q3, 101, 191]
      - [Q4, 134, 234]
  seriesDefaults:
    bar: {stack: value}
  series:
    - type: bar
      encode: {x: quarter, y: revenue}
      name: 营收
      fill: "$primary"
    - type: bar
      encode: {x: quarter, y: cost}
      name: 支出
      fill: "$accent"
```

**折线图（多系列区分）**

```yaml
- elementId: c2
  elementType: chart
  bounds: [50, 100, 600, 400]
  data:
    cols: [month, actual, target, baseline]
    rows:
      - [Jan, 72, 65, 50]
      - [Feb, 85, 70, 50]
      - [Mar, null, 78, 50]
      - [Apr, 90, 82, 50]
  yAxis: {min: 0, max: 100, gridLine: {color: "#f0f0f0"}}
  series:
    - type: line
      encode: {x: month, y: actual}
      name: 实际
      lineColor: "#5470c6"
      lineStyle: solid
      width: 3
      smooth: true
    - type: line
      encode: {x: month, y: target}
      name: 目标
      lineColor: "#ee6666"
      lineStyle: dash
      smooth: true
    - type: line
      encode: {x: month, y: baseline}
      name: 基线
      lineColor: "#999999"
      lineStyle: dot
      width: 1
      marker: false
```

**面积图（stream 堆叠）**

```yaml
- elementId: c3
  elementType: chart
  bounds: [50, 80, 700, 400]
  title: 各渠道流量演变
  data:
    cols: [week, web, app, partner]
    rows:
      - [W1, 200, 120, 80]
      - [W2, 240, 160, 90]
      - [W3, 260, 200, 110]
      - [W4, 280, 240, 130]
  seriesDefaults:
    area: {stack: stream}
  series:
    - type: area
      encode: {x: week, y: web}
      name: Web
      areaColor: "#5470c6"
    - type: area
      encode: {x: week, y: app}
      name: App
      areaColor: "#91cc75"
    - type: area
      encode: {x: week, y: partner}
      name: 合作方
      areaColor: "#fac858"
```

**气泡图（多系列分组）**

```yaml
- elementId: c5
  elementType: chart
  bounds: [50, 80, 700, 420]
  title: 用户分布
  xAxis: {title: 年龄}
  yAxis: {title: "年收入（万）"}
  data:
    cols: [age_s, inc_s, pop_s, age_w, inc_w, pop_w, age_m, inc_m, pop_m]
    rows:
      - [22, 5, 120, 28, 12, 380, 45, 40, 180]
      - [null, null, null, 35, 25, 260, 52, 60, 90]
  seriesDefaults:
    bubble:
      sizeScale: sqrt
      sizeRange: [8, 48]
  series:
    - type: bubble
      encode: {x: age_s, y: inc_s, size: pop_s}
      name: 学生
      fill: "#5470c6"
    - type: bubble
      encode: {x: age_w, y: inc_w, size: pop_w}
      name: 白领
      fill: "#91cc75"
    - type: bubble
      encode: {x: age_m, y: inc_m, size: pop_m}
      name: 管理层
      fill: "#ee6666"
```

**K 线图（叠加 MA5 均线）**

```yaml
- elementId: c6
  elementType: chart
  bounds: [50, 80, 700, 420]
  title: 股价走势
  data:
    cols: [date, open, high, low, close, ma5]
    rows:
      - ["2024-01-01", 100, 110, 95, 108, null]
      - ["2024-01-02", 108, 115, 105, 112, null]
      - ["2024-01-03", 112, 118, 109, 116, null]
      - ["2024-01-04", 116, 120, 110, 113, null]
      - ["2024-01-05", 113, 117, 108, 115, 112.8]
  yAxis: {title: 价格}
  series:
    - type: candlestick
      encode: {x: date, open: open, close: close, low: low, high: high}
      upBars: {fill: "#ee6666"}
      downBars: {fill: "#5470c6"}
    - type: line
      encode: {x: date, y: ma5}
      name: MA5
      smooth: true
      width: 2
      lineColor: "#fac858"
```

**瀑布图**

```yaml
- elementId: c9
  elementType: chart
  bounds: [50, 80, 700, 380]
  title: 现金流瀑布
  data:
    cols: [phase, amount, total]
    rows:
      - [期初余额, 500, true]
      - [销售收入, 300, null]
      - [运营支出, -180, null]
      - [税费, -60, null]
      - [期末余额, 560, true]
  series:
    - type: waterfall
      encode: {x: phase, y: amount, isTotal: total}
      totalBars: {fill: "#5470c6"}
      increaseBars: {fill: "#91cc75"}
      decreaseBars: {fill: "#ee6666"}
      dataLabels: {show: true}
```

**热力图**

```yaml
- elementId: c10
  elementType: chart
  bounds: [50, 80, 700, 420]
  title: 用户活跃热力图
  data:
    cols: [hour, day, count]
    rows:
      - ["00:00", 周一, 5]
      - ["00:00", 周二, 8]
      - ["06:00", 周一, 22]
      - ["12:00", 周一, 45]
  series:
    - type: heatmap
      encode: {x: hour, y: day, value: count}
      colorScheme: ["#ffffff", "#5470c6"]
      colorScale: {domain: [0, 50]}
```

**矩形树图（带层级）**

```yaml
- elementId: c11
  elementType: chart
  bounds: [50, 80, 700, 420]
  title: 预算分配
  data:
    cols: [dept, parentDept, budget]
    rows:
      - [工程部, null, 1000]
      - [前端组, 工程部, 400]
      - [后端组, 工程部, 600]
      - [销售部, null, 800]
  series:
    - type: treemap
      encode: {category: dept, value: budget, parent: parentDept}
      fill: ["#5470c6", "#91cc75"]
```

**桑基图**

```yaml
- elementId: c13
  elementType: chart
  bounds: [50, 80, 800, 420]
  title: 用户转化漏斗
  data:
    cols: [from, to, users]
    rows:
      - [广告投放, 落地页, 10000]
      - [广告投放, 直接搜索, 4000]
      - [落地页, 注册, 3000]
      - [落地页, 流失, 7000]
      - [注册, 首单, 1200]
      - [直接搜索, 首单, 2000]
  series:
    - type: sankey
      encode: {source: from, target: to, flow: users}
      nodeAlign: justify
      fill: ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de"]
```

**seriesDefaults + 混排：柱默认宽 + 线默认平滑**

```yaml
- elementId: c15
  elementType: chart
  bounds: [50, 80, 700, 420]
  data:
    cols: [month, sales, growth]
    rows:
      - [Jan, 120, 0.10]
      - [Feb, 150, 0.25]
      - [Mar, 180, 0.20]
  yAxis:
    - {title: 销售额}
    - {title: 增长率, label: {numberFormat: "0%"}}
  seriesDefaults:
    bar:
      fill: "#5470c6"
    line:
      smooth: true
      width: 2
      lineColor: "#ee6666"
  barWidth: 0.6
  series:
    - type: bar
      encode: {x: month, y: sales}
      name: 销售额
    - type: line
      encode: {x: month, y: growth}
      name: 增长率
      yAxisIndex: 1
```

**横向柱状图（类目轴在 y 侧）**

```yaml
- elementId: c16
  elementType: chart
  bounds: [50, 80, 600, 360]
  title: 各部门人数
  data:
    cols: [dept, headcount]
    rows:
      - [工程部, 120]
      - [产品部, 45]
      - [设计部, 30]
      - [运营部, 60]
  xAxis: {label: {numberFormat: "#,##0"}}
  yAxis: {label: {fontSize: 12}}
  series:
    - type: bar
      encode: {x: headcount, y: dept}
      fill: "$primary"
      dataLabels: {show: true}
```

### 6.8 逆向专属元素字段

逆向方言在元素上额外记录以下字段（均属逆向专属字段集，生成方言出现即 `ProfileViolationError`，见 §2.4）。

```ts
/** 元素级溯源指针 */
interface SourceRef {
  slideIndex: number;   // 源页序号，1 起
  shapeId: number;      // 源形状 id
  partName?: string;    // 源 OPC 部件名
}
```

- `sourceRef: SourceRef` —— 必填。导入器为每个元素生成稳定 elementId：`el-{slideIndex}-{shapeId}`（占位元素为 `ph-{slideIndex}-{shapeId}`，见 §10.2）；`sourceRef` 回指源文件中的页与形状，供增量重导与人工对照。
- `originalName?: string` —— 源形状名称（`<p:cNvPr name>`），如「Rectangle 3」。
- `partName?: string` —— Image 元素与页背景图片记录媒体在源包中的 OPC 部件名（如 `ppt/media/image1.png`）；工程内 `src` 仍指向 `media/` 目录下落盘的副本。
- `builtinStyle?: { id: string }` —— Table 专属：源表格引用的内置表格样式 id（GUID）。显式单元格填充/对齐已按字面量还原，样式表派生的条纹与首行强调不还原，同时记 `table.styleId` 降级条目（§10.1）。
- `imageAdjust?: { brightness?: number; contrast?: number }` —— Image 专属保留字段：记录源图片的亮度/对比度调整（`<a:blip>` 的 lum 属性）。当前导入器不产出。
- `glue?: { start?: { shapeId: number; site: number }; end?: { shapeId: number; site: number } }` —— Line 专属保留字段：连接器两端的粘连记录（`<a:stCxn>` / `<a:endCxn>` 的目标形状 id 与连接点序号）。当前导入器不产出。

**组合（group）**：group 不对应任何 PPTD 元素类型。导入器把子形状展平到页级、保留各自的绝对坐标，容器本身不产生元素；展平失败或容器为空时按未建模元素处理（dropped + 占位回插，见 §10）。

## 7. 动画

动画以**页**为单位：`page.animations` 是一个有序的动画步数组，按数组顺序组成该页的播放序列。词表为 95 个 preset 名（附录 A），分进场（35）/ 强调（24）/ 退场（36）三类；三类仅作组织与生成提示，校验与导出按同一张词表处理。

### 7.1 动画步结构

```ts
interface Animation {
  elementId: string;        // 必填；目标元素
  effect: string | null;    // 必填；95 词表之一；null = 未建模步骤（仅逆向方言，见 §7.6）
  trigger?: "onClick" | "withPrevious" | "afterPrevious";  // 默认 "onClick"
  durationMs?: number | null;  // 默认引擎缺省；> 0；瞬时类禁写（§7.5）
  delayMs?: number;         // 默认 0；≥ 0
  build?: "asOneObject" | "allAtOnce" | "byParagraph";  // 默认引擎缺省；文本分步方式
  // —— 效果选项（适用矩阵见 §7.3）——
  direction?: string;
  orientation?: string;
  inOut?: string;
  shape?: string;
  spokes?: number;
  spinDirection?: string;
  spinDegrees?: number;
  scaleDirection?: string;
  scalePercent?: number;
  transparencyPercent?: number;
  color?: AnimationColor;
  // —— 逆向记录字段（仅逆向方言，见 §7.6）——
  originalEffect?: string;
  presetId?: number | null;
  presetClass?: string | null;
  sequence?: string;
  valueAfterEnd?: string;
  buildLevel?: number | null;
  playable?: boolean;
  editable?: boolean;
}

/** 动画色：纯色，或带颜色变换的对象形 */
type AnimationColor = Color | { color: Color; colorTransforms?: ColorTransform[] };
```

约束：

- `elementId` 必须指向本页 `elements[]` 中存在的元素；指向不存在的元素或占位元素（§10.2）→ `AnimationTargetError`。
- `effect` 不在 95 词表（且非 `null`）→ `UnknownAnimationEffectError`。
- `effect: null` 而未提供 `originalEffect` → `OriginalEffectRequiredError`。

### 7.2 trigger 与编排

`trigger` 决定该步如何启动：

- `onClick`：等待一次单击。单击按动画步出现顺序依次消费——每按一下，播放下一个 `onClick` 步及其随行步骤。
- `withPrevious`：与上一步**同时**启动（上一步指序列中紧邻的前一条）。
- `afterPrevious`：上一步**结束**后自动启动。

页首的 `withPrevious` / `afterPrevious`（前面没有任何步骤时）视为页面加载即自动播放。

### 7.3 选项适用性与取值域

效果选项只允许写在适用的效果上；越表书写是错误（`AnimationOptionNotApplicableError`），从不静默忽略。

| 选项 | 适用效果 |
|---|---|
| `direction` | flyIn, flyOut, wipeIn, wipeOut, peekIn, peekOut, stripsIn, stripsOut |
| `orientation` | blindsIn, blindsOut, randomBarsIn, randomBarsOut, checkerboardIn, checkerboardOut, splitIn, splitOut |
| `inOut` | shapeIn, shapeOut, splitIn, splitOut |
| `shape` | shapeIn, shapeOut |
| `spokes` | wheelIn, wheelOut |
| `spinDirection`, `spinDegrees` | spin |
| `scaleDirection`, `scalePercent` | growShrink |
| `transparencyPercent` | transparency |
| `color` | fillColor, fontColor, lineColor, brushColor, objectColor, colorPulse, growWithColor |

各选项取值域：

| 选项 | 取值域 |
|---|---|
| `direction` | 8 向之一：`top` / `right` / `bottom` / `left` / `topLeft` / `topRight` / `bottomLeft` / `bottomRight`；按效果收窄——flyIn/flyOut 取全部 8 向；wipeIn/wipeOut/peekIn/peekOut 只取 `top` / `right` / `bottom` / `left`；stripsIn/stripsOut 只取 4 个斜向 |
| `orientation` | `horizontal` / `vertical` |
| `inOut` | `in` / `out` |
| `shape` | `circle` / `box` / `diamond` / `plus` |
| `spokes` | 1 / 2 / 3 / 4 / 8 |
| `spinDirection` | `clockwise` / `counterclockwise` |
| `spinDegrees` | > 0 |
| `scaleDirection` | `both` / `horizontal` / `vertical` |
| `scalePercent` | > 0 |
| `transparencyPercent` | [0, 100] |
| `color` | AnimationColor（对象形可带 §5 的 ColorTransform 链） |

取值越域 → `AnimationOptionValueError`。

### 7.4 序列可测定性

`afterPrevious` 要求前一条步骤的结束时刻可测定。前一条属于下列任一情况时结束时刻不可测定，记 warning `AnimationSequenceError`（不阻断校验，但导出该页时失败）：

- `effect: null`（未建模步骤）；
- `playable: false`；
- `build: "byParagraph"`（分段落步数由文本内容决定）；
- `effect ∈ {transparency, boldReveal}`（保持到页末，无结束时刻）。

书写规则：跟在不可测定步骤之后时改用 `withPrevious` 或 `onClick`。

### 7.5 duration 限制

- **瞬时或保持类效果禁写 `durationMs`**：`appear` / `disappear`（瞬时）与 `transparency` / `boldReveal`（保持到页末）写了 `durationMs` → `AnimationDurationNotAllowedError`。
- 其余效果 `durationMs` 必须 > 0。
- **逆向方言**：`durationMs` 必须显式出现——源文件声明了就写数值，未声明写 `null`；整个键缺失 → warning `AnimationDurationRequiredWarning`。

### 7.6 未建模步骤记录（逆向方言）

源文件里无法映射到 95 词表的动画（不在词表的效果、预设参数组合、引擎不支持的动画部件等）不丢弃，以**未建模步骤**落盘：

- `effect: null`（必填）+ `originalEffect: string`（必填，源效果名）；
- `presetId?: number | null` / `presetClass?: string | null`：OOXML 的 presetID / presetClass 原值；
- `sequence?: string`：源序列上下文；
- `valueAfterEnd?: string`：源文件的结束后状态策略；
- `buildLevel?: number | null`：源 build 层级；
- `playable?: boolean`：导出器能否回放该步；`editable?: boolean`：该步能否被编辑操作修改。

这些字段全部是逆向专属（§2.4），生成方言出现 → `ProfileViolationError`。导出时未建模步骤被跳过并计入导出摘要（§7.8）。

### 7.7 生成方言书写纪律

- 每页动画保持**少量、目的明确**：单项内容用 `onClick`，成组出现用 `withPrevious`，讲先后次序用 `afterPrevious`。
- 优先使用无选项效果；必须带选项时严格按 §7.3 的适用表书写。
- 文本逐段出现时，宁可拆成多个文本元素，也不要依赖 `build: "byParagraph"`——它会让后续 `afterPrevious` 不可测定（§7.4）。
- `fillColor` / `lineColor` 的 `build` 只允许 `asOneObject`（否则 `AnimationOptionValueError`）。
- 不要写「先出现再消失」的自抵消序列；需要强调就用强调类效果。

### 7.8 导出开关

deck 级 `export.animations`（§3.2）控制动画写出：

- `auto`（默认）：按每页 `animations` 写 `<p:timing>`；`effect: null` 的未建模步骤跳过并计入导出摘要。
- `off`：不写 `<p:timing>`，全部动画丢弃（不逐页报 warning，只在摘要记一笔）。

## 8. 转场

转场是**页与页之间**的切换效果，分两层：deck 级开关（`export.transition`，两方言通用）与页级记录（`page.transition`，仅逆向方言）。效果词表为 42 个 token（附录 B.1），另有 12 个 `prstTrans` 预设 token（附录 B.2）。

### 8.1 deck 级：export.transition

`export.transition` 控制导出时写出哪些转场（§3.2）：

- `fade`（默认）：全部页面统一写 `fade` 转场。
- `auto`：按策展词表逐页轮换——`fade` → `push(direction: r)` → `wipe(direction: r)` 循环，避免整副片子全是同一种淡入。
- `none`：不写任何转场。`none` 是该字段的哨兵值，**不是**转场效果 token，不可出现在 `page.transition.effect` 中。

**方言差异**：生成方言按上表由 deck 级统一下发（`page.transition` 属逆向专属字段，生成方言出现 → `ProfileViolationError`）。逆向方言一律以**页级记录**为准——源文件没有转场的页保持无转场，不会被套上 deck 级的 fade 妆；此时 `export.transition` 只在 `none` 时起「全部剥掉」的作用。

### 8.2 页级：PageTransition（仅逆向方言）

```ts
interface PageTransition {
  effect: string;              // 必填；附录 B.1 的 42 token 之一，或未建模效果名（须配 unmodeled: true）
  unmodeled?: boolean;         // 默认 false；true = 该效果未建模，导出时跳过该页转场
  speed?: "slow" | "med" | "fast";
  durationMs?: number;
  direction?: string;          // 方向域见 §8.3
  spokes?: number;
  orientation?: "horz" | "vert";
  thruBlack?: boolean;
  pattern?: string;
  isContent?: boolean;
  isInverted?: boolean;
  hasBounce?: boolean;
  preset?: string;             // effect: "prstTrans" 时必填；附录 B.2 的 12 token 之一
  invertX?: boolean;
  invertY?: boolean;
  morphOption?: string;
  advanceOnClick?: boolean;    // 默认引擎缺省；单击换页
  advanceAfterMs?: number;     // 定时自动换页
}
```

校验规则：

- `effect` 缺失或为空串 → `UnknownTransitionEffectError`。
- `effect` 不在 42 token 内：`unmodeled: true` 时记 warning `UnmodeledTransitionWarning`（导出跳过该页转场）；否则 → `UnknownTransitionEffectError`。
- `effect: "prstTrans"` 时 `preset` 必填且必须在 12 个预设 token 内 → 否则 `TransitionPresetRequiredError`。
- `advanceOnClick` 与 `advanceAfterMs` 可同时为真（单击或超时先到先触发）。

### 8.3 direction 域与选项适用范围

`direction` 只允许写在下表列出的效果上，且取值必须落在该效果的方向域内；表外效果写 `direction`、或取值越域 → `TransitionDirectionMismatchError`。

| 效果 | direction 取值域 |
|---|---|
| blinds, checker, comb, randomBar, doors, window | `horz` / `vert` |
| push, wipe, vortex, pan, glitter, prism | `l` / `r` / `u` / `d` |
| cover, pull | `l` / `r` / `u` / `d` / `lu` / `ru` / `ld` / `rd` |
| strips | `lu` / `ru` / `ld` / `rd` |
| ripple | `center` / `lu` / `ru` / `ld` / `rd` |
| switch, flip, ferris, gallery, conveyor, reveal | `l` / `r` |
| zoom, split, warp, flythrough, shred | `in` / `out` |

其余选项只允许写在适用的效果上，越表书写 → `TransitionOptionNotApplicableError`：

| 选项 | 适用效果 |
|---|---|
| `spokes` | wheel, wheelReverse |
| `orientation` | split |
| `thruBlack` | fade, cut, reveal |
| `pattern` | glitter, shred |
| `isContent`, `isInverted` | prism |
| `hasBounce` | flythrough |
| `invertX`, `invertY` | prstTrans |
| `morphOption` | morph |

## 9. 字体嵌入

字体嵌入由 deck 级 `export.fontEmbed`（§3.2）控制：`subset`（默认，子集化嵌入）/ `full`（整字体嵌入）/ `off`（不嵌入）。嵌入产物是 PowerPoint 的 `.fntdata` 部件，保证目标机未装字体时字形不失真。

**字体解析优先级**（逐级回落，找不到给替代建议）：

1. 工程自带：`assets/fonts/` 目录下的字体文件（按字体内部族名匹配，文件名仅作预筛提示）；
2. 用户显式指定的路径；
3. 系统已装字体（Windows 读注册表 Fonts 枚举，POSIX 扫字体目录）。

匹配细节：族名按字体 name 表的 ID 1/16 匹配；字重/斜体槽位按 OS/2.fsSelection（bit0 italic / bit5 bold / bit6 regular）判定，`head.macStyle` 兜底；TTC 逐 face 枚举。

### 9.1 fsType 许可闸

嵌入前逐 face 读 OS/2.fsType 位域并按下表裁决：

| fsType | 处置 |
|---|---|
| `0x0000` Installable / `0x0008` Editable | 直接嵌入 |
| `0x0004` Preview & Print | 嵌入，但 manifest 记只读警告（目标机只可查看/打印，不可编辑） |
| `0x0100` No Subset | 禁止子集化：强制整字体嵌入（即使 `fontEmbed: subset`） |
| `0x0002` Restricted / `0x0200` Bitmap Only | 跳过该 face 并记警告 |
| OS/2 表读不到 | 保守跳过并记警告 |

### 9.2 嵌入管线

1. **TTC 解包**：TTC 先抽出单 face 再处理（TTC 表目录 offset 是文件绝对偏移）。
2. **子集化**：`fontEmbed: subset` 时用 hb-subset 按工程实际用到的字符子集化；`full` 保留整字体。
3. **EOT 封装**：封装为 EOT（Version `0x00020001`）。只封装 glyf 轮廓的 TTF——CFF/OTTO 轮廓的字体跳过并记警告。
4. **部件注入**：写成 `ppt/fonts/fontN.fntdata` 并注入四件套（`[Content_Types].xml` 首条目、演示关系、`<p:embeddedFontLst>` 等）；`fntdata` 部件用 DEFLATE 6 压缩，其余部件保持 stored。
5. **自检**：注入后重新解包核对（selfCheckEmbedded），单个 face 失败 = 跳过该 face 并记警告；全部警告进 `manifest.exportReport`。

**`fontEmbed: off`**：不嵌入任何字体；目标机缺字体时由 PowerPoint 回落替代，并在导出摘要触发 `missingFonts` 警告。

**预览与质检渲染**（工程约束）：预览/质检必须渲染**未嵌字体**的裸字节——LibreOffice 会误用嵌入的子集 EOT 出现字形张冠李戴；嵌入效果只能靠 PowerPoint / WPS 人工核对。

## 10. 逆向保真记录（dropped / degraded）

逆向导入不可能无损：PPTD 未建模的源内容分两级记录——**dropped**（整件丢弃，页面上回插占位元素）与 **degraded**（元素保留，某个特性降级为字面量或省略）。两级都进 `import.report.yml`（§10.3），保证「丢过什么、降过什么」永远可查。

### 10.1 条目模型与词表

```ts
/** 整件丢弃：未建模的源部件 */
interface ReportDroppedEntry {
  page: number;              // 页序号，1 起
  shapeId: number;           // 源形状 id；0 = 不可归属到具体形状（页级/包级部件）
  originalName?: string;     // 源形状名
  originalType: DroppedOriginalType;
  reason: string;            // 丢弃原因（人读）
  placeholder?: { elementId: string; bounds: [number, number, number, number] };  // 回插的占位元素
}

type DroppedOriginalType =
  | "chart"      // 原生图表部件不映射为 chart 元素（chart 仅生成方言，见 §2.4）
  | "smartArt"   // SmartArt 图示
  | "group"      // 组合（子形状展平见 §6.8；展平失败/空组合时容器落此类）
  | "media"      // 音频/视频
  | "ole"        // OLE 嵌入对象
  | "object3d"   // 三维图形
  | "unknown";   // 无法归类

/** 特性降级：元素保留，特性降格 */
interface ReportDegradedEntry {
  page: number;
  elementId: string | null;  // 所属元素；页级损失为 null
  feature: DegradedFeature;
  detail: string;            // 降级说明（人读）
  originalValue?: string;    // 源值摘要
  fallbackValue?: string;    // 落盘的字面量
}

type DegradedFeature =
  | "animation.preset" | "animation.step" | "transition.effect"
  | "theme.colorTransform"
  | "shape.strokeSketch" | "shape.pictureStyle"
  | "image.artisticEffect" | "image.biLevel" | "image.compressionState"
  | "text.bodyRotation" | "text.columns" | "text.autoFit"
  | "background.patternFill"     // 图案填充降级为最接近的 solid/gradient 字面量（§4.1）
  | "table.styleId"              // 内置表格样式：id 记入 builtinStyle（§6.8），派生样式不还原
  | "notes.richText"             // 备注富文本降级为纯文本
  | "hyperlink.clickAction"      // 单击动作超链接不建模
  | "unknown";                   // 词表之外的损失；此时 detail 必填
```

### 10.2 placeholder 占位元素

dropped 的源形状在页面上回插一个 `placeholder` 元素，让人看得见「这里原来有东西」：

```ts
interface Placeholder extends ElementBase {
  elementType: "placeholder";
  originalType: DroppedOriginalType;  // 必填，且必须在上表 7 类内
  originalName?: string;              // 源形状名
  label?: string;                     // 占位上的说明文字；缺省按下表
  labelStyle?: { color?: Color; fontSize?: number };  // 说明文字样式
}
```

- elementId 形如 `ph-{slideIndex}-{shapeId}`；`sourceRef` / `originalName` 按 §6.8 填写。
- `label` 缺省文案：`chart` → 此处原为图表；`smartArt` → 此处原为 SmartArt 图示；`group` → 此处原为组合图形；`media` → 此处原为媒体（音频/视频）；`ole` → 此处原为嵌入对象；`object3d` → 此处原为三维图形；`unknown` → 此处原为未建模元素。
- **对比度闸**：label 文字色对占位底色（默认填充 `#E5E7EB`、默认文字色 `#4B5563`）的 WCAG 相对亮度对比度低于 3:1 → warning `PlaceholderContrastWarning`。
- 生成方言出现 placeholder → `PlaceholderNotAllowedError`；缺 `originalType` 或越类别表 → `PlaceholderFieldError`。

### 10.3 import.report.yml

逆向导入在工程根写 `import.report.yml`，结构：

```ts
interface ImportReport {
  profile: "reverse";
  source: DeckSource;          // 源文件信息（§3.1；含 path / sha1 / slideCount / size / app?）
  summary: {
    pages: number;
    elements: number;
    placeholders: number;
    dropped: number;
    degraded: number;
    unmodeledParts: string[];  // 读到了但未建模的 OPC 部件名
  };
  dropped: ReportDroppedEntry[];
  degraded: ReportDegradedEntry[];
}
```

报告与工程同寿命：增量重导时按 `sourceRef` 对账重写；它是「这份工程相对源文件丢了什么」的唯一权威清单。

### 10.4 源存档与未改页整页恢复

逆向导入把原始 pptx 字节原样落到 `source/original.pptx`，`deck.source` 同时记账：

```ts
interface DeckSource {
  // ……path / sha1 / slideCount / size / app? 见 §3.1……
  archive?: "source/original.pptx";   // 源存档在工程内的相对路径
  originalSha1?: string;              // 存档字节的 sha1（「整轮导入的原子单位」）
}
```

**为什么需要它**：§10.1 的 dropped 条目（chart / SmartArt / OLE 等）在 PPTD 里只有占位，若导出时一律按 PPTD 元素重建，这些部件就永远丢了。源存档让「没动过的页」有机会把原始部件整页带回来。

**导出行为**（fail-closed，永不部分恢复）：

1. `deck.profile === "reverse"` 且 `archive` / `originalSha1` 齐全时才启用本轨；
2. 存档文件必须存在、sha1 与 `originalSha1` 一致、页数与 `deck.pages` 一致；
3. 「未改」判定：该页每个元素仍带 `sourceRef`（`{slideIndex, shapeId}`，见 §6.8）。编辑操作一旦触及内容字段（`content` / `bounds` / `fill` / `notes` 等），整页元素的 `sourceRef` 被清掉（纯溯源字段 `sourceRef` / `originalName` 的修改不触发）；
4. **全部页**均判定未改 → 整份 deck 从存档逐页 `importSlide` 恢复（chart/workbook/notes/media/未知部件原样保留），导出 warnings 记一条恢复说明；
5. 任一条件不满足 → **整份**回退逐页按 PPTD 重建（占位仍是占位，报告已如实记账），warnings 说明回退原因。

存档不参与 `manifest.checksum`，不随编辑变化；`originalSha1` 永远指向「整轮导入」那一刻的源文件。

## 11. 错误码表

校验产物是 `Issue` 数组：

```ts
type IssueLevel = "blocker" | "warning";   // blocker 阻断导出；warning 不阻断，进摘要

interface Issue {
  code: string;        // 下表错误码
  level: IssueLevel;
  message: string;     // 人读描述
  path?: string;       // 点路径定位，如 pages/02.page#elements[3].bounds
  detail?: unknown;    // 结构化补充（如 allowed / actual）
}
```

校验顺序：`schema` 版本闸（§2.0）先于一切——无 `schema: 2` 即 `UnsupportedSchemaError` 并跳过后续校验。

### 11.1 协议与方言

| 错误码 | 级别 | 触发条件 |
|---|---|---|
| `UnsupportedSchemaError` | blocker | 无 `schema: 2`（缺失、非数字或非 2） |
| `UnknownProfileError` | blocker | `profile` 取值不是 `generate` / `reverse` |
| `ProfileViolationError` | blocker | 字段越方言：生成方言出现 `source` / 逆向专属页字段 / 逆向专属元素字段 / 逆向专属动画字段 / icon 与 chart 之外的逆向限制（逆向方言出现 `$key` 主题引用、`pageType`、icon、chart 等） |
| `SourceRequiredError` | blocker | 逆向方言缺 `source` / `source.path` / `source.slideCount` / `source.size` |

### 11.2 deck / export / theme

| 错误码 | 级别 | 触发条件 |
|---|---|---|
| `SchemaError` | blocker | 通用结构错误：`size` 非两个正数、`title` 非字符串、`pages` 非相对路径数组、页路径为绝对路径或含 `..`、`elementId` 缺失/空串/重复、`elementType` 越域、`trigger` 越域、svg 页契约违反（§4.2）等 |
| `ExportFieldValueError` | blocker | `export` 不是对象，或 `fontEmbed` / `transition` / `animations` 取值越域（未知字段只记 warning 并忽略） |
| `UnknownThemeKeyError` | blocker | `$key` 引用不在 `theme` 对应表中 |

### 11.3 元素与占位

| 错误码 | 级别 | 触发条件 |
|---|---|---|
| `PlaceholderNotAllowedError` | blocker | 生成方言出现 `elementType: "placeholder"` |
| `PlaceholderFieldError` | blocker | placeholder 缺 `originalType` 或取值越 §10.1 类别表 |
| `PlaceholderContrastWarning` | warning | placeholder 的 label 文字色对底色对比度低于 3:1（§10.2） |
| `ExplicitGeometryRequiredError` | blocker | 逆向方言元素缺 `bounds`，或缺 `rotation` / `opacity` / `flip` 显式值（R5） |

### 11.4 动画

| 错误码 | 级别 | 触发条件 |
|---|---|---|
| `UnknownAnimationEffectError` | blocker | `effect` 不在附录 A 的 95 词表（且非 `null`） |
| `AnimationTargetError` | blocker | 动画 `elementId` 缺失、指向不存在的元素、或指向占位元素 |
| `OriginalEffectRequiredError` | blocker | `effect: null` 而未提供 `originalEffect` |
| `AnimationOptionNotApplicableError` | blocker | 选项写在 §7.3 适用表之外的效果上 |
| `AnimationOptionValueError` | blocker | 选项取值越域（含 `fillColor` / `lineColor` 的 `build` 非 `asOneObject`） |
| `AnimationDurationNotAllowedError` | blocker | `appear` / `disappear` / `transparency` / `boldReveal` 写了 `durationMs`（§7.5） |
| `AnimationDurationRequiredWarning` | warning | 逆向方言 `durationMs` 键整个缺失（应显式写数值或 `null`） |
| `AnimationSequenceError` | warning | `afterPrevious` 的前一步结束时刻不可测定（§7.4）；导出该页时失败 |

### 11.5 转场

| 错误码 | 级别 | 触发条件 |
|---|---|---|
| `UnknownTransitionEffectError` | blocker | `transition.effect` 缺失/空串，或不在附录 B.1 的 42 token 内且未置 `unmodeled: true` |
| `UnmodeledTransitionWarning` | warning | `unmodeled: true` 的未建模转场；导出跳过该页转场 |
| `TransitionPresetRequiredError` | blocker | `effect: "prstTrans"` 时 `preset` 缺失或越附录 B.2 的 12 token |
| `TransitionDirectionMismatchError` | blocker | 表外效果写了 `direction`，或取值与 §8.3 方向域不匹配 |
| `TransitionOptionNotApplicableError` | blocker | 选项写在 §8.3 适用表之外的效果上 |

### 11.6 图表数据完整性

| 错误码 | 级别 | 触发条件 |
|---|---|---|
| `DuplicateColumnError` | blocker | `data.cols` 中出现重复列名 |
| `EmptyColumnError` | blocker | `data.cols` 中含空字符串 |
| `RowLengthError` | blocker | `rows[i].length !== cols.length` |
| `UnknownColumnError` | blocker | encode 引用的列名不在 `cols` 中 |
| `NonNumericValueError` | blocker | 数值通道列的字符串值无法解析为数字 |
| `StackModeMismatchError` | blocker | 同图表同类型的多个系列 `stack` 取值不一致（§6.7.4 堆叠组规则） |
| `WaterfallTotalMismatchWarning` | warning | waterfall 总计柱 y 值 ≠ 上一总计柱 y + 其间浮动柱 y 之和 |
| `InvalidValueError` | blocker | `isTotal` 列出现 bool/null 之外的值；`dataLabels.content` 越 §6.7.5 取值表 |
| `CyclicGraphError` | blocker | sankey 的 source/target 列构成环（必须为 DAG） |

---

## 附录 A. 动画 preset 词表（95）

**进场（35）**：appear, blindsIn, checkerboardIn, dissolveIn, flyIn, peekIn, randomBarsIn, shapeIn, splitIn, stripsIn, wedgeIn, wheelIn, wipeIn, expandIn, fadeIn, swivelIn, zoomIn, centerRevolveIn, floatIn, growTurnIn, riseUpIn, spinnerIn, basicZoomIn, stretchIn, boomerangIn, bounceIn, creditsIn, curveUpIn, dropIn, flipIn, floatingIn, pinwheelIn, spiralIn, basicSwivelIn, whipIn

**强调（24）**：fillColor, fontColor, growShrink, lineColor, spin, transparency, boldFlash, brushColor, complementaryColor2, contrastingColor, darken, desaturate, lighten, objectColor, pulse, underline, colorPulse, growWithColor, shimmer, teeter, blink, boldReveal, wave, complementaryColor

**退场（36）**：blindsOut, checkerboardOut, disappear, dissolveOut, flyOut, peekOut, randomBarsOut, shapeOut, splitOut, stripsOut, wedgeOut, wheelOut, wipeOut, contractOut, fadeOut, swivelOut, zoomOut, centerRevolveOut, collapseOut, floatOut, shrinkTurnOut, sinkDownOut, spinnerOut, basicZoomOut, boomerangOut, bounceOut, creditsOut, curveDownOut, dropOut, flipOut, floatingOut, pinwheelOut, spiralOut, basicSwivelOut, whipOut, stretchyOut

## 附录 B. 转场词表

### B.1 转场效果 token（42）

blinds, checker, circle, dissolve, comb, cover, cut, diamond, fade, newsflash, plus, pull, push, random, randomBar, split, strips, wedge, wheel, wipe, zoom, flash, flip, flythrough, pan, reveal, shred, switch, wheelReverse, window, prstTrans, morph, conveyor, doors, ferris, gallery, glitter, honeycomb, prism, ripple, vortex, warp

### B.2 prstTrans 预设 token（12）

`effect: "prstTrans"` 时 `preset` 的合法取值：fallOver, drape, curtains, wind, prestige, fracture, crush, peelOff, pageCurlDouble, pageCurlSingle, airplane, origami
