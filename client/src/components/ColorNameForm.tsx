import { FormEvent, ReactNode, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { palette } from '../types'
import { Button, ColorInput, inputClass } from './ui'

type Props = {
  initialName?: string
  initialColor: string
  placeholder: string
  submitLabel: string
  resetOnSubmit?: boolean
  maxLength?: number
  onSubmit: (value: { name: string; color: string }) => Promise<unknown>
  onCancel?: () => void
  children?: ReactNode
}

export default function ColorNameForm({
  initialName = '',
  initialColor,
  placeholder,
  submitLabel,
  resetOnSubmit = false,
  maxLength = 60,
  onSubmit,
  onCancel,
  children,
}: Props) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await onSubmit({ name: name.trim(), color })
      if (resetOnSubmit) {
        setName('')
        if (palette.includes(color)) setColor(palette[(palette.indexOf(color) + 1) % palette.length])
      }
    } catch {
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <ColorInput value={color} onChange={setColor} />
      <input
        required
        value={name}
        maxLength={maxLength}
        onChange={(event) => setName(event.target.value)}
        placeholder={placeholder}
        aria-label="Name"
        className={`${inputClass} min-w-0 flex-1 basis-40`}
      />
      {children}
      <Button type="submit" variant="primary" icon={resetOnSubmit ? Plus : Check} disabled={busy || !name.trim()}>
        {submitLabel}
      </Button>
      {onCancel && (
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </form>
  )
}
