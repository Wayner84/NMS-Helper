import { useMemo, useState } from 'react'
import { useAppStore, getAllHints } from '../store/useAppStore'
import type { HintEntry } from '../types'
import VirtualList from '../components/VirtualList'
import { clsx } from 'clsx'

interface HintFormState {
  id: string
  title: string
  body: string
  tags: string
  sourceName: string
  url: string
}

const defaultHintForm = (): HintFormState => ({
  id: '',
  title: '',
  body: '',
  tags: '',
  sourceName: '',
  url: ''
})

const MAX_BODY_LENGTH = 280

const Hints = (): JSX.Element => {
  const { hints, customIds, upsertHint, removeHint, importHints } = useAppStore((state) => ({
    hints: getAllHints(state),
    customIds: new Set(state.hintCustom.map((hint) => hint.id)),
    upsertHint: state.upsertHint,
    removeHint: state.removeHint,
    importHints: state.importHints
  }))

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<HintFormState>(defaultHintForm())
  const [error, setError] = useState<string | null>(null)

  const tags = useMemo(() => {
    const set = new Set<string>()
    hints.forEach((hint) => hint.tags.forEach((tag) => set.add(tag)))
    return Array.from(set).sort()
  }, [hints])

  const filteredHints = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    return hints.filter((hint) => {
      if (tagFilter.size > 0) {
        const hasTags = hint.tags.some((tag) => tagFilter.has(tag))
        if (!hasTags) return false
      }
      if (!searchValue) return true
      return (
        hint.title.toLowerCase().includes(searchValue) ||
        hint.body.toLowerCase().includes(searchValue) ||
        hint.tags.some((tag) => tag.toLowerCase().includes(searchValue))
      )
    })
  }, [hints, search, tagFilter])

  const handleToggleTag = (tag: string) => {
    setTagFilter((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  const handleEdit = (hint: HintEntry) => {
    setForm({
      id: hint.id,
      title: hint.title,
      body: hint.body,
      tags: hint.tags.join(', '),
      sourceName: hint.sourceName ?? '',
      url: hint.url ?? ''
    })
    setShowModal(true)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and body are required.')
      return
    }
    if (form.body.trim().length > MAX_BODY_LENGTH) {
      setError(`Body must be ≤ ${MAX_BODY_LENGTH} characters.`)
      return
    }
    const hint: HintEntry = {
      id: form.id.trim() || `local-hint-${Date.now()}`,
      title: form.title.trim(),
      body: form.body.trim(),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      sourceName: form.sourceName.trim() || undefined,
      url: form.url.trim() || undefined
    }
    upsertHint(hint)
    setForm(defaultHintForm())
    setShowModal(false)
    setError(null)
  }

  const handleExport = async () => {
    try {
      const serialized = JSON.stringify(hints.filter((hint) => customIds.has(hint.id)), null, 2)
      await navigator.clipboard.writeText(serialized)
    } catch (err) {
      console.error('Failed to export hints', err)
    }
  }

  const handleImport = () => {
    // eslint-disable-next-line no-alert
    const value = window.prompt('Paste JSON array of hints to import')
    if (!value) return
    try {
      const parsed = JSON.parse(value) as HintEntry[]
      if (Array.isArray(parsed)) {
        importHints(parsed)
      }
    } catch (err) {
      console.error('Invalid hints JSON', err)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6 text-sm text-slate-200">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Search hints</span>
            <input
              type="search"
              className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
              placeholder="Economy, refiner..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-end gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-600 px-3 py-2 hover:border-primary"
              onClick={() => {
                setForm(defaultHintForm())
                setShowModal(true)
              }}
            >
              Add hint
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-600 px-3 py-2 hover:border-primary"
              onClick={handleExport}
            >
              Export custom hints
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
        <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-400">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={clsx(
                'rounded-full border px-3 py-1',
                tagFilter.has(tag)
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
        {filteredHints.length === 0 ? (
          <p className="text-sm text-slate-400">No hints found.</p>
        ) : (
          <VirtualList
            items={filteredHints}
            estimateSize={140}
            renderRow={(hint) => (
              <article
                key={hint.id}
                className="mb-3 rounded border border-slate-700 bg-surface/60 p-4 text-sm text-slate-200"
              >
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-primary">{hint.title}</h3>
                    <p className="mt-2 text-sm text-slate-200">{hint.body}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {customIds.has(hint.id) ? (
                      <>
                        <button
                          type="button"
                          className="rounded border border-slate-600 px-2 py-1 hover:border-primary"
                          onClick={() => handleEdit(hint)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-600 px-2 py-1 hover:border-primary"
                          onClick={() => removeHint(hint.id)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="rounded border border-slate-600 px-2 py-1 text-slate-400">Seed</span>
                    )}
                  </div>
                </header>
                <footer className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                  {hint.tags.map((tag) => (
                    <span key={`${hint.id}-${tag}`} className="rounded-full border border-slate-600 px-2 py-1">
                      {tag}
                    </span>
                  ))}
                  {hint.sourceName ? <span>Source: {hint.sourceName}</span> : null}
                  {hint.url ? (
                    <a href={hint.url} target="_blank" rel="noreferrer" className="text-primary">
                      Link
                    </a>
                  ) : null}
                </footer>
              </article>
            )}
          />
        )}
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <form
            className="w-full max-w-lg space-y-4 rounded-xl border border-slate-700 bg-surface p-6 text-sm text-slate-200"
            onSubmit={handleSubmit}
          >
            <h3 className="text-lg font-semibold text-primary">{form.id ? 'Edit hint' : 'Add hint'}</h3>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Title</span>
              <input
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Body</span>
              <textarea
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                rows={4}
                value={form.body}
                onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
                maxLength={MAX_BODY_LENGTH}
                required
              />
              <span className="text-right text-xs text-slate-500">
                {form.body.length}/{MAX_BODY_LENGTH}
              </span>
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
              <span className="text-xs uppercase tracking-wide text-slate-400">Source</span>
              <input
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.sourceName}
                onChange={(event) => setForm((prev) => ({ ...prev, sourceName: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">URL</span>
              <input
                className="rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                type="url"
              />
            </label>
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-600 px-4 py-2 hover:border-primary"
                onClick={() => {
                  setShowModal(false)
                  setForm(defaultHintForm())
                  setError(null)
                }}
              >
                Cancel
              </button>
              <button type="submit" className="rounded border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary/10">
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export default Hints
