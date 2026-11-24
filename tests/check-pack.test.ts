import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'

const checker = path.resolve('scripts/check-pack.mjs')
const required = ['index.js', 'cordis.patch.yml', 'docs/pptd-spec.md', 'scripts/prepare-vendor-env.mjs',
  'skills/ppt-maker/vendor/requirements.txt', 'skills/ppt-maker/vendor/compile_svg_page.py']
const marker = 'skills/ppt-maker/vendor/.venv-ready.json'

it('checks required members against the npm package, including missing declarations and a leaked build marker', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'ppt-pack-'))
  try {
    for (const file of [...required, marker]) {
      await mkdir(path.dirname(path.join(cwd, file)), { recursive: true })
      await writeFile(path.join(cwd, file), '')
    }
    const check = async (files: string[], exports: Record<string, unknown>) => {
      await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ name: 'pack-fixture', version: '1.0.0',
        main: 'index.js', dsh: { bundle: { patch: './cordis.patch.yml' } }, files, exports }))
      return spawnSync(process.execPath, [checker], { cwd, encoding: 'utf8' })
    }
    const files = [...required, 'skills', `!${marker}`]
    const valid = await check(files, { '.': './index.js' })
    expect(valid.status, valid.stderr).toBe(0)

    const missing = await check([...files, 'absent.md'], { '.': './index.js', './extra': './absent.js' })
    expect(missing.status).toBe(1)
    expect(missing.stderr).toContain('absent.js')
    expect(missing.stderr).toContain('absent.md')

    const leaked = await check([...required, 'skills'], {})
    expect(leaked.status).toBe(1)
    expect(leaked.stderr).toContain(marker)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
