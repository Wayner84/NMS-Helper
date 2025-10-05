import { describe, expect, it } from 'vitest'
import canonicalRecipesJson from '../data/recipes_canonical.json'
import itemCategoriesJson from '../data/item_categories.json'
import type { CanonicalRecipe, ItemCategoryMap } from '../types'
import { buildCanonicalIndex, planRefiner } from '../lib/refinerPlanner'

describe('refiner planner modes', () => {
  const canonicalRecipes = canonicalRecipesJson as CanonicalRecipe[]
  const itemCategories = itemCategoriesJson as ItemCategoryMap
  const canonicalIndex = buildCanonicalIndex(canonicalRecipes)

  it('strict cadmium plan stays minimal', () => {
    const plan = planRefiner(
      { itemId: 'cadmium', quantity: 2, recipeId: 'cadmium_double_refine' },
      { mode: 'strict', canonicalIndex, categories: itemCategories }
    )
    expect(plan.steps).toHaveLength(1)
    const baseIds = plan.baseMaterials.map((entry) => entry.itemId)
    expect(baseIds).toContain('cadmium')
    expect(baseIds).toContain('chromatic_metal')
    const hasGas = baseIds.some((id) => itemCategories[id] === 'Gas')
    expect(hasGas).toBe(false)
  })

  it('strict mode never introduces gas categories', () => {
    const plan = planRefiner(
      { itemId: 'cadmium', quantity: 1, recipeId: 'cadmium_double_refine' },
      { mode: 'strict', canonicalIndex, categories: itemCategories }
    )
    expect(plan.baseMaterials.every((entry) => itemCategories[entry.itemId] !== 'Gas')).toBe(true)
  })
})

describe('synthesis mode constraints', () => {
  const recipes: CanonicalRecipe[] = [
    {
      id: 'target',
      name: 'Target',
      output: 'target',
      quantity: 1,
      refiner: 'Medium',
      time_s: 30,
      inputs: [{ item: 'mid', qty: 1 }],
      locked: true
    },
    {
      id: 'mid-step',
      name: 'Mid',
      output: 'mid',
      quantity: 1,
      refiner: 'Medium',
      time_s: 20,
      inputs: [{ item: 'base', qty: 1 }],
      locked: true
    },
    {
      id: 'base-step',
      name: 'Base',
      output: 'base',
      quantity: 1,
      refiner: 'Portable',
      time_s: 10,
      inputs: [{ item: 'ore', qty: 1 }],
      locked: true
    }
  ]
  const categories: ItemCategoryMap = {
    target: 'Metal',
    mid: 'Metal',
    base: 'Metal',
    ore: 'Metal'
  }
  const index = buildCanonicalIndex(recipes)

  it('enforces synthesis depth ≤ 2', () => {
    const plan = planRefiner(
      { itemId: 'target', quantity: 1 },
      { mode: 'synthesis', canonicalIndex: index, categories, maxDepth: 2 }
    )
    const maxDepth = Math.max(...plan.steps.map((step) => step.depth))
    expect(maxDepth).toBeLessThanOrEqual(2)
  })

  it('prefers recipes with fewer steps', () => {
    const tieRecipes: CanonicalRecipe[] = [
      {
        id: 'fast',
        name: 'Fast Path',
        output: 'result',
        quantity: 1,
        refiner: 'Medium',
        time_s: 12,
        inputs: [{ item: 'input_a', qty: 1 }],
        locked: true
      },
      {
        id: 'slow',
        name: 'Slow Path',
        output: 'result',
        quantity: 1,
        refiner: 'Medium',
        time_s: 8,
        inputs: [
          { item: 'input_a', qty: 1 },
          { item: 'input_b', qty: 1 }
        ],
        locked: true
      }
    ]
    const tieCategories: ItemCategoryMap = {
      result: 'Product',
      input_a: 'Product',
      input_b: 'Product'
    }
    const tieIndex = buildCanonicalIndex(tieRecipes)
    const plan = planRefiner(
      { itemId: 'result', quantity: 1 },
      { mode: 'strict', canonicalIndex: tieIndex, categories: tieCategories }
    )
    expect(plan.steps[0].recipe.id).toBe('fast')
  })
})
