import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { CraftingRecipe, Item } from '../types'
import { clsx } from 'clsx'

interface RequirementEntry {
  item: Item
  required: number
}

const Crafting = (): JSX.Element => {
  const { craftingRecipes, itemsMap } = useAppStore((state) => ({
    craftingRecipes: state.craftingRecipes,
    itemsMap: state.itemsMap
  }))

  const recipeMap = useMemo(() => {
    const map = new Map<string, CraftingRecipe>()
    craftingRecipes.forEach((recipe) => map.set(recipe.id, recipe))
    return map
  }, [craftingRecipes])

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(craftingRecipes[0]?.id ?? '')
  const [haveMap, setHaveMap] = useState<Record<string, number>>({})

  const selectedRecipe = selectedRecipeId ? recipeMap.get(selectedRecipeId) : undefined

  const aggregateRequirements = useMemo(() => {
    const requirements = new Map<string, RequirementEntry>()

    const walkRecipe = (recipe: CraftingRecipe, multiplier: number) => {
      recipe.components.forEach((component) => {
        const totalQty = component.qty * multiplier
        if (component.viaRecipe) {
          const subRecipe = recipeMap.get(component.viaRecipe)
          if (subRecipe) {
            walkRecipe(subRecipe, totalQty)
            return
          }
        }
        const item = itemsMap.get(component.item)
        if (!item) return
        const existing = requirements.get(component.item)
        const required = (existing?.required ?? 0) + totalQty
        requirements.set(component.item, { item, required })
      })
    }

    if (selectedRecipe) {
      walkRecipe(selectedRecipe, selectedRecipe.output.qty)
    }

    return Array.from(requirements.values()).sort((a, b) => a.item.name.localeCompare(b.item.name))
  }, [itemsMap, recipeMap, selectedRecipe])

  const updateHave = (itemId: string, value: number) => {
    setHaveMap((prev) => ({ ...prev, [itemId]: Math.max(0, Math.round(value)) }))
  }

  const shoppingLines = aggregateRequirements
    .map(({ item, required }) => {
      const have = haveMap[item.id] ?? 0
      const need = Math.max(required - have, 0)
      return need > 0 ? `${item.name} × ${need}` : null
    })
    .filter(Boolean) as string[]

  const copyShoppingList = async () => {
    const text = shoppingLines.join('\n') || 'All components satisfied.'
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Clipboard copy failed', error)
    }
  }

  const renderComponents = (
    recipe: CraftingRecipe,
    multiplier: number,
    depth = 0
  ): JSX.Element => (
    <details key={`${recipe.id}-${depth}-${multiplier}`} open className="rounded border border-slate-700 bg-surface/70 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        {recipe.name} × {multiplier}
      </summary>
      <ul className="mt-3 space-y-3 pl-3">
        {recipe.components.map((component) => {
          const item = itemsMap.get(component.item)
          const label = item?.name ?? component.item
          const totalQty = component.qty * multiplier
          const viaRecipe = component.viaRecipe ? recipeMap.get(component.viaRecipe) : undefined

          if (viaRecipe) {
            return (
              <li key={`${recipe.id}-${component.item}-${component.viaRecipe}`}>
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Sub-component</div>
                {renderComponents(viaRecipe, totalQty, depth + 1)}
              </li>
            )
          }

          const have = haveMap[component.item] ?? 0
          const need = Math.max(totalQty - have, 0)
          const value = (item?.value ?? 0) * totalQty

          return (
            <li
              key={`${recipe.id}-${component.item}-${depth}`}
              className="rounded border border-slate-700 bg-surface/60 p-3 text-sm text-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-slate-400">{value.toLocaleString()} units value</span>
              </div>
              <div className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
                <span>Required: {totalQty}</span>
                <label className="flex items-center gap-2">
                  <span>Have</span>
                  <input
                    type="number"
                    min={0}
                    className="w-20 rounded border border-slate-600 bg-surface/70 px-2 py-1"
                    value={have}
                    onChange={(event) => updateHave(component.item, Number(event.target.value))}
                  />
                </label>
                <span>Need: {need}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </details>
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
        <div className="flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Select recipe</span>
            <select
              className="w-full rounded border border-slate-700 bg-surface/80 px-3 py-2"
              value={selectedRecipeId}
              onChange={(event) => setSelectedRecipeId(event.target.value)}
            >
              {craftingRecipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
          </label>
          {selectedRecipe ? (
            <div className="flex flex-col gap-4">
              <div className="rounded border border-slate-700 bg-surface/60 p-4">
                <h2 className="text-lg font-semibold text-slate-100">Shopping list</h2>
                <p className="mt-1 text-xs text-slate-400">Track what you already have, then copy the remaining list.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {aggregateRequirements.map(({ item, required }) => {
                    const have = haveMap[item.id] ?? 0
                    const need = Math.max(required - have, 0)
                    return (
                      <div
                        key={`agg-${item.id}`}
                        className={clsx(
                          'flex flex-col gap-1 rounded border border-slate-700 px-3 py-2 text-sm',
                          need > 0 ? 'bg-surface/60 text-slate-200' : 'bg-surface/40 text-slate-400'
                        )}
                      >
                        <span className="font-medium">{item.name}</span>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Required {required}</span>
                          <span>Need {need}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                  onClick={copyShoppingList}
                >
                  Copy shopping list
                </button>
              </div>
              <div className="space-y-4">
                {renderComponents(selectedRecipe, selectedRecipe.output.qty)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No crafting recipe selected.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default Crafting
