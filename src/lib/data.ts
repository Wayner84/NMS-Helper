import { CraftingRecipe, Item, RefinerRecipe, TechModule } from '../types'

export const mapById = <T extends { id: string }>(items: T[]): Map<string, T> => {
  const map = new Map<string, T>()
  items.forEach((item) => {
    map.set(item.id, item)
  })
  return map
}

export const buildRecipeIndex = (recipes: RefinerRecipe[]): Map<string, RefinerRecipe[]> => {
  const index = new Map<string, RefinerRecipe[]>()
  recipes.forEach((recipe) => {
    recipe.inputs.forEach((input) => {
      const existing = index.get(input.item) ?? []
      existing.push(recipe)
      index.set(input.item, existing)
    })
  })
  return index
}

export const getCraftOutputs = (recipes: CraftingRecipe[]): Map<string, CraftingRecipe> => {
  const map = new Map<string, CraftingRecipe>()
  recipes.forEach((recipe) => {
    map.set(recipe.output.item, recipe)
  })
  return map
}

export const modulesByPlatform = (modules: TechModule[]): Map<string, TechModule[]> => {
  const map = new Map<string, TechModule[]>()
  modules.forEach((module) => {
    const existing = map.get(module.platform) ?? []
    existing.push(module)
    map.set(module.platform, existing)
  })
  return map
}

export const enrichCraftingRecipe = (
  recipe: CraftingRecipe,
  items: Map<string, Item>,
  recipesById: Map<string, CraftingRecipe>
) => {
  const components = recipe.components.map((component) => {
    const item = items.get(component.item)
    const viaRecipe = component.viaRecipe ? recipesById.get(component.viaRecipe) : undefined
    return {
      ...component,
      itemName: item?.name ?? component.item,
      viaRecipeName: viaRecipe?.name ?? null
    }
  })
  return {
    ...recipe,
    components
  }
}
