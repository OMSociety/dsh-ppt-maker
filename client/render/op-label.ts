/**
 * 版本历史的编辑说明（纯函数，不依赖 React 与 DOM）。
 *
 * 快照元数据里的操作记录（`update_element pages/02.page#chart`）与工具返回值同源；
 * 抽屉显示时写成「修改元素 · 第 2 页 · chart」，未知记录按原文显示。
 */
const OP_NAMES: Record<string, string> = {
  create: '创建工程',
  add_page: '新增页面',
  remove_page: '删除页面',
  move_page: '调整页序',
  update_page: '修改页面',
  page_duplicate: '复制页面',
  add_element: '新增元素',
  update_element: '修改元素',
  remove_element: '删除元素',
  update_svg_source: '更新 SVG 源'
}

/** `pages/02.page` → `第 2 页`；不是页文件路径时原样返回。 */
function pageLabel(path: string): string {
  const match = /(?:^|\/)(\d+)\.page$/.exec(path)
  return match ? `第 ${Number(match[1])} 页` : path
}

/** 单条操作记录 → 中文说明。 */
export function opLabel(record: string): string {
  const space = record.indexOf(' ')
  const name = space < 0 ? record : record.slice(0, space)
  const rest = space < 0 ? '' : record.slice(space + 1)
  const verb = OP_NAMES[name]
  if (!verb) return record
  if (!rest) return verb

  // `pages/02.page#chart`：页 + 元素 id
  const hash = rest.indexOf('#')
  if (hash >= 0) return `${verb} · ${pageLabel(rest.slice(0, hash))} · ${rest.slice(hash + 1)}`

  // `pages/01.page 0→2`（页序移动，下标从 0 起）。须先于通用箭头分支匹配。
  const move = /^(\S+) (\d+)→(\d+)$/.exec(rest)
  if (move) return `${verb} · ${pageLabel(move[1])}：${Number(move[2]) + 1} → ${Number(move[3]) + 1}`

  // `pages/03.page→pages/04.page`、`pages/02.page→media/svg/x.svg`
  const arrow = rest.indexOf('→')
  if (arrow >= 0) {
    const from = rest.slice(0, arrow)
    const to = rest.slice(arrow + 1)
    return name === 'update_svg_source'
      ? `${verb} · ${pageLabel(from)} · ${to}`
      : `${verb} · ${pageLabel(from)} → ${pageLabel(to)}`
  }

  // `pages/01.page@2`（插入位置）
  const at = /^(.+)@(\d+)$/.exec(rest)
  if (at) return `${verb} · ${pageLabel(at[1])}（位置 ${Number(at[2]) + 1}）`

  return `${verb} · ${pageLabel(rest)}`
}

/** 一个版本的全部记录 → 一行摘要：相同说明合并为「×N」，最多列 3 类，其余计数。 */
export function opsSummaryOf(ops: readonly string[], mergedCount: number): string {
  const counts = new Map<string, number>()
  for (const record of ops) {
    const label = opLabel(record)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const labels = [...counts.entries()].map(([label, n]) => (n > 1 ? `${label} ×${n}` : label))
  const head = labels.slice(0, 3).join('；')
  const more = labels.length > 3 ? `；另有 ${labels.length - 3} 类` : ''
  const merged = mergedCount > 0 ? `（合并 ${mergedCount} 次编辑）` : ''
  return `${head || '创建工程'}${more}${merged}`
}
