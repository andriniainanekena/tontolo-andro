import { FormEvent, InputHTMLAttributes, ReactNode, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../api'
import { ThemeSwitch } from '../components/Layout'
import { cx, IconButton } from '../components/ui'
import type { User } from '../types'

function FloatingInput({
  label,
  trailing,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; trailing?: ReactNode }) {
  return (
    <div className="relative">
      <input
        {...props}
        placeholder=" "
        className={cx(
          'peer h-14 w-full rounded-xl border border-line bg-surface px-3.5 pt-5 pb-1 text-base text-ink focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none sm:bg-canvas',
          !!trailing && 'pr-12',
        )}
      />
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base text-muted transition-all duration-150 peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs peer-autofill:top-3 peer-autofill:translate-y-0 peer-autofill:text-xs peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-xs">
        {label}
      </span>
      {trailing}
    </div>
  )
}

export default function Auth({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      onAuth(await api<User>(`/auth/${mode}`, 'POST', { email, password }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
      setBusy(false)
    }
  }

  const registering = mode === 'register'

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 w-28">
        <ThemeSwitch />
      </div>

      <div className="w-full max-w-[23rem] space-y-3">
        <div className="py-4 sm:rounded-2xl sm:border sm:border-line sm:bg-surface sm:px-9 sm:py-10">
          <h1 className="mb-9 text-center font-display text-4xl font-bold tracking-tight">T-andro</h1>

          <form onSubmit={submit} className="space-y-2.5">
            <FloatingInput
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <FloatingInput
              label={registering ? 'Password (8 characters minimum)' : 'Password'}
              type={show ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete={registering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              trailing={
                <IconButton
                  icon={show ? EyeOff : Eye}
                  label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                />
              }
            />
            {error && (
              <p role="alert" className="pt-1 text-center text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-3 h-12 w-full rounded-xl bg-accent text-base font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Please wait…' : registering ? 'Sign up' : 'Log in'}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => {
            setMode(registering ? 'login' : 'register')
            setError('')
          }}
          className="group w-full rounded-2xl py-5 text-center text-[15px] transition-colors hover:bg-sunken focus-visible:outline-2 focus-visible:outline-accent sm:border sm:border-line sm:bg-surface"
        >
          {registering ? 'Already registered? ' : 'No account yet? '}
          <span className="font-semibold text-accent group-hover:underline">
            {registering ? 'Log in' : 'Create one'}
          </span>
        </button>
      </div>
    </div>
  )
}
