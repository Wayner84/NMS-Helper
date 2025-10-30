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
  const [activeMethods, setActiveMethods] = useState<Array<keyof CookingRecipe>>([])

  const filteredIngredients = ingredientList.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(ingredientFilter.toLowerCase())
  )

  const toggleMethod = (method: keyof CookingRecipe) => {
    setActiveMethods((methods) =>
      methods.includes(method) ? methods.filter((item) => item !== method) : [...methods, method]
    )
  }

  const hasActiveMethodFilters = activeMethods.length > 0

  const dishQuery = dishSearch.trim().toLowerCase()

  const displayedRecipes = useMemo(() => {
    const recipesForIngredient = selectedIngredient
      ? ingredientIndex.get(selectedIngredient) ?? []
      : cookingRecipes

    return recipesForIngredient.filter((recipe) => {
      const matchesMethod =
        !hasActiveMethodFilters || activeMethods.some((method) => Boolean(recipe[method]))

      if (!matchesMethod) {
        return false
      }

      if (dishQuery === '') {
        return true
      }

      const recipeName = recipe.name.toLowerCase()
      if (recipeName.includes(dishQuery)) {
        return true
      }

      return recipe.inputs.some((input) => {
        const itemName = itemsMap.get(input.item)?.name.toLowerCase()
        return itemName?.includes(dishQuery) ?? false
      })
    })
  }, [activeMethods, cookingRecipes, dishQuery, hasActiveMethodFilters, ingredientIndex, itemsMap, selectedIngredient])

  const selectedIngredientInfo = selectedIngredient
    ? ingredientList.find((ingredient) => ingredient.id === selectedIngredient) ?? null
    : null

  const selectedIngredientUsage = selectedIngredient
    ? ingredientIndex.get(selectedIngredient)?.length ?? 0
    : cookingRecipes.length

  const clearFilters = () => {
    setSelectedIngredient(null)
    setDishSearch('')
    setIngredientFilter('')
    setActiveMethods([])
  }

  const hasActiveFilters =
    selectedIngredient !== null || dishQuery !== '' || ingredientFilter.trim() !== '' || hasActiveMethodFilters

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
              'mb-2 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm',
              selectedIngredient === null
                ? 'bg-primary text-slate-900'
                : 'bg-surface/60 text-slate-300 hover:bg-surface/80'
            )}
          >
            <span>All ingredients</span>
            <span className="text-xs text-slate-400">{cookingRecipes.length}</span>
          </button>
          <ul className="space-y-2 text-sm">
            {filteredIngredients.map((ingredient) => (
              <li key={ingredient.id}>
                <button
                  type="button"
                  className={clsx(
                    'flex w-full items-center justify-between rounded px-3 py-2 text-left',
                    selectedIngredient === ingredient.id
                      ? 'bg-primary text-slate-900'
                      : 'bg-surface/60 text-slate-300 hover:bg-surface/80'
                  )}
                  onClick={() => setSelectedIngredient(ingredient.id)}
                >
                  <span>{ingredient.name}</span>
                  <span className="text-xs text-slate-400">
                    {ingredientIndex.get(ingredient.id)?.length ?? 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="space-y-6">
        <div className="rounded-xl border border-slate-700 bg-surface/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-100">Dishes</h2>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                  {displayedRecipes.length} shown
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Browse by ingredient, narrow by cooking method, or search by dish name or ingredient.
              </p>
              {selectedIngredientInfo ? (
                <div className="rounded-lg border border-slate-700 bg-surface/60 px-3 py-2 text-xs text-slate-300">
                  <p className="font-semibold text-slate-100">{selectedIngredientInfo.name}</p>
                  <p>Used in {selectedIngredientUsage} recipes.</p>
                </div>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              <label className="flex-1 text-xs uppercase tracking-wide text-slate-400">
                Search dishes
                <input
                  type="search"
                  className="mt-1 w-full rounded border border-slate-700 bg-surface/80 px-3 py-2 text-sm"
                  placeholder="Search by dish or ingredient"
                  value={dishSearch}
                  onChange={(event) => setDishSearch(event.target.value)}
                />
              </label>
              <div className="flex flex-1 flex-col gap-2 text-xs">
                <span className="uppercase tracking-wide text-slate-400">Cooking methods</span>
                <div className="flex flex-wrap gap-2">
                  {methodLabels.map((method) => {
                    const isActive = activeMethods.includes(method.key)
                    return (
                      <button
                        type="button"
                        key={method.key}
                        className={clsx(
                          'rounded-full border px-3 py-1 text-xs font-semibold transition',
                          isActive
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-700 bg-surface/60 text-slate-300 hover:bg-surface/80'
                        )}
                        onClick={() => toggleMethod(method.key)}
                        aria-pressed={isActive}
                      >
                        {method.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            {hasActiveFilters ? (
              <span>Filters active. Showing the recipes that match all selections.</span>
            ) : (
              <span>Showing all recipes.</span>
            )}
            {hasActiveFilters ? (
              <button
                type="button"
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-surface/80"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {displayedRecipes.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed border-slate-700 bg-surface/50 p-6 text-center text-sm text-slate-400">
                No dishes match the current filters. Try adjusting your ingredient, method, or search filters.
              </div>
            ) : (
              <>
                {displayedRecipes.map((recipe) => (
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
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Cooking
