'use client'

import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (stored) {
        setTheme(stored)
        document.documentElement.classList.toggle('dark', stored === 'dark')
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // ignore
    }
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return { theme, toggleTheme }
}
