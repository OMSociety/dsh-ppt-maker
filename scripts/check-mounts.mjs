/**
 * check:mounts — 静态核对 dsh-ppt-maker 的挂载面声明与产物一致性。
 *
 * 三条口径：
 *  1. `cordis.patch.yml` 里声明的 bundle 名必须等于 package.json 的 `name`
 *     （否则 `dsh plugin add` 之后宿主用名字找不到入口）。
 *  2. package.json 的 `dsh` 段同时有 `bundle.patch` 与 `client.platform`，
 *     两个面都要挂上。
 *  3. `lib/index.js` 与 `lib/client.js` 都得存在且非空——前者是宿主插件
 *     的入口，后者是客户端 bundle。缺一个就走不到 apply / 面板是空的。
 *
 * 这是「不可在 CI 偷懒」的那一档：错一次用户装上是空
 * 面板 + 无报错。
 */
import { readFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []

function fail(message) {
  errors.push(message)
  console.error(`[check-mounts] ${message}`)
}

function check(label, fn) {
  try {
    fn()
    console.log(`[check-mounts] ok   ${label}`)
  } catch (err) {
    fail(`${label}: ${(err).message}`)
  }
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const patchYml = readFileSync(path.join(root, 'cordis.patch.yml'), 'utf8')
const nameMatch = /^\s*name:\s*([A-Za-z0-9@/_-]+)/m.exec(patchYml)

check('cordis.patch.yml 声明的 bundle name 与 package.json name 一致', () => {
  if (!nameMatch) throw new Error('cordis.patch.yml 未写出 name 字段')
  if (nameMatch[1] !== pkg.name) throw new Error(`cordis.patch.yml name=${nameMatch[1]} 与 package.json name=${pkg.name} 不一致`)
})

check('package.json dsh 段含 bundle.patch 与 client.platform', () => {
  if (!pkg.dsh?.bundle?.patch) throw new Error('缺 dsh.bundle.patch')
  if (pkg.dsh?.client?.platform !== 'web') throw new Error('缺 dsh.client.platform="web"')
})

for (const rel of ['lib/index.js', 'lib/client.js']) {
  check(`${rel} 存在且非空`, () => {
    const abs = path.join(root, rel)
    if (!existsSync(abs)) throw new Error(`${rel} 不存在（先 npm run build）`)
    if (statSync(abs).size === 0) throw new Error(`${rel} 是空文件（构建失败）`)
  })
}

if (errors.length > 0) {
  console.error(`[check-mounts] ${errors.length} 条不一致`)
  process.exit(1)
}
console.log('[check-mounts] 全绿')
