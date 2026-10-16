/**
 * Shared plumbing for the five ppt_* tools.
 *
 * Raw JSON-Schema registration only (plan §2: `ctx.tools.register({name,
 * description, parameters, output, execute})`) — no `defineTool` import, the
 * host adds nothing we rely on.
 */
import { ProjectError } from '../core/project/store.js'

export interface ToolErrorResult {
  ok: false
  error: { code: string; message: string; status?: number; detail?: unknown }
}

/** Uniform failure payload: ProjectError keeps its code/status, anything else is InternalError. */
export function toolError(err: unknown): ToolErrorResult {
  if (err instanceof ProjectError) {
    return {
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.status !== undefined ? { status: err.status } : {}),
        ...(err.detail !== undefined ? { detail: err.detail } : {})
      }
    }
  }
  const message = err instanceof Error ? err.message : String(err)
  return { ok: false, error: { code: 'InternalError', message } }
}

export interface SessionsLike {
  get(id: string):
    | {
        header?: { cwd?: unknown }
        requestHeader?: () => { config?: { provider?: string; model?: string } } | undefined
      }
    | undefined
}

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
  /**
   * The host's ToolRuntime.register rejects a definition whose `output.schema`
   * is absent (`unsupported JSON schema: schema must be a schema object`) and
   * renders the committed value through `render(args, value)`, whose result
   * must be lossless JSON content blocks — not a bare string.
   */
  output: { schema: Record<string, unknown>; render: (args: unknown, result: never) => unknown }
  execute: (args: Record<string, unknown>, exec: unknown) => Promise<unknown>
}

/**
 * Result-envelope schema for the ppt_* tools.
 *
 * Only `ok` is required: every tool answers either `{ok:true, ...}` or the
 * uniform `{ok:false, error}` failure payload from `toolError`, so requiring
 * anything else would make a clean failure envelope fail output validation.
 * Extras stay admitted (`additionalProperties: true`) — each tool documents
 * further fields, but the schema is a floor, not a ceiling.
 */
export function resultSchema(properties: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'object',
    required: ['ok'],
    additionalProperties: true,
    properties: { ok: { type: 'boolean' }, ...properties }
  }
}

export interface PluginToolCtx {
  tools: { register(def: ToolDef): unknown }
  sessions?: SessionsLike
 /** AI 质检通路：宿主 llm 服务，缺席时 ppt_check ai:true 显式降级。 */
  llm?: import('../core/review/ai.js').LlmLike
 /** AI 质检通路：图片入库服务。 */
  attachments?: import('../core/review/ai.js').AttachmentsLike
}

/** exec.agent.session.id — the only session key the tool layer trusts. */
export function sessionIdOf(exec: unknown): string | null {
  const id = (exec as { agent?: { session?: { id?: unknown } } | null } | null | undefined)?.agent?.session?.id
  return typeof id === 'string' && id !== '' ? id : null
}

/**
 * Session cwd via `ctx.sessions.get(exec.agent.session.id).header.cwd`
 * (plan §7). No fallback to `process.cwd()` — missing context is an error.
 */
export function resolveSessionCwd(exec: unknown, sessions: SessionsLike | undefined): string {
  const sessionId = sessionIdOf(exec)
  if (sessionId === null) {
    throw new ProjectError('SessionMissing', '执行上下文缺少 agent.session.id，无法定位会话工作目录', { status: 400 })
  }
  if (!sessions || typeof sessions.get !== 'function') {
    throw new ProjectError('SessionsUnavailable', '宿主未注入 sessions 服务，无法定位会话工作目录', { status: 500 })
  }
  const cwd = sessions.get(sessionId)?.header?.cwd
  if (typeof cwd !== 'string' || cwd === '') {
    throw new ProjectError('SessionCwdMissing', `会话 ${sessionId} 缺少 cwd，无法定位工程目录（不回落 process.cwd()）`, { status: 400 })
  }
  return cwd
}

/**
 * Build the host-facing `output.render` projection for one tool.
 *
 * The host calls this as `render(exec.arguments, value)` and requires the
 * return value to be lossless JSON — an array of content blocks, the shape
 * every shipped DSH plugin uses. Returning a bare string (as this module did
 * before) is not a content-block projection.
 *
 * `line` keeps its one-argument shape: it receives the committed result value.
 */
export function renderSummary(line: (result: Record<string, unknown>) => string): (args: unknown, result: never) => unknown {
  return ((_args: unknown, result: Record<string, unknown>) => {
    if (result && result.ok === false) {
      const error = result.error as { code?: string; message?: string } | undefined
      return [{ type: 'text', text: `失败 [${error?.code ?? 'Error'}] ${error?.message ?? ''}`.trim() }]
    }
    return [{ type: 'text', text: line(result) }]
  }) as (args: unknown, result: never) => unknown
}
