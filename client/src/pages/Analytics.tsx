import { useEffect, useMemo, useState } from 'react'
import { unknownType, useActivityTypes } from '../activityTypes'
import { api } from '../api'
import { DayBars, DayColumn, DonutWithDetails, Slice } from '../components/charts'
import { card, cx, EmptyState, PageHeader, Skeleton, TypeDot } from '../components/ui'
import { formatMinutes, parseKey, shiftDay, todayKey } from '../dates'
import { useToast } from '../toast'
import { ActivityType, Nature, natureLabels, natures, Report } from '../types'

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
const ranges = [7, 30] as const

const reportUrl = (from: string, to: string) => `/report?from=${from}&to=${to}&tz=${encodeURIComponent(timezone)}`

function sumByType(rows: { typeId: number; minutes: number }[]) {
  const totals = new Map<number, number>()
  for (const row of rows) totals.set(row.typeId, (totals.get(row.typeId) ?? 0) + row.minutes)
  return totals
}

function toSlices(totals: Map<number, number>, byId: Map<number, ActivityType>): Slice[] {
  return [...totals]
    .filter(([, minutes]) => minutes > 0)
    .map(([typeId, minutes]) => {
      const type = byId.get(typeId) ?? unknownType
      return { id: typeId, label: type.name, value: minutes, color: type.color, nature: type.nature }
    })
    .sort((a, b) => b.value - a.value)
}

export default function Analytics() {
  const { byId } = useActivityTypes()
  const { fail } = useToast()
  const [length, setLength] = useState<(typeof ranges)[number]>(7)
  const [report, setReport] = useState<Report | null>(null)
  const [previous, setPrevious] = useState<Report | null>(null)

  const today = todayKey()
  const from = shiftDay(today, -(length - 1))

  useEffect(() => {
    let cancelled = false
    setReport(null)
    const previousTo = shiftDay(from, -1)
    Promise.all([
      api<Report>(reportUrl(from, today)),
      api<Report>(reportUrl(shiftDay(previousTo, -(length - 1)), previousTo)),
    ])
      .then(([current, before]) => {
        if (cancelled) return
        setReport(current)
        setPrevious(before)
      })
      .catch((error) => {
        if (cancelled) return
        fail(error)
      })
    return () => {
      cancelled = true
    }
  }, [from, today, length, fail])

  const data = useMemo(() => {
    if (!report) return null
    const timerTotals = sumByType(report.timer)
    const total = [...timerTotals.values()].reduce((sum, value) => sum + value, 0)

    const columns: DayColumn[] = Array.from({ length }, (_, index) => {
      const day = shiftDay(from, index)
      const parts = report.timer
        .filter((row) => row.day === day && row.minutes > 0)
        .map((row) => {
          const type = byId.get(row.typeId) ?? unknownType
          return { id: row.typeId, label: type.name, color: type.color, minutes: row.minutes }
        })
        .sort((a, b) => b.minutes - a.minutes)
      const date = parseKey(day)
      return {
        day,
        total: parts.reduce((sum, part) => sum + part.minutes, 0),
        parts,
        label:
          length === 7
            ? date.toLocaleDateString('en-US', { weekday: 'short' })
            : index % 5 === 0 || index === length - 1
              ? String(date.getDate())
              : '',
      }
    })

    const byNature = new Map<Nature, number>()
    for (const [typeId, minutes] of timerTotals) {
      const nature = (byId.get(typeId) ?? unknownType).nature
      byNature.set(nature, (byNature.get(nature) ?? 0) + minutes)
    }

    return {
      total,
      timerSlices: toSlices(timerTotals, byId),
      routineSlices: toSlices(sumByType(report.routine), byId),
      columns,
      byNature,
    }
  }, [report, byId, from, length])

  const previousTotal = previous ? previous.timer.reduce((sum, row) => sum + row.minutes, 0) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`Where your time went, from ${parseKey(from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to today.`}
        actions={
          <div role="radiogroup" aria-label="Period" className="flex rounded-xl bg-sunken p-1">
            {ranges.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={length === value}
                onClick={() => setLength(value)}
                className={cx(
                  'h-9 rounded-lg px-4 text-sm font-medium transition-colors',
                  length === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {value} days
              </button>
            ))}
          </div>
        }
      />

      {!report || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          <section className={`${card} p-4 sm:p-5`} aria-labelledby="per-day">
            <h2 id="per-day" className="mb-4 font-display text-lg font-semibold">
              Time per day
            </h2>
            {data.total === 0 ? (
              <p className="text-muted">No timer sessions in this period. Start one from the Timer.</p>
            ) : (
              <>
                <DayBars columns={data.columns} showValues={length === 7} />
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                  {data.timerSlices.map((slice) => (
                    <li key={slice.id} className="flex items-center gap-1.5">
                      <TypeDot color={slice.color} />
                      {slice.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={`${card} p-4 sm:p-5`} aria-labelledby="timer-share">
              <h2 id="timer-share" className="mb-1 font-display text-lg font-semibold">
                Timer, by activity
              </h2>
              <p className="mb-5 text-sm text-muted">Focus sessions and breaks, counted by the activity you picked.</p>
              {data.timerSlices.length === 0 ? (
                <EmptyState
                  title="Nothing tracked yet"
                  text="Your timer sessions will appear here."
                  to="/timer"
                  action="Open the timer"
                />
              ) : (
                <DonutWithDetails slices={data.timerSlices} centerLabel="tracked" ariaLabel="Timer time by activity" />
              )}
            </section>

            <section className={`${card} p-4 sm:p-5`} aria-labelledby="routine-share">
              <h2 id="routine-share" className="mb-1 font-display text-lg font-semibold">
                Routine blocks done, by activity
              </h2>
              <p className="mb-5 text-sm text-muted">Planned blocks you marked as done on Today.</p>
              {data.routineSlices.length === 0 ? (
                <EmptyState title="No block done yet" text="Mark blocks as done on Today to see them here." />
              ) : (
                <DonutWithDetails
                  slices={data.routineSlices}
                  centerLabel="completed"
                  ariaLabel="Completed routine time by activity"
                />
              )}
            </section>
          </div>

          <Review
            length={length}
            total={data.total}
            previousTotal={previousTotal}
            previousPomodoros={previous?.pomodoros ?? 0}
            report={report}
            slices={data.timerSlices}
            columns={data.columns}
            byNature={data.byNature}
          />
        </>
      )}
    </div>
  )
}

function Review({
  length,
  total,
  previousTotal,
  previousPomodoros,
  report,
  slices,
  columns,
  byNature,
}: {
  length: number
  total: number
  previousTotal: number
  previousPomodoros: number
  report: Report
  slices: Slice[]
  columns: DayColumn[]
  byNature: Map<Nature, number>
}) {
  if (total === 0 && report.tasks.total === 0) {
    return (
      <section className={`${card} p-5`} aria-labelledby="review">
        <h2 id="review" className="font-display text-lg font-semibold">
          Review
        </h2>
        <p className="mt-1 text-muted">Your review appears once you have tracked time or planned a day.</p>
      </section>
    )
  }

  const change = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : null
  const productive = byNature.get('productive') ?? 0
  const leisure = byNature.get('leisure') ?? 0
  const top = slices[0]
  const best = columns.reduce((winner, column) => (column.total > winner.total ? column : winner), columns[0])
  const rate = report.tasks.total ? Math.round((report.tasks.done / report.tasks.total) * 100) : null

  const sentences: string[] = []
  if (total > 0 && top) {
    sentences.push(
      `${top.label} took the most time: ${formatMinutes(top.value)}, ${Math.round((top.value / total) * 100)}% of what you tracked.`,
    )
  }
  if (productive > 0 && leisure > 0) {
    sentences.push(
      `Leisure came to ${Math.round((leisure / productive) * 100)}% of your productive time (${formatMinutes(leisure)} against ${formatMinutes(productive)}).`,
    )
  } else if (productive > 0) {
    sentences.push(`All of it was productive time.`)
  }
  if (best.total > 0) {
    sentences.push(
      `Your best day was ${parseKey(best.day).toLocaleDateString('en-US', { weekday: 'long' })} with ${formatMinutes(best.total)}.`,
    )
  }
  if (rate !== null) {
    sentences.push(
      `You completed ${report.tasks.done} of ${report.tasks.total} planned blocks (${rate}%)${report.tasks.skipped ? ` and skipped ${report.tasks.skipped}` : ''}.`,
    )
  }

  const trend =
    change === null
      ? 'No earlier period to compare with.'
      : change === 0
        ? `Same as the previous ${length} days.`
        : `${change > 0 ? '+' : ''}${change}% vs the previous ${length} days.`

  const ordered = slices
    .slice()
    .sort((a, b) => natures.indexOf(a.nature) - natures.indexOf(b.nature) || b.value - a.value)

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="review">
      <h2 id="review" className="font-display text-lg font-semibold">
        Review of the last {length} days
      </h2>

      <p className="mt-3 font-display text-4xl font-bold tabular-nums sm:text-5xl">{formatMinutes(total)}</p>
      <p className="text-muted">tracked with the timer. {trend}</p>

      {ordered.length > 0 && (
        <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {ordered.map((slice) => (
            <span key={slice.id} style={{ flexGrow: slice.value, backgroundColor: slice.color }} />
          ))}
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {natures.map((item) => (
          <div key={item} className="rounded-xl bg-sunken p-3">
            <dt className="text-sm text-muted">{natureLabels[item]}</dt>
            <dd className="font-display text-xl font-bold tabular-nums">{formatMinutes(byNature.get(item) ?? 0)}</dd>
          </div>
        ))}
        <div className="rounded-xl bg-sunken p-3">
          <dt className="text-sm text-muted">Pomodoros</dt>
          <dd className="font-display text-xl font-bold tabular-nums">
            {report.pomodoros}
            <span className="ml-1.5 text-sm font-normal text-muted">
              {previousPomodoros > 0 ? `before: ${previousPomodoros}` : `${(report.pomodoros / length).toFixed(1)}/day`}
            </span>
          </dd>
        </div>
      </dl>

      {sentences.length > 0 && <p className="mt-5 max-w-prose leading-relaxed">{sentences.join(' ')}</p>}
    </section>
  )
}
