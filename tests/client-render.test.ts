/**
 * client/render 纯函数单测（方案 B：工作台 DOM 直渲的渲染映射与安全清洗）。
 *
 * 覆盖两条命脉：
 *   1. resolve.ts —— $变量解析、fill/border/background → CSS、文本样式合并，
 *      以及 Inspector 颜色字段的 colorFieldModel / deckTheme 视图模型。
 *   2. sanitize.ts —— 富文本 HTML 白名单清洗（防 XSS；vitest 是 node 环境无 DOMParser，
 *      走 sanitizeHtmlString 回退路径）+ style 声明级清洗。
 *   3. text-markup.ts / table-rows.ts —— 画布就地编辑的显示/提交模型（多段不丢、不剥格式）、
 *      表格结构归一与比例回写。
 *
 * 这些都是纯函数，不挂 React、不碰 DOM。
 */
import { describe, expect, it } from 'vitest'
import {
  backgroundToCss,
  borderToCss,
  COLOR_PICKER_FALLBACK,
  colorFieldModel,
  deckTheme,
  fillToCss,
  resolveColor,
  resolveTextStyle,
  type ThemeLike,
} from '../client/render/resolve'
import { sanitizeHtml, sanitizeHtmlString, sanitizeStyle } from '../client/render/sanitize'
import { pathFromPoints } from '../client/render/points'
import { textEditorModel } from '../client/render/text-markup'
import { equalRatios, normTableRows } from '../client/render/table-rows'

const theme: ThemeLike = {
  colors: {
    paper: '#F2EDE3',
    ink: '#1A1A1A',
    red: '#D8232A',
  },
  textStyles: {
    body: { fontSize: 13, color: '$ink', lineHeight: 1.55, fontFamily: 'MiSans' },
    title: { fontSize: 40, color: '$ink', bold: true },
  },
}

describe('resolve.ts · $变量与样式解析', () => {
  it('resolveColor：$引用查 theme.colors，字面量原样返回', () => {
    expect(resolveColor('$paper', theme)).toBe('#F2EDE3')
    expect(resolveColor('$red', theme)).toBe('#D8232A')
    expect(resolveColor('#123456', theme)).toBe('#123456')
    expect(resolveColor('rgb(1,2,3)', theme)).toBe('rgb(1,2,3)')
  })

  it('resolveColor：未知 $引用 / 非字符串 → undefined', () => {
    expect(resolveColor('$nope', theme)).toBeUndefined()
    expect(resolveColor(123, theme)).toBeUndefined()
    expect(resolveColor(undefined, theme)).toBeUndefined()
    expect(resolveColor('', theme)).toBeUndefined()
  })

  it('resolveTextStyle：$style 引用展开 + 内联覆盖 + 颜色已解析', () => {
    const st = resolveTextStyle({ style: '$body', color: '$red', fontSize: 20, text: '<p>x</p>' }, theme)
    // 内联覆盖 $style 的同名字段
    expect(st.fontSize).toBe(20)
    // 内联 $red 解析为字面量
    expect(st.color).toBe('#D8232A')
    // $style 里没被覆盖的字段保留
    expect(st.lineHeight).toBe(1.55)
    expect(st.fontFamily).toBe('MiSans')
    // text/align/style 不进样式表
    expect(st.text).toBeUndefined()
    expect(st.style).toBeUndefined()
  })

  it('resolveTextStyle：无 $style 时只用内联字段', () => {
    const st = resolveTextStyle({ fontSize: 12, color: '$ink' }, theme)
    expect(st.fontSize).toBe(12)
    expect(st.color).toBe('#1A1A1A')
  })

  it('fillToCss：solid 解析颜色，$引用也解', () => {
    expect(fillToCss({ type: 'solid', color: '$ink' }, theme)).toBe('#1A1A1A')
    expect(fillToCss({ type: 'solid', color: '#FF0000' }, theme)).toBe('#FF0000')
  })

  it('fillToCss：linear/radial gradient 拼 stops，角度按规格 +90 换算', () => {
    const lin = fillToCss(
      { type: 'gradient', gradientType: 'linear', angle: 0, stops: [{ position: 0, color: '$red' }, { position: 1, color: '#000000' }] },
      theme,
    )
    // PPTD 0° = 左→右 → CSS 90deg
    expect(lin).toBe('linear-gradient(90deg, #D8232A 0%, #000000 100%)')
    const rad = fillToCss(
      { type: 'gradient', gradientType: 'radial', stops: [{ position: 0, color: '#FFF' }] },
      theme,
    )
    expect(rad).toBe('radial-gradient(circle, #FFF 0%)')
  })

  it('fillToCss：image src 经 resolveMedia 映射（逆向工程的图片背景不 404）', () => {
    const map = (s: string) => `/ppt-maker/api/media?src=${s}`
    expect(fillToCss({ type: 'image', src: 'media/bg-0-slide.png' }, theme, map)).toBe(
      'url("/ppt-maker/api/media?src=media/bg-0-slide.png") center/cover no-repeat',
    )
    // 无 resolveMedia 时原样（调用方负责可访问性）
    expect(fillToCss({ type: 'image', src: 'media/x.png' }, theme)).toBe(
      'url("media/x.png") center/cover no-repeat',
    )
    expect(fillToCss({ type: 'image' }, theme)).toBeUndefined()
  })

  it('backgroundToCss：image 背景同样过 resolveMedia', () => {
    const map = (s: string) => `/m/${s}`
    expect(backgroundToCss({ type: 'image', src: 'media/bg.png' }, theme, map)).toContain('url("/m/media/bg.png")')
  })

  it('fillToCss：无 fill / 空 stops → undefined', () => {
    expect(fillToCss(undefined, theme)).toBeUndefined()
    expect(fillToCss(null, theme)).toBeUndefined()
    expect(fillToCss({ type: 'gradient', gradientType: 'linear', stops: [] }, theme)).toBeUndefined()
  })

  it('borderToCss：颜色必填，宽度/线型给默认', () => {
    expect(borderToCss({ color: '$red' }, theme)).toBe('1px solid #D8232A')
    expect(borderToCss({ color: '#000', width: 2, style: 'dashed' }, theme)).toBe('2px dashed #000')
    expect(borderToCss({ width: 2 }, theme)).toBeUndefined() // 无颜色不出边框
  })

  it('backgroundToCss：字符串简写 / fill 对象 / 纯色对象', () => {
    expect(backgroundToCss('$paper', theme)).toBe('#F2EDE3')
    expect(backgroundToCss({ color: '$ink' }, theme)).toBe('#1A1A1A')
    expect(backgroundToCss({ type: 'solid', color: '$red' }, theme)).toBe('#D8232A')
    expect(backgroundToCss(undefined, theme)).toBeUndefined()
  })
})

describe('sanitize.ts · style 声明清洗', () => {
  it('放行白名单属性，剔除不在白名单的', () => {
    expect(sanitizeStyle('color:red;font-size:13px;position:absolute;text-align:center')).toBe(
      'color:red;font-size:13px;text-align:center',
    )
  })

  it('拒绝危险值：url() / expression() / javascript: / 尖括号', () => {
    expect(sanitizeStyle('color:red;background-color:url(javascript:alert(1))')).toBe('color:red')
    expect(sanitizeStyle('width:expression(alert(1))')).toBe('')
    expect(sanitizeStyle('color:javascript:x')).toBe('')
    expect(sanitizeStyle('font-family:<script>')).toBe('')
  })

  it('大小写不敏感 + 容忍空白', () => {
    expect(sanitizeStyle('  COLOR : red ; TEXT-ALIGN: center ')).toBe('color:red;text-align:center')
  })
})

describe('sanitize.ts · HTML 白名单（node 回退路径）', () => {
  it('放行文本格式化标签，剔除 script/style/iframe', () => {
    const out = sanitizeHtmlString('<p>你好<strong>粗体</strong></p><script>alert(1)</script>')
    expect(out).toContain('<p>')
    expect(out).toContain('<strong>粗体</strong>')
    expect(out).not.toContain('script')
    expect(out).not.toContain('alert')
  })

  it('剔除 on* 事件属性与 javascript: 协议', () => {
    const out = sanitizeHtmlString('<p onclick="x()">a</p><a href="javascript:evil()">b</a>')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('javascript:')
  })

  it('白名单外标签被剥掉但保留其文本内容', () => {
    const out = sanitizeHtmlString('<div>keep<em>我</em></div>')
    expect(out).toContain('keep')
    expect(out).toContain('<em>我</em>')
    expect(out).not.toContain('<div>')
  })

  it('style 属性经 sanitizeStyle 清洗', () => {
    const out = sanitizeHtmlString('<p style="color:red;position:fixed">x</p>')
    expect(out).toContain('color:red')
    expect(out).not.toContain('position')
  })

  it('sanitizeHtml 在无 DOMParser（node）时回退到字符串清洗', () => {
    // vitest environment: node → 无 DOMParser，应走回退且结果一致地安全
    const out = sanitizeHtml('<p>正常<strong>文字</strong></p><img src=x onerror=alert(1)>')
    expect(out).toContain('<strong>文字</strong>')
    expect(out).not.toContain('onerror')
  })
})

describe('points.ts · Line 路径生成', () => {
  it('两点直线：M + L', () => {
    expect(pathFromPoints([[0, 0], [100, 100]], 'smooth')).toBe('M0,0 L100,100')
  })

  it('sharp 多点折线：全 L 连接', () => {
    expect(pathFromPoints([[0, 0], [50, 80], [100, 0]], 'sharp')).toBe('M0,0 L50,80 L100,0')
  })

  it('smooth 四点：首末过线、中两点作三次贝塞尔控制点', () => {
    // 规格样例：bezier-arc viewBox [360,100] points "0,80 120,0 240,100 360,20"
    expect(pathFromPoints([[0, 80], [120, 0], [240, 100], [360, 20]], 'smooth')).toBe(
      'M0,80 C120,0 240,100 360,20',
    )
  })

  it('smooth 三点：单控制点走二次贝塞尔', () => {
    expect(pathFromPoints([[0, 0], [50, 100], [100, 0]], 'smooth')).toBe('M0,0 Q50,100 100,0')
  })
})

describe('colorFieldModel · Inspector 颜色字段视图模型', () => {
  const modelTheme: ThemeLike = {
    colors: { paper: '#F2EDE3', weird: 'rgb(1,2,3)' },
  }

  it('空值 / 非字符串：ref、swatch 皆空，picker 走兜底', () => {
    const want = { ref: null, swatch: null, picker: COLOR_PICKER_FALLBACK }
    expect(colorFieldModel('', modelTheme)).toEqual(want)
    expect(colorFieldModel(undefined, modelTheme)).toEqual(want)
    expect(colorFieldModel(42, modelTheme)).toEqual(want)
  })

  it('$引用：保留引用名，swatch/picker 用 theme 解析值（归一小写）', () => {
    expect(colorFieldModel('$paper', modelTheme)).toEqual({ ref: '$paper', swatch: '#f2ede3', picker: '#f2ede3' })
  })

  it('#RGB 字面量归一成 #rrggbb', () => {
    expect(colorFieldModel('#ABC', modelTheme)).toEqual({ ref: null, swatch: '#aabbcc', picker: '#aabbcc' })
  })

  it('未知 $引用：ref 照显、无色样、picker 兜底', () => {
    expect(colorFieldModel('$ghost', modelTheme)).toEqual({ ref: '$ghost', swatch: null, picker: COLOR_PICKER_FALLBACK })
  })

  it('theme.colors 值为非 hex 时 $引用同样兜底（不改写原值）', () => {
    expect(colorFieldModel('$weird', modelTheme)).toEqual({ ref: '$weird', swatch: null, picker: COLOR_PICKER_FALLBACK })
  })

  it('rgb() 等字面量：picker 兜底（原生拾色器不认），ref 为空', () => {
    expect(colorFieldModel('rgb(216,35,42)', modelTheme)).toEqual({
      ref: null,
      swatch: null,
      picker: COLOR_PICKER_FALLBACK,
    })
  })
})

describe('deckTheme · 从 deck 快照安全取 theme 段', () => {
  it('取到 theme 对象', () => {
    const themePart = { colors: { paper: '#fff' } }
    expect(deckTheme({ theme: themePart })).toBe(themePart)
  })

  it('deck 为空 / 无 theme / theme 非对象：一律 null', () => {
    expect(deckTheme(null)).toBeNull()
    expect(deckTheme({})).toBeNull()
    expect(deckTheme({ theme: 'paper' })).toBeNull()
  })
})

describe('textEditorModel · 画布就地编辑的显示/提交', () => {
  it('含行内格式（rich）：原样显示 markup，提交原样回写——不剥格式', () => {
    const m = textEditorModel('<p><strong>加粗</strong>普通</p>')
    expect(m.rich).toBe(true)
    expect(m.display).toBe('<p><strong>加粗</strong>普通</p>')
    expect(m.commit('<p><em>斜体</em></p>')).toBe('<p><em>斜体</em></p>')
  })

  it('简单 markup：显示人话（段变行），提交按行包回 <p>——多段不丢', () => {
    const m = textEditorModel('<p>甲</p><p>乙</p>')
    expect(m.rich).toBe(false)
    expect(m.display).toBe('甲\n乙')
    expect(m.commit('甲\n\n乙')).toBe('<p>甲</p><p></p><p>乙</p>')
  })

  it('纯文本简写：显示原样，提交包成 <p>', () => {
    const m = textEditorModel('abc')
    expect(m.rich).toBe(false)
    expect(m.display).toBe('abc')
    expect(m.commit('abc')).toBe('<p>abc</p>')
  })
})

describe('table-rows · 表格结构归一与比例', () => {
  it('normTableRows：简写单元格包成对象，对象单元格原样保留（bold/rowSpan 等）', () => {
    expect(normTableRows([[{ text: '年份', bold: true }, '12'], ['28', 19]])).toEqual([
      [{ text: '年份', bold: true }, { text: '12' }],
      [{ text: '28' }, { text: 19 }],
    ])
  })

  it('normTableRows：非数组给空；坏行给空行（稀疏合并行不被破坏）', () => {
    expect(normTableRows(undefined)).toEqual([])
    expect(normTableRows('x')).toEqual([])
    expect(normTableRows([null, [1]])).toEqual([[], [{ text: 1 }]])
  })

  it('equalRatios：n 等分且和为 1；0 给空', () => {
    expect(equalRatios(4)).toEqual([0.25, 0.25, 0.25, 0.25])
    expect(equalRatios(4).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(equalRatios(0)).toEqual([])
  })
})
