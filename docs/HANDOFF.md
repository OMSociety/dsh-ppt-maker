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
| task-7 PR1-B（ppt_render/ppt_export/ppt_check） | pr1-export 中断，代码可能半成品 | 先 `git status` 看工作区；依赖已加进 package.json（libreoffice-kit@0.1.2、pptx-preview@0.15.0）需 `pnpm install`；libreoffice-kit API 形态读 `WorkBench/spike-officekit/REPORT.md`；施工图读 PR1 计划 §6 |

## 已完成

| 任务 | 交付 | 验收 |
|---|---|---|
| D0 spike ×4 | L1 0 丢件 / libreoffice-kit 可用 / pptx-editor 后备 / 字体嵌入攻克 | 报告均在 WorkBench 对应目录 |
| PPTD v3 规格 | docs/pptd-v3-spec.md 1382 行 | 95 动画词表与 @office-kit/pptx@0.24.0 d.ts 逐字对拍通过 |
| 语料 20 份 | tests/corpus/ + MANIFEST.md | 脱敏零命中、PowerPoint COM 20/20 打开成功 |
| PR1-A（task-6） | 改名 dsh-ppt-maker + 五工具 + 解析层 + 历史层 | vitest 35/35、tsup 构建通过、提交 5452f00（**本地未推送**） |

## 硬纪律（任何会话都必须遵守）

1. **开工先 `git status`**：看清工作区有没有上个会话的半成品，别在脏树上盲改。
2. **不推远端**：多 PR 全部完成、文档重写后才推；本地提交随便做。
3. **工具注册用 raw JSON-Schema**，禁 `import defineTool`。
4. ** cwd 获取**：`exec.agent.session.id` → `ctx.sessions.get(id).header.cwd`，缺 cwd 报错不回落 process.cwd()。
5. **pin 版本**：@office-kit/pptx@0.24.0、@deepseek-ai/libreoffice-kit@0.1.2。
6. **语料红线**：WorkBench/corpus/ 原始文件绝不提交进 git；tests/corpus/ 只收脱敏变体。
7. **文档纪律**：不写被否方案、不写日期戳战记、No Negative Echo。
