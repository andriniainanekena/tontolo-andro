import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react'

type Tone = 'ok' | 'error'
type Toast = { id: number; message: string; tone: Tone }

type ToastValue = { notify: (message: string, tone?: Tone) => void; fail: (error: unknown) => void }

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const notify = useCallback((message: string, tone: Tone = 'ok') => {
    const id = nextId.current++
    setToasts((list) => [...list.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 4500)
  }, [])

  const fail = useCallback(
    (error: unknown) => notify(error instanceof Error ? error.message : 'Something went wrong', 'error'),
    [notify],
  )

  return (
    <ToastContext.Provider value={{ notify, fail }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="toast-in pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-canvas shadow-lg"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${toast.tone === 'error' ? 'bg-danger' : 'bg-ok'}`}
              aria-hidden="true"
            />
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
