import { useCallback, useRef, useState } from 'react'
import type { ToastMessage } from './feedback-toast'

export function useFeedbackToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const nextId = useRef(0)

  const showToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    setToast({ ...message, id: ++nextId.current })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  return { toast, showToast, dismissToast }
}
