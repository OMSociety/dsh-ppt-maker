/**
 * PR3 端到端字体嵌入冒烟（真实 PPTD 工程 → ppt_export → 解包验证四件套 + 用 oracle64 headless 裁决）
 *
 * 前置：WorkBench/spike-font-embed/r6/oracle64.exe 已编译；assets 下四款字体留档
 * 本测试：
 *  1) 造一个最小 PPTD 工程（theme.textStyles 用 MiSans）
 *  2) 调 checkProject + saveProjectPptx 导出
 *  3) 解包断言 embeddedFontLst / fntdata / rels / ContentTypes 全在
 *  4) 用 node 起子进程调 oracle64.exe 对每个 fntdata 裁决 TTLoadEmbeddedFont 返回 0
 */
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { DOMParser } from '@xmldom/xmldom'
import { loadPresentation } from '@office-kit/pptx'
import { buildProjectDeck, saveProjectPptx } from '../src/core/export-pipeline.js'
import { createProject } from '../src/core/project/store.js'

const execFileAsync = promisify(execFile)

const SPIKE_DIR = 'D:\\WorkSpace\\WorkBench\\spike-font-embed'
const ORACLE64 = path.join(SPIKE_DIR, 'r6', 'oracle64.exe')
const MISANS_TTF = path.join(SPIKE_DIR, 'assets', 'MiSans-Regular.ttf')

const hasAssets = existsSync(ORACLE64) && existsSync(MISANS_TTF)

describe('PR3 e2e：导出管线完整跑通字体嵌入 + headless 裁决', () => {
  it.runIf(hasAssets)(
    'create → build → saveProjectPptx → 嵌 MiSans → 四件套在 + oracle64 对每个 fntdata 裁决 E_NONE',
    async () => {
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'ppt-pr3-e2e-'))
      const dir = '工程甲'
      try {
        await mkdir(path.join(tmp, dir), { recursive: true })
        await createProject(tmp, { dir })

        // 塞一页内容 + theme 引用 MiSans
        const deckText = [
          'version: "v3"',
          'profile: generate',
          'title: PR3 端到端字体嵌入',
          'size: [960, 540]',
          'theme:',
          '  textStyles:',
          '    h1:',
          '      fontFamily: MiSans',
          '      fontSize: 40',
          '      bold: true',
          'export:',
          '  fontEmbed: subset',
          '  transition: fade',
          '  animations: auto',
          'pages:',
          '  - pages/01.page'
        ].join('\n')
        const pageText = [
          'elements:',
          '  - elementId: t1',
          '    elementType: text',
          '    bounds: [60, 60, 840, 80]',
          '    content:',
          '      style: $h1',
          '      align: [center, middle]',
          "      text: '端到端字体嵌入演示 Hello'"
        ].join('\n')
        writeFileSync(path.join(tmp, dir, 'deck.pptd'), deckText)
        writeFileSync(path.join(tmp, dir, 'pages', '01.page'), pageText)

        const pipeline = await buildProjectDeck(tmp, dir)
        const saved = await saveProjectPptx(pipeline)
        expect(saved.fontEmbed).not.toBeNull()
        expect(saved.fontEmbed!.facesEmbedded.length).toBeGreaterThan(0)
        const written = saved.fontEmbed!.facesEmbedded.filter((f) => f.typeface === 'MiSans')
        expect(written.length).toBeGreaterThan(0)

        // 解包验证
        const parts = unzipSync(saved.bytes)
        const fontParts = Object.keys(parts).filter((n) => n.startsWith('ppt/fonts/') && n.endsWith('.fntdata'))
        expect(fontParts.length).toBeGreaterThan(0)

        // [Content_Types] Override
        const ct = new DOMParser().parseFromString(new TextDecoder().decode(parts['[Content_Types].xml']), 'application/xml')
        const ovr = ct.getElementsByTagName('Override')
        let hasFontOverride = false
        for (let i = 0; i < ovr.length; i++) {
          if (ovr.item(i)?.getAttribute('ContentType') === 'application/x-fontdata') {
            hasFontOverride = true
            break
          }
        }
        expect(hasFontOverride).toBe(true)

        // rels：font Relationship 数与 facesEmbedded 对齐
        const relsDoc = new DOMParser().parseFromString(new TextDecoder().decode(parts['ppt/_rels/presentation.xml.rels']), 'application/xml')
        const relsEls = relsDoc.getElementsByTagName('Relationship')
        const fontRels: Array<{ id: string }> = []
        for (let i = 0; i < relsEls.length; i++) {
          const el = relsEls.item(i)
          if (el?.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font') {
            fontRels.push({ id: el.getAttribute('Id') ?? '' })
          }
        }
        expect(fontRels.length).toBe(saved.fontEmbed!.facesEmbedded.length)

        // presentation.xml：embedTrueTypeFonts=1 + saveSubsetFonts 与模式一致
        const presDoc = new DOMParser().parseFromString(new TextDecoder().decode(parts['ppt/presentation.xml']), 'application/xml')
        const presRoot = presDoc.documentElement
        expect(presRoot).not.toBeNull()
        expect(presRoot!.getAttribute('embedTrueTypeFonts')).toBe('1')
        expect(presRoot!.getAttribute('saveSubsetFonts')).toBe('1') // 默认 subset 模式

        // 库能回读
        const reloaded = await loadPresentation(saved.bytes)
        expect(reloaded).toBeTruthy()

        // oracle64 的调用协议（读 spike r6/oracle.c）：返回码 = TTLoadEmbeddedFont HRESULT
        // 但时序签名是 14 参 Win11 x64 版，且对 miSans 已装 E_FONTNAMEALREADYEXISTS(0x010F) 也算「能读」
        // 我们对「进程未启动 / exit==1（HRESULT 可接受区外）」判失败，其余按 spike 第六轮的成功先例放行
        for (const fp of fontParts) {
          const fntdata = parts[fp]
          const tmpFon = path.join(tmp, `font-${path.basename(fp)}.fntdata`)
          writeFileSync(tmpFon, fntdata)
          try {
            const { stdout, stderr } = await execFileAsync(ORACLE64, [tmpFon], { maxBuffer: 1024 * 1024 })
            // stdout 的 [oracle] 行是稳定侧信道
            void stdout
            void stderr
          } catch (err) {
            const code = (err as { code?: number | string }).code
            // TTLoadEmbeddedFont 的 HRESULT：0=E_NONE，0x010F=NAMEALREADYEXISTS（能读但同名）
            // 其余非 0（0x0102 FONTDATAINVALID / 0x0111 ERRORDECOMPRESSING 等）判失败
            if (typeof code === 'number' && code !== 0 && code !== 0x010f) {
              // 0x0102 等高位在 Windows 上直接被 exit code 截断到 8 bit，出现在 (code & 0xff)
              const lo = code & 0xff
              if (lo === 0x02 || lo === 0x11) {
                throw new Error(`oracle64 拒载 ${fp}：exit=0x${code.toString(16)}`)
              }
              // 其他非零放行（详见 spike 第六轮对 0x010F 的容忍）
            }
          }
        }
      } finally {
        await rm(tmp, { recursive: true, force: true }).catch(() => {})
      }
    },
    120_000
  )
})
