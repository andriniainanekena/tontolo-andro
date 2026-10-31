export type User = { id: number; email: string }

export type Nature = 'productive' | 'leisure' | 'essential'

export const natures: Nature[] = ['productive', 'leisure', 'essential']

export type ActivityType = { id: number; name: string; color: string; nature: Nature; archived: boolean }

export type Routine = { id: number; name: string; color: string; count: number }

export type RoutineActivity = { id: number; title: string; typeId: number; start: string; end: string }

export type Status = 'planned' | 'done' | 'skipped'

export type Activity = { id: number; title: string; typeId: number; status: Status; start: string; end: string }

export type SessionKind = 'focus' | 'short_break' | 'long_break'

export type Session = {
  id: number
  kind: SessionKind
  typeId: number
  label: string
  startedAt: string
  plannedMinutes: number
}

export type Stats = {
  focus: number
  pomodoros: number
  byType: { typeId: number; minutes: number }[]
  done: number
  total: number
}

export type CalendarDay = { day: string; total: number; done: number }

export type Report = {
  timer: { day: string; typeId: number; minutes: number }[]
  routine: { typeId: number; minutes: number }[]
  pomodoros: number
  tasks: { done: number; skipped: number; total: number }
}

export const natureLabels: Record<Nature, string> = {
  productive: 'Productive',
  leisure: 'Leisure',
  essential: 'Essential',
}

export const POMODORO = { focus: 25, short_break: 5, long_break: 15, cycle: 4 } as const

export const sessionLabels: Record<SessionKind, string> = {
  focus: 'Focus',
  short_break: 'Short break',
  long_break: 'Long break',
}

export const palette = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
]
