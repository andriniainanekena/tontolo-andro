import { useEffect, useState } from 'react'

export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export function useStoredNumber(key: string) {
  const [value, setValue] = useState<number | null>(() => {
    const stored = localStorage.getItem(key)
    return stored === null ? null : Number(stored)
  })

  function set(next: number) {
    setValue(next)
    localStorage.setItem(key, String(next))
  }

  return [value, set] as const
}
