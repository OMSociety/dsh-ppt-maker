/**
 * 包内不可达部件裁剪。
 * 从包根关系出发沿内部关系走一遍，凡不在可达集里的部件（逐页重建后被移除的
 * 源页所带的图表、内嵌工作簿、备注页、素材等）连同它们的关系部件与
 * [Content_Types].xml 里的 Override 一并去掉。引擎的 removeSlide 只删页本身。
 * 任何解析异常都原样返回，不让裁剪拖垮保存。
 */
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'

const CONTENT_TYPES = '[Content_Types].xml'
const ROOT_RELS = '_rels/.rels'

function resolveTarget(relsName: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  const sourceDir = relsName.replace(/(^|\/)_rels\/[^/]*$/, '$1').replace(/\/$/, '')
  const parts = (sourceDir ? sourceDir.split('/') : []).concat(target.split('/'))
  const out: string[] = []
  for (const part of parts) {
    if (part === '..') out.pop()
    else if (part !== '.' && part !== '') out.push(part)
  }
  return out.join('/')
}

function relsNameOf(part: string): string {
  const slash = part.lastIndexOf('/')
  return `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`
}

function internalTargets(relsXml: string): string[] {
  const targets: string[] = []
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = match[0]
    if (/TargetMode\s*=\s*["']External["']/i.test(tag)) continue
    const target = /Target\s*=\s*"([^"]*)"/.exec(tag) ?? /Target\s*=\s*'([^']*)'/.exec(tag)
    if (target) targets.push(target[1])
  }
  return targets
}

export function pruneUnreachableParts(bytes: Uint8Array): { bytes: Uint8Array; removed: string[] } {
  try {
    const files = unzipSync(bytes)
    if (!files[ROOT_RELS] || !files[CONTENT_TYPES]) return { bytes, removed: [] }

    const reachable = new Set<string>()
    const queue: string[] = [ROOT_RELS]
    while (queue.length > 0) {
      const relsName = queue.pop() as string
      const rels = files[relsName]
      if (!rels) continue
      for (const target of internalTargets(strFromU8(rels))) {
        const part = resolveTarget(relsName, target)
        if (!files[part] || reachable.has(part)) continue
        reachable.add(part)
        queue.push(relsNameOf(part))
      }
    }

    const removed: string[] = []
    const kept: Zippable = {}
    for (const [name, data] of Object.entries(files)) {
      if (name === CONTENT_TYPES || name === ROOT_RELS || name.endsWith('/')) {
        kept[name] = data
        continue
      }
      const isRels = /(^|\/)_rels\/[^/]*\.rels$/.test(name)
      const owner = isRels ? name.replace(/(^|\/)_rels\/([^/]*)\.rels$/, '$1$2') : name
      if (reachable.has(owner)) kept[name] = data
      else removed.push(name)
    }
    if (removed.length === 0) return { bytes, removed }

    const gone = new Set(removed.filter((name) => !name.endsWith('.rels')).map((name) => `/${name}`))
    const types = strFromU8(files[CONTENT_TYPES]).replace(/<Override\b[^>]*\/>/g, (tag) => {
      const partName = /PartName\s*=\s*"([^"]*)"/.exec(tag)
      return partName && gone.has(partName[1]) ? '' : tag
    })
    kept[CONTENT_TYPES] = strToU8(types)
    return { bytes: zipSync(kept), removed }
  } catch {
    return { bytes, removed: [] }
  }
}