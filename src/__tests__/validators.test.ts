import { describe, expect, it } from 'vitest'
import portals from '../data/portals.json'
import hints from '../data/hints.json'
import type { HintEntry, PortalEntry } from '../types'
import { isValidPortalHex, normalizePortalHex } from '../lib/glyphs'

describe('dataset validators', () => {
  it('ensures all portal entries have valid hex addresses and galaxy index', () => {
    const entries = portals as PortalEntry[]
    entries.forEach((entry) => {
      expect(entry.galaxyIndex).toBeGreaterThan(0)
      expect(isValidPortalHex(normalizePortalHex(entry.portal))).toBe(true)
    })
  })

  it('validates hint length and required fields', () => {
    const entries = hints as HintEntry[]
    entries.forEach((hint) => {
      expect(hint.title.trim().length).toBeGreaterThan(0)
      expect(hint.body.trim().length).toBeGreaterThan(0)
      expect(hint.body.length).toBeLessThanOrEqual(280)
      expect(hint.tags.length).toBeGreaterThan(0)
    })
  })
})
