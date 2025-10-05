import { describe, expect, it } from 'vitest'
import { createEmptyPlanner, scorePlannerGrid, suggestBestArrangement } from '../lib/planner'
import type { PlannerState, TechModule } from '../types'

const moduleMap = new Map<string, TechModule>([
  [
    'alpha',
    {
      id: 'alpha',
      name: 'Alpha Drive',
      platform: 'starship',
      slotType: 'tech',
      baseValue: 100,
      adjacency: { beta: 75, gamma: 10 },
      superchargeMultiplier: 2,
      tags: []
    }
  ],
  [
    'beta',
    {
      id: 'beta',
      name: 'Beta Core',
      platform: 'starship',
      slotType: 'tech',
      baseValue: 80,
      adjacency: { alpha: 50, delta: 15 },
      superchargeMultiplier: 1.5,
      tags: []
    }
  ],
  [
    'gamma',
    {
      id: 'gamma',
      name: 'Gamma Shield',
      platform: 'starship',
      slotType: 'tech',
      baseValue: 40,
      adjacency: { alpha: 10, delta: 20 },
      superchargeMultiplier: 1,
      tags: []
    }
  ],
  [
    'delta',
    {
      id: 'delta',
      name: 'Delta Support',
      platform: 'starship',
      slotType: 'tech',
      baseValue: 30,
      adjacency: { beta: 15, gamma: 25 },
      superchargeMultiplier: 1,
      tags: []
    }
  ]
])

const createPlannerWithModules = (): PlannerState => {
  const grid = createEmptyPlanner(2, 2)
  grid.slots[0].moduleId = 'alpha'
  grid.slots[1].moduleId = 'beta'
  grid.slots[2].moduleId = 'gamma'
  grid.slots[3].moduleId = 'delta'
  return {
    platform: 'starship',
    grid,
    benchModules: []
  }
}

describe('planner scoring', () => {
  it('computes adjacency bonuses and supercharge multiplier', () => {
    const planner = createPlannerWithModules()
    planner.grid.slots[0].supercharged = true
    const score = scorePlannerGrid(planner.grid, moduleMap)
    expect(score).toBeGreaterThan(0)
    expect(score).toBe(655)
  })

  it('suggests an arrangement that does not reduce score', () => {
    const planner = createPlannerWithModules()
    const initialScore = scorePlannerGrid(planner.grid, moduleMap)
    const suggested = suggestBestArrangement(planner, moduleMap, 10)
    const suggestedScore = scorePlannerGrid(suggested.grid, moduleMap)
    expect(suggestedScore).toBeGreaterThanOrEqual(initialScore)
  })

  it('prefers placing high value modules on supercharged slots', () => {
    const planner = createEmptyPlanner(2, 2)
    planner.slots[0].supercharged = true
    planner.slots[1].moduleId = 'beta'
    const plannerState: PlannerState = {
      platform: 'starship',
      grid: planner,
      benchModules: ['alpha']
    }

    const result = suggestBestArrangement(plannerState, moduleMap, 5)

    expect(result.grid.slots[0].moduleId).toBe('alpha')
    expect(result.benchModules).not.toContain('alpha')
    expect(scorePlannerGrid(result.grid, moduleMap)).toBeGreaterThan(
      scorePlannerGrid(plannerState.grid, moduleMap)
    )
  })
})
