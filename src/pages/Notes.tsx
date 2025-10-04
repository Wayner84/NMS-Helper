import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { NoteEntry, NoteType } from '../types'
import VirtualList from '../components/VirtualList'
import { clsx } from 'clsx'

interface NoteFormState {
  id: string
  name: string
  type: NoteType
  parentId: string | null
  systemCoords: string
  galaxyIndex: string
  notes: string
  resources: string[]
  links: string
}

const defaultNoteForm = (type: NoteType): NoteFormState => ({
  id: '',
  name: '',
  type,
  parentId: null,
  systemCoords: '',
  galaxyIndex: '',
  notes: '',
  resources: [],
  links: ''
})

const Notes = (): JSX.Element => {
  const { notes, resources, upsertNote, removeNotes, setNotes } = useAppStore((state) => ({
    notes: state.notes,
    resources: state.resources,
    upsertNote: state.upsertNote,
    removeNotes: state.removeNotes,
    setNotes: state.setNotes
  }))

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>('all')
  const [resourceFilter, setResourceFilter] = useState<Set<string>>(new Set())
  const [galaxyFilter, setGalaxyFilter] = useState<[number, number]>([1, 255])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NoteFormState>(defaultNoteForm('system'))
  const [formError, setFormError] = useState<string | null>(null)
  const [bulkResource, setBulkResource] = useState('')
  const [resourceInput, setResourceInput] = useState('')

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => a.name.localeCompare(b.name))
  }, [notes])

  const filteredNotes = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    return sortedNotes.filter((note) => {
      if (typeFilter !== 'all' && note.type !== typeFilter) return false
      if (resourceFilter.size > 0) {
        const hasResource = note.resources.some((res) => resourceFilter.has(res))
        if (!hasResource) return false
      }
      const [minGalaxy, maxGalaxy] = galaxyFilter
      if (note.galaxyIndex && (note.galaxyIndex < minGalaxy || note.galaxyIndex > maxGalaxy)) return false
      if (!searchValue) return true
      return (
        note.name.toLowerCase().includes(searchValue) ||
        (note.notes ?? '').toLowerCase().includes(searchValue) ||
        note.resources.some((res) => res.toLowerCase().includes(searchValue))
      )
    })
  }, [sortedNotes, typeFilter, resourceFilter, search, galaxyFilter])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleOpenForm = (type: NoteType, note?: NoteEntry) => {
    if (note) {
      setForm({
        id: note.id,
        name: note.name,
        type: note.type,
        parentId: note.parentId ?? null,
        systemCoords: note.systemCoords ?? '',
        galaxyIndex: note.galaxyIndex?.toString() ?? '',
        notes: note.notes ?? '',
        resources: note.resources,
        links: (note.links ?? []).join('\n')
      })
    } else {
      setForm(defaultNoteForm(type))
    }
    setResourceInput('')
    setFormError(null)
    setShowModal(true)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    const entry: NoteEntry = {
      id: form.id || `local-note-${Date.now()}`,
      name: form.name.trim(),
      type: form.type,
      parentId: form.parentId || null,
      systemCoords: form.systemCoords.trim() || undefined,
      galaxyIndex: form.galaxyIndex ? Number(form.galaxyIndex) : undefined,
      notes: form.notes.trim() || undefined,
      resources: Array.from(new Set(form.resources.map((res) => res.trim()).filter(Boolean))),
      links: form.links
        .split('\n')
        .map((link) => link.trim())
        .filter(Boolean),
      createdAt: form.id ? notes.find((note) => note.id === form.id)?.createdAt ?? Date.now() : Date.now(),
      updatedAt: Date.now()
    }
    upsertNote(entry)
    setShowModal(false)
    setForm(defaultNoteForm('system'))
    setSelectedIds((prev) => {
      if (form.id) return prev
      const next = new Set(prev)
      next.add(entry.id)
      return next
    })
  }

  const handleBulkResource = () => {
    const value = bulkResource.trim()
    if (!value || selectedIds.size === 0) return
    const updated = notes.map((note) => {
      if (!selectedIds.has(note.id)) return note
      if (note.resources.includes(value)) return note
      return { ...note, resources: [...note.resources, value], updatedAt: Date.now() }
    })
    setNotes(updated)
    setBulkResource('')
  }

  const handleBulkRemove = () => {
    if (selectedIds.size === 0) return
    removeNotes(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(notes, null, 2))
    } catch (error) {
      console.error('Failed to export notes', error)
    }
  }

  const handleImport = () => {
    // eslint-disable-next-line no-alert
    const value = window.prompt('Paste JSON array of notes to import')
    if (!value) return
    try {
      const parsed = JSON.parse(value) as NoteEntry[]
      if (Array.isArray(parsed)) {
        setNotes(parsed)
      }
    } catch (error) {
      console.error('Invalid notes JSON', error)
    }
  }

  const addResourceToForm = (resource: string) => {
    setForm((prev) => ({
      ...prev,
      resources: Array.from(new Set([...prev.resources, resource]))
    }))
  }

  const removeResourceFromForm = (resource: string) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.filter((res) => res !== resource)
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6 text-sm text-slate-200">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Search</span>
            <input
              type="search"
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              placeholder="Base, planet, resource..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Type</span>
            <select
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as NoteType | 'all')}
            >
              <option value="all">All</option>
              <option value="system">System</option>
              <option value="planet">Planet</option>
              <option value="base">Base</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Galaxy min</span>
            <input
              type="number"
              min={1}
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              value={galaxyFilter[0]}
              onChange={(event) => setGalaxyFilter([Number(event.target.value), galaxyFilter[1]])}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Galaxy max</span>
            <input
              type="number"
              min={1}
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              value={galaxyFilter[1]}
              onChange={(event) => setGalaxyFilter([galaxyFilter[0], Number(event.target.value)])}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
          {resources.quickPick.map((resourceName) => (
            <button
              key={resourceName}
              type="button"
              className={clsx(
                'rounded-full border px-3 py-1',
                resourceFilter.has(resourceName)
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-slate-600 hover:border-primary'
              )}
              onClick={() =>
                setResourceFilter((prev) => {
                  const next = new Set(prev)
                  if (next.has(resourceName)) {
                    next.delete(resourceName)
                  } else {
                    next.add(resourceName)
                  }
                  return next
                })
              }
            >
              {resourceName}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            className="rounded-full border border-slate-600 px-3 py-2 hover:border-primary"
            onClick={() => handleOpenForm('system')}
          >
            Add system
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-600 px-3 py-2 hover:border-primary"
            onClick={() => handleOpenForm('planet')}
          >
            Add planet
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-600 px-3 py-2 hover:border-primary"
            onClick={() => handleOpenForm('base')}
          >
            Add base
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
          <div className="flex items-center gap-2">
            <input
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              placeholder="Bulk resource"
              value={bulkResource}
              onChange={(event) => setBulkResource(event.target.value)}
            />
            <button
              type="button"
              className="rounded border border-slate-600 px-3 py-2 hover:border-primary"
              onClick={handleBulkResource}
            >
              Apply to selected
            </button>
            <button
              type="button"
              className="rounded border border-rose-500 px-3 py-2 text-rose-200 hover:bg-rose-500/10"
              onClick={handleBulkRemove}
            >
              Delete selected
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-surface/70 p-4">
        {filteredNotes.length === 0 ? (
          <p className="text-sm text-slate-400">No notes found.</p>
        ) : (
          <VirtualList
            items={filteredNotes}
            estimateSize={168}
            renderRow={(note) => {
              const isSelected = selectedIds.has(note.id)
              return (
                <article
                  key={note.id}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === ' ') {
                      event.preventDefault()
                      toggleSelect(note.id)
                    }
                  }}
                  className={clsx(
                    'mb-3 rounded border px-4 py-3 text-sm',
                    isSelected ? 'border-primary bg-primary/10 text-slate-100' : 'border-slate-700 bg-surface/60 text-slate-200'
                  )}
                >
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-primary">{note.name}</h3>
                      <p className="text-xs text-slate-400">{note.type.toUpperCase()}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(note.id)}
                        />
                        Select
                      </label>
                      <button
                        type="button"
                        className="rounded border border-slate-600 px-2 py-1 hover:border-primary"
                        onClick={() => handleOpenForm(note.type, note)}
                      >
                        Edit
                      </button>
                    </div>
                  </header>
                  {note.notes ? <p className="mt-2 text-sm text-slate-200">{note.notes}</p> : null}
                  <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                    {note.systemCoords ? <span>Coords: {note.systemCoords}</span> : null}
                    {note.galaxyIndex ? <span>Galaxy: {note.galaxyIndex}</span> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                    {note.resources.map((resourceName) => (
                      <span key={`${note.id}-${resourceName}`} className="rounded-full border border-slate-600 px-2 py-1">
                        {resourceName}
                      </span>
                    ))}
                  </div>
                </article>
              )
            }}
          />
        )}
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <form
            className="w-full max-w-xl space-y-4 rounded-xl border border-slate-700 bg-surface p-6 text-sm text-slate-200"
            onSubmit={handleSubmit}
          >
            <h3 className="text-lg font-semibold text-primary">{form.id ? 'Edit note' : 'Add note'}</h3>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Name</span>
              <input
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Type</span>
              <select
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as NoteType }))}
              >
                <option value="system">System</option>
                <option value="planet">Planet</option>
                <option value="base">Base</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Parent</span>
              <select
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.parentId ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value || null }))}
              >
                <option value="">No parent</option>
                {notes
                  .filter((note) => note.id !== form.id)
                  .map((note) => (
                    <option key={note.id} value={note.id}>
                      {note.name} ({note.type})
                    </option>
                  ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">System coords</span>
                <input
                  className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                  value={form.systemCoords}
                  onChange={(event) => setForm((prev) => ({ ...prev, systemCoords: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Galaxy index</span>
                <input
                  type="number"
                  min={1}
                  className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                  value={form.galaxyIndex}
                  onChange={(event) => setForm((prev) => ({ ...prev, galaxyIndex: event.target.value }))}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Notes</span>
              <textarea
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Resources</span>
              <div className="flex flex-wrap gap-2">
                {form.resources.map((resourceName) => (
                  <button
                    key={`form-resource-${resourceName}`}
                    type="button"
                    className="rounded-full border border-slate-600 px-3 py-1 text-xs hover:border-primary"
                    onClick={() => removeResourceFromForm(resourceName)}
                  >
                    {resourceName} ✕
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {resources.quickPick.map((resourceName) => (
                  <button
                    key={`quick-${resourceName}`}
                    type="button"
                    className="rounded-full border border-slate-600 px-3 py-1 text-xs hover:border-primary"
                    onClick={() => addResourceToForm(resourceName)}
                  >
                    {resourceName}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded border border-slate-700 bg-surface/80 px-3 py-2"
                  placeholder="Add resource"
                  value={resourceInput}
                  onChange={(event) => setResourceInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      if (resourceInput.trim()) {
                        addResourceToForm(resourceInput.trim())
                        setResourceInput('')
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="rounded border border-slate-600 px-3 py-2 hover:border-primary"
                  onClick={() => {
                    if (resourceInput.trim()) {
                      addResourceToForm(resourceInput.trim())
                      setResourceInput('')
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Links (one per line)</span>
              <textarea
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                rows={3}
                value={form.links}
                onChange={(event) => setForm((prev) => ({ ...prev, links: event.target.value }))}
              />
            </label>
            {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-600 px-4 py-2 hover:border-primary"
                onClick={() => {
                  setShowModal(false)
                  setForm(defaultNoteForm('system'))
                }}
              >
                Cancel
              </button>
              <button type="submit" className="rounded border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary/10">
                Save note
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export default Notes
