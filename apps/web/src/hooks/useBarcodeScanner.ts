import { useEffect, useRef } from 'react'

interface Options {
  onScan: (barcode: string) => void
  enabled?: boolean
  /** Barcode input element — already handles its own Enter, so skip it here */
  barcodeInputRef?: React.RefObject<HTMLInputElement>
  minLength?: number
}

/**
 * Global HID/Bluetooth barcode scanner listener.
 *
 * Listens on `document` so keystrokes are captured regardless of which
 * element currently has focus (body, a div, or any non-barcode input).
 *
 * Detection rules:
 *  - Consecutive keystrokes arriving ≤ 200 ms apart are treated as scanner input.
 *  - A gap > 200 ms while the buffer is non-empty resets the buffer (human typing).
 *  - An Enter key flushes the buffer and fires onScan if length ≥ minLength.
 *  - A 350 ms idle timer auto-flushes in case the scanner omits Enter.
 *
 * The designated barcodeInputRef element is intentionally skipped here —
 * it handles scanner Enter via its own onKeyDown → lookupBarcode.
 */
export function useBarcodeScanner({ onScan, enabled = true, barcodeInputRef, minLength = 3 }: Options) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    function flush() {
      const barcode = bufferRef.current.trim()
      bufferRef.current = ''
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      if (barcode.length >= minLength) onScan(barcode)
    }

    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null

      // The designated barcode input handles its own Enter via onKeyDown → lookupBarcode.
      // Let native input behaviour run; this hook stays out of the way.
      if (barcodeInputRef?.current && active === barcodeInputRef.current) return

      const now = Date.now()
      const gap = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // Gap > 200 ms while buffer is non-empty → human typing, reset
      if (gap > 200 && bufferRef.current.length > 0) {
        bufferRef.current = ''
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) e.preventDefault()
        flush()
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
        // Reset the idle-flush timer on every new char
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(flush, 350)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, onScan, barcodeInputRef, minLength])
}
