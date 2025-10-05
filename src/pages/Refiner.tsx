import { useEffect, useMemo, useState } from 'react'
import type { DragEvent, ReactElement } from 'react'
import { useAppStore } from '../store/useAppStore'
import { computeValuePerHour, matchRefinerRecipe } from '../lib/refiner'
import type { RefinerSlotState } from '../lib/refiner'
import type { Item, RefinerRecipe } from '../types'
import { clsx } from 'clsx'

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

interface RefinerTreeNode {
  itemId: string
  itemName: string
  desiredQuantity: number
  actualQuantity: number
  runs: number
  timeSeconds: number
  recipe?: RefinerRecipe
  children: RefinerTreeNode[]
}

const getItemName = (items: Map<string, Item>, itemId: string): string =>
  items.get(itemId)?.name ?? itemId

const buildNodeFromRecipe = (
  recipe: RefinerRecipe,
  desiredQty: number,
  recipesByOutput: Map<string, RefinerRecipe[]>,
  items: Map<string, Item>,
  visited: Set<string>
): RefinerTreeNode => {
  const runs = Math.max(1, Math.ceil(desiredQty / recipe.output.qty))
  const actualQuantity = runs * recipe.output.qty
  const nextVisited = new Set(visited)
  nextVisited.add(recipe.output.item)

  const children = recipe.inputs.map((input) =>
    buildNodeForItem(input.item, input.qty * runs, recipesByOutput, items, nextVisited)
  )

  return {
    itemId: recipe.output.item,
    itemName: getItemName(items, recipe.output.item),
    desiredQuantity: desiredQty,
    actualQuantity,
    runs,
    timeSeconds: recipe.timeSeconds * runs,
    recipe,
    children
  }
}

const buildNodeForItem = (
  itemId: string,
  quantity: number,
  recipesByOutput: Map<string, RefinerRecipe[]>,
  items: Map<string, Item>,
  visited: Set<string>
): RefinerTreeNode => {
  if (visited.has(itemId)) {
    return {
      itemId,
      itemName: getItemName(items, itemId),
      desiredQuantity: quantity,
      actualQuantity: quantity,
      runs: 0,
      timeSeconds: 0,
      children: []
    }
  }

  const options = recipesByOutput.get(itemId)
  if (!options || options.length === 0) {
    return {
      itemId,
      itemName: getItemName(items, itemId),
      desiredQuantity: quantity,
      actualQuantity: quantity,
      runs: 0,
      timeSeconds: 0,
      children: []
    }
  }

  const nextVisited = new Set(visited)
  nextVisited.add(itemId)
  return buildNodeFromRecipe(options[0], quantity, recipesByOutput, items, nextVisited)
}

const createRefinerTree = (
  recipe: RefinerRecipe,
  desiredQty: number,
  recipesByOutput: Map<string, RefinerRecipe[]>,
  items: Map<string, Item>
): RefinerTreeNode => buildNodeFromRecipe(recipe, desiredQty, recipesByOutput, items, new Set())

const collectBaseMaterials = (
  node: RefinerTreeNode,
  acc: Map<string, { itemId: string; itemName: string; qty: number }>
): void => {
  if (!node.recipe || node.children.length === 0) {
    const existing = acc.get(node.itemId)
    const nextQty = (existing?.qty ?? 0) + node.actualQuantity
    acc.set(node.itemId, { itemId: node.itemId, itemName: node.itemName, qty: nextQty })
    return
  }

  node.children.forEach((child) => collectBaseMaterials(child, acc))
}

const RefinerSlot = ({
  slot,
  index,
  items,
  onChangeItem,
  onChangeQty,
  onSwap
}: {
  slot: RefinerSlotState
  index: number
  items: Array<{ id: string; name: string }>
  onChangeItem: (index: number, itemId: string | null) => void
  onChangeQty: (index: number, qty: number) => void
  onSwap: (from: number, to: number) => void
}): ReactElement => {
  const [isDragging, setDragging] = useState(false)

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', String(index))
    setDragging(true)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const from = Number(event.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from)) {
      onSwap(from, index)
    }
    setDragging(false)
  }

  return (
    <div
      className={clsx(
        'flex min-w-[220px] flex-1 flex-col gap-2 rounded-lg border border-slate-700 bg-surface/60 p-4',
        isDragging && 'ring-2 ring-primary'
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">Input {index + 1}</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-primary"
            onClick={() => onSwap(index, (index + 1) % 3)}
          >
            Swap →
          </button>
          <button
            type="button"
            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-primary"
            onClick={() => onSwap(index, (index + 2) % 3)}
          >
            Swap ←
          </button>
        </div>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">Material</span>
        <select
          className="rounded border border-slate-600 bg-surface/80 px-3 py-2"
          value={slot.itemId ?? ''}
          onChange={(event) => onChangeItem(index, event.target.value || null)}
        >
          <option value="">— empty —</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">Quantity</span>
        <input
          type="number"
          min={1}
          className="w-full rounded border border-slate-600 bg-surface/80 px-3 py-2"
          value={slot.qty}
          onChange={(event) => onChangeQty(index, Number(event.target.value))}
        />
      </label>
    </div>
  )
}

const Refiner = (): ReactElement => {
  const {
    items,
    itemsMap,
    refinerRecipes,
    refinerSlots,
    setRefinerSlotItem,
    setRefinerSlotQty,
    swapRefinerSlots,
    clearRefinerSlots,
    loadRefinerRecipe
  } = useAppStore((state) => ({
    items: state.items,
    itemsMap: state.itemsMap,
    refinerRecipes: state.refinerRecipes,
    refinerSlots: state.refinerSlots,
    setRefinerSlotItem: state.setRefinerSlotItem,
    setRefinerSlotQty: state.setRefinerSlotQty,
    swapRefinerSlots: state.swapRefinerSlots,
    clearRefinerSlots: state.clearRefinerSlots,
    loadRefinerRecipe: state.loadRefinerRecipe
  }))

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items])

  const recipesByOutput = useMemo(() => {
    const map = new Map<string, RefinerRecipe[]>()
    refinerRecipes.forEach((recipe) => {
      const existing = map.get(recipe.output.item)
      if (existing) {
        existing.push(recipe)
      } else {
        map.set(recipe.output.item, [recipe])
      }
    })
    map.forEach((entries) =>
      entries.sort((a, b) => {
        if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds
        if (a.inputs.length !== b.inputs.length) return a.inputs.length - b.inputs.length
        return (a.name ?? a.output.item).localeCompare(b.name ?? b.output.item)
      })
    )
    return map
  }, [refinerRecipes])

  const [recipeSearch, setRecipeSearch] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [desiredOutputQty, setDesiredOutputQty] = useState(1)

  const currentRecipe = useMemo<RefinerRecipe | undefined>(
    () => matchRefinerRecipe(refinerSlots, refinerRecipes),
    [refinerSlots, refinerRecipes]
  )

  const selectedRecipe = useMemo(
    () => (selectedRecipeId ? refinerRecipes.find((recipe) => recipe.id === selectedRecipeId) : undefined),
    [selectedRecipeId, refinerRecipes]
  )

  const activeRecipe = selectedRecipe ?? currentRecipe
  const activeOutputItem = activeRecipe ? itemsMap.get(activeRecipe.output.item) : undefined
  const runsRequired = activeRecipe ? Math.max(1, Math.ceil(desiredOutputQty / activeRecipe.output.qty)) : 0
  const actualOutputQty = activeRecipe ? runsRequired * activeRecipe.output.qty : 0
  const totalTimeSeconds = activeRecipe ? activeRecipe.timeSeconds * runsRequired : 0
  const valuePerHour = activeRecipe ? computeValuePerHour(activeRecipe, itemsMap) : 0

  const recipeTree = useMemo(
    () =>
      activeRecipe
        ? createRefinerTree(activeRecipe, desiredOutputQty, recipesByOutput, itemsMap)
        : null,
    [activeRecipe, desiredOutputQty, recipesByOutput, itemsMap]
  )

  const baseMaterials = useMemo(() => {
    if (!recipeTree) return []
    const map = new Map<string, { itemId: string; itemName: string; qty: number }>()
    recipeTree.children.forEach((child) => collectBaseMaterials(child, map))
    return Array.from(map.values()).sort((a, b) => a.itemName.localeCompare(b.itemName))
  }, [recipeTree])

  useEffect(() => {
    if (!selectedRecipeId && currentRecipe) {
      setDesiredOutputQty((prev) => (prev === 1 ? currentRecipe.output.qty : prev))
    }
  }, [selectedRecipeId, currentRecipe])

  const renderTree = (node: RefinerTreeNode, depth = 0): ReactElement => {
    const key = node.recipe ? `recipe-${node.recipe.id}-${depth}` : `base-${node.itemId}-${depth}`
    if (!node.recipe || node.children.length === 0) {
      return (
        <li
          key={key}
          className="rounded border border-slate-700 bg-surface/60 p-3 text-sm text-slate-200"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{node.itemName}</span>
            <span className="text-xs text-slate-400">
              Qty {node.actualQuantity.toLocaleString()}
            </span>
          </div>
        </li>
      )
    }

    const showOverrun = node.actualQuantity > node.desiredQuantity

    return (
      <li key={key} className="rounded border border-slate-700 bg-surface/60 p-3 text-sm text-slate-200">
        <details open className="space-y-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">
            {node.recipe.name} → {node.itemName} × {node.actualQuantity.toLocaleString()}
          </summary>
          <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
            <span>Runs: {node.runs.toLocaleString()}</span>
            {showOverrun ? (
              <span>Target: {node.desiredQuantity.toLocaleString()}</span>
            ) : null}
            {node.timeSeconds > 0 ? <span>Time: {formatTime(node.timeSeconds)}</span> : null}
          </div>
          {node.children.length > 0 ? (
            <ul className="space-y-2 pl-3">
              {node.children.map((child) => renderTree(child, depth + 1))}
            </ul>
          ) : null}
        </details>
      </li>
    )
  }

  const recipeMatches = useMemo(() => {
    const query = recipeSearch.trim().toLowerCase()
    if (!query) return []

    return refinerRecipes
      .map((recipe) => ({
        recipe,
        outputName: itemsMap.get(recipe.output.item)?.name ?? recipe.name ?? recipe.output.item
      }))
      .filter(({ recipe, outputName }) => {
        const normalizedOutput = outputName.toLowerCase()
        if (normalizedOutput.includes(query)) return true
        const normalizedRecipe = recipe.name.toLowerCase()
        if (normalizedRecipe.includes(query)) return true
        return recipe.output.item.toLowerCase().includes(query)
      })
      .sort((a, b) => a.outputName.localeCompare(b.outputName))
      .slice(0, 25)
  }, [itemsMap, recipeSearch, refinerRecipes])

  const hasRecipeQuery = recipeSearch.trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Find a recipe</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pick an output item to see the required materials and refining steps.
            </p>
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-500">Output item</span>
            <input
              type="search"
              value={recipeSearch}
              onChange={(event) => setRecipeSearch(event.target.value)}
              placeholder="e.g. Chromatic Metal"
              className="w-full rounded border border-slate-600 bg-surface/80 px-3 py-2"
            />
          </label>
          {hasRecipeQuery ? (
            recipeMatches.length > 0 ? (
              <ul className="mt-2 space-y-2 text-sm">
                {recipeMatches.map(({ recipe, outputName }) => {
                  const isActive = activeRecipe?.id === recipe.id
                  return (
                    <li key={recipe.id}>
                      <button
                        type="button"
                        className={clsx(
                          'w-full rounded border px-3 py-3 text-left transition',
                          isActive
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-700 bg-surface/60 text-slate-200 hover:border-primary hover:text-primary'
                        )}
                        onClick={() => {
                          loadRefinerRecipe(recipe.id)
                          setSelectedRecipeId(recipe.id)
                          setDesiredOutputQty(recipe.output.qty)
                          setRecipeSearch('')
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">{outputName}</span>
                          <span className="text-xs text-slate-400">Plan recipe</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {recipe.inputs
                            .map((input) => {
                              const name = itemsMap.get(input.item)?.name ?? input.item
                              return `${input.qty} × ${name}`
                            })
                            .join(' + ')}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No recipes match that search. Try a different item name.</p>
            )
          ) : (
            <p className="text-sm text-slate-400">
              Search for an output or fill the refiner slots below to match a recipe.
            </p>
          )}

          {activeRecipe && activeOutputItem ? (
            <div className="space-y-4">
              <div className="rounded border border-slate-700 bg-surface/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">Plan output</h3>
                    <p className="text-xs text-slate-400">Adjust the quantity to calculate materials.</p>
                  </div>
                  <label className="flex flex-col gap-1 text-sm sm:w-48">
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
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded border border-slate-700 bg-surface/50 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Output</dt>
                    <dd className="mt-1 text-base font-semibold text-slate-100">
                      {activeOutputItem.name} × {actualOutputQty.toLocaleString()}
                    </dd>
                    {actualOutputQty !== desiredOutputQty ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Target {desiredOutputQty.toLocaleString()} crafted
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded border border-slate-700 bg-surface/50 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Runs required</dt>
                    <dd className="mt-1 text-base font-semibold text-slate-100">
                      {runsRequired.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded border border-slate-700 bg-surface/50 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Total time</dt>
                    <dd className="mt-1 text-base font-semibold text-slate-100">
                      {totalTimeSeconds > 0 ? formatTime(totalTimeSeconds) : 'Instant'}
                    </dd>
                  </div>
                  <div className="rounded border border-slate-700 bg-surface/50 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Value / hour</dt>
                    <dd className="mt-1 text-base font-semibold text-slate-100">
                      {valuePerHour.toLocaleString()} units
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded border border-slate-700 bg-surface/60 p-4">
                  <h3 className="text-base font-semibold text-slate-100">Base materials</h3>
                  {baseMaterials.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {baseMaterials.map((entry) => (
                        <li
                          key={`base-${entry.itemId}`}
                          className="flex items-center justify-between rounded border border-slate-700 bg-surface/40 px-3 py-2"
                        >
                          <span className="font-medium">{entry.itemName}</span>
                          <span className="text-xs text-slate-400">
                            Qty {entry.qty.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">No raw materials required for this recipe.</p>
                  )}
                </div>
                <div className="rounded border border-slate-700 bg-surface/60 p-4">
                  <h3 className="text-base font-semibold text-slate-100">Crafter components</h3>
                  {recipeTree ? (
                    <ul className="mt-3 space-y-3 text-sm text-slate-200">{renderTree(recipeTree)}</ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">Select a recipe to view the refining steps.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Load a recipe to view its material breakdown, or adjust the inputs below.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            {refinerSlots.map((slot, index) => (
              <RefinerSlot
                key={`refiner-slot-${index}`}
                slot={slot}
                index={index}
                items={sortedItems}
                onChangeItem={setRefinerSlotItem}
                onChangeQty={setRefinerSlotQty}
                onSwap={swapRefinerSlots}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                clearRefinerSlots()
                setSelectedRecipeId(null)
                setDesiredOutputQty(1)
              }}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-primary"
            >
              Clear slots
            </button>
            <div className="text-sm text-slate-400 sm:text-right">
              Drag inputs or use swap buttons to reorder. Keyboard users can Tab to a slot and activate the swap controls.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Refiner
