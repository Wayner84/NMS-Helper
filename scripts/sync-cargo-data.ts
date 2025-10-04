import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

const WIKI_BASE = 'https://nomanssky.fandom.com'
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data')

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const parseNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const sanitized = value.replace(/[, ]/g, '')
    const parsed = Number.parseFloat(sanitized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const { stdout } = await execFileAsync('curl', ['-sS', url])
  try {
    return JSON.parse(stdout) as T
  } catch (error) {
    throw new Error(`Failed to parse response from ${url}: ${(error as Error).message}\n${stdout.slice(0, 200)}`)
  }
}

type CargoQueryResponse<T> = {
  cargoquery?: Array<{ title: T }>
}

type ItemRow = {
  pageName: string
  value: unknown
  category: string | null
  type: string | null
  itemType: string | null
}

type ItemEntry = { id: string; name: string; group: string; value: number }

const fetchItems = async () => {
  const limit = 500
  let offset = 0
  const items = new Map<string, ItemEntry>()

  while (true) {
    const query = new URLSearchParams({
      action: 'cargoquery',
      format: 'json',
      tables: 'Items',
      fields:
        'Items._pageName=pageName,Items.Total_Value=value,Items.Category=category,Items.Type=type,Items.Item_type=itemType',
      limit: limit.toString(),
      offset: offset.toString()
    })
    const url = `${WIKI_BASE}/api.php?${query.toString()}`
    const data = await fetchJson<CargoQueryResponse<ItemRow>>(url)
    const rows = data.cargoquery ?? []
    if (rows.length === 0) break

    rows.forEach(({ title }) => {
      const name = title.pageName
      const id = slugify(name)
      if (!id) return
      const groupSource = title.itemType ?? title.category ?? title.type ?? 'Unknown'
      const group = slugify(groupSource) || 'unknown'
      const value = parseNumber(title.value)
      items.set(id, { id, name, group, value })
    })

    offset += limit
  }

  return items
}

type CargoExportRow = Record<string, unknown>

const fetchCargoExport = async (table: string, fields: string[]): Promise<CargoExportRow[]> => {
  const limit = 500
  let offset = 0
  const results: CargoExportRow[] = []
  while (true) {
    const query = new URLSearchParams({
      tables: table,
      fields: fields.join(','),
      format: 'json',
      limit: limit.toString(),
      offset: offset.toString()
    })
    const url = `${WIKI_BASE}/wiki/Special:CargoExport?${query.toString()}`
    const rows = await fetchJson<CargoExportRow[]>(url)
    if (rows.length === 0) break
    results.push(...rows)
    offset += limit
  }
  return results
}

type RefinerRow = {
  _pageName: string
  Recipe: string
  Output: unknown
  TimeProcessing: unknown
  Resources?: string[]
  ResourceQtys?: string[]
}

type ParsedInput = { item: string; qty: number; label: string }
type RecipeInput = { item: string; qty: number }

type RefinerRecipe = {
  id: string
  name: string
  inputs: RecipeInput[]
  output: { item: string; qty: number }
  timeSeconds: number
}

const parseInputs = (resources?: string[], quantities?: string[]): ParsedInput[] => {
  if (!resources || resources.length === 0) return []
  return resources
    .map((resource, index) => {
      const cleaned = resource.trim()
      if (!cleaned) return null
      const qtyEntry = quantities?.[index] ?? ''
      const [, qtyRaw = '1'] = qtyEntry.split(';').map((part) => part.trim())
      const qty = parseNumber(qtyRaw)
      return { item: slugify(cleaned), qty, label: cleaned }
    })
    .filter((entry): entry is ParsedInput => !!entry && entry.qty > 0 && entry.item.length > 0)
}

const fetchRefiner = async (): Promise<{ recipes: RefinerRecipe[]; ingredients: ParsedInput[]; outputs: Array<{ id: string; label: string }> }> => {
  const rows = await fetchCargoExport('PoC_Refining', [
    '_pageName',
    'Recipe',
    'Output',
    'TimeProcessing',
    'Resources',
    'ResourceQtys'
  ])

  const ingredients: ParsedInput[] = []
  const outputs: Array<{ id: string; label: string }> = []

  const recipes = rows
    .map((row) => row as RefinerRow)
    .map((row, index) => {
      const parsedInputs = parseInputs(row.Resources, row.ResourceQtys)
      ingredients.push(...parsedInputs)
      const outputQty = parseNumber(row.Output) || 1
      const timeSeconds = Math.round(parseNumber(row.TimeProcessing) * 60) || 1
      const outputId = slugify(row._pageName)
      outputs.push({ id: outputId, label: row._pageName })
      const idBase = slugify(`${row.Recipe || row._pageName}_${parsedInputs.map((input) => input.item).join('_')}`)
      const id = idBase ? `${idBase}_${index}` : `refiner_${index}`
      return {
        id,
        name: row.Recipe || row._pageName,
        inputs: parsedInputs.map(({ item, qty }) => ({ item, qty })),
        output: { item: outputId, qty: outputQty },
        timeSeconds
      }
    })
    .filter((recipe) => recipe.inputs.length > 0)

  return { recipes, ingredients, outputs }
}

type CookingRow = {
  _pageName: string
  Recipe: string
  Output: unknown
  Resources?: string[]
  ResourceQtys?: string[]
}

type CookingRecipe = {
  id: string
  name: string
  inputs: RecipeInput[]
  output: { item: string; qty: number }
  heated: boolean
  refined: boolean
  mixed: boolean
}

const fetchCooking = async (): Promise<{ recipes: CookingRecipe[]; ingredients: ParsedInput[]; outputs: Array<{ id: string; label: string }> }> => {
  const rows = await fetchCargoExport('PoC_Cooking', [
    '_pageName',
    'Recipe',
    'Output',
    'Resources',
    'ResourceQtys'
  ])

  const ingredients: ParsedInput[] = []
  const outputs: Array<{ id: string; label: string }> = []

  const recipes = rows
    .map((row) => row as CookingRow)
    .map((row, index) => {
      const parsedInputs = parseInputs(row.Resources, row.ResourceQtys)
      ingredients.push(...parsedInputs)
      const outputQty = parseNumber(row.Output) || 1
      const idBase = slugify(`${row.Recipe}_${row._pageName}`)
      const id = idBase ? `${idBase}_${index}` : `cooking_${index}`
      const outputId = slugify(row._pageName)
      outputs.push({ id: outputId, label: row._pageName })
      return {
        id,
        name: row.Recipe || row._pageName,
        inputs: parsedInputs.map(({ item, qty }) => ({ item, qty })),
        output: { item: outputId, qty: outputQty },
        heated: false,
        refined: false,
        mixed: false
      }
    })
    .filter((recipe) => recipe.inputs.length > 0)

  return { recipes, ingredients, outputs }
}

type TechRow = {
  pageName: string
  value: unknown
  techCategory: string | null
  techSubcategory: string | null
}

type TechModule = {
  id: string
  name: string
  platform: string
  slotType: string
  baseValue: number
  adjacency: Record<string, number>
  superchargeMultiplier: number
  tags: string[]
}

const fetchTechnology = async (): Promise<{ modules: TechModule[]; outputs: Array<{ id: string; label: string; value: number }> }> => {
  const limit = 500
  let offset = 0
  const modules: TechModule[] = []
  const outputs: Array<{ id: string; label: string; value: number }> = []
  while (true) {
    const params = new URLSearchParams({
      action: 'cargoquery',
      format: 'json',
      tables: 'Items',
      fields:
        'Items._pageName=pageName,Items.Total_Value=value,Items.Technology_category=techCategory,Items.Technology_subcategory=techSubcategory',
      where: 'Items.Item_type="Technology"',
      limit: limit.toString(),
      offset: offset.toString()
    })
    const url = `${WIKI_BASE}/api.php?${params.toString()}`
    const data = await fetchJson<CargoQueryResponse<TechRow>>(url)
    const rows = data.cargoquery ?? []
    if (rows.length === 0) break
    for (const { title } of rows) {
      const id = slugify(title.pageName)
      if (!id) continue
      const platform = slugify(title.techCategory ?? 'general') || 'general'
      const tags = [title.techCategory, title.techSubcategory]
        .filter((value): value is string => !!value)
        .map((value) => slugify(value))
        .filter(Boolean)
      const baseValue = parseNumber(title.value) || 1
      outputs.push({ id, label: title.pageName, value: baseValue })
      modules.push({
        id,
        name: title.pageName,
        platform,
        slotType: 'tech',
        baseValue,
        adjacency: {},
        superchargeMultiplier: 1,
        tags
      })
    }
    offset += limit
  }
  const deduped = new Map<string, TechModule>()
  modules.forEach((module) => deduped.set(module.id, module))
  const sorted = Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name))
  return { modules: sorted, outputs }
}

const writeJson = async (file: string, data: unknown) => {
  const target = path.join(DATA_DIR, file)
  await fs.writeFile(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

const main = async () => {
  console.log('Fetching items…')
  const items = await fetchItems()

  console.log('Fetching refiner recipes…')
  const refiner = await fetchRefiner()
  await writeJson('refiner.json', refiner.recipes)
  console.log(`Refiner recipes written (${refiner.recipes.length})`)

  console.log('Fetching cooking recipes…')
  const cooking = await fetchCooking()
  await writeJson('cooking.json', cooking.recipes)
  console.log(`Cooking recipes written (${cooking.recipes.length})`)

  console.log('Fetching technology modules…')
  const tech = await fetchTechnology()
  await writeJson('tech.json', tech.modules)
  console.log(`Technology modules written (${tech.modules.length})`)

  const ensureItem = (id: string, label: string, valueOverride?: number) => {
    if (!id) return
    if (items.has(id)) return
    items.set(id, {
      id,
      name: label,
      group: 'unknown',
      value: valueOverride ?? 0
    })
  }

  refiner.ingredients.forEach(({ item, label }) => ensureItem(item, label))
  refiner.outputs.forEach(({ id, label }) => ensureItem(id, label))
  cooking.ingredients.forEach(({ item, label }) => ensureItem(item, label))
  cooking.outputs.forEach(({ id, label }) => ensureItem(id, label))
  tech.outputs.forEach(({ id, label, value }) => ensureItem(id, label, value))

  const sortedItems = Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name))
  await writeJson('items.json', sortedItems)
  console.log(`Items written (${sortedItems.length})`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
