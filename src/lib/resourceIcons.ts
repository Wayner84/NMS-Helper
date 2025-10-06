import type { Item } from '../types'

type ResourceDescriptor = Pick<Item, 'id' | 'name'> | { id?: string; name?: string }

const resourceIconModules = import.meta.glob('../assets/resources/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default'
}) as Record<string, string>

const sanitizeKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const resourceIconMap = new Map<string, string>()

Object.entries(resourceIconModules).forEach(([path, src]) => {
  const fileName = path.split('/').pop() ?? ''
  const baseName = fileName.replace(/\.[^/.]+$/, '')
  const variations = new Set<string>([
    baseName.toLowerCase(),
    sanitizeKey(baseName),
    sanitizeKey(baseName).replace(/_/g, '')
  ])

  variations.forEach((key) => {
    if (key) {
      resourceIconMap.set(key, src)
    }
  })
})

const normalizeDescriptor = (descriptor: ResourceDescriptor): string[] => {
  const values: string[] = []

  if ('id' in descriptor && descriptor.id) {
    values.push(descriptor.id)
  }

  if ('name' in descriptor && descriptor.name) {
    values.push(descriptor.name)
  }

  return values
}

export const getResourceIcon = (descriptor: ResourceDescriptor): string | undefined => {
  const candidates = normalizeDescriptor(descriptor).flatMap((value) => {
    const normalized = value.trim()
    if (!normalized) return []
    const sanitized = sanitizeKey(normalized)
    return [normalized.toLowerCase(), sanitized, sanitized.replace(/_/g, '')]
  })

  for (const key of candidates) {
    if (!key) continue
    const match = resourceIconMap.get(key)
    if (match) {
      return match
    }
  }

  return undefined
}

