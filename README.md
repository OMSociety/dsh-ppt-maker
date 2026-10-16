<div align="center">

<img src="https://raw.githubusercontent.com/OMSociety/dsh-ppt-maker/main/docs/logo.png" width="160" alt="dsh-ppt-maker logo"/>

# DSH PPT Maker（PPT 创客）

**DeepSeek Harness 插件 —— 内含 ppt-maker 技能与十一个 ppt_* 工具：创建 / 编辑 / 逆向 / 质检 / 导出 PPT，本地纯 TS 引擎直出最终 .pptx**

  <p>
    <a href="https://www.npmjs.com/package/dsh-ppt-maker"><img src="https://img.shields.io/npm/v/dsh-ppt-maker?color=4f6ef7&label=version" alt="Version"></a>
    <a href="https://github.com/deepseek-ai/dsh"><img src="https://img.shields.io/badge/DSH-%3E%3D0.2.0--rc.2%20%3C0.3-4f6ef7" alt="DSH"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="License"></a>
    <a href="https://github.com/OMSociety/dsh-ppt-maker/stargazers"><img src="https://img.shields.io/github/stars/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="Stars"></a>
    <a href="https://github.com/OMSociety/dsh-ppt-maker/issues"><img src="https://img.shields.io/github/issues/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="Issues"></a>
  </p>

**目录**：• [核心特性](#核心特性) • [工具清单](#工具清单) • [安装方式](#安装方式) • [质检体系](#质检体系) • [设计系统](#设计系统) • [常见问题](#常见问题) • [更新日志](#更新日志)
</div>

> **免责声明**：本插件为非官方项目，与 Moonshot AI 无关。PPTD 格式为自主维护的契约（不跟踪上游）。

## 核心特性

| 特性 | 说明 |
|---|---|
| **工具层直出** | 11 个 `ppt_*` 工具（raw JSON-Schema 注册）：创建/编辑/撤销/重做/渲染/质检/导出/导入/打开/外科手术，引擎 `@office-kit/pptx@0.24.0` 本地纯 TS 构建最终 .pptx，不依赖 Python 主链 |
| **双向性** | 读取并改写既有 .pptx：`ppt_import` 全量逆向进 PPTD 工程（图表/SmartArt/OLE 自动落灰底占位），`ppt_patch` 外科手术（改字/换图/调页序）不走 PPTD 往返，库级 L1 passthrough 保住未建模部件 |
| **PPTD** | 自主契约的 YAML DSL（`deck.pptd` + `pages/*.page`），单页自包含、可视即所得；双方言（generate 生成 / reverse 逆向超集） |
| **右侧栏工作台** | 自研三栏编辑器（缩略图 + 画布 + 属性面板），所见即所得：双击文字就地改、拖拽调页序、图片一键替换、撤销/重做、版本历史（画布直渲预览任意快照并一键恢复）、409 冲突提示与「外部已修改」banner；导出成功在页脚状态条挂「打开方式」菜单（系统关联应用 + 显示文件位置，与 DSH 文件菜单同套 dsh-native-command 原语） |
| **质检分层** | 规则层（文字溢出/出界/重叠/对比度/结构/缺字体）阻断式，blocker 拦导出；AI 层按需（`ppt_check ai:true`）把最终渲染页 PNG 送多模态模型看配色/层级/平衡，只出建议不阻断；结果落账 `manifest.qaReport`（含被阻断的导出），随 revision 可追溯 |
| **字体嵌入** | 导出自动嵌入实际用到的字体（EOT 封装 `fntdata` + `embeddedFontLst`），未装字体的机器渲染不回落；子集/整字体/关闭三档（`export.fontEmbed`），逐字体 fsType 许可闸，`ppt_check` 预检许可与替代建议 |
| **转场与动画** | 页面级转场（`export.transition`：`fade` 默认 / `none` / `auto` 策展轮换 fade→push→wipe）与元素入场动画（`export.animations`，95 种 preset 词表），本地链路原生写出 |
| **修订与快照** | manifest.json 单一写者 + append-only 快照（游标模型，undo/redo 天然成立）+ baseRevision 乐观锁（409） |
| **设计系统** | 内置学术 / 咨询 / 金融 / 促销 / 工作五族预设主题，选题后整套版式配色层级一致 |
| **本地渲染预览** | 面板画布与缩略图直接渲染 PPTD 元素为 DOM（矢量、秒出、与选择框同源同坐标系）；`ppt_render` / 质检的 PNG 预览与 AI 截图仍走 `@deepseek-ai/libreoffice-kit` 光栅化最终 pptx，每页（page, revision）磁盘缓存 |

## 工具清单

| 工具 | 干什么 |
|---|---|
| `ppt_create` | 新建 PPTD 工程（dir/title/size/designSystem/theme） |
| `ppt_themes` | 列设计系统与主题 |
| `ppt_edit` | 原子编辑：ops 数组批量（add_page / add_element / update_element / …），带 baseRevision 乐观锁 |
| `ppt_undo` / `ppt_redo` | 撤销/重做（游标移动，合并窗内连续编辑算一步） |
| `ppt_render` | 渲染每页 PNG 预览（最终 pptx 光栅化，96dpi 默认） |
| `ppt_check` | 规则质检（默认）+ AI 视觉质检（`ai:true`，路由不支持图像时降级为 PNG 路径清单） |
| `ppt_export` | 导出 .pptx（规则 blocker 拦截，`skipCheck:true` 绕过；摘要落账 manifest.exportReport） |
| `ppt_import` | .pptx → PPTD 全量逆向（dropped/degraded 两级报告 + 占位形状回插） |
| `ppt_open` | 把右侧栏工作台打开到指定工程（per-session openRequest，TTL 60s） |
| `ppt_patch` | 对 .pptx 外科手术：set_text / replace_image / move_page |
| | （不走 PPTD 往返，库 L1 passthrough 保住 chart/SmartArt/OLE） |

## 工作台

右侧栏「PPT 创客」是三栏编辑器：缩略图条 + 画布 + 属性面板。

- **底图即 DOM**：画布与缩略图把 PPTD 页 AST 直接渲染成 DOM（`client/components/PptdView.tsx`），打开即出、无需等 libreoffice 冷启动；元素、选择框、就地编辑器同一 pt 坐标系，恒对齐。table / chart / icon / SmartArt 等暂不支持渲染的元素显示灰底占位。
- **左右栏可收缩**：左栏页列表默认展开、可收起（收起不渲染）；右栏属性面板选中元素才展开、可手动收起。收起态只留边缘把手。
- **编辑动作**：双击文字就地改 / 拖拽调页序 / 复制删除新增页 / 替换图片 / 「导出 .pptx」落到工程目录 `export/` 下（文件名带版本号）。
- **页脚状态条**：面板底栏常驻一行状态——「正在保存…」与操作反馈（导出落点、失败原因）都在这里，不挤压画布高度。
- **冲突保护**：所有写入都带 `baseRevision`，模型在另一个会话里改了同一工程会回 409——面板只亮冲突条，不覆盖人的手改；「外部已修改」提示同理。
- **轮询**：每 3s 拉 `/ppt-maker/api/state` 看 manifest.revision；模型 ppt_open / ppt_import 完成后面板自动聚焦到对应工程。

## 安装方式

1. **安装插件**（DSH 用户级，宿主自动注册 `skills/ppt-maker` 技能根）：

   ```powershell
   # 先停掉正在运行的 DSH（运行中的服务会锁住依赖，装完再起）
   dsh plugin --profile <profile> add "dsh-ppt-maker"
   ```

   > **桌面版用户**：桌面的 `desktop` profile 由应用独占管理，CLI 无法代管安装；请在桌面应用内安装此插件。
2. **重启 DSH**：技能目录自动发现；对话里直接说「帮我做一份 PPT」即触发。

> **依赖**：工具链全 TS，主链无 Python。`ppt_render` 用的 `@deepseek-ai/libreoffice-kit@0.1.2` 是硬依赖（约 183MB/平台，随包安装）。Python 脚本（`skills/ppt-maker/scripts/`）仅作逃生舱，见 SKILL.md「六、Python 逃生舱」。

> **提示**：桌面增强轨道（kimi.com 网页编辑器导出，`export_pptx.py` / `export_images.py`）**已弃用**——字体嵌入与淡入淡出转场已由本地 TS 导出链路原生提供，全程离线。这两个脚本将于下个次版本删除，仍在使用的用户直接升级即可获得等价产物。

## 质检体系

**规则层**（阻断式，导出前默认跑）：文字溢出（`@office-kit/pptx-preview` 的 `auditTextLayout`）、出界、重叠、对比度（WCAG 相对亮度比 ≥3）、结构健全（`validatePresentation`）、缺字体（libreoffice-kit 的 `missingFonts` 诊断）。blocker 不修掉 `ppt_export` 不给出文件。

**AI 层**（按需，`ppt_check ai:true`）：把 libreoffice-kit 渲染的最终成品页 PNG 经 `ctx.attachments.saveImages` 入库后送当前路由的多模态模型（`ctx.llm.stream`），审配色/层级/平衡/图版搭配。只出建议不阻断；路由不支持图像输入（`resolveModelInfo().inputModalities` 不含 `image`）时降级为返回 PNG 路径清单 + 版式指标摘要，由主模型自行 `read_image` 复核。

## 设计系统

五族预设（`skills/ppt-maker/reference/design_system/<族>/<子风格>/design.md`）：`academic` 学术 · `consulting` 咨询 · `finance` 金融 · `promotion` 促销 · `work` 工作。用 `ppt_themes` 列当前可用主题。

## 常见问题

- **导出被拦**：规则质检有 blocker（文字溢出/出界/结构坏）→ 按 `ppt_check` 返回的 `issues` 逐条修，或 `skipCheck:true` 强行导出（不推荐）。
- **AI 质检降级**：返回 `ai.performed:false` + PNG 路径清单时，说明当前路由模型不支持图像输入——主模型自行 `read_image` 那些 PNG 复核即可。
- **逆向现有 pptx**：`ppt_import` 全量逆向进 PPTD 工程；轻改（改字/换图/调页序）走 `ppt_patch` 不经 PPTD 往返，保留 SmartArt/OLE/图表等未建模部件。

## 更新日志

参见 [CHANGELOG.md](CHANGELOG.md)。

## 致谢

- 基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件/技能体系。
- 引擎 [@office-kit/pptx](https://www.npmjs.com/package/@office-kit/pptx)（0.24.0 pin）与预览 [@office-kit/pptx-preview](https://www.npmjs.com/package/@office-kit/pptx-preview)；渲染 [@deepseek-ai/libreoffice-kit](https://www.npmjs.com/package/@deepseek-ai/libreoffice-kit)（MPL-2.0，仅调用其 API/CLI，不链改源码）。

## 许可证与作者

[MIT](LICENSE)。

[OMSociety](https://github.com/OMSociety)
