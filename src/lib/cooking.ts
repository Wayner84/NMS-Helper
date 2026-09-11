import type { CookingRecipe, Item } from '../types'

export const recipeMatchesQuery = (
  recipe: CookingRecipe,
  items: Map<string, Item>,
  query: string
): boolean => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const searchableNames = [
    recipe.name,
    items.get(recipe.output.item)?.name ?? recipe.output.item,
    ...recipe.inputs.map((input) => items.get(input.item)?.name ?? input.item)
  ]

  return searchableNames.some((name) => name.toLowerCase().includes(normalizedQuery))
}
