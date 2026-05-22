import { useEffect, useRef } from 'react'

interface Options {
  onScan: (barcode: string) => void
  enabled?: boolean
  /** Barcode input element to skip (already handled by form) */
  barcodeInputRef?: React.RefObject<HTMLInputElement>
  minLength?: number
}

/**
 * Global HID barcode scanner listener.
 * USB scanners type chars with < 30ms gaps then send Enter.
 * Fires onScan only when focus is NOT on an interactive input/textarea/select
 * (or when focus IS on the designated barcodeInputRef, which handles itself).
 */
export function useBarcodeScanner({ onScan, enabled = true, barcodeInputRef, minLength = 3 }: Options) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null
      const tag = active?.tagName.toLowerCase() ?? ''

      // If the designated barcode input has focus, the form's onSubmit handles it
      if (barcodeInputRef?.current && active === barcodeInputRef.current) return

      // If user is typing in any other input/textarea/select, leave them alone
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      const now = Date.now()
      const gap = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // Gap > 100ms while buffer has data → human typing, reset
      if (gap > 100 && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim()
        bufferRef.current = ''
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
        if (barcode.length >= minLength) {
          e.preventDefault()
          onScan(barcode)
        }
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { bufferRef.current = '' }, 250)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, onScan, barcodeInputRef, minLength])
}
