/**
 * resolver.ts — typeface → 字体文件解析（PR3 计划 §3.2）
 *
 * 优先级：工程 assets/fonts/ 自带 > 用户显式指定 > 系统已装 > 失败给替代建议
 *
 * 系统字体枚举：
 *  - Windows：注册表 HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts
 *    （HKLM 相对文件名落 %SystemRoot%\Fonts，HKCU 落 %LOCALAPPDATA%\Microsoft\Windows\Fonts）
 *  - POSIX（macOS/Linux）：扫常用字体目录，用 fontkit name 表建「族名 → 文件」索引
 *
 * 族名匹配：fontkit 读 name 表（ID 1/16 优先 identical 命中，casefold 后全等）
 * slot 判定：OS/2.fsSelection（bit0 italic / bit5 bold / bit6 regular）+ head.macStyle 兜底
 * TTC 支持：fontkit 对 trueTypeCollection 返回 { fonts: [] }，逐 face 枚举
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { licenseOf, readFsTypeAll, type FontLicense } from './fsType.js'

const execFileAsync = promisify(execFile)

/* ------------------------------------------------------------------ *
 * 类型
 * ------------------------------------------------------------------ */

export type FontSlot = 'regular' | 'bold' | 'italic' | 'boldItalic'

export interface ResolvedFontFace {
  /** typeface 字符串（PPTD 声明形态） */
  typeface: string
  /** 该 face 属于哪个槽位 */
  slot: FontSlot
  /** 磁盘绝对路径（TTC 时为容器路径） */
  path: string
  /** TTC 内的 face 序号；非 TTC 恒为 0 */
  faceIndex: number
  /** 字体原始字节（TTC 时为整个容器字节，调用方再用 faceIndex 提取） */
  bytes: Uint8Array
  /** fontkit 提供的族名（en） */
  familyName: string
  /** fontkit 提供的族名（zh-Hans 可读名，如有） */
  familyNameZh: string | null
  /** PostScript 名（用于诊断日志） */
  postscriptName: string | null
  /** 轮廓类型：'glyf'（TTF）/ 'CFF'（OTF/OTTO）/ 'unknown' */
  outline: 'glyf' | 'CFF' | 'unknown'
  /** fsType 处置（每 face 独立判定，TTC 逐 face） */
  license: FontLicense
}

/** 解析失败时的诊断 */
export interface ResolveFailure {
  typeface: string
  reason: string
  /** 与 reference/local-fonts.md 一致的推荐替代列表 */
  alternatives: string[]
}

/* ------------------------------------------------------------------ *
 * 族名归一化（与 check_fonts.py present() 同口径）
 * ------------------------------------------------------------------ */

/** fontkit 2.x 的 name 字段返回形态：string | { [lang]: string }；统一拍平 */
function fontkitNameStr(v: unknown): string {
  if (typeof v === 'string') return v
  if (v !== null && typeof v === 'object') {
    const rec = v as Record<string, unknown>
    if (typeof rec.en === 'string') return rec.en
    for (const vv of Object.values(rec)) if (typeof vv === 'string') return vv
  }
  return ''
}

/** 族名归一化（与 check_fonts.py present() 同口径） */
function normalizeName(s: unknown): string {
  if (typeof s !== 'string') return ''
  return s.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
}

/** 命中规则：全等，或注册表族名以请求串开头且下一字符是空格/连字符（容忍字重/变体） */
function matches(registryName: unknown, requested: unknown): boolean {
  if (typeof registryName !== 'string' || typeof requested !== 'string') return false
  const r = normalizeName(registryName)
  const q = normalizeName(requested)
  if (!r || !q) return false
  if (r === q) return true
  if (r.startsWith(q) && r.length > q.length) {
    const next = r[q.length]
    if (next === ' ' || next === '-') return true
  }
  return false
}

/* ------------------------------------------------------------------ *
 * fontkit 加载（懒加载 + 容错）
 * ------------------------------------------------------------------ */

type FontkitFont = {
  familyName?: string
  subfamilyName?: string
  postscriptName?: string
  fullName?: string
  directory?: { tables?: Record<string, unknown> }
  'OS/2'?: { fsSelection?: number; sFamilyClass?: number }
  head?: { macStyle?: number }
  getName?: (id: number, lang?: string) => string | null
}

type FontkitModule = {
  openSync: (path: string, postscriptName?: string) => FontkitFont | { fonts?: FontkitFont[] }
}

let fontkitCache: FontkitModule | null = null

async function loadFontkit(): Promise<FontkitModule> {
  if (fontkitCache) return fontkitCache
  const { createRequire } = await import('node:module')
  const req = createRequire(import.meta.url)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fontkitCache = req('fontkit') as FontkitModule
  return fontkitCache as FontkitModule
}

/* ------------------------------------------------------------------ *
 * 系统字体枚举
 * ------------------------------------------------------------------ */

const FONT_EXTS = ['.ttf', '.ttc', '.otf', '.otc']

async function readWinRegistryFontEntries(): Promise<Array<{ name: string; file: string }>> {
  // 用 reg.exe query 直接读注册表
  const KEY = 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts'
  const KEY_USER = 'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts'
  const out: Array<{ name: string; file: string }> = []
  for (const key of [KEY, KEY_USER]) {
    try {
      const { stdout } = await execFileAsync('reg.exe', ['query', key], { maxBuffer: 8 * 1024 * 1024 })
      // 每行：    <值名>    REG_SZ    <文件>
      for (const ln of stdout.split(/\r?\n/)) {
        const m = /^\s+(\S(?:.*?\S)?)\s+REG_SZ\s+(\S+)\s*$/.exec(ln)
        if (!m) continue
        const [, name, file] = m
        // 相对文件名（HKLM → SystemRoot\Fonts；HKCU → LocalAppData\Microsoft\Windows\Fonts；绝对路径直接用）
        let abs: string
        if (/^[a-zA-Z]:[\\/]/.test(file)) {
          abs = file
        } else if (key.startsWith('HKCU')) {
          abs = path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'Microsoft', 'Windows', 'Fonts', file)
        } else {
          abs = path.join(process.env.SystemRoot ?? process.env.WINDIR ?? 'C:\\Windows', 'Fonts', file)
        }
        out.push({ name, file: abs })
      }
    } catch {
      // reg query 失败（如无权限/键不存在）→ 静默跳过该键，外籍目录扫描兜底
    }
  }
  return out
}

const POSIX_FONT_DIRS = [
  '/usr/share/fonts',
  '/usr/local/share/fonts',
  path.join(os.homedir(), '.fonts'),
  path.join(os.homedir(), '.local', 'share', 'fonts'),
  '/Library/Fonts',
  '/System/Library/Fonts',
  path.join(os.homedir(), 'Library', 'Fonts')
]

async function scanFontDirs(root: string): Promise<string[]> {
  const out: string[] = []
  if (!existsSync(root)) return out
  try {
    const entries = await readdir(root, { withFileTypes: true })
    for (const e of entries) {
      const p = path.join(root, e.name)
      if (e.isDirectory()) {
        out.push(...(await scanFontDirs(p)))
      } else if (e.isFile() && FONT_EXTS.some((ext) => e.name.toLowerCase().endsWith(ext))) {
        out.push(p)
      }
    }
  } catch {
    // 无权限/读不出 → 忽略
  }
  return out
}

/* ------------------------------------------------------------------ *
 * fontkit 索引构建
 * ------------------------------------------------------------------ */

interface IndexedFont {
  path: string
  faceIndex: number
  familyName: string
  subfamilyName: string
  postscriptName: string
  fullName: string
  slot: FontSlot
  outline: 'glyf' | 'CFF' | 'unknown'
  fsSelection: number
  macStyle: number
  fsType: number | null
  /** TTC 容器字节缓存（非 TTC 时为 null） */
  containerBytes?: Uint8Array
}

const indexCacheInt: { byName: Map<string, IndexedFont[]>; ready: boolean } = { byName: new Map(), ready: false }

function slotOf(fsSelection: number, macStyle: number, subfamily: string): FontSlot {
  const italic = (fsSelection & 0x01) !== 0 || (macStyle & 0x02) !== 0 || /italic|oblique/i.test(subfamily)
  const bold = (fsSelection & 0x20) !== 0 || (macStyle & 0x01) !== 0 || /bold|black|heavy|semibold|demibold/i.test(subfamily)
  if (italic && bold) return 'boldItalic'
  if (italic) return 'italic'
  if (bold) return 'bold'
  return 'regular'
}

function outlineOf(font: FontkitFont): 'glyf' | 'CFF' | 'unknown' {
  const tables = font.directory?.tables ?? {}
  if ('CFF ' in tables || 'CFF2' in tables) return 'CFF'
  if ('glyf' in tables) return 'glyf'
  return 'unknown'
}

async function indexOne(pathAbs: string, into: Map<string, IndexedFont[]>): Promise<void> {
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await readFile(pathAbs))
  } catch {
    return
  }
  const fsTypes = readFsTypeAll(bytes)

  const kit = await loadFontkit()
  let opened: FontkitFont | { fonts?: FontkitFont[] }
  try {
    opened = kit.openSync(pathAbs) as FontkitFont | { fonts?: FontkitFont[] }
  } catch {
    return
  }

  // TTC：fonts 数组；单 face：直接是 font
  const faces: Array<{ font: FontkitFont; faceIndex: number }> = []
  if (opened && typeof opened === 'object' && 'fonts' in opened && Array.isArray((opened as { fonts?: FontkitFont[] }).fonts)) {
    const fonts = (opened as { fonts: FontkitFont[] }).fonts
    fonts.forEach((f, i) => faces.push({ font: f, faceIndex: i }))
  } else {
    faces.push({ font: opened as FontkitFont, faceIndex: 0 })
  }

  for (const { font, faceIndex } of faces) {
    const fsSelection = font['OS/2']?.fsSelection ?? 0x40
    const macStyle = font.head?.macStyle ?? 0
    const subfamilyRaw = font.subfamilyName
    const subfamily = fontkitNameStr(subfamilyRaw) || 'Regular'
    const familyRaw = font.familyName
    const family = fontkitNameStr(familyRaw) || path.basename(pathAbs, path.extname(pathAbs))
    const fullNameStr = fontkitNameStr(font.fullName)
    const postscriptNameStr = fontkitNameStr(font.postscriptName)
    const fsSel = typeof fsSelection === 'number' ? fsSelection : 0x40
    const entry: IndexedFont = {
      path: pathAbs,
      faceIndex,
      familyName: family,
      subfamilyName: subfamily,
      postscriptName: postscriptNameStr,
      fullName: fullNameStr,
      slot: slotOf(fsSel, macStyle, subfamily),
      outline: outlineOf(font),
      fsSelection: fsSel,
      macStyle,
      fsType: fsTypes[faceIndex] ?? null,
      ...(faces.length > 1 ? { containerBytes: bytes } : {})
    }
    const keys = new Set<string>()
    if (family) keys.add(normalizeName(family))
    if (fullNameStr) keys.add(normalizeName(fullNameStr))
    if (postscriptNameStr) keys.add(normalizeName(postscriptNameStr))
    for (const k of keys) {
      if (!k) continue
      const arr = into.get(k) ?? []
      arr.push(entry)
      into.set(k, arr)
    }
  }
}

/** 建/取全局索引（懒加载，单进程一次） */
async function ensureIndex(): Promise<Map<string, IndexedFont[]>> {
  if (indexCacheInt.ready) return indexCacheInt.byName
  const byName = new Map<string, IndexedFont[]>()

  // Windows：注册表条目（已含 path/族名明文）
  if (process.platform === 'win32') {
    const reg = await readWinRegistryFontEntries()
    const seen = new Set<string>()
    for (const entry of reg) {
      // 防非字符串（防御）
      if (!entry || typeof entry.file !== 'string' || typeof entry.name !== 'string') continue
      if (!seen.has(entry.file)) {
        seen.add(entry.file)
        await indexOne(entry.file, byName)
      }
      // 注册表族名也直接进索引（fontkit 可能取不到某些 windows 注册字体）
      const key = normalizeName(entry.name)
      if (key) {
        const arr = byName.get(key) ?? []
        // fontkit 已开过同一文件的话那条目已存在；此处不必重复 push
        if (!arr.some((f) => f.path === entry.file)) {
          // 占位条目——缺 fontkit 元数据（slot/outline 假定为 regular/unknown 由调用方再 resolve）
          const placeholder: IndexedFont = {
            path: entry.file,
            faceIndex: 0,
            familyName: entry.name,
            subfamilyName: '',
            postscriptName: '',
            fullName: entry.name,
            slot: 'regular',
            outline: 'unknown',
            fsSelection: 0x40,
            macStyle: 0,
            fsType: null
          }
          arr.push(placeholder)
          byName.set(key, arr)
        }
      }
    }
  } else {
    // POSIX：扫常用目录
    for (const dir of POSIX_FONT_DIRS) {
      for (const f of await scanFontDirs(dir)) {
        await indexOne(f, byName)
      }
    }
  }
  indexCacheInt.byName = byName
  indexCacheInt.ready = true
  return byName
}

/** 测试钩子：清掉模块级缓存（避免跨用例串味） */
export function _resetFontIndexForTests(): void {
  indexCacheInt.byName = new Map()
  indexCacheInt.ready = false
}

/* ------------------------------------------------------------------ *
 * 公开 API
 * ------------------------------------------------------------------ */

/** 项目 assets/fonts/ 下按字体内部族名查找（文件名 stem 仅作预筛提示，不作判据——发行名多为连字符形） */
async function resolveFromAssets(typeface: string, assetsDir: string): Promise<IndexedFont | null> {
  if (!existsSync(assetsDir)) return null
  let files: string[]
  try {
    files = await readdir(assetsDir)
  } catch {
    return null
  }
  for (const f of files) {
    if (!FONT_EXTS.some((ext) => f.toLowerCase().endsWith(ext))) continue
    const full = path.join(assetsDir, f)
    const tmp = new Map<string, IndexedFont[]>()
    await indexOne(full, tmp)
    for (const [fam, arr] of tmp) {
      // matches() 容忍字重/变体后缀（空格或连字符续接）
      if (arr.length > 0 && matches(fam, typeface)) return arr[0]
    }
  }
  return null
}

/**
 * 解析一个 typeface 到具体 face（含字节）。
 * 解析失败返回 null + 由调用方用 findAlternatives 给建议。
 */
export async function resolveTypeface(
  typeface: string,
  slot: FontSlot,
  options: { projectDir?: string } = {}
): Promise<ResolvedFontFace | null> {
  // 1) 工程 assets/fonts/
  if (options.projectDir) {
    const assetsHit = await resolveFromAssets(typeface, path.join(options.projectDir, 'assets', 'fonts'))
    if (assetsHit && assetsHit.slot === slot) {
      const bytes = assetsHit.containerBytes ?? new Uint8Array(await readFile(assetsHit.path))
      return toResolved(assetsHit, typeface, bytes)
    }
  }

  // 2) 系统字体索引
  const index = await ensureIndex()
  const key = normalizeName(typeface)
  const candidates = index.get(key) ?? []
  // 全等优先 → 前缀匹配
  const pool = candidates.length > 0 ? candidates : findByPrefix(index, typeface)
  if (pool.length === 0) return null

  // 找精确 slot；找不到回落 regular（PowerPoint 会合成仿粗/仿斜）
  const slotHit = pool.find((f) => f.slot === slot) ?? pool.find((f) => f.slot === 'regular') ?? pool[0]
  const bytes = slotHit.containerBytes ?? new Uint8Array(await readFile(slotHit.path))
  return toResolved(slotHit, typeface, bytes)
}

function findByPrefix(index: Map<string, IndexedFont[]>, typeface: string): IndexedFont[] {
  const out: IndexedFont[] = []
  for (const [key, arr] of index.entries()) {
    if (matches(key, typeface)) out.push(...arr)
  }
  return out
}

async function toResolved(font: IndexedFont, requestedTypeface: string, bytes: Uint8Array): Promise<ResolvedFontFace> {
  return {
    typeface: requestedTypeface,
    slot: font.slot,
    path: font.path,
    faceIndex: font.faceIndex,
    bytes,
    familyName: font.familyName,
    familyNameZh: null, // fontkit 中文记录读法与数据形态待真实安装环境验证；先 null
    postscriptName: font.postscriptName,
    outline: font.outline,
    license: licenseOf(font.fsType)
  }
}

/** 缺字体的替代表（与 check_fonts.py ALTERNATIVES 对齐） */
export const ALTERNATIVES: Record<string, string[]> = {
  SortsMillGoudy: ['Georgia', 'Cambria'],
  MiSans: ['更纱黑体 SC', '思源黑体 CN'],
  'Noto Sans SC': ['更纱黑体 SC', '思源黑体 CN'],
  QuattrocentoSans: ['Century Gothic'],
  HedvigLettersSans: ['Arial'],
  Liter: ['Century Gothic', 'Arial'],
  Oranienbaum: ['Georgia', 'Cambria'],
  Unna: ['Cambria'],
  Coda: ['Arial'],
  Jersey15: ['Impact', 'Franklin Gothic'],
  Jersey20Charted: ['Impact', 'Franklin Gothic'],
  '得意黑': ['思源黑体 CN', '更纱黑体 SC'],
  '精品点阵体': ['SimSun', 'SimHei'],
  '微软雅黑': ['Microsoft YaHei'],
  '宋体': ['SimSun'],
  '黑体': ['SimHei'],
  '仿宋': ['FangSong'],
  '楷体': ['KaiTi']
}

export function findAlternatives(typeface: string): string[] {
  return ALTERNATIVES[typeface] ?? []
}
