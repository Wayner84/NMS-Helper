import { describe, expect, it } from 'vitest'
import type { CookingRecipe, Item } from '../types'
import { recipeMatchesQuery } from '../lib/cooking'

const recipe: CookingRecipe = {
  id: 'recipe-1',
  name: 'Assemble Baked Product',
  inputs: [{ item: 'flour', qty: 1 }],
  output: { item: 'stellar_tart', qty: 1 },
  heated: false,
  refined: false,
  mixed: false
}

const items = new Map<string, Item>([
  ['flour', { id: 'flour', name: 'Refined Flour', group: 'food', value: 0 }],
  ['stellar_tart', { id: 'stellar_tart', name: 'Stellar Tart', group: 'food', value: 0 }]
])

describe('recipeMatchesQuery', () => {
  it('finds a cooking recipe by its output dish name', () => {
    expect(recipeMatchesQuery(recipe, items, 'stellar tart')).toBe(true)
  })

  it('finds a cooking recipe by operation or ingredient', () => {
    expect(recipeMatchesQuery(recipe, items, 'assemble baked')).toBe(true)
    expect(recipeMatchesQuery(recipe, items, 'refined flour')).toBe(true)
    expect(recipeMatchesQuery(recipe, items, 'soup')).toBe(false)
  })
})
