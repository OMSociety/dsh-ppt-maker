# PR2 逆向保真度修复计划

> 触发：syn-academic-v1.pptx 导入后文字格式全丢、SmartArt 消失、占位缺文字标签。
> 目标：让逆向结果「能看」——字体/字号/加粗/对齐/颜色基本保真，SmartArt 有占位提示，母版背景继承正确。

## 三个修复项（按依赖序）

### R1 文本 run 级映射（最优先，直接影响观感）

**现状**：`map.ts:140-170 mapText` 只取 `rec.text`（纯文本拼接），对齐硬编码 `[left, top]`，字体用全局 fonts 兜底。

**修法**（改 `map.ts` + 可能要扩 `read.ts`）：
1. `read.ts` 里对 text 类型 shape 调 `getShapeParagraphs(shape)` + `getShapeRuns(shape, p)` 拿 run 数组；每 run 调 `getShapeRunFormat(shape, p, r)` 拿 font/size/bold/italic/color/underline。
2. 段落级：调 `getShapeParagraphFormat(shape, p)` 拿 align/lineSpacing/spaceBefore/spaceAfter/bullet。
3. 映射进 PPTD content.text 的富文本语法（v3 spec 承继 v2 的 `<p>` `<span style>` `<strong>` `<em>` `<u>` 体系）：
   - paragraph → `<p>`，align → `<p style="text-align:…">`，lineSpacing → lineHeight
   - run.bold → `<strong>`，run.italic → `<em>`，run.underline → `<u>`
   - run.color → `<span style="color:…">`，run.font.size → `<span style="font-size:…px">`，run.font.name → fontFamily
4. 对齐从段落格式读真实值，删掉 `[left, top]` 硬编码。
5. 兜底：run 级读不到时（库不支持）回落当前行为 + degraded 记录「run 级格式丢失」。

**验证**：syn-academic-v1 导入后，标题应有字号差异、加粗文本应保留 `<strong>`、对齐应与原稿一致。

### R2 SmartArt 识别与占位

**现状**：`read.ts` 对 graphicFrame 只判 table/chart，SmartArt（diagram）落进 unknown → 可能被静默跳过。

**修法**（改 `read.ts` + `map.ts`）：
1. 读 `graphicFrame` 的 `a:graphicData` URI：`http://schemas.openxmlformats.org/drawingml/2006/diagram` = SmartArt。
2. 识别后走 dropped 通道（originalType: 'smartArt'）+ 插 placeholder（spec §10.2）。
3. SmartArt 无法转 PPTD 图形（它不是形状树，是逻辑结构），占位文案「此处原为 SmartArt 图示」。
4. 顺带检查 group/ole/media/3d 是否也有静默丢失路径，一并进 dropped。

**验证**：syn-academic-v1 导入后应有 SmartArt 占位框，import.report.yml 有对应 dropped 条目。

### R3 母版/版式背景继承

**现状**：只读 slide.background，母版/版式的背景与占位符样式没继承。

**修法**（改 `read.ts` + `writeProject.ts`）：
1. 读 slideLayout 的 background（slide → layout → master 链）；
2. 版式背景图/色映射进 PPTD page.background；
3. 母版占位符样式（title/body 的默认字体/字号/颜色）作为 theme.textStyles 写进 deck.pptd（v3 生成方言的槽位）。
4. 版式继承关系不可完整还原时（母版有复杂嵌套），取「slide 实际生效的背景」即可，不追求完美继承树。

**验证**：导入后页面背景色/图应与原稿一致，标题/正文的默认字体不应全变 Calibri。

## 不做的事

- 不做 SmartArt 转 PPTD 图形（逻辑结构→图形树是独立大工程，v2 再做）
- 不做动画/转场的逆向映射（PR3 的事）
- 不做母版完整继承树（取最终生效值即可）

## 工作量估算

- R1：2-3 小时（run 级 API 已存在，主要是映射逻辑 + 测试）
- R2：1 小时（URI 判定 + dropped 通道复用）
- R3：1-2 小时（背景链 + theme 槽位）

合计：一个下午的事。完成后逆向结果应该「能看」而不是「能跑」。
