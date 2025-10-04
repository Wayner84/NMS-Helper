import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { clsx } from 'clsx'
import { TabId, useAppStore } from './store/useAppStore'

const RefinerPage = lazy(() => import('./pages/Refiner'))
const CraftingPage = lazy(() => import('./pages/Crafting'))
const CookingPage = lazy(() => import('./pages/Cooking'))
const PlannerPage = lazy(() => import('./pages/Planner'))
const PortalsPage = lazy(() => import('./pages/Portals'))
const HintsPage = lazy(() => import('./pages/Hints'))
const NotesPage = lazy(() => import('./pages/Notes'))

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'refiner', label: 'Refiner' },
  { id: 'crafting', label: 'Crafting' },
  { id: 'cooking', label: 'Cooking' },
  { id: 'planner', label: 'Planner' },
  { id: 'portals', label: 'Portals' },
  { id: 'hints', label: 'Hints' },
  { id: 'notes', label: 'Notes' }
]

const tabComponents: Record<TabId, ReactNode> = {
  refiner: <RefinerPage />,
  crafting: <CraftingPage />,
  cooking: <CookingPage />,
  planner: <PlannerPage />,
  portals: <PortalsPage />,
  hints: <HintsPage />,
  notes: <NotesPage />
}

const TabFallback = () => (
  <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    <p className="ml-4 text-lg text-slate-300">Loading section…</p>
  </div>
)

const App = (): JSX.Element => {
  const { ready, theme, activeTab, setTab, toggleTheme } = useAppStore((state) => ({
    ready: state.ready,
    theme: state.theme,
    activeTab: state.activeTab,
    setTab: state.setTab,
    toggleTheme: state.toggleTheme
  }))

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const offset = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + offset + tabs.length) % tabs.length
    tabRefs.current[nextIndex]?.focus()
    setTab(tabs[nextIndex].id)
  }

  const content = useMemo(() => tabComponents[activeTab], [activeTab])

  return (
    <div className="min-h-screen bg-surface text-slate-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-slate-900">
        Skip to content
      </a>
      <header className="border-b border-slate-800 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">No Man&apos;s Sky Helper</h1>
            <p className="text-sm text-slate-400">
              Offline-ready tools for refining, crafting, cooking, planning tech layouts, portal research, hints, and notes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-slate-700 bg-surface/60 px-4 py-2 text-sm font-medium hover:border-primary focus-visible:outline-none"
            >
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>
        <nav
          className="mx-auto mt-2 flex max-w-6xl flex-wrap gap-2 px-4 pb-3"
          role="tablist"
          aria-label="Primary navigation"
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setTab(tab.id)}
              onKeyDown={handleKeyDown(index)}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'border border-slate-700 bg-surface/70 text-slate-300 hover:border-primary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main id="main" className="mx-auto flex max-w-6xl flex-1 flex-col px-4 pb-16 pt-6" role="presentation">
        {!ready ? (
          <TabFallback />
        ) : (
          <section role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}> 
            <Suspense fallback={<TabFallback />}>{content}</Suspense>
          </section>
        )}
      </main>
      <footer className="border-t border-slate-800 bg-surface/80 py-6 text-center text-xs text-slate-500">
        Community-sourced data. Verify portal addresses before travel. Works offline after first load.
      </footer>
    </div>
  )
}

export default App
