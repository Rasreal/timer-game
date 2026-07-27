import { useCallback, useRef, useState } from 'react'

export interface SnackbarState {
  message: string
  tone: 'success' | 'error'
  key: number
}

// Small local helper standing in for Flutter's
// ScaffoldMessenger.of(context).showSnackBar(...) — mirrors the Dart source's
// clearSnackBars() + showSnackBar() pairing (new message replaces any showing
// one) and its ~2000ms auto-dismiss duration.
export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSnackbar = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSnackbar({ message, tone, key: Date.now() })
    timerRef.current = setTimeout(() => setSnackbar(null), 2000)
  }, [])

  return { snackbar, showSnackbar }
}
