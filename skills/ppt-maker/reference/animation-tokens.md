# 动画与转场 token 速查

动画与转场的完整词表速查。token 逐字取自本仓 `src/core/pptd/schema.ts`（`ANIMATION_ENTRANCE` / `ANIMATION_EMPHASIS` / `ANIMATION_EXIT` / `TRANSITION_EFFECTS` / `TRANSITION_PRESETS`），与引擎 `@office-kit/pptx@0.24.0` 的类型声明同源。本文件只是查表用的副本；字段语义、选项适用矩阵与校验规则以 `docs/pptd-spec.md` §7、§8 与附录 A/B 为准（仓库内）。

## A. 动画 preset（95 个）

入场（entrance）35 个、强调（emphasis）24 个、退出（exit）36 个。入场把元素放上页面（除 `appear` 外均以 `In` 结尾），退出把元素移下页面（除 `disappear` 外均以 `Out` 结尾），强调只动画已在页面上的元素、不决定显隐。

### A.1 入场（35 个）

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `appear` | 13 | `wipeIn` | 25 | `boomerangIn` |
| 2 | `blindsIn` | 14 | `expandIn` | 26 | `bounceIn` |
| 3 | `checkerboardIn` | 15 | `fadeIn` | 27 | `creditsIn` |
| 4 | `dissolveIn` | 16 | `swivelIn` | 28 | `curveUpIn` |
| 5 | `flyIn` | 17 | `zoomIn` | 29 | `dropIn` |
| 6 | `peekIn` | 18 | `centerRevolveIn` | 30 | `flipIn` |
| 7 | `randomBarsIn` | 19 | `floatIn` | 31 | `floatingIn` |
| 8 | `shapeIn` | 20 | `growTurnIn` | 32 | `pinwheelIn` |
| 9 | `splitIn` | 21 | `riseUpIn` | 33 | `spiralIn` |
| 10 | `stripsIn` | 22 | `spinnerIn` | 34 | `basicSwivelIn` |
| 11 | `wedgeIn` | 23 | `basicZoomIn` | 35 | `whipIn` |
| 12 | `wheelIn` | 24 | `stretchIn` | | |

### A.2 强调（24 个）

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `fillColor` | 9 | `complementaryColor2` | 17 | `colorPulse` |
| 2 | `fontColor` | 10 | `contrastingColor` | 18 | `growWithColor` |
| 3 | `growShrink` | 11 | `darken` | 19 | `shimmer` |
| 4 | `lineColor` | 12 | `desaturate` | 20 | `teeter` |
| 5 | `spin` | 13 | `lighten` | 21 | `blink` |
| 6 | `transparency` | 14 | `objectColor` | 22 | `boldReveal` |
| 7 | `boldFlash` | 15 | `pulse` | 23 | `wave` |
| 8 | `brushColor` | 16 | `underline` | 24 | `complementaryColor` |

### A.3 退出（36 个）

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `blindsOut` | 13 | `wipeOut` | 25 | `boomerangOut` |
| 2 | `checkerboardOut` | 14 | `contractOut` | 26 | `bounceOut` |
| 3 | `disappear` | 15 | `fadeOut` | 27 | `creditsOut` |
| 4 | `dissolveOut` | 16 | `swivelOut` | 28 | `curveDownOut` |
| 5 | `flyOut` | 17 | `zoomOut` | 29 | `dropOut` |
| 6 | `peekOut` | 18 | `centerRevolveOut` | 30 | `flipOut` |
| 7 | `randomBarsOut` | 19 | `collapseOut` | 31 | `floatingOut` |
| 8 | `shapeOut` | 20 | `floatOut` | 32 | `pinwheelOut` |
| 9 | `splitOut` | 21 | `shrinkTurnOut` | 33 | `spiralOut` |
| 10 | `stripsOut` | 22 | `sinkDownOut` | 34 | `basicSwivelOut` |
| 11 | `wedgeOut` | 23 | `spinnerOut` | 35 | `whipOut` |
| 12 | `wheelOut` | 24 | `basicZoomOut` | 36 | `stretchyOut` |

### A.4 易混淆 token

| token | 对应效果库条目 |
|---|---|
| `zoomIn` / `zoomOut` | 「Zoom」：放大的同时淡入 |
| `basicZoomIn` / `basicZoomOut` | 「Basic Zoom」 |
| `floatIn` / `floatOut` | 「Float In」/「Float Out」 |
| `floatingIn` / `floatingOut` | 「Float」的入场与退出 |
| `stretchIn` / `stretchyOut` | 入场与退出的拼写不同，按表原样使用 |
| `swivelIn` / `swivelOut` 与 `basicSwivelIn` / `basicSwivelOut` | 两套 Swivel，按表原样使用 |

## B. 转场（42 + 12 个）

### B.1 effect（42 个）

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `blinds` | 15 | `randomBar` | 29 | `wheelReverse` |
| 2 | `checker` | 16 | `split` | 30 | `window` |
| 3 | `circle` | 17 | `strips` | 31 | `prstTrans` |
| 4 | `dissolve` | 18 | `wedge` | 32 | `morph` |
| 5 | `comb` | 19 | `wheel` | 33 | `conveyor` |
| 6 | `cover` | 20 | `wipe` | 34 | `doors` |
| 7 | `cut` | 21 | `zoom` | 35 | `ferris` |
| 8 | `diamond` | 22 | `flash` | 36 | `gallery` |
| 9 | `fade` | 23 | `flip` | 37 | `glitter` |
| 10 | `newsflash` | 24 | `flythrough` | 38 | `honeycomb` |
| 11 | `plus` | 25 | `pan` | 39 | `prism` |
| 12 | `pull` | 26 | `reveal` | 40 | `ripple` |
| 13 | `push` | 27 | `shred` | 41 | `vortex` |
| 14 | `random` | 28 | `switch` | 42 | `warp` |

`"none"` 是引擎层哨兵值，不在词表内；PPTD 里「无转场」用 `export.transition: none` 或省略 `Page.transition` 表达。

### B.2 prstTrans preset（12 个）

| # | token | # | token | # | token |
|---|---|---|---|---|---|
| 1 | `fallOver` | 5 | `prestige` | 9 | `pageCurlDouble` |
| 2 | `drape` | 6 | `fracture` | 10 | `pageCurlSingle` |
| 3 | `curtains` | 7 | `crush` | 11 | `airplane` |
| 4 | `wind` | 8 | `peelOff` | 12 | `origami` |

`effect: "prstTrans"` 时必须同时给 `preset`，且取值在上表内。

### B.3 speed

`fast` = 0.5 s（默认）、`med` = 0.75 s、`slow` = 1 s。

## 使用要点

- **默认不加动画**：`Page.animations` 省略是常态；用户明确要求或现场演示才加，每页保持 1–3 个点击组，优先 `fadeIn` / `flyIn` / `zoomIn` / `wipeIn`。
- `effect` 必填（逆向方言可为 `null` 并另记 `originalEffect`）；`trigger` 默认 `onClick`，另有 `withPrevious` / `afterPrevious`。
- 效果选项（`direction` / `orientation` / `inOut` / `shape` / `spokes` / `spinDirection` / `spinDegrees` / `scaleDirection` / `scalePercent` / `transparencyPercent` / `color`）只对适用它的 preset 合法，给不适用者传选项是校验错误；适用矩阵见 `docs/pptd-spec.md` §7.3（仓库内）。
- `durationMs` 省略时由引擎按 preset 给默认值；`appear` / `disappear` / `transparency` / `boldReveal` 不接受 `durationMs`；逆向方言显式记录 `durationMs`，不依赖引擎默认值。
- 强调效果用于指出重点，不用于装饰全页；同一元素不连续叠多个强调效果。
