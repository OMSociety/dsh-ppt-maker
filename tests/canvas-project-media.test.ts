import { expect, it, vi } from 'vitest'
import { canvasMediaUrl } from '../client/render/media'
import { fillToCss } from '../client/render/resolve'

it('工程图片与 SVG 页通过当前工程的媒体解析器取用', () => {
  const resolve = vi.fn((src: string) => `/media?src=${encodeURIComponent(src)}`)
  expect(canvasMediaUrl('media\\封 面.png', resolve)).toBe(`/media?src=${encodeURIComponent('media/封 面.png')}`)
  expect(canvasMediaUrl('media/svg/cover.svg', resolve)).toBe('/media?src=media%2Fsvg%2Fcover.svg')
})

it('在线图片引用不产生画布资源地址或背景样式', () => {
  const src = 'https://example.invalid/cover.png'
  const resolve = vi.fn(() => 'unexpected')
  expect(canvasMediaUrl(src, resolve)).toBe('')
  expect(canvasMediaUrl(src)).toBe('')
  expect(fillToCss({ type: 'image', src }, undefined, resolve)).toBeUndefined()
  expect(resolve).not.toHaveBeenCalled()
})
