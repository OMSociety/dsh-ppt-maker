/**
 * QA 指纹：把「质检那一刻看到的工程内容」压成一个 sha256。
 * ppt_check 落账时写入 manifest.qaReport.fingerprint；ppt_export / 面板导出
 * 重新计算并比对——不一致说明工程在质检后又有改动（stale），拒导出。
 *
 * 指纹材料：CHECKER_VERSION（规则变更即换指纹）+ deck.pptd 原文 +
 * pages/*.page 原文 + plan.yml 原文 + media/ 全量文件（路径 + 内容 sha256）。
 * brief.md 是给人读的散文，不影响构建产物，不入指纹。
 */
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { isSafeRelativePath, parseDeckText } from '../pptd/parse.js'
import { resolveProjectDir } from '../project/store.js'
import { SVG_COMPILER_VERSION } from '../svg/compiler.js'

/** review 规则层（review/index.ts）改动判定逻辑时递增——旧指纹立即全部过期。 */
export const CHECKER_VERSION = '2.1.0'

async function hashMedia(absDir: string, hash: ReturnType<typeof createHash>): Promise<void> {
  const mediaDir = path.join(absDir, 'media')
  let entries: string[] = []
  const walk = async (dir: string): Promise<void> => {
    let items
    try {
      items = await readdir(dir, { withFileTypes: true })
    } catch {
      return // media/ 不存在是合法状态
    }
    for (const item of items) {
      const full = path.join(dir, item.name)
      if (item.isDirectory()) await walk(full)
      else if (item.isFile()) entries.push(full)
    }
  }
  await walk(mediaDir)
  entries.sort()
  for (const full of entries) {
    const rel = path.relative(absDir, full).replace(/\\/g, '/')
    hash.update(`media:${rel}:`)
    hash.update(new Uint8Array(await readFile(full)))
    hash.update('\n')
  }
}

export async function computeProjectFingerprint(cwd: string, dir: string): Promise<string> {
  const abs = resolveProjectDir(cwd, dir)
  const hash = createHash('sha256')
  hash.update(`checker:${CHECKER_VERSION}\n`)
  // SVG 编译器版本入指纹：升级转换器后，源 SVG 没变但编译产物会变，
  // 旧质检落账必须过期重检。
  hash.update(`svg-compiler:${SVG_COMPILER_VERSION}\n`)

  const deckText = await readFile(path.join(abs, 'deck.pptd'), 'utf8')
  hash.update('deck.pptd:')
  hash.update(deckText)
  hash.update('\n')

  // 页清单与质检、构建同源：按 PPTD 解析 deck.pptd 的 pages 列表（任意安全相对路径都入指纹），
  // 保持声明顺序——页序变化同样意味着产物变化。
  const pageRefs = (parseDeckText(deckText).value?.pages ?? []).filter((rel) => isSafeRelativePath(rel))
  for (const rel of pageRefs) {
    try {
      const text = await readFile(path.join(abs, rel), 'utf8')
      hash.update(`page:${rel}:`)
      hash.update(text)
      hash.update('\n')
    } catch {
      hash.update(`page:${rel}:MISSING\n`)
    }
  }

  try {
    const planText = await readFile(path.join(abs, 'plan.yml'), 'utf8')
    hash.update('plan.yml:')
    hash.update(planText)
    hash.update('\n')
  } catch {
    /* plan.yml 缺席是合法状态（Quick 路径） */
  }

  await hashMedia(abs, hash)
  return hash.digest('hex')
}
