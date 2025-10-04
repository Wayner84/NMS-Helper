import { PlannerGrid, PlannerSlot, PlannerState, TechModule } from '../types'

export const createEmptyPlanner = (rows: number, cols: number): PlannerGrid => {
  const slots: PlannerSlot[] = Array.from({ length: rows * cols }).map((_, index) => ({
    id: `slot-${index}`,
    type: 'tech',
    supercharged: false
  }))
  return { rows, cols, slots }
}

export const clonePlannerGrid = (grid: PlannerGrid): PlannerGrid => ({
  rows: grid.rows,
  cols: grid.cols,
  slots: grid.slots.map((slot) => ({ ...slot }))
})

export const resizePlannerGrid = (grid: PlannerGrid, rows: number, cols: number): PlannerGrid => {
  const total = rows * cols
  const nextSlots: PlannerSlot[] = []
  for (let i = 0; i < total; i += 1) {
    if (grid.slots[i]) {
      nextSlots.push({ ...grid.slots[i], id: `slot-${i}` })
    } else {
      nextSlots.push({ id: `slot-${i}`, type: 'tech', supercharged: false })
    }
  }
  return { rows, cols, slots: nextSlots }
}

const NEIGHBOUR_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
]

const indexToCoord = (index: number, cols: number): [number, number] => [
  Math.floor(index / cols),
  index % cols
]

const coordToIndex = (row: number, col: number, cols: number): number => row * cols + col

export const scorePlannerGrid = (grid: PlannerGrid, modules: Map<string, TechModule>): number => {
  let score = 0
  grid.slots.forEach((slot, index) => {
    if (!slot.moduleId) return
    const module = modules.get(slot.moduleId)
    if (!module) return

    let moduleScore = module.baseValue
    const [row, col] = indexToCoord(index, grid.cols)
    for (const [dr, dc] of NEIGHBOUR_OFFSETS) {
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue
      const neighbour = grid.slots[coordToIndex(nr, nc, grid.cols)]
      if (!neighbour.moduleId) continue
      moduleScore += module.adjacency[neighbour.moduleId] ?? 0
    }

    if (slot.supercharged) {
      moduleScore *= module.superchargeMultiplier
    }

    score += moduleScore
  })

  return Math.round(score)
}

const defaultIterations = 200

const greedyPlacement = (grid: PlannerGrid, moduleIds: string[], modules: Map<string, TechModule>): PlannerGrid => {
  const sortedModules = [...moduleIds].sort((a, b) => {
    const modA = modules.get(a)
    const modB = modules.get(b)
    const valueA = (modA?.baseValue ?? 0) * (modA?.superchargeMultiplier ?? 1)
    const valueB = (modB?.baseValue ?? 0) * (modB?.superchargeMultiplier ?? 1)
    return valueB - valueA
  })
  const slots = grid.slots.map((slot) => ({ ...slot, moduleId: undefined as string | undefined }))
  const orderedSlots = slots
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => {
      const multA = a.slot.supercharged ? 1.5 : 1
      const multB = b.slot.supercharged ? 1.5 : 1
      return multB - multA
    })
  sortedModules.forEach((moduleId, idx) => {
    const target = orderedSlots[idx]
    if (!target) return
    slots[target.index] = { ...slots[target.index], moduleId }
  })
  return { ...grid, slots }
}

export const suggestBestArrangement = (
  planner: PlannerState,
  modules: Map<string, TechModule>,
  iterations = defaultIterations
): PlannerState => {
  const currentModules = planner.grid.slots
    .map((slot) => slot.moduleId)
    .filter((id): id is string => Boolean(id))
  const modulesToPlace = [...currentModules, ...planner.benchModules]
  const baseGrid = greedyPlacement(planner.grid, modulesToPlace, modules)
  let bestGrid = baseGrid
  let bestScore = scorePlannerGrid(bestGrid, modules)

  const moduleSlots = baseGrid.slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => Boolean(slot.moduleId))

  const randomIndex = () => Math.floor(Math.random() * moduleSlots.length)

  for (let i = 0; i < iterations; i += 1) {
    if (moduleSlots.length < 2) break
    const firstIdx = randomIndex()
    let secondIdx = randomIndex()
    while (secondIdx === firstIdx) {
      secondIdx = randomIndex()
    }
    const nextGrid = clonePlannerGrid(bestGrid)
    const firstSlotIndex = moduleSlots[firstIdx].index
    const secondSlotIndex = moduleSlots[secondIdx].index
    const temp = nextGrid.slots[firstSlotIndex].moduleId
    nextGrid.slots[firstSlotIndex].moduleId = nextGrid.slots[secondSlotIndex].moduleId
    nextGrid.slots[secondSlotIndex].moduleId = temp

    const candidateScore = scorePlannerGrid(nextGrid, modules)
    if (candidateScore > bestScore) {
      bestGrid = nextGrid
      bestScore = candidateScore
    }
  }

  const assignedModuleIds = new Set(bestGrid.slots.map((slot) => slot.moduleId).filter(Boolean))
  const remainingBench = modulesToPlace.filter((id) => !assignedModuleIds.has(id))

  return {
    ...planner,
    grid: bestGrid,
    benchModules: remainingBench
  }
}
