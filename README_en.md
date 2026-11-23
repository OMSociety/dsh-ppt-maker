<p align="center"><a href="README.md">中文</a> · <strong>English</strong></p>

<div align="center">
<h1><img src="https://raw.githubusercontent.com/OMSociety/dsh-ppt-maker/main/docs/logo.png" width="192" alt="PPT Maker"><br>PPT Maker dsh-ppt-maker</h1>

  <p>A presentation plugin for DeepSeek Harness: the model designs, builds, and reworks decks while you review and edit alongside it in the right sidebar.</p>
  <p>The result is a locally built .pptx where every word, shape, and chart stays editable in PowerPoint.</p>

  <p>
    <a href="https://www.npmjs.com/package/dsh-ppt-maker"><img src="https://img.shields.io/npm/v/dsh-ppt-maker?color=4f6ef7&label=version" alt="Version"></a>
    <a href="https://github.com/deepseek-ai/dsh"><img src="https://img.shields.io/badge/DSH-DeepSeek%20Harness-4D6BFE" alt="DSH"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="License"></a>
    <a href="https://github.com/OMSociety/dsh-ppt-maker/stargazers"><img src="https://img.shields.io/github/stars/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="Stars"></a>
    <a href="https://github.com/OMSociety/dsh-ppt-maker/issues"><img src="https://img.shields.io/github/issues/OMSociety/dsh-ppt-maker?color=4f6ef7" alt="Issues"></a>
  </p>
</div>

## What it is

**PPT Maker** splits deck-making into a workflow that both the model and you can pick up at any point. The model uses twelve `ppt_*` tools to create a project, write pages, render the real output to check its own work, run quality checks, and export. You see the same project in the "PPT 工作台" (PPT Workbench) tab of the right sidebar, where you can double-click to edit text, drag pages into a new order, or swap images at any time; the model continues from your changes.

Pages are written in **PPTD**, a YAML project format (`deck.pptd` plus one `pages/*.page` per slide) that people can read and models can write. The full specification is in [`docs/pptd-spec.md`](docs/pptd-spec.md). On export the plugin builds the final .pptx locally with [@office-kit/pptx](https://www.npmjs.com/package/@office-kit/pptx) and embeds the fonts it uses, so the deck displays correctly on machines that do not have those fonts installed.

The plugin also ships the `ppt-maker` skill, with 30 design systems across five families (academic, consulting, finance, promotion, and workplace) and guidance on writing pages. The model reads it when needed.

## Preview

### Light workbench · cover page

![The PPT Workbench in the DSH light theme: the PPT 工作台 tab at the top, three page thumbnails on the left, the cover page in the center](docs/workbench-light.png)

### Dark workbench · native chart and table

![The PPT Workbench in the DSH dark theme: the canvas shows an editable native bar chart and table](docs/workbench-dark.png)

### Actual export · SVG page

![The actual exported rendering of the project's third page: an SVG flow page compiled into editable text and shapes](docs/export-svg.png)

Both workbench images render the real workbench components, styles, and the actual three-page project data, with only the network requests replaced by local data. [`docs/preview/workbench.html`](docs/preview/workbench.html) is the same page and opens offline; switch the theme and page with `#theme=light&page=0` and `#theme=dark&page=1`. The third image is the actual rendering of the same project's third page after export to .pptx.

## Quick start

Stop the running DSH, install with `dsh plugin --profile <profile> add "dsh-ppt-maker"`, then start DSH again.

> **Tip**: After installing, refresh the browser page so the "PPT 工作台" tab appears in the right sidebar. The workbench interface is loaded with the page, so restarting the host alone is not enough.

1. Ask in chat for a deck about a topic, or hand the model an existing .pptx and describe the changes you want.
2. Once the model creates or imports a project, the workbench opens in the right sidebar automatically.
3. The model renders the real output of each page as it works to check itself; you can edit in the workbench at any time, and the model reads your changes on its next step.
4. When you are satisfied, ask the model to export, or click "导出 .pptx" (Export .pptx) in the workbench. A full-deck quality check runs first and lists any blocking issues.
5. "打开" (Open) in the footer status bar opens the result in the system's associated app; you can also choose "显示文件位置" (Show file location).

> **Dependencies**: [@deepseek-ai/libreoffice-kit](https://www.npmjs.com/package/@deepseek-ai/libreoffice-kit), used for rendering and quality checks, installs with the plugin (about 183MB per platform). Python 3.10+ is needed only for SVG pages: on first use, run `node scripts/prepare-vendor-env.mjs` once (from the plugin package root) to create a virtual environment and install its dependencies. pip uses the Tsinghua mirror by default; set `PIP_INDEX` to change the index and `PYTHON` to choose the interpreter.

> **Platforms**: Windows and macOS (x64/arm64) use the native rendering engine; Linux has no native package, so rendering and quality checks use the WASM engine. CI runs the same test suite on `windows-latest` and `ubuntu-latest`; macOS has no CI coverage yet.

## Building a new deck

Once the model picks a design system, `ppt_create` writes its colors, fonts, and text styles into the project's theme table. Pages reference them as `$primary`, `$title`, and so on, so recoloring the whole deck means editing only the theme table. Shared brand bars, footers, and corner marks go into masters and layouts that each page attaches to.

Page elements include text, shapes (177 preset shapes with adjustment values, or custom paths), lines, images, tables, and native charts (bar, column, line, area, pie, doughnut, and more, with data still editable in PowerPoint after export). Text supports gradients, outlines, shadows, letter spacing, distributed alignment, and exact insets; shapes support gradient and pattern fills, gradient outlines, and drop shadows. Elements can be grouped and move as one group in PowerPoint after export.

When a page is too complex for these elements (fine gradients, freeform curves, layered cover art), the whole page can be drawn as an SVG. On export that page compiles into native PowerPoint text boxes and shapes rather than a single picture, so each piece remains selectable and editable.

After every round of edits the model can call `ppt_render` to render real images of the final .pptx, not mockups. `ppt_export` can also write a PDF alongside the .pptx.

## Editing an existing deck

- **Changing a few words, swapping an image, or reordering pages**: `ppt_patch` edits the original file directly and keeps everything it does not touch, including parts the plugin does not model, such as SmartArt and embedded spreadsheets.
- **Major edits or a redesign**: `ppt_import` turns the .pptx into a PPTD project. Common native charts become editable chart elements, SmartArt expands into a group of editable shapes, and groups, text effects, and gradient and pattern fills are preserved. The import report lists objects that could not be converted (such as OLE objects, media, and less common chart types, each left as a placeholder in place) and properties that lost detail in conversion; the model reports these to you as they are.
- **Export uses the original file as the skeleton**: unchanged pages are kept as they are; edited pages are rebuilt from the project on their original layouts, and unconverted objects on those pages are copied back from the original file in place. Theme and masters come from the original file.

## PPT Workbench

The "PPT 工作台" tab in the right sidebar is a three-pane editor: page thumbnails on the left, the canvas in the center, and the properties panel on the right.

- **Instant view**: the canvas and thumbnails draw pages directly as web elements without waiting for a rendering engine to start. Tables, charts, and SVG pages show as they really look; objects that could not be converted on import show their preview image when one exists, or a placeholder box otherwise.
- **Direct editing**: double-click to edit text in place, drag pages to reorder them, duplicate, delete, or add pages, replace images, and set exact position and size in the properties panel.
- **Undo and history**: undo and redo are always at hand; the "历史" (History) drawer previews any version and restores it with one click.
- **No overwrites**: every write carries a version number. When the model changes the same project elsewhere, the workbench shows a conflict notice instead of overwriting your edits.
- **Export**: "导出 .pptx" runs a full-deck quality check first, then saves the result under the project's `export/` folder as `<project name>-r<version>.pptx`.

## Model tools

| Tool | Purpose | Key parameters |
|---|---|---|
| `ppt_create` | Create a project and write the chosen design system into the theme table | `dir` · `title` · `size` · `designSystem` · `theme` |
| `ppt_themes` | List the built-in design systems | `designSystem` (optional) |
| `ppt_edit` | Atomic batch edits to pages and elements; if any operation fails, nothing is saved | `dir` · `ops` · `baseRevision` |
| `ppt_undo` / `ppt_redo` | Undo / redo | `dir` · `baseRevision` · `steps` |
| `ppt_svg` | Write an SVG page source and attach it to a page, or compile it right away to check it | `dir` · `action` · `name` · `svg` · `page` |
| `ppt_render` | Build the final .pptx and render each page to PNG, returning each image's absolute path | `dir` · `pages` · `dpi` |
| `ppt_check` | Rule-based quality check; `ai: true` adds multimodal visual suggestions | `dir` · `pages` · `ai` |
| `ppt_export` | Export the .pptx, optionally with a PDF | `dir` · `out` · `pdf` · `skipCheck` |
| `ppt_import` | Turn a .pptx into a PPTD project with an import report | `source` · `targetDir` · `mode` · `open` |
| `ppt_patch` | Light edits to a .pptx: change text, swap images, reorder pages | `source` · `ops` · `out` |
| `ppt_open` | Open a project in the right-sidebar workbench | `dir` |

The rule-based check measures text with the real glyphs of the project's actual fonts and looks for text overflow, out-of-canvas elements, overlaps, contrast, structure, and missing fonts; overflow, out-of-canvas elements, and broken structure block export. Check results are tied to the project content, so any change after a check requires checking again before export. On export the plugin embeds fonts (subset, full, or off, decided per font by its license) and then re-parses and validates the result, refusing to write the file if validation fails.

> **Tip**: With `ai: true`, if the current model does not accept image input, `ppt_check` returns the list of page image paths so the main model can review them itself.

## Development

```powershell
npm install           # install dependencies
npm run typecheck     # the src/ and client/ tsconfigs
npm run build         # rebuild lib/index.js and lib/client.js (required after editing src/ or client/; commit the output)
npm run build:preview # rebuild the self-contained preview page docs/preview/workbench.html from the real workbench components
npm run check:build   # confirm lib/ matches git
npm run check:mounts  # verify mount declarations
npm run check:pack    # verify the published file list
```

> **Tip**: Run the full test suite serially with a large heap: first `$env:NODE_OPTIONS='--max-old-space-size=12288'`, then `npx vitest run --no-file-parallelism`. See [`AGENTS.md`](AGENTS.md) for the full acceptance criteria and development conventions.

```text
src/index.ts       host entry: registers the skill, the twelve tools, and the workbench webServer routes
src/core/          engine: PPTD contract, .pptx build, project storage and version snapshots, import, quality checks, font embedding, release pipeline, SVG compilation
src/tools/         JSON Schema contracts for the twelve tools
client/            workbench source (TSX, built into lib/client.js)
plugin/            loader shell and the workbench host routes
skills/ppt-maker/  the ppt-maker skill: design systems and page-writing guidance; vendor/ holds the SVG converter and its Python dependencies
tests/             host contract, tool end-to-end, import, fonts, and build-output guards; ships 20 anonymized .pptx corpus files
docs/              PPTD specification, design decisions, fallback font table, preview page
lib/               build output (committed; installs do not build)
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Support and acknowledgements

- If this plugin helps you, a Star is welcome; please send questions and suggestions as an [Issue](https://github.com/OMSociety/dsh-ppt-maker/issues) or [Pull Request](https://github.com/OMSociety/dsh-ppt-maker/pulls).
- Built on the [DeepSeek Harness](https://github.com/deepseek-ai/dsh) plugin and skill system.
- .pptx building uses [@office-kit/pptx](https://www.npmjs.com/package/@office-kit/pptx), text measurement uses [@office-kit/pptx-preview](https://www.npmjs.com/package/@office-kit/pptx-preview), and rendering uses [@deepseek-ai/libreoffice-kit](https://www.npmjs.com/package/@deepseek-ai/libreoffice-kit) (MPL-2.0; only its API is called and its source is not modified).
- The SVG converter derives from [ppt-master](https://github.com/hugohe3/ppt-master) (MIT, © 2025-2026 Hugo He) and is maintained independently in this repository; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party license details.

## License and author

[MIT](LICENSE). © 2026 [OMSociety](https://github.com/OMSociety).
