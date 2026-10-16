/**
 * AI 视觉质检层（按需深检，`ai: true` 才跑）。
 *
 * 通路（全部按宿主已发布源码实测落地，无臆造 API）：
 *  - 路由：`ctx.sessions.get(sessionId).requestHeader()?.config` 取
 *    provider/model（dsh-agent-loop prepareRequest / dsh-experimental-auto-review
 *    同款取法）；无会话外路由，也没有按工具单独选模型的设置面。
 *  - 调用：`ctx.llm.stream({provider, model, system, messages, temperature: 0})`，
 *    chunk 流为 block-start / text-delta / block-end / finish 协议，逐字拼接
 *    （dsh-llm BlockAssembler 同协议；我们不 import 宿主包，出树插件解析不到）。
 *  - 图片：libreoffice-kit 渲染的最终 pptx 页 PNG → `ctx.attachments.saveImages`
 *    （{data, mediaType:'image/png', name} → ImageAttachmentRef），消息块形态
 *    `{type:'image', attachment: ref}`（dsh-acp admitAcpPrompt 同款）。
 *  - 门控：`ctx.llm.resolveModelInfo(provider, model).inputModalities` 含
 *    'image' 才走视觉调用；否则降级为「返回 PNG 路径 + 版式指标，请主模型
 *    自行 read_image」。
 *
 * AI 层只出建议不阻断：解析失败 / 调用失败一律降级为 warning，绝不炸掉
 * 规则层结果。JSON 校验是窄校验器（不引入 ajv，宿主没给它留运行时面）。
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { PresentationData } from '@office-kit/pptx'
import { getShapeText, getSlideShapes, getSlides } from '@office-kit/pptx'
import type { ReviewIssue } from './index.js'

/* ------------------------------------------------------------------ *
 * Host service seams (minimal structural types — no host imports)
 * ------------------------------------------------------------------ */

export interface ImageAttachmentRefLike {
  attachmentId: string
  mediaType?: string
  [key: string]: unknown
}

export interface AttachmentsLike {
  saveImages(
    inputs: ReadonlyArray<{ data: Uint8Array; mediaType: 'image/png'; name?: string }>
  ): Promise<readonly ImageAttachmentRefLike[]>
}

export interface LlmChunk {
  type: string
  text?: string
  index?: number
  blockType?: string
  block?: { type?: string; text?: string }
  reason?: { kind?: string; failure?: { code?: string; message?: string } }
}

export interface LlmLike {
  stream(options: {
    provider: string
    model: string
    system?: string
    messages: Array<{ role: string; content: Array<Record<string, unknown>> }>
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): AsyncIterable<LlmChunk>
  resolveModelInfo(
    provider: string,
    model: string,
    signal?: AbortSignal
  ): Promise<{ inputModalities?: string[] }>
}

export interface SessionRouteSource {
  get(id: string):
    | {
        header?: { cwd?: unknown }
        requestHeader?: () => { config?: { provider?: string; model?: string } } | undefined
      }
    | undefined
}

/* ------------------------------------------------------------------ *
 * Result types
 * ------------------------------------------------------------------ */

export interface AiIssue {
  page: number
  severity: 'suggestion' | 'polish'
  category: string
  description: string
  suggestion?: string
}

export type AiReviewResult =
  | {
      performed: true
      provider: string
      model: string
      pages: number[]
      issues: AiIssue[]
      promptVersion: string
    }
  | {
      performed: false
      reason: string
      /** 降级路径：主模型可自行 read_image 这些 PNG 做视觉复核。 */
      fallbackImages?: Array<{ page: number; path: string }>
      /** 降级路径：纯文本版式指标（无图也能给的核对材料）。 */
      layoutDigest?: string
    }

export interface AiReviewDeps {
  llm?: LlmLike
  attachments?: AttachmentsLike
  sessions?: SessionRouteSource
  /** exec.agent.session.id — 路由的唯一可信来源。 */
  sessionId: string | null
  /** 把页 PNG 相对会话 cwd 的路径带上，降级结果里给主模型指路。 */
  toDisplayPath?: (absPath: string) => string
}

export const AI_REVIEW_PROMPT_VERSION = 'ai-review/v1'

const VALID_SEVERITIES = new Set(['suggestion', 'polish'])

/* ------------------------------------------------------------------ *
 * Prompt
 * ------------------------------------------------------------------ */

const SYSTEM_PROMPT = [
  '你是演示文稿视觉质检员。输入是一份 PPT 的最终渲染图（每页一张 PNG，按页码顺序）与该页的版式指标摘要。',
  '只做视觉判断，不要复述规则层已经能查的东西（文字溢出、出界、重叠由规则层负责）。',
  '你审的是：配色是否协调、层级是否清楚、版面是否平衡、图与文是否搭配、风格是否统一。',
  '输出恰好一个 JSON 对象，不要任何其他文字，不要 Markdown 围栏。结构：',
  '{"issues":[{"page":<页码整数>,"severity":"suggestion|polish","category":"<类别短语>","description":"<问题描述>","suggestion":"<修改建议>"}]}',
  'severity 口径：suggestion=明显拉低观感、建议修改；polish=可选打磨项。没有问题的页不要出条目；整体没有可说的就输出 {"issues":[]}。'
].join('\n')

/* ------------------------------------------------------------------ *
 * Stream consumption (BlockAssembler protocol, hand-rolled)
 * ------------------------------------------------------------------ */

/** 消费一条 llm.stream 流，返回拼出的全部 text 块（reasoning/tool-call 丢弃）。 */
export async function readTextStream(stream: AsyncIterable<LlmChunk>): Promise<string> {
  const partials = new Map<number, { blockType: string; text: string; closed?: string }>()
  let finished = false
  for await (const chunk of stream) {
    if (chunk.type === 'finish') {
      finished = true
      const reason = chunk.reason
      if (reason && reason.kind !== 'stop') {
        const code = reason.failure?.code ?? reason.kind ?? 'unknown'
        const message = reason.failure?.message ?? ''
        throw new Error(`AI 质检流以 ${reason.kind} 结束（${code}${message ? `：${message}` : ''}）`)
      }
      continue
    }
    if (finished) continue
    const index = typeof chunk.index === 'number' ? chunk.index : 0
    const partial = partials.get(index) ?? { blockType: 'text', text: '' }
    switch (chunk.type) {
      case 'block-start':
        partial.blockType = chunk.blockType ?? 'text'
        break
      case 'text-delta':
        partial.blockType = 'text'
        partial.text += chunk.text ?? ''
        break
      case 'block-end':
        partial.blockType = chunk.block?.type ?? partial.blockType
        if (chunk.block?.type === 'text' && typeof chunk.block.text === 'string') {
          partial.closed = chunk.block.text
        }
        break
      default:
        // reasoning-delta / tool-call-delta / usage …一律不进正文
        if (chunk.type === 'reasoning-delta') partial.blockType = 'reasoning'
        break
    }
    partials.set(index, partial)
  }
  const texts: string[] = []
  for (const index of [...partials.keys()].sort((a, b) => a - b)) {
    const partial = partials.get(index)
    if (!partial || partial.blockType !== 'text') continue
    texts.push(partial.closed ?? partial.text)
  }
  return texts.join('\n')
}

/* ------------------------------------------------------------------ *
 * Narrow JSON validation (no ajv — the host leaves no runtime surface)
 * ------------------------------------------------------------------ */

/** 剥一层 Markdown 围栏（模型不守约定时的宽容），再 JSON.parse。 */
export function extractJsonObject(raw: string): unknown {
  let text = raw.trim()
  const fence = /^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n?```$/m.exec(text)
  if (fence) text = fence[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('AI 质检输出里没有 JSON 对象')
  const parsed: unknown = JSON.parse(text.slice(start, end + 1))
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI 质检输出不是 JSON 对象')
  }
  return parsed
}

/** 窄校验 + 收敛：坏条目丢弃进 dropped，一个都不剩才算解析失败。 */
export function parseAiIssues(
  raw: string,
  validPages: ReadonlySet<number>
): { issues: AiIssue[]; dropped: number } {
  const parsed = extractJsonObject(raw) as Record<string, unknown>
  const list = parsed.issues
  if (!Array.isArray(list)) throw new Error('AI 质检输出缺 issues 数组')
  const issues: AiIssue[] = []
  let dropped = 0
  for (const entry of list) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      dropped++
      continue
    }
    const record = entry as Record<string, unknown>
    const page = record.page
    const severity = record.severity
    const category = record.category
    const description = record.description
    const suggestion = record.suggestion
    if (
      typeof page !== 'number' ||
      !Number.isInteger(page) ||
      !validPages.has(page) ||
      typeof severity !== 'string' ||
      !VALID_SEVERITIES.has(severity) ||
      typeof category !== 'string' ||
      category.trim() === '' ||
      typeof description !== 'string' ||
      description.trim() === '' ||
      (suggestion !== undefined && typeof suggestion !== 'string')
    ) {
      dropped++
      continue
    }
    issues.push({
      page,
      severity: severity as AiIssue['severity'],
      category: category.trim(),
      description: description.trim(),
      ...(typeof suggestion === 'string' && suggestion.trim() !== '' ? { suggestion: suggestion.trim() } : {})
    })
  }
  return { issues, dropped }
}

/* ------------------------------------------------------------------ *
 * Layout digest (text-only fallback material + prompt context)
 * ------------------------------------------------------------------ */

/** 每页一行版式指标：形状数 / 文本形状数 / 字数 / 背景填充。 */
export function layoutDigest(pres: PresentationData, pages: number[]): string {
  const slides = getSlides(pres)
  const lines: string[] = []
  for (const page of pages) {
    const slide = slides[page - 1]
    if (!slide) continue
    let shapes = 0
    let textShapes = 0
    let chars = 0
    try {
      for (const shape of getSlideShapes(slide)) {
        shapes++
        const text = getShapeText(shape)
        if (text.trim() !== '') {
          textShapes++
          chars += text.trim().length
        }
      }
    } catch {
      // 一页指标坏了不坏整份摘要
    }
    lines.push(`第 ${page} 页：形状 ${shapes} 个（含文字 ${textShapes} 个），正文约 ${chars} 字`)
  }
  return lines.join('\n')
}

/* ------------------------------------------------------------------ *
 * The review run
 * ------------------------------------------------------------------ */

export interface AiReviewInput {
  /** 最终 pptx 渲染出的页 PNG（ppt_render 产物），按页码排序。 */
  images: Array<{ page: number; absPath: string }>
  /** 规则层建出来的原生 deck（版式摘要的数据源）。 */
  pres: PresentationData
  /** 参与质检的页码（1 起，升序）。 */
  pages: number[]
  signal?: AbortSignal
}

export async function runAiReview(input: AiReviewInput, deps: AiReviewDeps): Promise<AiReviewResult> {
  const displayPath = deps.toDisplayPath ?? ((p: string) => p)

  // 0. 服务与路由门控——缺什么就降级什么，绝不炸。
  if (!deps.llm || typeof deps.llm.stream !== 'function') {
    return { performed: false, reason: '宿主未注入 llm 服务，AI 质检不可用' }
  }
  const session = deps.sessionId !== null ? deps.sessions?.get(deps.sessionId) : undefined
  const route = session?.requestHeader?.()?.config
  const provider = typeof route?.provider === 'string' && route.provider !== '' ? route.provider : null
  const model = typeof route?.model === 'string' && route.model !== '' ? route.model : null
  if (provider === null || model === null) {
    return {
      performed: false,
      reason: '会话还没有路由过的模型（requestHeader.config 缺 provider/model），AI 质检不可用',
      fallbackImages: input.images.map((img) => ({ page: img.page, path: displayPath(img.absPath) })),
      layoutDigest: layoutDigest(input.pres, input.pages)
    }
  }

  // 1. 模态门控：路由不支持图像输入 → 降级为「PNG 路径 + 版式指标」。
  let supportsImage = false
  try {
    const info = await deps.llm.resolveModelInfo(provider, model, input.signal)
    supportsImage = info.inputModalities?.includes('image') === true
  } catch {
    supportsImage = false
  }
  if (!supportsImage || !deps.attachments || typeof deps.attachments.saveImages !== 'function') {
    const reason =
      !supportsImage
        ? `当前路由 ${provider}/${model} 未声明图像输入（inputModalities 不含 image）`
        : '宿主未注入 attachments 服务，图片无法入库'
    return {
      performed: false,
      reason: `${reason}；已降级：请主模型自行 read_image 下列 PNG 做视觉复核`,
      fallbackImages: input.images.map((img) => ({ page: img.page, path: displayPath(img.absPath) })),
      layoutDigest: layoutDigest(input.pres, input.pages)
    }
  }

  // 2. 图片入库（saveImages 只收 {data, mediaType, name}，不落盘 base64）。
  const refs: ImageAttachmentRefLike[] = []
  try {
    const batch = await Promise.all(
      input.images.map(async (img) => ({
        data: new Uint8Array(await readFile(img.absPath)),
        mediaType: 'image/png' as const,
        name: path.basename(img.absPath)
      }))
    )
    refs.push(...(await deps.attachments.saveImages(batch)))
  } catch (err) {
    return {
      performed: false,
      reason: `图片入库失败（${(err as Error).message}）；已降级：请主模型自行 read_image 下列 PNG`,
      fallbackImages: input.images.map((img) => ({ page: img.page, path: displayPath(img.absPath) })),
      layoutDigest: layoutDigest(input.pres, input.pages)
    }
  }

  // 3. 组消息：页码说明 + 版式摘要 → 每页一个 image 块。
  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: [
        `以下是这份演示文稿第 ${input.pages.join('、')} 页的最终渲染图（与交付的 .pptx 同源）。`,
        '',
        '版式指标摘要：',
        layoutDigest(input.pres, input.pages)
      ].join('\n')
    }
  ]
  input.images.forEach((img, index) => {
    const ref = refs[index]
    content.push({ type: 'text', text: `第 ${img.page} 页渲染图：` })
    content.push({ type: 'image', attachment: ref })
  })

  // 4. 调模型（temperature 0，官方 auto-review 同款），解析窄校验。
  const raw = await readTextStream(
    deps.llm.stream({
      provider,
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
      temperature: 0,
      ...(input.signal !== undefined ? { signal: input.signal } : {})
    })
  )

  const { issues, dropped } = parseAiIssues(raw, new Set(input.pages))
  void dropped // 坏条目静默丢弃；dropped 计数留给调用方需要时加 warning
  return {
    performed: true,
    provider,
    model,
    pages: input.pages,
    issues,
    promptVersion: AI_REVIEW_PROMPT_VERSION
  }
}

/** AI 建议 → 统一 ReviewIssue 形态（severity 恒为 warning，AI 层不阻断）。 */
export function aiIssuesAsReviewIssues(result: AiReviewResult): ReviewIssue[] {
  if (!result.performed) return []
  return result.issues.map((issue) => ({
    page: issue.page,
    severity: 'warning' as const,
    category: 'ai-visual' as const,
    description: `[AI/${issue.category}] ${issue.description}`,
    ...(issue.suggestion !== undefined ? { suggestion: issue.suggestion } : {})
  }))
}
