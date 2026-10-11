/**
 * Inspector：属性面板。
 *
 * 只走一条通路：store.actions.updateElement(elementId, patch)（→ stage → flush）。
 * 提供的字段（Inspector 不是万能的；占位、图标、表格留到 PR3）：
 *   - 文字（textarea）
 *   - 字号（number input）
 *   - 颜色（color picker；只能给「字面量」，主题色字符串 PR3 再支持）
 *   - 对齐（两段 select：[horizontal, vertical]）
 *   - bounds（x/y/w/h 四个数字框）
 *   - 替换图片（仅 elementType === 'image'：file input → POST /media/upload → updateElement set:{src}）
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { ImportGlyph } from '../icons'

interface PptElement {
  elementId?: string
  elementType?: string
  bounds?: [number, number, number, number]
  content?: {
    text?: string
    color?: string
    align?: [string, string]
    fontSize?: number
    [key: string]: unknown
  }
  /** Image 元素：图片相对路径。 */
  src?: string
  [key: string]: unknown
}

interface PptPage {
  elements?: PptElement[]
  [key: string]: unknown
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)))
  }
  return btoa(binary)
}

export function Inspector({ store }: { store: PptStore }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const selection = state.selection
  const page = (state.currentPageData ?? null) as PptPage | null

  if (!selection || !selection.ids.length) {
    return (
      <div className="ppt-inspector">
        <p className="ppt-inspector-empty">点一个元素开始编辑它的属性。</p>
      </div>
    )
  }
  const elementId = selection.ids[0]
  const target = Array.isArray(page?.elements) ? page!.elements!.find((e) => e.elementId === elementId) : undefined
  if (!target) {
    return (
      <div className="ppt-inspector">
        <p className="ppt-inspector-empty">选中的元素已不在磁盘上（可能被外部删除了）。</p>
      </div>
    )
  }
  const content = target.content ?? {}
  const [hx, hv] = content.align ?? ['left', 'top']
  const [bx, by, bw, bh] = target.bounds ?? [0, 0, 0, 0]

  const setField = (patch: Record<string, unknown>) => {
    void store.actions.updateElement(elementId, patch)
  }
  const setContentField = (kv: Record<string, unknown>) => {
    setField({ content: { ...content, ...kv } })
  }

  return (
    <div className="ppt-inspector">
      <div className="ppt-inspector-head">
        <strong>{target.elementId}</strong>
        <span className="ppt-inspector-tag">{target.elementType}</span>
      </div>

      <label className="ppt-inspector-row">
        <span>文字</span>
        <textarea
          rows={3}
          value={String(content.text ?? '')}
          onChange={(e) => setContentField({ text: e.target.value })}
        />
      </label>

      <div className="ppt-inspector-row">
        <span>字号</span>
        <input
          type="number"
          min={6}
          max={200}
          value={typeof content.fontSize === 'number' ? content.fontSize : 16}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (Number.isFinite(v) && v >= 6 && v <= 200) setContentField({ fontSize: v })
          }}
        />
      </div>

      <label className="ppt-inspector-row">
        <span>颜色（仅字面量；主题色留 PR3）</span>
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(String(content.color ?? '')) ? String(content.color) : '#1F2937'}
          onChange={(e) => setContentField({ color: e.target.value })}
        />
      </label>

      <div className="ppt-inspector-row">
        <span>对齐（横向 / 纵向）</span>
        <div className="ppt-inspector-pair">
          <select value={hx} onChange={(e) => setContentField({ align: [e.target.value, hv] })}>
            <option value="left">左</option>
            <option value="center">中</option>
            <option value="right">右</option>
            <option value="justify">两端</option>
          </select>
          <select value={hv} onChange={(e) => setContentField({ align: [hx, e.target.value] })}>
            <option value="top">顶</option>
            <option value="middle">中</option>
            <option value="bottom">底</option>
          </select>
        </div>
      </div>

      <div className="ppt-inspector-row">
        <span>bounds [x, y, w, h]</span>
        <div className="ppt-inspector-bounds">
          {(['x', 'y', 'w', 'h'] as const).map((label, i) => (
            <label key={label}>
              <span>{label}</span>
              <input
                type="number"
                value={[bx, by, bw, bh][i]}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (!Number.isFinite(v)) return
                  const next: [number, number, number, number] = [bx, by, bw, bh]
                  next[i] = v
                  setField({ bounds: next })
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {target.elementType === 'image' && (
        <label className="ppt-inspector-row">
          <span>替换图片</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              if (!file) return
              ;(async () => {
                if (!state.activeKey) return
                try {
                  const data = await fileToBase64(file)
                  const res = await store.actions.uploadMedia({ name: file.name, mime: file.type, data })
                  setField({ src: res.src })
                } catch (error) {
                  store.actions.toast(`图片替换失败：${(error as Error).message}`, 'error')
                }
              })()
              e.currentTarget.value = ''
            }}
          />
          <span className="ppt-inspector-hint">
            <ImportGlyph size={11} /> 上传落到工程 media/ 下（宿主生成文件名），然后 update_element set src。
          </span>
        </label>
      )}
    </div>
  )
}
