import { describe, expect, it } from 'vitest'
import refinerRecipes from '../data/refiner.json'
import items from '../data/items.json'
import type { Item, RefinerRecipe } from '../types'
import { suggestRefinerChains } from '../lib/refiner'

const itemsMap = new Map((items as Item[]).map((item) => [item.id, item]))

describe('refiner chain suggestions', () => {
  it('produces multi-step chains up to depth three', () => {
    const slots = [
      { itemId: 'ferrite_dust', qty: 2 },
      { itemId: null, qty: 1 },
      { itemId: null, qty: 1 }
    ]

    const chains = suggestRefinerChains(slots, refinerRecipes as RefinerRecipe[], itemsMap, 3, 5)
    expect(chains.length).toBeGreaterThan(0)
    const best = chains[0]
    expect(best.steps.length).toBeLessThanOrEqual(3)
    expect(best.totalValue).toBeGreaterThan(0)
  })
})
