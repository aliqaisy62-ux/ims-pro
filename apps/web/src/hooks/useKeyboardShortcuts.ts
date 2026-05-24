'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.key) {
        case 'F2':
          e.preventDefault()
          router.push('/sales/new')
          break
        case 'F3':
          // Focus the barcode input on the current POS page
          e.preventDefault()
          document.dispatchEvent(new CustomEvent('ims-focus-barcode'))
          break
        case 'F4':
          // Confirm / submit the active invoice
          e.preventDefault()
          document.dispatchEvent(new CustomEvent('ims-confirm-invoice'))
          break
        case 'Escape':
          document.dispatchEvent(new CustomEvent('ims-close-modal'))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])
}
