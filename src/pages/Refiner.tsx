import { useMemo, useState } from 'react'
import type { DragEvent, ReactElement } from 'react'
import { useAppStore } from '../store/useAppStore'
import { computeValuePerHour, matchRefinerRecipe, suggestRefinerChains } from '../lib/refiner'
import type { RefinerSlotState } from '../lib/refiner'
import type { RefinerRecipe } from '../types'
import { clsx } from 'clsx'

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

const RefinerSlot = ({
  slot,
  index,
  items,
  onChangeItem,
  onChangeQty,
  onSwap
}: {
  slot: RefinerSlotState
  index: number
  items: Array<{ id: string; name: string }>
  onChangeItem: (index: number, itemId: string | null) => void
  onChangeQty: (index: number, qty: number) => void
  onSwap: (from: number, to: number) => void
}): ReactElement => {
  const [isDragging, setDragging] = useState(false)

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', String(index))
    setDragging(true)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const from = Number(event.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from)) {
      onSwap(from, index)
    }
    setDragging(false)
  }

  return (
    <div
      className={clsx(
        'flex min-w-[220px] flex-1 flex-col gap-2 rounded-lg border border-slate-700 bg-surface/60 p-4',
        isDragging && 'ring-2 ring-primary'
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">Input {index + 1}</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-primary"
            onClick={() => onSwap(index, (index + 1) % 3)}
          >
            Swap →
          </button>
          <button
            type="button"
            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-primary"
            onClick={() => onSwap(index, (index + 2) % 3)}
          >
            Swap ←
          </button>
        </div>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">Material</span>
        <select
          className="rounded border border-slate-600 bg-surface/80 px-3 py-2"
          value={slot.itemId ?? ''}
          onChange={(event) => onChangeItem(index, event.target.value || null)}
        >
          <option value="">— empty —</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">Quantity</span>
        <input
          type="number"
          min={1}
          className="w-full rounded border border-slate-600 bg-surface/80 px-3 py-2"
          value={slot.qty}
          onChange={(event) => onChangeQty(index, Number(event.target.value))}
        />
      </label>
    </div>
  )
}

const Refiner = (): ReactElement => {
  const {
    items,
    itemsMap,
    refinerRecipes,
    refinerSlots,
    setRefinerSlotItem,
    setRefinerSlotQty,
    swapRefinerSlots,
    clearRefinerSlots
  } = useAppStore((state) => ({
    items: state.items,
    itemsMap: state.itemsMap,
    refinerRecipes: state.refinerRecipes,
    refinerSlots: state.refinerSlots,
    setRefinerSlotItem: state.setRefinerSlotItem,
    setRefinerSlotQty: state.setRefinerSlotQty,
    swapRefinerSlots: state.swapRefinerSlots,
    clearRefinerSlots: state.clearRefinerSlots
  }))

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items])

  const currentRecipe = useMemo<RefinerRecipe | undefined>(
    () => matchRefinerRecipe(refinerSlots, refinerRecipes),
    [refinerSlots, refinerRecipes]
  )

  const outputItem = currentRecipe ? itemsMap.get(currentRecipe.output.item) : undefined
  const valuePerHour = currentRecipe ? computeValuePerHour(currentRecipe, itemsMap) : 0

  const chainSuggestions = useMemo(
    () => suggestRefinerChains(refinerSlots, refinerRecipes, itemsMap),
    [refinerSlots, refinerRecipes, itemsMap]
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-700 bg-surface/70 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            {refinerSlots.map((slot, index) => (
              <RefinerSlot
                key={`refiner-slot-${index}`}
                slot={slot}
                index={index}
                items={sortedItems}
                onChangeItem={setRefinerSlotItem}
                onChangeQty={setRefinerSlotQty}
                onSwap={swapRefinerSlots}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={clearRefinerSlots}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-primary"
            >
              Clear slots
            </button>
            <div className="text-right text-sm text-slate-400">
              Drag inputs or use swap buttons to reorder. Keyboard users can Tab to a slot and press Swap buttons.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-slate-700 bg-surface/70 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Result</h2>
          {currentRecipe && outputItem ? (
            <dl className="mt-4 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded border border-slate-700 bg-surface/60 px-3 py-2">
                <dt className="font-medium">Output</dt>
                <dd>
                  {outputItem.name} × {currentRecipe.output.qty}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-700 bg-surface/60 px-3 py-2">
                <dt className="font-medium">Time</dt>
                <dd>{formatTime(currentRecipe.timeSeconds)}</dd>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-700 bg-surface/60 px-3 py-2">
                <dt className="font-medium">Estimated value/hour</dt>
                <dd>{valuePerHour.toLocaleString()} units</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Select 1–3 inputs to see matching recipes. The calculator recognises exact ingredient sets and quantities.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-700 bg-surface/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Chain suggestions</h3>
          {chainSuggestions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">
              Add inputs to preview multi-step refining chains that unlock higher value outputs within three steps.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {chainSuggestions.map((chain, index) => (
                <li key={`chain-${index}`} className="rounded border border-slate-700 bg-surface/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <span>{chain.steps.length} step chain</span>
                    <span>{Math.round(chain.valuePerHour).toLocaleString()} units/hr</span>
                  </div>
                  <ol className="mt-2 space-y-1">
                    {chain.steps.map((step, stepIndex) => (
                      <li key={step.id} className="flex items-center justify-between gap-3 rounded bg-surface/70 px-3 py-2 text-xs">
                        <span className="font-medium text-slate-200">
                          {stepIndex + 1}. {step.name}
                        </span>
                        <span className="text-slate-400">→ {itemsMap.get(step.output.item)?.name ?? step.output.item}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-2 text-xs text-slate-400">
                    Total time {formatTime(chain.totalTime)} · Output value {chain.totalValue.toLocaleString()} units
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

export default Refiner
