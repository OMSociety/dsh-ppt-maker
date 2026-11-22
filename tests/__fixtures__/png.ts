/**
 * 测试用最小 PNG 解码：8 位 RGB / RGBA、非隔行（LibreOffice → PDFium 输出的就是这类）。
 * 其余格式直接抛错，避免把解不了的图当成「空白图」。
 */
import { inflateSync } from 'node:zlib'

export interface RgbaImage {
  width: number
  height: number
  /** 每像素 4 字节 RGBA */
  data: Uint8Array
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

export function decodePng(bytes: Uint8Array): RgbaImage {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG')
  let offset = 8
  let width = 0
  let height = 0
  let colorType = -1
  const idat: Buffer[] = []
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.toString('latin1', offset + 4, offset + 8)
    const body = buf.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      const depth = body[8]
      colorType = body[9]
      if (depth !== 8 || (colorType !== 2 && colorType !== 6) || body[12] !== 0) {
        throw new Error(`不支持的 PNG：bitDepth=${depth} colorType=${colorType} interlace=${body[12]}`)
      }
    } else if (type === 'IDAT') {
      idat.push(body)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  const channels = colorType === 6 ? 4 : 3
  const stride = width * channels
  const raw = inflateSync(Buffer.concat(idat))
  const pixels = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const row = y * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[row + x - channels] : 0
      const b = y > 0 ? pixels[row - stride + x] : 0
      const c = x >= channels && y > 0 ? pixels[row - stride + x - channels] : 0
      const v = src[x]
      pixels[row + x] =
        filter === 0 ? v
        : filter === 1 ? v + a
        : filter === 2 ? v + b
        : filter === 3 ? v + ((a + b) >> 1)
        : v + paeth(a, b, c)
    }
  }
  if (channels === 4) return { width, height, data: pixels }
  const data = new Uint8Array(width * height * 4)
  for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
    data[j] = pixels[i]
    data[j + 1] = pixels[i + 1]
    data[j + 2] = pixels[i + 2]
    data[j + 3] = 255
  }
  return { width, height, data }
}

export interface ColorBox {
  count: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** 统计与目标色（#rrggbb）各通道差都不超过 tolerance 的像素及其包围盒。 */
export function colorBox(image: RgbaImage, hex: string, tolerance = 40): ColorBox {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const box: ColorBox = { count: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4
      const d = image.data
      if (Math.abs(d[i] - r) <= tolerance && Math.abs(d[i + 1] - g) <= tolerance && Math.abs(d[i + 2] - b) <= tolerance) {
        box.count++
        if (x < box.minX) box.minX = x
        if (x > box.maxX) box.maxX = x
        if (y < box.minY) box.minY = y
        if (y > box.maxY) box.maxY = y
      }
    }
  }
  return box
}

/** 逐行统计含目标色的连续行段（用来数横向条的根数）。 */
export function colorRowBands(image: RgbaImage, hex: string, minPixelsPerRow = 20, tolerance = 40): Array<{ from: number; to: number; width: number }> {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const bands: Array<{ from: number; to: number; width: number }> = []
  let current: { from: number; to: number; width: number } | null = null
  for (let y = 0; y < image.height; y++) {
    let hits = 0
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4
      const d = image.data
      if (Math.abs(d[i] - r) <= tolerance && Math.abs(d[i + 1] - g) <= tolerance && Math.abs(d[i + 2] - b) <= tolerance) hits++
    }
    if (hits >= minPixelsPerRow) {
      if (current) {
        current.to = y
        current.width = Math.max(current.width, hits)
      } else {
        current = { from: y, to: y, width: hits }
      }
    } else if (current) {
      bands.push(current)
      current = null
    }
  }
  if (current) bands.push(current)
  return bands
}
