/** 逆向导入的媒体扩展名按字节嗅探。 */
import { describe, expect, it } from 'vitest'
import { imageExtOf } from '../src/core/reverse/map.js'

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values)

describe('imageExtOf', () => {
  it('按魔数识别常见格式', () => {
    expect(imageExtOf(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))).toBe('.png')
    expect(imageExtOf(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('.jpg')
    expect(imageExtOf(new TextEncoder().encode('GIF89a'))).toBe('.gif')
    expect(imageExtOf(bytes(0xd7, 0xcd, 0xc6, 0x9a))).toBe('.wmf')
    const emf = new Uint8Array(48)
    emf.set([1, 0, 0, 0])
    emf.set(new TextEncoder().encode(' EMF'), 40)
    expect(imageExtOf(emf)).toBe('.emf')
    expect(imageExtOf(new TextEncoder().encode('<?xml version="1.0"?><svg/>'))).toBe('.svg')
  })

  it('未知字节回落源部件扩展名，再回落 .bin', () => {
    expect(imageExtOf(bytes(0, 1, 2, 3), 'ppt/media/image7.TIF')).toBe('.tif')
    expect(imageExtOf(bytes(0, 1, 2, 3))).toBe('.bin')
  })
})
