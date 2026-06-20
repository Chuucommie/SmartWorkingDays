// ──────────────────────────────────────────────
// EOS Timesheet — Theme Provider (Dark/Light)
// ──────────────────────────────────────────────
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

/**
 * Rileva la preferenza di tema del dispositivo.
 * @returns {'dark' | 'light'}
 */
function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Provider che gestisce il tema (dark/light).
 * All'avvio usa la preferenza del dispositivo.
 * L'utente può toggleare manualmente.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
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
    const handler = (e) => {
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
 * @returns {{ theme: 'dark'|'light', toggleTheme: () => void }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve essere usato dentro ThemeProvider')
  return ctx
}
