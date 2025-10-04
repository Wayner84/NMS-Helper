import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type Item = { id: string; name: string; group: string; value: number }
type RecipeInput = { item: string; qty: number }
type RefinerRecipe = { id: string; inputs: RecipeInput[]; output: RecipeInput; timeSeconds: number }
type CraftComponent = RecipeInput & { viaRecipe?: string }
type CraftingRecipe = { id: string; output: RecipeInput; components: CraftComponent[] }
type CookingRecipe = { id: string; inputs: RecipeInput[]; output: RecipeInput; heated: boolean; refined: boolean; mixed: boolean }
type TechModule = {
  id: string
  platform: string
  baseValue: number
  adjacency: Record<string, number | undefined>
  superchargeMultiplier: number
}
type PortalEntry = { id: string; galaxyIndex: number; portal: string; region: string; tags?: string[]; notes?: string; url?: string }
type HintEntry = { id: string; title: string; body: string; tags: string[]; sourceName?: string; url?: string }
type ResourceDataset = { quickPick: string[] }

const normalizePortalHex = (portal: string): string => portal.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
const isValidPortalHex = (portal: string): boolean => /^[0-9A-F]{12}$/u.test(portal)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../src/data')

const readJson = <T>(file: string): T => {
  const full = path.join(dataDir, file)
  const contents = fs.readFileSync(full, 'utf8')
  return JSON.parse(contents) as T
}

interface ValidationResult {
  ok: boolean
  errors: string[]
}

const validateRefiner = (recipes: RefinerRecipe[], items: Map<string, Item>): ValidationResult => {
  const errors: string[] = []
  recipes.forEach((recipe) => {
    if (!recipe.id) errors.push(`Refiner recipe missing id`)
    if (!recipe.output || !items.has(recipe.output.item)) {
      errors.push(`Refiner recipe ${recipe.id} output item ${recipe.output?.item} missing from items.json`)
    }
    if (recipe.timeSeconds <= 0) {
      errors.push(`Refiner recipe ${recipe.id} has non-positive time`)
    }
    recipe.inputs.forEach((input, index) => {
      if (!items.has(input.item)) {
        errors.push(`Refiner recipe ${recipe.id} input ${index} (${input.item}) missing from items.json`)
      }
      if (input.qty <= 0) {
        errors.push(`Refiner recipe ${recipe.id} input ${input.item} has non-positive quantity`)
      }
    })
  })
  return { ok: errors.length === 0, errors }
}

const validateCrafting = (
  recipes: CraftingRecipe[],
  items: Map<string, Item>,
  recipeIds: Set<string>
): ValidationResult => {
  const errors: string[] = []
  recipes.forEach((recipe) => {
    if (!items.has(recipe.output.item)) {
      errors.push(`Crafting recipe ${recipe.id} output item ${recipe.output.item} missing from items.json`)
    }
    recipe.components.forEach((component) => {
      if (!items.has(component.item)) {
        errors.push(`Crafting recipe ${recipe.id} component ${component.item} missing from items.json`)
      }
      if (component.qty <= 0) {
        errors.push(`Crafting recipe ${recipe.id} component ${component.item} has non-positive quantity`)
      }
      if (component.viaRecipe && !recipeIds.has(component.viaRecipe)) {
        errors.push(`Crafting recipe ${recipe.id} references unknown recipe ${component.viaRecipe}`)
      }
    })
  })
  return { ok: errors.length === 0, errors }
}

const validateCooking = (recipes: CookingRecipe[], items: Map<string, Item>): ValidationResult => {
  const errors: string[] = []
  recipes.forEach((recipe) => {
    if (!items.has(recipe.output.item)) {
      errors.push(`Cooking recipe ${recipe.id} output item ${recipe.output.item} missing from items.json`)
    }
    recipe.inputs.forEach((input) => {
      if (!items.has(input.item)) {
        errors.push(`Cooking recipe ${recipe.id} input ${input.item} missing from items.json`)
      }
      if (input.qty <= 0) {
        errors.push(`Cooking recipe ${recipe.id} input ${input.item} has non-positive quantity`)
      }
    })
  })
  return { ok: errors.length === 0, errors }
}

const validateTech = (modules: TechModule[]): ValidationResult => {
  const errors: string[] = []
  const ids = new Set(modules.map((module) => module.id))
  modules.forEach((module) => {
    if (!module.platform) errors.push(`Tech module ${module.id} missing platform`)
    if (module.baseValue <= 0) errors.push(`Tech module ${module.id} has non-positive base value`)
    Object.entries(module.adjacency).forEach(([target, value]) => {
      if (!ids.has(target)) {
        errors.push(`Tech module ${module.id} adjacency references unknown module ${target}`)
      }
      if (typeof value !== 'number') {
        errors.push(`Tech module ${module.id} adjacency for ${target} must be numeric`)
      }
    })
  })
  return { ok: errors.length === 0, errors }
}

const validatePortals = (portals: PortalEntry[]): ValidationResult => {
  const errors: string[] = []
  portals.forEach((entry) => {
    const normalized = normalizePortalHex(entry.portal)
    if (!isValidPortalHex(normalized)) {
      errors.push(`Portal ${entry.id} has invalid address ${entry.portal}`)
    }
    if (entry.galaxyIndex < 1) {
      errors.push(`Portal ${entry.id} galaxyIndex must be ≥ 1`)
    }
  })
  return { ok: errors.length === 0, errors }
}

const validateHints = (hints: HintEntry[]): ValidationResult => {
  const errors: string[] = []
  hints.forEach((hint) => {
    if (!hint.title.trim() || !hint.body.trim()) {
      errors.push(`Hint ${hint.id} missing title/body text`)
    }
    if (hint.body.length > 280) {
      errors.push(`Hint ${hint.id} exceeds 280 character limit`)
    }
    if (!hint.tags || hint.tags.length === 0) {
      errors.push(`Hint ${hint.id} missing tags`)
    }
  })
  return { ok: errors.length === 0, errors }
}

const validateResources = (dataset: ResourceDataset): ValidationResult => {
  const errors: string[] = []
  const seen = new Set<string>()
  dataset.quickPick.forEach((resource) => {
    if (seen.has(resource)) {
      errors.push(`Duplicate resource quick pick ${resource}`)
    }
    seen.add(resource)
  })
  return { ok: errors.length === 0, errors }
}

const items = readJson<Item[]>('items.json')
const itemsMap = new Map(items.map((item) => [item.id, item]))
const refiner = readJson<RefinerRecipe[]>('refiner.json')
const crafting = readJson<CraftingRecipe[]>('crafting.json')
const cooking = readJson<CookingRecipe[]>('cooking.json')
const tech = readJson<TechModule[]>('tech.json')
const portals = readJson<PortalEntry[]>('portals.json')
const hints = readJson<HintEntry[]>('hints.json')
const resourcesDataset = readJson<ResourceDataset>('resources.json')

const results: ValidationResult[] = [
  validateRefiner(refiner, itemsMap),
  validateCrafting(crafting, itemsMap, new Set(crafting.map((recipe) => recipe.id))),
  validateCooking(cooking, itemsMap),
  validateTech(tech),
  validatePortals(portals),
  validateHints(hints),
  validateResources(resourcesDataset)
]

const allErrors = results.flatMap((result) => result.errors)

if (allErrors.length > 0) {
  console.error('Data validation failed:')
  allErrors.forEach((error) => console.error(` • ${error}`))
  process.exitCode = 1
} else {
  console.log('All data files validated successfully.')
}
