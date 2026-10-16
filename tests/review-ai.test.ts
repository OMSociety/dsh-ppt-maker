/**
 * AI 质检层单测（mock LLM 返回固定 JSON，测解析/校验/门控分支）。
 *
 * 不碰真实宿主：llm/attachments/sessions 全部是结构型 stub；
 * renderPptxImages 不在这里跑（runAiReview 的 images 直接手喂）。
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  aiIssuesAsReviewIssues,
  extractJsonObject,
  layoutDigest,
  parseAiIssues,
  readTextStream,
  runAiReview,
  type AiReviewDeps,
  type LlmChunk,
  type LlmLike
} from '../src/core/review/ai.js'
import type { PresentationData } from '@office-kit/pptx'
import { createOfficeKitEngine } from '../src/core/engine/officekit.js'
import type { BuildContext } from '../src/core/engine/types.js'
import type { Page, Presentation } from '../src/core/pptd/parse.js'

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

/** 1×1 透明 PNG（最小的合法 PNG 字节）。 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'ppt-ai-'))
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

async function fakeImage(page: number): Promise<{ page: number; absPath: string }> {
  const absPath = path.join(tmp, `page-${page}.png`)
  await writeFile(absPath, TINY_PNG)
  return { page, absPath }
}

/** 两页真实 PresentationData：走引擎 buildDeck，每页一个文本框。 */
async function fakePres(): Promise<PresentationData> {
  const engine = createOfficeKitEngine()
  const deck: Presentation = {
    profile: 'generate',
    size: [960, 540],
    export: { fontEmbed: 'off', transition: 'none', animations: 'off' },
    pages: ['pages/01.page', 'pages/02.page']
  }
  const pages: Page[] = ['第一页标题', '第二页正文内容'].map((text, i) => ({
    elements: [
      {
        elementId: `t${i}`,
        elementType: 'text',
        bounds: [40, 40, 400, 60],
        content: { text }
      }
    ]
  }))
  const buildCtx: BuildContext = {
    projectDir: tmp,
    loadMedia: async () => {
      throw new Error('no media in tests')
    },
    warnings: []
  }
  const built = await engine.buildDeck({ deck, pages }, buildCtx)
  return built.native as PresentationData
}

/** 把一串 text 拼成 BlockAssembler 协议的 chunk 流。 */
async function* streamOf(text: string, opts: { finishKind?: string } = {}): AsyncIterable<LlmChunk> {
  yield { type: 'block-start', index: 0, blockType: 'text' }
  yield { type: 'text-delta', index: 0, text }
  yield { type: 'block-end', index: 0, block: { type: 'text', text } }
  yield { type: 'finish', reason: { kind: opts.finishKind ?? 'stop' } }
}

function llmReturning(text: string, opts: { modalities?: string[] } = {}): LlmLike & { calls: number } {
  const state = { calls: 0 }
  return {
    calls: 0,
    stream() {
      state.calls++
      return streamOf(text)
    },
    async resolveModelInfo() {
      return { inputModalities: opts.modalities ?? ['text', 'image'] }
    }
  }
}

function deps(overrides: Partial<AiReviewDeps> = {}): AiReviewDeps {
  return {
    llm: llmReturning('{"issues":[]}'),
    attachments: {
      async saveImages(inputs) {
        return inputs.map((_, i) => ({ attachmentId: `sha256:fake${i}`, mediaType: 'image/png' }))
      }
    },
    sessions: {
      get: (id) =>
        id === 's-test'
          ? { header: { cwd: tmp }, requestHeader: () => ({ config: { provider: 'p', model: 'm' } }) }
          : undefined
    },
    sessionId: 's-test',
    ...overrides
  }
}

/* ------------------------------------------------------------------ *
 * Stream consumption
 * ------------------------------------------------------------------ */

describe('readTextStream（BlockAssembler 协议手卷消费）', () => {
  it('拼接 text-delta 并丢弃 reasoning 块', async () => {
    async function* stream(): AsyncIterable<LlmChunk> {
      yield { type: 'block-start', index: 0, blockType: 'reasoning' }
      yield { type: 'reasoning-delta', index: 0, text: '想一下……' }
      yield { type: 'block-start', index: 1, blockType: 'text' }
      yield { type: 'text-delta', index: 1, text: '{"iss' }
      yield { type: 'text-delta', index: 1, text: 'ues":[]}' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
    expect(await readTextStream(stream())).toBe('{"issues":[]}')
  })

  it('finish 带 error 时抛出', async () => {
    async function* stream(): AsyncIterable<LlmChunk> {
      yield { type: 'finish', reason: { kind: 'error', failure: { code: 'RATE_LIMIT', message: 'too fast' } } }
    }
    await expect(readTextStream(stream())).rejects.toThrow(/RATE_LIMIT/)
  })
})

/* ------------------------------------------------------------------ *
 * JSON 窄校验
 * ------------------------------------------------------------------ */

describe('parseAiIssues（窄校验 + 页码收敛）', () => {
  const pages = new Set([1, 2])

  it('合法 JSON 全收', () => {
    const { issues, dropped } = parseAiIssues(
      JSON.stringify({
        issues: [
          { page: 1, severity: 'suggestion', category: '配色', description: '封面蓝紫撞色', suggestion: '统一为蓝系' },
          { page: 2, severity: 'polish', category: '层级', description: '标题字重偏弱' }
        ]
      }),
      pages
    )
    expect(issues).toHaveLength(2)
    expect(dropped).toBe(0)
    expect(issues[0]).toMatchObject({ page: 1, severity: 'suggestion' })
    expect(issues[1].suggestion).toBeUndefined()
  })

  it('Markdown 围栏 + 前后废话能剥掉', () => {
    const raw = '好的，结果如下：\n```json\n{"issues":[]}\n```\n以上。'
    expect(parseAiIssues(raw, pages).issues).toEqual([])
  })

  it('坏条目丢弃：页码越界 / severity 造词 / 缺 description', () => {
    const { issues, dropped } = parseAiIssues(
      JSON.stringify({
        issues: [
          { page: 99, severity: 'suggestion', category: 'x', description: '页码不存在' },
          { page: 1, severity: 'fatal', category: 'x', description: 'severity 造词' },
          { page: 1, severity: 'polish', category: 'x' },
          { page: 2, severity: 'polish', category: '密度', description: '信息密度过高' }
        ]
      }),
      pages
    )
    expect(issues).toHaveLength(1)
    expect(dropped).toBe(3)
  })

  it('issues 不是数组 → 抛解析失败', () => {
    expect(() => parseAiIssues('{"issues":"none"}', pages)).toThrow(/issues/)
    expect(() => parseAiIssues('没有 JSON', pages)).toThrow(/JSON/)
  })
})

/* ------------------------------------------------------------------ *
 * 门控与降级分支
 * ------------------------------------------------------------------ */

describe('runAiReview 门控', () => {
  it('全通路：saveImages 收 PNG、消息带 image 块、返回结构化建议', async () => {
    const saved: Array<{ mediaType: string; name?: string }> = []
    const sentContent: Array<Record<string, unknown>>[] = []
    const llm: LlmLike = {
      stream(options) {
        sentContent.push(options.messages[0].content)
        return streamOf('{"issues":[{"page":2,"severity":"suggestion","category":"平衡","description":"右半版偏重","suggestion":"左移配图"}]}')
      },
      async resolveModelInfo() {
        return { inputModalities: ['text', 'image'] }
      }
    }
    const d = deps({
      llm,
      attachments: {
        async saveImages(inputs) {
          saved.push(...inputs)
          return inputs.map((_, i) => ({ attachmentId: `sha256:img${i}` }))
        }
      }
    })
    const result = await runAiReview(
      { images: [await fakeImage(1), await fakeImage(2)], pres: await fakePres(), pages: [1, 2] },
      d
    )
    expect(result.performed).toBe(true)
    if (result.performed) {
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0]).toMatchObject({ page: 2, category: '平衡' })
      expect(result.promptVersion).toBe('ai-review/v1')
    }
    expect(saved).toHaveLength(2)
    expect(saved[0].mediaType).toBe('image/png')
    const blocks = sentContent[0]
    expect(blocks.filter((b) => b.type === 'image')).toHaveLength(2)
    expect(String(blocks[0].text)).toContain('第 1、2 页')
  })

  it('路由不支持图像 → 降级：performed:false + PNG 路径 + 版式摘要', async () => {
    const llm = llmReturning('{}', { modalities: ['text'] })
    const result = await runAiReview(
      { images: [await fakeImage(1)], pres: await fakePres(), pages: [1] },
      deps({ llm })
    )
    expect(result.performed).toBe(false)
    if (!result.performed) {
      expect(result.reason).toContain('inputModalities')
      expect(result.fallbackImages).toHaveLength(1)
      expect(result.fallbackImages?.[0].path).toContain('page-1.png')
      expect(result.layoutDigest).toContain('第 1 页')
    }
  })

  it('会话无路由（requestHeader 缺 config）→ 降级并说明', async () => {
    const d = deps({
      sessions: { get: () => ({ header: { cwd: tmp }, requestHeader: () => undefined }) }
    })
    const result = await runAiReview({ images: [await fakeImage(1)], pres: await fakePres(), pages: [1] }, d)
    expect(result.performed).toBe(false)
    if (!result.performed) expect(result.reason).toContain('provider/model')
  })

  it('缺 llm 服务 → performed:false，不抛', async () => {
    const result = await runAiReview(
      { images: [await fakeImage(1)], pres: await fakePres(), pages: [1] },
      deps({ llm: undefined })
    )
    expect(result.performed).toBe(false)
    if (!result.performed) expect(result.reason).toContain('llm')
  })

  it('saveImages 失败 → 降级成 PNG 路径清单（不炸）', async () => {
    const d = deps({
      attachments: {
        async saveImages() {
          throw new Error('TOO_MANY_IMAGES')
        }
      }
    })
    const result = await runAiReview({ images: [await fakeImage(1)], pres: await fakePres(), pages: [1] }, d)
    expect(result.performed).toBe(false)
    if (!result.performed) {
      expect(result.reason).toContain('TOO_MANY_IMAGES')
      expect(result.fallbackImages).toHaveLength(1)
    }
  })

  it('模型输出坏 JSON → 抛（由调用方管线降级成 performed:false）', async () => {
    const d = deps({ llm: llmReturning('我觉得整体还行，不用改。') })
    await expect(runAiReview({ images: [await fakeImage(1)], pres: await fakePres(), pages: [1] }, d)).rejects.toThrow()
  })
})

/* ------------------------------------------------------------------ *
 * 版式摘要
 * ------------------------------------------------------------------ */

describe('layoutDigest', () => {
  it('每页一行：形状数 / 文本形状数 / 字数', async () => {
    const digest = layoutDigest(await fakePres(), [1, 2])
    expect(digest).toContain('第 1 页')
    expect(digest).toContain('第 2 页')
    expect(digest).toContain('形状 1 个')
    expect(digest).toContain('含文字 1 个')
  })

  it('越界页码静默跳过', async () => {
    expect(layoutDigest(await fakePres(), [5])).toBe('')
  })
})

/* ------------------------------------------------------------------ *
 * extractJsonObject 边界
 * ------------------------------------------------------------------ */

describe('extractJsonObject', () => {
  it('拒绝数组与标量', () => {
    expect(() => extractJsonObject('[1,2]')).toThrow()
    expect(() => extractJsonObject('42')).toThrow(/JSON/)
  })
})
