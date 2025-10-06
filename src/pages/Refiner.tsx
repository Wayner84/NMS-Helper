import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { ResourceIcon } from '../components/ResourceIcon'
import { getResourceIcon } from '../lib/resourceIcons'
import { useAppStore } from '../store/useAppStore'
import type { Item } from '../types'

interface DecoratedInput {
  id: string
  qty: number
  name: string
}

interface DecoratedRecipe {
  id: string
  name: string
  inputs: DecoratedInput[]
  output: DecoratedInput
  timeSeconds: number
  searchText: string
}

const fallbackName = (itemId: string): string =>
  itemId
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')

const getItemName = (itemsMap: Map<string, Item>, itemId: string): string =>
  itemsMap.get(itemId)?.name ?? fallbackName(itemId)

const ItemCell = ({
  item,
  emphasize,
  description
}: {
  item: DecoratedInput
  emphasize?: boolean
  description?: string
}): ReactElement => {
  const icon = getResourceIcon(item)

  return (
    <div className="flex items-start gap-3">
      <ResourceIcon iconSrc={icon} label={item.name} />
      <div className="space-y-0.5">
        <p className={emphasize ? 'font-semibold text-primary' : 'font-medium text-slate-100'}>
          {item.name}
        </p>
        <p className="text-xs text-slate-400">Qty {item.qty.toLocaleString()}</p>
        {description ? (
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

const Refiner = (): ReactElement => {
  const { refinerRecipes, itemsMap } = useAppStore((state) => ({
    refinerRecipes: state.refinerRecipes,
    itemsMap: state.itemsMap
  }))
  const [query, setQuery] = useState('')

  const decoratedRecipes = useMemo<DecoratedRecipe[]>(() => {
    return refinerRecipes
      .map((recipe) => {
        const inputs: DecoratedInput[] = recipe.inputs.map((input) => ({
          id: input.item,
          qty: input.qty,
          name: getItemName(itemsMap, input.item)
        }))
        const output: DecoratedInput = {
          id: recipe.output.item,
          qty: recipe.output.qty,
          name: getItemName(itemsMap, recipe.output.item)
        }
        const searchText = [
          recipe.name,
          output.name,
          output.id,
          ...inputs.flatMap((input) => [input.name, input.id])
        ]
          .join(' ')
          .toLowerCase()

        return {
          id: recipe.id,
          name: recipe.name,
          inputs,
          output,
          timeSeconds: recipe.timeSeconds,
          searchText
        }
      })
      .sort((a, b) => a.output.name.localeCompare(b.output.name))
  }, [itemsMap, refinerRecipes])

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return decoratedRecipes
    return decoratedRecipes.filter((recipe) => recipe.searchText.includes(normalized))
  }, [decoratedRecipes, query])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-100">Refiner Recipes</h1>
        <p className="text-sm text-slate-400">
          Browse every refiner combination in a simple table. Search by input or output to quickly
          find the recipe you need.
        </p>
      </header>

      <section className="rounded-xl border border-slate-700 bg-surface/70 p-4">
        <label className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
          <span className="text-xs uppercase tracking-wide text-slate-500">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Chromatic Metal or Sodium"
            className="w-full rounded border border-slate-600 bg-surface/80 px-3 py-2 text-slate-100"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Showing {filteredRecipes.length.toLocaleString()} of {decoratedRecipes.length.toLocaleString()} recipes
        </p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-surface/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-surface/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Input 1</th>
                <th className="px-4 py-3 text-left">Input 2</th>
                <th className="px-4 py-3 text-left">Input 3</th>
                <th className="px-4 py-3 text-left">Output</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecipes.map((recipe) => {
                const inputs = [recipe.inputs[0], recipe.inputs[1], recipe.inputs[2]]
                return (
                  <tr key={recipe.id} className="border-b border-slate-800/60">
                    {inputs.map((input, index) => (
                      <td key={`${recipe.id}-in-${index}`} className="px-4 py-3 align-top">
                        {input ? (
                          <ItemCell item={input} />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-700/60 bg-surface/40 text-[10px] uppercase tracking-wide text-slate-600">
                            Empty
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 align-top">
                      <ItemCell
                        item={recipe.output}
                        emphasize
                        description={recipe.name ? recipe.name : undefined}
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">
                      {recipe.timeSeconds > 0 ? `${recipe.timeSeconds}s` : 'Instant'}
                    </td>
                  </tr>
                )
              })}
              {filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No recipes match that search. Try another item name.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Refiner
