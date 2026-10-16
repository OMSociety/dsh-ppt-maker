# PPTD 方言规格

PPTD（PPT-DSL，PPT 领域专用描述语言）是 PowerPoint 演示文稿的 YAML 抽象层：用 Agent 友好、单页自包含、人可肉眼审查的方式描述、生成与编辑幻灯片，并与 `.pptx` 双向转换。

本文件是 PPTD 的规范性文档（normative document）：以本文件描述的工程结构为准。本文件采用**增量规格**（incremental specification）写法——本版新增与改动的部分在此写全文，上游快照沿用不变的部分以**承继条款**（inheritance clause）点名到 `skills/ppt-maker/reference/pptd.md`（上游 PPTD 快照，2027 行）的具体章节与行号；被点名的上游章节与本文件同等 normative。两者冲突时以本文件为准。

---

## 0. 写法约定

- 结构用 **TS interface** 描述，配**字段表**与**最小 YAML 示例**。
- **默认值**写在 TS 行尾注释 `// 默认: X`；X 可为字面量（`1` / `"rect"` / `[0, 0]`）或描述性短语（`不应用` / `沿继承链回落` / `由引擎按 preset 给出`）。
- **约束**写在 TS 行尾注释或代码块下方，统一用区间/不等式记法（`[0, 1]` / `> 0`）或文字描述。
- **方言归属**：只属于某一方言（dialect）的字段，注释里标 `// 仅逆向方言` 或 `// 仅生成方言`；两方言通用的字段不标。
- **引擎版本锚**：动画与转场词表逐字取自 `@office-kit/pptx@0.24.0` 的类型声明，出处行号在附录 A / 附录 B 标注。PPTD 只暴露**词表**（vocabulary），不暴露引擎 API：引擎更换时由引擎接口层负责词表映射。

承继条款引用格式：`上游 §<章> › <节>（reference/pptd.md:<起>-<止>）`。

---

## 1. 全局约定

### 1.1 语法

承继上游 §1 › Syntax（reference/pptd.md:15-18）：YAML 1.2；`: # { }` 等特殊字符须加引号或用块标量（block scalar）；`content.text` 这类富字段一律用 `|` 块标量独立成块。

### 1.2 坐标系与单位

承继上游 §1 › Coordinate System and Units（reference/pptd.md:20-24）：

- 全部几何与尺寸单位为 **px**，原点 `(0, 0)` 在页面左上角；
- 本规格定义 **1px = 1pt**（`fontSize: 18` 即 PPTX 里的 18pt）；
- 演示文稿默认尺寸 16:9 → `[960, 540]`，4:3 → `[720, 540]`；海报默认尺寸 16:9 → `[1280, 720]`、9:16 → `[720, 1280]`、4:3 → `[1280, 960]`、3:4 → `[960, 1280]`、1:1 → `[1080, 1080]`；
- 元素层叠顺序由 `Page.elements` 数组顺序决定，越靠后层级越高。

本版补充（逆向方言精度口径）：`bounds`、`rotation`、`opacity` 等由 OOXML 单位（EMU / 60000 分之一度）换算而来的值，**保留到小数点后两位**，不做整数取整；换算式 `px = EMU / 12700`（1px = 1pt = 12700 EMU）。

### 1.3 样式优先级与默认值

三条优先级链全部承继上游，本版不改：

| 链 | 承继条款 |
|---|---|
| 文本框内文字样式（六级链） | 上游 §1 › Style Priority › 1（reference/pptd.md:32-53） |
| 表格单元格样式（九级链） | 上游 §1 › Style Priority › 2（reference/pptd.md:55-85） |
| 图表样式（3.1 系列主体色 / 3.2 字体 / 3.3 dataLabels / 3.4 seriesDefaults 合并 / 3.5 `boolean \| Config` 约定） | 上游 §1 › Style Priority › 3（reference/pptd.md:87-139） |

`lineHeight`（倍数）与 `lineHeightPx`（固定 px）互斥、同设时 `lineHeightPx` 优先——承继上游（reference/pptd.md:30）。

本版补充：**逆向方言不参与优先级链回落**。逆向方言要求样式值在导入时解析为字面量（见 §2.3 R2/R4），因此每个样式位置都有显式值；优先级链只在生成方言（以及逆向工程被改写为生成方言后）发挥回落作用。

### 1.4 工程结构

```
<工程目录>/
  deck.pptd            # 主入口（必需；固定此文件名）
  manifest.json        # 工程账本：revision / designSystem / theme / checksum / exportReport（工具层独占写）
  pages/               # 页文件目录，每页一个 .page
    01_cover.page
    02_intro.page
  media/               # 图片等素材（逆向导入按 sha1 去重）
  .history/            # 修订快照（append-only 日志 + revision 游标）
  import.report.yml    # 逆向导入报告（仅逆向工程；见 §10.3）
```

路径规则承继上游 §1 › Multi-File Structure（reference/pptd.md:141-160）：

1. **完全自包含**：所有被引用文件必须位于 `deck.pptd` 所在目录内，禁止引用目录外文件；
2. **只支持相对路径**（相对 `deck.pptd` 所在目录）：`pages/01_cover.page`、`media/image1.jpg`；
3. **素材支持 URL**：`Image.src`、`ImageFill.src` 可为 `https://...`（jpg/jpeg/png/gif）；
4. **主入口必需**：一切加载必须经 `deck.pptd`，单个 `.page` 不能直接交给转换/校验命令。

与上游快照的差别只有一处：主入口文件名固定为 `deck.pptd`（上游允许任意 `<name>.pptd`），因为 `manifest.json` 与 `.history/` 需要稳定的工程根锚点。

---

## 2. 双方言（two profiles）

PPTD 显式区分两个**方言**（dialect）：同一套 schema 的两个子集/超集约束档，由 deck 级 `profile` 字段声明。

| 方言 | 面向 | 核心特征 |
|---|---|---|
| **生成方言**（generation dialect） | Agent 生成新 deck、人改写 | 设计系统槽位（design-system slots）+ 生成语义（generation semantics）：`$key` 主题引用、`pageType` 语义标签、允许字段省略并由引擎/继承链自适应 |
| **逆向方言**（reverse dialect） | 从既有 `.pptx` 导入 | 绝对几何超集（absolute-geometry superset）：几何与样式一律显式字面量、带溯源字段，容纳从 pptx 读到的一切可映射元素与生成方言不产出的字段 |

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

**设计系统槽位**：生成方言的第一等公民是 `Theme`（上游 §3 › Theme，reference/pptd.md:376-392）——`theme.colors` / `theme.textStyles` / `theme.tableStyles` 三张表，页内用 `$<key>` 引用：

| 主题表 | 引用位置 | 示例 |
|---|---|---|
| `colors` | 任意 `Color` 字段 | `$primary` |
| `textStyles` | `TextContent.style` / `Cell.textStyle` | `$title` |
| `tableStyles` | `Table.style` | `$default` |

**生成语义**（generation semantics）：

- G1 **可省略即可自适应**：标 `?` 的对象型图表字段省略等价于 `{}`（承继上游 General Rules 第 5 条，reference/pptd.md:1098）；`fontSize` 省略时文本按链回落、图表按尺寸自适应；坐标轴 `min`/`max` 省略时按数据自适应。
- G2 **`$key` 优先**：颜色/文字样式/表格样式优先写主题引用而非字面量，换设计系统只改 `theme`。
- G3 **语义标签驱动排版**：`Page.pageType`（`cover` / `table_of_contents` / `chapter` / `content` / `final` 或任意自定义串）是语义标签，不影响渲染，供设计系统与质检判断版式惯例。
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
- **R5 溯源字段**。deck 级 `source`（§3.1）、元素级 `sourceRef`（§6.1）记录来源，供质检、工作台与再次导入对账。
- **R6 超集字段可用**。生成方言不产出的字段在逆向方言合法：`placeholder` 元素、`Page.transition`、`Table.builtinStyle`、`Image.imageAdjust`、`Line.glue`、`Page.hidden` / `layoutRef` / `sectionName`、动画未建模步骤记录（§7.6）。
- **R7 不引入自适应语义**。任何依赖"自动适配"的取值在逆向方言必须写显式值；确实无法解析的（例如源图表的自适应字号）不猜测，走 §10 的 dropped / degraded 两级记录。

### 2.4 两方言字段差异总表

| 维度 | 生成方言 | 逆向方言 |
|---|---|---|
| `deck.profile` | `generate`（或省略） | `reverse`（必写） |
| `deck.theme` | 推荐，`$key` 引用的落点 | 可省略；不写 `$key` |
| `deck.source` | 不使用 | 必填（§3.1） |
| `deck.export` | 三字段全可用 | 三字段全可用（`transition` 受页级覆盖，见 §8.2） |
| `bounds` | 必填（上游既有约束） | 必填，且由 EMU 换算、保留两位小数 |
| `rotation`/`opacity`/`flip` | 省略即默认 | 源文件有变换就显式写出 |
| `Color` 取值域 | HEX6 / HEX8 / `$key` | HEX6 / HEX8 / `scheme:<token>`(+`colorTransforms`) |
| `fontFamily` | 设计系统字体名或 `{latin, ea}` | 目标机实装名或 `{latin, ea}` |
| 样式引用 | `style: "$title"` 等 | 内联字面量 |
| `Page.pageType` | 推荐使用 | 不使用（源 pptx 无此概念） |
| `Page.transition` | 不允许（`ProfileViolationError`） | 可选，记录源文件页级转场 |
| `Page.hidden` / `layoutRef` / `sectionName` | 不允许 | 可选 |
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
| generate 档 | `profile` 为 `generate` 或省略 | 上游全部既有约束（承继）+ `$key` 引用必须在 `theme` 中存在 + `export` 字段取值域 + 动画词表与选项适用性（§7.3）+ 不得出现逆向专属字段 |
| reverse 档 | `profile: reverse` | 上游既有约束中**与字面量不冲突**的部分 + R1–R7 全部硬规则 + `placeholder` 字段完整性 + 动画/转场记录字段完整性 + `source` 必填 |

两档共用：图表数据完整性错误码（承继上游 ChartData 约束，reference/pptd.md:1082-1090）、几何出界与文字溢出质检（由规则质检层执行，不属本规格）。错误码总表见 §11。

---

## 3. 主入口 deck.pptd

### 3.1 Presentation

```ts
interface Presentation {
  profile?: Profile;           // 默认 "generate"；见 §2
  title?: string;              // 默认无标题
  size: [number, number];      // 必填，[宽, 高]；推荐值见 §1.2
  customFonts?: CustomFont[];  // 默认不加载自定义字体
  theme?: Theme;               // 生成方言推荐；逆向方言可省
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

承继条款：`CustomFont`（上游 §3 › CustomFont，reference/pptd.md:458-467）、`Theme` / `TextStyleConfig` / `CellStyle` / `TableStyleConfig`（上游 §3 › Theme 及其子节，reference/pptd.md:376-456）全部不变。

> **提示**：`CustomFont.src` 是 Google Fonts CSS URL，离线环境下不可达；导出字体嵌入（§9）只认工程内 `media/fonts/` 与目标机实装字体，不从该 URL 拉取。

**生成方言示例**：

```yaml
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

deck 级新增字段，控制导出产物（`.pptx`）的三项全局行为。三字段互相独立，全部可省，省略即取默认值。

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

承继条款（本版不改）：

| 结构 | 承继条款 |
|---|---|
| `Theme` | 上游 §3 › Theme（reference/pptd.md:376-392） |
| `TextStyleConfig` | 上游 §3 › TextStyleConfig（reference/pptd.md:394-411） |
| `CellStyle` | 上游 §3 › CellStyle（reference/pptd.md:413-427） |
| `TableStyleConfig`（含行/列类别样式规则、`rowOverColumn`） | 上游 §3 › TableStyleConfig（reference/pptd.md:429-456） |
| `CustomFont` | 上游 §3 › CustomFont（reference/pptd.md:458-467） |

---

## 4. 页面文件（.page）

### 4.1 Page

```ts
interface Page {
  pageType?: "cover" | "table_of_contents" | "chapter" | "content" | "final" | string;
                                   // 默认无；仅生成方言使用（语义标签，不影响渲染）
  background?: Fill;               // 默认 {type: solid, color: "#FFFFFF"}
  notes?: string;                  // 默认无；演讲者备注，纯文本
  elements: Element[];             // 必填；越靠后层级越高
  animations?: Animation[];        // 默认无；按数组顺序编排，见 §7
  transition?: PageTransition;     // 仅逆向方言；源文件页级转场记录，见 §8.2
  hidden?: boolean;                // 仅逆向方言，默认 false；源文件里的隐藏页
  layoutRef?: LayoutRef;           // 仅逆向方言；源页所用版式（slide layout）溯源
  sectionName?: string;            // 仅逆向方言；源文件里的节（section）名
}

interface LayoutRef {
  partName: string;                // 版式部件名，如 "ppt/slideLayouts/slideLayout3.xml"
  name?: string;                   // 版式显示名
  type?: string;                   // 版式类型 token（ST_SlideLayoutType），源文件缺失时为 null
  masterPartName?: string;         // 所属母版部件名
}
```

承继条款：`Page` 的五个基础字段（`pageType` / `background` / `notes` / `elements` / `animations`）连同默认值承继上游 §4 › Page（reference/pptd.md:471-501）不变；本版仅新增 `transition` / `hidden` / `layoutRef` / `sectionName` 四个逆向方言专属字段。

`Fill` 承继上游 §2 › Fill（reference/pptd.md:270-325）。逆向方言的页面背景若为图案填充（pattern fill），按 §10.1 记 `background.patternFill` 降级并落到最接近的 solid/gradient 字面量。

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

---

## 5. 共享类型

全部承继上游 §2，本版不改定义（逆向方言对 `Color` 的取值域收窄见 §2.3 R2）：

| 类型 | 承继条款 |
|---|---|
| `Color` | 上游 §2 › Color（reference/pptd.md:165-169） |
| `FontFamily` | 上游 §2 › FontFamily（reference/pptd.md:171-180） |
| `Alignment`（`[HorizontalAlign, VerticalAlign]`） | 上游 §2 › Alignment（reference/pptd.md:182-193） |
| `LineStyle` | 上游 §2 › LineStyle（reference/pptd.md:195-198） |
| `Border` / `BorderSpec`（四边分设与 `null` 清除语义） | 上游 §2 › Border、BorderSpec（reference/pptd.md:200-226） |
| `Shadow` | 上游 §2 › Shadow（reference/pptd.md:228-236） |
| `ColorStop` | 上游 §2 › ColorStop（reference/pptd.md:238-245） |
| `ImageFit` / `ImageCrop` | 上游 §2 › ImageFit / ImageCrop（reference/pptd.md:247-268） |
| `Fill`（solid / gradient / image） | 上游 §2 › Fill（reference/pptd.md:270-325） |

本版新增两个共享类型，供 §7 动画与 §2.3 R2 逆向颜色复用：

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

### 6.0 承继条款（两方言通用）

| 元素 | 承继条款 |
|---|---|
| `ElementBase`（`elementId` / `elementType` / `bounds`） | 上游 §5 › ElementBase（reference/pptd.md:505-519） |
| `Text` + `TextContent` | 上游 §5 › Text、TextContent（reference/pptd.md:521-607） |
| 富文本规则（标签表、`<p>`/`<li>`/`<span>` 的 style 映射、纯文本简写、LaTeX 公式 `\(...\)`） | 上游 §5 › Rich Text Rules（reference/pptd.md:609-709） |
| `Shape`（`shapeName` / `adjustments` / `custom` + `viewBox` + `path` / 镂空方向约定） | 上游 §5 › Shape（reference/pptd.md:711-782） |
| `Line`（`viewBox` / `points` / `curve` / `arrow`） | 上游 §5 › Line（reference/pptd.md:784-828） |
| `Image` + `ShapeDef`（`crop → fit → cropShape` 渲染次序） | 上游 §5 › Image（reference/pptd.md:830-889） |
| `Icon`（`iconName` 形如 `fas:house`，Font Awesome 7.x 免费集） | 上游 §5 › Icon（reference/pptd.md:891-926） |
| `Table` + `Cell`（`columnWidths`/`rowHeights` 比例约束、合并单元格省略规则） | 上游 §5 › Table、Cell（reference/pptd.md:928-1021） |
| `Chart` 全族（13 种 series、`ChartData`、General Rules、`TextStyle` / `LineStyleConfig` / `TitleConfig` / `LegendConfig` / `DataLabelConfig` / `MarkerConfig` / `AxisConfig` / `SeriesDefaults` / `SpokeAxisConfig` / `LinearSeriesBase`、字段速查 5.1–5.5） | 上游 §5 › Chart 及其全部子节（reference/pptd.md:1023-1902） |

`Element` 联合类型扩展为：

```ts
type Element =
  | Text | Shape | Line | Image | Icon | Table | Chart   // 承继上游
  | Placeholder;                                          // 本版新增，仅逆向方言（§10.2）
```

元素类型与方言的可用性：

| 元素 | 生成方言 | 逆向方言 |
|---|---|---|
| `text` / `shape` / `line` / `image` / `table` | 产出 | 产出 |
| `icon` | 产出 | 不产出（源文件里的图标按 `shape`（custGeom）或 `image` 映射） |
| `chart` | 产出 | 不产出（原生图表部件走 dropped + placeholder，见 §10.1） |
| `placeholder` | 不允许 | 产出 |

### 6.1 逆向方言元素扩展

以下字段**仅逆向方言**合法；出现在生成方言工程里报 `ProfileViolationError`。

```ts
/** 溯源（provenance）：所有逆向元素可选带 */
interface ReverseProvenance {
  sourceRef?: SourceRef;
  originalName?: string;       // 源形状名（<p:cSld>/<p:sp> 的 name）
}

interface SourceRef {
  slideIndex: number;          // 源页序号，从 1 起
  shapeId: number;             // 源形状 id（<p:cNvPr id>）
  partName?: string;           // 源部件名，如 "ppt/slides/slide3.xml"
}
```

各类元素的逆向专属字段：

```ts
// Line 扩展：连接关系记录
interface Line extends ElementBase {
  // ...承继上游全部字段（reference/pptd.md:786-800）
  glue?: {                     // 仅逆向方言；连接线（connector）的黏附关系
    fromElementId?: string;    // 起点黏附到的元素（本页 elementId）
    toElementId?: string;      // 终点黏附到的元素
    fromSite?: number;         // 源文件里的连接点索引（<a:stCxn idx>）
    toSite?: number;
  };
}

// Image 扩展：源文件的图像调整
interface Image extends ElementBase {
  // ...承继上游全部字段（reference/pptd.md:833-844）
  imageAdjust?: {              // 仅逆向方言
    brightness?: number;       // 亮度，[-1, 1]，默认 0
    contrast?: number;         // 对比度，[-1, 1]，默认 0
  };
  partName?: string;           // 仅逆向方言；media 部件名，供 sha1 去重与对账
}

// Table 扩展：内置表格样式还原信息
interface Table extends ElementBase {
  // ...承继上游全部字段（reference/pptd.md:931-939）
  builtinStyle?: {             // 仅逆向方言
    id: string;                // 源文件里的表格样式 id（GUID）
    name?: string;             // 样式名（内置样式可解出，如 "Medium Style 2 - Accent 1"）
    flags?: {                  // 源文件里的样式开关（<a:tbl> 属性）
      firstRow?: boolean;
      lastRow?: boolean;
      firstCol?: boolean;
      lastCol?: boolean;
      bandRow?: boolean;
      bandCol?: boolean;
    };
  };
}
```

`builtinStyle` 与承继字段的关系：`builtinStyle` 只服务于**重导出还原**（把源文件的内置样式 id 写回 `<a:tbl>`），渲染与校验一律以 `rows` / `Cell` 的内联字面量为准；两者同时存在时不冲突，`Table.style` 在逆向方言里不写。

不建模的源特性不新增字段，一律走 §10.1 degraded 记录（例如手绘描边、图片艺术效果、文本框体内旋转、多栏文本、图案填充背景、富文本备注）。

---

## 7. 动画（animations）

页级可选数组 `Page.animations`，通过 `elementId` 引用本页 `elements` 中的元素；数组顺序决定动画之间的先后关系，`trigger` 决定每条动画何时开始。

本版的 `effect` 取值域 = 附录 A 的 **95 个 preset**（预设效果），逐字取自 `@office-kit/pptx@0.24.0` 的 `AnimationEffect` 声明（dist/index-WCK8v0WT.d.ts:1403）。preset 编号与行为与桌面参考应用的「进入 / 强调 / 退出」三个效果库一致，因此 PPTD 声明与 OOXML `<p:timing>` 之间不存在翻译层。

### 7.1 Animation

```ts
type AnimationEffect = /* 95 个 token，见附录 A */ string;

type AnimationTrigger = "onClick" | "withPrevious" | "afterPrevious";

type AnimationDirection =
  | "top" | "right" | "bottom" | "left"
  | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

type AnimationOrientation = "horizontal" | "vertical";
type AnimationInOut = "in" | "out";
type AnimationShape = "circle" | "box" | "diamond" | "plus";
type AnimationSpinDirection = "clockwise" | "counterclockwise";
type AnimationScaleDirection = "both" | "horizontal" | "vertical";
type AnimationTextBuild = "asOneObject" | "allAtOnce" | "byParagraph";

/** 颜色强调效果的目标色：主题槽位或 sRGB，可带色彩变换链 */
type AnimationColor =
  | Color
  | { color: Color; colorTransforms?: ColorTransform[] };

interface Animation {
  elementId: string;                       // 必填；必须引用本页已存在的元素
  effect: AnimationEffect;                 // 必填；附录 A 之一（逆向方言可为 null，见 §7.6）
  trigger?: AnimationTrigger;              // 默认 "onClick"
  durationMs?: number;                     // 默认由引擎按 preset 给出；约束 > 0；见 §7.5 例外
  delayMs?: number;                        // 默认 0；约束 >= 0；trigger 条件满足后再等待的时长
  build?: AnimationTextBuild;              // 默认 "asOneObject"；带文字的形状如何分段动画

  // —— 效果选项（Effect Options）：只对适用它的 preset 合法，见 §7.3 ——
  direction?: AnimationDirection;          // fly/wipe/peek/strips 的边或角
  orientation?: AnimationOrientation;      // blinds/randomBars/checkerboard/split 的条带走向
  inOut?: AnimationInOut;                  // shape/split 从中心展开还是向中心收拢
  shape?: AnimationShape;                  // shapeIn/shapeOut 的轮廓
  spokes?: number;                         // wheelIn/wheelOut 的辐条数；取值 1|2|3|4|8
  spinDirection?: AnimationSpinDirection;  // spin 的转向
  spinDegrees?: number;                    // spin 的转角；约束 > 0
  scaleDirection?: AnimationScaleDirection;// growShrink 的缩放轴
  scalePercent?: number;                   // growShrink 的目标尺寸百分比；约束 > 0
  transparencyPercent?: number;            // transparency 的目标不透明度百分比；约束 [0, 100]
  color?: AnimationColor;                  // 颜色强调效果的目标色

  // —— 逆向方言附加记录字段（仅逆向方言，见 §7.6）——
  originalEffect?: string;                 // effect 为 null 时必填：源 preset 的原样标识
  presetId?: number | null;                // 源 <p:cTn presetID>
  presetClass?: string | null;             // 源 <p:cTn presetClass>
  sequence?: "mainSeq" | "interactiveSeq" | "other";  // 源 <p:seq> 的 nodeType
  valueAfterEnd?: "held" | "removed" | "unstated";    // 源行为的 fill 语义
  buildLevel?: number | null;              // 源 <p:bldP build> 的层级
  playable?: boolean;                      // 源步骤能否并入正常点击顺序
  editable?: boolean;                      // 源步骤能否被安全改写
}
```

### 7.2 effect 词表

三类共 95 个 token：入场（entrance）35 个、强调（emphasis）24 个、退出（exit）36 个。入场 preset 把元素放上页面（除 `appear` 外均以 `In` 结尾），退出 preset 把元素移下页面（除 `disappear` 外均以 `Out` 结尾），强调 preset 动画已在页面上的元素、不决定其显隐。全表见附录 A（含易混淆 token 的辨析）。

### 7.3 选项适用矩阵

**给不适用某选项的 preset 传该选项是校验错误，不静默忽略**（`AnimationOptionNotApplicableError`）——静默忽略会让 PPTD 声明读起来像生效了而产物里没有。

| 选项 | 适用 preset | 默认值 |
|---|---|---|
| `direction` | `flyIn` / `flyOut`（8 边/角均可）；`wipeIn` / `wipeOut` / `peekIn` / `peekOut`（4 边）；`stripsIn` / `stripsOut`（4 角） | `bottom`；strips 为 `bottomLeft` |
| `orientation` | `blindsIn` / `blindsOut`、`randomBarsIn` / `randomBarsOut`、`checkerboardIn` / `checkerboardOut`；`splitIn` / `splitOut` | 前三者 `horizontal`；split 为 `vertical` |
| `inOut` | `shapeIn` / `shapeOut`、`splitIn` / `splitOut` | `in`；`shapeOut` 为 `out` |
| `shape` | `shapeIn` / `shapeOut` | `circle` |
| `spokes` | `wheelIn` / `wheelOut` | `1`；取值限 1 / 2 / 3 / 4 / 8 |
| `spinDirection`、`spinDegrees` | `spin` | `clockwise`、`360` |
| `scaleDirection`、`scalePercent` | `growShrink` | `both`、`150` |
| `transparencyPercent` | `transparency` | `50`；取值 `[0, 100]` |
| `color` | `fillColor`、`fontColor`、`lineColor`、`brushColor`、`objectColor`、`colorPulse`、`growWithColor` | Accent 2；`colorPulse` 为 Background 1 |
| `build` | 带文字的形状上的效果；`fillColor` 与 `lineColor` 只动画形状本身，不接受 `allAtOnce` / `byParagraph` | `asOneObject` |

`direction` 命名的是**幻灯片的那条边或那个角**：入场时元素从该边进入，退出时元素朝该边离开。`build` 的三档语义：`asOneObject` = 形状与其文字作为一个效果整体动画；`allAtOnce` = 每段各有一个效果、同时开始；`byParagraph` = 每段各有一个效果、各占一次 `trigger`（默认逐段点击推进）。

### 7.4 trigger 与分组

- `onClick`（默认）：新开一个点击组，等观众下一次点击时播放；
- `withPrevious`：与前一条动画同时开始；
- `afterPrevious`：前一条动画结束后自动开始；
- 页首第一条动画若写 `withPrevious` / `afterPrevious`，它所在的组在进入该页时自动播放（没有前驱可跟随）；
- 要让多个元素一次点击后同时进入：第一条 `onClick`，其余 `withPrevious`；
- 要顺序播放：用 `afterPrevious`。

`afterPrevious` 要求前一条动画的结束时刻可测定。前一条无限持续、未声明时长、重复播放、逐字播放或从其它节点起算时，引擎无法测定，导出失败并回报页号、`elementId` 与原因（`AnimationSequenceError`）；校验器对这类组合先给 warning。

### 7.5 时长默认与例外

- `durationMs` 省略时由引擎按 preset 给出默认时长（桌面参考应用效果库自己的默认值）。本版不枚举各 preset 的默认时长：它是引擎随 preset 模板算出的量，写进规格会与 pin 版本漂移。需要确定时长的场景显式写值。
- 多行为合成的效果（如 `bounceIn`、`teeter`）按整体缩放时长。
- **例外一**：`appear` / `disappear` 是瞬时的，不写计时行为，不接受 `durationMs`；
- **例外二**：`transparency` / `boldReveal` 的效果保持到本页结束，同样不接受 `durationMs`；
- 违反以上两条报 `AnimationDurationNotAllowedError`。
- **逆向方言必须显式写 `durationMs`**（源 timing 树里声明了就照实记录，未声明则写 `null` 并不落该字段），不依赖引擎默认值——这是逆向产物可复算的前提。

### 7.6 逆向方言的动画记录

逆向导入把源页 `<p:timing>` 里的每个动画步骤按**文档顺序**（观众看到的点击顺序）逐条落到 `Page.animations`：

1. 源 preset 在附录 A 词表内 → `effect` 写该 token，选项按 §7.3 落字段；
2. 源 preset 不在词表内（含路径动画、逐字动画等）→ `effect: null` + `originalEffect` 原样保留源标识（preset 名或 `presetId`/`presetClass` 组合串），并在 `import.report.yml` 记 `animation.preset` 降级；
3. `sequence` / `valueAfterEnd` / `buildLevel` / `playable` / `editable` 照源树记录；
4. `playable: false` 的步骤**必须原样展示，不得折进正常点击顺序**——交互序列（`interactiveSeq`，点击绑定形状才触发）折进主序列会在错误时机播放，还会吞掉本该属于主序列的一次点击；
5. `effect: null` 的步骤在导出时跳过（不写 `<p:timing>`），并计入导出摘要的 `animationsSkipped`。它们留在 PPTD 里的作用是「看得见、不静默丢」，不是可重导出。

```yaml
# 逆向方言：一条可重导出的入场 + 一条未建模步骤
animations:
  - elementId: el-3-4
    effect: flyIn
    trigger: onClick
    direction: bottom
    durationMs: 500
    delayMs: 0
    presetId: 2
    presetClass: entr
    sequence: mainSeq
    valueAfterEnd: held
    playable: true
    editable: true
  - elementId: el-3-9
    effect: null
    originalEffect: "presetId=101;presetClass=path"
    trigger: afterPrevious
    durationMs: 2000
    presetId: 101
    presetClass: path
    sequence: mainSeq
    valueAfterEnd: unstated
    playable: false
    editable: false
```

### 7.7 使用纪律（生成方言）

- **默认不加动画**：`Page.animations` 省略是常态；
- 每页保持 1–3 个点击组；
- 优先 `fadeIn` / `flyIn` / `zoomIn` / `wipeIn` 这类简单入场；
- 同一元素不连续叠多个强调效果；
- 强调效果用于「指出重点」，不用于装饰全页。

### 7.8 与 export.animations 的关系

`export.animations: auto`（默认）时，各页 `animations` 按上述规则写出；`off` 时不写任何 `<p:timing>`，PPTD 里的声明原样保留（改回 `auto` 即恢复）。页级不提供动画开关——动画的取舍在 deck 级一次决定，避免逐页配置漂移。

---

## 8. 转场（transition）

### 8.1 deck 级：export.transition

生成方言只有 deck 级转场，取值 `fade`（默认）、`none` 或 `auto`（§3.2）：

- `fade`：对每页写 `<p:transition spd="fast" advClick="1"><p:fade/></p:transition>`；
- `none`：任何页都不写 `<p:transition>`；
- `auto`：对没有页级转场记录的页按固定策展词表逐页轮换 `fade → push(dir=r) → wipe(dir=r)`（同样 `spd="fast"`、`advClick="1"`）。

速度固定 `fast`（0.5 s），不开放配置；`fade` 不启用 `thruBlack`（过黑）。页级差异化转场属逆向方言（§8.2）。

### 8.2 页级：Page.transition（仅逆向方言）

记录源文件页级转场，导出时按原样还原。`export.transition` 与页级记录的关系：页级记录存在时以页级为准；`export.transition: none` 时任何页都不写转场（页级记录同样被忽略）。

```ts
type TransitionEffect = "none" | /* 42 个 token，见附录 B.1 */ string;
type TransitionSpeed = "slow" | "med" | "fast";
type TransitionPreset = /* 12 个 token，见附录 B.2 */ string;
type MorphOption = "byObject" | "byWord" | "byChar";

interface PageTransition {
  effect: string;                // 必填；附录 B.1 之一；源文件里引擎未建模的效果原样保留为字符串并置 unmodeled
  unmodeled?: boolean;           // 默认 false；true 表示 effect 不在附录 B.1 词表内（此时该页转场只读、导出时跳过并记降级）
  speed?: TransitionSpeed;       // 默认 "fast"；0.5s / 0.75s / 1s
  durationMs?: number;           // 可选；毫秒时长（p14:dur 扩展），与 speed 的换算见下
  direction?: string;            // 各 effect 有自己的方向域，见 §8.3；不匹配的配对是校验错误
  spokes?: number;               // wheel / wheelReverse 的辐条数，省略为 4
  orientation?: "horz" | "vert"; // split 的方向
  thruBlack?: boolean;           // fade / cut / reveal 是否过黑
  pattern?: "diamond" | "hexagon" | "strip" | "rectangle";  // glitter（默认 diamond）/ shred（默认 strip）
  isContent?: boolean;           // prism：转的是页面内容而非页面本身
  isInverted?: boolean;          // prism：转向朝内
  hasBounce?: boolean;           // flythrough：结束时回弹
  preset?: TransitionPreset;     // effect 为 "prstTrans" 时必填
  invertX?: boolean;             // prstTrans：左右镜像
  invertY?: boolean;             // prstTrans：上下镜像
  morphOption?: MorphOption;     // morph 的匹配粒度，默认 "byObject"
  advanceOnClick?: boolean;      // 默认 true
  advanceAfterMs?: number;       // 可选；自动翻页毫秒数，省略即只靠点击翻页
}
```

`durationMs` 与 `speed` 的写出口径：`spd` 取不小于该时长的最快档（≤500ms → `fast`，≤750ms → `med`，其余 → `slow`）；时长恰为档位自身值（500 / 750 / 1000ms）时只写 `spd`、不写毫秒扩展；其它时长写 `mc:AlternateContent`（p14 分支带毫秒，fallback 分支只带 `spd`）。逆向方言照源文件记录：源里只有 `spd` 就只写 `speed`，源里有毫秒扩展就写 `durationMs`。

### 8.3 direction 的方向域

| effect | 允许的 direction |
|---|---|
| `blinds` / `checker` / `comb` / `randomBar` / `doors` / `window` | `horz`、`vert` |
| `push` / `wipe` / `vortex` / `pan` / `glitter` / `prism` | `l`、`r`、`u`、`d` |
| `cover` / `pull` | 上述四个 + `lu`、`ru`、`ld`、`rd` |
| `strips` | `lu`、`ru`、`ld`、`rd` |
| `ripple` | `center`、`lu`、`ru`、`ld`、`rd` |
| `switch` / `flip` / `ferris` / `gallery` / `conveyor` / `reveal` | `l`、`r` |
| `zoom` / `split` / `warp` / `flythrough` / `shred` | `in`、`out` |
| 其余 effect | 不接受 `direction` |

方向 token 命名的是**页面的运动方向**，因此桌面参考应用里的「自右侧」（From Right）对应 `l`。effect 与 direction 配对不匹配报 `TransitionDirectionMismatchError`；在不接受方向的 effect 上写 `direction` 同样报错（不静默忽略）。

---

## 9. 字体嵌入（font embedding）

`export.fontEmbed` 控制导出时是否把工程用到的字体嵌进产物。嵌入的实现细节（包内部件、`embeddedFontLst` 位置、注入幂等与自检）属实现层，规格只固定**用户可见的契约**。

### 9.1 fsType 许可闸

嵌入前逐 face 读 OS/2 表的 `fsType` 许可位（按位与判定，不做等值比较）：

| 位 | 名称 | 处置 |
|---|---|---|
| `0x0000` | Installable | 直接嵌入 |
| `0x0002` | Restricted | 跳过该字体 + 警告「许可禁止嵌入，目标机需自行安装」 |
| `0x0004` | Preview & Print | 嵌入 + 只读警告（目标机可查看/打印，编辑受限） |
| `0x0008` | Editable | 直接嵌入 |
| `0x0100` | No Subset | 该 face 强制整字体嵌入（即使 `fontEmbed: subset`） |
| `0x0200` | Bitmap Only | 按 Restricted 同等处理：跳过 + 警告 |

读不到 OS/2 表（罕见，通常是文件损坏）→ 保守处理：跳过嵌入 + 警告。判定结果与跳过原因写入导出摘要与 `manifest.exportReport`。

### 9.2 三档语义

| 档 | 字符集 | 产物体积 | 目标机行为 |
|---|---|---|---|
| `subset`（默认） | 工程全部文本去重（含表格、图表标签、演讲者备注）∪ ASCII 可打印 ∪ 常用中英文标点 ∪ 全半角数字（保底字符集防空页） | CJK 单 face 约 0.3–1.5 MB | 缺字位置显示为豆腐块（tofu）——他人打开后**新增字符会缺字** |
| `full` | 整字体 | CJK 单字重 5–25 MB / face | 可自由编辑新增字符 |
| `off` | 不嵌入 | 最小 | 未装该字体时回落替代字体，触发 `missingFonts` 警告 |

`subset` 档的缺字代价是明确契约的一部分：交付文案必须说明「需要再编辑的场合请用 `fontEmbed: full`，或在目标机安装该字体」。

### 9.3 字体来源与匹配

- 解析优先级：工程 `assets/fonts/` 自带字体 > 用户显式指定路径 > 目标机已装字体 > 失败（报错 + 替代建议清单）；
- **typeface 按名全等匹配**：嵌入声明里的 typeface 与正文 run 的 fontFace 必须同源同串，不一致时 PowerPoint 静默忽略嵌入字体并回落系统字体，因此两者一律取 PPTD 里声明的目标机实装名；
- 槽位（slot）判定：出现粗体即需 bold 槽，粗斜组合需 boldItalic 槽；缺对应 face 文件时只嵌 regular，由 PowerPoint 合成仿粗/仿斜，记 info 级日志；
- TTC（TrueType Collection，如 `msyh.ttc` / `simsun.ttc`）按 face 枚举匹配族名后嵌入对应 face；
- 许可口径：嵌入即随文件再分发，授权责任在用户侧；fsType 一律以运行时实测为准，不设白名单。

### 9.4 导出摘要字段

```yaml
exportReport:
  revision: 7
  fontEmbed:
    mode: subset
    facesEmbedded: 4            # 嵌入 face 数
    skipped: 1                  # 跳过 face 数
    skippedDetail:
      - {typeface: "方正兰亭黑", slot: regular, reason: "许可禁止嵌入（Restricted）"}
    subset:                     # 子集化审计（subset 档）
      - {typeface: "MiSans", slot: regular, beforeBytes: 8122324, afterBytes: 14520}
    rawBytes: 62914560          # 未嵌字体的 pptx 字节数
    finalBytes: 4823119         # 嵌入后最终字节数
    warnings: ["..."]           # fsType 只读/No Subset/解析降级等全部警告
  transition:
    mode: fade
    pagesWritten: 24
  animations:
    mode: auto
    stepsWritten: 31
    stepsSkipped: 2        # effect: null 的未建模步骤
  warnings: 3
```

---

## 10. 逆向导入报告与占位

### 10.1 两级降级记录

| 级 | 含义 | 处置 |
|---|---|---|
| **dropped**（整体跳过） | 元素整体无法映射为 PPTD 元素 | 原位置插 `placeholder`（§10.2），报告记一条 |
| **degraded**（特性降级） | 元素保留，但某些特性丢失或落为近似值 | 元素照常落 PPTD，报告记一条，指明特性、原值与落值 |

dropped 类别（`originalType` 的取值域）：

| originalType | 判定口径 |
|---|---|
| `chart` | 原生图表部件（`<p:graphicFrame>` 里的 chart） |
| `smartArt` | SmartArt 图示部件（`<p:graphicFrame>` 里的 diagram） |
| `group` | 组合形状（`<p:grpSp>`）——展平后子形状若能各自映射，则子形状正常成元素、组合本身不记 dropped；展平不可行（嵌套变换无法解析）时整体记 dropped |
| `media` | 音频 / 视频（`<p:pic>` 带 media 引用、`<a:videoFile>` / `<a:audioFile>`） |
| `ole` | 嵌入对象（OLE，`<p:graphicFrame>` 里的 oleObject） |
| `object3d` | 带三维效果的形状（`<a:sp3d>` / `<a:flatTx>` / 棱台 bevel / 材质 material）——可读但 PPTD 不建模 |
| `unknown` | 其余无法归类的部件 |

degraded 的 `feature` 词表（枚举，机器可校验；表外情形用 `unknown` 并必填 `detail`）：

| feature | 含义 |
|---|---|
| `animation.preset` | 动画步骤的 preset 不在附录 A 词表内（`effect: null`） |
| `animation.step` | 动画步骤不可播放或不可编辑（`playable: false` / `editable: false`） |
| `transition.effect` | 页级转场效果不在附录 B.1 词表内（`unmodeled: true`） |
| `theme.colorTransform` | 主题色带变换链或跟随版式覆盖，无法无损落到单一 HEX |
| `shape.strokeSketch` | 手绘（sketched）描边样式 |
| `shape.pictureStyle` | 图片样式 / 相框效果 |
| `image.artisticEffect` | 图片艺术效果 |
| `image.biLevel` | 图片二值化阈值 |
| `image.compressionState` | 图片压缩状态（源文件里的有损压缩记录） |
| `text.bodyRotation` | 文本框体内文字旋转 |
| `text.columns` | 多栏文本 |
| `text.autoFit` | 自动缩放（autofit）参数无法等价映射 |
| `background.patternFill` | 页面/形状图案填充 |
| `table.styleId` | 内置表格样式 id 无法映射为 `TableStyleConfig`（仅记 `builtinStyle`） |
| `notes.richText` | 演讲者备注含富文本，落为纯文本 |
| `hyperlink.clickAction` | 点击动作（自定义放映、跳转到指定页等）无法等价映射 |
| `unknown` | 表外情形，必填 `detail` |

### 10.2 placeholder：占位元素

dropped 元素在原位置留下一个占位形状（placeholder），使导入后的版面信息不丢失：位置、大小、原来是什么、源文件里叫什么，一眼可见。

```ts
type PlaceholderOriginalType =
  | "chart" | "smartArt" | "group" | "media" | "ole" | "object3d" | "unknown";

interface Placeholder extends ElementBase {
  elementType: "placeholder";        // 仅逆向方言；生成方言出现即报 PlaceholderNotAllowedError
  bounds: [number, number, number, number];
                                     // 必填；原元素解析后的绝对几何（组合取解析后的整体外框）
  originalType: PlaceholderOriginalType;   // 必填；见 §10.1 类别表
  shapeName?: string;                // 默认 "rect"；占位外形，取值同 Shape.shapeName
  fill?: Fill;                       // 默认 {type: solid, color: "#E5E7EB"}（灰底）
  border?: Border;                   // 默认 {style: "dash", width: 1, color: "#9CA3AF"}
  label?: string;                    // 默认按 originalType 生成（见下表）
  labelStyle?: TextStyleConfig;      // 默认 {fontSize: 14, color: "#6B7280", align: [center, middle]}
  originalName?: string;             // 源形状名
  sourceRef?: SourceRef;             // 溯源，见 §6.1
}
```

`label` 默认文案（`label` 省略时按下表生成；显式给值则以给定文案为准）：

| originalType | 默认 label |
|---|---|
| `chart` | 此处原为图表 |
| `smartArt` | 此处原为 SmartArt 图示 |
| `group` | 此处原为组合图形 |
| `media` | 此处原为媒体（音频/视频） |
| `ole` | 此处原为嵌入对象 |
| `object3d` | 此处原为三维图形 |
| `unknown` | 此处原为未建模元素 |

约束：

- placeholder 是**视觉占位**，不承载原元素的数据；原部件字节不进工程目录（需要无损改动源文件时走外科手术模式，直接 patch 后另存，不经 PPTD 往返）；
- placeholder 不作为动画目标：`animations[].elementId` 指向 placeholder 报 `AnimationTargetError`；
- placeholder 参与常规质检（出界、重叠、对比度），其灰底与灰字组合的对比度按 `labelStyle` 实际取值计算；
- 同一源元素只生成一个 placeholder，`elementId` 建议取 `ph-<slideIndex>-<shapeId>`。

```yaml
- elementId: ph-3-12
  elementType: placeholder
  bounds: [83.46, 140.00, 793.07, 330.00]
  originalType: chart
  originalName: "Chart 1"
  label: "此处原为图表：2019—2024 年发文量趋势"
  sourceRef: {slideIndex: 3, shapeId: 12, partName: "ppt/slides/slide3.xml"}
```

### 10.3 import.report.yml

```yaml
profile: reverse
source:
  path: "D:/inbox/thesis-defense.pptx"
  sha1: "9f2c1a7be4d0c8f3a1e6b5d4c3a2918f7e6d5c4b"
  slideCount: 24
  size: [960, 540]
  app: "Microsoft Office PowerPoint"
summary:
  pages: 24
  elements: 318
  placeholders: 6
  dropped: 6
  degraded: 11
  unmodeledParts:
    - "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx"
    - "ppt/media/media1.mp4"
dropped:
  - page: 3
    shapeId: 12
    originalName: "Chart 1"
    originalType: chart
    reason: "原生图表部件不映射为 PPTD 元素"
    placeholder: {elementId: "ph-3-12", bounds: [83.46, 140.00, 793.07, 330.00]}
degraded:
  - page: 5
    elementId: el-5-8
    feature: "shape.strokeSketch"
    detail: "手绘描边样式落为普通实线描边"
    originalValue: "sketched=rough, roughness=2"
    fallbackValue: "{style: solid, width: 1.5, color: '#4B5563'}"
  - page: 9
    elementId: null
    feature: "animation.preset"
    detail: "路径动画不在动画词表内"
    originalValue: "presetId=101;presetClass=path"
```

字段口径：`dropped[].page` 与 `sourceRef.slideIndex` 同为从 1 起的源页序号；`degraded[].elementId` 在降级项无法定位到单个元素时（如页级动画步骤、页面背景）为 `null` 并在 `detail` 里说明；`unmodeledParts` 列工程目录外仍留在源包里、PPTD 不建模的部件名，供后续无损处理时参考。

---

## 11. 校验与错误码

级别：`blocker` = 阻断导出（`ppt_export` 的 `skipCheck` 可绕过）；`warning` = 不阻断，进导出摘要。

### 11.1 方言与 profile

| 错误码 | 触发条件 | 档 | 级别 |
|---|---|---|---|
| `ProfileViolationError` | 字段与所属方言不符：逆向专属字段出现在生成方言（`Page.transition` / `hidden` / `layoutRef` / `sectionName` / `sourceRef` / `builtinStyle` / `imageAdjust` / `glue` / 动画附加字段），或生成方言专属写法出现在逆向方言（`$key` 主题引用、`pageType`） | 两档 | blocker |
| `PlaceholderNotAllowedError` | `profile` 为 `generate`（或省略）的工程里出现 `elementType: "placeholder"` | generate 档 | blocker |
| `ExplicitGeometryRequiredError` | 逆向方言元素缺 `bounds`，或缺少源文件里存在的 `rotation` / `opacity` / `flip` 显式值 | reverse 档 | blocker |
| `SourceRequiredError` | `profile: reverse` 而 `deck.source` 缺失，或 `source.slideCount` / `source.size` 缺失 | reverse 档 | blocker |
| `UnknownProfileError` | `profile` 取值不在 `generate` / `reverse` 内 | 两档 | blocker |

### 11.2 export

| 错误码 | 触发条件 | 级别 |
|---|---|---|
| `ExportFieldValueError` | `export.fontEmbed` / `transition` / `animations` 取值超出各自取值域 | blocker |
| `FontUnavailableError` | `fontEmbed` 非 `off` 而工程用到的字体在三级来源里都解析不到 | blocker（附替代建议清单） |
| `FontEmbedSkippedWarning` | 某 face 因 fsType（Restricted / Bitmap Only）或 OS/2 缺失被跳过 | warning |
| `FontReadOnlyWarning` | 某 face 的 fsType 含 Preview & Print 位，嵌入后目标机编辑受限 | warning |

### 11.3 动画

| 错误码 | 触发条件 | 级别 |
|---|---|---|
| `UnknownAnimationEffectError` | `effect` 不在附录 A 的 95 个 token 内，且不是逆向方言的 `null` | blocker |
| `AnimationTargetError` | `animations[].elementId` 未引用本页已存在元素，或指向 `placeholder` | blocker |
| `AnimationOptionNotApplicableError` | 给不适用该选项的 preset 传了选项（§7.3 矩阵） | blocker |
| `AnimationOptionValueError` | 选项取值超域：`spokes` 不在 1/2/3/4/8、`transparencyPercent` 不在 `[0, 100]`、`spinDegrees`/`scalePercent` ≤ 0、`direction` 超出该 preset 的边/角集合 | blocker |
| `AnimationDurationNotAllowedError` | 对 `appear` / `disappear` / `transparency` / `boldReveal` 写 `durationMs` | blocker |
| `AnimationSequenceError` | `trigger: afterPrevious` 而前一条动画的结束时刻不可测定 | blocker（导出期判定；校验期先给同名 warning） |
| `OriginalEffectRequiredError` | 逆向方言 `effect: null` 而 `originalEffect` 缺失 | blocker |
| `AnimationDurationRequiredWarning` | 逆向方言可映射步骤未显式写 `durationMs` | warning |

### 11.4 转场

| 错误码 | 触发条件 | 级别 |
|---|---|---|
| `UnknownTransitionEffectError` | `Page.transition.effect` 不在附录 B.1 的 42 个 token 内且未置 `unmodeled: true` | blocker |
| `TransitionPresetRequiredError` | `effect: "prstTrans"` 而 `preset` 缺失，或 `preset` 不在附录 B.2 的 12 个 token 内 | blocker |
| `TransitionDirectionMismatchError` | `direction` 与该 effect 的方向域不匹配（§8.3），或在不接受方向的 effect 上写了 `direction` | blocker |
| `TransitionOptionNotApplicableError` | 给不适用该选项的 effect 传了 `spokes` / `orientation` / `thruBlack` / `pattern` / `isContent` / `isInverted` / `hasBounce` / `invertX` / `invertY` / `morphOption` | blocker |
| `UnmodeledTransitionWarning` | 逆向方言页转场 `unmodeled: true`，导出时跳过 | warning |

### 11.5 占位与报告

| 错误码 | 触发条件 | 级别 |
|---|---|---|
| `PlaceholderFieldError` | `placeholder` 缺 `originalType`，或 `originalType` 不在 §10.1 类别表内 | blocker |
| `ImportReportInconsistentError` | `import.report.yml` 的 `summary.dropped` 计数与 `dropped[]` 条数不符，或 `dropped[]` 里声明的 `placeholder.elementId` 在对应页找不到 | blocker |
| `PlaceholderContrastWarning` | 占位标签与占位底色对比度低于质检阈值 | warning |

### 11.6 承继的错误码

图表数据完整性错误码全部承继上游（reference/pptd.md:1082-1090、1309、1598），本版不改：`DuplicateColumnError`、`EmptyColumnError`、`RowLengthError`、`UnknownColumnError`、`NonNumericValueError`、`StackModeMismatchError`、`InvalidValueError`。

---

## 12. 附录

### 附录 A：动画 preset 全表（95 个）

来源：`@office-kit/pptx@0.24.0`，`dist/index-WCK8v0WT.d.ts:1403`（`type AnimationEffect`）。token 逐字抄录，分类按同文件 1388–1401 行的分类说明机械归入（入场以 `In` 结尾、`appear` 除外归入场；退出以 `Out` 结尾、`disappear` 除外归退出；其余归强调）。

**A.1 入场（entrance，35 个）**

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `appear` | 13 | `wipeIn` | 25 | `boomerangIn` |
| 2 | `blindsIn` | 14 | `expandIn` | 26 | `bounceIn` |
| 3 | `checkerboardIn` | 15 | `fadeIn` | 27 | `creditsIn` |
| 4 | `dissolveIn` | 16 | `swivelIn` | 28 | `curveUpIn` |
| 5 | `flyIn` | 17 | `zoomIn` | 29 | `dropIn` |
| 6 | `peekIn` | 18 | `centerRevolveIn` | 30 | `flipIn` |
| 7 | `randomBarsIn` | 19 | `floatIn` | 31 | `floatingIn` |
| 8 | `shapeIn` | 20 | `growTurnIn` | 32 | `pinwheelIn` |
| 9 | `splitIn` | 21 | `riseUpIn` | 33 | `spiralIn` |
| 10 | `stripsIn` | 22 | `spinnerIn` | 34 | `basicSwivelIn` |
| 11 | `wedgeIn` | 23 | `basicZoomIn` | 35 | `whipIn` |
| 12 | `wheelIn` | 24 | `stretchIn` | | |

**A.2 强调（emphasis，24 个）**

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `fillColor` | 9 | `complementaryColor2` | 17 | `colorPulse` |
| 2 | `fontColor` | 10 | `contrastingColor` | 18 | `growWithColor` |
| 3 | `growShrink` | 11 | `darken` | 19 | `shimmer` |
| 4 | `lineColor` | 12 | `desaturate` | 20 | `teeter` |
| 5 | `spin` | 13 | `lighten` | 21 | `blink` |
| 6 | `transparency` | 14 | `objectColor` | 22 | `boldReveal` |
| 7 | `boldFlash` | 15 | `pulse` | 23 | `wave` |
| 8 | `brushColor` | 16 | `underline` | 24 | `complementaryColor` |

**A.3 退出（exit，36 个）**

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `blindsOut` | 13 | `wipeOut` | 25 | `boomerangOut` |
| 2 | `checkerboardOut` | 14 | `contractOut` | 26 | `bounceOut` |
| 3 | `disappear` | 15 | `fadeOut` | 27 | `creditsOut` |
| 4 | `dissolveOut` | 16 | `swivelOut` | 28 | `curveDownOut` |
| 5 | `flyOut` | 17 | `zoomOut` | 29 | `dropOut` |
| 6 | `peekOut` | 18 | `centerRevolveOut` | 30 | `flipOut` |
| 7 | `randomBarsOut` | 19 | `collapseOut` | 31 | `floatingOut` |
| 8 | `shapeOut` | 20 | `floatOut` | 32 | `pinwheelOut` |
| 9 | `splitOut` | 21 | `shrinkTurnOut` | 33 | `spiralOut` |
| 10 | `stripsOut` | 22 | `sinkDownOut` | 34 | `basicSwivelOut` |
| 11 | `wedgeOut` | 23 | `spinnerOut` | 35 | `whipOut` |
| 12 | `wheelOut` | 24 | `basicZoomOut` | 36 | `stretchyOut` |

**A.4 易混淆 token 辨析**（源：同文件 1397–1401 行）

| token | 对应效果库条目 |
|---|---|
| `zoomIn` / `zoomOut` | 「Zoom」：放大的同时淡入 |
| `basicZoomIn` / `basicZoomOut` | 「Basic Zoom」 |
| `floatIn` / `floatOut` | 「Float In」/「Float Out」 |
| `floatingIn` / `floatingOut` | 「Float」的入场与退出 |
| `stretchIn` / `stretchyOut` | 入场与退出的 token 拼写不同，按表原样使用 |
| `swivelIn` / `swivelOut` 与 `basicSwivelIn` / `basicSwivelOut` | 两套 Swivel，按表原样使用 |

### 附录 B：转场全表

来源：`@office-kit/pptx@0.24.0`，`dist/index-WCK8v0WT.d.ts:1269`（`TRANSITION_EFFECTS`）与 `:1282`（`TRANSITION_PRESETS`）。

**B.1 effect（42 个）**

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `blinds` | 15 | `randomBar` | 29 | `wheelReverse` |
| 2 | `checker` | 16 | `split` | 30 | `window` |
| 3 | `circle` | 17 | `strips` | 31 | `prstTrans` |
| 4 | `dissolve` | 18 | `wedge` | 32 | `morph` |
| 5 | `comb` | 19 | `wheel` | 33 | `conveyor` |
| 6 | `cover` | 20 | `wipe` | 34 | `doors` |
| 7 | `cut` | 21 | `zoom` | 35 | `ferris` |
| 8 | `diamond` | 22 | `flash` | 36 | `gallery` |
| 9 | `fade` | 23 | `flip` | 37 | `glitter` |
| 10 | `newsflash` | 24 | `flythrough` | 38 | `honeycomb` |
| 11 | `plus` | 25 | `pan` | 39 | `prism` |
| 12 | `pull` | 26 | `reveal` | 40 | `ripple` |
| 13 | `push` | 27 | `shred` | 41 | `vortex` |
| 14 | `random` | 28 | `switch` | 42 | `warp` |

`"none"` 是引擎层的哨兵值，表示「不写效果元素」，不在上表内；PPTD 里「无转场」由 `export.transition: none` 或不写 `Page.transition` 表达。

**B.2 prstTrans preset（12 个）**

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `fallOver` | 5 | `prestige` | 9 | `pageCurlDouble` |
| 2 | `drape` | 6 | `fracture` | 10 | `pageCurlSingle` |
| 3 | `curtains` | 7 | `crush` | 11 | `airplane` |
| 4 | `wind` | 8 | `peelOff` | 12 | `origami` |

**B.3 speed**

`fast` = 0.5 s（默认）、`med` = 0.75 s、`slow` = 1 s。

### 附录 C：本版新增字段速查

| 位置 | 字段 | 取值 | 方言 |
|---|---|---|---|
| deck | `profile` | `generate`（默认）/ `reverse` | 通用 |
| deck | `export.fontEmbed` | `subset`（默认）/ `full` / `off` | 通用 |
| deck | `export.transition` | `fade`（默认）/ `none` | 通用 |
| deck | `export.animations` | `auto`（默认）/ `off` | 通用 |
| deck | `source` | `DeckSource` | 仅逆向（必填） |
| page | `transition` | `PageTransition` | 仅逆向 |
| page | `hidden` / `layoutRef` / `sectionName` | — | 仅逆向 |
| element | `sourceRef` / `originalName` | `SourceRef` / string | 仅逆向 |
| element | `elementType: "placeholder"` | 见 §10.2 | 仅逆向 |
| line | `glue` | 连接关系 | 仅逆向 |
| image | `imageAdjust` / `partName` | 亮度对比度 / 部件名 | 仅逆向 |
| table | `builtinStyle` | id / name / flags | 仅逆向 |
| animation | `effect` | 附录 A 的 95 token（逆向可为 `null`） | 通用 |
| animation | `trigger` / `durationMs` / `delayMs` / `build` | 见 §7.1 | 通用 |
| animation | `direction` / `orientation` / `inOut` / `shape` / `spokes` / `spinDirection` / `spinDegrees` / `scaleDirection` / `scalePercent` / `transparencyPercent` / `color` | 效果选项，见 §7.3 | 通用 |
| animation | `originalEffect` / `presetId` / `presetClass` / `sequence` / `valueAfterEnd` / `buildLevel` / `playable` / `editable` | 源树记录 | 仅逆向 |

### 附录 D：完整示例

**D.1 生成方言工程**

`deck.pptd`：

```yaml
profile: generate
title: 论文答辩：明清之际的经学转向
size: [960, 540]
theme:
  colors:
    primary: "#7C2D12"
    accent: "#B45309"
    text: "#1F2937"
    bg: "#FFFBF5"
  textStyles:
    title: {fontSize: 36, color: "$primary", bold: true}
    body: {fontSize: 18, color: "$text", lineHeight: 1.6}
    caption: {fontSize: 13, color: "#6B7280"}
  tableStyles:
    default:
      firstRowStyle:
        fill: {type: solid, color: "$primary"}
        color: "#FFFFFF"
        bold: true
      bodyStyles:
        - {fill: {type: solid, color: "#FFFFFF"}}
        - {fill: {type: solid, color: "#FDF6EC"}}
export:
  fontEmbed: subset
  transition: fade
  animations: auto
pages:
  - pages/01_cover.page
  - pages/02_evidence.page
```

`pages/02_evidence.page`：

```yaml
pageType: content
background: {type: solid, color: "$bg"}
notes: 强调刻本数量的年度变化，指表说话
elements:
  - elementId: h2
    elementType: text
    bounds: [60, 40, 840, 48]
    content:
      style: "$title"
      text: 二、证据分布
  - elementId: tbl
    elementType: table
    bounds: [60, 110, 420, 300]
    columnWidths: [0.4, 0.3, 0.3]
    rowHeights: [0.25, 0.25, 0.25, 0.25]
    style: "$default"
    rows:
      - - {text: "年份"}
        - {text: "刻本"}
        - {text: "抄本"}
      - - {text: "1644"}
        - {text: "12"}
        - {text: "31"}
      - - {text: "1661"}
        - {text: "28"}
        - {text: "19"}
      - - {text: "1683"}
        - {text: "47"}
        - {text: "9"}
  - elementId: trend
    elementType: chart
    bounds: [520, 110, 380, 300]
    title: 刻本与抄本此消彼长
    data:
      cols: [year, printed, manuscript]
      rows:
        - [1644, 12, 31]
        - [1661, 28, 19]
        - [1683, 47, 9]
    series:
      - type: line
        encode: {x: year, y: printed}
        name: 刻本
        lineColor: "$primary"
        smooth: true
      - type: line
        encode: {x: year, y: manuscript}
        name: 抄本
        lineColor: "$accent"
        lineStyle: dash
animations:
  - elementId: tbl
    effect: fadeIn
    trigger: onClick
    durationMs: 500
  - elementId: trend
    effect: wipeIn
    trigger: withPrevious
    direction: left
    durationMs: 700
```

**D.2 逆向方言工程**

`deck.pptd`：

```yaml
profile: reverse
title: thesis-defense（导入）
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
  - pages/03.page
```

`pages/03.page`：

```yaml
layoutRef:
  partName: "ppt/slideLayouts/slideLayout2.xml"
  name: "标题和内容"
  type: "obj"
  masterPartName: "ppt/slideMasters/slideMaster1.xml"
sectionName: "第三章"
hidden: false
background: {type: solid, color: "#FFFFFF"}
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
    sourceRef: {slideIndex: 3, shapeId: 4, partName: "ppt/slides/slide3.xml"}
    originalName: "标题 1"
    content:
      fontSize: 32
      color: "#1F2937"
      fontFamily: {latin: "Calibri", ea: "Microsoft YaHei"}
      align: [left, middle]
      wrap: true
      textDirection: horizontal
      text: 3.2 数据采集
  - elementId: el-3-7
    elementType: shape
    bounds: [83.46, 118.00, 371.34, 8.00]
    rotation: 0
    opacity: 1
    flip: [false, false]
    shapeName: rect
    adjustments: []
    fill: {type: solid, color: "scheme:accent1"}
    sourceRef: {slideIndex: 3, shapeId: 7}
    originalName: "Rectangle 3"
  - elementId: el-3-9
    elementType: table
    bounds: [83.46, 140.00, 380.00, 200.00]
    rotation: 0
    opacity: 1
    flip: [false, false]
    columnWidths: [0.34, 0.33, 0.33]
    rowHeights: [0.25, 0.25, 0.25, 0.25]
    builtinStyle:
      id: "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"
      name: "Medium Style 2 - Accent 1"
      flags: {firstRow: true, bandRow: true}
    rows:
      - - {text: "年份", color: "#FFFFFF", bold: true, fill: {type: solid, color: "#4472C4"}}
        - {text: "刻本", color: "#FFFFFF", bold: true, fill: {type: solid, color: "#4472C4"}}
        - {text: "抄本", color: "#FFFFFF", bold: true, fill: {type: solid, color: "#4472C4"}}
      - - {text: "1644"}
        - {text: "12"}
        - {text: "31"}
      - - {text: "1661"}
        - {text: "28"}
        - {text: "19"}
      - - {text: "1683"}
        - {text: "47"}
        - {text: "9"}
    sourceRef: {slideIndex: 3, shapeId: 9}
    originalName: "Table 4"
  - elementId: ph-3-12
    elementType: placeholder
    bounds: [503.46, 140.00, 373.07, 330.00]
    originalType: chart
    originalName: "Chart 1"
    label: "此处原为图表"
    sourceRef: {slideIndex: 3, shapeId: 12, partName: "ppt/slides/slide3.xml"}
animations:
  - elementId: el-3-4
    effect: flyIn
    trigger: onClick
    direction: bottom
    durationMs: 500
    delayMs: 0
    presetId: 2
    presetClass: entr
    sequence: mainSeq
    valueAfterEnd: held
    playable: true
    editable: true
  - elementId: el-3-9
    effect: null
    originalEffect: "presetId=101;presetClass=path"
    trigger: afterPrevious
    durationMs: 2000
    presetId: 101
    presetClass: path
    sequence: mainSeq
    valueAfterEnd: unstated
    playable: false
    editable: false
```

对应 `import.report.yml` 片段：

```yaml
summary: {pages: 1, elements: 4, placeholders: 1, dropped: 1, degraded: 1}
dropped:
  - page: 3
    shapeId: 12
    originalName: "Chart 1"
    originalType: chart
    reason: "原生图表部件不映射为 PPTD 元素"
    placeholder: {elementId: "ph-3-12", bounds: [503.46, 140.00, 373.07, 330.00]}
degraded:
  - page: 3
    elementId: null
    feature: "animation.preset"
    detail: "路径动画不在动画词表内，步骤保留为 effect: null"
    originalValue: "presetId=101;presetClass=path"
```
