# Changelog

本项目的更改记录在此文件。

All notable changes to this project are documented in this file.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-11-02

### Added

- `tests/corpus/` 的 20 份脱敏 pptx 随仓库分发：此前被 `.gitignore` 的 `*.pptx` 排除，干净克隆上 25 个语料用例恒定 ENOENT。
- `scripts/desensitize-corpus.mjs`：语料脱敏（地点、日期、届次换成占位），带 `--check` 复查模式。
- `THIRD_PARTY_NOTICES.md`：列出内联进 `lib/index.js` 的第三方代码及其许可。
- `.github/workflows/ci.yml`：安装、类型检查、挂载核对、构建漂移核对与轻量单测。

### Changed

- `package-lock.json` 的解析地址统一到 `registry.npmjs.org`（原混有 38 条镜像地址，npm 12 默认拒绝从非 registry 主机取包，`npm ci` 直接失败）。
- `allowScripts` 按包名放行 `esbuild`，不再钉死已被上游抬走的 `0.27.7`。
- `dsh.manifestVersion` 补为 `1`。

### Fixed

- 干净克隆上 `npm ci` 因镜像地址失败的问题。