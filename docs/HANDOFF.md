# dsh-ppt-maker 重写项目 · 交接总站

> 这个文件是多会话协作的总入口。任何新会话/新 agent 接手时先读本文件，再按「当前进行」里的指针读对应文档。
> 每次交接后更新：把「当前进行」挪进「已完成」、写清下一件事的输入与验收标准。

## 项目一句话

把 dsh-kimi-ppt 改头换脸重写为 **dsh-ppt-maker**（npm 新包、版本重启 1.0.0、不考虑旧兼容）：纯 TS 工具层（ppt_* 工具集）+ 自研右侧栏编辑器 + PPTX↔PPTD 双向转换 + 字体嵌入本地导出，摆脱对 kimi.com 的依赖。

## 核心文档（按读序）

| 文档 | 内容 |
|---|---|
| [ROADMAP.md](ROADMAP.md) | 总决策 14 条 + 实施顺序 + 风险登记 + D0 结论存档 |
| [PR1-工具层与质检-开发计划.md](PR1-工具层与质检-开发计划.md) | PR1 施工图（7 工具、引擎接口层、快照/游标、质检分层） |
| [PR2-逆向与工作台-开发计划.md](PR2-逆向与工作台-开发计划.md) | PR2 施工图（逆向、外科手术模式、自研编辑器、webServer 路由） |
| [PR3-去Kimi化-开发计划.md](PR3-去Kimi化-开发计划.md) | PR3 施工图（字体嵌入 EOT、转场动画、桌面轨道删除；审查修订 8 条优先级最高） |
| [pptd-v3-spec.md](pptd-v3-spec.md) | PPTD v3 规格（双方言、95 动画词表、export 契约、placeholder） |
| [fallback-fonts.md](fallback-fonts.md) | 字体选型终版（CJK 不打包，嵌入实际用到的字体） |

## 关键实测资产（WorkBench/，勿删）

| 路径 | 内容 |
|---|---|
| `WorkBench/spike-font-embed/REPORT.md` | 字体嵌入六轮全记录；eot-wrap.mjs / embed-fonts.mjs / verify.mjs（19 断言）；r6/oracle64.exe headless 裁决器（t2embed!TTLoadEmbeddedFont 直调） |
| `WorkBench/spike-officekit/REPORT.md` | L1 passthrough 0 丢件证据；libreoffice-kit API 实测形态 |
| `WorkBench/spike-pptx-editor/REPORT.md` | pptx-editor 可嵌入+中文劫持方案（后备） |
| `WorkBench/corpus/` | 原始语料 7 份（含现实元素，**绝不进仓库**） |

## 当前进行

| 任务 | 状态 | 接手输入 |
|---|---|---|
| PR2（逆向 + 外科手术模式 + 自研编辑器 + webServer 路由） | 未开工 | 施工图读 docs/PR2-逆向与工作台-开发计划.md；PR1 三件套已全部收口（下方已完成表），引擎 pin 与质检分层契约冻结 |

## 会话接力记录

- 本会话（lead）：D0 六轮字体嵌入攻坚（见下表字体嵌入行）；任务板建立与派发（任务板跨会话换代，旧 task-1~8 编号作废，PR2 现为新 task-1）；HANDOFF 初版；PR1-C 验收（81/81 复跑通过）；`~/.dsh/AGENTS.md` 路由表 kimi-ppt → ppt-maker 已改。
- 会话 1（手动开）：完成 PR1-B（task-7），提交 `5d4f93d`；顺手把 PR1-A/B 交付明细补进本表。
- 会话 2（task-8）：完成 PR1-C，提交 `f2c819b`（未推送）。

## 已完成

| 任务 | 交付 | 验收 |
|---|---|---|
| D0 spike ×4 | L1 0 丢件 / libreoffice-kit 可用 / pptx-editor 后备 / 字体嵌入攻克 | 报告均在 WorkBench 对应目录 |
| PPTD v3 规格 | docs/pptd-v3-spec.md 1382 行 | 95 动画词表与 @office-kit/pptx@0.24.0 d.ts 逐字对拍通过 |
| 语料 20 份 | tests/corpus/ + MANIFEST.md | 脱敏零命中、PowerPoint COM 20/20 打开成功 |
| PR1-A（task-6） | 改名 dsh-ppt-maker + 五工具 + 解析层 + 历史层 | vitest 35/35、tsup 构建通过、提交 5452f00（**本地未推送**） |
| PR1-B（task-7） | 引擎接口层（engine/types.ts + officekit.ts，唯一 import @office-kit/pptx 的文件）+ 富文本编译器（richtext.ts）+ 规则质检层（core/review/：auditTextLayout 溢出 / 出界 / 重叠 / 对比度 / validatePresentation / missingFonts）+ 共享管线（core/export-pipeline.ts：load→build→save/render/check 一条链）+ 三工具（ppt_render / ppt_export / ppt_check，raw JSON-Schema） | vitest 40/40（引擎 5 + e2e 全链含 export/render/check）、tsup 构建通过（lib/index.js 403.94KB）、e2e 实测：导出 pptx 落盘 + libreoffice-kit 渲染 PNG 成功 + 质检 pass |
| PR1-C（task-8） | AI 质检层（core/review/ai.ts：零宿主 import 结构型接口、BlockAssembler 协议手卷消费、窄校验 + 坏条目丢弃、五段降级链——缺 llm/无路由/无视觉模态/saveImages 失败/解析失败全降级 performed:false + PNG 路径 + 版式摘要；路由取 requestHeader().config，resolveModelInfo 门控，attachments.saveImages 入库）+ inject 加 llm/attachments + 语料对拍 tests/corpus-roundtrip.test.ts（20 份脱敏 pptx：页数台账/画布比例/图表表格计数/隐藏页/备注/脱敏红线）+ 文档收尾（SKILL.md 工具优先重写、README、CHANGELOG [1.0.0]、locale、cordis.patch.yml） | vitest 81/81（7 文件：corpus 26 + review-ai 15 + 既有 40）、tsc 全绿、tsup lib/index.js 416.12KB、check-mounts 0 error/0 warn；提交 `f2c819b`（本地未推送）。实测 API 形态修正：`getPresentation*CountsBySlide` 返 readonly number[]、`getSlideNotes` 返 string\|null、fumunc 两份画布 18288000×10287000 EMU |

## 硬纪律（任何会话都必须遵守）

1. **开工先 `git status`**：看清工作区有没有上个会话的半成品，别在脏树上盲改。
2. **不推远端**：多 PR 全部完成、文档重写后才推；本地提交随便做。
3. **工具注册用 raw JSON-Schema**，禁 `import defineTool`。
4. ** cwd 获取**：`exec.agent.session.id` → `ctx.sessions.get(id).header.cwd`，缺 cwd 报错不回落 process.cwd()。
5. **pin 版本**：@office-kit/pptx@0.24.0、@deepseek-ai/libreoffice-kit@0.1.2。
6. **语料红线**：WorkBench/corpus/ 原始文件绝不提交进 git；tests/corpus/ 只收脱敏变体。
7. **文档纪律**：不写被否方案、不写日期戳战记、No Negative Echo。
