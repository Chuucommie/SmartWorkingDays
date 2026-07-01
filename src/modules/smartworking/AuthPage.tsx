import { useState } from 'react'
import { register, login, saveSession, initTursoAuth, type AuthUser } from '../shared/tursoAuth.ts'
import { APP_CONFIG } from '../shared/config.ts'
import { LOCATIONS } from './teamView.ts'

interface AuthPageProps {
  onLogin: (user: AuthUser) => void
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('IT')
  const [location, setLocation] = useState('')
  const [dbToken, setDbToken] = useState(APP_CONFIG.turso.token || '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ensureAuth = () => {
    const token = dbToken || APP_CONFIG.turso.token
    if (!token) {
      setError('Inserisci il token del database Turso')
      return null
    }
    initTursoAuth({ url: APP_CONFIG.turso.url, token: token })
    return token
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const token = ensureAuth()
    if (!token) { setLoading(false); return }

    try {
      if (mode === 'register') {
        if (!name.trim() || !location) {
          setError('Compila tutti i campi')
          setLoading(false)
          return
        }
        const result = await register(email, password, name.trim(), department, location)
        if (!result.success || !result.user) {
          setError(result.error || 'Registrazione fallita')
          setLoading(false)
          return
        }
        saveSession({
          userId: result.user.id,
          email: result.user.email,
          name: result.user.name,
          department: result.user.department,
          locationCode: result.user.locationCode,
          token: token,
        })
        onLogin(result.user)
      } else {
        const result = await login(email, password)
        if (!result.success || !result.user) {
          setError(result.error || 'Login fallito')
          setLoading(false)
          return
        }
        saveSession({
          userId: result.user.id,
          email: result.user.email,
          name: result.user.name,
          department: result.user.department,
          locationCode: result.user.locationCode,
          token: token,
        })
        onLogin(result.user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h1 className="auth-title">EOS Smart Working</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Accedi con il tuo account' : 'Crea un nuovo account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-tabs">
            <button
              type="button"
              className={'auth-tab ' + (mode === 'login' ? 'active' : '')}
              onClick={() => { setMode('login'); setError(null) }}
            >
              🔑 Accedi
            </button>
            <button
              type="button"
              className={'auth-tab ' + (mode === 'register' ? 'active' : '')}
              onClick={() => { setMode('register'); setError(null) }}
            >
              ✨ Registrati
            </button>
          </div>

          {/* Database token field */}
          <div className="auth-field">
            <label htmlFor="dbToken">🗄️ Token Database Turso</label>
            <input
              id="dbToken"
              type="password"
              value={dbToken}
              onChange={e => setDbToken(e.target.value)}
              placeholder="eyJhbG... (dal dashboard Turso)"
              className="auth-input"
              autoComplete="off"
            />
            <span className="auth-hint">
              Trovi il token nel dashboard del database su turso.tech
            </span>
          </div>

          <div className="auth-field">
            <label htmlFor="email">📧 Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tuo@email.com"
              required
              className="auth-input"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">🔒 Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="auth-input"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="auth-field">
                <label htmlFor="name">👤 Nome completo</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Mario Rossi"
                  required
                  className="auth-input"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="department">🏢 Dipartimento</label>
                <input
                  id="department"
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="IT"
                  className="auth-input"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="location">📍 Sede</label>
                <select
                  id="location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  required
                  className="auth-select"
                >
                  <option value="">-- Seleziona sede --</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>
                      {loc.charAt(0) + loc.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && <div className="auth-error">⚠️ {error}</div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? '⏳ Attendere...' : mode === 'login' ? '🔓 Accedi' : '✨ Crea account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Database condiviso su Turso — i tuoi dati sono al sicuro</p>
        </div>
      </div>
    </div>
  )
}
