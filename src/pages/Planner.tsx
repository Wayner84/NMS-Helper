import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { scorePlannerGrid } from '../lib/planner'
import type { PlannerSlot, PlannerState } from '../types'
import { clsx } from 'clsx'

const Planner = (): JSX.Element => {
  const {
    planner,
    setPlannerPlatform,
    setPlannerGridSize,
    updatePlannerSlot,
    placeModule,
    pushBenchModule,
    removeBenchModule,
    suggestPlanner,
    importPlanner,
    techModules,
    techModuleMap
  } = useAppStore((state) => ({
    planner: state.planner,
    setPlannerPlatform: state.setPlannerPlatform,
    setPlannerGridSize: state.setPlannerGridSize,
    updatePlannerSlot: state.updatePlannerSlot,
    placeModule: state.placeModule,
    pushBenchModule: state.pushBenchModule,
    removeBenchModule: state.removeBenchModule,
    suggestPlanner: state.suggestPlanner,
    importPlanner: state.importPlanner,
    techModules: state.techModules,
    techModuleMap: state.techModuleMap
  }))

  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const moduleOptions = useMemo(
    () => techModules.filter((module) => module.platform === planner.platform),
    [techModules, planner.platform]
  )

  const uniquePlatforms = useMemo(
    () => Array.from(new Set(techModules.map((module) => module.platform))).sort(),
    [techModules]
  )

  const score = useMemo(() => scorePlannerGrid(planner.grid, techModuleMap), [planner.grid, techModuleMap])

  const handleSlotClick = (index: number) => {
    if (activeModuleId) {
      placeModule(index, activeModuleId)
      setActiveModuleId(null)
    } else {
      placeModule(index, null)
    }
  }

  const toggleSupercharge = (slot: PlannerSlot, index: number) => {
    updatePlannerSlot(index, { supercharged: !slot.supercharged })
  }

  const toggleSlotType = (slot: PlannerSlot, index: number) => {
    updatePlannerSlot(index, { type: slot.type === 'tech' ? 'cargo' : 'tech' })
  }

  const handleExport = async () => {
    const blob = JSON.stringify(planner, null, 2)
    try {
      await navigator.clipboard.writeText(blob)
      // eslint-disable-next-line no-alert
      alert('Planner configuration copied to clipboard.')
    } catch (error) {
      console.error('Clipboard copy failed', error)
    }
  }

  const handleImport = () => {
    // eslint-disable-next-line no-alert
    const value = window.prompt('Paste planner JSON')
    if (!value) return
    try {
      const parsed = JSON.parse(value) as PlannerState
      if (parsed && typeof parsed === 'object' && parsed.grid) {
        importPlanner(parsed)
      }
    } catch (error) {
      console.error('Invalid planner JSON', error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Platform</span>
            <select
              className="w-full rounded border border-slate-700 bg-surface/80 px-3 py-2"
              value={planner.platform}
              onChange={(event) => setPlannerPlatform(event.target.value)}
            >
              {uniquePlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Rows</span>
              <input
                type="number"
                min={1}
                max={8}
                className="w-full rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={planner.grid.rows}
                onChange={(event) => setPlannerGridSize(Number(event.target.value), planner.grid.cols)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Columns</span>
              <input
                type="number"
                min={1}
                max={8}
                className="w-full rounded border border-slate-700 bg-surface/80 px-3 py-2"
                value={planner.grid.cols}
                onChange={(event) => setPlannerGridSize(planner.grid.rows, Number(event.target.value))}
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <span>Current score: <strong>{score}</strong></span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full border border-slate-600 px-4 py-2 hover:border-primary"
            >
              Copy layout JSON
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-full border border-slate-600 px-4 py-2 hover:border-primary"
            >
              Import layout
            </button>
            <button
              type="button"
              onClick={suggestPlanner}
              className="rounded-full border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary/10"
            >
              Suggest best arrangement
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-700 bg-surface/70 p-4">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${planner.grid.cols}, minmax(72px, 1fr))`
            }}
          >
            {planner.grid.slots.map((slot, index) => {
              const module = slot.moduleId ? techModuleMap.get(slot.moduleId) : undefined
              return (
                <div
                  key={slot.id}
                  className={clsx(
                    'flex flex-col gap-2 rounded border p-2 text-xs',
                    slot.supercharged ? 'border-primary/70 bg-primary/5' : 'border-slate-700 bg-surface/80'
                  )}
                >
                  <button
                    type="button"
                    className="flex h-16 items-center justify-center rounded border border-dashed border-slate-600 bg-surface/60 px-2 text-center text-sm text-slate-200 hover:border-primary"
                    onClick={() => handleSlotClick(index)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      placeModule(index, null)
                    }}
                  >
                    {module ? module.name : activeModuleId ? 'Place module' : 'Empty slot'}
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded border border-slate-600 px-2 py-1 text-[11px] uppercase tracking-wide hover:border-primary"
                      onClick={() => toggleSlotType(slot, index)}
                    >
                      {slot.type}
                    </button>
                    <button
                      type="button"
                      aria-pressed={slot.supercharged}
                      className={clsx(
                        'rounded border px-2 py-1 text-[11px] uppercase tracking-wide',
                        slot.supercharged ? 'border-primary bg-primary/20 text-primary' : 'border-slate-600 hover:border-primary'
                      )}
                      onClick={() => toggleSupercharge(slot, index)}
                    >
                      SC
                    </button>
                  </div>
                  {module ? (
                    <dl className="space-y-1 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <dt>Base</dt>
                        <dd>{module.baseValue}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-slate-500">Adjacency boosts</dt>
                        <dd className="mt-1 space-y-1">
                          {Object.entries(module.adjacency).map(([id, value]) => (
                            <div key={`${module.id}-${id}`} className="flex justify-between">
                              <span>{techModuleMap.get(id)?.name ?? id}</span>
                              <span>{value}</span>
                            </div>
                          ))}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-700 bg-surface/70 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Module catalog</h3>
            <p className="text-xs text-slate-400">Select a module then click a slot to place it. Add extras to the bench.</p>
            <div className="mt-3 space-y-2 max-h-[240px] overflow-y-auto pr-2">
              {moduleOptions.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className={clsx(
                    'w-full rounded border px-3 py-2 text-left text-sm',
                    activeModuleId === module.id
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-slate-700 bg-surface/70 text-slate-200 hover:border-primary'
                  )}
                  onClick={() => setActiveModuleId(module.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{module.name}</span>
                    <span className="text-xs text-slate-400">Base {module.baseValue}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">Tags: {module.tags.join(', ')}</div>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center rounded-full border border-slate-600 px-2 py-1 text-[11px] uppercase tracking-wide hover:border-primary"
                    onClick={(event) => {
                      event.stopPropagation()
                      pushBenchModule(module.id)
                    }}
                  >
                    Add to bench
                  </button>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface/70 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Bench modules</h3>
            {planner.benchModules.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">Add modules to the bench to keep them available for auto-placement.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {planner.benchModules.map((id, idx) => {
                  const module = techModuleMap.get(id)
                  return (
                    <li key={`${id}-${idx}`} className="flex items-center justify-between rounded border border-slate-700 bg-surface/70 px-3 py-2">
                      <span>{module?.name ?? id}</span>
                      <button
                        type="button"
                        className="rounded border border-slate-600 px-2 py-1 text-xs hover:border-primary"
                        onClick={() => removeBenchModule(id)}
                      >
                        Remove
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

export default Planner
