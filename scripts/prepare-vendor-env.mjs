#!/usr/bin/env node
/**
 * Prepare the vendored ppt-master Python environment.
 *
 * Creates skills/ppt-maker/vendor/.venv and installs the pinned requirements
 * (vendor/requirements.txt) into it. Idempotent: skips the install when the
 * marker file matches the current requirements hash.
 *
 * Usage: node scripts/prepare-vendor-env.mjs
 *
 * Environment overrides:
 *   PIP_INDEX  pip index URL (default: Tsinghua mirror https://pypi.tuna.tsinghua.edu.cn/simple)
 *   PYTHON     interpreter used to create the venv (default: python on Windows, python3 elsewhere)
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR_DIR = path.join(PACKAGE_ROOT, 'skills', 'ppt-maker', 'vendor')
const VENV_DIR = path.join(VENDOR_DIR, '.venv')
const REQUIREMENTS = path.join(VENDOR_DIR, 'requirements.txt')
const MARKER = path.join(VENDOR_DIR, '.venv-ready.json')
const PIP_INDEX = process.env.PIP_INDEX || 'https://pypi.tuna.tsinghua.edu.cn/simple'
const BASE_PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')

const venvPython = process.platform === 'win32'
  ? path.join(VENV_DIR, 'Scripts', 'python.exe')
  : path.join(VENV_DIR, 'bin', 'python')

function requirementsHash() {
  return createHash('sha256').update(readFileSync(REQUIREMENTS)).digest('hex')
}

function run(cmd, args, label) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd: VENDOR_DIR })
  if (res.status !== 0) {
    console.error(`[prepare-vendor-env] ${label} failed (exit ${res.status})`)
    process.exit(res.status ?? 1)
  }
}

const hash = requirementsHash()
if (existsSync(venvPython) && existsSync(MARKER)) {
  try {
    const marker = JSON.parse(readFileSync(MARKER, 'utf8'))
    if (marker.requirementsSha256 === hash) {
      console.log('[prepare-vendor-env] venv already up to date')
      process.exit(0)
    }
  } catch {
    // fall through and rebuild
  }
}

if (!existsSync(venvPython)) {
  console.log('[prepare-vendor-env] creating venv at', VENDOR_DIR)
  run(BASE_PYTHON, ['-m', 'venv', VENV_DIR], ` -m venv`)
}

console.log('[prepare-vendor-env] installing pinned requirements')
run(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-i', PIP_INDEX, '-r', REQUIREMENTS], 'pip install')

console.log('[prepare-vendor-env] verifying converter import')
run(venvPython, ['-c', "import sys; sys.path.insert(0, r'" + path.join(VENDOR_DIR, 'ppt-master') + "'); from svg_to_pptx import create_pptx_with_native_svg; print('import ok')"], 'import check')

writeFileSync(MARKER, JSON.stringify({ requirementsSha256: hash, createdAt: new Date().toISOString() }, null, 2) + '\n')
console.log('[prepare-vendor-env] ready')
