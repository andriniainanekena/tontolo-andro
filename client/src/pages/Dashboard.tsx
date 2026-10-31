import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, SkipForward, Trash2, Undo2 } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { unknownType, useActivityTypes } from '../activityTypes'
import { api } from '../api'
import DayRibbon from '../components/DayRibbon'
import { Button, card, cx, EmptyState, IconButton, Skeleton, TypeDot } from '../components/ui'
import { formatMinutes, isDayKey, parseKey, shiftDay, todayKey, toMinutes } from '../dates'
import { useNow } from '../hooks'
import { useToast } from '../toast'
import type { Activity, Routine, Stats } from '../types'

function dayRange(date: string) {
  const end = parseKey(shiftDay(date, 1))
  return `from=${parseKey(date).toISOString()}&to=${end.toISOString()}&day=${date}`
}

function isCurrent(activity: Activity, nowMinutes: number) {
  const start = toMinutes(activity.start)
  const end = toMinutes(activity.end)
  return start < end ? start <= nowMinutes && nowMinutes < end : nowMinutes >= start || nowMinutes < end
}

export default function Dashboard() {
  const { date = '' } = useParams()
  if (!isDayKey(date)) return <Navigate to={`/day/${todayKey()}`} replace />
  return <Day date={date} />
}

function Day({ date }: { date: string }) {
  const navigate = useNavigate()
  const { byId } = useActivityTypes()
  const { notify, fail } = useToast()
  const now = useNow(30_000)
  const [routines, setRoutines] = useState<Routine[] | null>(null)
  const [routineId, setRoutineId] = useState<number | null>(null)
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [applying, setApplying] = useState(false)

  const isToday = date === todayKey()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const load = useCallback(async () => {
    try {
      const [list, summary] = await Promise.all([
        api<Activity[]>(`/schedule?day=${date}`),
        api<Stats>(`/stats?${dayRange(date)}`),
      ])
      setActivities(list)
      setStats(summary)
    } catch (error) {
      fail(error)
      setActivities((current) => current ?? [])
    }
  }, [date, fail])

  useEffect(() => {
    setActivities(null)
    load()
  }, [load])

  useEffect(() => {
    api<Routine[]>('/categories')
      .then((list) => {
        setRoutines(list)
        setRoutineId((current) => (list.some((item) => item.id === current) ? current : (list[0]?.id ?? null)))
      })
      .catch(fail)
  }, [fail])

  async function apply() {
    if (routineId === null) return
    setApplying(true)
    try {
      const { added } = await api<{ added: number }>('/schedule/generate', 'POST', { day: date, categoryId: routineId })
      if (added === 0) notify('This routine has no activities yet. Add some in Routines.', 'error')
      else notify(`${added} blocks added to this day`)
      await load()
    } catch (error) {
      fail(error)
    } finally {
      setApplying(false)
    }
  }

  async function setStatus(id: number, status: Activity['status']) {
    try {
      await api(`/schedule/${id}`, 'PATCH', { status })
      await load()
    } catch (error) {
      fail(error)
    }
  }

  async function remove(id: number) {
    try {
      await api(`/schedule/${id}`, 'DELETE')
      await load()
    } catch (error) {
      fail(error)
    }
  }

  const total = stats?.byType.reduce((sum, item) => sum + item.minutes, 0) ?? 0
  const percent = stats && stats.total ? Math.round((stats.done / stats.total) * 100) : 0
  const title = parseKey(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-1">
        <IconButton icon={ChevronLeft} label="Previous day" onClick={() => navigate(`/day/${shiftDay(date, -1)}`)} />
        <div className="min-w-0 flex-1 text-center">
          <h1 className="font-display text-xl leading-tight font-bold tracking-tight sm:text-3xl">{title}</h1>
          {isToday && <p className="text-sm text-muted">Today</p>}
        </div>
        <IconButton icon={ChevronRight} label="Next day" onClick={() => navigate(`/day/${shiftDay(date, 1)}`)} />
        {!isToday && (
          <Button size="sm" onClick={() => navigate(`/day/${todayKey()}`)}>
            Today
          </Button>
        )}
      </header>

      <DayRibbon activities={activities ?? []} byId={byId} nowMinutes={isToday ? nowMinutes : null} />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Day summary">
        <div className={`${card} p-4 md:col-span-2`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Tracked with the timer</h2>
            <p className="font-display text-2xl font-bold tabular-nums">{formatMinutes(total)}</p>
          </div>
          <p className="text-sm text-muted">
            {stats?.pomodoros ?? 0} {stats?.pomodoros === 1 ? 'pomodoro' : 'pomodoros'},{' '}
            {formatMinutes(stats?.focus ?? 0)} of focus
          </p>
          {stats && stats.byType.length > 0 ? (
            <>
              <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                {stats.byType.map((item) => (
                  <span
                    key={item.typeId}
                    style={{ flexGrow: item.minutes, backgroundColor: (byId.get(item.typeId) ?? unknownType).color }}
                  />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {stats.byType.map((item) => {
                  const type = byId.get(item.typeId) ?? unknownType
                  return (
                    <li key={item.typeId} className="flex items-center gap-1.5">
                      <TypeDot color={type.color} />
                      <span>{type.name}</span>
                      <span className="text-muted tabular-nums">{formatMinutes(item.minutes)}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {stats ? 'Nothing tracked this day. Start a session from the Timer.' : ' '}
            </p>
          )}
        </div>

        <div className={`${card} p-4`}>
          <h2 className="font-display text-lg font-semibold">Routine</h2>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {stats?.done ?? 0}
            <span className="text-xl text-muted">/{stats?.total ?? 0}</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">{percent}% of the blocks done</p>
        </div>
      </section>

      <section className={`${card} p-4`} aria-labelledby="apply-routine">
        <h2 id="apply-routine" className="font-display text-lg font-semibold">
          Apply a routine
        </h2>
        {routines === null ? (
          <Skeleton className="mt-3 h-10" />
        ) : routines.length === 0 ? (
          <p className="mt-1 text-muted">
            You have no routine yet.{' '}
            <Link to="/routines" className="font-medium text-ink underline underline-offset-4">
              Create your first routine
            </Link>{' '}
            to fill your days in one click.
          </p>
        ) : (
          <>
            <div role="radiogroup" aria-label="Routine" className="mt-3 flex flex-wrap gap-2">
              {routines.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  role="radio"
                  aria-checked={routineId === routine.id}
                  onClick={() => setRoutineId(routine.id)}
                  className={cx(
                    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
                    routineId === routine.id ? 'border-ink bg-ink text-canvas' : 'border-line hover:bg-sunken',
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-white/40"
                    style={{ backgroundColor: routine.color }}
                  />
                  {routine.name}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={apply} disabled={applying || routineId === null}>
                {applying ? 'Applying…' : 'Apply to this day'}
              </Button>
              <p className="text-sm text-muted">Replaces the blocks still planned. Done and skipped ones stay.</p>
            </div>
          </>
        )}
      </section>

      {activities === null ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          title="Nothing planned for this day"
          to={routines && routines.length === 0 ? '/routines' : undefined}
          action="Create a routine"
        />
      ) : (
        <ul className="space-y-2">
          {activities.map((activity) => {
            const type = byId.get(activity.typeId) ?? unknownType
            const current = isToday && isCurrent(activity, nowMinutes)
            return (
              <li
                key={activity.id}
                className={cx(
                  `${card} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4`,
                  activity.status === 'skipped' && 'opacity-60',
                  current && 'border-ink',
                )}
              >
                <span
                  className="h-10 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: type.color }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 basis-40">
                  <p className={cx('truncate font-medium', activity.status === 'skipped' && 'line-through')}>
                    {activity.title}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                    <span className={cx('tabular-nums', current && 'rounded bg-mark px-1 font-medium text-[#0f1523]')}>
                      {activity.start}–{activity.end}
                    </span>
                    <span>{type.name}</span>
                    {current && <span className="font-medium text-ink">Now</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {activity.status === 'planned' ? (
                    <>
                      <Button size="sm" variant="primary" icon={Check} onClick={() => setStatus(activity.id, 'done')}>
                        Done
                      </Button>
                      <Button size="sm" icon={SkipForward} onClick={() => setStatus(activity.id, 'skipped')}>
                        Skip
                      </Button>
                    </>
                  ) : (
                    <>
                      <span
                        className={cx(
                          'inline-flex items-center gap-1.5 px-1 text-sm font-medium',
                          activity.status === 'done' ? 'text-ok' : 'text-muted',
                        )}
                      >
                        {activity.status === 'done' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <SkipForward className="h-4 w-4" />
                        )}
                        {activity.status === 'done' ? 'Done' : 'Skipped'}
                      </span>
                      <IconButton
                        icon={Undo2}
                        label={`Mark ${activity.title} as planned again`}
                        onClick={() => setStatus(activity.id, 'planned')}
                        className="!h-9 !w-9"
                      />
                    </>
                  )}
                  <IconButton
                    icon={Trash2}
                    label={`Remove ${activity.title}`}
                    onClick={() => remove(activity.id)}
                    className="!h-9 !w-9"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
