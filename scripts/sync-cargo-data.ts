import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data')
const SOURCE_REPO = 'bradhave94/nms'
const REVIEWED_THROUGH_VERSION = '7.01'

const ITEM_FILES = [
  'Buildings',
  'ConstructedTechnology',
  'Corvette',
  'Creatures',
  'Curiosities',
  'EggModifiers',
  'Exocraft',
  'Fish',
  'Food',
  'Others',
  'Products',
  'RawMaterials',
  'Starships',
  'Technology',
  'TechnologyModule',
  'Trade',
  'Upgrades'
]

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[, ]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const { stdout } = await execFileAsync('curl', ['-LfsS', url], { maxBuffer: 20 * 1024 * 1024 })
  return JSON.parse(stdout) as T
}

const readJson = async <T>(file: string): Promise<T> => {
  const contents = await fs.readFile(path.join(DATA_DIR, file), 'utf8')
  return JSON.parse(contents) as T
}

const writeJson = async (file: string, data: unknown): Promise<void> => {
  await fs.writeFile(path.join(DATA_DIR, file), `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

type ItemEntry = { id: string; name: string; group: string; value: number }
type SourceItem = {
  Name?: string
  Group?: string
  BaseValueUnits?: unknown
}
type SourceManifest = { schemaVersion: number; gameVersion: string; compilerVersion: string }
type SourcePart = { Id: string; Name: string; Quantity: number }
type SourceRecipe = {
  Id: string
  Inputs: SourcePart[]
  Output: SourcePart
  Time?: string | number
  Operation?: string
}
type RecipeInput = { item: string; qty: number }
type RefinerRecipe = {
  id: string
  name: string
  inputs: RecipeInput[]
  output: RecipeInput
  timeSeconds: number
}
type CookingRecipe = {
  id: string
  name: string
  inputs: RecipeInput[]
  output: RecipeInput
  heated: boolean
  refined: boolean
  mixed: boolean
}

const toInput = (part: SourcePart): RecipeInput => ({
  item: slugify(part.Name),
  qty: parseNumber(part.Quantity) || 1
})

const collectSourceItems = (value: unknown): SourceItem[] => {
  if (Array.isArray(value)) return value.flatMap(collectSourceItems)
  if (!value || typeof value !== 'object') return []
  const candidate = value as SourceItem
  if (typeof candidate.Name === 'string') return [candidate]
  return Object.values(value).flatMap(collectSourceItems)
}

const main = async (): Promise<void> => {
  console.log(`Fetching current No Man's Sky data from ${SOURCE_REPO}…`)
  const { stdout: sourceCommit } = await execFileAsync('git', [
    'ls-remote',
    `https://github.com/${SOURCE_REPO}.git`,
    'refs/heads/main'
  ])
  const sourceCommitHash = sourceCommit.trim().split(/\s+/u)[0]
  if (!sourceCommitHash) throw new Error(`Unable to resolve ${SOURCE_REPO} main revision`)
  const sourceBase = `https://raw.githubusercontent.com/${SOURCE_REPO}/${sourceCommitHash}/src/datav2`
  const manifest = await fetchJson<SourceManifest>(`${sourceBase}/extraction-manifest.json`)

  const existingItems = await readJson<ItemEntry[]>('items.json')
  const items = new Map(existingItems.map((item) => [item.id, item]))
  const sourceItemsById = new Map<string, ItemEntry>()

  for (const file of ITEM_FILES) {
    const sourceData = await fetchJson<unknown>(`${sourceBase}/${file}.json`)
    const sourceItems = collectSourceItems(sourceData)
    for (const source of sourceItems) {
      if (!source.Name) continue
      const id = slugify(source.Name)
      if (!id) continue
      sourceItemsById.set(id, {
        id,
        name: source.Name,
        group: slugify(source.Group ?? file) || 'unknown',
        value: parseNumber(source.BaseValueUnits)
      })
    }
  }

  for (const [id, current] of items) {
    const sourceItem = sourceItemsById.get(id)
    if (!sourceItem) continue
    items.set(id, {
      id,
      name: sourceItem.name,
      group: sourceItem.group,
      value: sourceItem.value ?? current.value
    })
  }

  const refinerSource = await fetchJson<SourceRecipe[]>(`${sourceBase}/Refinery.json`)
  const refiner: RefinerRecipe[] = refinerSource.map((recipe) => ({
    id: `refiner_${slugify(recipe.Id)}`,
    name: recipe.Operation || 'Refine',
    inputs: recipe.Inputs.map(toInput),
    output: toInput(recipe.Output),
    timeSeconds: parseNumber(recipe.Time) || 1
  }))

  const cookingSource = await fetchJson<SourceRecipe[]>(`${sourceBase}/NutrientProcessor.json`)
  const cooking: CookingRecipe[] = cookingSource.map((recipe) => ({
    id: `cooking_${slugify(recipe.Id)}`,
    name: recipe.Operation || 'Prepare food',
    inputs: recipe.Inputs.map(toInput),
    output: toInput(recipe.Output),
    heated: false,
    refined: false,
    mixed: false
  }))

  const ensureRecipeItems = (recipes: Array<RefinerRecipe | CookingRecipe>): void => {
    for (const recipe of recipes) {
      const source = [...recipe.inputs, recipe.output]
      for (const part of source) {
        const current = items.get(part.item)
        const sourceItem = sourceItemsById.get(part.item)
        const sourceRecipe = recipe.id.startsWith('refiner_')
          ? refinerSource.find((entry) => `refiner_${slugify(entry.Id)}` === recipe.id)
          : cookingSource.find((entry) => `cooking_${slugify(entry.Id)}` === recipe.id)
        const sourcePart = sourceRecipe
          ? [...sourceRecipe.Inputs, sourceRecipe.Output].find((entry) => slugify(entry.Name) === part.item)
          : undefined
        items.set(part.item, {
          id: part.item,
          name: sourceItem?.name ?? sourcePart?.Name ?? current?.name ?? part.item.replace(/_/g, ' '),
          group: sourceItem?.group ?? current?.group ?? 'recipe_ingredient',
          value: sourceItem?.value ?? current?.value ?? 0
        })
      }
    }
  }

  ensureRecipeItems(refiner)
  ensureRecipeItems(cooking)

  const sortedItems = [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
  await writeJson('items.json', sortedItems)
  await writeJson('refiner.json', refiner)
  await writeJson('cooking.json', cooking)
  await writeJson('data-meta.json', {
    gameVersion: manifest.gameVersion,
    reviewedThroughVersion: REVIEWED_THROUGH_VERSION,
    sourceCompilerVersion: manifest.compilerVersion,
    sourceSchemaVersion: manifest.schemaVersion,
    generatedAt: new Date().toISOString(),
    source: `https://github.com/${SOURCE_REPO}/tree/${sourceCommitHash}/src/datav2`,
    sourceCommit: sourceCommitHash
  })

  console.log(`Items written (${sortedItems.length})`)
  console.log(`Refiner recipes written (${refiner.length})`)
  console.log(`Cooking recipes written (${cooking.length})`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
