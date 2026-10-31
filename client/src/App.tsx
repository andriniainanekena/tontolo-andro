import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ActivityTypesProvider } from './activityTypes'
import { api, setUnauthorizedHandler } from './api'
import { todayKey } from './dates'
import type { User } from './types'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import Activities from './pages/Activities'
import Analytics from './pages/Analytics'
import Auth from './pages/Auth'
import Calendar from './pages/Calendar'
import Dashboard from './pages/Dashboard'
import Routines from './pages/Routines'
import Timer from './pages/Timer'

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  async function logout() {
    await api('/auth/logout', 'POST').catch(() => undefined)
    setUser(null)
  }

  if (user === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (user === null) return <Auth onAuth={setUser} />

  return (
    <BrowserRouter>
      <ActivityTypesProvider>
        <Layout user={user} onLogout={logout}>
          <Routes>
            <Route path="/" element={<Navigate to={`/day/${todayKey()}`} replace />} />
            <Route path="/day/:date" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/timer" element={<Timer />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ActivityTypesProvider>
    </BrowserRouter>
  )
}
