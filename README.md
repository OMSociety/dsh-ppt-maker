<div align="center">

<img src="https://raw.githubusercontent.com/OMSociety/dsh-ppt-maker/main/docs/logo.png" width="160" alt="dsh-ppt-maker logo"/>

# DSH PPT Maker（PPT 创客）

**DeepSeek Harness 插件 —— 内含 ppt-maker 技能与八个 ppt_* 工具：创建 / 编辑 / 质检 / 导出 PPT，本地纯 TS 引擎直出最终 .pptx**

  <p>
    <a href="https://www.npmjs.com/package/dsh-ppt-maker"><img src="https://img.shields.io/npm/v/dsh-ppt-maker?color=4f6ef7&label=version" alt="Version"></a>
    <a href="https://github.com/deepseek-ai/dsh"><img src="https://img.shields.io/badge/DSH-%3E%3D0.2.0--rc.2%20%3C0.3-4f6ef7" alt="DSH"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="License"></a>
    <a href="https://github.com/OMSociety/dsh-ppt-maker/stargazers"><img src="https://img.shields.io/github/stars/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="Stars"></a>
    <a href="https://github.com/OMSociety/dsh-ppt-maker/issues"><img src="https://img.shields.io/github/issues/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="Issues"></a>
  </p>

**目录**：• [核心特性](#核心特性) • [工具清单](#工具清单) • [安装方式](#安装方式) • [质检体系](#质检体系) • [设计系统](#设计系统) • [常见问题](#常见问题) • [更新日志](#更新日志)
</div>

> **免责声明**：本插件为非官方项目，与 Moonshot AI 无关。PPTD 格式为自主维护的 v3 契约（不跟踪上游）。

## 核心特性

| 特性 | 说明 |
|---|---|
| **工具层直出** | 八个 `ppt_*` 工具（raw JSON-Schema 注册）：创建/编辑/撤销/重做/渲染/质检/导出，引擎 `@office-kit/pptx@0.24.0` 本地纯 TS 构建最终 .pptx，不依赖 Python 主链 |
| **PPTD v3** | 自主契约的 YAML DSL（`deck.pptd` + `pages/*.page`），单页自包含、可视即所得；双方言（generate 生成 / reverse 逆向超集） |
| **质检分层** | 规则层（文字溢出/出界/重叠/对比度/结构/缺字体）阻断式，blocker 拦导出；AI 层按需（`ppt_check ai:true`）把最终渲染页 PNG 送多模态模型看配色/层级/平衡，只出建议不阻断 |
| **修订与快照** | manifest.json 单一写者 + append-only 快照（游标模型，undo/redo 天然成立）+ baseRevision 乐观锁（409） |
| **设计系统** | 内置学术 / 咨询 / 金融 / 促销 / 工作五族预设主题，选题后整套版式配色层级一致 |
| **本地渲染预览** | `ppt_render` 用 `@deepseek-ai/libreoffice-kit` 把最终 pptx 光栅化成每页 PNG，所见即所得 |

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

## 安装方式

1. **安装插件**（DSH 用户级，宿主自动注册 `skills/ppt-maker` 技能根）：

   ```powershell
   # 先停掉正在运行的 DSH（运行中的服务会锁住依赖，装完再起）
   dsh plugin --profile <profile> add "dsh-ppt-maker"
   ```

   > **桌面版用户**：桌面的 `desktop` profile 由应用独占管理，CLI 无法代管安装；请在桌面应用内安装此插件。
2. **重启 DSH**：技能目录自动发现；对话里直接说「帮我做一份 PPT」即触发。

> **依赖**：工具链全 TS，主链无 Python。`ppt_render` 用的 `@deepseek-ai/libreoffice-kit@0.1.2` 是硬依赖（约 183MB/平台，随包安装）。Python 脚本（`skills/ppt-maker/scripts/`）仅作逃生舱，见 SKILL.md「六、Python 逃生舱」。

## 质检体系

**规则层**（阻断式，导出前默认跑）：文字溢出（`@office-kit/pptx-preview` 的 `auditTextLayout`）、出界、重叠、对比度（WCAG 相对亮度比 ≥3）、结构健全（`validatePresentation`）、缺字体（libreoffice-kit 的 `missingFonts` 诊断）。blocker 不修掉 `ppt_export` 不给出文件。

**AI 层**（按需，`ppt_check ai:true`）：把 libreoffice-kit 渲染的最终成品页 PNG 经 `ctx.attachments.saveImages` 入库后送当前路由的多模态模型（`ctx.llm.stream`），审配色/层级/平衡/图版搭配。只出建议不阻断；路由不支持图像输入（`resolveModelInfo().inputModalities` 不含 `image`）时降级为返回 PNG 路径清单 + 版式指标摘要，由主模型自行 `read_image` 复核。

## 设计系统

五族预设（`skills/ppt-maker/reference/design_system/<族>/<子风格>/design.md`）：`academic` 学术 · `consulting` 咨询 · `finance` 金融 · `promotion` 促销 · `work` 工作。用 `ppt_themes` 列当前可用主题。

## 常见问题

- **导出被拦**：规则质检有 blocker（文字溢出/出界/结构坏）→ 按 `ppt_check` 返回的 `issues` 逐条修，或 `skipCheck:true` 强行导出（不推荐）。
- **AI 质检降级**：返回 `ai.performed:false` + PNG 路径清单时，说明当前路由模型不支持图像输入——主模型自行 `read_image` 那些 PNG 复核即可。
- **逆向现有 pptx**：PR2 才给 `ppt_import`；本版请对既有 PPTD 工程操作。

## 更新日志

参见 [CHANGELOG.md](CHANGELOG.md)。

## 致谢

- 基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件/技能体系。
- 引擎 [@office-kit/pptx](https://www.npmjs.com/package/@office-kit/pptx)（0.24.0 pin）与预览 [@office-kit/pptx-preview](https://www.npmjs.com/package/@office-kit/pptx-preview)；渲染 [@deepseek-ai/libreoffice-kit](https://www.npmjs.com/package/@deepseek-ai/libreoffice-kit)（MPL-2.0，仅调用其 API/CLI，不链改源码）。

## 许可证与作者

[MIT](LICENSE)。

[OMSociety](https://github.com/OMSociety)
