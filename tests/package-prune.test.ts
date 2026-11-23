import { describe, expect, it } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { pruneUnreachableParts } from '../src/core/engine/package-prune.js'

const rels = (targets: string[], external?: string) =>
  `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${targets
    .map((t, i) => `<Relationship Id="rId${i + 1}" Type="x" Target="${t}"/>`)
    .join('')}${external ? `<Relationship Id="rIdE" Type="x" Target="${external}" TargetMode="External"/>` : ''}</Relationships>`

function pkg(): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<Types><Default Extension="xml" ContentType="a"/><Override PartName="/ppt/slides/slide1.xml" ContentType="s"/><Override PartName="/ppt/charts/chart9.xml" ContentType="c"/></Types>'
    ),
    '_rels/.rels': strToU8(rels(['ppt/presentation.xml'])),
    'ppt/presentation.xml': strToU8('<p/>'),
    'ppt/_rels/presentation.xml.rels': strToU8(rels(['slides/slide1.xml'], 'https://example.com/x')),
    'ppt/slides/slide1.xml': strToU8('<s/>'),
    'ppt/slides/_rels/slide1.xml.rels': strToU8(rels(['../charts/chart1.xml'])),
    'ppt/charts/chart1.xml': strToU8('<c/>'),
    'ppt/charts/chart9.xml': strToU8('<c/>'),
    'ppt/charts/_rels/chart9.xml.rels': strToU8(rels(['../embeddings/book9.xlsx'])),
    'ppt/embeddings/book9.xlsx': strToU8('xlsx')
  })
}

describe('pruneUnreachableParts', () => {
  it('removes unreachable parts, their rels and content-type overrides', () => {
    const { bytes, removed } = pruneUnreachableParts(pkg())
    expect(removed.sort()).toEqual([
      'ppt/charts/_rels/chart9.xml.rels',
      'ppt/charts/chart9.xml',
      'ppt/embeddings/book9.xlsx'
    ])
    const files = unzipSync(bytes)
    expect(Object.keys(files)).toContain('ppt/charts/chart1.xml')
    expect(Object.keys(files)).not.toContain('ppt/charts/chart9.xml')
    const types = strFromU8(files['[Content_Types].xml'])
    expect(types).toContain('/ppt/slides/slide1.xml')
    expect(types).not.toContain('chart9')
  })

  it('returns the same bytes when everything is reachable', () => {
    const first = pruneUnreachableParts(pkg()).bytes
    const again = pruneUnreachableParts(first)
    expect(again.removed).toEqual([])
    expect(again.bytes).toBe(first)
  })

  it('leaves non-zip input untouched', () => {
    const junk = new Uint8Array([1, 2, 3])
    expect(pruneUnreachableParts(junk).bytes).toBe(junk)
  })
})
