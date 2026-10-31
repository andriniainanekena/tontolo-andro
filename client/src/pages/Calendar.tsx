import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { Button, card, cx, IconButton, PageHeader } from '../components/ui'
import { toKey, todayKey } from '../dates'
import { useToast } from '../toast'
import type { CalendarDay } from '../types'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

export default function Calendar() {
  const navigate = useNavigate()
  const { fail } = useToast()
  const [month, setMonth] = useState(() => firstOfMonth(new Date()))
  const [days, setDays] = useState<Record<string, CalendarDay>>({})

  const monthKey = toKey(month).slice(0, 7)
  const offset = (month.getDay() + 6) % 7
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)]
  const today = todayKey()
  const isCurrentMonth = monthKey === today.slice(0, 7)

  useEffect(() => {
    let cancelled = false
    api<CalendarDay[]>(`/calendar?month=${monthKey}`)
      .then((rows) => !cancelled && setDays(Object.fromEntries(rows.map((row) => [row.day, row]))))
      .catch(fail)
    return () => {
      cancelled = true
    }
  }, [monthKey, fail])

  const shiftMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  return (
    <div>
      <PageHeader
        title={month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        actions={
          <div className="flex items-center gap-1">
            {!isCurrentMonth && (
              <Button size="sm" onClick={() => setMonth(firstOfMonth(new Date()))}>
                Today
              </Button>
            )}
            <IconButton icon={ChevronLeft} label="Previous month" onClick={() => shiftMonth(-1)} />
            <IconButton icon={ChevronRight} label="Next month" onClick={() => shiftMonth(1)} />
          </div>
        }
      />

      <div className={`${card} p-2 sm:p-4`}>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekdays.map((weekday) => (
            <p key={weekday} className="pb-1 text-center text-xs font-medium text-muted">
              <span className="sm:hidden">{weekday[0]}</span>
              <span className="hidden sm:inline">{weekday}</span>
            </p>
          ))}
          {cells.map((cell, index) => {
            if (cell === null) return <div key={`blank-${index}`} />
            const key = `${monthKey}-${String(cell).padStart(2, '0')}`
            const info = days[key]
            const percent = info ? (info.done / info.total) * 100 : 0
            const isToday = key === today
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(`/day/${key}`)}
                aria-label={`${key}${info ? `, ${info.done} of ${info.total} blocks done` : ', nothing planned'}`}
                className={cx(
                  'flex h-14 flex-col rounded-xl border p-1.5 text-left transition-colors hover:bg-sunken sm:h-24 sm:p-2.5',
                  isToday ? 'border-ink' : 'border-line',
                )}
              >
                <span
                  className={cx(
                    'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-medium tabular-nums',
                    isToday && 'bg-mark text-[#0f1523]',
                  )}
                >
                  {cell}
                </span>
                {info && (
                  <>
                    <span className="mt-auto hidden text-xs text-muted tabular-nums sm:block">
                      {info.done}/{info.total}
                    </span>
                    <span className="mt-auto h-1.5 overflow-hidden rounded-full bg-sunken sm:mt-1">
                      <span className="block h-full rounded-full bg-ok" style={{ width: `${percent}%` }} />
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
