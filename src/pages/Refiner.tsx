import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { clsx } from 'clsx'
import { useAppStore } from '../store/useAppStore'
import type { Item, RefinerRecipe } from '../types'

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

interface RefiningStep {
  id: string
  depth: number
  name: string
  output: { itemId: string; itemName: string; qty: number }
  runs: number
  timeSeconds: number
  inputs: Array<{ itemId: string; itemName: string; qty: number }>
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

const Refiner = (): ReactElement => {
  const { itemsMap, refinerRecipes } = useAppStore((state) => ({
    itemsMap: state.itemsMap,
    refinerRecipes: state.refinerRecipes
  }))

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

  const activeRecipe = useMemo(
    () => (selectedRecipeId ? refinerRecipes.find((recipe) => recipe.id === selectedRecipeId) : undefined),
    [selectedRecipeId, refinerRecipes]
  )

  const activeOutputItem = activeRecipe ? itemsMap.get(activeRecipe.output.item) : undefined
  const runsRequired = activeRecipe ? Math.max(1, Math.ceil(desiredOutputQty / activeRecipe.output.qty)) : 0
  const actualOutputQty = activeRecipe ? runsRequired * activeRecipe.output.qty : 0
  const totalTimeSeconds = activeRecipe ? activeRecipe.timeSeconds * runsRequired : 0

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

  const refiningSteps = useMemo(() => {
    if (!recipeTree) return []

    const steps: RefiningStep[] = []

    const walk = (node: RefinerTreeNode, depth: number) => {
      if (!node.recipe) return

      steps.push({
        id: node.recipe.id,
        depth,
        name: node.recipe.name ?? node.itemName,
        output: { itemId: node.itemId, itemName: node.itemName, qty: node.actualQuantity },
        runs: node.runs,
        timeSeconds: node.timeSeconds,
        inputs: node.recipe.inputs.map((input) => ({
          itemId: input.item,
          itemName: getItemName(itemsMap, input.item),
          qty: input.qty * node.runs
        }))
      })

      node.children.forEach((child) => walk(child, depth + 1))
    }

    walk(recipeTree, 0)

    return steps.sort((a, b) => {
      if (a.depth !== b.depth) return b.depth - a.depth
      return a.name.localeCompare(b.name)
    })
  }, [itemsMap, recipeTree])

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
        const normalizedRecipe = (recipe.name ?? '').toLowerCase()
        if (normalizedRecipe.includes(query)) return true
        return recipe.output.item.toLowerCase().includes(query)
      })
      .sort((a, b) => a.outputName.localeCompare(b.outputName))
      .slice(0, 50)
  }, [itemsMap, recipeSearch, refinerRecipes])

  const hasRecipeQuery = recipeSearch.trim().length > 0

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Find a recipe</h2>
            <p className="text-sm text-slate-400">Search for an output item to see the raw inputs and steps.</p>
          </div>
          <label className="flex flex-col gap-2 text-sm sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-500">Output item</span>
              <input
                type="search"
                value={recipeSearch}
                onChange={(event) => setRecipeSearch(event.target.value)}
                placeholder="e.g. Chromatic Metal"
                className="w-full rounded border border-slate-600 bg-surface/80 px-3 py-2"
              />
            </div>
          </label>
          {hasRecipeQuery ? (
            recipeMatches.length > 0 ? (
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
                          setDesiredOutputQty(recipe.output.qty)
                        }}
                      >
                        <span className="font-semibold">{outputName}</span>
                        <span className="text-xs text-slate-400">
                          {recipe.inputs
                            .map((input) => {
                              const name = itemsMap.get(input.item)?.name ?? input.item
                              return `${input.qty} × ${name}`
                            })
                            .join(' + ')}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No recipes match that search. Try a different item name.</p>
            )
          ) : (
            <p className="text-sm text-slate-400">Start typing an item name to browse refiner outputs.</p>
          )}
        </div>
      </section>

      {activeRecipe && activeOutputItem ? (
        <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-100">{activeOutputItem.name}</h3>
                <p className="text-sm text-slate-400">Plan how much you want and follow the refining steps below.</p>
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
                <h4 className="text-base font-semibold text-slate-100">Base resources</h4>
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
                            <p className="text-xs uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                            <p className="text-sm font-semibold text-slate-100">{step.name}</p>
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
                          <p>Output: {step.output.qty.toLocaleString()} × {step.output.itemName}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">No refining needed — collect the base resources.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-slate-700 bg-surface/50 p-6 text-sm text-slate-400">
          Choose a recipe to see its materials and instructions.
        </section>
      )}
    </div>
  )
}

export default Refiner
