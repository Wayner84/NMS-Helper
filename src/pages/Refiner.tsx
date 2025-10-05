import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { clsx } from 'clsx'
import { useAppStore } from '../store/useAppStore'
import type { Item } from '../types'
import {
  MissingCanonicalRecipeError,
  RefinerPlannerMode,
  buildCanonicalIndex,
  planRefiner
} from '../lib/refinerPlanner'

const MODE_STORAGE_KEY = 'nms-helper-refiner-mode'

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

const getItemName = (items: Map<string, Item>, itemId: string): string =>
  items.get(itemId)?.name ?? itemId

const modeDescription: Record<RefinerPlannerMode, string> = {
  strict: 'Strict Mode only uses locked canonical recipes and keeps the plan to a single refiner step.',
  synthesis:
    'Synthesis Mode allows limited expansion (depth ≤ 2) of canonical recipes while respecting category guards.'
}

const Refiner = (): ReactElement => {
  const {
    itemsMap,
    canonicalRecipes,
    itemCategories,
    applyCanonicalRecipePatch,
    reloadCanonicalRecipes
  } = useAppStore((state) => ({
    itemsMap: state.itemsMap,
    canonicalRecipes: state.canonicalRecipes,
    itemCategories: state.itemCategories,
    applyCanonicalRecipePatch: state.applyCanonicalRecipePatch,
    reloadCanonicalRecipes: state.reloadCanonicalRecipes
  }))

  const canonicalIndex = useMemo(() => buildCanonicalIndex(canonicalRecipes), [canonicalRecipes])

  const [recipeSearch, setRecipeSearch] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [desiredOutputQty, setDesiredOutputQty] = useState(1)
  const [mode, setMode] = useState<RefinerPlannerMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(MODE_STORAGE_KEY)
      if (stored === 'synthesis') return 'synthesis'
    }
    return 'strict'
  })
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminRecipeId, setAdminRecipeId] = useState<string | null>(null)
  const [adminName, setAdminName] = useState('')
  const [adminQuantity, setAdminQuantity] = useState(1)
  const [adminTime, setAdminTime] = useState(0)
  const [adminRefiner, setAdminRefiner] = useState<'Portable' | 'Medium' | 'Large'>('Portable')
  const [adminLocked, setAdminLocked] = useState(false)
  const [adminInputs, setAdminInputs] = useState('[]')
  const [adminError, setAdminError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode)
    }
  }, [mode])

  useEffect(() => {
    if (selectedRecipeId || canonicalRecipes.length === 0) return
    setSelectedRecipeId(canonicalRecipes[0].id)
  }, [canonicalRecipes, selectedRecipeId])

  const activeRecipe = useMemo(
    () => (selectedRecipeId ? canonicalRecipes.find((recipe) => recipe.id === selectedRecipeId) : undefined),
    [selectedRecipeId, canonicalRecipes]
  )

  const activeOutputItem = activeRecipe ? itemsMap.get(activeRecipe.output) : undefined

  const planOutcome = useMemo(() => {
    if (!activeRecipe) return { plan: null, error: null }
    try {
      const plan = planRefiner(
        { itemId: activeRecipe.output, quantity: desiredOutputQty, recipeId: activeRecipe.id },
        {
          mode,
          canonicalIndex,
          categories: itemCategories,
          maxDepth: mode === 'synthesis' ? 2 : 0
        }
      )
      return { plan, error: null }
    } catch (error) {
      if (error instanceof MissingCanonicalRecipeError) {
        return { plan: null, error: 'No canonical recipe available for this item.' }
      }
      console.error('Failed to plan refiner steps', error)
      return { plan: null, error: 'Unable to build a plan. Try a different recipe or reload the dataset.' }
    }
  }, [activeRecipe, desiredOutputQty, mode, canonicalIndex, itemCategories])

  const planResult = planOutcome.plan
  const planError = planOutcome.error

  const runsRequired = planResult?.steps.find((step) => step.depth === 0)?.runs ?? 0
  const actualOutputQty = planResult?.outputQty ?? 0
  const totalTimeSeconds = planResult?.totalTimeSeconds ?? 0

  const baseMaterials = useMemo(() => {
    if (!planResult) return []
    return planResult.baseMaterials
      .map((entry) => ({
        itemId: entry.itemId,
        itemName: getItemName(itemsMap, entry.itemId),
        qty: entry.qty
      }))
      .sort((a, b) => a.itemName.localeCompare(b.itemName))
  }, [planResult, itemsMap])

  const refiningSteps = useMemo(() => {
    if (!planResult) return []
    return planResult.steps.map((step) => ({
      id: step.recipe.id,
      depth: step.depth,
      name: step.recipe.name ?? getItemName(itemsMap, step.recipe.output),
      runs: step.runs,
      timeSeconds: step.timeSeconds,
      refiner: step.recipe.refiner,
      locked: step.recipe.locked ?? false,
      inputs: step.inputs.map((input) => ({
        itemId: input.itemId,
        itemName: getItemName(itemsMap, input.itemId),
        qty: input.qty
      })),
      output: {
        itemId: step.recipe.output,
        itemName: getItemName(itemsMap, step.recipe.output),
        qty: step.outputQty
      }
    }))
  }, [planResult, itemsMap])

  const recipeMatches = useMemo(() => {
    const query = recipeSearch.trim().toLowerCase()
    if (!query) return []
    return canonicalRecipes
      .map((recipe) => ({
        recipe,
        outputName: getItemName(itemsMap, recipe.output)
      }))
      .filter(({ recipe, outputName }) => {
        const normalized = outputName.toLowerCase()
        if (normalized.includes(query)) return true
        const name = (recipe.name ?? '').toLowerCase()
        if (name.includes(query)) return true
        return recipe.output.toLowerCase().includes(query)
      })
      .sort((a, b) => a.outputName.localeCompare(b.outputName))
      .slice(0, 50)
  }, [recipeSearch, canonicalRecipes, itemsMap])

  const adminRecipe = useMemo(() => {
    const targetId = adminRecipeId ?? selectedRecipeId ?? canonicalRecipes[0]?.id ?? null
    return targetId ? canonicalRecipes.find((recipe) => recipe.id === targetId) : undefined
  }, [adminRecipeId, selectedRecipeId, canonicalRecipes])

  useEffect(() => {
    if (!showAdmin || !adminRecipe) return
    if (adminRecipeId !== adminRecipe.id) {
      setAdminRecipeId(adminRecipe.id)
    }
    setAdminName(adminRecipe.name ?? '')
    setAdminQuantity(adminRecipe.quantity)
    setAdminTime(adminRecipe.time_s)
    setAdminRefiner(adminRecipe.refiner)
    setAdminLocked(adminRecipe.locked ?? false)
    setAdminInputs(JSON.stringify(adminRecipe.inputs, null, 2))
    setAdminError(null)
  }, [showAdmin, adminRecipe, adminRecipeId])

  const handleApplyAdmin = () => {
    if (!adminRecipe) return
    try {
      const parsed = JSON.parse(adminInputs) as Array<{ item: string; qty: number }>
      if (!Array.isArray(parsed)) throw new Error('Inputs must be an array of { item, qty } objects.')
      const sanitizedInputs = parsed.map((entry) => {
        if (!entry.item || typeof entry.qty !== 'number') {
          throw new Error('Each input requires an item id and numeric quantity.')
        }
        return { item: entry.item, qty: Number(entry.qty) }
      })
      const quantity = Math.max(1, Math.round(Number(adminQuantity) || 1))
      const time = Math.max(0, Math.round(Number(adminTime) || 0))
      applyCanonicalRecipePatch(adminRecipe.id, {
        name: adminName.trim() ? adminName : undefined,
        quantity,
        time_s: time,
        refiner: adminRefiner,
        locked: adminLocked,
        inputs: sanitizedInputs
      })
      setAdminError(null)
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to apply override.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Find a recipe</h2>
            <p className="text-sm text-slate-400">Search for an output item to plan a refining run.</p>
          </div>
          <label className="flex flex-col gap-2 text-sm sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-500">Output item</span>
              <input
                type="search"
                value={recipeSearch}
                onChange={(event) => setRecipeSearch(event.target.value)}
                placeholder="e.g. Cadmium"
                className="w-full rounded border border-slate-600 bg-surface/80 px-3 py-2"
              />
            </div>
          </label>
          <div className="rounded-lg border border-slate-700 bg-surface/60 p-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-200">Recipe resolution mode</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="refiner-mode"
                  value="strict"
                  checked={mode === 'strict'}
                  onChange={() => setMode('strict')}
                />
                <span>Strict (recommended)</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="refiner-mode"
                  value="synthesis"
                  checked={mode === 'synthesis'}
                  onChange={() => setMode('synthesis')}
                />
                <span>Synthesis (advanced)</span>
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{modeDescription[mode]}</p>
          </div>
          {recipeMatches.length > 0 ? (
            <ul className="mt-1 divide-y divide-slate-800 overflow-hidden rounded border border-slate-800 text-sm">
              {recipeMatches.map(({ recipe, outputName }) => {
                const isActive = activeRecipe?.id === recipe.id
                return (
                  <li key={recipe.id}>
                    <button
                      type="button"
                      className={clsx(
                        'flex w-full flex-col gap-1 px-4 py-3 text-left transition',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface/60 text-slate-200 hover:bg-surface/80 hover:text-primary'
                      )}
                      onClick={() => {
                        setSelectedRecipeId(recipe.id)
                        setDesiredOutputQty(recipe.quantity)
                      }}
                    >
                      <span className="font-semibold">{outputName}</span>
                      <span className="text-xs text-slate-400">
                        {recipe.inputs
                          .map((input) => {
                            const name = getItemName(itemsMap, input.item)
                            return `${input.qty} × ${name}`
                          })
                          .join(' + ')}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : recipeSearch.trim().length > 0 ? (
            <p className="text-sm text-slate-400">No recipes match that search. Try a different item name.</p>
          ) : (
            <p className="text-sm text-slate-400">Start typing an item name to browse canonical refiner outputs.</p>
          )}
        </div>
      </section>

      {activeRecipe && activeOutputItem ? (
        <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-100">{activeOutputItem.name}</h3>
                <p className="text-sm text-slate-400">
                  {mode === 'strict'
                    ? 'Using the canonical recipe without any synthetic expansions.'
                    : 'Allowing limited synthesis routes while respecting category guards.'}
                </p>
              </div>
              <label className="flex flex-col gap-2 text-sm sm:w-48">
                <span className="text-xs uppercase tracking-wide text-slate-500">Desired quantity</span>
                <input
                  type="number"
                  min={1}
                  className="rounded border border-slate-600 bg-surface/80 px-3 py-2"
                  value={desiredOutputQty}
                  onChange={(event) =>
                    setDesiredOutputQty(Math.max(1, Math.round(Number(event.target.value) || 1)))
                  }
                />
              </label>
            </header>

            {planError ? (
              <p className="rounded border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">{planError}</p>
            ) : null}

            {planResult ? (
              <>
                <div className="grid gap-4 text-sm sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-700 bg-surface/60 p-4">
                    <span className="text-xs uppercase tracking-wide text-slate-500">Output produced</span>
                    <p className="mt-2 text-lg font-semibold text-slate-100">
                      {actualOutputQty.toLocaleString()} × {activeOutputItem.name}
                    </p>
                    {actualOutputQty !== desiredOutputQty ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Target {desiredOutputQty.toLocaleString()} crafted
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-surface/60 p-4">
                    <span className="text-xs uppercase tracking-wide text-slate-500">Runs required</span>
                    <p className="mt-2 text-lg font-semibold text-slate-100">{runsRequired.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-surface/60 p-4">
                    <span className="text-xs uppercase tracking-wide text-slate-500">Total time</span>
                    <p className="mt-2 text-lg font-semibold text-slate-100">
                      {totalTimeSeconds > 0 ? formatTime(totalTimeSeconds) : 'Instant'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-slate-100">Base resources</h4>
                      <button
                        type="button"
                        onClick={() => setShowAdmin((value) => !value)}
                        className="text-xs text-primary underline"
                      >
                        {showAdmin ? 'Hide admin tools' : 'Show admin tools'}
                      </button>
                    </div>
                    {baseMaterials.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-slate-200">
                        {baseMaterials.map((entry) => (
                          <li
                            key={`base-${entry.itemId}`}
                            className="flex items-center justify-between rounded border border-slate-700 bg-surface/60 px-3 py-2"
                          >
                            <span className="font-medium">{entry.itemName}</span>
                            <span className="text-xs text-slate-400">Qty {entry.qty.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">No base resources required.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-semibold text-slate-100">Refining steps</h4>
                    {refiningSteps.length > 0 ? (
                      <ol className="mt-3 space-y-3 text-sm text-slate-200">
                        {refiningSteps.map((step, index) => (
                          <li key={step.id} className="rounded border border-slate-700 bg-surface/60 px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                  Step {index + 1} · {step.refiner} refiner
                                </p>
                                <p className="text-sm font-semibold text-slate-100">{step.name}</p>
                                {mode === 'synthesis' ? (
                                  <p className="text-[11px] text-slate-400">
                                    Allowed by Synthesis Mode · depth {step.depth}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-slate-400">
                                    Canonical recipe · locked {step.locked ? 'yes' : 'no'}
                                  </p>
                                )}
                              </div>
                              {step.timeSeconds > 0 ? (
                                <span className="text-xs text-slate-400">{formatTime(step.timeSeconds)}</span>
                              ) : null}
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-slate-300">
                              <p>
                                Runs: <span className="font-mono text-slate-100">{step.runs.toLocaleString()}</span>
                              </p>
                              <p>
                                Inputs:{' '}
                                {step.inputs
                                  .map((input) => `${input.qty.toLocaleString()} × ${input.itemName}`)
                                  .join(', ')}
                              </p>
                              <p>
                                Output: {step.output.qty.toLocaleString()} × {step.output.itemName}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">No refining needed — collect the base resources.</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-700 bg-surface/70 p-6 text-sm text-slate-400">
          <p>Select a canonical recipe to see the plan.</p>
        </section>
      )}

      {showAdmin && adminRecipe ? (
        <section className="rounded-xl border border-amber-600 bg-amber-900/20 p-6 text-sm text-amber-100">
          <div className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <h4 className="text-base font-semibold text-amber-100">Admin overrides</h4>
              <p className="text-xs text-amber-200/80">
                Patch canonical recipes at runtime. Changes persist for this session until you reload the dataset.
              </p>
            </header>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-amber-200/80">Recipe</span>
              <select
                value={adminRecipeId ?? adminRecipe.id}
                onChange={(event) => setAdminRecipeId(event.target.value)}
                className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-amber-50"
              >
                {canonicalRecipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {getItemName(itemsMap, recipe.output)} ({recipe.id})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-amber-200/80">Display name</span>
                <input
                  type="text"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-amber-50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-amber-200/80">Refiner size</span>
                <select
                  value={adminRefiner}
                  onChange={(event) => setAdminRefiner(event.target.value as 'Portable' | 'Medium' | 'Large')}
                  className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-amber-50"
                >
                  <option value="Portable">Portable</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-amber-200/80">Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={adminQuantity}
                  onChange={(event) => setAdminQuantity(Math.max(1, Math.round(Number(event.target.value) || 1)))}
                  className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-amber-50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-amber-200/80">Time (seconds)</span>
                <input
                  type="number"
                  min={0}
                  value={adminTime}
                  onChange={(event) => setAdminTime(Math.max(0, Math.round(Number(event.target.value) || 0)))}
                  className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-amber-50"
                />
              </label>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-amber-100">
              <input
                type="checkbox"
                checked={adminLocked}
                onChange={(event) => setAdminLocked(event.target.checked)}
              />
              Locked (strict mode uses inputs as-is)
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-amber-200/80">Inputs (JSON)</span>
              <textarea
                value={adminInputs}
                onChange={(event) => setAdminInputs(event.target.value)}
                rows={6}
                className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 font-mono text-xs text-amber-50"
              />
            </label>
            {adminError ? <p className="text-xs text-red-200">{adminError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleApplyAdmin}
                className="rounded-full border border-amber-600 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-800/40"
              >
                Apply patch
              </button>
              <button
                type="button"
                onClick={() => {
                  reloadCanonicalRecipes()
                  setAdminRecipeId(null)
                }}
                className="rounded-full border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-800/40"
              >
                Reload canonical dataset
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default Refiner
