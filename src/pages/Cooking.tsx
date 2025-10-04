import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { CookingRecipe } from '../types'
import { clsx } from 'clsx'

const methodLabels: Array<{ key: keyof CookingRecipe; label: string; color: string }> = [
  { key: 'heated', label: 'Heated', color: 'bg-rose-500/20 text-rose-200' },
  { key: 'refined', label: 'Refined', color: 'bg-sky-500/20 text-sky-200' },
  { key: 'mixed', label: 'Mixed', color: 'bg-emerald-500/20 text-emerald-200' }
]

const Cooking = (): JSX.Element => {
  const { cookingRecipes, itemsMap } = useAppStore((state) => ({
    cookingRecipes: state.cookingRecipes,
    itemsMap: state.itemsMap
  }))

  const ingredientIndex = useMemo(() => {
    const index = new Map<string, CookingRecipe[]>()
    cookingRecipes.forEach((recipe) => {
      recipe.inputs.forEach((input) => {
        const existing = index.get(input.item) ?? []
        existing.push(recipe)
        index.set(input.item, existing)
      })
    })
    return index
  }, [cookingRecipes])

  const ingredientList = useMemo(
    () =>
      Array.from(ingredientIndex.keys())
        .map((id) => ({ id, name: itemsMap.get(id)?.name ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ingredientIndex, itemsMap]
  )

  const [ingredientFilter, setIngredientFilter] = useState('')
  const [dishSearch, setDishSearch] = useState('')
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)

  const filteredIngredients = ingredientList.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(ingredientFilter.toLowerCase())
  )

  const filteredRecipes = cookingRecipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(dishSearch.toLowerCase()) ||
    recipe.inputs.some((input) => itemsMap.get(input.item)?.name.toLowerCase().includes(dishSearch.toLowerCase()))
  )

  const ingredientRecipes = selectedIngredient ? ingredientIndex.get(selectedIngredient) ?? [] : cookingRecipes

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-xl border border-slate-700 bg-surface/70 p-5">
        <h2 className="text-lg font-semibold text-slate-100">Ingredients</h2>
        <label className="mt-3 block text-xs uppercase tracking-wide text-slate-400">Filter</label>
        <input
          type="search"
          placeholder="Search ingredients"
          className="mt-1 w-full rounded border border-slate-700 bg-surface/80 px-3 py-2 text-sm"
          value={ingredientFilter}
          onChange={(event) => setIngredientFilter(event.target.value)}
        />
        <div className="mt-4 max-h-[360px] overflow-y-auto pr-2">
          <button
            type="button"
            onClick={() => setSelectedIngredient(null)}
            className={clsx(
              'mb-2 w-full rounded px-3 py-2 text-left text-sm',
              selectedIngredient === null ? 'bg-primary text-slate-900' : 'bg-surface/60 text-slate-300 hover:bg-surface/80'
            )}
          >
            All ingredients
          </button>
          <ul className="space-y-2 text-sm">
            {filteredIngredients.map((ingredient) => (
              <li key={ingredient.id}>
                <button
                  type="button"
                  className={clsx(
                    'w-full rounded px-3 py-2 text-left',
                    selectedIngredient === ingredient.id
                      ? 'bg-primary text-slate-900'
                      : 'bg-surface/60 text-slate-300 hover:bg-surface/80'
                  )}
                  onClick={() => setSelectedIngredient(ingredient.id)}
                >
                  {ingredient.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="space-y-6">
        <div className="rounded-xl border border-slate-700 bg-surface/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Dishes</h2>
              <p className="text-xs text-slate-400">Browse by ingredient or search by dish name.</p>
            </div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Search dishes
              <input
                type="search"
                className="mt-1 w-full rounded border border-slate-700 bg-surface/80 px-3 py-2 text-sm"
                placeholder="e.g. stew"
                value={dishSearch}
                onChange={(event) => setDishSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {ingredientRecipes
              .filter((recipe) => filteredRecipes.includes(recipe))
              .map((recipe) => (
                <article
                  key={recipe.id}
                  className="rounded-lg border border-slate-700 bg-surface/60 p-4 text-sm text-slate-200 shadow-inner"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-primary">{recipe.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {methodLabels.map((method) =>
                        recipe[method.key] ? (
                          <span
                            key={method.key}
                            className={clsx('rounded-full px-2 py-1 text-xs font-semibold', method.color)}
                          >
                            {method.label}
                          </span>
                        ) : null
                      )}
                    </div>
                  </header>
                  <div className="mt-3">
                    <h4 className="text-xs uppercase tracking-wide text-slate-400">Ingredients</h4>
                    <ul className="mt-2 space-y-1">
                      {recipe.inputs.map((input) => (
                        <li key={`${recipe.id}-${input.item}`} className="flex justify-between gap-3 text-xs text-slate-300">
                          <span>{itemsMap.get(input.item)?.name ?? input.item}</span>
                          <span>× {input.qty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <footer className="mt-4 text-xs text-slate-400">
                    Output: {itemsMap.get(recipe.output.item)?.name ?? recipe.output.item} × {recipe.output.qty}
                  </footer>
                </article>
              ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Cooking
