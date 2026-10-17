/**
 * 端到端字体嵌入冒烟（真实 PPTD 工程 → 导出 → 解包核对四件套 → 库回读）
 *
 * 测试字体走系统已装 TTF（环境变量 PPT_TEST_FONT 可覆盖）；找不到可用字体时整条跳过，
 * 并在文件顶层打印一行原因——不用「用例体内提前 return」的假通过写法。
 *
 * 本测试：
 *  1) 造一个最小 PPTD 工程（theme.textStyles 用该字体的 name 表族名）
 *  2) 调 buildProjectDeck + saveProjectPptx 导出
 *  3) 解包断言 fntdata / Content_Types Override / rels / presentation.xml 标记全在
 *  4) 产物能被 @office-kit/pptx 回读
 *
 * 字体字节本身能否被 PowerPoint 的 t2embed 收下，属 spike 期的 headless 裁决范围，
 * 结论记在 docs/DECISIONS.md；本测试只守结构面。
 */
import { mkdtempSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { DOMParser } from '@xmldom/xmldom'
import { loadPresentation } from '@office-kit/pptx'
import { buildProjectDeck, saveProjectPptx } from '../src/core/export-pipeline.js'
import { createProject } from '../src/core/project/store.js'
import { readFontMeta } from '../src/core/fonts/eot.js'

/** 候选测试字体（TTC 不含：这里要按 name 表族名声明并子集化，取单 face TTF） */
const FONT_CANDIDATES = [
  process.env.PPT_TEST_FONT,
  'C:\\Windows\\Fonts\\simhei.ttf',
  'C:\\Windows\\Fonts\\Deng.ttf',
  'C:\\Windows\\Fonts\\arial.ttf'
].filter((p): p is string => typeof p === 'string' && p.length > 0)

// 存在且非空：0 字节的占位文件能过 existsSync，但会在 fontkit 解析处炸掉。
const TEST_FONT = FONT_CANDIDATES.find((p) => existsSync(p) && statSync(p).size > 0) ?? null

/** 族名取字体 name 表（platform 3 / lang 0x409），与导出链路解析字体同一口径 */
const TEST_FAMILY = TEST_FONT === null ? null : familyOf(TEST_FONT)

function familyOf(file: string): string | null {
  try {
    return readFontMeta(new Uint8Array(readFileSync(file))).familyName
  } catch {
    return null
  }
}

const canRun = TEST_FONT !== null && TEST_FAMILY !== null
if (!canRun) {
  console.warn(
    `[fonts-e2e] 跳过：未找到可用测试字体（候选 ${FONT_CANDIDATES.join(' / ')}，可用 PPT_TEST_FONT 指定一个 TTF）`
  )
}

describe('字体嵌入 e2e：导出管线完整跑通', () => {
  it.skipIf(!canRun)(
    `create → build → saveProjectPptx → 嵌 ${TEST_FAMILY ?? '(无)'} → 四件套齐 + 库回读`,
    async () => {
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'ppt-pr3-e2e-'))
      const dir = '工程甲'
      try {
        await mkdir(path.join(tmp, dir), { recursive: true })
        await createProject(tmp, { dir })

        // 塞一页内容 + theme 引用测试字体
        const deckText = [
          'profile: generate',
 'title: 端到端字体嵌入',
          'size: [960, 540]',
          'theme:',
          '  textStyles:',
          '    h1:',
          `      fontFamily: ${TEST_FAMILY}`,
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
        const written = saved.fontEmbed!.facesEmbedded.filter((f) => f.typeface === TEST_FAMILY)
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
      } finally {
        await rm(tmp, { recursive: true, force: true }).catch(() => {})
      }
    },
    120_000
  )
})
