import type { CanonicalRecipe, ItemCategoryMap } from '../types'

export type RefinerPlannerMode = 'strict' | 'synthesis'

export interface PlannerTarget {
  itemId: string
  quantity: number
  recipeId?: string
}

export interface PlannerConfig {
  mode: RefinerPlannerMode
  canonicalIndex: Map<string, CanonicalRecipe[]>
  categories: ItemCategoryMap
  maxDepth?: number
}

export interface PlannerStep {
  recipe: CanonicalRecipe
  depth: number
  runs: number
  timeSeconds: number
  outputQty: number
  inputs: Array<{ itemId: string; qty: number }>
}

export interface PlannerResult {
  mode: RefinerPlannerMode
  targetQty: number
  outputQty: number
  totalTimeSeconds: number
  steps: PlannerStep[]
  baseMaterials: Array<{ itemId: string; qty: number }>
  recipeId: string
}

export class MissingCanonicalRecipeError extends Error {
  constructor(itemId: string) {
    super(`No canonical recipe available for ${itemId}`)
    this.name = 'MissingCanonicalRecipeError'
  }
}

interface PlanNode {
  itemId: string
  desiredQty: number
  actualQty: number
  runs: number
  timeSeconds: number
  depth: number
  recipe?: CanonicalRecipe
  children: PlanNode[]
}

const cache = new Map<string, PlannerResult>()

const cloneResult = (result: PlannerResult): PlannerResult => ({
  ...result,
  steps: result.steps.map((step) => ({
    ...step,
    inputs: step.inputs.map((input) => ({ ...input }))
  })),
  baseMaterials: result.baseMaterials.map((entry) => ({ ...entry }))
})

export const clearPlannerCache = (): void => {
  cache.clear()
}

const recipeSort = (a: CanonicalRecipe, b: CanonicalRecipe): number => {
  if (a.inputs.length !== b.inputs.length) {
    return a.inputs.length - b.inputs.length
  }
  if (a.time_s !== b.time_s) {
    return a.time_s - b.time_s
  }
  const nameA = a.name ?? a.output
  const nameB = b.name ?? b.output
  return nameA.localeCompare(nameB)
}

export const buildCanonicalIndex = (recipes: CanonicalRecipe[]): Map<string, CanonicalRecipe[]> => {
  const index = new Map<string, CanonicalRecipe[]>()
  recipes.forEach((recipe) => {
    const existing = index.get(recipe.output) ?? []
    existing.push(recipe)
    existing.sort(recipeSort)
    index.set(recipe.output, existing)
  })
  return index
}

const selectRecipe = (recipes: CanonicalRecipe[], recipeId?: string): CanonicalRecipe => {
  if (recipeId) {
    const match = recipes.find((recipe) => recipe.id === recipeId)
    if (!match) {
      throw new Error(`Recipe ${recipeId} is not present in the canonical dataset`)
    }
    return match
  }
  return recipes.slice().sort(recipeSort)[0]
}

const collectCategories = (recipe: CanonicalRecipe, categories: ItemCategoryMap): Set<string> => {
  const allowed = new Set<string>()
  recipe.inputs.forEach((input) => {
    const category = categories[input.item]
    if (category) {
      allowed.add(category)
    }
  })
  return allowed
}

const createBaseNode = (itemId: string, qty: number, depth: number): PlanNode => ({
  itemId,
  desiredQty: qty,
  actualQty: qty,
  runs: 0,
  timeSeconds: 0,
  depth,
  children: []
})

const shouldAllowRecipe = (
  recipe: CanonicalRecipe,
  allowedCategories: Set<string>,
  categories: ItemCategoryMap
): boolean => {
  if (allowedCategories.size === 0) return true
  return recipe.inputs.every((input) => {
    const category = categories[input.item]
    if (!category) return true
    return allowedCategories.has(category)
  })
}

const buildRecipeNode = (
  recipe: CanonicalRecipe,
  desiredQty: number,
  depth: number,
  maxDepth: number,
  canonicalIndex: Map<string, CanonicalRecipe[]>,
  allowedCategories: Set<string>,
  categories: ItemCategoryMap,
  visited: Set<string>
): PlanNode => {
  const runs = Math.max(1, Math.ceil(desiredQty / recipe.quantity))
  const actualQty = runs * recipe.quantity
  const timeSeconds = recipe.time_s * runs
  const nextVisited = new Set(visited)
  nextVisited.add(recipe.output)

  const children = recipe.inputs.map((input) =>
    buildNodeForItem(
      input.item,
      input.qty * runs,
      depth + 1,
      maxDepth,
      canonicalIndex,
      allowedCategories,
      categories,
      nextVisited
    )
  )

  return {
    itemId: recipe.output,
    desiredQty,
    actualQty,
    runs,
    timeSeconds,
    depth,
    recipe,
    children
  }
}

const buildNodeForItem = (
  itemId: string,
  quantity: number,
  depth: number,
  maxDepth: number,
  canonicalIndex: Map<string, CanonicalRecipe[]>,
  allowedCategories: Set<string>,
  categories: ItemCategoryMap,
  visited: Set<string>
): PlanNode => {
  if (depth > maxDepth) {
    return createBaseNode(itemId, quantity, depth)
  }
  if (visited.has(itemId)) {
    return createBaseNode(itemId, quantity, depth)
  }
  const options = canonicalIndex.get(itemId)
  if (!options || options.length === 0) {
    return createBaseNode(itemId, quantity, depth)
  }

  const viable = options.filter((candidate) => shouldAllowRecipe(candidate, allowedCategories, categories))
  if (viable.length === 0) {
    return createBaseNode(itemId, quantity, depth)
  }

  const selected = viable[0]
  return buildRecipeNode(
    selected,
    quantity,
    depth,
    maxDepth,
    canonicalIndex,
    allowedCategories,
    categories,
    visited
  )
}

const collectBaseMaterials = (node: PlanNode, acc: Map<string, number>): void => {
  if (!node.recipe || node.children.length === 0) {
    const current = acc.get(node.itemId) ?? 0
    acc.set(node.itemId, current + node.actualQty)
    return
  }
  node.children.forEach((child) => collectBaseMaterials(child, acc))
}

const collectSteps = (node: PlanNode, steps: PlannerStep[]): void => {
  if (node.recipe) {
    steps.push({
      recipe: node.recipe,
      depth: node.depth,
      runs: node.runs,
      timeSeconds: node.timeSeconds,
      outputQty: node.actualQty,
      inputs: node.recipe.inputs.map((input) => ({ itemId: input.item, qty: input.qty * node.runs }))
    })
  }
  node.children.forEach((child) => collectSteps(child, steps))
}

const buildResultFromNode = (node: PlanNode, mode: RefinerPlannerMode): PlannerResult => {
  const baseMaterials = new Map<string, number>()
  collectBaseMaterials(node, baseMaterials)

  const steps: PlannerStep[] = []
  collectSteps(node, steps)
  steps.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth
    return a.recipe.id.localeCompare(b.recipe.id)
  })

  const totalTime = steps.reduce((sum, step) => sum + step.timeSeconds, 0)

  return {
    mode,
    targetQty: node.desiredQty,
    outputQty: node.actualQty,
    totalTimeSeconds: totalTime,
    steps,
    baseMaterials: Array.from(baseMaterials.entries()).map(([itemId, qty]) => ({ itemId, qty })),
    recipeId: node.recipe?.id ?? ''
  }
}

const planStrict = (
  recipe: CanonicalRecipe,
  quantity: number,
  canonicalIndex: Map<string, CanonicalRecipe[]>,
  categories: ItemCategoryMap
): PlannerResult => {
  const allowed = collectCategories(recipe, categories)
  const root = buildRecipeNode(recipe, quantity, 0, 0, canonicalIndex, allowed, categories, new Set())
  return buildResultFromNode(root, 'strict')
}

const planSynthesis = (
  recipe: CanonicalRecipe,
  quantity: number,
  canonicalIndex: Map<string, CanonicalRecipe[]>,
  categories: ItemCategoryMap,
  maxDepth: number
): PlannerResult => {
  const allowed = collectCategories(recipe, categories)
  const root = buildRecipeNode(recipe, quantity, 0, maxDepth, canonicalIndex, allowed, categories, new Set())
  return buildResultFromNode(root, 'synthesis')
}

export const planRefiner = (target: PlannerTarget, config: PlannerConfig): PlannerResult => {
  const { mode, canonicalIndex, categories } = config
  const maxDepth = config.maxDepth ?? (mode === 'synthesis' ? 2 : 0)
  const cacheKey = `${mode}:${target.itemId}:${target.quantity}:${target.recipeId ?? 'auto'}:${maxDepth}`
  const cached = cache.get(cacheKey)
  if (cached) {
    return cloneResult(cached)
  }

  const options = canonicalIndex.get(target.itemId)
  if (!options || options.length === 0) {
    throw new MissingCanonicalRecipeError(target.itemId)
  }

  const recipe = selectRecipe(options, target.recipeId)
  const result =
    mode === 'strict'
      ? planStrict(recipe, target.quantity, canonicalIndex, categories)
      : planSynthesis(recipe, target.quantity, canonicalIndex, categories, maxDepth)

  cache.set(cacheKey, result)
  return cloneResult(result)
}
