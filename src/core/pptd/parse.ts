/**
 * PPTD parser + validator.
 *
 * Two layers, deliberately separable:
 *  1. `parseDeckText` / `parsePageText` — YAML text to AST, plus structural
 *     (dialect-independent) validation of the required shape.
 *  2. `validateDeck` / `validatePage` — the rule set of
 *     `docs/pptd-spec.md`, selected by dialect: the `generate` profile gets
 *     上游继承的字段要求 + `$key` resolution + export domains; the
 *     `reverse` profile gets the R1–R7 hard rules.
 *
 * Validation never throws: every violation becomes an `Issue` with the spec's
 * error code (blocker) or a warning. Callers decide what to do with blockers —
 * `store.ts` still writes what it can, the future `ppt_check`/`ppt_export`
 * gate on them.
 */
import { Document, isScalar, parse as parseYaml, visit } from 'yaml'
import {
  ANIMATION_BUILD_RESTRICTED,
  ANIMATION_DIRECTIONS,
  ANIMATION_DURATION_FORBIDDEN,
  ANIMATION_EFFECT_SET,
  ANIMATION_IN_OUT,
  ANIMATION_OPTION_APPLICABILITY,
  ANIMATION_ORIENTATIONS,
  ANIMATION_SHAPES,
  ANIMATION_SPOKES,
  ANIMATION_TEXT_BUILDS,
  ANIMATION_TRIGGERS,
  DEFAULT_EXPORT,
  DEFAULT_PROFILE,
  ERROR_CODES,
  GENERATE_ELEMENT_TYPES,
  PLACEHOLDER_ORIGINAL_TYPES,
  REVERSE_ELEMENT_TYPES,
  REVERSE_ONLY_ANIMATION_FIELDS,
  REVERSE_ONLY_ELEMENT_FIELDS,
  REVERSE_ONLY_PAGE_FIELDS,
  SCHEME_COLOR_TOKENS,
  SCHEME_REF_PREFIX,
  THEME_REF_PREFIX,
  TRANSITION_DIRECTION_DOMAIN,
  TRANSITION_EFFECT_SET,
  TRANSITION_PRESET_SET,
  type Animation,
  type ElementBase,
  type Issue,
  type Page,
  type Presentation,
  type Profile,
  type Theme
} from './schema.js'

// Consumers of the parse layer (store, tools, escape hatch) work with these
// document types — re-export so they never import schema.js directly.
export type { Issue, Page, Presentation } from './schema.js'

/* ------------------------------------------------------------------ *
 * Issue helpers
 * ------------------------------------------------------------------ */

function blocker(code: string, message: string, path?: string, detail?: Record<string, unknown>): Issue {
  return { code, level: 'blocker', message, ...(path === undefined ? {} : { path }), ...(detail === undefined ? {} : { detail }) }
}

function warning(code: string, message: string, path?: string, detail?: Record<string, unknown>): Issue {
  return { code, level: 'warning', message, ...(path === undefined ? {} : { path }), ...(detail === undefined ? {} : { detail }) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBounds(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber)
}

/** Page/deck `size` is a 2-tuple [宽, 高] — do not confuse with 4-tuple element bounds. */
function isSizePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber)
}

/** A deck-relative path is legal iff it is relative, non-empty and cannot escape the project dir. */
export function isSafeRelativePath(value: string): boolean {
  if (value.trim() === '') return false
  if (value.startsWith('/') || value.startsWith('\\')) return false
  if (/^[A-Za-z]:[\\/]/.test(value)) return false
  const normalized = value.replace(/\\/g, '/')
  return !normalized.split('/').includes('..')
}

/* ------------------------------------------------------------------ *
 * YAML <-> AST
 * ------------------------------------------------------------------ */

export interface ParseResult<T> {
  value: T | null
  issues: Issue[]
}

export function parseDeckText(text: string, sourcePath = 'deck.pptd'): ParseResult<Presentation> {
  const issues: Issue[] = []
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (err) {
    return {
      value: null,
      issues: [blocker(ERROR_CODES.SchemaError, `deck.pptd 不是合法 YAML：${(err as Error).message}`, sourcePath)]
    }
  }
  if (!isRecord(raw)) {
    return { value: null, issues: [blocker(ERROR_CODES.SchemaError, 'deck.pptd 顶层必须是映射对象', sourcePath)] }
  }
  issues.push(...validateDeckShape(raw, sourcePath))
  return { value: raw as unknown as Presentation, issues }
}

export function parsePageText(text: string, sourcePath: string): ParseResult<Page> {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (err) {
    return {
      value: null,
      issues: [blocker(ERROR_CODES.SchemaError, `页文件不是合法 YAML：${(err as Error).message}`, sourcePath)]
    }
  }
  if (!isRecord(raw)) {
    return { value: null, issues: [blocker(ERROR_CODES.SchemaError, '页文件顶层必须是映射对象', sourcePath)] }
  }
  return { value: raw as unknown as Page, issues: [] }
}

/**
 * Serialize with PLAIN as the preferred style: scalars stay inline, and the
 * YAML emitter automatically falls back to block literal for multi-line rich
 * text, which keeps markdown content reviewable (spec §1.1).
 *
 * All-numeric sequences stay in flow style so `size: [960, 540]` and
 * `bounds: [x, y, w, h]` read the way the spec writes them.
 */
function stringifyDocument(value: unknown): string {
  const doc = new Document(value)
  visit(doc, {
    Seq: (_key, node) => {
      if (node.items.length > 0 && node.items.every((item) => isScalar(item) && typeof item.value === 'number')) {
        node.flow = true
      }
    }
  })
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false })
}

export function stringifyDeck(deck: Presentation): string {
  return stringifyDocument(deck)
}

export function stringifyPage(page: Page): string {
  return stringifyDocument(page)
}

/** Effective profile of a deck (spec §2.1 rule 2). */
export function profileOf(deck: Presentation): Profile {
  return deck.profile ?? DEFAULT_PROFILE
}

/** Effective export config (spec §3.2). */
export function exportConfigOf(deck: Presentation): Required<Presentation['export']> {
  const raw = isRecord(deck.export) ? deck.export : {}
  const out = { ...DEFAULT_EXPORT }
  if (raw.fontEmbed === 'subset' || raw.fontEmbed === 'full' || raw.fontEmbed === 'off') out.fontEmbed = raw.fontEmbed
  if (raw.transition === 'fade' || raw.transition === 'none' || raw.transition === 'auto') out.transition = raw.transition
  if (raw.animations === 'auto' || raw.animations === 'off') out.animations = raw.animations
  return out
}

/* ------------------------------------------------------------------ *
 * Deck structural validation
 * ------------------------------------------------------------------ */

export function validateDeckShape(deck: Record<string, unknown>, path: string): Issue[] {
  const issues: Issue[] = []

  if (deck.profile !== undefined && deck.profile !== 'generate' && deck.profile !== 'reverse') {
    issues.push(
      blocker(ERROR_CODES.UnknownProfileError, `profile 取值必须是 generate / reverse（实际：${JSON.stringify(deck.profile)}）`, `${path}#profile`)
    )
  }

  if (!isSizePair(deck.size)) {
    issues.push(
      blocker(ERROR_CODES.SchemaError, 'size 必填，且为 [宽, 高] 两个正数', `${path}#size`, { actual: deck.size ?? null })
    )
  } else if (deck.size[0] <= 0 || deck.size[1] <= 0) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'size 的宽高必须 > 0', `${path}#size`, { actual: deck.size }))
  }

  if (deck.title !== undefined && typeof deck.title !== 'string') {
    issues.push(blocker(ERROR_CODES.SchemaError, 'title 必须是字符串', `${path}#title`))
  }

  if (!Array.isArray(deck.pages)) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'pages 必填，且为页文件相对路径数组', `${path}#pages`))
  } else {
    deck.pages.forEach((entry, i) => {
      if (typeof entry !== 'string' || !isSafeRelativePath(entry)) {
        issues.push(
          blocker(ERROR_CODES.SchemaError, '页路径必须是工程目录内的相对路径（不得为绝对路径或含 ".."）', `${path}#pages[${i}]`, {
            actual: entry
          })
        )
      }
    })
  }

  issues.push(...validateExportConfig(deck.export, `${path}#export`))
  return issues
}

export function validateExportConfig(raw: unknown, path: string): Issue[] {
  const issues: Issue[] = []
  if (raw === undefined) return issues
  if (!isRecord(raw)) {
    return [blocker(ERROR_CODES.ExportFieldValueError, 'export 必须是对象', path)]
  }
  const domains: Record<string, readonly string[]> = {
    fontEmbed: ['subset', 'full', 'off'],
    transition: ['fade', 'none', 'auto'],
    animations: ['auto', 'off']
  }
  for (const [key, allowed] of Object.entries(domains)) {
    const value = raw[key]
    if (value !== undefined && (typeof value !== 'string' || !allowed.includes(value))) {
      issues.push(
        blocker(ERROR_CODES.ExportFieldValueError, `export.${key} 取值必须在 ${allowed.join(' / ')} 内`, `${path}.${key}`, {
          allowed,
          actual: value
        })
      )
    }
  }
  for (const key of Object.keys(raw)) {
    if (!(key in domains)) {
      issues.push(warning(ERROR_CODES.ExportFieldValueError, `export 里的未知字段 "${key}" 将被忽略`, `${path}.${key}`))
    }
  }
  return issues
}

/* ------------------------------------------------------------------ *
 * Theme `$key` resolution (generate dialect, spec §2.5)
 * ------------------------------------------------------------------ */

/** Every `$key` reference found anywhere in a document, with its dotted path. */
export function collectThemeRefs(value: unknown, path: string, out: Array<{ key: string; path: string }> = []): Array<{ key: string; path: string }> {
  if (typeof value === 'string') {
    if (value.startsWith(THEME_REF_PREFIX) && value.length > 1) out.push({ key: value.slice(1), path })
    return out
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectThemeRefs(item, `${path}[${i}]`, out))
    return out
  }
  if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) collectThemeRefs(v, `${path}.${k}`, out)
  }
  return out
}

/** Keys a theme makes available to `$key` references. */
export function themeKeysOf(theme: Theme | undefined): Set<string> {
  const keys = new Set<string>()
  if (!isRecord(theme)) return keys
  for (const table of ['colors', 'textStyles', 'tableStyles'] as const) {
    const entries = theme[table]
    if (isRecord(entries)) for (const key of Object.keys(entries)) keys.add(key)
  }
  return keys
}

/* ------------------------------------------------------------------ *
 * Deck dialect validation
 * ------------------------------------------------------------------ */

export interface DeckValidationOptions {
  path?: string
  profile?: Profile
}

export function validateDeck(deck: Presentation, options: DeckValidationOptions = {}): Issue[] {
  const path = options.path ?? 'deck.pptd'
  const profile = options.profile ?? profileOf(deck)
  const issues: Issue[] = [...validateDeckShape(deck as unknown as Record<string, unknown>, path)]

  if (profile === 'reverse') {
    issues.push(...validateDeckSource(deck.source, `${path}#source`))
  } else {
    if (deck.source !== undefined) {
      issues.push(
        blocker(ERROR_CODES.ProfileViolationError, 'deck.source 是逆向方言专属字段，生成方言不得出现', `${path}#source`)
      )
    }
    const themeKeys = themeKeysOf(deck.theme)
    for (const ref of collectThemeRefs(deck, path)) {
      if (!themeKeys.has(ref.key)) {
        issues.push(
          blocker(ERROR_CODES.UnknownThemeKeyError, `主题引用 $${ref.key} 在 deck.theme 中不存在`, ref.path, {
            key: ref.key,
            available: [...themeKeys]
          })
        )
      }
    }
  }
  return issues
}

function validateDeckSource(source: unknown, path: string): Issue[] {
  const issues: Issue[] = []
  if (!isRecord(source)) {
    return [blocker(ERROR_CODES.SourceRequiredError, 'profile: reverse 时 deck.source 必填', path)]
  }
  if (typeof source.path !== 'string' || source.path === '') {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, 'source.path 必填（源 .pptx 路径）', `${path}.path`))
  }
  if (!isFiniteNumber(source.slideCount)) {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, 'source.slideCount 必填（源文件页数）', `${path}.slideCount`))
  }
  if (!isSizePair(source.size)) {
    issues.push(blocker(ERROR_CODES.SourceRequiredError, 'source.size 必填（源文件页面尺寸 [宽, 高]）', `${path}.size`))
  }
  return issues
}

/* ------------------------------------------------------------------ *
 * Page validation
 * ------------------------------------------------------------------ */

export interface PageValidationOptions {
  profile?: Profile
  path?: string
  /**
   * Keys offered by `deck.theme` (see `themeKeysOf`). Generate dialect: every
   * `$key` in the page must exist in this set (spec §6 generate 档). Reverse
   * dialect bans `$key` outright (R2/R4), so the set is irrelevant there.
   */
  themeKeys?: Set<string>
}

export function validatePage(page: Page, options: PageValidationOptions = {}): Issue[] {
  const profile = options.profile ?? DEFAULT_PROFILE
  const path = options.path ?? 'pages/?.page'
  const issues: Issue[] = []
  const raw = page as unknown as Record<string, unknown>

  if (profile === 'generate') {
    for (const field of REVERSE_ONLY_PAGE_FIELDS) {
      if (raw[field] !== undefined) {
        issues.push(
          blocker(ERROR_CODES.ProfileViolationError, `Page.${field} 是逆向方言专属字段，生成方言不得出现`, `${path}#${field}`)
        )
      }
    }
  } else if (page.pageType !== undefined) {
    issues.push(
      blocker(ERROR_CODES.ProfileViolationError, 'Page.pageType 是生成方言专属字段，逆向方言不使用', `${path}#pageType`)
    )
  }

  if (page.transition !== undefined) issues.push(...validatePageTransition(page.transition, `${path}#transition`))

  if (!Array.isArray(page.elements)) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'elements 必填，且为元素数组', `${path}#elements`))
    return issues
  }

  const seen = new Set<string>()
  page.elements.forEach((element, index) => {
    issues.push(...validateElement(element, { profile, path: `${path}#elements[${index}]`, seen }))
  })

  issues.push(...validateAnimations(page.animations, { path: `${path}#animations`, elements: page.elements, profile }))

  // `$key` theme references at page level (spec §2.5 G2 / §6): generate must
  // resolve against deck.theme, reverse must not contain them at all.
  if (profile === 'reverse') {
    for (const ref of collectThemeRefs(page, path)) {
      issues.push(
        blocker(ERROR_CODES.ProfileViolationError, `逆向方言不允许 $key 主题引用（$${ref.key}；R2/R4 要求字面量）`, ref.path, { key: ref.key })
      )
    }
  } else if (options.themeKeys) {
    for (const ref of collectThemeRefs(page, path)) {
      if (!options.themeKeys.has(ref.key)) {
        issues.push(
          blocker(ERROR_CODES.UnknownThemeKeyError, `主题引用 $${ref.key} 在 deck.theme 中不存在`, ref.path, {
            key: ref.key,
            available: [...options.themeKeys]
          })
        )
      }
    }
  }
  return issues
}

function validateElement(element: unknown, ctx: { profile: Profile; path: string; seen: Set<string> }): Issue[] {
  const { profile, path } = ctx
  const issues: Issue[] = []
  if (!isRecord(element)) {
    return [blocker(ERROR_CODES.SchemaError, '元素必须是映射对象', path)]
  }
  const target = element as unknown as ElementBase

  if (typeof target.elementId !== 'string' || target.elementId === '') {
    issues.push(blocker(ERROR_CODES.SchemaError, 'elementId 必填，且为非空字符串', `${path}#elementId`))
  } else if (ctx.seen.has(target.elementId)) {
    issues.push(blocker(ERROR_CODES.SchemaError, `elementId "${target.elementId}" 在同一页内重复`, `${path}#elementId`))
  } else {
    ctx.seen.add(target.elementId)
  }

  const elementType = target.elementType
  const allowed: readonly string[] = profile === 'generate' ? GENERATE_ELEMENT_TYPES : REVERSE_ELEMENT_TYPES
  if (typeof elementType !== 'string') {
    issues.push(blocker(ERROR_CODES.SchemaError, 'elementType 必填', `${path}#elementType`))
  } else if (profile === 'generate' && elementType === 'placeholder') {
    issues.push(
      blocker(ERROR_CODES.PlaceholderNotAllowedError, 'profile: generate 的工程里不允许 elementType: "placeholder"', `${path}#elementType`)
    )
  } else if (profile === 'reverse' && (elementType === 'icon' || elementType === 'chart')) {
    issues.push(
      blocker(ERROR_CODES.ProfileViolationError, `逆向方言不产出 ${elementType} 元素（源图标按 shape/image、图表走 dropped + placeholder 映射）`, `${path}#elementType`)
    )
  } else if (!allowed.includes(elementType)) {
    issues.push(
      blocker(ERROR_CODES.SchemaError, `elementType "${elementType}" 不在 ${profile} 方言允许的取值内`, `${path}#elementType`, {
        allowed
      })
    )
  }

  const isPlaceholder = elementType === 'placeholder'
  if (!('bounds' in element) || element.bounds === undefined) {
    issues.push(
      profile === 'reverse'
        ? blocker(ERROR_CODES.ExplicitGeometryRequiredError, '逆向方言元素必须显式给出 bounds', `${path}#bounds`)
        : blocker(ERROR_CODES.SchemaError, 'bounds 必填（[x, y, w, h]）', `${path}#bounds`)
    )
  } else if (!isBounds(element.bounds)) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'bounds 必须是 [x, y, w, h] 四个数', `${path}#bounds`, { actual: element.bounds }))
  }

  if (profile === 'reverse' && !isPlaceholder) {
    for (const field of ['rotation', 'opacity', 'flip'] as const) {
      if (element[field] === undefined) {
        issues.push(
          blocker(ERROR_CODES.ExplicitGeometryRequiredError, `逆向方言元素必须显式写出 ${field}（即使等于默认值）`, `${path}#${field}`)
        )
      }
    }
  }

  if (profile === 'generate') {
    for (const field of REVERSE_ONLY_ELEMENT_FIELDS) {
      if (element[field] !== undefined) {
        issues.push(
          blocker(ERROR_CODES.ProfileViolationError, `元素字段 "${field}" 是逆向方言专属，生成方言不得出现`, `${path}#${field}`)
        )
      }
    }
  }

  if (isPlaceholder) {
    const originalType = element.originalType
    if (originalType === undefined) {
      issues.push(blocker(ERROR_CODES.PlaceholderFieldError, 'placeholder 的 originalType 必填', `${path}#originalType`))
    } else if (typeof originalType !== 'string' || !(PLACEHOLDER_ORIGINAL_TYPES as readonly string[]).includes(originalType)) {
      issues.push(
        blocker(ERROR_CODES.PlaceholderFieldError, `placeholder.originalType 不在类别表内（${PLACEHOLDER_ORIGINAL_TYPES.join(' / ')}）`, `${path}#originalType`, {
          actual: originalType
        })
      )
    }
  }

  return issues
}

/* ------------------------------------------------------------------ *
 * Animation validation
 * ------------------------------------------------------------------ */

export function validateAnimations(
  animations: unknown,
  ctx: { path: string; elements: ElementBase[]; profile?: Profile }
): Issue[] {
  const profile = ctx.profile ?? DEFAULT_PROFILE
  const issues: Issue[] = []
  if (animations === undefined) return issues
  if (!Array.isArray(animations)) {
    return [blocker(ERROR_CODES.SchemaError, 'animations 必须是数组', ctx.path)]
  }
  const elementIds = new Set(ctx.elements.map((e) => e?.elementId).filter((id): id is string => typeof id === 'string'))
  const placeholderIds = new Set(
    ctx.elements.filter((e) => e?.elementType === 'placeholder').map((e) => e.elementId)
  )

  animations.forEach((raw, index) => {
    const path = `${ctx.path}[${index}]`
    if (!isRecord(raw)) {
      issues.push(blocker(ERROR_CODES.SchemaError, '动画条目必须是映射对象', path))
      return
    }
    const anim = raw as unknown as Animation

    if (typeof anim.elementId !== 'string' || anim.elementId === '') {
      issues.push(blocker(ERROR_CODES.AnimationTargetError, '动画 elementId 必填', `${path}#elementId`))
    } else if (placeholderIds.has(anim.elementId)) {
      issues.push(
        blocker(ERROR_CODES.AnimationTargetError, `动画不得指向 placeholder 元素（${anim.elementId}）`, `${path}#elementId`)
      )
    } else if (!elementIds.has(anim.elementId)) {
      issues.push(
        blocker(ERROR_CODES.AnimationTargetError, `动画 elementId "${anim.elementId}" 未引用本页已存在的元素`, `${path}#elementId`)
      )
    }

    const effect = anim.effect
    const isNullEffect = effect === null
    if (isNullEffect) {
      if (anim.originalEffect === undefined) {
        issues.push(
          blocker(ERROR_CODES.OriginalEffectRequiredError, 'effect: null 时必须写 originalEffect（源 preset 原样标识）', `${path}#originalEffect`)
        )
      }
    } else if (typeof effect !== 'string' || !ANIMATION_EFFECT_SET.has(effect)) {
      issues.push(
        blocker(ERROR_CODES.UnknownAnimationEffectError, `effect 不在 95 个 preset 词表内：${JSON.stringify(effect)}`, `${path}#effect`)
      )
    }

    if (anim.trigger !== undefined && !(ANIMATION_TRIGGERS as readonly string[]).includes(anim.trigger)) {
      issues.push(
        blocker(ERROR_CODES.SchemaError, `trigger 取值必须是 ${ANIMATION_TRIGGERS.join(' / ')}`, `${path}#trigger`, { actual: anim.trigger })
      )
    }

    const effectName = typeof effect === 'string' ? effect : null
    if (anim.durationMs !== undefined && anim.durationMs !== null) {
      if (!isFiniteNumber(anim.durationMs) || anim.durationMs <= 0) {
        issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'durationMs 必须 > 0', `${path}#durationMs`, { actual: anim.durationMs }))
      } else if (effectName !== null && ANIMATION_DURATION_FORBIDDEN.includes(effectName)) {
        issues.push(
          blocker(ERROR_CODES.AnimationDurationNotAllowedError, `${effectName} 不接受 durationMs（瞬时或效果保持到本页结束）`, `${path}#durationMs`)
        )
      }
    }

    if (anim.delayMs !== undefined && (!isFiniteNumber(anim.delayMs) || anim.delayMs < 0)) {
      issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'delayMs 必须 >= 0', `${path}#delayMs`, { actual: anim.delayMs }))
    }

    issues.push(...validateAnimationOptions(anim, path, effectName))
    issues.push(...validateAnimationSequence(anim, index, animations, path))

    if (profile === 'generate') {
      for (const field of REVERSE_ONLY_ANIMATION_FIELDS) {
        if (raw[field] !== undefined) {
          issues.push(
            blocker(ERROR_CODES.ProfileViolationError, `动画记录字段 "${field}" 是逆向方言专属，生成方言不得出现`, `${path}#${field}`)
          )
        }
      }
    }
  })

  return issues
}

const ANIMATION_DIRECTION_DOMAIN: Readonly<Record<string, readonly string[]>> = {
  flyIn: ANIMATION_DIRECTIONS,
  flyOut: ANIMATION_DIRECTIONS,
  wipeIn: ['top', 'right', 'bottom', 'left'],
  wipeOut: ['top', 'right', 'bottom', 'left'],
  peekIn: ['top', 'right', 'bottom', 'left'],
  peekOut: ['top', 'right', 'bottom', 'left'],
  stripsIn: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
  stripsOut: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']
}

function validateAnimationOptions(anim: Animation, path: string, effectName: string | null): Issue[] {
  const issues: Issue[] = []
  if (effectName === null) return issues

  const optionKeys = Object.keys(ANIMATION_OPTION_APPLICABILITY)
  for (const option of optionKeys) {
    if (anim[option] === undefined) continue
    if (!ANIMATION_OPTION_APPLICABILITY[option].includes(effectName)) {
      issues.push(
        blocker(
          ERROR_CODES.AnimationOptionNotApplicableError,
          `选项 ${option} 不适用于 preset ${effectName}（§7.3 适用矩阵）`,
          `${path}#${option}`,
          { applicableTo: ANIMATION_OPTION_APPLICABILITY[option] }
        )
      )
    }
  }

  if (anim.direction !== undefined) {
    const domain = ANIMATION_DIRECTION_DOMAIN[effectName]
    if (domain !== undefined && !domain.includes(String(anim.direction))) {
      issues.push(
        blocker(ERROR_CODES.AnimationOptionValueError, `direction "${anim.direction}" 超出 ${effectName} 的方向集合`, `${path}#direction`, {
          allowed: domain
        })
      )
    }
  }
  if (anim.orientation !== undefined && !(ANIMATION_ORIENTATIONS as readonly string[]).includes(String(anim.orientation))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'orientation 取值必须是 horizontal / vertical', `${path}#orientation`))
  }
  if (anim.inOut !== undefined && !(ANIMATION_IN_OUT as readonly string[]).includes(String(anim.inOut))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'inOut 取值必须是 in / out', `${path}#inOut`))
  }
  if (anim.shape !== undefined && !(ANIMATION_SHAPES as readonly string[]).includes(String(anim.shape))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'shape 取值必须是 circle / box / diamond / plus', `${path}#shape`))
  }
  if (anim.spokes !== undefined && !(ANIMATION_SPOKES as readonly number[]).includes(Number(anim.spokes))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'spokes 取值限 1 / 2 / 3 / 4 / 8', `${path}#spokes`, { actual: anim.spokes }))
  }
  if (anim.spinDegrees !== undefined && (!isFiniteNumber(anim.spinDegrees) || anim.spinDegrees <= 0)) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'spinDegrees 必须 > 0', `${path}#spinDegrees`))
  }
  if (anim.scalePercent !== undefined && (!isFiniteNumber(anim.scalePercent) || anim.scalePercent <= 0)) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'scalePercent 必须 > 0', `${path}#scalePercent`))
  }
  if (
    anim.transparencyPercent !== undefined &&
    (!isFiniteNumber(anim.transparencyPercent) || anim.transparencyPercent < 0 || anim.transparencyPercent > 100)
  ) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'transparencyPercent 取值必须在 [0, 100]', `${path}#transparencyPercent`))
  }
  if (anim.build !== undefined && !(ANIMATION_TEXT_BUILDS as readonly string[]).includes(String(anim.build))) {
    issues.push(blocker(ERROR_CODES.AnimationOptionValueError, 'build 取值必须是 asOneObject / allAtOnce / byParagraph', `${path}#build`))
  }
  if (anim.build !== undefined && anim.build !== 'asOneObject' && ANIMATION_BUILD_RESTRICTED.includes(effectName)) {
    issues.push(
      blocker(ERROR_CODES.AnimationOptionNotApplicableError, `${effectName} 只动画形状本身，不接受 build: ${anim.build}`, `${path}#build`)
    )
  }
  return issues
}

/**
 * `afterPrevious` needs a determinable end time on the previous step (§7.4).
 * Infinitely holding, unpredictable or non-playable predecessors make the
 * sequence unmeasurable: warn here, fail at export time.
 */
function validateAnimationSequence(anim: Animation, index: number, all: unknown[], path: string): Issue[] {
  if (anim.trigger !== 'afterPrevious' || index === 0) return []
  const previous = all[index - 1]
  if (!isRecord(previous)) return []
  const prev = previous as unknown as Animation
  const reasons: string[] = []
  if (prev.effect === null) reasons.push('前一条 effect 为 null（未建模步骤）')
  if (prev.playable === false) reasons.push('前一条不可播放')
  if (prev.build === 'byParagraph') reasons.push('前一条逐段播放')
  if (typeof prev.effect === 'string' && ['transparency', 'boldReveal'].includes(prev.effect)) reasons.push('前一条效果保持到本页结束')
  if (reasons.length === 0) return []
  return [
    warning(
      ERROR_CODES.AnimationSequenceError,
      `afterPrevious 的前一条动画结束时刻不可测定：${reasons.join('；')}`,
      `${path}#trigger`,
      { reasons }
    )
  ]
}

/* ------------------------------------------------------------------ *
 * Page transition validation (reverse dialect only)
 * ------------------------------------------------------------------ */

const TRANSITION_OPTION_SCOPE: Readonly<Record<string, readonly string[]>> = {
  spokes: ['wheel', 'wheelReverse'],
  orientation: ['split'],
  thruBlack: ['fade', 'cut', 'reveal'],
  pattern: ['glitter', 'shred'],
  isContent: ['prism'],
  isInverted: ['prism'],
  hasBounce: ['flythrough'],
  invertX: ['prstTrans'],
  invertY: ['prstTrans'],
  morphOption: ['morph']
}

export function validatePageTransition(raw: unknown, path: string): Issue[] {
  const issues: Issue[] = []
  if (!isRecord(raw)) {
    return [blocker(ERROR_CODES.SchemaError, 'transition 必须是对象', path)]
  }
  const transition = raw as Record<string, unknown>
  const effect = transition.effect

  if (typeof effect !== 'string' || effect === '') {
    issues.push(blocker(ERROR_CODES.UnknownTransitionEffectError, 'transition.effect 必填', `${path}#effect`))
    return issues
  }
  if (!TRANSITION_EFFECT_SET.has(effect)) {
    if (transition.unmodeled === true) {
      issues.push(
        warning(ERROR_CODES.UnmodeledTransitionWarning, `转场效果 "${effect}" 未建模，导出时跳过该页转场`, `${path}#effect`)
      )
    } else {
      issues.push(
        blocker(ERROR_CODES.UnknownTransitionEffectError, `transition.effect "${effect}" 不在附录 B.1 的 42 个 token 内且未置 unmodeled: true`, `${path}#effect`)
      )
    }
  }

  if (effect === 'prstTrans') {
    const preset = transition.preset
    if (typeof preset !== 'string' || !TRANSITION_PRESET_SET.has(preset)) {
      issues.push(
        blocker(ERROR_CODES.TransitionPresetRequiredError, 'effect: prstTrans 时 preset 必填，且必须在附录 B.2 的 12 个 token 内', `${path}#preset`, {
          actual: preset ?? null
        })
      )
    }
  }

  if (transition.direction !== undefined) {
    const domain = TRANSITION_DIRECTION_DOMAIN[effect]
    if (domain === undefined) {
      issues.push(
        blocker(ERROR_CODES.TransitionDirectionMismatchError, `${effect} 不接受 direction`, `${path}#direction`, { actual: transition.direction })
      )
    } else if (!domain.includes(String(transition.direction))) {
      issues.push(
        blocker(ERROR_CODES.TransitionDirectionMismatchError, `direction "${transition.direction}" 与 ${effect} 的方向域不匹配`, `${path}#direction`, {
          allowed: domain
        })
      )
    }
  }

  for (const [option, scope] of Object.entries(TRANSITION_OPTION_SCOPE)) {
    if (transition[option] !== undefined && !scope.includes(effect)) {
      issues.push(
        blocker(ERROR_CODES.TransitionOptionNotApplicableError, `选项 ${option} 不适用于转场 effect ${effect}`, `${path}#${option}`)
      )
    }
  }

  if (transition.speed !== undefined && !['slow', 'med', 'fast'].includes(String(transition.speed))) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'transition.speed 取值必须是 slow / med / fast', `${path}#speed`))
  }
  if (transition.durationMs !== undefined && (!isFiniteNumber(transition.durationMs) || transition.durationMs <= 0)) {
    issues.push(blocker(ERROR_CODES.SchemaError, 'transition.durationMs 必须 > 0', `${path}#durationMs`))
  }
  if (transition.spokes !== undefined && ![1, 2, 3, 4, 8].includes(Number(transition.spokes))) {
    issues.push(blocker(ERROR_CODES.TransitionOptionNotApplicableError, 'transition.spokes 取值限 1 / 2 / 3 / 4 / 8', `${path}#spokes`))
  }
  return issues
}

/* ------------------------------------------------------------------ *
 * Project-level parse (deck + every .page it lists)
 * ------------------------------------------------------------------ */

export interface PageEntry {
  /** Project-relative path, e.g. `pages/01_cover.page`. */
  path: string
  text: string
}

export interface ParsedProject {
  deck: Presentation | null
  pages: Map<string, Page>
  issues: Issue[]
  profile: Profile
}

export function parseProject(deckText: string, pageEntries: PageEntry[]): ParsedProject {
  const issues: Issue[] = []
  const deckResult = parseDeckText(deckText)
  issues.push(...deckResult.issues)
  const deck = deckResult.value
  const profile: Profile = deck ? profileOf(deck) : DEFAULT_PROFILE

  if (deck) issues.push(...validateDeck(deck, { profile }))
  const themeKeys = deck ? themeKeysOf(deck.theme) : undefined

  const pages = new Map<string, Page>()
  const declared = new Set<string>(Array.isArray(deck?.pages) ? deck.pages.filter((p): p is string => typeof p === 'string') : [])
  const provided = new Map(pageEntries.map((entry) => [entry.path.replace(/\\/g, '/'), entry.text]))

  for (const path of declared) {
    const key = path.replace(/\\/g, '/')
    const text = provided.get(key)
    if (text === undefined) {
      issues.push(
        blocker(ERROR_CODES.SchemaError, `deck.pages 声明的页文件不存在：${key}`, `deck.pptd#pages#${key}`)
      )
      continue
    }
    const parsed = parsePageText(text, key)
    issues.push(...parsed.issues)
    if (parsed.value) {
      pages.set(key, parsed.value)
      issues.push(...validatePage(parsed.value, { profile, path: key, themeKeys }))
    }
  }

  for (const key of provided.keys()) {
    if (!declared.has(key)) {
      issues.push(warning(ERROR_CODES.SchemaError, `页文件未被 deck.pages 引用（孤儿页）：${key}`, key))
    }
  }

  return { deck, pages, issues, profile }
}

/** Everything the checker needs to know about the `scheme:` literal domain (spec §2.3 R2). */
export function isSchemeRef(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(SCHEME_REF_PREFIX) && (SCHEME_COLOR_TOKENS as readonly string[]).includes(value.slice(SCHEME_REF_PREFIX.length))
}
