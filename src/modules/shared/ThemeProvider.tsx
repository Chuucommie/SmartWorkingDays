// ──────────────────────────────────────────────
// EOS Timesheet — Theme Provider (Dark/Light)
// ──────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Rileva la preferenza di tema del dispositivo.
 */
function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Provider che gestisce il tema (dark/light).
 * All'avvio usa la preferenza del dispositivo.
 * L'utente può toggleare manualmente.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Legge tema salvato o usa preferenza sistema
    const saved = localStorage.getItem('eos-theme')
    if (saved === 'dark' || saved === 'light') return saved
    return getSystemTheme()
  })

  // Applica classe al <html> per CSS
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('eos-theme', theme)
  }, [theme])

  // Ascolta cambiamenti preferenza sistema (solo se l'utente non ha scelto manualmente)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('eos-theme')
      if (!saved || saved === 'dark' || saved === 'light') {
        // Se l'utente ha già scelto manualmente, non cambiare
        if (saved) return
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook per accedere al tema corrente e al toggle.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve essere usato dentro ThemeProvider')
  return ctx
}
