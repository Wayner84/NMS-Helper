const GLYPH_EMOJI = [
  '☀️',
  '🕊️',
  '👁️',
  '🌊',
  '🌿',
  '🌀',
  '🐾',
  '🌙',
  '⭐',
  '🔥',
  '💧',
  '🗻',
  '⚡',
  '🌩️',
  '🛰️',
  '🛸'
] as const

const GLYPH_LABELS = [
  'Glyph 0: Sun',
  'Glyph 1: Bird',
  'Glyph 2: Eclipse',
  'Glyph 3: Ocean',
  'Glyph 4: Grass',
  'Glyph 5: Spiral',
  'Glyph 6: Paw',
  'Glyph 7: Moon',
  'Glyph 8: Star',
  'Glyph 9: Flame',
  'Glyph 10: Water drop',
  'Glyph 11: Mountain',
  'Glyph 12: Charge',
  'Glyph 13: Storm',
  'Glyph 14: Satellite',
  'Glyph 15: Portal'
] as const

export const normalizePortalHex = (portal: string): string => portal.replace(/[^0-9a-fA-F]/g, '').toUpperCase()

export const isValidPortalHex = (portal: string): boolean => {
  const normalized = normalizePortalHex(portal)
  return /^[0-9A-F]{12}$/u.test(normalized)
}

export const portalHexToGlyphIndexes = (portal: string): number[] => {
  const normalized = normalizePortalHex(portal)
  if (!isValidPortalHex(normalized)) return []
  return normalized.split('').map((char) => parseInt(char, 16))
}

export const glyphIndexesToString = (indexes: number[]): string =>
  indexes.map((index) => GLYPH_EMOJI[index] ?? '?').join(' ')

export const glyphIndexesToLabels = (indexes: number[]): string[] =>
  indexes.map((index) => GLYPH_LABELS[index] ?? `Glyph ${index}`)

export const describePortal = (portal: string): { glyphs: string; labels: string[] } => {
  const indexes = portalHexToGlyphIndexes(portal)
  return {
    glyphs: glyphIndexesToString(indexes),
    labels: glyphIndexesToLabels(indexes)
  }
}

export const parsePortalInput = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  const fromHex = normalizePortalHex(trimmed)
  if (isValidPortalHex(fromHex)) return fromHex

  const tokens = trimmed.split(/\s+/u).filter(Boolean)
  if (tokens.length === 12) {
    const indexes = tokens.map((token) => GLYPH_EMOJI.findIndex((glyph) => glyph === token))
    if (indexes.every((value) => value >= 0)) {
      return indexes.map((idx) => idx.toString(16).toUpperCase()).join('')
    }
  }

  return null
}

export const GLYPHS = GLYPH_EMOJI
export const GLYPH_NAMES = GLYPH_LABELS
