import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const KEY = 'planner.theme'
const query = '(prefers-color-scheme: dark)'

function readMode(): ThemeMode {
  const stored = localStorage.getItem(KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

const isDark = (mode: ThemeMode) => (mode === 'system' ? matchMedia(query).matches : mode === 'dark')

function apply(mode: ThemeMode) {
  const dark = isDark(mode)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0f1c' : '#f4f5f7')
  document.getElementById('favicon')?.setAttribute('href', dark ? '/icons/icon-dark.png' : '/icons/icon-light.png')
}

type ThemeValue = { mode: ThemeMode; dark: boolean; setMode: (mode: ThemeMode) => void }

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [dark, setDark] = useState(() => isDark(readMode()))

  useEffect(() => {
    const update = () => {
      apply(mode)
      setDark(isDark(mode))
    }
    update()
    if (mode !== 'system') return
    const media = matchMedia(query)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [mode])

  function setMode(next: ThemeMode) {
    setModeState(next)
    localStorage.setItem(KEY, next)
  }

  return <ThemeContext.Provider value={{ mode, dark, setMode }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
