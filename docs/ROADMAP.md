# dsh-ppt-maker 重写路线图

> 本文档是三份 PR 计划 + 三方审查（架构 / DSH 域坑 / 挑战者）+ 全部盘问决策的最终收敛。
> 项目从 dsh-kimi-ppt 改头换脸重写为 dsh-ppt-maker，版本重启 1.0.0，**不考虑旧兼容、不考虑旧用户迁移**。

## 产品定位

护城河是**双向性**：读、改、修任何一份已存在的 pptx（竞品 dsh-ppt 实测只有生成能力，不能读改既有文件）。
辅以 PPTD 格式（Agent 友好、单页自包含、用户可肉眼审查）、本地优先导出、设计系统厚度。
不退守学术小场景；学术是组合拳落点（与 paper-writer/sciverse/mineru 联动的「论文→答辩」流水线），不是产品边界。

## 总决策清单（盘问确认，逐条有主）

| # | 决策 | 结论 |
|---|---|---|
| 1 | 包名 | dsh-ppt-maker（npm 已确认可用）；PR 1 开工即改名，避免客户端产物返工 |
| 2 | 技能 key | 随包名统一换新（不再叫 kimi-ppt）；cordis.patch.yml、plugin 硬编码、README、locale 同步改；提醒用户改 ~/.dsh/AGENTS.md 路由表 |
| 3 | 版本号 | 新包生命周期统一从 1.0.0 起 |
| 4 | peerDeps | 收窄为 `>=0.2.0-rc.2 <0.3.0-0`，放弃 0.1.x |
| 5 | 语言栈 | **全 TS**。python-pptx/Pillow 降级为「逃生舱」（处理库拒收的破损文件），不做主线 |
| 6 | 引擎 | @office-kit/pptx **pin 0.24.0**（动画 95 preset、转场含 morph；0.x 单维护者，引擎接口化 + PPTD 不暴露库 API + 20 份语料双向对拍，三件套进 PR1 验收） |
| 7 | 格式 | PPTD v3 自主化：不再跟踪 Moonshot 上游，pptd.md 成为自家契约，显式定义逆向方言（绝对几何超集） |
| 8 | 质检 | **规则引擎为主**（pptx-preview 的 auditTextLayout/findShapesOutsideCanvas/findOverlappingShapePairs + 对比度 + missingFonts）阻断式；AI 多模态降级为按需深检（截图对象是 libreoffice-kit 渲染的成品页） |
| 9 | 工作台 | **先 spike @office-kit/pptx-editor**（1 天验证能否挂进 sidebar.right.pane.tab）；不行则回退**完整可视化编辑器**（缩略图条+画布 overlay+Inspector+拖拽页序） |
| 10 | 逆向 | 轻改走**外科手术模式**（loadPresentation 直接 patch 文本/图片/页序，L1 passthrough 契约保未建模部件）；全量逆向 PPTD 是 opt-in 高阶动作；不支持元素**插占位提示** |
| 11 | 字体嵌入 | fflate 后处理注入 fntdata（库无 API，已实测）；字体解析用宿主已有 **fontkit**（不手写 TTC 重建）；子集化默认 subset；fsType=Preview&Print 嵌入+警告；预览加载嵌入字体 |
| 12 | CJK 兜底字体 | **砍**。预子集化撞上未覆盖字即哑弹，且与字体嵌入功能重复；改为嵌入实际用到的字体 + missingFonts 警告。西文/等宽小子集（Inter/JetBrains Mono）可打包 |
| 13 | 桌面轨道 | 限期删除：本版 deprecated + 入口提示，下个次版本删 export_pptx.py/export_images.py/export_host.html |
| 14 | LibreOffice 精确预览 | 进 PR（用宿主已有 libreoffice-kit，渲染成品 pptx 页面 PNG） |

## 重排后的实施顺序

```
D0 spike（约 1 天，全部并行）
  ├─ 手工拼最小嵌字体 pptx → PowerPoint/WPS 双机开盖实测
  ├─ 3 份真实 pptx 经 loadPresentation→保存→比对（验证 L1 passthrough）
  ├─ libreoffice-kit renderImages 出图冒烟
  └─ pptx-editor 挂 sidebar.right.pane.tab 可行性
        ↓
语料采集（与开发并行）：20 份真实 pptx（答辩/咨询/课程）
        ↓
PPTD v3 方言规格（先文档后码，含逆向超集）
        ↓
PR 1  工具层 + 规则质检（含改名、pin 0.24.0、引擎接口化）
        ↓
PR 2  逆向（TS 化 loadPresentation + 双向对拍）+ 工作台
        ↓
PR 3  字体嵌入（收窄为 fontkit 读 + fflate 注入 + fsType 闸）+ 转场动画接线
        ↓
改名收尾：npm 旧包 deprecate、GitHub 仓库改名、文档重写、桌面轨道删除
```

重排理由（挑战者指出三处倒挂）：最大不确定性（字体嵌入）最先排雷；逆向产出的真实语料反哺工具层测试；改名是纯文档零风险动作随时可做。

## 风险登记

| 风险 | 状态 | 对策 |
|---|---|---|
| @office-kit/pptx 0.x 破坏性变更 | 已防 | pin 0.24.0 + 引擎接口化 + 语料对拍 |
| 字体嵌入 EOT/MicroType | 攻坚中 | D0 实测：fntdata 只收 EOT 封装、未压缩 EOT 被拒；MTX 无公开编码器。限时 headless 攻坚（Windows SDK t2embed.h 精确签名构建 / wine 源码加载语义审计 / 开源 MTX 编码器检索）；失败则 PR3 不带嵌入交付（转场+动画+missingFonts 警告+字体包侧车），嵌入列为 1.0 后课题 |
| 宿主 Node 版本 | 已排除 | 宿主 Node v24.21.0 ≥ 库要求 22.18 |
| LLM 视觉通路 | 已确认可行 | llm + attachments 服务源码实证；resolveModelInfo 模态门控；read_image 兜底 |
| typeface 名不匹配静默失效 | 已防 | 同源取值 + 实测兜底 |
| libreoffice-kit 体积 | 已接受 | 硬依赖 ~183MB/平台（用户拍板），锁 0.1.2 与宿主同轨 |
| LibreOffice 不用嵌入字体渲染 | 已知 | 预览/质检所见 ≠ 嵌入字体效果；嵌入字体验证只能靠 PowerPoint/WPS 实测清单 |

## D0 Spike 结论存档（已全部完成）

| Spike | 结论 | 报告 |
|---|---|---|
| L1 passthrough | **0 丢件**：5 份样本（含 chart/SmartArt/嵌入字体/批注/母版，最大 21.4MB）round-trip 逐部件 sha1 全同；load 30ms/save 99ms | WorkBench/spike-officekit/REPORT.md |
| libreoffice-kit | **可用**：公开 npm 包，硬依赖定案；missingFonts 诊断现成；锁 0.1.2（0.1.5 起 koffi FFI 架构分叉） | 同上 |
| pptx-editor | 可嵌入、中文可构建期劫持，但**用户拍板自研编辑器**；报告留档后备 | WorkBench/spike-pptx-editor/REPORT.md |
| 字体嵌入 | 见 spike-fonts 报告（进行中） | WorkBench/spike-font-embed/ |

## 计划文档索引

- [PR1-工具层与质检-开发计划.md](PR1-工具层与质检-开发计划.md)
- [PR2-逆向与工作台-开发计划.md](PR2-逆向与工作台-开发计划.md)
- [PR3-去Kimi化-开发计划.md](PR3-去Kimi化-开发计划.md)（审查修正见文内「审查修订」节）
- [fallback-fonts.md](fallback-fonts.md)（已按决策 12 修订）
