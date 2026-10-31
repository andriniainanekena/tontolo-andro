export const toKey = (date: Date) => date.toLocaleDateString('en-CA')

export const todayKey = () => toKey(new Date())

export const parseKey = (key: string) => new Date(`${key}T00:00:00`)

export const isDayKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseKey(value).getTime())

export function shiftDay(key: string, days: number) {
  const date = parseKey(key)
  date.setDate(date.getDate() + days)
  return toKey(date)
}

export const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export const toMinutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5))

export function addMinutes(clock: string, delta: number) {
  const total = (((toMinutes(clock) + delta) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function formatMinutes(total: number) {
  const minutes = Math.round(total)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`
}

export const formatClock = (seconds: number) => {
  const safe = Math.max(seconds, 0)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}
