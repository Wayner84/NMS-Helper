import { describe, expect, it } from 'vitest'
import {
  describePortal,
  glyphIndexesToLabels,
  isValidPortalHex,
  normalizePortalHex,
  portalHexToGlyphIndexes
} from '../lib/glyphs'

describe('portal glyph utilities', () => {
  it('normalises portal strings and validates format', () => {
    expect(normalizePortalHex('10A2:0084:0C2B')).toBe('10A200840C2B')
    expect(isValidPortalHex('10A200840C2B')).toBe(true)
    expect(isValidPortalHex('ZZZ')).toBe(false)
  })

  it('maps hex to glyph indexes and labels', () => {
    const indexes = portalHexToGlyphIndexes('10A200840C2B')
    expect(indexes).toHaveLength(12)
    const labels = glyphIndexesToLabels(indexes)
    expect(labels[0]).toContain('Glyph 1')
    const description = describePortal('10A200840C2B')
    expect(description.glyphs.split(' ')).toHaveLength(12)
  })
})
