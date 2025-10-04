import { useMemo, useState } from 'react'
import { useAppStore, getAllPortals } from '../store/useAppStore'
import type { PortalEntry } from '../types'
import VirtualList from '../components/VirtualList'
import {
  describePortal,
  glyphIndexesToLabels,
  isValidPortalHex,
  normalizePortalHex,
  parsePortalInput,
  portalHexToGlyphIndexes
} from '../lib/glyphs'
import { clsx } from 'clsx'
import { nanoid } from 'nanoid'

interface PortalFormState {
  id: string
  galaxyIndex: number
  region: string
  portal: string
  tags: string
  systemCoords: string
  notes: string
  url: string
}

const defaultForm = (): PortalFormState => ({
  id: '',
  galaxyIndex: 1,
  region: '',
  portal: '',
  tags: '',
  systemCoords: '',
  notes: '',
  url: ''
})

const formatPortal = (portal: string): string => {
  const normalized = normalizePortalHex(portal)
  if (normalized.length !== 12) return portal
  return `${normalized.slice(0, 4)}:${normalized.slice(4, 8)}:${normalized.slice(8, 12)}`
}

const PortalCard = ({
  entry,
  onCopy,
  onShare
}: {
  entry: PortalEntry
  onCopy: (text: string) => void
  onShare: (entry: PortalEntry) => void
}) => {
  const glyphIndexes = portalHexToGlyphIndexes(entry.portal)
  const glyphLabels = glyphIndexesToLabels(glyphIndexes)
  const glyphText = describePortal(entry.portal).glyphs
  const glyphChars = glyphText.split(' ')

  return (
    <article className="rounded-lg border border-slate-700 bg-surface/60 p-4 text-sm text-slate-200">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-primary">{entry.region}</h3>
          <p className="text-xs text-slate-400">Galaxy #{entry.galaxyIndex}</p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className="rounded border border-slate-600 px-2 py-1 hover:border-primary"
            onClick={() => onCopy(formatPortal(entry.portal))}
          >
            Copy hex
          </button>
          <button
            type="button"
            className="rounded border border-slate-600 px-2 py-1 hover:border-primary"
            onClick={() => onCopy(glyphText)}
          >
            Copy glyphs
          </button>
          <button
            type="button"
            className="rounded border border-slate-600 px-2 py-1 hover:border-primary"
            onClick={() => onShare(entry)}
          >
            Share
          </button>
        </div>
      </header>
      <div className="mt-3 flex flex-wrap gap-2">
        {glyphIndexes.map((glyphIndex, index) => (
          <span
            key={`${entry.id}-glyph-${index}`}
            aria-label={glyphLabels[index] ?? `Glyph ${glyphIndex}`}
            className="flex h-10 w-10 items-center justify-center rounded bg-surface/80 text-lg"
          >
            {glyphChars[index] ?? '？'}
          </span>
        ))}
      </div>
      <dl className="mt-3 space-y-1 text-xs text-slate-400">
        <div className="flex justify-between">
          <dt>Portal</dt>
          <dd className="font-mono text-slate-200">{formatPortal(entry.portal)}</dd>
        </div>
        {entry.systemCoords ? (
          <div className="flex justify-between">
            <dt>Coords</dt>
            <dd className="font-mono text-slate-300">{entry.systemCoords}</dd>
          </div>
        ) : null}
        {entry.url ? (
          <div className="flex justify-between">
            <dt>Source</dt>
            <dd>
              <a href={entry.url} target="_blank" rel="noreferrer" className="text-primary">
                Link
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      {entry.notes ? <p className="mt-3 text-xs text-slate-400">{entry.notes}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
        {(entry.tags ?? []).map((tag) => (
          <span key={`${entry.id}-tag-${tag}`} className="rounded-full border border-slate-600 px-2 py-1">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}

const Portals = (): JSX.Element => {
  const { portals, addPortalEntry, importPortals } = useAppStore((state) => ({
    portals: getAllPortals(state),
    addPortalEntry: state.addPortalEntry,
    importPortals: state.importPortals
  }))

  const [search, setSearch] = useState('')
  const [tagsFilter, setTagsFilter] = useState<Set<string>>(new Set())
  const [galaxyMin, setGalaxyMin] = useState(1)
  const [galaxyMax, setGalaxyMax] = useState(255)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<PortalFormState>(defaultForm())
  const [formError, setFormError] = useState<string | null>(null)

  const tags = useMemo(() => {
    const set = new Set<string>()
    portals.forEach((entry) => entry.tags?.forEach((tag) => set.add(tag)))
    return Array.from(set).sort()
  }, [portals])

  const filteredPortals = useMemo(
    () =>
      filterPortals(
        portals,
        search,
        tagsFilter,
        Math.min(galaxyMin, galaxyMax),
        Math.max(galaxyMin, galaxyMax)
      ),
    [portals, search, tagsFilter, galaxyMin, galaxyMax]
  )

  const handleToggleTag = (tag: string) => {
    setTagsFilter((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy portal info', error)
    }
  }

  const handleShare = async (entry: PortalEntry) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: entry.region,
          text: `${entry.region} (Galaxy ${entry.galaxyIndex})\n${formatPortal(entry.portal)}`,
          url: entry.url ?? undefined
        })
      } catch (error) {
        console.error('Share dismissed', error)
      }
    } else {
      handleCopy(`${entry.region} – ${formatPortal(entry.portal)}`)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = parsePortalInput(form.portal) ?? normalizePortalHex(form.portal)
    if (!isValidPortalHex(normalized)) {
      setFormError('Portal address must be 12 hexadecimal characters.')
      return
    }
    if (!form.region.trim()) {
      setFormError('Region description is required.')
      return
    }
    const newEntry: PortalEntry = {
      id: form.id.trim() || `local-${nanoid(6)}`,
      galaxyIndex: Number(form.galaxyIndex),
      region: form.region.trim(),
      portal: formatPortal(normalized),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      systemCoords: form.systemCoords.trim() || undefined,
      notes: form.notes.trim() || undefined,
      url: form.url.trim() || undefined
    }
    addPortalEntry(newEntry)
    setShowModal(false)
    setForm(defaultForm())
    setFormError(null)
  }

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(portals, null, 2))
    } catch (error) {
      console.error('Failed to export portals', error)
    }
  }

  const handleImport = () => {
    // eslint-disable-next-line no-alert
    const value = window.prompt('Paste JSON array of portal entries')
    if (!value) return
    try {
      const parsed = JSON.parse(value) as PortalEntry[]
      if (Array.isArray(parsed)) {
        importPortals(parsed)
      }
    } catch (error) {
      console.error('Invalid portal JSON', error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6 text-sm text-slate-200">
        <p className="text-xs text-slate-400">
          Community-sourced addresses near the galactic centre. Verify coordinates in-game before committing costly jumps.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Search</span>
            <input
              type="search"
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              placeholder="Hex, region, tag..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Galaxy min</span>
            <input
              type="number"
              min={1}
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              value={galaxyMin}
              onChange={(event) => setGalaxyMin(Number(event.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Galaxy max</span>
            <input
              type="number"
              min={1}
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              value={galaxyMax}
              onChange={(event) => setGalaxyMax(Number(event.target.value))}
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Actions</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-600 px-3 py-2 hover:border-primary"
                onClick={() => setShowModal(true)}
              >
                Add entry
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-600 px-3 py-2 hover:border-primary"
                onClick={handleExport}
              >
                Export
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-600 px-3 py-2 hover:border-primary"
                onClick={handleImport}
              >
                Import
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-400">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={clsx(
                'rounded-full border px-3 py-1',
                tagsFilter.has(tag)
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-slate-600 hover:border-primary'
              )}
              onClick={() => handleToggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-surface/70 p-4">
        {filteredPortals.length === 0 ? (
          <p className="text-sm text-slate-400">No portals match the current filters.</p>
        ) : (
          <VirtualList
            items={filteredPortals}
            estimateSize={200}
            renderRow={(entry) => <PortalCard key={entry.id} entry={entry} onCopy={handleCopy} onShare={handleShare} />}
          />
        )}
      </section>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            className="w-full max-w-lg space-y-4 rounded-xl border border-slate-700 bg-surface p-6 text-sm text-slate-200"
            onSubmit={handleSubmit}
          >
            <h3 className="text-lg font-semibold text-primary">Add portal entry</h3>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Identifier</span>
              <input
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.id}
                onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Galaxy index</span>
                <input
                  type="number"
                  min={1}
                  className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                  value={form.galaxyIndex}
                  onChange={(event) => setForm((prev) => ({ ...prev, galaxyIndex: Number(event.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Region</span>
                <input
                  className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                  value={form.region}
                  onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Portal address</span>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded border border-slate-700 bg-surface/80 px-3 py-2"
                  value={form.portal}
                  onChange={(event) => setForm((prev) => ({ ...prev, portal: event.target.value }))}
                  placeholder="10A200840C2B"
                  required
                />
                <button
                  type="button"
                  className="rounded border border-slate-600 px-3 py-2 text-xs hover:border-primary"
                  onClick={() => {
                    const pasted = parsePortalInput(form.portal)
                    if (pasted) {
                      setForm((prev) => ({ ...prev, portal: formatPortal(pasted) }))
                    }
                  }}
                >
                  Normalise
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Tags (comma separated)</span>
              <input
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">System coordinates</span>
              <input
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.systemCoords}
                onChange={(event) => setForm((prev) => ({ ...prev, systemCoords: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Notes</span>
              <textarea
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Source URL</span>
              <input
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
              />
            </label>
            {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-600 px-4 py-2 hover:border-primary"
                onClick={() => {
                  setShowModal(false)
                  setForm(defaultForm())
                  setFormError(null)
                }}
              >
                Cancel
              </button>
              <button type="submit" className="rounded border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary/10">
                Save portal
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

const filterPortals = (
  portals: PortalEntry[],
  search: string,
  tags: Set<string>,
  minGalaxy: number,
  maxGalaxy: number
): PortalEntry[] => {
  const searchValue = search.trim().toUpperCase()
  return portals.filter((entry) => {
    if (entry.galaxyIndex < minGalaxy || entry.galaxyIndex > maxGalaxy) return false
    if (tags.size > 0) {
      const entryTags = new Set(entry.tags ?? [])
      for (const tag of tags) {
        if (!entryTags.has(tag)) return false
      }
    }
    if (!searchValue) return true
    const normalized = normalizePortalHex(entry.portal)
    if (normalized.includes(searchValue)) return true
    if (entry.region.toUpperCase().includes(searchValue)) return true
    if (entry.notes && entry.notes.toUpperCase().includes(searchValue)) return true
    if (entry.tags?.some((tag) => tag.toUpperCase().includes(searchValue))) return true
    return false
  })
}

export default Portals
