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

## 硬纪律（任何会话都必须遵守）

1. **开工先 `git status`**：看清工作区有没有上个会话的半成品，别在脏树上盲改。
2. **不推远端**：多 PR 全部完成、文档重写后才推；本地提交随便做。
3. **工具注册用 raw JSON-Schema**，禁 `import defineTool`。
4. **cwd 获取**：`exec.agent.session.id` → `ctx.sessions.get(id).header.cwd`，缺 cwd 报错不回落 process.cwd()。
5. **pin 版本**：@office-kit/pptx@0.24.0、@deepseek-ai/libreoffice-kit@0.1.2。
6. **两个合法 import 点**（PR2 起）：`src/core/engine/officekit.ts` 与 `src/core/reverse/`（读后映射盘）。其余源码不直接 import @office-kit/pptx。
7. **语料红线**：WorkBench/corpus/ 原始文件绝不提交进 git；tests/corpus/ 只收脱敏变体。
8. **文档纪律**：不写被否方案、不写日期戳战记、No Negative Echo。

## 当前进行

| 任务 | 状态 | 接手输入 |
|---|---|---|
| 人工三小项 | 待用户实测 | 已装桌面版工作区最新 lib（符号链接即时生效）：① 在未装 MiSans 的机器打开 `tests/corpus/roundtrip-embedded.pptx`（syn-academic-v1 嵌入产物）确认粗体数字 01/02/03/04 字形正确；② 放映态转场；③ 全角破界案例复验 |
| 推远端 | 人工实测后 | 本地 14+ 提交（5452f00 起），全部实测收口后统一 push + 发 npm |

## 已知坑登记（终验轮实测新增）

- **LibreOffice 渲染路径误用嵌入的子集 EOT**：pptx 含子集字体时 LO 会安装并用它渲染，出现 CJK 字形张冠李戴（如「0」→「A」）——是 LO 行为，非产物缺陷。对策：ppt_render / ppt_check / AI 审查一律渲染**嵌字体之前的裸字节**（export-pipeline.ts）。PowerPoint 对子集字体的真实行为待人工三小项①裁决。
- **预览缩略图只渲约 64% 画布**（px:pt≈2.6 应为 2.083）：ppt_render/质检 PNG 与工作台缩略图共用渲染源，修工具后工作台一并痊愈。
- **fonts-embed 幂等用例全量并行下两次抖动**（单跑不现、非超时形态），已加 `{timeout:90000, retry:2}` 缓解，根因未除。
- **TTC 表目录 offset 是文件绝对偏移**（OTSpec+fontkit 双印证），勿加 faceOffset；fontkit 的 fsType 是位域对象（如 `{editable:true}`），勿 Number() 直接比。

## 会话接力记录

- 本会话（lead）：D0 六轮字体嵌入攻坚（见下表字体嵌入行）；任务板建立与派发（任务板跨会话换代，旧 task-1~8 编号作废，PR2 现为新 task-1）；HANDOFF 初版；PR1-C 验收（81/81 复跑通过）；`~/.dsh/AGENTS.md` 路由表 kimi-ppt → ppt-maker 已改。
- 会话 1（手动开）：完成 PR1-B（task-7），提交 `5d4f93d`；顺手把 PR1-A/B 交付明细补进本表。
- 会话 2（task-8）：完成 PR1-C，提交 `f2c819b`（未推送）。
- 本会话（lead，接 PR2）：任务板换代重建（task-1~6），task-1 逆向引擎、task-3 三工具、task-6 整合接线由 lead 做；task-2 宿主路由与 task-4/5 客户端骨架/组件由队友 host-routes 与 client-skeleton 并行完成。vitest 全量 131/131 绿、tsc 全绿、tsup + build-client 串行构建通过。
- 本会话（lead，PR2 保真度修复）：按 docs/PR2-逆向保真度修复.md 完成 R1/R2/R3（明细见下表末行），vitest 131→134、tsc 全绿、构建通过。
- 本会话（lead，接 PR3）：任务板换代重建（task-1~4）：task-1 spike（fontkit/subset-font 四字体实测，WorkBench/spike-font-subset/REPORT.md——subset-font 四款全过 6–34ms、压缩 >99.8%，A 方案成立 fonttools 不进主路径；思源黑体子集产物仍 CFF/OTTO，PR3 不对 OTTO 拒嵌；LXGW 实测单 face 真 TTF 非 TTC）由子代理完成；task-2 核心层 `src/core/fonts/` 七模块（eot/fsType/resolver/subset/usage/embed/selfcheck）+ 编排层 embed-pipeline.ts 由 lead 写；task-3 接线（saveProjectPptx 嵌字体 + export 摘要落账 + check 许可预检 fontLicense.ts）由 lead 写；task-4 弃用与文档由 lead 写。关键修复三处：fsTypeOfFace TTC 偏移按 face 相对值修正；subset-font 必须传 Buffer（harfbuzzjs 对 Uint8Array 签名检查严格）；fontkit 2.x familyName 返回 `{en,zh}` 字典对象需 fontkitNameStr 拍平。vitest 134→**147/147**（新增 fonts-embed 12 例 + fonts-e2e 1 例含 oracle64 headless 裁决）、tsc 全绿、tsup 757.04KB + build-client 81.5KB、check-mounts 全绿。

- 本会话（lead，终验缺陷修复轮）：按 WorkBench/ppt-reverse/review-report.md（另一会话逐页像素级终验，FAIL）修复五条缺陷，提交 `2667cde`。明细：① P1-c 根因——run 级 fontFamily 逗号栈（"Liter, MiSans"）整串进 typeface 属 OOXML 非法，ThemeResolver.fontFamily/collectFont 按 CSS 栈语义拆槽（首段 latin、次段 ea，滤通用族）；② P1-b——richtext 早就在解析 `<li>` bullet 字段但导出端零消费者，补 setParagraphBullet + 27pt 悬挂缩进；③ 主题重置——逆向捕获 clrScheme 12 槽进 theme.colors，导出端 applyDeckTheme 回写字体/色方案；④ 表头损失——mapTable 增显式单元格 fill 与水平/垂直对齐捕获；⑤ P2 占位对比度 #6B7280→#4B5563（3.90→约 6.1）。另发现 LibreOffice 渲染路径误用嵌入子集 EOT 的怪癖（见上方「已知坑登记」），渲染路径全改裸字节。回归：引擎测试 +3（151/151）、复验脚本 13 断言 ALL PASS、构建通过；fonts-embed 抖动用例加 retry。剩余：人工三小项 → 推远端。

## 已完成

| 任务 | 交付 | 验收 |
|---|---|---|
| D0 spike ×4 | L1 0 丢件 / libreoffice-kit 可用 / pptx-editor 后备 / 字体嵌入攻克 | 报告均在 WorkBench 对应目录 |
| PPTD v3 规格 | docs/pptd-v3-spec.md 1382 行 | 95 动画词表与 @office-kit/pptx@0.24.0 d.ts 逐字对拍通过 |
| 语料 20 份 | tests/corpus/ + MANIFEST.md | 脱敏零命中、PowerPoint COM 20/20 打开成功 |
| PR1-A（task-6） | 改名 dsh-ppt-maker + 五工具 + 解析层 + 历史层 | vitest 35/35、tsup 构建通过、提交 5452f00（**本地未推送**） |
| PR1-B（task-7） | 引擎接口层（engine/types.ts + officekit.ts，唯一 import @office-kit/pptx 的文件）+ 富文本编译器（richtext.ts）+ 规则质检层（core/review/：auditTextLayout 溢出 / 出界 / 重叠 / 对比度 / validatePresentation / missingFonts）+ 共享管线（core/export-pipeline.ts：load→build→save/render/check 一条链）+ 三工具（ppt_render / ppt_export / ppt_check，raw JSON-Schema） | vitest 40/40（引擎 5 + e2e 全链含 export/render/check）、tsup 构建通过（lib/index.js 403.94KB）、e2e 实测：导出 pptx 落盘 + libreoffice-kit 渲染 PNG 成功 + 质检 pass |
| PR1-C（task-8） | AI 质检层（core/review/ai.ts：零宿主 import 结构型接口、BlockAssembler 协议手卷消费、窄校验 + 坏条目丢弃、五段降级链——缺 llm/无路由/无视觉模态/saveImages 失败/解析失败全降级 performed:false + PNG 路径 + 版式摘要；路由取 requestHeader().config，resolveModelInfo 门控，attachments.saveImages 入库）+ inject 加 llm/attachments + 语料对拍 tests/corpus-roundtrip.test.ts（20 份脱敏 pptx：页数台账/画布比例/图表表格计数/隐藏页/备注/脱敏红线）+ 文档收尾（SKILL.md 工具优先重写、README、CHANGELOG [1.0.0]、locale、cordis.patch.yml） | vitest 81/81（7 文件：corpus 26 + review-ai 15 + 既有 40）、tsc 全绿、tsup lib/index.js 416.12KB、check-mounts 0 error/0 warn；提交 `f2c819b`（本地未推送）。实测 API 形态修正：`getPresentation*CountsBySlide` 返 readonly number[]、`getSlideNotes` 返 string\|null、fumunc 两份画布 18288000×10287000 EMU |
| PR2 task-1（逆向引擎） | src/core/reverse/{types,read,map,writeProject,apply,index}.ts（新增「第二合法 import @office-kit/pptx」点）+ tests/reverse-import.test.ts + tests/__fixtures__/pptx-fixtures.ts | vitest 3/3：fixture round-trip 字段完整、chart/smartart 走 dropped + 占位、media sha1 去重 |
| PR2 task-2（宿主路由） | plugin/host/{store,routes}.mjs：per-session store（Map<sessionId,{projects,activeKey,lastSeenRevision,openRequests}>，TTL 60s）+ /ppt-maker/api 前缀路由（state/project/page/thumb/media/edit/media.upload/undo/redo/export/active/tab-opened），防护逐字照 fishpai；deps.core 注入（不 import lib/），thumbnail 走 libreoffice-kit `(abs,revision,page)` 磁盘缓存 | tests/host.test.ts 16/16：sameOrigin 各分支、413/409/415、/edit op 应用与 revision 推进、undo/redo 游标、/media/upload 白名单+5MB、openRequest TTL |
| PR2 task-3（三工具） | src/tools/{import,open,patch}.ts（raw JSON-Schema；ppt_import full/surgical 双模式、ppt_open 仅回写 openRequest、ppt_patch 三类 op 走 L1 passthrough）+ tests/tools-pr2.test.ts + 共享 fixture | tests/tools-pr2.test.ts 8/8：surgical 早退、full 导入计数、SourceNotFound 404、registerProject + requestOpen 调桥、ppt_patch 改字 + lostParts 为空 + 不原地写源文件 |
| PR2 task-4（客户端骨架） | client/{index,store,api,styles,icons,skeleton}.tsx/ts + scripts/build-client.mjs（esbuild → lib/client.js 81.5KB）+ tests/{client-bundle.guard,client-store}.test.ts | 守卫测试 9/9 + store 纪律测试 14/14；产物 `__ModuleLoader__` 形态、9 项平台种子逐字核对、metafile 输入守卫、tsc 全绿 |
| PR2 task-5（工作台组件） | client/{panel.tsx,components/{ProjectList,ThumbStrip,Stage,TextEditor,Inspector,Toolbar}.tsx} + client/store.ts 扩展（deck/deckPages/currentPageData/currentPageRevision + updateElement/movePage/duplicatePage/removePage/addPage/uploadMedia/exportDeck） | tests/client-store.test.ts 14/14、client-bundle.guard.test.ts 9/9；check-mounts 0 error |
| PR2 task-6（整合接线） | package.json（`dsh.client.platform='web'`、exports["./client"]、files 含 lib、peerDependencies 加六个 dsh 包、build 接 `tsup && node scripts/build-client.mjs`）+ src/index.ts（inject 加 webServer、新增三工具注册、plugin/host/ 按需动态 import 起 webServer 前缀路由 + 工具 backchannel 桥）+ tsconfig.json（noImplicitAny=false 给 plain-JS plugin/host/ 让路）+ tests/tools-e2e.test.ts 同步（inject 列表 + 11 个工具） | vitest 全量 131/131、tsc 全绿、tsup build 457.18KB + build-client 81.5KB 串行通过 |
| PR2 保真度修复（R1/R2/R3，施工图 docs/PR2-逆向保真度修复.md） | src/core/reverse/map.ts 单文件改造：R1 run 级富文本映射（getShapeParagraphElements + getShapeRunFormatEffective 走继承链 → `<p style>`/`<span style>`/`<strong>`/`<em>`/`<u>`/`<sup>`/`<sub>`/`<br>`/`<ul>/<ol><li>`；对齐取首个显式段落 + getShapeTextAnchor 垂直对齐，删掉 [left, top] 硬编码；读不到 run 级回落纯文本 + degraded 记账）；R2 graphicFrame 按 a:graphicData URI 分类（diagram→smartArt、chart、oleObj→ole、scene3d→object3d、未知→unknown）+ picture 内媒体剪辑经 getShapeMedia 走 media dropped，全部插占位进 report；R3 背景 slide→layout→master 继承链（resolveEffectiveBackground 取最终生效值，继承层背景记 degraded）+ deck.theme.textStyles 落 title/body 主题字体槽位 | vitest 全量 134/134（新增 3 例：R1 富文本断言 `<strong>`/`font-size:40px`/`color:#2563EB`/`text-align:center`/`line-height:1.5`/align=['center','middle']；R2 用 fflate 注入 diagram graphicFrame 断言 smartArt dropped + 占位「此处原为 SmartArt 图示」；R3 断言 slide 显式背景生效 + theme.textStyles 槽位存在）、tsc 全绿、tsup 473.92KB + build-client 81.5KB 串行通过 |
| PR3 去 Kimi 化（施工图 docs/PR3-去Kimi化-开发计划.md） | 字体子系统 `src/core/fonts/`：eot.ts（TTF→EOT 0x00020001 封装，spike 六轮实测背书）/ fsType.ts（OS/2.fsType 位闸，TTC 逐 face，Restricted·BitmapOnly 拒嵌、P&P 只读警告、NoSubset 强制整字体）/ resolver.ts（assets/fonts > 注册表/目录系统字体，fontkit 族名索引 + slot 判定，TTC 枚举）/ subset.ts（subset-font HarfBuzz WASM 子集 + 保底字符集，NoSubset/full/off 直通，失败回退整字体）/ usage.ts（deck theme+页面+表格+图表 fontFamily 与字符集收集，slot 推导）/ embed.ts（四件套幂等注入：ContentTypes Override + rels rId max+1 + fntdata EOT + presentation.xml embeddedFontLst 插位）/ selfcheck.ts（部件数/EOT 头/rId 双向/插位断言，失败即导出失败）+ embed-pipeline.ts 编排（摘要：facesEmbedded/skipped/subset 前后体积/warnings）；接线：saveProjectPptx 按 export.fontEmbed 嵌字体、ppt_export 摘要落账 manifest.exportReport、ppt_check 字体许可预检 fontLicense.ts（Restricted/BitmapOnly blocker、P&P warning、缺字体替代建议）；转场/动画沿用 PR1 引擎既有 setSlideTransition/setShapeAnimation 链路（0.24.0 原生，无需新增）；弃用：export_pptx.py / export_images.py 入口 stderr 弃用提示，SKILL.md/README/CHANGELOG/locale/pptd-v3-spec §9 全部对齐 | vitest 全量 **147/147**（新增 fonts-embed 12 例：fsType 位组合/TTC/真件读取、usage 收集、EOT 头断言、CFF 拒封装、注入+selfcheck、子集体积断言、subset+wrapEot 组合、off 直通；fonts-e2e 1 例：真实工程 create→build→saveProjectPptx 嵌 MiSans → 四件套断言 + loadPresentation 回读 + oracle64 headless 裁决 TTLoadEmbeddedFont）、tsc 全绿、tsup 757.04KB + build-client 81.5KB 串行通过、check-mounts 全绿。spike 证据：WorkBench/spike-font-subset/REPORT.md（四字体 subset-font 全过，A 方案成立） |
