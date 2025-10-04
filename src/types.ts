export interface Item {
  id: string
  name: string
  group: string
  value: number
}

export interface RecipeInput {
  item: string
  qty: number
}

export interface RefinerRecipe {
  id: string
  name: string
  inputs: RecipeInput[]
  output: RecipeInput
  timeSeconds: number
}

export interface CraftComponent extends RecipeInput {
  viaRecipe?: string
}

export interface CraftingRecipe {
  id: string
  name: string
  output: RecipeInput
  components: CraftComponent[]
  value: number
}

export interface CookingRecipe {
  id: string
  name: string
  inputs: RecipeInput[]
  output: RecipeInput
  heated: boolean
  refined: boolean
  mixed: boolean
}

export interface TechModule {
  id: string
  name: string
  platform: string
  slotType: 'tech' | 'cargo' | 'general'
  baseValue: number
  adjacency: Partial<Record<string, number>>
  superchargeMultiplier: number
  tags: string[]
}

export interface PortalEntry {
  id: string
  galaxyIndex: number
  region: string
  portal: string
  tags?: string[]
  systemCoords?: string
  notes?: string
  url?: string
}

export interface HintEntry {
  id: string
  title: string
  body: string
  tags: string[]
  sourceName?: string
  url?: string
}

export interface ResourceDataset {
  quickPick: string[]
  aliases?: Record<string, string>
}

export type NoteType = 'system' | 'planet' | 'base'

export interface NoteEntry {
  id: string
  name: string
  type: NoteType
  parentId?: string | null
  systemCoords?: string
  galaxyIndex?: number
  notes?: string
  resources: string[]
  links?: string[]
  createdAt: number
  updatedAt: number
}

export interface PlannerSlot {
  id: string
  type: 'tech' | 'cargo'
  supercharged: boolean
  moduleId?: string
}

export interface PlannerGrid {
  rows: number
  cols: number
  slots: PlannerSlot[]
}

export interface PlannerState {
  platform: string
  grid: PlannerGrid
  benchModules: string[]
}
