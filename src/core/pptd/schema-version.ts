/**
 * src/core/pptd/schema-version.ts — deck.pptd `schema` gate.
 *
 * 工具链只接受 `schema: 2`；缺失或不支持的版本返回 `UnsupportedSchemaError`，
 * 非整数返回 `SchemaError`（spec §2.0）。
 */
import { ERROR_CODES, type Issue } from './schema.js'
import { SUPPORTED_SCHEMA_VERSIONS } from './schema-v2.js'

export function validateDeckSchemaVersion(deck: Record<string, unknown>, path = 'deck.pptd'): Issue[] {
  const raw = deck.schema
  if (raw === undefined || raw === null) {
    return [
      blocker(
        ERROR_CODES.UnsupportedSchemaError,
        '此工程缺少 `schema` 字段：工具链只打开 `schema: 2` 的 PPTD 工程；v1 工程请用 dsh-ppt-maker 1.x，或按 docs/pptd-spec.md §2.0 手动迁移',
        `${path}#schema`
      )
    ]
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return [blocker(ERROR_CODES.SchemaError, `schema 必须是整数（实际：${JSON.stringify(raw)}）`, `${path}#schema`, { actual: raw })]
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.has(raw)) {
    return [
      blocker(
        ERROR_CODES.UnsupportedSchemaError,
        `schema 版本不受支持（实际：${raw}；本工具链支持：${[...SUPPORTED_SCHEMA_VERSIONS].join(', ')}）`,
        `${path}#schema`,
        { actual: raw, supported: [...SUPPORTED_SCHEMA_VERSIONS] }
      )
    ]
  }
  return []
}

function blocker(code: string, message: string, path: string, detail?: Record<string, unknown>): Issue {
  return { code, level: 'blocker', message, path, ...(detail ? { detail } : {}) }
}
