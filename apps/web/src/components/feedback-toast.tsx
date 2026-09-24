import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@base-ui/react/button'
import { CheckCircle, Warning, X } from 'reicon-react'

export interface ToastMessage {
  id: number
  kind: 'success' | 'error'
  title: string
  description?: string
  action?: ReactNode
}

export function FeedbackToast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (toast?.kind !== 'success' || toast.action) return
    const timeout = window.setTimeout(onDismiss, 6000)
    return () => window.clearTimeout(timeout)
  }, [toast, onDismiss])

  const content = toast && (
    <div
      key={toast.id}
      className={`feedback-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_18px_50px_rgba(23,56,47,0.18)] ${toast.kind === 'error' ? 'border-[#e8c6c3]' : 'border-[#cce4d2]'}`}
    >
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${toast.kind === 'error' ? 'bg-[#fbedeb] text-[#a43e37]' : 'bg-[#e9f5ec] text-[#216b4e]'}`}
        aria-hidden="true"
      >
        {toast.kind === 'error' ? (
          <Warning size={18} />
        ) : (
          <CheckCircle size={18} />
        )}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-extrabold text-[#213231]">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs leading-5 text-[#52665b] wrap-anywhere">
            {toast.description}
          </p>
        )}
        {toast.action && <div className="mt-2.5">{toast.action}</div>}
      </div>
      <Button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-[#60736a] hover:bg-[#edf3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
      >
        <X size={17} aria-hidden="true" />
      </Button>
    </div>
  )

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end sm:right-6 sm:bottom-6 sm:left-auto sm:w-96">
      <div role="status" aria-live="polite" className="w-full">
        {toast?.kind === 'success' ? content : null}
      </div>
      <div role="alert" className="w-full">
        {toast?.kind === 'error' ? content : null}
      </div>
    </div>
  )
}
