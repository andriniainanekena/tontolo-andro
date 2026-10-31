import { useState } from 'react'
import { formatMinutes } from '../dates'
import type { Nature } from '../types'
import { cx } from './ui'

export type Slice = { id: number; label: string; value: number; color: string; nature: Nature }

export function DonutWithDetails({
  slices,
  centerLabel,
  ariaLabel,
}: {
  slices: Slice[]
  centerLabel: string
  ariaLabel: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const gap = slices.length > 1 ? 1.2 : 0

  let offset = 0
  const arcs = slices.map((slice) => {
    const length = (slice.value / total) * circumference
    const arc = { slice, length, offset }
    offset += length
    return arc
  })

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[16rem]">
        <svg viewBox="0 0 100 100" role="img" aria-label={ariaLabel} className="h-full w-full -rotate-90">
          {arcs.map(({ slice, length, offset: start }) => (
            <circle
              key={slice.id}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={active === slice.id ? 17 : 14}
              strokeDasharray={`${Math.max(length - gap, 0.1)} ${circumference}`}
              strokeDashoffset={-start}
              opacity={active === null || active === slice.id ? 1 : 0.3}
              className="transition-[stroke-width,opacity] duration-150"
              onMouseEnter={() => setActive(slice.id)}
              onMouseLeave={() => setActive(null)}
            >
              <title>{`${slice.label}: ${formatMinutes(slice.value)}`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="font-display text-3xl font-bold tabular-nums">{formatMinutes(total)}</p>
          <p className="text-sm text-muted">{centerLabel}</p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-line" onMouseLeave={() => setActive(null)}>
        {slices.map((slice) => {
          const share = (slice.value / total) * 100
          return (
            <li
              key={slice.id}
              tabIndex={0}
              onMouseEnter={() => setActive(slice.id)}
              onFocus={() => setActive(slice.id)}
              onBlur={() => setActive(null)}
              className={cx(
                'rounded-lg px-1 py-2.5 transition-opacity',
                active !== null && active !== slice.id && 'opacity-50',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{slice.label}</span>
                <span className="tabular-nums">{formatMinutes(slice.value)}</span>
                <span className="w-11 text-right text-sm text-muted tabular-nums">{Math.round(share)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: slice.color }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export type DayColumn = {
  day: string
  label: string
  total: number
  parts: { id: number; label: string; color: string; minutes: number }[]
}

export function DayBars({ columns, showValues }: { columns: DayColumn[]; showValues: boolean }) {
  const max = Math.max(...columns.map((column) => column.total), 1)
  return (
    <div
      className="flex h-52 items-end gap-1 sm:gap-2"
      role="img"
      aria-label="Tracked time per day, stacked by activity"
    >
      {columns.map((column) => (
        <div
          key={column.day}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          title={`${column.day}: ${formatMinutes(column.total)}${column.parts.length ? ` (${column.parts.map((part) => `${part.label} ${formatMinutes(part.minutes)}`).join(', ')})` : ''}`}
        >
          {showValues && (
            <span className="text-xs text-muted tabular-nums">{column.total ? formatMinutes(column.total) : ''}</span>
          )}
          <div
            className="flex w-full flex-col-reverse gap-px overflow-hidden rounded-md"
            style={{ height: `${(column.total / max) * (showValues ? 82 : 90)}%`, minHeight: column.total ? 4 : 0 }}
          >
            {column.parts.map((part) => (
              <span key={part.id} style={{ flexGrow: part.minutes, backgroundColor: part.color, minHeight: 2 }} />
            ))}
          </div>
          <span className="h-4 text-xs text-muted">{column.label}</span>
        </div>
      ))}
    </div>
  )
}
