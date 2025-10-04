import { useVirtualizer } from '@tanstack/react-virtual'
import type { ReactElement, ReactNode } from 'react'
import { useRef } from 'react'
import { clsx } from 'clsx'

interface VirtualListProps<T> {
  items: T[]
  renderRow: (item: T, index: number) => ReactNode
  estimateSize?: number
  overscan?: number
  className?: string
}

export const VirtualList = <T,>({
  items,
  renderRow,
  estimateSize = 112,
  overscan = 8,
  className
}: VirtualListProps<T>): ReactElement => {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan
  })

  return (
    <div ref={parentRef} className={clsx('h-[70vh] overflow-y-auto pr-2', className)}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {renderRow(item, virtualRow.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default VirtualList
