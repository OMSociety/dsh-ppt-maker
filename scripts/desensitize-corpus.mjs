#!/usr/bin/env node
/**
 * 语料脱敏：把 pptx 里能倒推到具体会议/地点的字面量换成占位。
 *
 * 只改文本节点（`<a:t>`…`</a:t>`）与属性里的可见字符串，不动版式、图片与页数，
 * 所以 tests/corpus-roundtrip.test.ts 的页数台账不受影响。
 *
 * 用法：
 *   node scripts/desensitize-corpus.mjs                 # 就地改写 tests/corpus/*.pptx
 *   node scripts/desensitize-corpus.mjs --check         # 只报告命中，不写盘；有命中则 exit 1
 *   node scripts/desensitize-corpus.mjs a.pptx b.pptx   # 只处理指定文件
 *
 * 新增语料时先把来源专名补进 RULES 再跑，跑完用 --check 复查应为 0 命中。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync, zipSync } from 'fflate'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..')
const DEFAULT_DIR = join(REPO, 'tests', 'corpus')

/** 顺序敏感：长串在前，避免「2026/07/29」被「2026」先切碎。 */
const RULES = [
  // 地点：能指认到具体城市的都换成泛指
  ['三坊七巷', '某历史街区'],
  ['烟台山', '某山地街区'],
  ['闽江', '某江'],
  ['闽越', '示例'],
  ['闽海', '示例'],
  ['闽都', '示例城市'],
  // 时间与届次：年份换成 20XX，具体日期换成占位
  ['2026/07/29', '20XX/XX/XX'],
  ['2026', '20XX'],
  ['第四届', '第某届'],
  // 季节用来给日期兜底
  ['七月的盛夏', '盛夏']
]

const TEXT_NODE = /<a:t>([^<]*)<\/a:t>/g

function scrubXml(xml) {
  let hits = 0
  const out = xml.replace(TEXT_NODE, (whole, text) => {
    let next = text
    for (const [from, to] of RULES) {
      if (next.includes(from)) {
        hits += next.split(from).length - 1
        next = next.split(from).join(to)
      }
    }
    return next === text ? whole : `<a:t>${next}</a:t>`
  })
  return { out, hits }
}

function scrubFile(file, { check }) {
  const buf = readFileSync(file)
  const entries = unzipSync(new Uint8Array(buf))
  let totalHits = 0
  const touched = []
  const rewritten = {}

  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.endsWith('.xml')) {
      rewritten[name] = bytes
      continue
    }
    const xml = new TextDecoder('utf-8').decode(bytes)
    const { out, hits } = scrubXml(xml)
    if (hits > 0) {
      totalHits += hits
      touched.push(`${name} (${hits})`)
      rewritten[name] = new TextEncoder().encode(out)
    } else {
      rewritten[name] = bytes
    }
  }

  if (totalHits > 0 && !check) {
    writeFileSync(file, zipSync(rewritten))
  }
  return { totalHits, touched }
}

function main() {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const explicit = args.filter((a) => !a.startsWith('--'))

  const files = explicit.length
    ? explicit.map((p) => resolve(p))
    : (existsSync(DEFAULT_DIR) ? readdirSync(DEFAULT_DIR) : [])
        .filter((n) => n.endsWith('.pptx'))
        .map((n) => join(DEFAULT_DIR, n))

  if (files.length === 0) {
    console.error(`[desensitize] 没有找到 pptx：${explicit.length ? explicit.join(', ') : DEFAULT_DIR}`)
    process.exit(2)
  }

  let bad = 0
  for (const file of files) {
    const { totalHits, touched } = scrubFile(file, { check })
    if (totalHits === 0) {
      console.log(`  ok   ${basename(file)}`)
      continue
    }
    bad += 1
    console.log(`  ${check ? 'FAIL' : 'fix'} ${basename(file)} 命中 ${totalHits} 处：${touched.join('，')}`)
  }

  if (check && bad > 0) {
    console.error(`[desensitize] ${bad} 份语料仍含可倒推的字面量，跑一次不带 --check 的版本改写`)
    process.exit(1)
  }
  console.log(check ? '[desensitize] 复查通过' : `[desensitize] 处理完毕（${files.length} 份）`)
}

main()
