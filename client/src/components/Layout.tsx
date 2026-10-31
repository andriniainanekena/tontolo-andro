import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  ChartColumn,
  Layers,
  ListChecks,
  LogOut,
  LucideIcon,
  Menu,
  Monitor,
  Moon,
  Sun,
  Tag,
  Timer,
  X,
} from 'lucide-react'
import { todayKey } from '../dates'
import { ThemeMode, useTheme } from '../theme'
import type { User } from '../types'
import { cx, IconButton } from './ui'

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
        <rect width="64" height="64" rx="14" className="fill-ink" />
        <path
          className="fill-canvas"
          d="M18 18.5A2.5 2.5 0 0 1 20.5 16h23a2.5 2.5 0 0 1 2.5 2.5V24a2.5 2.5 0 0 1-2.5 2.5H37V46a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 27 46V26.5h-6.5A2.5 2.5 0 0 1 18 24Z"
        />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">T-andro</span>
    </span>
  )
}

const modes: { mode: ThemeMode; label: string; icon: LucideIcon }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'Match system', icon: Monitor },
]

export function ThemeSwitch() {
  const { mode, setMode } = useTheme()
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-xl bg-sunken p-1">
      {modes.map(({ mode: value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          aria-label={label}
          title={label}
          onClick={() => setMode(value)}
          className={cx(
            'flex h-9 flex-1 items-center justify-center rounded-lg transition-colors',
            mode === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

function NavList() {
  const { pathname } = useLocation()
  const items = [
    { path: '/day', to: `/day/${todayKey()}`, label: 'Today', icon: ListChecks },
    { path: '/calendar', to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { path: '/timer', to: '/timer', label: 'Timer', icon: Timer },
    { path: '/analytics', to: '/analytics', label: 'Analytics', icon: ChartColumn },
    { path: '/routines', to: '/routines', label: 'Routines', icon: Layers },
    { path: '/activities', to: '/activities', label: 'Activities', icon: Tag },
  ]

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map(({ path, to, label, icon: Icon }) => {
        const active = pathname.startsWith(path)
        return (
          <Link
            key={path}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
              active ? 'bg-sunken text-ink' : 'text-muted hover:bg-sunken hover:text-ink',
            )}
          >
            {active && (
              <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-accent" aria-hidden="true" />
            )}
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="mt-auto space-y-3 border-t border-line pt-4">
      <ThemeSwitch />
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-muted" title={user.email}>
          {user.email}
        </p>
        <IconButton icon={LogOut} label="Log out" onClick={onLogout} />
      </div>
    </div>
  )
}

export default function Layout({
  user,
  onLogout,
  children,
}: {
  user: User
  onLogout: () => void
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const { dark, setMode } = useTheme()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 hidden w-[17rem] flex-col border-r border-line bg-surface p-4 lg:flex">
        <div className="mb-6 px-2 pt-1">
          <Logo />
        </div>
        <NavList />
        <SidebarFooter user={user} onLogout={onLogout} />
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-surface pt-[env(safe-area-inset-top)] shadow-sm lg:hidden">
        <div className="flex h-14 items-center gap-1 px-2">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-sunken"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link to={`/day/${todayKey()}`} className="px-1" aria-label="T-andro, go to today">
            <Logo />
          </Link>
          <IconButton
            icon={dark ? Sun : Moon}
            label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setMode(dark ? 'light' : 'dark')}
            className="ml-auto"
          />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fade-in absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="drawer-in absolute inset-y-0 left-0 flex w-[min(86vw,20rem)] flex-col border-r border-line bg-surface p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="mb-6 flex items-center justify-between pl-2">
              <Logo />
              <IconButton icon={X} label="Close menu" onClick={() => setOpen(false)} />
            </div>
            <NavList />
            <SidebarFooter user={user} onLogout={onLogout} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[17rem]">
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  )
}
