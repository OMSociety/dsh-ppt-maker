<p align="center"><strong>中文</strong> · <a href="README_en.md">English</a></p>

<div align="center">
  <img src="https://raw.githubusercontent.com/OMSociety/dsh-ppt-maker/main/docs/logo.png" alt="PPT 创客" width="160">
  <h1>PPT 创客 dsh-ppt-maker</h1>
  <p>创建 / 编辑 / 逆向 / 质检 / 导出 PPT 的 DeepSeek Harness 插件，本地纯 TS 引擎直出最终 .pptx。</p>
  <p>模型用十一个 <code>ppt_*</code> 工具干活，你在右侧栏工作台里同看同改——双击文字就地编辑、拖拽调页序、导出后一键打开成品。</p>

  <p>
    <a href="https://www.npmjs.com/package/dsh-ppt-maker"><img src="https://img.shields.io/npm/v/dsh-ppt-maker?color=4f6ef7&label=version" alt="Version"></a>
    <a href="https://github.com/deepseek-ai/dsh"><img src="https://img.shields.io/badge/DSH-%3E%3D0.2.0--rc.2_%3C0.3.0--0-4f6ef7" alt="DSH"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="License"></a>
    <a href="https://github.com/OMSociety/dsh-ppt-maker/stargazers"><img src="https://img.shields.io/github/stars/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="Stars"></a>
    <a href="https://github.com/OMSociety/dsh-ppt-maker/issues"><img src="https://img.shields.io/github/issues/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="Issues"></a>
  </p>

<a href="#这是什么">这是什么</a> • <a href="#核心特性">核心特性</a> • <a href="#效果">效果</a> • <a href="#安装方式">安装方式</a> • <a href="#模型工具">模型工具</a> • <a href="#工作台">工作台</a> • <a href="#开发">开发</a> • <a href="#更新日志">更新日志</a> • <a href="#支持与致谢">支持与致谢</a> • <a href="#许可证与作者">许可证与作者</a>
</div>

## 这是什么

**PPT 创客**是一套长在 DeepSeek Harness 里的 PPT 工作链：模型通过十一个 `ppt_*` 工具创建、编辑、逆向、质检、导出演示文稿；人通过右侧栏工作台与模型接力——面板与模型读写同一份 PPTD 工程。

中间的格式是自主契约的 YAML DSL **PPTD**（`deck.pptd` + `pages/*.page`）：单页自包含、可视即所得，双方言（generate 生成 / reverse 逆向超集），完整规格见 [`docs/pptd-spec.md`](docs/pptd-spec.md)。

## 核心特性

| 特性 | 说明 |
|---|---|
| **十一个模型工具** | raw JSON-Schema 注册：创建 / 编辑 / 撤销 / 重做 / 渲染 / 质检 / 导出 / 逆向 / 打开 / 外科手术。引擎 `@office-kit/pptx@0.24.0` 本地纯 TS 构建最终 .pptx，主链无 Python |
| **双向性** | `ppt_import` 把既有 .pptx 全量逆向进 PPTD 工程（图表 / SmartArt / OLE 落灰底占位并回插）；`ppt_patch` 对 .pptx 外科手术（改字 / 换图 / 调页序），不走 PPTD 往返，库级 L1 passthrough 保住未建模部件 |
| **PPTD 契约** | YAML DSL（`deck.pptd` + `pages/*.page`），单页自包含、可视即所得；generate / reverse 双方言，可手改也可机改 |
| **右侧栏工作台** | 自研三栏编辑器（缩略图 + 画布 + 属性面板）：双击文字就地改、拖拽调页序、图片一键替换、撤销 / 重做、版本历史直渲快照并一键恢复、409 冲突保护与「外部已修改」提示 |
| **质检分层** | 规则层（文字溢出 / 出界 / 重叠 / 对比度 / 结构 / 缺字体）阻断导出；AI 层按需（`ppt_check ai:true`）把成品页 PNG 送多模态模型审配色与版式，只出建议不阻断；结果落账 `manifest.qaReport`，随 revision 可追溯 |
| **字体嵌入** | 导出自动嵌入实际用到的字体（EOT 封装 `fntdata` + `embeddedFontLst`），未装字体的机器渲染不回落；子集 / 整字体 / 关闭三档（`export.fontEmbed`），逐字体 fsType 许可闸 |
| **转场与动画** | 页面级转场（fade 默认 / none / auto 策展轮换）与 95 种元素入场 preset，本地链路原生写出 |
| **修订与快照** | manifest 单一写者 + append-only 快照（游标模型，undo/redo 天然成立）+ baseRevision 乐观锁（409） |
| **设计系统** | 学术 / 咨询 / 金融 / 促销 / 工作五族预设主题，选题后整套版式配色层级一致 |
| **本地渲染预览** | 面板画布与缩略图把 PPTD 页直接渲染成 DOM（矢量、秒出、与选择框同源同坐标系）；导出与质检的 PNG 预览走 `@deepseek-ai/libreoffice-kit` 光栅化最终 pptx，每页按 (page, revision) 磁盘缓存 |

## 效果

<table>
<tr>
<td width="66%" align="center"><img src="https://raw.githubusercontent.com/OMSociety/dsh-ppt-maker/main/docs/workbench.jpg" alt="工作台实机：左侧缩略图、中间画布、右侧属性面板" width="560"></td>
<td width="34%" align="center"><a href="https://raw.githubusercontent.com/OMSociety/dsh-ppt-maker/main/docs/panel-empty.jpg"><img src="https://raw.githubusercontent.com/OMSociety/dsh-ppt-maker/main/docs/panel-empty.jpg" alt="还没有打开演示文稿时的空面板" width="240"></a></td>
</tr>
<tr>
<td align="center">工作台实机：左侧缩略图、中间画布、右侧属性面板；导出成功后页脚状态条给出「打开方式」菜单（系统关联应用 / 显示文件位置）</td>
<td align="center">还没有打开演示文稿时的空面板；模型 <code>ppt_open</code> / <code>ppt_import</code> 后面板自动聚焦到对应工程</td>
</tr>
</table>

## 安装方式

**从 npm 安装**

```powershell
# 先停掉正在运行的 DSH（运行中的服务会锁住依赖，装完再起）
dsh plugin --profile <profile> add "dsh-ppt-maker"
```

> **桌面版用户：**桌面的 `desktop` profile 由应用独占管理，CLI 无法代管安装，请在桌面应用内安装此插件。装好后刷新浏览器页面，从右侧栏打开「PPT 创客」——只重启宿主不够，客户端产物是页面加载时取的。

> **依赖：**主链全 TS、无 Python；`ppt_render` 与质检用的 `@deepseek-ai/libreoffice-kit@0.1.2` 是硬依赖（约 183MB/平台，随包安装）。`skills/ppt-maker/scripts/` 下的 Python 脚本仅作逃生舱，见 SKILL.md「Python 逃生舱」。

**装完怎么用**

1. 对话里说「帮我做一份 PPT」（或显式 invoke `ppt-maker` 技能）→ 十一个 `ppt_*` 工具进场
2. 模型 `ppt_create` 新建工程，或 `ppt_import` 把现有 .pptx 逆向进工程 → 右侧栏自动弹出工作台
3. 面板里双击文字就地改、拖页序、点「导出 .pptx」→ 成品落在工程目录 `export/`（文件名带版本号）
4. 让模型 `ppt_check` 质检、`ppt_render` 逐页看 PNG；模型在别的会话改了同一工程，面板亮 409 冲突条，不覆盖你的手改
5. 页脚状态条点「打开」→ 用系统关联应用打开成品，或选「显示文件位置」

## 模型工具

| 工具 | 作用 | 关键参数 |
|---|---|---|
| `ppt_create` | 新建 PPTD 工程 | `dir` · `title` · `size` · `designSystem` · `theme` |
| `ppt_themes` | 列设计系统与主题（五族预设） | `designSystem`（可省） |
| `ppt_edit` | 原子编辑：ops 数组批量增删改页面与元素，baseRevision 乐观锁 | `dir` · `ops` · `baseRevision` |
| `ppt_undo` / `ppt_redo` | 撤销 / 重做（游标移动，合并窗内连续编辑算一步） | `dir` · `steps`（1–20，默认 1） |
| `ppt_render` | 渲染每页 PNG 预览（最终 pptx 光栅化） | `dir` · `pages` · `dpi`（默认 96） |
| `ppt_check` | 规则质检（默认）+ AI 视觉质检（只出建议不阻断） | `dir` · `pages` · `ai` |
| `ppt_export` | 导出 .pptx（规则 blocker 拦截，`skipCheck` 绕过） | `dir` · `out` · `skipCheck` |
| `ppt_import` | .pptx → PPTD 全量逆向（dropped / degraded 两级报告 + 占位形状回插） | `source` · `targetDir` · `mode`（`full` / `surgical`）· `open` |
| `ppt_open` | 让右侧栏工作台打开指定工程 | `dir` |
| `ppt_patch` | 对 .pptx 外科手术：set_text / replace_image / move_page | `source` · `ops` · `out` |

模型的标准动作顺序是 **`ppt_create`（或 `ppt_import`）→ `ppt_edit` 迭代 → `ppt_check` → `ppt_export`**；技能 `ppt-maker`（随插件注册）写明了设计系统选型与编辑纪律，模型需要时会自己读。轻改既有 .pptx（改字 / 换图 / 调页序）走 `ppt_patch`，不经 PPTD 往返。

> **提示：**导出被规则 blocker 拦住时，按 `ppt_check` 返回的 `issues` 逐条修，或 `skipCheck:true` 强导（不推荐）。`ppt_check ai:true` 返回 `ai.performed:false` 加 PNG 路径清单时，说明当前路由模型不支持图像输入，主模型自行 `read_image` 复核即可。

## 工作台

右侧栏「PPT 创客」是三栏编辑器：缩略图条 + 画布 + 属性面板。

- **底图即 DOM**：画布与缩略图把 PPTD 页 AST 直接渲染成 DOM（`client/components/PptdView.tsx`），打开即出、无需等 libreoffice 冷启动；元素、选择框、就地编辑器同一坐标系，恒对齐。table / chart / icon / SmartArt 等暂不支持渲染的元素显示灰底占位。
- **左右栏可收缩**：左栏页列表默认展开、可收起；右栏属性面板选中元素才展开。收起态只留边缘把手。
- **就地编辑**：双击文字就地改 / 拖拽调页序 / 复制删除新增页 / 替换图片 / 「导出 .pptx」落到工程目录 `export/` 下（文件名带版本号）。
- **版本历史**：「历史」抽屉直渲任意快照的画布预览并一键恢复。
- **页脚状态条**：「正在保存…」与操作反馈（导出落点、失败原因）常驻底栏，不挤压画布高度。
- **冲突保护**：所有写入带 `baseRevision`；模型在另一个会话里改了同一工程会回 409——面板只亮冲突条，不覆盖人的手改；「外部已修改」提示同理。
- **轮询与聚焦**：每 3s 拉一次状态看 manifest.revision；模型 `ppt_open` / `ppt_import` 完成后面板自动聚焦到对应工程。

## 开发

```powershell
npm install          # 安装依赖
npm test             # 全量回归（先设 12GB 堆并串行跑，见下）
npm run typecheck    # src/ 与 client/ 两份 tsconfig
npm run build        # 重出 lib/index.js 与 lib/client.js（改完 src/ 或 client/ 必跑，并提交产物）
npm run check:build  # 确认 lib/ 与 git 一致
npm run check:mounts # 挂载声明核对
```

> **提示：**全量测试需大堆串行跑（默认堆会 OOM）：先 `$env:NODE_OPTIONS='--max-old-space-size=12288'`，再 `npm test -- --no-file-parallelism`。完整验收口径与禁止事项见 [`AGENTS.md`](AGENTS.md)。

目录与「改东西去哪」：

```text
src/index.ts       宿主入口：注册技能 + 懒展开 11 个工具 + webServer 前缀路由
src/core/          引擎：pptd 契约 / officekit 构建 / 工程存储与快照 / 逆向 / 质检 / 字体嵌入
src/tools/         11 个工具的 raw JSON-Schema 契约
client/            右侧栏工作台源码（TSX → esbuild 打成 lib/client.js）
plugin/            装载壳 + host 路由（纯 JS，经 deps.core 注入 core）
skills/ppt-maker/  ppt-maker 技能：设计系统参考与生成纪律（模型自己会读）
tests/             宿主契约 / 工具 e2e / 逆向 / 字体 / bundle 守卫（语料 .pptx 不入库）
docs/              PPTD 规格 / 决策登记 / 兜底字体表
lib/               构建产物（入库；dsh plugin add 只装不构建）
```

## 更新日志

参见 [CHANGELOG.md](CHANGELOG.md)。

## 支持与致谢

- 如果这个插件对你有帮助，欢迎点亮 Star；有问题和建议请提交 [Issue](https://github.com/OMSociety/dsh-ppt-maker/issues) 或 [Pull Request](https://github.com/OMSociety/dsh-ppt-maker/pulls)，开发约定见 [`AGENTS.md`](AGENTS.md)。
- 基于 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) 插件 / 技能体系。
- 引擎 [@office-kit/pptx](https://www.npmjs.com/package/@office-kit/pptx)（0.24.0 pin）与预览 [@office-kit/pptx-preview](https://www.npmjs.com/package/@office-kit/pptx-preview)；光栅化 [@deepseek-ai/libreoffice-kit](https://www.npmjs.com/package/@deepseek-ai/libreoffice-kit)（MPL-2.0，仅调用其 API / CLI，不链改源码）。

## 许可证与作者

[MIT](LICENSE)。© 2026 [OMSociety](https://github.com/OMSociety)。
