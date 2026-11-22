#!/usr/bin/env node
/**
 * 把本机脱敏词表转成可入库的加盐哈希表，供红线测试在没有明文词表的环境（CI）里运行。
 *
 *   node scripts/hash-sensitive-words.mjs
 *
 * 输入 tests/corpus/sensitive-words.txt（明文，.gitignore 挡住，只在本机）；
 * 输出 tests/corpus/sensitive-words.sha256.json：
 *   { salt, lengths: [词长...], hashes: [sha256(salt + 词)...] }（hashes 排序，不保留词序）
 * 测试按出现过的每个词长滑窗取语料子串，算同样的加盐哈希去比对。
 *
 * 哈希表只挡「直接读出词表」：短词（两三个汉字）可被字典穷举还原，明文词表与语料原件
 * 仍只留在仓库之外。改词表后重跑本脚本并提交 JSON。
 */
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PLAIN = path.join(ROOT, 'tests', 'corpus', 'sensitive-words.txt')
const OUT = path.join(ROOT, 'tests', 'corpus', 'sensitive-words.sha256.json')

if (!existsSync(PLAIN)) {
  console.error(`[hash-sensitive-words] 明文词表不在位：${PLAIN}`)
  process.exit(1)
}

const words = [...new Set(
  readFileSync(PLAIN, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('#'))
)]
if (words.length === 0) {
  console.error('[hash-sensitive-words] 词表为空')
  process.exit(1)
}

// 已有哈希表时沿用其盐，词表不变则输出不变（便于审阅 diff）
let salt = randomBytes(16).toString('hex')
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8'))
    if (typeof prev.salt === 'string' && prev.salt.length > 0) salt = prev.salt
  } catch {
    // 旧文件损坏：换新盐重写
  }
}

const sha = (s) => createHash('sha256').update(salt + s, 'utf8').digest('hex')
const out = {
  salt,
  lengths: [...new Set(words.map((w) => [...w].length))].sort((a, b) => a - b),
  hashes: words.map(sha).sort()
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`[hash-sensitive-words] ${words.length} 条 → ${path.relative(ROOT, OUT)}`)
