import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Play, SkipForward, Square } from 'lucide-react'
import { unknownType, useActivityTypes } from '../activityTypes'
import { api } from '../api'
import { Button, card, cx, Field, inputClass, PageHeader, Skeleton } from '../components/ui'
import { formatClock, startOfToday } from '../dates'
import { useNow, useStoredNumber } from '../hooks'
import { chime } from '../sound'
import { useToast } from '../toast'
import { ActivityType, POMODORO, Session, SessionKind, sessionLabels } from '../types'

type Stopped = { kind: SessionKind; completed: boolean } | null

function Ring({ progress, color, children }: { progress: number; color: string; children: ReactNode }) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative mx-auto aspect-square w-[min(80vw,21rem)]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="4" className="stroke-sunken" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(Math.max(progress, 0), 1))}
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

function CycleDots({ done }: { done: number }) {
  const filled = done > 0 && done % POMODORO.cycle === 0 ? POMODORO.cycle : done % POMODORO.cycle
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="img"
      aria-label={`${filled} of ${POMODORO.cycle} pomodoros in this cycle`}
    >
      {Array.from({ length: POMODORO.cycle }, (_, index) => (
        <span
          key={index}
          className={cx('h-3 w-3 rounded-full border-2 border-ink', index < filled ? 'bg-ink' : 'bg-transparent')}
        />
      ))}
    </div>
  )
}

function TypePicker({
  types,
  value,
  onChange,
  label,
}: {
  types: ActivityType[]
  value: number | null
  onChange: (id: number) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {types.map((type) => (
        <button
          key={type.id}
          type="button"
          role="radio"
          aria-checked={value === type.id}
          onClick={() => onChange(type.id)}
          className={cx(
            'inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
            value === type.id ? 'border-ink bg-sunken' : 'border-line hover:bg-sunken',
          )}
        >
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} aria-hidden="true" />
          {type.name}
        </button>
      ))}
    </div>
  )
}

export default function Timer() {
  const { ready, active, byId } = useActivityTypes()
  const { notify, fail } = useToast()
  const now = useNow(500)
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [cycle, setCycle] = useState(0)
  const [next, setNext] = useState<'focus' | 'break'>('focus')
  const [storedFocus, setStoredFocus] = useStoredNumber('planner.focusType')
  const [storedBreak, setStoredBreak] = useStoredNumber('planner.breakType')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const ending = useRef(false)
  const seenRunning = useRef(false)

  const focusType =
    active.find((type) => type.id === storedFocus) ?? active.find((type) => type.nature === 'productive') ?? active[0]
  const breakType =
    active.find((type) => type.id === storedBreak) ??
    active.find((type) => type.nature === 'essential') ??
    active.find((type) => type.nature !== 'productive') ??
    active[0]

  const loadCycle = useCallback(async () => {
    const { completed } = await api<{ completed: number }>(
      `/pomodoro/cycle?from=${encodeURIComponent(startOfToday().toISOString())}`,
    )
    setCycle(completed)
    return completed
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([api<Session | null>('/pomodoro/active'), loadCycle()])
      .then(([current]) => !cancelled && setSession(current))
      .catch((error) => {
        if (cancelled) return
        fail(error)
        setSession(null)
      })
    return () => {
      cancelled = true
    }
  }, [loadCycle, fail])

  const remaining = session
    ? Math.max(
        0,
        Math.ceil((new Date(session.startedAt).getTime() + session.plannedMinutes * 60_000 - now.getTime()) / 1000),
      )
    : 0

  const finish = useCallback(
    async (current: Session, automatic: boolean) => {
      if (ending.current) return
      ending.current = true
      try {
        const result = await api<Stopped>(`/pomodoro/${current.id}/stop`, 'POST')
        setSession(null)
        await loadCycle()
        if (!result) return
        if (current.kind === 'focus') {
          if (result.completed) {
            setNext('break')
            if (automatic) chime()
          } else {
            setNext('focus')
            notify("Stopped early: this pomodoro won't count toward your cycle of four.", 'error')
          }
        } else {
          setNext('focus')
          if (automatic) chime()
        }
      } catch (error) {
        fail(error)
      } finally {
        ending.current = false
      }
    },
    [loadCycle, notify, fail],
  )

  useEffect(() => {
    if (!session) {
      seenRunning.current = false
    } else if (remaining > 0) {
      seenRunning.current = true
    } else {
      void finish(session, seenRunning.current)
    }
  }, [session, remaining, finish])

  useEffect(() => {
    if (!session) return
    document.title = `${formatClock(remaining)} ${sessionLabels[session.kind]} · T-andro`
    return () => {
      document.title = 'T-andro'
    }
  }, [session, remaining])

  async function begin(kind: SessionKind, type: ActivityType | undefined, label = '') {
    if (!type || busy) return
    setBusy(true)
    try {
      ending.current = false
      setSession(await api<Session>('/pomodoro', 'POST', { kind, typeId: type.id, label }))
      setNote('')
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  if (session === undefined || !ready) {
    return (
      <div>
        <PageHeader title="Timer" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  const longBreak = cycle > 0 && cycle % POMODORO.cycle === 0
  const breakKind: SessionKind = longBreak ? 'long_break' : 'short_break'

  if (session) {
    const type = byId.get(session.typeId) ?? unknownType
    const total = session.plannedMinutes * 60
    return (
      <div>
        <PageHeader title="Timer" />
        <section className={`${card} px-4 py-8 text-center sm:py-10`} aria-live="off">
          <p className="mb-5 font-medium text-muted">
            {sessionLabels[session.kind]}, {session.plannedMinutes} min
          </p>
          <Ring progress={1 - remaining / total} color={type.color}>
            <p
              className="font-display text-6xl font-bold tabular-nums sm:text-7xl"
              role="timer"
              aria-label={`${formatClock(remaining)} left`}
            >
              {formatClock(remaining)}
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: type.color }} aria-hidden="true" />
              {type.name}
            </p>
          </Ring>
          {session.label && <p className="mx-auto mt-5 max-w-sm text-lg">{session.label}</p>}
          <div className="mt-6 flex flex-col items-center gap-2">
            <Button icon={session.kind === 'focus' ? Square : SkipForward} onClick={() => void finish(session, false)}>
              {session.kind === 'focus' ? 'Stop' : 'End break'}
            </Button>
            {session.kind === 'focus' && (
              <p className="max-w-xs text-sm text-muted">
                Stopping early voids this pomodoro. The time is still counted in your stats.
              </p>
            )}
          </div>
        </section>
      </div>
    )
  }

  if (next === 'break') {
    return (
      <div>
        <PageHeader title="Timer" />
        <section className={`${card} space-y-5 p-5 sm:p-6`}>
          <CycleDots done={cycle} />
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold">
              {longBreak
                ? `${POMODORO.cycle} pomodoros done. Take a long break.`
                : 'Pomodoro done. Take a short break.'}
            </h2>
            <p className="mt-1 text-muted">{POMODORO[breakKind]} minutes. What will you do?</p>
          </div>
          <TypePicker types={active} value={breakType?.id ?? null} onChange={setStoredBreak} label="Break activity" />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              icon={Play}
              disabled={busy || !breakType}
              onClick={() => {
                if (breakType) setStoredBreak(breakType.id)
                void begin(breakKind, breakType)
              }}
            >
              Start {POMODORO[breakKind]} min break
            </Button>
            <Button variant="ghost" onClick={() => setNext('focus')}>
              Skip the break
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Timer" />
      <form
        className={`${card} space-y-5 p-5 sm:p-6`}
        onSubmit={(event) => {
          event.preventDefault()
          if (focusType) setStoredFocus(focusType.id)
          void begin('focus', focusType, note.trim())
        }}
      >
        <CycleDots done={cycle} />
        <p className="text-center text-sm text-muted">
          {cycle % POMODORO.cycle === 0 && cycle > 0
            ? 'Cycle complete'
            : `Pomodoro ${(cycle % POMODORO.cycle) + 1} of ${POMODORO.cycle}`}
        </p>
        <div>
          <p className="mb-2 text-sm font-medium text-muted">What are you working on?</p>
          <TypePicker types={active} value={focusType?.id ?? null} onChange={setStoredFocus} label="Focus activity" />
        </div>
        <Field label="Note (optional)">
          <input
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Chapter 3 exercises"
            className={inputClass}
          />
        </Field>
        <Button type="submit" variant="primary" icon={Play} disabled={busy || !focusType} className="w-full sm:w-auto">
          Start {POMODORO.focus} min focus
        </Button>
      </form>
    </div>
  )
}
