import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'pmh.theme'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Ignore unavailable storage.
  }
  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1120' : '#f8fafc')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Ignore unavailable storage.
    }
  }, [theme])

  return { theme, toggle: () => setTheme(t => (t === 'light' ? 'dark' : 'light')) }
}
