import { clsx } from 'clsx'
import type { ReactElement } from 'react'

interface ResourceIconProps {
  iconSrc?: string
  label: string
  className?: string
}

export const ResourceIcon = ({ iconSrc, label, className }: ResourceIconProps): ReactElement => {
  const sizeClass = className ?? 'h-12 w-12'

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={`${label} icon`}
        loading="lazy"
        className={clsx(
          'shrink-0 rounded-full border border-slate-700 bg-surface/80 object-contain p-1 shadow-inner',
          sizeClass
        )}
      />
    )
  }

  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full border border-slate-700 bg-surface/60 text-xs uppercase tracking-wide text-slate-500',
        sizeClass
      )}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  )
}

