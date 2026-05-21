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
          e.preventDefault()
          router.push('/purchases/new')
          break
        case 'F4':
          e.preventDefault()
          router.push('/vouchers/new')
          break
        case 'Escape':
          // Close any open modals — dispatch a custom event
          document.dispatchEvent(new CustomEvent('ims-close-modal'))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])
}
