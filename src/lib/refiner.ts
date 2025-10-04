import { Item, RefinerRecipe } from '../types'

export interface RefinerSlotState {
  itemId: string | null
  qty: number
}

export interface RefinerChainSuggestion {
  steps: RefinerRecipe[]
  totalTime: number
  totalValue: number
  valuePerHour: number
}

export const matchRefinerRecipe = (
  inputs: RefinerSlotState[],
  recipes: RefinerRecipe[]
): RefinerRecipe | undefined => {
  const activeInputs = inputs.filter((slot) => slot.itemId)
  if (activeInputs.length === 0) return undefined
  const normalized = activeInputs
    .map((slot) => `${slot.itemId}:${slot.qty}`)
    .sort()
    .join('|')
  return recipes.find((recipe) => {
    if (recipe.inputs.length !== activeInputs.length) return false
    const recipeKey = recipe.inputs
      .map((input) => `${input.item}:${input.qty}`)
      .sort()
      .join('|')
    return recipeKey === normalized
  })
}

export const computeValuePerHour = (
  recipe: RefinerRecipe,
  items: Map<string, Item>
): number => {
  const outputItem = items.get(recipe.output.item)
  if (!outputItem) return 0
  const totalValue = outputItem.value * recipe.output.qty
  if (!recipe.timeSeconds) return totalValue
  const perHour = (totalValue / recipe.timeSeconds) * 3600
  return Math.round(perHour * 100) / 100
}

const cloneAvailable = (available: Set<string>): Set<string> => new Set(available)

export const suggestRefinerChains = (
  inputs: RefinerSlotState[],
  recipes: RefinerRecipe[],
  items: Map<string, Item>,
  maxDepth = 3,
  maxSuggestions = 5
): RefinerChainSuggestion[] => {
  const baseItems = inputs.filter((slot) => slot.itemId).map((slot) => slot.itemId as string)
  const available = new Set(baseItems)
  const queue: Array<{
    available: Set<string>
    steps: RefinerRecipe[]
    time: number
    value: number
  }> = [
    { available, steps: [], time: 0, value: 0 }
  ]
  const results: RefinerChainSuggestion[] = []
  const visited = new Set<string>()

  while (queue.length > 0) {
    const state = queue.shift()!
    const key = [...state.available].sort().join(',') + `|${state.steps.length}`
    if (visited.has(key)) continue
    visited.add(key)

    if (state.steps.length > 0) {
      const valuePerHour = state.time === 0 ? state.value : (state.value / state.time) * 3600
      results.push({
        steps: state.steps,
        totalTime: state.time,
        totalValue: state.value,
        valuePerHour: Math.round(valuePerHour * 100) / 100
      })
    }

    if (state.steps.length >= maxDepth) continue

    recipes.forEach((recipe) => {
      const canCraft = recipe.inputs.every((input) => state.available.has(input.item))
      if (!canCraft) return
      const nextAvailable = cloneAvailable(state.available)
      nextAvailable.add(recipe.output.item)
      const nextSteps = [...state.steps, recipe]
      const outputItem = items.get(recipe.output.item)
      const addedValue = (outputItem?.value ?? 0) * recipe.output.qty
      queue.push({
        available: nextAvailable,
        steps: nextSteps,
        time: state.time + recipe.timeSeconds,
        value: state.value + addedValue
      })
    })
  }

  return results
    .sort((a, b) => b.valuePerHour - a.valuePerHour)
    .slice(0, maxSuggestions)
}
