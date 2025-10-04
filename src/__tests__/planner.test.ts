import { describe, expect, it } from 'vitest'
import techModules from '../data/tech.json'
import { createEmptyPlanner, scorePlannerGrid, suggestBestArrangement } from '../lib/planner'
import type { PlannerState, TechModule } from '../types'

const moduleMap = new Map(((techModules as unknown) as TechModule[]).map((module) => [module.id, module]))

const createPlannerWithModules = (): PlannerState => {
  const grid = createEmptyPlanner(2, 2)
  grid.slots[0].moduleId = 'pulse_engine'
  grid.slots[1].moduleId = 'hyperdrive'
  grid.slots[2].moduleId = 'launch_thrusters'
  grid.slots[3].moduleId = 'shield_life_support'
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
    expect(score).toBe(597)
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
    planner.slots[1].moduleId = 'pulse_engine'
    const plannerState: PlannerState = {
      platform: 'starship',
      grid: planner,
      benchModules: ['hyperdrive']
    }

    const result = suggestBestArrangement(plannerState, moduleMap, 5)

    expect(result.grid.slots[0].moduleId).toBe('hyperdrive')
    expect(result.benchModules).not.toContain('hyperdrive')
    expect(scorePlannerGrid(result.grid, moduleMap)).toBeGreaterThan(
      scorePlannerGrid(plannerState.grid, moduleMap)
    )
  })
})
