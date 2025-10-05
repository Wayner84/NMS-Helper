import { create } from 'zustand'
import itemsJson from '../data/items.json'
import refinerJson from '../data/refiner.json'
import craftingJson from '../data/crafting.json'
import cookingJson from '../data/cooking.json'
import techJson from '../data/tech.json'
import portalsJson from '../data/portals.json'
import hintsJson from '../data/hints.json'
import resourcesJson from '../data/resources.json'
import {
  CraftingRecipe,
  CookingRecipe,
  HintEntry,
  Item,
  NoteEntry,
  PlannerSlot,
  PlannerState,
  PortalEntry,
  RefinerRecipe,
  TechModule
} from '../types'
import { mapById } from '../lib/data'
import { createEmptyPlanner, resizePlannerGrid, suggestBestArrangement } from '../lib/planner'
import { RefinerSlotState } from '../lib/refiner'
import { clearPersisted, loadPersisted, savePersisted } from '../lib/persistence'
import { nanoid } from 'nanoid'

export type TabId = 'refiner' | 'crafting' | 'cooking' | 'planner' | 'portals' | 'hints' | 'notes'

const items = itemsJson as Item[]
const refinerRecipes = refinerJson as RefinerRecipe[]
const craftingRecipes = craftingJson as CraftingRecipe[]
const cookingRecipes = cookingJson as CookingRecipe[]
const techModules = techJson as unknown as TechModule[]
const portalSeeds = portalsJson as PortalEntry[]
const hintSeeds = hintsJson as HintEntry[]
const resourceDataset = resourcesJson as { quickPick: string[]; aliases?: Record<string, string> }

const itemMap = mapById(items)
const techModuleMap = mapById(techModules)

const defaultPlannerState: PlannerState = {
  platform: 'starship',
  grid: createEmptyPlanner(4, 6),
  benchModules: []
}

const defaultRefinerSlots: RefinerSlotState[] = [
  { itemId: null, qty: 1 },
  { itemId: null, qty: 1 },
  { itemId: null, qty: 1 }
]

interface AppState {
  ready: boolean
  theme: 'dark' | 'light'
  activeTab: TabId
  items: Item[]
  itemsMap: Map<string, Item>
  refinerRecipes: RefinerRecipe[]
  craftingRecipes: CraftingRecipe[]
  cookingRecipes: CookingRecipe[]
  techModules: TechModule[]
  techModuleMap: Map<string, TechModule>
  portalSeeds: PortalEntry[]
  portalCustom: PortalEntry[]
  hintSeeds: HintEntry[]
  hintCustom: HintEntry[]
  notes: NoteEntry[]
  planner: PlannerState
  refinerSlots: RefinerSlotState[]
  resources: typeof resourceDataset
  setTab: (tab: TabId) => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  setRefinerSlotItem: (index: number, itemId: string | null) => void
  setRefinerSlotQty: (index: number, qty: number) => void
  swapRefinerSlots: (from: number, to: number) => void
  clearRefinerSlots: () => void
  loadRefinerRecipe: (recipeId: string) => void
  setPlannerPlatform: (platform: string) => void
  setPlannerGridSize: (rows: number, cols: number) => void
  updatePlannerSlot: (index: number, patch: Partial<PlannerSlot>) => void
  placeModule: (index: number, moduleId: string | null) => void
  pushBenchModule: (moduleId: string) => void
  removeBenchModule: (moduleId: string) => void
  clearPlannerModules: () => void
  suggestPlanner: () => void
  importPlanner: (planner: PlannerState) => void
  resetPlanner: () => void
  upsertHint: (hint: HintEntry) => void
  removeHint: (id: string) => void
  importHints: (hints: HintEntry[]) => void
  addPortalEntry: (entry: PortalEntry) => void
  importPortals: (entries: PortalEntry[]) => void
  removePortalEntry: (id: string) => void
  setNotes: (notes: NoteEntry[]) => void
  upsertNote: (note: NoteEntry) => void
  removeNotes: (ids: string[]) => void
  hydrate: () => Promise<void>
  clearPersistence: () => Promise<void>
}

const withPersist = <T>(key: 'planner' | 'hints' | 'notes' | 'portals', value: T): void => {
  void savePersisted(key, value)
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  theme: 'dark',
  activeTab: 'refiner',
  items,
  itemsMap: itemMap,
  refinerRecipes,
  craftingRecipes,
  cookingRecipes,
  techModules,
  techModuleMap,
  portalSeeds,
  portalCustom: [],
  hintSeeds,
  hintCustom: [],
  notes: [],
  planner: defaultPlannerState,
  refinerSlots: defaultRefinerSlots,
  resources: resourceDataset,
  setTab: (tab) => set({ activeTab: tab }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setRefinerSlotItem: (index, itemId) =>
    set((state) => {
      const next = state.refinerSlots.map((slot, idx) => (idx === index ? { ...slot, itemId } : slot))
      return { refinerSlots: next }
    }),
  setRefinerSlotQty: (index, qty) =>
    set((state) => {
      const value = Number.isFinite(qty) ? Math.max(1, Math.round(qty)) : 1
      const next = state.refinerSlots.map((slot, idx) =>
        idx === index ? { ...slot, qty: value } : slot
      )
      return { refinerSlots: next }
    }),
  swapRefinerSlots: (from, to) =>
    set((state) => {
      const next = [...state.refinerSlots]
      const temp = next[from]
      next[from] = next[to]
      next[to] = temp
      return { refinerSlots: next }
    }),
  clearRefinerSlots: () => set({ refinerSlots: defaultRefinerSlots.map((slot) => ({ ...slot })) }),
  loadRefinerRecipe: (recipeId) =>
    set((state) => {
      const recipe = state.refinerRecipes.find((entry) => entry.id === recipeId)
      if (!recipe) return {}

      const slots = state.refinerSlots.map(() => ({ itemId: null as string | null, qty: 1 }))
      recipe.inputs.forEach((input, index) => {
        if (index < slots.length) {
          slots[index] = { itemId: input.item, qty: input.qty }
        }
      })

      return { refinerSlots: slots }
    }),
  setPlannerPlatform: (platform) =>
    set((state) => {
      const planner = { ...state.planner, platform }
      withPersist('planner', planner)
      return { planner }
    }),
  setPlannerGridSize: (rows, cols) =>
    set((state) => {
      const resized = resizePlannerGrid(state.planner.grid, rows, cols)
      const planner = { ...state.planner, grid: resized }
      withPersist('planner', planner)
      return { planner }
    }),
  updatePlannerSlot: (index, patch) =>
    set((state) => {
      const slots = state.planner.grid.slots.map((slot, idx) =>
        idx === index ? { ...slot, ...patch } : slot
      )
      const planner = { ...state.planner, grid: { ...state.planner.grid, slots } }
      withPersist('planner', planner)
      return { planner }
    }),
  placeModule: (index, moduleId) =>
    set((state) => {
      const slots = state.planner.grid.slots.map((slot, idx) =>
        idx === index ? { ...slot, moduleId: moduleId ?? undefined } : slot
      )
      const planner = { ...state.planner, grid: { ...state.planner.grid, slots } }
      withPersist('planner', planner)
      return { planner }
    }),
  pushBenchModule: (moduleId) =>
    set((state) => {
      const planner = { ...state.planner, benchModules: [...state.planner.benchModules, moduleId] }
      withPersist('planner', planner)
      return { planner }
    }),
  removeBenchModule: (moduleId) =>
    set((state) => {
      const planner = {
        ...state.planner,
        benchModules: state.planner.benchModules.filter((id) => id !== moduleId)
      }
      withPersist('planner', planner)
      return { planner }
    }),
  clearPlannerModules: () =>
    set((state) => {
      const slots = state.planner.grid.slots.map((slot) => ({ ...slot, moduleId: undefined }))
      const planner = { ...state.planner, grid: { ...state.planner.grid, slots } }
      withPersist('planner', planner)
      return { planner }
    }),
  suggestPlanner: () =>
    set((state) => {
      const suggested = suggestBestArrangement(state.planner, state.techModuleMap)
      withPersist('planner', suggested)
      return { planner: suggested }
    }),
  importPlanner: (planner) =>
    set(() => {
      withPersist('planner', planner)
      return { planner }
    }),
  resetPlanner: () =>
    set(() => {
      withPersist('planner', defaultPlannerState)
      return { planner: defaultPlannerState }
    }),
  upsertHint: (hint) =>
    set((state) => {
      const existingIndex = state.hintCustom.findIndex((entry) => entry.id === hint.id)
      const hintCustom = [...state.hintCustom]
      if (existingIndex >= 0) {
        hintCustom[existingIndex] = hint
      } else {
        hintCustom.push(hint)
      }
      withPersist('hints', hintCustom)
      return { hintCustom }
    }),
  removeHint: (id) =>
    set((state) => {
      const hintCustom = state.hintCustom.filter((hint) => hint.id !== id)
      withPersist('hints', hintCustom)
      return { hintCustom }
    }),
  importHints: (hints) =>
    set(() => {
      withPersist('hints', hints)
      return { hintCustom: hints }
    }),
  addPortalEntry: (entry) =>
    set((state) => {
      const portalCustom = [...state.portalCustom, entry]
      withPersist('portals', portalCustom)
      return { portalCustom }
    }),
  importPortals: (entries) =>
    set(() => {
      withPersist('portals', entries)
      return { portalCustom: entries }
    }),
  removePortalEntry: (id) =>
    set((state) => {
      const portalCustom = state.portalCustom.filter((entry) => entry.id !== id)
      withPersist('portals', portalCustom)
      return { portalCustom }
    }),
  setNotes: (notes) =>
    set(() => {
      withPersist('notes', notes)
      return { notes }
    }),
  upsertNote: (note) =>
    set((state) => {
      const notes = [...state.notes]
      const index = notes.findIndex((entry) => entry.id === note.id)
      if (index >= 0) {
        notes[index] = note
      } else {
        notes.push(note)
      }
      withPersist('notes', notes)
      return { notes }
    }),
  removeNotes: (ids) =>
    set((state) => {
      const notes = state.notes.filter((note) => !ids.includes(note.id))
      withPersist('notes', notes)
      return { notes }
    }),
  hydrate: async () => {
    const [plannerPersisted, hintsPersisted, notesPersisted, portalsPersisted] = await Promise.all([
      loadPersisted<PlannerState>('planner'),
      loadPersisted<HintEntry[]>('hints'),
      loadPersisted<NoteEntry[]>('notes'),
      loadPersisted<PortalEntry[]>('portals')
    ])
    set((state) => ({
      ready: true,
      planner: plannerPersisted ?? state.planner,
      hintCustom: hintsPersisted ?? state.hintCustom,
      notes: notesPersisted ?? state.notes,
      portalCustom: portalsPersisted ?? state.portalCustom
    }))
  },
  clearPersistence: async () => {
    await Promise.all([
      clearPersisted('planner'),
      clearPersisted('hints'),
      clearPersisted('notes'),
      clearPersisted('portals')
    ])
    set({
      hintCustom: [],
      notes: [],
      portalCustom: [],
      planner: defaultPlannerState
    })
  }
}))

export const createNote = (name: string, type: NoteEntry['type']): NoteEntry => ({
  id: nanoid(),
  name,
  type,
  parentId: null,
  systemCoords: undefined,
  galaxyIndex: undefined,
  notes: '',
  resources: [],
  links: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
})

export const ensureNoteTimestamps = (note: NoteEntry): NoteEntry => ({
  ...note,
  createdAt: note.createdAt ?? Date.now(),
  updatedAt: Date.now()
})

export const getAllPortals = (state: AppState): PortalEntry[] => [...state.portalSeeds, ...state.portalCustom]
export const getAllHints = (state: AppState): HintEntry[] => [...state.hintSeeds, ...state.hintCustom]
