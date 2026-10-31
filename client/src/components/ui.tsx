import { ButtonHTMLAttributes, ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, LucideIcon, Trash2 } from 'lucide-react'

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

export const card = 'rounded-2xl border border-line bg-surface'

export const inputClass =
  'h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:h-10 sm:text-[15px]'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  icon?: LucideIcon
}

const variants = {
  primary: 'bg-ink text-canvas hover:opacity-90',
  secondary: 'border border-line bg-surface text-ink hover:bg-sunken',
  ghost: 'text-muted hover:bg-sunken hover:text-ink',
  danger: 'text-danger hover:bg-danger/10',
}

const sizes = {
  md: 'h-11 px-4 text-[15px] sm:h-10',
  sm: 'h-9 px-3 text-sm',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-50 sm:h-10 sm:w-10',
        className,
      )}
      {...rest}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

export function ConfirmButton({
  label,
  onConfirm,
  iconOnly = false,
}: {
  label: string
  onConfirm: () => void
  iconOnly?: boolean
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <Button
      variant="danger"
      size="sm"
      icon={armed ? Check : Trash2}
      aria-label={armed ? `Confirm: ${label}` : label}
      title={label}
      className={cx(armed && 'bg-danger/10', iconOnly && !armed && 'w-9 px-0')}
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        onConfirm()
      }}
    >
      {armed ? 'Confirm' : iconOnly ? null : label}
    </Button>
  )
}

export function ColorInput({
  value,
  onChange,
  label = 'Color',
}: {
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  return (
    <label
      title={label}
      className="relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent sm:h-10 sm:w-10"
    >
      <span className="h-6 w-6 rounded-full ring-1 ring-black/15 ring-inset" style={{ backgroundColor: value }} />
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  )
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-prose text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  )
}

export function EmptyState({
  title,
  text,
  to,
  action,
}: {
  title: string
  text?: string
  to?: string
  action?: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-muted">{text}</p>}
      {to && action && (
        <Link
          to={to}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-ink px-4 text-[15px] font-medium text-canvas hover:opacity-90"
        >
          {action}
        </Link>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-sunken', className)} aria-hidden="true" />
}

export function Spinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink"
    />
  )
}

export function TypeDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  )
}
