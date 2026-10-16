/**
 * PPTD schema — the self-owned contract.
 *
 * Normative source: `docs/pptd-spec.md`. The format is an incremental spec: the
 * fields defined there are written out in full, everything else is inherited
 * from the upstream snapshot at `skills/ppt-maker/reference/pptd.md` by named
 * inheritance clauses. Those inherited parts are deliberately *not* re-typed in
 * detail here — a loose index signature keeps such fields flowing through the
 * tool layer unchanged, which is what "PPTD is an agent-friendly, human
 * reviewable DSL" requires. The types below cover every decision point that
 * the tool layer reads, writes or validates.
 *
 * The two dialects (profiles) are the core idea:
 *  - `generate`: design-system slots (`$key`) + generation semantics, what an
 *    agent writes from scratch.
 *  - `reverse`: absolute-geometry superset, what an importer produces; explicit
 *    literals, provenance fields, no theme fallback.
 */

/* ------------------------------------------------------------------ *
 * Profiles
 * ------------------------------------------------------------------ */

export type Profile = 'generate' | 'reverse'

/** Deck-level default for `profile` (spec §2.1 rule 2). */
export const DEFAULT_PROFILE: Profile = 'generate'

/* ------------------------------------------------------------------ *
 * Vocabularies (engine-version anchored: @office-kit/pptx@0.24.0)
 * ------------------------------------------------------------------ */

/** Annex A.1 — entrance presets (35). */
export const ANIMATION_ENTRANCE = [
  'appear',
  'blindsIn',
  'checkerboardIn',
  'dissolveIn',
  'flyIn',
  'peekIn',
  'randomBarsIn',
  'shapeIn',
  'splitIn',
  'stripsIn',
  'wedgeIn',
  'wheelIn',
  'wipeIn',
  'expandIn',
  'fadeIn',
  'swivelIn',
  'zoomIn',
  'centerRevolveIn',
  'floatIn',
  'growTurnIn',
  'riseUpIn',
  'spinnerIn',
  'basicZoomIn',
  'stretchIn',
  'boomerangIn',
  'bounceIn',
  'creditsIn',
  'curveUpIn',
  'dropIn',
  'flipIn',
  'floatingIn',
  'pinwheelIn',
  'spiralIn',
  'basicSwivelIn',
  'whipIn'
] as const

/** Annex A.2 — emphasis presets (24). */
export const ANIMATION_EMPHASIS = [
  'fillColor',
  'fontColor',
  'growShrink',
  'lineColor',
  'spin',
  'transparency',
  'boldFlash',
  'brushColor',
  'complementaryColor2',
  'contrastingColor',
  'darken',
  'desaturate',
  'lighten',
  'objectColor',
  'pulse',
  'underline',
  'colorPulse',
  'growWithColor',
  'shimmer',
  'teeter',
  'blink',
  'boldReveal',
  'wave',
  'complementaryColor'
] as const

/** Annex A.3 — exit presets (36). */
export const ANIMATION_EXIT = [
  'blindsOut',
  'checkerboardOut',
  'disappear',
  'dissolveOut',
  'flyOut',
  'peekOut',
  'randomBarsOut',
  'shapeOut',
  'splitOut',
  'stripsOut',
  'wedgeOut',
  'wheelOut',
  'wipeOut',
  'contractOut',
  'fadeOut',
  'swivelOut',
  'zoomOut',
  'centerRevolveOut',
  'collapseOut',
  'floatOut',
  'shrinkTurnOut',
  'sinkDownOut',
  'spinnerOut',
  'basicZoomOut',
  'boomerangOut',
  'bounceOut',
  'creditsOut',
  'curveDownOut',
  'dropOut',
  'flipOut',
  'floatingOut',
  'pinwheelOut',
  'spiralOut',
  'basicSwivelOut',
  'whipOut',
  'stretchyOut'
] as const

/** Annex A — the full `AnimationEffect` vocabulary (95 tokens). */
export const ANIMATION_EFFECTS: readonly string[] = [
  ...ANIMATION_ENTRANCE,
  ...ANIMATION_EMPHASIS,
  ...ANIMATION_EXIT
]

export const ANIMATION_EFFECT_SET: ReadonlySet<string> = new Set(ANIMATION_EFFECTS)

/** Annex B.1 — page transition effects (42). `"none"` is an engine sentinel, not a token. */
export const TRANSITION_EFFECTS = [
  'blinds',
  'checker',
  'circle',
  'dissolve',
  'comb',
  'cover',
  'cut',
  'diamond',
  'fade',
  'newsflash',
  'plus',
  'pull',
  'push',
  'random',
  'randomBar',
  'split',
  'strips',
  'wedge',
  'wheel',
  'wipe',
  'zoom',
  'flash',
  'flip',
  'flythrough',
  'pan',
  'reveal',
  'shred',
  'switch',
  'wheelReverse',
  'window',
  'prstTrans',
  'morph',
  'conveyor',
  'doors',
  'ferris',
  'gallery',
  'glitter',
  'honeycomb',
  'prism',
  'ripple',
  'vortex',
  'warp'
] as const

export const TRANSITION_EFFECT_SET: ReadonlySet<string> = new Set(TRANSITION_EFFECTS)

/** Annex B.2 — `prstTrans` presets (12). */
export const TRANSITION_PRESETS = [
  'fallOver',
  'drape',
  'curtains',
  'wind',
  'prestige',
  'fracture',
  'crush',
  'peelOff',
  'pageCurlDouble',
  'pageCurlSingle',
  'airplane',
  'origami'
] as const

export const TRANSITION_PRESET_SET: ReadonlySet<string> = new Set(TRANSITION_PRESETS)

/** Spec §8.3 — which `direction` values each transition effect accepts. */
export const TRANSITION_DIRECTION_DOMAIN: Readonly<Record<string, readonly string[] | 'none'>> = {
  blinds: ['horz', 'vert'],
  checker: ['horz', 'vert'],
  comb: ['horz', 'vert'],
  randomBar: ['horz', 'vert'],
  doors: ['horz', 'vert'],
  window: ['horz', 'vert'],
  push: ['l', 'r', 'u', 'd'],
  wipe: ['l', 'r', 'u', 'd'],
  vortex: ['l', 'r', 'u', 'd'],
  pan: ['l', 'r', 'u', 'd'],
  glitter: ['l', 'r', 'u', 'd'],
  prism: ['l', 'r', 'u', 'd'],
  cover: ['l', 'r', 'u', 'd', 'lu', 'ru', 'ld', 'rd'],
  pull: ['l', 'r', 'u', 'd', 'lu', 'ru', 'ld', 'rd'],
  strips: ['lu', 'ru', 'ld', 'rd'],
  ripple: ['center', 'lu', 'ru', 'ld', 'rd'],
  switch: ['l', 'r'],
  flip: ['l', 'r'],
  ferris: ['l', 'r'],
  gallery: ['l', 'r'],
  conveyor: ['l', 'r'],
  reveal: ['l', 'r'],
  zoom: ['in', 'out'],
  split: ['in', 'out'],
  warp: ['in', 'out'],
  flythrough: ['in', 'out'],
  shred: ['in', 'out']
}

/** Spec §7.3 — animation effect options. An option outside its list is an error, never ignored. */
export const ANIMATION_OPTION_APPLICABILITY: Readonly<Record<string, readonly string[]>> = {
  direction: [
    'flyIn',
    'flyOut',
    'wipeIn',
    'wipeOut',
    'peekIn',
    'peekOut',
    'stripsIn',
    'stripsOut'
  ],
  orientation: [
    'blindsIn',
    'blindsOut',
    'randomBarsIn',
    'randomBarsOut',
    'checkerboardIn',
    'checkerboardOut',
    'splitIn',
    'splitOut'
  ],
  inOut: ['shapeIn', 'shapeOut', 'splitIn', 'splitOut'],
  shape: ['shapeIn', 'shapeOut'],
  spokes: ['wheelIn', 'wheelOut'],
  spinDirection: ['spin'],
  spinDegrees: ['spin'],
  scaleDirection: ['growShrink'],
  scalePercent: ['growShrink'],
  transparencyPercent: ['transparency'],
  color: [
    'fillColor',
    'fontColor',
    'lineColor',
    'brushColor',
    'objectColor',
    'colorPulse',
    'growWithColor'
  ]
}

/** Effects that are instantaneous / hold forever and therefore reject `durationMs` (§7.5). */
export const ANIMATION_DURATION_FORBIDDEN: readonly string[] = [
  'appear',
  'disappear',
  'transparency',
  'boldReveal'
]

/** Effects whose shape animation only covers the shape itself, so `build` must stay `asOneObject`. */
export const ANIMATION_BUILD_RESTRICTED: readonly string[] = ['fillColor', 'lineColor']

export const ANIMATION_DIRECTIONS = [
  'top',
  'right',
  'bottom',
  'left',
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight'
] as const

export const ANIMATION_ORIENTATIONS = ['horizontal', 'vertical'] as const
export const ANIMATION_IN_OUT = ['in', 'out'] as const
export const ANIMATION_SHAPES = ['circle', 'box', 'diamond', 'plus'] as const
export const ANIMATION_SPOKES = [1, 2, 3, 4, 8] as const
export const ANIMATION_TRIGGERS = ['onClick', 'withPrevious', 'afterPrevious'] as const
export const ANIMATION_SPIN_DIRECTIONS = ['clockwise', 'counterclockwise'] as const
export const ANIMATION_SCALE_DIRECTIONS = ['both', 'horizontal', 'vertical'] as const
export const ANIMATION_TEXT_BUILDS = ['asOneObject', 'allAtOnce', 'byParagraph'] as const

/** Element types per profile (spec §6.0 table). */
export const GENERATE_ELEMENT_TYPES = [
  'text',
  'shape',
  'line',
  'image',
  'icon',
  'table',
  'chart'
] as const

export const REVERSE_ELEMENT_TYPES = [
  'text',
  'shape',
  'line',
  'image',
  'table',
  'placeholder'
] as const

export const PLACEHOLDER_ORIGINAL_TYPES = [
  'chart',
  'smartArt',
  'group',
  'media',
  'ole',
  'object3d',
  'unknown'
] as const

export const PLACEHOLDER_DEFAULT_LABELS: Readonly<Record<string, string>> = {
  chart: '此处原为图表',
  smartArt: '此处原为 SmartArt 图示',
  group: '此处原为组合图形',
  media: '此处原为媒体（音频/视频）',
  ole: '此处原为嵌入对象',
  object3d: '此处原为三维图形',
  unknown: '此处原为未建模元素'
}

export const SCHEME_COLOR_TOKENS = [
  'bg1',
  'tx1',
  'bg2',
  'tx2',
  'accent1',
  'accent2',
  'accent3',
  'accent4',
  'accent5',
  'accent6',
  'hlink',
  'folHlink',
  'phClr',
  'lt1',
  'dk1',
  'lt2',
  'dk2'
] as const

export const THEME_REF_PREFIX = '$'
export const SCHEME_REF_PREFIX = 'scheme:'

/* ------------------------------------------------------------------ *
 * Types (spec §3–§5, §7, §10)
 * ------------------------------------------------------------------ */

export type ExportFontEmbed = 'subset' | 'full' | 'off'
/** Spec §3.2 — `"auto"` 按策展词表逐页轮换（fade → push → wipe），其余语义见 §8.1。 */
export type ExportTransition = 'fade' | 'none' | 'auto'
export type ExportAnimations = 'auto' | 'off'

/** Spec §3.2 — the export contract. Three independent fields, all optional. */
export interface ExportConfig {
  fontEmbed?: ExportFontEmbed
  transition?: ExportTransition
  animations?: ExportAnimations
}

/** Spec §3.2 defaults. */
export const DEFAULT_EXPORT: Required<ExportConfig> = {
  fontEmbed: 'subset',
  transition: 'fade',
  animations: 'auto'
}

export interface DeckSource {
  path: string
  sha1?: string
  slideCount: number
  size: [number, number]
  app?: string
}

export interface Theme {
  colors?: Record<string, string>
  textStyles?: Record<string, Record<string, unknown>>
  tableStyles?: Record<string, Record<string, unknown>>
  [key: string]: unknown
}

export interface CustomFont {
  name: string
  src?: string
  [key: string]: unknown
}

/** Spec §3.1 — deck.pptd. */
export interface Presentation {
  profile?: Profile
  title?: string
  size: [number, number]
  customFonts?: CustomFont[]
  theme?: Theme
  export?: ExportConfig
  pages: string[]
  source?: DeckSource
  [key: string]: unknown
}

export interface LayoutRef {
  partName: string
  name?: string
  type?: string | null
  masterPartName?: string
  [key: string]: unknown
}

export interface SourceRef {
  slideIndex: number
  shapeId: number
  partName?: string
}

/** Spec §8.2 — page-level transition (reverse dialect only). */
export interface PageTransition {
  effect: string
  unmodeled?: boolean
  speed?: 'slow' | 'med' | 'fast'
  durationMs?: number
  direction?: string
  spokes?: number
  orientation?: 'horz' | 'vert'
  thruBlack?: boolean
  pattern?: string
  isContent?: boolean
  isInverted?: boolean
  hasBounce?: boolean
  preset?: string
  invertX?: boolean
  invertY?: boolean
  morphOption?: string
  advanceOnClick?: boolean
  advanceAfterMs?: number
  [key: string]: unknown
}

/** Spec §7.1 — one animation step. */
export interface Animation {
  elementId: string
  effect: string | null
  trigger?: 'onClick' | 'withPrevious' | 'afterPrevious'
  durationMs?: number | null
  delayMs?: number
  build?: 'asOneObject' | 'allAtOnce' | 'byParagraph'
  direction?: string
  orientation?: string
  inOut?: string
  shape?: string
  spokes?: number
  spinDirection?: string
  spinDegrees?: number
  scaleDirection?: string
  scalePercent?: number
  transparencyPercent?: number
  color?: unknown
  // reverse dialect record fields (§7.6)
  originalEffect?: string
  presetId?: number | null
  presetClass?: string | null
  sequence?: string
  valueAfterEnd?: string
  buildLevel?: number | null
  playable?: boolean
  editable?: boolean
  [key: string]: unknown
}

export interface ElementBase {
  elementId: string
  elementType: string
  bounds?: [number, number, number, number]
  rotation?: number
  opacity?: number
  flip?: [boolean, boolean]
  // reverse dialect provenance (§6.1)
  sourceRef?: SourceRef
  originalName?: string
  [key: string]: unknown
}

/** Spec §4.1 — one `.page` file. */
export interface Page {
  pageType?: string
  background?: unknown
  notes?: string
  elements: ElementBase[]
  animations?: Animation[]
  // reverse dialect only
  transition?: PageTransition
  hidden?: boolean
  layoutRef?: LayoutRef
  sectionName?: string
  [key: string]: unknown
}

/* ------------------------------------------------------------------ *
 * Validation issues
 * ------------------------------------------------------------------ */

/**
 * Issue levels: `blocker` blocks export (import report / disk load still work),
 * `warning` does not block and lands in the summary (spec §11, preamble).
 */
export type IssueLevel = 'blocker' | 'warning'

export interface Issue {
  code: string
  level: IssueLevel
  message: string
  /** Dotted path into the document, e.g. `pages/02.page#elements[3].bounds`. */
  path?: string
  /** Extra machine-readable detail (expected/actual, offending value…). */
  detail?: Record<string, unknown>
}

/**
 * Error codes. The spec's own codes are normative; `SchemaError` and
 * `UnknownThemeKeyError` are the two codes the tool layer adds for structural
 * violations the spec states as requirements without naming a code
 * (spec §2.5 "generate 档 … $key 引用必须在 theme 中存在"; §3.1 required fields).
 */
export const ERROR_CODES = {
  UnknownProfileError: 'UnknownProfileError',
  ProfileViolationError: 'ProfileViolationError',
  PlaceholderNotAllowedError: 'PlaceholderNotAllowedError',
  ExplicitGeometryRequiredError: 'ExplicitGeometryRequiredError',
  SourceRequiredError: 'SourceRequiredError',
  ExportFieldValueError: 'ExportFieldValueError',
  UnknownThemeKeyError: 'UnknownThemeKeyError',
  SchemaError: 'SchemaError',
  UnknownAnimationEffectError: 'UnknownAnimationEffectError',
  AnimationTargetError: 'AnimationTargetError',
  AnimationOptionNotApplicableError: 'AnimationOptionNotApplicableError',
  AnimationOptionValueError: 'AnimationOptionValueError',
  AnimationDurationNotAllowedError: 'AnimationDurationNotAllowedError',
  AnimationSequenceError: 'AnimationSequenceError',
  OriginalEffectRequiredError: 'OriginalEffectRequiredError',
  AnimationDurationRequiredWarning: 'AnimationDurationRequiredWarning',
  UnknownTransitionEffectError: 'UnknownTransitionEffectError',
  TransitionPresetRequiredError: 'TransitionPresetRequiredError',
  TransitionDirectionMismatchError: 'TransitionDirectionMismatchError',
  TransitionOptionNotApplicableError: 'TransitionOptionNotApplicableError',
  UnmodeledTransitionWarning: 'UnmodeledTransitionWarning',
  PlaceholderFieldError: 'PlaceholderFieldError',
  PlaceholderContrastWarning: 'PlaceholderContrastWarning'
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/** Reverse-only page fields (spec §2.4): present in `generate` = ProfileViolationError. */
export const REVERSE_ONLY_PAGE_FIELDS = [
  'transition',
  'hidden',
  'layoutRef',
  'sectionName'
] as const

/** Reverse-only element fields (spec §6.1). `shapeName` is an upstream Shape field and is NOT dialect-bound. */
export const REVERSE_ONLY_ELEMENT_FIELDS = [
  'sourceRef',
  'originalName',
  'glue',
  'imageAdjust',
  'partName',
  'builtinStyle',
  'originalType',
  'label',
  'labelStyle'
] as const

/** Reverse-only animation record fields (spec §7.1, §2.4). */
export const REVERSE_ONLY_ANIMATION_FIELDS = [
  'originalEffect',
  'presetId',
  'presetClass',
  'sequence',
  'valueAfterEnd',
  'buildLevel',
  'playable',
  'editable'
] as const

export type ElementType = (typeof GENERATE_ELEMENT_TYPES)[number] | 'placeholder'
