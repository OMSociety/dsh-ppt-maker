// 从 @office-kit/pptx 内置的预设几何定义（ECMA-376 presetShapeDefinitions）
// 抽取每个预设形状的调整值名称与默认值（avLst 的 gd，按参数序），生成
// src/core/engine/preset-adjust-guides.ts。升级 @office-kit/pptx 后重跑：
//   node scripts/gen-preset-adjust-guides.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const dist = path.resolve('node_modules/@office-kit/pptx/dist')
const table = {}
for (const file of readdirSync(dist).filter((f) => f.endsWith('.js'))) {
  const src = readFileSync(path.join(dist, file), 'utf8')
  const re = /\n\t(\w+): \{\n\t\tav: \[([\s\S]*?)\n\t\t\],?\n/g
  let m
  while ((m = re.exec(src))) {
    const guides = [...m[2].matchAll(/\["(\w+)",\s*"val (-?\d+)"\]/g)].map((x) => [x[1], Number(x[2])])
    if (guides.length > 0) table[m[1]] = guides
  }
}
const count = Object.keys(table).length
if (count < 100) {
  console.error(`[gen-preset-adjust-guides] 只找到 ${count} 个预设，@office-kit/pptx 的打包结构可能已变化`)
  process.exit(1)
}
const body = Object.keys(table)
  .sort()
  .map((k) => `  ${k}: [${table[k].map(([n, v]) => `['${n}', ${v}]`).join(', ')}]`)
  .join(',\n')
const out = `// 由 scripts/gen-preset-adjust-guides.mjs 从 @office-kit/pptx 的预设几何定义生成，勿手改。
// 预设形状 → [调整值名称, 默认值]（OOXML avLst 的 gd，按参数序）；PPTD adjustments 数组按此顺序对应。
export const PRESET_ADJUST_GUIDES: Readonly<Record<string, ReadonlyArray<readonly [string, number]>>> = {
${body}
}
`
writeFileSync(path.resolve('src/core/engine/preset-adjust-guides.ts'), out)
console.log(`[gen-preset-adjust-guides] ${count} 个预设已写入 src/core/engine/preset-adjust-guides.ts`)
