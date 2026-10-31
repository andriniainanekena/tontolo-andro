import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import type { ActivityType } from './types'

type Value = {
  ready: boolean
  all: ActivityType[]
  active: ActivityType[]
  byId: Map<number, ActivityType>
  refresh: () => Promise<void>
}

const ActivityTypesContext = createContext<Value | null>(null)

export const unknownType: ActivityType = { id: 0, name: 'Other', color: '#94a3b8', nature: 'essential', archived: true }

export function ActivityTypesProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<ActivityType[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    setAll(await api<ActivityType[]>('/activity-types'))
    setReady(true)
  }, [])

  useEffect(() => {
    refresh().catch(() => setReady(true))
  }, [refresh])

  const value = useMemo<Value>(
    () => ({
      ready,
      all,
      active: all.filter((type) => !type.archived),
      byId: new Map(all.map((type) => [type.id, type])),
      refresh,
    }),
    [all, ready, refresh],
  )

  return <ActivityTypesContext.Provider value={value}>{children}</ActivityTypesContext.Provider>
}

export function useActivityTypes() {
  const value = useContext(ActivityTypesContext)
  if (!value) throw new Error('useActivityTypes must be used inside ActivityTypesProvider')
  return value
}
