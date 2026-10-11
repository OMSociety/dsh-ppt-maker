# 测试语料清单（tests/corpus）

双向对拍（pptx → 解析 → 再生成）测试语料 20 份：10 份真实文件脱敏变体 + 10 份按设计系统合成的文件。
原始文件保留在 `WorkBench/corpus/`（本机），**绝不提交进仓库**；本目录内文件已全部脱敏并通过校验。

生成管线（脚本在 `WorkBench/corpus-build/scripts/`）：
`desensitize.mjs`（@office-kit/pptx API 层：文本替换/核心属性/缩略图/变体编辑）→ `postprocess.py`（zip 层：全 XML 复扫替换/媒体占位/嵌入字体剔除）→ `gen_synthetic.mjs`（合成）→ `inject-smartart.ps1`（COM 注入 SmartArt）→ `verify_final.mjs` + `final_check.py`（校验）。

## 一、20 份清单

### 脱敏变体（10 份）

| 文件 | 页数 | 大小 | 覆盖说明 |
|---|---|---|---|
| mun-training-desens-v1.pptx | 22 | 174KB | 真实培训 deck 直脱敏：5 个中文名版式继承、17 个空备注部件、连接符/组合形状、2 处图片裁剪、tags×34、SVG 占位×3、全页原生切换 |
| mun-training-desens-v2.pptx | 20 | 171KB | v1 + 主题色改写（accent1/2）+ 删末 2 页 + 隐藏第 5 页（show=0） |
| mun-training-desens-v3.pptx | 23 | 176KB | v1 + 主题字体改写（major/minor × latin/ea）+ duplicateSlide 增页 + moveSlide 重排 |
| fumunc-closing-desens-v1.pptx | 8 | 103KB | 真实闭幕会 deck 直脱敏：11 版式（含 vertTx/vertTitleAndTx 竖排版式）、7 页带文本备注、全页原生切换、3 页原生动画 timing、1 处图片裁剪 |
| fumunc-closing-desens-v2.pptx | 7 | 100KB | v1 + 主题色改写 + 删末页 + 全页 fade 切换改写 + 首页备注改写 |
| tpl-shekehong-jianyue-desens.pptx | 20 | 250KB | 真实模板：4 个原生 doughnut 图表（含嵌入 xlsx）、5 版式含背景图（已占位）、tags×13 |
| tpl-shekehong-xingzheng-desens.pptx | 25 | 255KB | 5 个原生图表（doughnut×3 + column/bar 各 1 双系列）、6 处图片裁剪、版式背景图占位 |
| tpl-xiaohui-blue-desens.pptx | 51 | 806KB | 校徽模板蓝版：15 版式 + 母版背景图继承、6 图表（scatter 3 系列 + bar + doughnut×4）、1 个原生表格、21 处图片裁剪、6 个原生章节 |
| tpl-xiaohui-red-desens.pptx | 51 | 805KB | 同蓝版的红主题姊妹版（双主题对照、同结构重 skin） |
| tpl-xueshu-dabian-desens.pptx | 25 | 245KB | 4 图表（column 3 系列 + doughnut×3）、6 处图片裁剪、commentAuthors 批注作者部件（已脱敏）、tags×7 |

### 合成语料（10 份，5 设计系统 × 2 变体）

公共覆盖：主题色/主题字体写入、章节（v1 3 节 / v2 2 节）、全页切换（v1 fade / v2 push）、占位图（程序生成抽象图）、备注（v1 5 页 / v2 3 页）、表格合并单元格、图片裁剪、竖排文本（v1 eaVert / v2 wordArtVert）。设计系统取自 `skills/ppt-maker/reference/design_system/<族>/<子风格>/design.md`。

| 文件 | 页数 | 设计系统 | 覆盖说明 |
|---|---|---|---|
| syn-academic-v1.pptx | 9 | academic/teal-green-academic-defense | column 图表、表格 2 处纵向合并、eaVert 竖排目录标签、双栏要点页、图片裁剪、**SmartArt（orgChart，COM 注入）** |
| syn-academic-v2.pptx | 8 | academic/deep-blue-atlas | line 图表、14 种预设形状枚举 + 组合/旋转/翻转、表格样式二 + 表头横向合并、图片样式×2、文本框分栏（numCol=2）、wordArtVert 竖排、批注×2、动画×2 |
| syn-consulting-v1.pptx | 9 | consulting/marine-blue-research | 堆积 bar 图表、表格合并、eaVert 竖排、**SmartArt（orgChart，COM 注入）**、解读侧栏 |
| syn-consulting-v2.pptx | 8 | consulting/pine-green-strategy | 堆积 column 图表、形状枚举、分栏、图片样式、批注×2、动画×2 |
| syn-finance-v1.pptx | 8 | finance/ebony-ledger | line 图表（衬线标题/无衬线正文双字体）、表格合并、eaVert 竖排 |
| syn-finance-v2.pptx | 8 | finance/black-gold-ledger | 深色封面与引言页（#151515）、area 图表、形状枚举、批注×2、动画×2 |
| syn-promotion-v1.pptx | 8 | promotion/silver-gray-luxury-magazine | pie 图表（衬线展示字体）、表格合并、eaVert 竖排 |
| syn-promotion-v2.pptx | 8 | promotion/aqua-charity-report | doughnut 图表、形状枚举、图片样式×2、分栏、批注×2、动画×2 |
| syn-work-v1.pptx | 8 | work/warm-clay-works | area 图表、米黄全底（#F9F4E9）、表格合并、eaVert 竖排 |
| syn-work-v2.pptx | 8 | work/sky-blue-wayfinding | bar 图表、形状枚举、分栏、批注×2、动画×2 |

## 二、覆盖矩阵自查（20 份合计）

| 能力点 | 覆盖情况 |
|---|---|
| 图表 | 35 个：模板 25 个真实 chart（doughnut/bar/column/scatter，含嵌入 xlsx）+ 合成 10 个（column/line/bar 堆积/pie/doughnut/area） |
| SmartArt | 2 份（syn-academic-v1 / syn-consulting-v1，orgChart1，diagrams 全套 5 部件） |
| 合并单元格 | 10 份合成全覆盖（v1 纵向 rowSpan×2 / v2 表头 colSpan）+ gridSpan/rowSpan 属性 |
| 图片裁剪 | 38 处 srcRect（xiaohui 21×2、xingzheng 6、xueshu 6、mun 2、fumunc 1、合成 10） |
| 多栏版式 | v1 双栏要点页 ×10；v2 文本框分栏 numCol=2 ×10 |
| 竖排/横排 | eaVert ×5（v1）+ wordArtVert ×5（v2）；版式层 vertTx/vertTitleAndTx（fumunc 11 版式） |
| shape 预设枚举 | v2 各 14 种（rect/roundRect/ellipse/triangle/rtTriangle/diamond/pentagon/chevron/rightArrow/star5/hexagon/cloud/donut/plus）+ 组合/旋转/翻转；模板原生 4–7 种 |
| 母版/版式继承 | xiaohui 15 版式 + 母版背景图；mun 5 中文名版式；fumunc 11 版式；多模板版式背景图 |
| 表格样式 | 合成 v1/v2 两种 BUILTIN_TABLE_STYLES + styleFlags；xiaohui 原生表格 |
| 备注 | fumunc 7 页文本备注、mun 17 个空备注部件、合成 v1×5 / v2×3 |
| 批注 | 合成 v2 各 2 处；xueshu commentAuthors 部件 |
| 章节 | xiaohui 原生 6 节 ×2；合成 v1×3 / v2×2 |
| 动画 | fumunc 3 页原生 timing；合成 v2 各 2 个效果（fadeIn + wipeIn） |
| 切换 | mun/fumunc 全页原生；合成全页 fade（v1）/ push（v2） |
| 隐藏页 | mun-training-desens-v2（show=0） |
| 主题改写 | mun-v2（色）、mun-v3（字体）、fumunc-v2（色）——setPresentationTheme/Fonts 写路径 |
| 增删移页 | mun-v2 删 2 页、mun-v3 duplicate+move、fumunc-v2 删 1 页 |

## 三、脱敏处理明细

- **文本**：API 层 `replaceTextInPresentation` + `replaceTextInNotes`（支持跨 run 匹配）逐映射替换后，zip 层对全部 XML/rels 部件（含 docProps/app.xml、commentAuthors.xml 等 API 覆盖面之外）再做一遍同一映射的复扫。
- **替换映射**：校名/社名/会名（中国社会科学院大学→示例大学、福梦/FUMUNC→示例/EXAMPLE、MYMUNC→PARTNER、良梦/社科红→示例/示例红 等）、23 个真实人名→某某、CHEN ZEJU→MOU MOU、黄 杨琚→某某（批注作者）、邮箱/网址/地址→example.com 系、开发商昵称（胡辣汤小能手/Tzb0321/榴莲贼好吃）→示例用户。新闻媒体名（泰晤士报等公共机构名）按真实语料保留。
- **核心属性**：20 份 creator/lastModifiedBy 统一「示例用户」，title 改为示例化名称。
- **缩略图**：removeThumbnail 全剔除（封面截图可能含社名/校徽）。
- **媒体**：196 个媒体部件（106 个去重哈希）全部替换为 Pillow 生成的同格式占位图（≤800px 保持宽高比；近方形小图给圆环徽章样式；SVG→占位 SVG）。真实照片/校徽/题图 **0 存活**（sha1 逐一比对原始库）。
- **嵌入字体**：mun/fumunc 各 11–12 个 fntdata 部件连同 `embeddedFontLst`、rels、content-types 引用一并剔除（商业字体许可规避，不入仓库）。
- **校验**：20 份 × 45 个敏感串（raw + 去标签双通道）0 命中；validatePresentation 0 issue；python-pptx 交叉打开 20/20 通过。

## 四、已知限制与备注

- 合成语料的 3 个版式为 `createPresentation` 默认版式；母版/版式继承的覆盖由模板类承担。
- SmartArt 由 PowerPoint COM 注入（@office-kit/pptx 0.24.0 无 diagram 创作面），仅 2 份；这两份经 PowerPoint 重存。
- 脱敏文件体积大幅缩小（如 xiaohui 25.6MB→806KB），因媒体全部占位——这是预期行为。
- mun 的 17 个 notesSlide 部件原本即无文本（空备注页），保留用于部件级 round-trip 覆盖。
- 普查脚本口径注意：`getShapeKind` 对表格返回 `graphicFrame`（与图表同 kind），统计表格需用 `getTableDimensions` 或 XML 层 `<a:tbl>`。
