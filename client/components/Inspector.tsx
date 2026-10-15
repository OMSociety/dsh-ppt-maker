/**
 * Inspector：属性面板。
 *
 * 只走一条通路：store.actions.updateElement(elementId, patch)（→ stage → flush）。
 * 按 elementType 分节（图表字段编辑不在面板内）：
 *   - 通用：bounds（x/y/w/h 四个数字框）；image 另有「替换图片」
 *   - text：文字（纯文字/标记 双模式 textarea）、字号、颜色、对齐
 *   - shape：同 text（形状可带文字）；颜色行落到 fill（形状没有 content.color）
 *   - icon：iconName、颜色（落到 fill）
 *   - table：单元格文字网格 + 增删行列（比例均分，rowSpan/colSpan 随单元格保留）
 *   - placeholder（逆向方言）：originalType 展示；line：仅 bounds
 * 颜色行（text 用 content.color，shape/icon 用 fill.color）：
 *   主题色板一键写回 $引用（显示解析色与 $ref 徽标），原生拾色器只写字面量。
 */
import * as React from 'react'
import type { PptStore } from '../store'
import { ImportGlyph } from '../icons'
import { hasRichMarkup, markupToPlain, plainToMarkup } from '../render/text-markup'
import { colorFieldModel, deckTheme, normalizeHex } from '../render/resolve'
import { equalRatios, normTableRows } from '../render/table-rows'

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
  /** shape / icon：填充（颜色行落到 fill.color）。 */
  fill?: unknown
  /** icon：Font Awesome 免费集图标名，形如 "fas:house"。 */
  iconName?: string
  /** table：二维单元格数组（合并区域按省略规则稀疏存放）。 */
  rows?: unknown
  /** placeholder：源元素类别（chart / smartArt / group / media / ole / object3d / unknown）。 */
  originalType?: string
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

/** fill 可能是 {type, color} 对象或颜色简写；取其 color 供颜色行用。 */
function fillColorOf(fill: unknown): unknown {
  if (typeof fill === 'string') return fill
  if (fill && typeof fill === 'object') return (fill as { color?: unknown }).color
  return undefined
}

export function Inspector({ store, onCollapse }: { store: PptStore; onCollapse?: () => void }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
  const selection = state.selection
  const page = (state.currentPageData ?? null) as PptPage | null
  // 编辑模式与草稿必须挂在早退之前（hooks 顺序不能变）。
  // 草稿按「工程#页#元素#模式」定键：键一变就回到磁盘上的最新值，键没变则
  // 用户正在敲的字优先（避免 stage 回写把光标顶走）。
  const [textMode, setTextMode] = React.useState<'plain' | 'markup'>('plain')
  const [textDraft, setTextDraft] = React.useState<{ key: string; value: string } | null>(null)

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

  const rawText = String(content.text ?? '')
  const richText = hasRichMarkup(rawText)

  // 分节：text/shape 吃文字字段；shape/icon 的颜色行落到 fill（形状与图标没有 content.color）。
  const elementType = String(target.elementType ?? 'text')
  const isTextLike = elementType === 'text' || elementType === 'shape'
  const usesFillColor = elementType === 'shape' || elementType === 'icon'
  const hasColorRow = isTextLike || elementType === 'icon'
  const colorSource = usesFillColor ? fillColorOf(target.fill) : content.color
  const commitColor = (color: string) => {
    if (usesFillColor) setField({ fill: { type: 'solid', color } })
    else setContentField({ color })
  }

  // 颜色字段的视图模型：$引用保留引用名（写回也是 $key），色样/拾色器用 theme 解析后的值。
  const theme = deckTheme(state.deck)
  const colorModel = colorFieldModel(colorSource, theme)
  const themeColors = Object.entries(theme?.colors ?? {}).map(([key, raw]) => ({
    key,
    ref: `$${key}`,
    hex: normalizeHex(raw),
  }))

  const textKey = `${state.activeKey ?? ''}#${state.currentPage}#${elementId}#${textMode}`
  const textValue =
    textDraft && textDraft.key === textKey
      ? textDraft.value
      : textMode === 'plain'
        ? markupToPlain(rawText)
        : rawText
  const commitText = (next: string) => {
    setTextDraft({ key: textKey, value: next })
    setContentField({ text: textMode === 'plain' ? plainToMarkup(next) : next })
  }

  return (
    <div className="ppt-inspector">
      <div className="ppt-inspector-head">
        <strong>{target.elementId}</strong>
        <span className="ppt-inspector-tag">{target.elementType}</span>
        {onCollapse ? (
          <button
            type="button"
            className="ppt-btn ppt-inspector-collapse"
            onClick={onCollapse}
            title="收起属性面板"
            aria-label="收起属性面板"
          >
            ›
          </button>
        ) : null}
      </div>

      {elementType === 'icon' ? (
        <label className="ppt-inspector-row">
          <span>iconName（Font Awesome 免费集）</span>
          <input
            type="text"
            value={String(target.iconName ?? '')}
            placeholder="fas:house"
            onChange={(e) => setField({ iconName: e.target.value })}
          />
        </label>
      ) : null}

      {isTextLike ? (
        <div className="ppt-inspector-row">
          <span className="ppt-inspector-labelrow">
            文字
            <span className="ppt-inspector-modes" role="group" aria-label="文字编辑模式">
              <button
                type="button"
                className={`ppt-btn ppt-btn-mode${textMode === 'plain' ? ' ppt-btn-on' : ''}`}
                aria-pressed={textMode === 'plain'}
                onClick={() => setTextMode('plain')}
                title="按纯文字编辑；保存时按行包回 <p>"
              >
                纯文字
              </button>
              <button
                type="button"
                className={`ppt-btn ppt-btn-mode${textMode === 'markup' ? ' ppt-btn-on' : ''}`}
                aria-pressed={textMode === 'markup'}
                onClick={() => setTextMode('markup')}
                title="直接编辑原始标记（<p> = 段落）"
              >
                标记
              </button>
            </span>
          </span>
          <textarea
            rows={3}
            value={textValue}
            onChange={(e) => commitText(e.target.value)}
            // 失焦即丢弃草稿：撤销/重做或外部改动后，框里立刻回到磁盘上的真值。
            onBlur={() => setTextDraft(null)}
          />
          {richText && textMode === 'plain' ? (
            <span className="ppt-inspector-hint">
              原文含行内格式（&lt;strong&gt; 等），纯文字模式保存会丢弃；要保留请切「标记」。
            </span>
          ) : null}
        </div>
      ) : null}

      {isTextLike ? (
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
      ) : null}

      {hasColorRow ? (
        <div className="ppt-inspector-row">
          <div className="ppt-inspector-labelrow">
            <span>{usesFillColor ? '填充色' : '颜色'}</span>
            {colorModel.ref ? <code className="ppt-inspector-ref">{colorModel.ref}</code> : null}
          </div>
          {themeColors.length ? (
            <div className="ppt-inspector-swatches" role="group" aria-label="主题色">
              {themeColors.map(({ key, ref, hex }) => (
                <button
                  key={key}
                  type="button"
                  className={`ppt-inspector-swatch${colorModel.ref === ref ? ' ppt-inspector-swatch-on' : ''}`}
                  style={hex ? { background: hex } : undefined}
                  title={`${ref}${hex ? `（${hex}）` : ''}`}
                  aria-label={`主题色 ${ref}`}
                  aria-pressed={colorModel.ref === ref}
                  onClick={() => commitColor(ref)}
                />
              ))}
            </div>
          ) : null}
          <input
            type="color"
            aria-label="自定义颜色（字面量）"
            value={colorModel.picker}
            onChange={(e) => commitColor(e.target.value)}
          />
        </div>
      ) : null}

      {isTextLike ? (
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
      ) : null}

      {elementType === 'table' ? <TableGrid rows={target.rows} onPatch={setField} /> : null}

      {elementType === 'placeholder' ? (
        <div className="ppt-inspector-row">
          <span>占位元素（逆向方言）</span>
          <span className="ppt-inspector-hint">
            原类型 {String(target.originalType ?? 'unknown')}；源部件数据不进工程，画布显示斜纹占位框，位置大小可调。
          </span>
        </div>
      ) : null}

      {elementType === 'chart' ? (
        <div className="ppt-inspector-row">
          <span>图表</span>
          <span className="ppt-inspector-hint">
            data / series / title 等字段请在 .page 里直改，ppt_render 复核成品。
          </span>
        </div>
      ) : null}

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

/** 表格内容的最小网格编辑：单元格文字 + 增删行列。合并单元格按稀疏行渲染，不破坏结构。 */
function TableGrid({ rows, onPatch }: { rows: unknown; onPatch: (patch: Record<string, unknown>) => void }) {
  const grid = normTableRows(rows)
  const colCount = grid.reduce((m, r) => Math.max(m, r.length), 0)

  if (!grid.length || !colCount) {
    return (
      <div className="ppt-inspector-row">
        <span>表格内容</span>
        <button
          type="button"
          className="ppt-btn"
          onClick={() =>
            onPatch({
              rows: [
                [{ text: '' }, { text: '' }],
                [{ text: '' }, { text: '' }],
              ],
              columnWidths: [0.5, 0.5],
              rowHeights: [0.5, 0.5],
            })
          }
        >
          + 初始化 2×2 表格
        </button>
      </div>
    )
  }

  const setCell = (ri: number, ci: number, text: string) => {
    onPatch({
      rows: grid.map((row, r) => row.map((cell, c) => (r === ri && c === ci ? { ...cell, text } : cell))),
    })
  }

  return (
    <div className="ppt-inspector-row">
      <span className="ppt-inspector-labelrow">
        表格内容（{grid.length} 行 × {colCount} 列）
        <span className="ppt-inspector-modes" role="group" aria-label="表格结构">
          <button
            type="button"
            className="ppt-btn ppt-btn-mode"
            onClick={() =>
              onPatch({
                rows: [...grid, Array.from({ length: colCount }, () => ({ text: '' }))],
                rowHeights: equalRatios(grid.length + 1),
              })
            }
          >
            +行
          </button>
          <button
            type="button"
            className="ppt-btn ppt-btn-mode"
            disabled={grid.length <= 1}
            onClick={() => onPatch({ rows: grid.slice(0, -1), rowHeights: equalRatios(grid.length - 1) })}
          >
            −行
          </button>
          <button
            type="button"
            className="ppt-btn ppt-btn-mode"
            onClick={() =>
              onPatch({
                rows: grid.map((row) => [...row, { text: '' }]),
                columnWidths: equalRatios(colCount + 1),
              })
            }
          >
            +列
          </button>
          <button
            type="button"
            className="ppt-btn ppt-btn-mode"
            disabled={colCount <= 1}
            onClick={() =>
              onPatch({
                rows: grid.map((row) => row.slice(0, -1)),
                columnWidths: equalRatios(colCount - 1),
              })
            }
          >
            −列
          </button>
        </span>
      </span>
      <div className="ppt-inspector-table" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {grid.map((row, ri) =>
          row.map((cell, ci) => (
            <input
              key={`${ri}-${ci}`}
              type="text"
              value={String(cell.text ?? '')}
              aria-label={`单元格 ${ri + 1}-${ci + 1}`}
              onChange={(e) => setCell(ri, ci, e.target.value)}
            />
          )),
        )}
      </div>
      <span className="ppt-inspector-hint">
        增删行列后列宽/行高均分；合并单元格的 rowSpan/colSpan 随单元格保留。画布显示占位框，成品以 ppt_render 为准。
      </span>
    </div>
  )
}
