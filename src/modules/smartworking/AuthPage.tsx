import { useState, useEffect } from 'react'
import { register, login, saveSession, initTursoAuth, requestPasswordReset, resetPassword, type AuthUser } from '../shared/tursoAuth.ts'
import { APP_CONFIG } from '../shared/config.ts'
import { LOCATIONS } from './teamView.ts'
import { sendPasswordResetEmail } from '../shared/emailService.ts'

interface AuthPageProps {
  onLogin: (user: AuthUser) => void
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('LABS')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ── Reset password fields ──
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  const ensureAuth = () => {
    const token = APP_CONFIG.turso.token
    if (!token) {
      setError('Token database non configurato')
      return null
    }
    initTursoAuth({ url: APP_CONFIG.turso.url, token: token })
    return token
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
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
      } else if (mode === 'login') {
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

  // ── Richiedi reset password ──
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const dbToken = ensureAuth()
    if (!dbToken) { setLoading(false); return }

    try {
      const result = await requestPasswordReset(resetEmail)
      if (result.success && result.token) {
        // Invia email con il token
        await sendPasswordResetEmail(resetEmail, result.token)
        setSuccess('Email inviata! Controlla la tua casella (o usa il token qui sotto).')
        setResetToken(result.token)
        setMode('reset')
      } else {
        setError(result.error || 'Errore nella richiesta')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  // ── Supporto link reset da URL ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('reset')
    const urlEmail = params.get('email')
    if (urlToken && urlEmail) {
      setResetEmail(urlEmail)
      setResetToken(urlToken)
      setMode('reset')
      // Pulisci l'URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // ── Reimposta password ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const token = ensureAuth()
    if (!token) { setLoading(false); return }

    try {
      if (newPassword.length < 6) {
        setError('La password deve essere di almeno 6 caratteri')
        setLoading(false)
        return
      }
      const result = await resetPassword(resetEmail, resetToken, newPassword)
      if (result.success) {
        setSuccess('Password reimpostata con successo! Ora puoi accedere.')
        setMode('login')
        setEmail(resetEmail)
        setPassword('')
      } else {
        setError(result.error || 'Errore nel reset')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h1 className="auth-title">EOS Smart Working</h1>
          <p className="auth-subtitle">
            {mode === 'login' && 'Accedi con il tuo account'}
            {mode === 'register' && 'Crea un nuovo account'}
            {mode === 'forgot' && 'Recupera la password'}
            {mode === 'reset' && 'Reimposta la password'}
          </p>
        </div>

        {/* ── Login / Register ── */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-tabs">
              <button
                type="button"
                className={'auth-tab ' + (mode === 'login' ? 'active' : '')}
                onClick={() => switchMode('login')}
              >
                🔑 Accedi
              </button>
              <button
                type="button"
                className={'auth-tab ' + (mode === 'register' ? 'active' : '')}
                onClick={() => switchMode('register')}
              >
                ✨ Registrati
              </button>
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
                    type="hidden"
                    value={department}
                    readOnly
                  />
                  <div className="auth-info-text" style={{ padding: '0.5rem 0' }}>
                    Dipartimento: <strong>LABS</strong>
                  </div>
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
            {success && <div className="auth-success">✅ {success}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? '⏳ Attendere...' : mode === 'login' ? '🔓 Accedi' : '✨ Crea account'}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => { switchMode('forgot'); setResetEmail(email) }}
              >
                Password dimenticata?
              </button>
            )}
          </form>
        )}

        {/* ── Forgot Password ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <p className="auth-info-text">
              Inserisci la tua email. Riceverai un token per reimpostare la password.
            </p>

            <div className="auth-field">
              <label htmlFor="resetEmail">📧 Email</label>
              <input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="tuo@email.com"
                required
                className="auth-input"
                autoComplete="email"
              />
            </div>

            {error && <div className="auth-error">⚠️ {error}</div>}
            {success && <div className="auth-success">✅ {success}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? '⏳ Invio...' : '📧 Invia token di reset'}
            </button>

            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => switchMode('login')}
            >
              ← Torna al login
            </button>
          </form>
        )}

        {/* ── Reset Password ── */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <p className="auth-info-text">
              Inserisci il token ricevuto e la nuova password.
            </p>

            <div className="auth-field">
              <label htmlFor="resetEmail2">📧 Email</label>
              <input
                id="resetEmail2"
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="tuo@email.com"
                required
                className="auth-input"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="resetToken">🔑 Token di reset</label>
              <input
                id="resetToken"
                type="text"
                value={resetToken}
                onChange={e => setResetToken(e.target.value)}
                placeholder="Incolla qui il token"
                required
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="newPassword">🔒 Nuova password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="auth-input"
                autoComplete="new-password"
              />
            </div>

            {error && <div className="auth-error">⚠️ {error}</div>}
            {success && <div className="auth-success">✅ {success}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? '⏳ Reimpostazione...' : '🔐 Reimposta password'}
            </button>

            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => switchMode('login')}
            >
              ← Torna al login
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Database condiviso su Turso — i tuoi dati sono al sicuro</p>
        </div>
      </div>
    </div>
  )
}
