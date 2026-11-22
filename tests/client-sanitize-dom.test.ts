// @vitest-environment happy-dom
/**
 * sanitizeHtml 的浏览器分支（DOMParser 路径）——面板里实际运行的就是这一支。
 * node 环境下的字符串回退分支见 tests/client-render.test.ts。
 */
import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '../client/render/sanitize'

describe('sanitizeHtml · DOMParser 分支', () => {
  it('运行环境确有 DOMParser（否则本文件测的就是回退分支）', () => {
    expect(typeof DOMParser).toBe('function')
  })

  it('脚本连同内容丢弃；事件属性、未列入白名单的标签被剥掉，正文保留', () => {
    const out = sanitizeHtml('<p onclick="x()">甲<script>alert(1)</script><img src=x onerror="y()">乙<span>丙</span></p>')
    expect(out).toBe('<p>甲乙<span>丙</span></p>')
    expect(sanitizeHtml('<style>p{color:red}</style>正文')).toBe('正文')
  })

  it('style 只留白名单属性，危险值整条丢弃', () => {
    const out = sanitizeHtml('<span style="color:red;position:fixed;background-color:url(javascript:1)">字</span>')
    expect(out).toBe('<span style="color:red">字</span>')
  })

  it('<p style> 段落样式保留', () => {
    expect(sanitizeHtml('<p style="text-align:center">居中</p>')).toBe('<p style="text-align:center">居中</p>')
  })

  it('<a href>：https/mailto 保留并补 target/rel，javascript: 与 data: 丢 href', () => {
    expect(sanitizeHtml('<a href="https://example.com">链</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">链</a>'
    )
    expect(sanitizeHtml('<a href="mailto:a@b.c">信</a>')).toContain('href="mailto:a@b.c"')
    expect(sanitizeHtml('<a href="javascript:alert(1)">坏</a>')).toBe('<a>坏</a>')
    expect(sanitizeHtml('<a href="data:text/html,x">坏</a>')).toBe('<a>坏</a>')
  })

  it('SVG 注入与提前闭合外壳都不生效', () => {
    expect(sanitizeHtml('<svg onload="x()"><animate onbegin="y()"/></svg>文本')).toBe('文本')
    expect(sanitizeHtml('前</div><p>后</p>')).toBe('前<p>后</p>')
  })

  it('文本里的尖括号被转义', () => {
    expect(sanitizeHtml('<p>1 &lt; 2</p>')).toBe('<p>1 &lt; 2</p>')
  })
})
