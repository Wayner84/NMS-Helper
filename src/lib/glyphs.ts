import glyph0 from '../assets/glyphs/PORTALSYMBOL.0.png'
import glyph1 from '../assets/glyphs/PORTALSYMBOL.1.png'
import glyph2 from '../assets/glyphs/PORTALSYMBOL.2.png'
import glyph3 from '../assets/glyphs/PORTALSYMBOL.3.png'
import glyph4 from '../assets/glyphs/PORTALSYMBOL.4.png'
import glyph5 from '../assets/glyphs/PORTALSYMBOL.5.png'
import glyph6 from '../assets/glyphs/PORTALSYMBOL.6.png'
import glyph7 from '../assets/glyphs/PORTALSYMBOL.7.png'
import glyph8 from '../assets/glyphs/PORTALSYMBOL.8.png'
import glyph9 from '../assets/glyphs/PORTALSYMBOL.9.png'
import glyphA from '../assets/glyphs/PORTALSYMBOL.A.png'
import glyphB from '../assets/glyphs/PORTALSYMBOL.B.png'
import glyphC from '../assets/glyphs/PORTALSYMBOL.C.png'
import glyphD from '../assets/glyphs/PORTALSYMBOL.D.png'
import glyphE from '../assets/glyphs/PORTALSYMBOL.E.png'
import glyphF from '../assets/glyphs/PORTALSYMBOL.F.png'

const GLYPH_TOKENS = [
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

const GLYPH_IMAGE_PATHS = [
  glyph0,
  glyph1,
  glyph2,
  glyph3,
  glyph4,
  glyph5,
  glyph6,
  glyph7,
  glyph8,
  glyph9,
  glyphA,
  glyphB,
  glyphC,
  glyphD,
  glyphE,
  glyphF
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
  indexes.map((index) => GLYPH_TOKENS[index] ?? '?').join(' ')

export const glyphIndexesToLabels = (indexes: number[]): string[] =>
  indexes.map((index) => GLYPH_LABELS[index] ?? `Glyph ${index}`)

export const describePortal = (
  portal: string
): { glyphs: string; labels: string[]; images: string[] } => {
  const indexes = portalHexToGlyphIndexes(portal)
  return {
    glyphs: glyphIndexesToString(indexes),
    labels: glyphIndexesToLabels(indexes),
    images: indexes.map((index) => GLYPH_IMAGE_PATHS[index] ?? '')
  }
}

export const parsePortalInput = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  const fromHex = normalizePortalHex(trimmed)
  if (isValidPortalHex(fromHex)) return fromHex

  const tokens = trimmed.split(/\s+/u).filter(Boolean)
  if (tokens.length === 12) {
    const indexes = tokens.map((token) => GLYPH_TOKENS.findIndex((glyph) => glyph === token))
    if (indexes.every((value) => value >= 0)) {
      return indexes.map((idx) => idx.toString(16).toUpperCase()).join('')
    }
  }

  return null
}

export const GLYPHS = GLYPH_TOKENS
export const GLYPH_NAMES = GLYPH_LABELS
export const GLYPH_IMAGES = GLYPH_IMAGE_PATHS
