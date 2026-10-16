# AGENTS.md — dsh-ppt-maker Agent 宪法

适用范围：本仓库全部目录。这是接手开发的第一入口；对外说明见 [README.md](README.md)。
最后更新：2026-10-16

## 项目概览

DSH（DeepSeek Harness）插件 + 随包技能，做 PPT 的生成、编辑、逆向与本地导出。
宿主半侧注册 11 个 `ppt_*` 工具与 webServer 路由；浏览器半侧是右侧栏「PPT 创客」工作台；`skills/ppt-maker/` 是技能本体。

| 项 | 事实 |
|---|---|
| 语言 / 运行时 | TypeScript 5.9、ESM、Node >= 18（本机实测 v24.16.0） |
| 构建 | 宿主半侧 tsup：`src/` → `lib/index.js`；客户端半侧 esbuild：`client/` → `lib/client.js` |
| 测试 | vitest 3.2，`tests/**/*.test.ts`，全局超时 20s（[vitest.config.ts](vitest.config.ts)） |
| 包管理 | npm，锁文件 `package-lock.json`；根目录的 `pnpm-lock.yaml` / `pnpm-workspace.yaml` 未入库，勿提交 |
| 引擎（pin 死） | `@office-kit/pptx@0.24.0`、`@deepseek-ai/libreoffice-kit@0.1.2`（约 183MB，随包安装） |
| 宿主契约 | `@deepseek-ai/dsh-*` peerDependencies，范围 `>=0.2.0-rc.2 <0.3.0-0` |

文档索引（按读序）：

- [docs/DECISIONS.md](docs/DECISIONS.md) — 设计决策与风险登记：14 条决策、风险对策、D0 spike 结论（「为什么这么选」的出处）
- [docs/pptd-spec.md](docs/pptd-spec.md) — PPTD 格式契约（改格式前必读）
- [skills/ppt-maker/SKILL.md](skills/ppt-maker/SKILL.md) — 技能正文，模型侧用法

## 常用命令

| 目的 | 命令 |
|---|---|
| 安装依赖 | `npm install` |
| 构建两类产物 | `npm run build` |
| 全部测试 | `npm test`（先设 12GB 堆并串行跑，见下） |
| 单文件测试 | `npx vitest run tests/host.test.ts` |
| 类型检查（两个 tsconfig） | `npm run typecheck` |
| 挂载面静态核对 | `npm run check:mounts` |
| 构建产物漂移核对 | `npm run check:build`（须在 build 之后） |

测试必须带大堆并串行跑，否则本机会 OOM 或让 vitest worker 请求超时（实测：默认堆下 234 个用例跑到一半 `FATAL ERROR: invalid table size`；8GB 堆并行跑完用例后仍偶发 `[vitest-worker]: Timeout calling "onTaskUpdate"`，让整轮以 exit 1 收尾）：

```bash
NODE_OPTIONS=--max-old-space-size=12288 npm test -- --no-file-parallelism
npx vitest run tests/host.test.ts
```

Windows PowerShell 里等价写法是先把环境变量设进当前会话，再跑 `npm test -- --no-file-parallelism`：`$env:NODE_OPTIONS='--max-old-space-size=12288'`。

全量测试还有第二个前置：`tests/corpus/*.pptx` 不在 git 里（被 `.gitignore` 的 `*.pptx` 排除），缺语料时语料测试直接 ENOENT。在没有这份语料的机器上，验收链只能跑到语料测试以外的部分；补齐办法见「已知风险区」那一行。

字体类用例（`fonts-embed` / `fonts-e2e` / `fonts-resolver`）取系统已装字体：TTF 优先 `C:\Windows\Fonts\simhei.ttf`，TTC 优先 `msyh.ttc`，中文族名用例依赖「阿里妈妈数黑体」。候选一个都不在位时，相关用例用 `it.skip` 显式跳过并在运行日志里打印原因（不用用例体内的提前 `return`，那会显示为「通过」）；要换字体设 `PPT_TEST_FONT` 指向任一 TTF。

## 架构边界

三个面各有独立产物与加载方式，不要互相 import：

```text
宿主半侧    src/**            → lib/index.js    （tsup 单文件 ESM，随包提交）
客户端半侧  client/**         → lib/client.js   （esbuild，__ModuleLoader__ 形态，随包提交）
宿主路由    plugin/host/*.mjs （纯 JS，被 src/index.ts 动态 import；不 import lib/）
```

- `src/index.ts` 的 `apply()` 做三件事：注册技能、懒展开注册 11 个工具、起 webServer 前缀路由。
- 工具链：`src/tools/*.ts`（raw JSON-Schema 注册）→ `src/core/project/store.ts`（PPTD 工程读写）→ `src/core/engine/officekit.ts`（引擎实现）→ 产物。
- 工作台链：浏览器每 3s 轮询 `/ppt-maker/api/*` → `plugin/host/routes.mjs` → 经 `deps.core` 注入的同一批 `src/core` 函数（路由侧不 import `lib/`）。
- 引擎隔离：`src/core/engine/types.ts` 是接口层，换引擎只动 `officekit.ts`。新增引擎能力先扩接口，再在 `officekit.ts` 实现，其它模块只依赖 `types.ts`。
- 客户端 bundle 只允许 require 平台种子表里的 9 个模块（react 系 + cordis + dsh-client-*），种子表逐字写在 [tests/client-bundle.guard.test.ts](tests/client-bundle.guard.test.ts)。

## 关键目录

| 我要… | 改这里 |
|---|---|
| 加 / 改一个 ppt_* 工具 | 新建 `src/tools/<名字>.ts`，并加进 `src/index.ts` 的 `registerToolSuite()` 列表——两处都改，漏一处工具不出现；整组经一个回调注册，`src/lazy-tools.ts` 不用动 |
| 改 PPTD → pptx 写出 | `src/core/engine/officekit.ts`（接口在 `src/core/engine/types.ts`） |
| 改 pptx → PPTD 逆向 | `src/core/reverse/`：`read.ts` 读、`map.ts` 映射、`writeProject.ts` 落盘、`apply.ts` 占位回插 |
| 改工程读写 / 快照 / 乐观锁 | `src/core/project/store.ts`（唯一写者）、`src/core/project/history.ts`（append-only 快照 + 游标） |
| 改工作台界面 | `client/`：状态在 `client/store.ts`，组件在 `client/components/`，渲染在 `client/render/` |
| 改宿主 HTTP 路由 | `plugin/host/routes.mjs`；它要的 core 函数在 `src/index.ts` 的 `core: {...}` 里加 |
| 改质检 | 规则层 `src/core/review/index.ts`，AI 层 `src/core/review/ai.ts`，字体许可 `src/core/review/fontLicense.ts` |
| 改字体嵌入 | `src/core/fonts/`（eot / fsType / resolver / subset / usage / embed / selfcheck）+ `embed-pipeline.ts` |
| 改 PPTD 格式 | 先改 `docs/pptd-spec.md`，再改 `src/core/pptd/schema.ts`、`parse.ts` 与两侧映射 |
| 加测试 | `tests/<主题>.test.ts`；真实 pptx 语料放 `tests/corpus/`，文件名一律中性（`real-*` / `tpl-*`），不得带来源机构、会议或主题专名 |

## 修改契约

- 改 `src/` 或 `client/` 任何源码：必须 `npm run build`，并把 `lib/index.js`、`lib/client.js` 一起提交。原因：`dsh plugin add` 只安装不构建，产物不跟上用户就拿到旧代码。
- 改工具的参数或返回：必须给 `output` 补 raw JSON-Schema，且 schema 只能是对象根、`required` 含 `ok`、关键词落在宿主支持的子集内。原因：宿主对 `output.schema` 调 `assertSupportedJsonSchema`（`minLength` 之类越界关键词即注册失败），而逐工具 try/catch 把它吞成一条 warn；`parameters` 位置不设子集限制，两者门槛不同，别互相照抄。判据在 [tests/host-contract.test.ts](tests/host-contract.test.ts)。
- 加 / 删工具：工具名集合与注册数被 [tests/tools-e2e.test.ts](tests/tools-e2e.test.ts) 和 [tests/host-contract.test.ts](tests/host-contract.test.ts) 硬断言，两处一起改。
- 改 PPTD 字段或方言：先改 `docs/pptd-spec.md`（契约文档），再改实现；改完跑 `npx vitest run tests/corpus-roundtrip.test.ts tests/reverse-import.test.ts`。
- 升引擎或 libreoffice-kit 版本：先跑 `npx vitest run tests/corpus-roundtrip.test.ts` 与 `npx vitest run tests/fonts-e2e.test.ts`。`@office-kit/pptx` 是 0.x 单维护者，破坏性变更只由语料对拍兜住。
- 改挂载声明：`cordis.patch.yml` 里的 name 必须等于 `package.json` 的 name，`dsh` 段要同时有 `bundle.patch` 与 `client.platform`；改完跑 `npm run check:mounts`。
- 改依赖：用 npm 装，锁文件 `package-lock.json` 随改动一起提交；不要引入 `pnpm-lock.yaml`。

## 禁止操作

- 禁止把 `llm` / `attachments` 加进 `src/index.ts` 的 `inject`。原因：Cordis 对「声明注入但服务缺席」会让 `apply()` 无限期挂起且全程静默，实测症状是技能在目录里看得见、11 个工具与 webServer 路由全部消失。二者只能经 `ctx.get()` 调用时懒取，缺席时由 `src/core/review/ai.ts` 自行降级。
- 禁止在 `src/` 里回落 `process.cwd()`。原因：会话 cwd 只能取 `exec.agent.session.id` → `ctx.sessions.get(id).header.cwd`，回落会把工程写进宿主进程目录；取不到就报错。
- 禁止手改 `lib/index.js`、`lib/client.js`。原因：二者是 tsup / esbuild 产物，且 EOL 由 `.gitattributes` 钉死为 `lf`，重新落盘别转成 CRLF；要改先改 `src/` 或 `client/` 再 `npm run build`。
- 禁止在 `client/` 里 import `@deepseek-ai/*` 宿主包。原因：浏览器模块表只有 9 项平台种子，多一个依赖整块面板不加载（守卫测试会红）。
- 禁止把 `WorkBench/corpus/` 原始语料提交进仓库（含真实人名、机构、校徽）。`tests/corpus/` 只收脱敏变体，红线抽查在 `tests/corpus-roundtrip.test.ts`。
- 禁止未获用户确认就 push 远端。原因：推送时机由用户定（多 PR 一起推），本地提交不受限。

## 验收标准

本仓没有 CI（无 `.github/workflows`），验收在本地跑。改动完成 = 下列全部通过：

```bash
npm run typecheck
npm run build
npm run check:mounts
npm run check:build
NODE_OPTIONS=--max-old-space-size=12288 npm test -- --no-file-parallelism
```

PowerShell 下最后一条改成分两句：先 `$env:NODE_OPTIONS='--max-old-space-size=12288'`，再 `npm test -- --no-file-parallelism`。

跑之前确认 `tests/corpus/` 里 20 份语料在位。本机实测基线（2026-10-16）：typecheck 两个 tsconfig 均 0 错；build 后 `git status` 干净且 `check:build` 报「lib/ 与 git 一致」；全量 23 个测试文件 / 234 个用例通过，约 62s。

面板与工作台的改动另有一步机器测不了的验收：在宿主里跑一遍——侧栏出现「PPT 创客」页签、新会话 invoke `ppt-maker` 技能后 11 个工具进场、`ppt_import` 导入一份 `tests/corpus/` 的 pptx 后可翻页/点选/改字、导出的产物能在 PowerPoint 打开。

## 提交与协作

- 分支：`main` 是发布线，工作分支用 `feat/<主题>` 或 `fix/<主题>`（近例：`feat/history-qa-transitions`、`fix/right-rail-collapse-invisible`）。
- Commit：Conventional Commits + 中文描述，scope 用改动所在的面：`engine` / `tools` / `host` / `workbench` / `fonts` / `reverse`，如 `feat(engine): …`、`fix(workbench): …`。
- PR：无 CI，合并前在本地跑完上节五条。

## 已知风险区

| 路径 | 风险 | 改动前后置动作 |
|---|---|---|
| `tests/corpus/*.pptx` | 20 份语料被 `.gitignore` 的 `*.pptx` 排除，**一份都不在 git 里**：新克隆上语料测试直接 ENOENT，只有本机有文件；文件名与用例里的语料名一律中性 | 要随包带语料就由维护者 `git add -f` 入库一次；生成与脱敏管线在本机暂存区 `WorkBench/corpus-build/`，不在仓库里，换机只能重做 |
| `tests/host-contract.test.ts` | 硬断言工具名集合、注册数与 `output.schema` 的关键词子集 | 加删工具或改 schema 后必跑 |
| `src/index.ts` | `core: {...}` 接线漏传函数 → 运行时 `is not a function` | 改后 `npm run build`；`tests/host-bundle.test.ts` 是哨兵 |
| `src/tools/*.ts` | 缺 `output` schema → 宿主拒收、被吞成 warn，工具静默全灭 | 每个工具都要 output schema；跑 `tests/tools-e2e.test.ts` |
| `src/lazy-tools.ts` | 工具懒展开只在技能被成功 invoke 后发生，改触发条件会让工具静默不出场 | 跑 `tests/lazy-tools.test.ts`，并在新会话里验证「invoke 技能后工具进场」 |
| `src/core/fonts/` | TTC 表目录 offset 是文件绝对偏移（勿加 faceOffset）；fontkit 的 fsType 是位域对象（勿 `Number()` 直接比） | 跑 `tests/fonts-embed.test.ts` 与 `tests/fonts-e2e.test.ts` |
| `src/core/reverse/map.ts` | 逆向保真度是产品护城河（R1 富文本、R2 graphicFrame 分类、R3 背景继承已修），但自动化只有合成 fixture | 跑 `tests/reverse-import.test.ts`；真实语料没有逆向回归落点，改动后人工 `ppt_import` 一份 `tests/corpus/` 文件复核 |
| `tests/fonts-embed.test.ts` | 幂等用例并行下会抖动（单跑不现），已加 `{timeout:90000, retry:2}`，根因未除 | 它红了先单跑一次再判断 |
| `src/core/export-pipeline.ts` | 预览/质检必须渲染**未嵌字体**的裸字节：LibreOffice 会误用嵌入的子集 EOT，出现字形张冠李戴（「0」渲染成「A」） | 别把渲染源换成嵌字体后的字节；字体嵌入的真实效果只能靠 PowerPoint/WPS 人工核对 |

## 出错怎么办

| 症状（可检索片段） | 处理 |
|---|---|
| `FATAL ERROR: invalid table size` / `Allocation failed - JavaScript heap out of memory` | 设 12GB 堆再跑：`$env:NODE_OPTIONS='--max-old-space-size=12288'` |
| `[vitest-worker]: Timeout calling "onTaskUpdate"`（用例其实全过，却以 exit 1 收尾） | 本机高负载下 worker RPC 超时，非用例失败：加 `--no-file-parallelism` 或加大堆重跑 |
| `Test timed out in 20000ms` | 重文件（fonts-embed / tools-e2e / qa-ledger / fonts-resolver）单独跑 `npx vitest run tests/<文件>`；全局超时在 `vitest.config.ts` |
| `[check-build] lib/ 有未提交漂移` | `npm run build`，把两个产物一起提交 |
| `[check-mounts] … 不一致` | 对齐 `cordis.patch.yml` 的 name 与 `package.json` 的 name、`dsh` 段，再 build |
| `listProjectHistory is not a function` | `src/index.ts` 的 core 接线改了没重跑 `npm run build` |
| 面板整块不加载 / `missed the module table` | 客户端 bundle 引了平台种子之外的包；跑 `tests/client-bundle.guard.test.ts` |
| 会话工具表里没有 `ppt_*` | 懒展开未触发，先在对话里 invoke `ppt-maker` 技能 |
| 产物里有「此处原为 SmartArt 图示」一类占位 | 预期行为（dropped + 占位回插），语义见 `docs/pptd-spec.md` |

## 维护

本文件与代码同 PR 更新。改动以下内容时必须同步本文件：`package.json` 的 scripts 与依赖版本、`src/index.ts` 的工具注册表与 inject 列表、`cordis.patch.yml` 的挂载声明、语料与脱敏红线。工具增减还要同步 [README.md](README.md) 与 [skills/ppt-maker/SKILL.md](skills/ppt-maker/SKILL.md) 里的工具清单；工具名录以 `src/index.ts` 的注册表与那两条测试断言为准。[skills/ppt-maker/reference/pptd.md](skills/ppt-maker/reference/pptd.md) 是上游快照，`docs/pptd-spec.md` 的承继条款按行号点名它：改它的行数就必须同步改规格里的 `reference/pptd.md:<起>-<止>`（本仓已删掉它的 `version` 字段声明，快照现为 2027 行）；本仓格式以 `docs/pptd-spec.md` 为准。
本文件写的是约定与边界，发现与代码不符时先判断哪边过时：约定过时改本文件，代码违规改代码。`docs/DECISIONS.md` 记的是决策依据，与现状冲突时以代码和测试为准。
