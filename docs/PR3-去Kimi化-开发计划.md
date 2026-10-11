# PR 3「去 Kimi 化」开发计划：本地 TS 链路补齐字体嵌入与淡入淡出

> 目标：本地 TS 链路（@office-kit/pptx）支持字体嵌入 + 淡入淡出转场/入场动画，使桌面增强轨道（kimi.com）的全部增量能力本地化，随后弃用该轨道并完成插件改名 dsh-ppt-maker。

## 0. 前提与已核实事实（动手前必读）

本计划撰写时已核对的硬事实（均有实测/源码证据）：

1. **@office-kit/pptx 0.21.0 原生支持转场与元素动画**（已解包核对其 `dist/*.d.ts`）：
   - `setSlideTransition(slide, options)` / `getSlideTransition` / `clearSlideTransition`：`TransitionOptions = { effect, speed?, direction?, orientation?, thruBlack?, advanceOnClick?, advanceAfterMs? }`，`effect` 覆盖 CT_SlideTransition 全部 21 种效果（含 `fade`，`fade` 另有 `thruBlack`）。
   - `setShapeAnimation(shape, { effect, durationMs? })` / `getShapeAnimation` / `clearSlideAnimations` / `findShapesWithAnimation`：v1 支持 `fadeIn | fadeOut | appear | disappear` 四种 preset，`durationMs` 默认 500；多个动画会合并进既有 `<p:timing>` 树并把 cTn id 重排到唯一。
   - **结论：本 PR 不需要手写任何 `<p:transition>` / `<p:timing>` XML**，只需把 deck/.page 的声明映射到这两个 API。
2. **@office-kit/pptx 0.21.0 不支持字体嵌入**（同上，全量 grep 其类型定义）：`setPresentationFonts` / `PresentationFonts` 只是主题字体方案（major/minor 的 latin/ea/cs typeface 名），不含 fntdata 嵌入。**字体嵌入必须自写 zip 后处理**，这是本 PR 唯一的新底层能力。
3. 该库 `savePresentation(pres) => Promise<Uint8Array>` 输出字节流 → 后处理拿得到完整产物；库唯一运行时依赖是 `fflate ^0.8.3` → 后处理直接用同款 fflate 解包/重打包，**不新增 zip 依赖**。库为纯 ESM，`engines: node >=22.18.0`（宿主 Node 版本兼容性属 PR 1 范围，见「风险」节）。
4. 任务书一处需更正：`embedTrueTypeFonts` / `saveSubsetFonts` 是 **`ppt/presentation.xml` 根元素 `<p:presentation>` 的属性**，不在 `presProps.xml`（ECMA-376 CT_Presentation 属性集；ts-pptx 与 pptx-embed-fonts 两个第三方实现均如此写）。
5. 参考实现（仅供借鉴，不直接引为依赖）：`pptx-embed-fonts`（github.com/liyao1520，JSZip+@xmldom 注入四件套）；其「字体转 EOT 字节」的方向经 D0 实测是**正确的**（PowerPoint 的 fntdata 只收 EOT 封装，见「审查修订」第 8 条），但其封装实现未经 PowerPoint 实测，不可引为成功依据；`ts-pptx` 的 `embedFont` 文档（shbernal.github.io/PptxGenJS/embedded-fonts）确认了整字体嵌入、四 face 槽位、typeface 按名匹配等语义。
6. 现有 Python 桌面轨道的转场补丁与校验逻辑（`skills/kimi-ppt/scripts/export_pptx.py` 的 `replace_transition` / `validate_transition_order`，写出 `<p:transition spd="fast" advClick="1"><p:fade/></p:transition>`）是 PR 3 测试断言的直接移植来源；`check_fonts.py` 的注册表枚举与名称归一化逻辑是 TS 字体解析器的移植来源。
7. 仓库现状：`main` = v1.2.0（Python 双轨道），PR 1 的 TS 引擎不在当前 checkout；本计划按任务书描述的 PR 1 架构（ppt_ 工具集、deck.pptd + pages/*.page + assets/ + manifest.json）对接，落地时文件名/路径以 PR 1 实际代码为准。

---

## 1. OOXML embeddedFont 完整技术规格

### 1.1 包内部件（zip 层面）

| 部件 | 内容 |
|---|---|
| `ppt/fonts/fontN.fntdata` | 字体二进制，**EOT（Embedded OpenType）封装字节**（D0 实测：PowerPoint 走 t2embed `TTLoadEmbeddedFont`，只收 EOT；裸 TTF/OTF 均报「一般错误」；真件为 MicroType 压缩子集 EOT，flags=0x05）。N 从 1 递增、不与已有部件重名即可 |
| `[Content_Types].xml` | 新增一条 `<Default Extension="fntdata" ContentType="application/x-fontdata"/>`（已存在则跳过，幂等） |
| `ppt/_rels/presentation.xml.rels` | 每个 face 一条 `<Relationship Id="rIdX" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/fontN.fntdata"/>`；rId 扫描现有 Id 取 max+1 起分配，防冲突 |
| `ppt/presentation.xml` | 根元素属性 + `p:embeddedFontLst` 声明，见下 |

### 1.2 presentation.xml 声明

根元素属性：

```xml
<p:presentation ... embedTrueTypeFonts="1" saveSubsetFonts="1">
```

- `embedTrueTypeFonts="1"`：声明本文件含嵌入字体。**没有它，PowerPoint 下次另存时会静默删除全部嵌入字体**（ts-pptx 文档明示）。
- `saveSubsetFonts`：`"1"` = 嵌入的是子集；`"0"` = 整字体。必须与实际嵌入内容一致（PowerPoint 另存时按此位决定是否重新子集化）。

`p:embeddedFontLst` 结构（每个字族一项，每族最多 4 个 face 槽位）：

```xml
<p:embeddedFontLst>
  <p:embeddedFont>
    <p:font typeface="MiSans"/>            <!-- 可迭 panose 属性，可省略 -->
    <p:regular r:id="rId101"/>             <!-- 四槽位均可选，顺序固定 -->
    <p:bold r:id="rId102"/>
    <p:italic r:id="rId103"/>
    <p:boldItalic r:id="rId104"/>
  </p:embeddedFont>
</p:embeddedFontLst>
```

**元素顺序（CT_Presentation 子元素序列，错序会被 PowerPoint 判为「需要修复」）**：
`sldMasterIdLst → notesMasterIdLst → handoutMasterIdLst → sldIdLst → sldSz → notesSz → smartTags(废弃) → embeddedFontLst → custShowLst → photoAlbum → custDataLst → kinsoku → defaultTextStyle → modifyVerifier → extLst`。实操规则：**插到 `notesSz` 之后、`defaultTextStyle` 之前**（库生成的 presentation.xml 通常有 defaultTextStyle，以此为锚最稳）。

**按名匹配规则（最重要的坑）**：PowerPoint 按 `<p:font typeface="...">` 与正文 run 的 fontFace **字符串全等**匹配嵌入字体；不一致则静默忽略嵌入字体、回落系统字体。因此 typeface 一律写 .pptd 里声明的**目标机实装名**（与 check_fonts 口径一致），嵌入声明与 run 引用同源同串。

### 1.3 fsType 许可位（OS/2 表）

读取方法（纯 TS，约 40 行，无需第三方字体库）：

1. TTF/OTF：文件头 `sfntVersion`(4B) + `numTables`(uint16 BE @4)；表目录自偏移 12 起，每条 16B：`tag(4) | checksum(4) | offset(4) | length(4)`；找 `tag === "OS/2"`，`fsType = uint16BE @(tableOffset + 8)`。
2. TTC：头 `tag === "ttcf"`，`numFaces`(uint32 @8)，偏移数组自 12 起；每个 face 有自己的表目录，按上面同样方法读各自的 OS/2。
3. WOFF/WOFF2 需先解包为 sfnt 再读（子集化链路本身会产出 sfnt，fsType 检查放在子集化之前的原始文件上）。

位含义（可按位组合，判定一律用位与，禁止等值比较）：

| 位 | 名称 | 含义与处置策略 |
|---|---|---|
| 0x0000 | Installable | 可嵌入、可编辑。直接嵌入 |
| 0x0002 | Restricted | **禁止嵌入**。跳过该字体，导出摘要+manifest 记 warning「许可禁止嵌入，目标机需自行安装」 |
| 0x0004 | Preview & Print | 可嵌入但目标机只能查看/打印（PowerPoint 会限制编辑）。默认仍嵌入，manifest 记只读警告 |
| 0x0008 | Editable | 可嵌入、可编辑。直接嵌入 |
| 0x0100 | No Subset | 嵌入时**禁止子集化** → 强制整字体嵌入（与 0x0004/0x0008 组合出现） |
| 0x0200 | Bitmap Only | 只允许嵌入位图 → 按 Restricted 同等处理（跳过+警告） |

读不到 OS/2 表（极小概率，如损坏文件）→ 保守处理：跳过嵌入 + 警告。

---

## 2. @office-kit/pptx 输出的字体嵌入后处理方案

### 2.1 流水线位置

```
PR1 引擎构建 PresentationData
  → savePresentation(pres) : Uint8Array        （库产物，无嵌入字体）
  → embedFontsPostProcess(bytes, fontPlan)     （本 PR 新增模块）
  → 写盘 / 交付
```

`ppt_export` 每次导出都重走后处理（幂等、不依赖库保留未知部件），`ppt_edit` 编辑会话不需要感知嵌入字体。

### 2.2 依赖选型

| 用途 | 选型 | 理由 |
|---|---|---|
| zip 解包/重打包 | `fflate`（`unzipSync` / `zipSync`） | 已是 @office-kit/pptx 的运行时依赖，零新增；同步 API、体积小、速度快 |
| XML 编辑 | `@xmldom/xmldom`（新增约 60KB） | 纯 JS、无原生依赖；`createElement("p:embeddedFont")` 直接带命名空间前缀即可挂到已声明 p: 前缀的文档里。**不引 JSZip**（体积大且与 fflate 重复） |
| fsType / name 表 / TTC 解析 | 自写最小解析器（见 §1.3、§3） | 40–80 行，免去 opentype.js/fontkit 这类重依赖；opentype.js 对 TTC 支持还差 |

重打包注意： `[Content_Types].xml` 放第一个 zip 条目（OPC 惯例，防御性）；fntdata 用 DEFLATE level 6 即可（字体本就高熵，收益小，但不压白不压）；其余部件原样回写，不重编码 XML 文本以外的任何字节。

### 2.3 注入步骤（`embedFontsPostProcess` 内部，全部幂等）

输入：`fontPlan = Array<{ typeface, slot: 'regular'|'bold'|'italic'|'boldItalic', bytes: Uint8Array, subsetted: boolean }>`（由 §3 的字体解析 + §4 的子集化产出）。

1. `unzipSync(bytes)` 得到部件表；断言 `ppt/presentation.xml`、`ppt/_rels/presentation.xml.rels`、`[Content_Types].xml` 三件套存在。
2. `[Content_Types].xml`：DOM 解析，查 `Default[@Extension="fntdata"]`，无则插入。
3. `presentation.xml.rels`：DOM 解析，收集现有 Id 集，按 max 数值后缀 +1 起为每个 face 分配新 rId；追加 font Relationship。
4. 写 `ppt/fonts/fontN.fntdata`（N 取现有 `ppt/fonts/` 下最大序号 +1 起）。
5. `presentation.xml`：DOM 解析；根元素置 `embedTrueTypeFonts="1"`、`saveSubsetFonts = 存在子集 face ? "1" : "0"`；查 `p:embeddedFontLst`，无则按 §1.2 顺序规则插入；同 typeface 复用已有 `p:embeddedFont` 条目只补缺槽位，新 typeface 新建条目（槽位固定顺序 regular→bold→italic→boldItalic）。
6. `zipSync` 重打包，返回字节。

### 2.4 自检（后处理收尾必做，失败即导出失败）

1. 重新 `unzipSync` 产物，断言：fntdata 部件数 == fontPlan 行数；每个 fntdata 头是合法 sfnt（`00 01 00 00` / `OTTO` / `true`）。
2. 断言 rId 双向引用一致（rels 有且仅有被引用的条目；embeddedFontLst 引用的 rId 全部存在）。
3. 断言 `embeddedFontLst` 位置：`notesSz` 之后、`defaultTextStyle`（若存在）之前。
4. 用库的 `loadPresentation(产物)` 回读一遍，确认引擎自身能解析（最低成本的 schema 冒烟）。

---

## 3. 字体来源与选择策略

### 3.1 字体使用清单收集

遍历 deck 收集全部 typeface（输出 `Map<typeface, Set<slot>>`）：

- `deck.pptd` → `theme.textStyles[*].fontFamily`（string 或 `{latin, ea}` 两键都收）；
- `pages/*.page` → 各元素 `content.fontFamily`（text/shape 内文本/table cell 的 textStyle 内联 fontFamily）；
- chart 各子组件 fontFamily（TitleConfig / LegendConfig / DataLabelConfig / AxisConfig.label 等，见 `reference/pptd.md` 的 chart 优先级链）；
- slot 判定：粗体出现即需要 bold 槽（bold+italic 组合 → boldItalic；italic → italic）。无对应 face 文件时只嵌 regular，PowerPoint 会合成仿粗/仿斜，可接受并记 info 级日志。

### 3.2 typeface → 字体文件解析（`font-resolver.ts`，移植 check_fonts.py 逻辑）

优先级：**工程 `assets/fonts/` 自带字体 > 用户显式指定路径 > 系统已装字体 > 失败（报错 + 替代建议）**。

- Windows 系统字体：`child_process` 调 `reg.exe query` 读 `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts` 与 HKCU 同键（移植现有 Python 逻辑：值名去 `(TrueType)` 后缀归一化、词边界匹配；HKLM 相对文件名落 `%SystemRoot%\Fonts`，HKCU 落 `%LOCALAPPDATA%\Microsoft\Windows\Fonts`）。
- macOS/Linux：扫现有 `FONT_DIRS` 同款目录列表（`/usr/share/fonts`、`/Library/Fonts`、`~/Library/Fonts` 等），解析 name 表建「族名 → 文件」索引。
- name 表解析（自写）：读 nameID 1（Family）/ 16（Typographic Family，优先）建族名索引；读 nameID 2（Subfamily）+ OS/2.fsSelection（bit0 italic / bit5 bold / bit6 regular）+ head.macStyle 判定该文件属于哪个 slot。
- **TTC 必须支持**（微软雅黑 `msyh.ttc`、宋体 `simsun.ttc` 都是 TTC，中文 Windows 绕不开）：解析 ttcf 头枚举 face，按 name 表匹配目标族名；嵌入时**提取单 face 重建独立 TTF**——复制该 face 的表目录与被引用的表数据，重算各表 checksum 与 `head.checkSumAdjustment`（约 60 行；若走子集化链路，hb-subset 直接输出单 face sfnt，天然绕过此问题）。
- 解析失败/缺失：沿用现有交互——列出缺失清单 + 本地替代建议（移植 `ALTERNATIVES` 表），由 ppt_check/导出摘要呈现，用户确认后改 .pptd。

### 3.3 fsType 策略（导出时逐 face 执行）

按 §1.3 表格：Restricted/BitmapOnly → 跳过+警告；Preview&Print → 嵌入+只读警告；NoSubset 位 → 该 face 禁用子集化。全部判定结果写入导出摘要与 `manifest.json`（随 revision 落账，可追溯）。

### 3.4 许可口径

嵌入即随文件再分发，授权责任在用户侧；SKILL.md 补一句提示。内置设计系统推荐的免费商用字体（MiSans / 思源系 / 阿里妈妈系 / 站酷 / LXGW 等）一般 fsType=0，但**一律以运行时实测 fsType 为准**，不写死白名单。

---

## 4. 字体子集化

### 4.1 为什么必须做

整字体体积（需在 spike 实测复核）：CJK 字体单字重通常 5–25 MB（思源黑体 OTF ≈8 MB、微软雅黑 ≈15 MB、LXGW 文楷 >20 MB）；西文字体 100–500 KB。一套 deck 常用 2–4 个字族 × 1–2 个槽位，整字体嵌入会把 .pptx 推到几十 MB。20 页中文 deck 去重字符通常 800–2000 个，子集后每 face 约 0.3–1.5 MB，**体积降一个数量级**。

### 4.2 方案

- **方案 A（默认，纯 TS）**：`subset-font@2.9.0`（harfbuzzjs 的 wasm 构建做 hb-subset，无原生依赖，支持 TTF/OTF；TTC 输入与 CFF 输出在 spike 验证）。字符集 = deck 全部文本去重（含表格、图表标签、备注）∪ ASCII 可打印 ∪ 常用中英文标点 ∪ 数字全半角，保底字符集防空页/后补字符。
- **方案 B（保底）**：Python `fonttools` 的 `pyftsubset`（Python 备选链路本来就有环境）；wasm 方案在任何字体上失败时对该 face 降级到 B，B 也失败则整字体嵌入 + 警告。
- **不子集的情形**：fsType 带 NoSubset 位；用户在 deck.pptd 声明 `fontEmbed: full`；子集化异常回退。

### 4.3 配置面（建议 deck.pptd 新增）

```yaml
export:
  fontEmbed: subset   # subset(默认) | full | off
  transition: fade    # fade(默认) | none；speed 固定 fast 对齐现状
  animations: auto    # auto(默认，按 .page 的 animations 字段) | off
```

### 4.4 已知代价（如实写进文档）

子集化后他人在 PowerPoint 里**新增字符会豆腐块**——PowerPoint 自己的「仅嵌入演示文稿中使用的字符」默认选项同样如此，属可接受行为；交付文案说明，需要再编辑的场景建议 `fontEmbed: full` 或目标机装字体。

---

## 5. 淡入淡出转场 + 元素入场动画

### 5.1 转场（页面级 fade）

用原生 API，与现有桌面轨道产物语义逐项对齐：

| 现 `export_pptx.py` 产物 | @office-kit/pptx 调用 |
|---|---|
| `<p:transition spd="fast" advClick="1"><p:fade/></p:transition>` | `setSlideTransition(slide, { effect: 'fade', speed: 'fast', advanceOnClick: true })` |

实现位置：PR 1 引擎的 page→SlideData 构建层，按 deck 级 `export.transition` 配置对每页统一调用（未来要页级差异化时把该字段下沉到 .page）。库内部保证 CT_Slide 子元素顺序（`cSld → clrMapOvr → transition → timing`），无需手工排顺序；不写 `p14:dur`（PowerPoint 2010+ 的毫秒时长扩展），speed 三档与现状对齐即可。

### 5.2 元素入场动画（fadeIn）

- `.page` 的 `animations` 字段（PPTD 规范已有，本地轨道此前忽略）映射为 `setShapeAnimation(shape, { effect: 'fadeIn', durationMs })`，默认 500ms；`fadeOut/appear/disappear` 顺带支持（同一 API 的零成本枚举）。
- 库会把多次调用合并进同一 `<p:timing>` 树并重排 cTn id，多元素顺序动画（点击依次出现）按数组顺序追加即可。
- 默认策略沿用现状纪律：**默认不加动画**（`animations: auto` 时只认 .page 显式声明），每页 1–3 组，优先 fade。

### 5.3 导出后校验（移植现有 Python 断言到 TS 测试）

- 每个 slide XML 根级**唯一** transition，且位于 cSld/clrMapOvr 之后、timing 之前（移植 `validate_transition_order`）；
- transition 含直接子元素 `p:fade`（移植 `has_direct_fade_transition`；注意字节搜索 `<p:fade>` 不算验证，必须解析层级）；
- timing 树引用的 spid 在该页 shape 树中真实存在；
- `transition: none` 时断言根级无 transition。

### 5.4 边界

fly/zoom/路径动画、动画触发器（with/after previous）、动画时长 p14 扩展等超出 PR 范围；若后续需要，再评估手写 p:timing 后处理（库 v1 只建模 4 种 preset，未建模的 preset 读出为 null 但写出不受影响）。

---

## 6. 桌面增强轨道（kimi.com）去留决策建议与迁移文案

### 6.1 决策建议：弃用并限期删除

理由：桌面轨道的全部增量价值就是「字体嵌入 + 淡入淡出」两项；本地链路补齐后它只剩成本——kimi.com/statics.moonshot.cn 可达性、agent-browser 版本漂移、Chrome/Edge 依赖、WebSocket 调试端口（9337）维护，且 kimi.com 页面改版会静默打挂选择器。

执行节奏：

1. **本 PR（功能补齐当版）**：SKILL.md/README 将桌面轨道标注「已弃用（deprecated），保留一个次版本观察期」；`export_pptx.py` / `export_images.py` 入口打印弃用提示到 stderr。
2. **下一个次版本**：观察期内若本地链路实测无回归（以 §7 实测清单为准），删除 `export_pptx.py`、`export_images.py`、`export_host.html` 及对应测试（`tests/test_export_pptx.py`、`tests/test_export_images.py`）。
3. **改名 dsh-ppt-maker**：npm 发布新包 `dsh-ppt-maker`（版本从 2.0.0 起，因含删除桌面轨道的破坏性变更）；旧包 `dsh-kimi-ppt` 最后发一个补丁版并在 npm 标 `deprecate`，留言指向新包；GitHub 仓库改名（旧 URL 自动重定向）；`locale/zh.json` / `locale/en.json` 显示名与描述去掉 Kimi 字样；技能目录 `skills/kimi-ppt` 改名 `skills/ppt-maker` 并同步 description 触发词。

### 6.2 迁移文案（README / SKILL.md 用，中文草稿）

> **提示**：自 dsh-ppt-maker 2.0 起，字体嵌入与淡入淡出转场已由本地导出链路原生提供，不再依赖 kimi.com 网页编辑器，导出全程离线。原「桌面增强轨道」脚本（export_pptx.py / export_images.py）已弃用并将于下个大版本移除；仍在使用的用户无需操作，直接升级即可获得等价产物。

CHANGELOG 条目草稿（新增段）：

```text
### 新增
- 本地导出链路支持字体嵌入（ppt/fonts/*.fntdata + embeddedFontLst，含 fsType 许可检查与 CJK 子集化，默认开启可用 fontEmbed 关闭）。
- 本地导出链路支持淡入淡出转场与元素 fadeIn 入场动画（原仅桌面增强轨道提供）。
### 弃用
- 桌面增强轨道（kimi.com 网页编辑器导出）弃用，将于下个大版本移除。
```

---

## 7. 测试策略

### 7.1 单元测试（vitest，沿用 PR 1 测试基建）

- fsType 解析：构造各 bit 组合（0x0000/0x0002/0x0004/0x0008/0x0100/0x0200 及组合）的最小字体头 fixture，断言策略判定结果；TTC 双 face fixture 断言按 face 取各自 fsType。
- 名称解析：nameID 1/16 优先级、slot 归类（Regular/Bold/Italic/BoldItalic 四文件 → 四槽位）。
- 清单收集：fixture deck（theme.textStyles + 页内联 + chart 子组件 fontFamily）断言 typeface/slot 集全覆盖、无漏收。
- 注入幂等：同一 fontPlan 连续注入两次，产物字节一致、fntdata 部件不翻倍、embeddedFontLst 不重复条目。
- rId 分配：预置 rId1..rId5 的 rels，断言新分配从 rId6 起且不撞名。

### 7.2 集成测试（解包断言，机器可跑）

对 fixture deck（声明 MiSans/思源宋体、transition fade、两元素 fadeIn）跑完整 `ppt_export`，fflate 解开产物断言：

1. `ppt/fonts/*.fntdata` 存在且头是合法 sfnt；
2. `[Content_Types].xml` 有 fntdata Default；rels 有 font Relationship 且双向引用一致；
3. `presentation.xml` 根元素 `embedTrueTypeFonts="1"`，embeddedFontLst 位置在 notesSz 之后、defaultTextStyle 之前；
4. 每 slide 根级唯一 transition（层级解析，非字节搜索），timing 树 spid 有效；
5. `loadPresentation` 回读不抛错；
6. fsType=Restricted 的 fixture 字体 → 导出摘要含跳过警告且无对应 fntdata。

可选：库自带的 `validate:ooxml`（dotnet 工具）在 CI 有 .NET 环境时跑一次。

### 7.3 人工实测清单（PowerPoint / WPS，交付前必做）

| # | 场景 | 通过标准 |
|---|---|---|
| 1 | 装有字体的机器，PowerPoint 打开产物 | 字体渲染正确；另存一份后 fntdata 仍在（embedTrueTypeFonts 生效的标志） |
| 2 | **未装**字体的机器（虚拟机/同事机），PowerPoint 打开 | 无豆腐块；「文件→选项→保存」显示已勾选嵌入字体 |
| 3 | 未装字体的机器，WPS 打开 | 同上（WPS 对子集嵌入字体的兼容性样本少，必须实测） |
| 4 | 放映 | 每页 fade 转场生效；声明 fadeIn 的元素点击依次淡入 |
| 5 | 子集模式下编辑新增字符 | 出现预期豆腐块，且文档已声明该行为 |
| 6 | 含 Restricted 字体的 deck | 导出摘要有跳过警告，目标机装该字体后显示正常 |
| 7 | TTC 字体（微软雅黑）deck | 提取的 face 在 PowerPoint 内按 regular/bold 正确匹配 |

---

## 8. 实施步骤（带依赖顺序）

```
①spike（阻塞②④选型）
 ├─ ②font-resolver.ts（纯函数，可与⑤并行）
 │   └─ ③字符集/字体清单收集（依赖 PR1 deck 模型）
 │       └─ ④embed-fonts.ts 后处理（依赖②③，含子集化接线）
 ├─ ⑤转场/动画接线（只依赖 PR1 引擎，与②③④完全并行）
 └─ ⑥ppt_export 集成（依赖④⑤）→ ⑦ppt_check 报告扩展 → ⑧文档/改名/弃用声明 → ⑨次版本后删除桌面轨道
```

1. **spike（0.5–1 天）**：a) subset-font 对本项目字体清单（MiSans、思源宋体、LXGW、阿里妈妈系 + TTC 微软雅黑）逐一试子集化，记录产物体积与耗时，定方案 A/B 默认；b) 手工拼一个最小嵌字体 pptx（fflate 重打包），两台机器实测 PowerPoint/WPS 可开且字体生效——**这是整个 PR 最大的不确定性，先做**。
2. **font-resolver.ts**：注册表/目录枚举、name 表族名索引、TTC face 定位与提取、fsType 读取、slot 归类（纯函数、无 IO 副作用可单测）。
3. **清单收集**：deck 全集字符 + typeface/slot 使用集（对接 PR 1 的 deck 内存模型）。
4. **embed-fonts.ts**：§2 注入六步 + §2.4 自检 + 子集化接线 + fsType 策略执行。
5. **转场/动画接线**：.pptd/.page 字段 → `setSlideTransition` / `setShapeAnimation`；移植 §5.3 校验断言。
6. **ppt_export 集成**：新增 `fontEmbed/transition/animations` 参数与导出摘要（嵌入 face 数、跳过原因、子集前后体积）；结果写 `manifest.json` 随 revision 落账。
7. **ppt_check 扩展**：字体许可预检报告（嵌入可行性、缺失替代建议），不动导出也可见。
8. **文档与改名**：SKILL.md（能力清单、新字段、弃用声明、许可提示）、README、CHANGELOG、locale、npm 新包发布与旧包 deprecate。
9. **删除桌面轨道**：一个次版本观察期后执行 §6.1 第 2 步。

---

## 9. 风险与开放问题

### 9.1 风险（按影响排序）

1. **typeface 按名匹配失败 → 嵌入静默无效**（PowerPoint 不报错只回落）。对策：嵌入声明与 run 的 fontFace 强制同源（都从 .pptd 实装名取值）；§7.3 第 2 条实测兜底。
2. **embeddedFontLst 顺序错 → PowerPoint「需要修复」对话框**。对策：DOM 插入以 defaultTextStyle/notesSz 为锚 + §2.4 顺序断言 + 实测。
3. **TTC 提取重建 TTF 的 checksum 细节**（checkSumAdjustment 算错部分渲染器拒收）。对策：优先走 hb-subset 直接输出单 face；自写提取路径用 fonttools ttx 交叉验证 + 微软雅黑实测。
4. **宿主 Node 版本**：@office-kit/pptx 要求 Node >=22.18.0（ESM only）。若 DSH 桌面宿主 Node 低于此版本，TS 引擎需跑在自带 Node 子进程——属 PR 1 已选型问题，本 PR 依赖其结论，落地前复核。
5. **子集化 wasm 体积与首调耗时**：harfbuzzjs wasm ≈1 MB 进 npm 包（可接受）；首次加载百毫秒级，导出路径无感。
6. **库 round-trip 丢未知部件**：第三方带嵌入字体/数字签名/自定义 XML 的 pptx 经 ppt_edit 再导出，库未建模的部件可能丢失。本 PR 的嵌入每次导出重做、不受影响；其余部件丢失属库行为，列观察项并在 ppt_edit 文档声明。
7. **许可合规**：工具侧只做 fsType 技术判定与提示，不为用户字体的再分发授权背书；文档写明。

### 9.2 开放问题（需用户/上游决策）

1. 是否在 `assets/fonts/`（或插件包内）内置 1–2 款免费商用兜底字体（如 MiSans 常规+粗体，约 +20 MB 包体积或改运行时按需下载）？影响开箱体验与包体积的权衡。
2. `ppt_render` 预览是否也加载嵌入字体渲染，保证「所见即所得」（涉及 PR 1 预览链路的字体注入方式，待核其实现后定）。
3. `fontEmbed` 默认值取 `subset`（体积小、编辑加字豆腐块）还是 `full`（体积大、可自由编辑）？本计划默认 subset（与 PowerPoint 官方默认一致），可配置。
4. 改名后技能触发词与旧会话兼容：旧工程目录里的 `deck.pptd` 引用与文档链接是否做一层兼容提示，还是纯文档说明。
5. Preview&Print 字体嵌入后 PowerPoint 强制只读的实际表现（是否弹提示、是否影响另存）——实测确认后决定默认嵌入还是默认跳过。

---

## 附：本计划引用的关键证据

- @office-kit/pptx 0.21.0 类型定义（本地解包 `dist/index-VCK9yZV2.d.ts`）：转场 API（transition-builder，TRANSITION_EFFECTS 21 项）、动画 API（shape-animation，fadeIn/fadeOut/appear/disappear，合并 timing 树）、字体 API 仅主题字体方案（PresentationFonts）；`savePresentation => Promise<Uint8Array>`；engines node>=22.18.0；依赖 fflate^0.8.3。
- 嵌入字体包结构与属性位置：ts-pptx embedFont 文档（整字体、四槽位、typeface 按名匹配、无 embedTrueTypeFonts 则 PowerPoint 另存删除嵌入字体）；pptx-embed-fonts 源码（四件套注入顺序、fntdata ContentType、rels Type URI、embeddedFontLst 插到 defaultTextStyle 前）。
- fsType 位定义：Microsoft Learn OpenType 规范 OS/2 表（fsType @ OS/2+8）。
- 现仓库移植来源：`skills/kimi-ppt/scripts/export_pptx.py`（transition 补丁与校验）、`skills/kimi-ppt/scripts/check_fonts.py`（注册表枚举、归一化、替代表）、`skills/kimi-ppt/SKILL.md`（动画默认不加的纪律）。
- 子集化选型：npm subset-font@2.9.0（harfbuzzjs wasm，BSD-3）。

---

## 审查修订（2026-10-12，三方审查 + 盘问后的最终口径，优先级高于上文）

1. **库版本**：pin `@office-kit/pptx@0.24.0`（非 0.21.0）。0.24.0 实测：动画 95 种 preset（上文「仅 4 种」的边界作废）、转场含 morph/durationMs。风控三件套：pin 版本 + 引擎接口化（PPTD 不暴露库 API）+ 20 份真实语料双向对拍。
2. **字体解析不自写**：宿主 DSH 安装里已有 fontkit 2.0.4（libreoffice-kit 的依赖），族名匹配/字形覆盖/TTC 处理用它；自写只剩 fflate zip 注入这一段。上文 §3 的手写注册表枚举/name 表解析/TTC 重建方案降级为备选。
3. **CJK 内置兜底字体砍除**：预子集化（2000–3500 字）撞上未覆盖字即哑弹，且与字体嵌入功能重复。改为：嵌入生成时实际用到的字体（用户本机系统收割，fsType 闸照走）+ missingFonts 明确警告；西文/等宽小子集（Inter/JetBrains Mono）可选打包。fallback-fonts.md 已同步修订。
4. **盘问确认的开放问题口径**：fontEmbed 默认 subset；fsType=Preview&Print（0x0004）默认嵌入+警告；ppt_render 预览加载嵌入字体渲染；桌面轨道限期删除（本版 deprecated、下次版本删文件）。
5. **新增 spike 项**（D0，与原「最小嵌字体 pptx 双机实测」并列）：LibreOffice 自身有「嵌入字体到文档」能力，试 libreoffice-kit convert 能否透出该选项——若能，整个字体子系统缩成一个开关（失败只亏半天）；subset-font 与 fontkit 子集化对 CJK 的效果对比（别拍脑袋）。
6. **改名时序前移**：改名（包名/技能 key/cordis.patch.yml/locale）在 PR 1 开工即做，本 PR 只做 npm 旧包 deprecate + 桌面轨道删除 + 文档收尾。
7. **宿主 Node 风险已排除**：宿主 Node v24.21.0 ≥ 库要求 22.18。
8. **D0 实测颠覆（2026-10-12，第五轮）**：fntdata 必须 EOT 封装（上文「原始字节」表述作废，已就地更正）；未压缩 EOT（flags=0）无论 fsType 取 0x0000/0x0004/0x0008 均被 PowerPoint 拒载（v3/v4a/v4b 三轮人工实测，对照组渲染一致证明回落）；真件为 MicroType 压缩子集 EOT（flags=0x05），MTX 无公开编码器；t2embed 现代签名已破解（TTEmbedFontFromFileA x86 13 参 / Win11 x64 17 参，与公开文档严重漂移）但 worker 层未通（0x13 / AccessViolation）。**字体嵌入降级为限时攻坚项**：不阻塞 PR3 其余交付（转场/动画/missingFonts 警告/桌面轨道删除），攻坚路线与预算见 ROADMAP 风险登记；失败则嵌入列为 1.0 后课题，PR3 以「字体包侧车 + 缺失警告」交付。
