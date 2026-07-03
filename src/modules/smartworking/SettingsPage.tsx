// ──────────────────────────────────────────────
// EOS Smart Working — Pagina Impostazioni
// ──────────────────────────────────────────────
//
// Permette a ogni membro del team di configurare:
//   - Nome visualizzato
//   - Sede (Treviso, Bologna, Milano)
//   - Cambio email (richiede password attuale)
//
// Tutto salvato nel database Turso — persistente tra browser.
// L'ID dipendente è fisso e unico (= userId Turso).
// ──────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LOCATIONS } from './teamView.ts'
import { loadSession, changeEmail } from '../shared/tursoAuth.ts'
import { loadUserProfile, saveUserProfile } from '../shared/tursoSettings.ts'
import type { UserProfile } from '../shared/tursoSettings.ts'

export default function SettingsPage() {
  const session = loadSession()

  // ── Stato profilo ──
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [locationCode, setLocationCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Cambio email ──
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  // ── Carica profilo dal database al mount ──
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!session) {
        setLoading(false)
        return
      }
      const p = await loadUserProfile()
      if (cancelled) return
      if (p) {
        setProfile(p)
        setDisplayName(p.displayName)
        setLocationCode(p.locationCode)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Salva profilo ──
  const handleSave = async () => {
    if (!displayName.trim()) {
      setSaveMsg({ type: 'error', text: 'Inserisci il tuo nome' })
      return
    }
    if (!locationCode) {
      setSaveMsg({ type: 'error', text: 'Seleziona la tua sede' })
      return
    }

    setSaving(true)
    setSaveMsg(null)

    const result = await saveUserProfile(displayName.trim(), locationCode)

    setSaving(false)
    if (result.success && result.profile) {
      setProfile(result.profile)
      setSaveMsg({ type: 'success', text: 'Impostazioni salvate nel database!' })
    } else {
      setSaveMsg({ type: 'error', text: result.error || 'Errore durante il salvataggio' })
    }
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // ── Cambio email ──
  const handleChangeEmail = async () => {
    if (!session) {
      setEmailMsg({ type: 'error', text: 'Devi aver effettuato il login' })
      return
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Inserisci un indirizzo email valido' })
      return
    }
    if (!currentPassword) {
      setEmailMsg({ type: 'error', text: 'Inserisci la password attuale per confermare' })
      return
    }

    setEmailLoading(true)
    setEmailMsg(null)

    const result = await changeEmail(session.userId, newEmail.trim(), currentPassword)

    setEmailLoading(false)
    if (result.success) {
      setEmailMsg({ type: 'success', text: 'Email aggiornata con successo!' })
      setNewEmail('')
      setCurrentPassword('')
      // Ricarica il profilo per mostrare la nuova email
      const p = await loadUserProfile()
      if (p) {
        setProfile(p)
        setDisplayName(p.displayName)
        setLocationCode(p.locationCode)
      }
    } else {
      setEmailMsg({ type: 'error', text: result.error || 'Errore durante il cambio email' })
    }
  }

  // ── Copia ID ──
  const handleCopyId = () => {
    if (!profile) return
    navigator.clipboard.writeText(profile.employeeId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-card glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Caricamento impostazioni...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="settings-page">
        <div className="settings-card glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Devi aver effettuato il login per vedere le impostazioni.</p>
          <Link to="/" className="sw-nav-link" style={{ display: 'inline-block', marginTop: '1rem' }}>
            ← Torna al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-card glass-card">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-icon">⚙️</div>
          <h1 className="settings-title">Impostazioni</h1>
          <p className="settings-subtitle">
            Il tuo profilo è salvato nel database e condiviso tra tutti i dispositivi
          </p>
        </div>

        {/* Form */}
        <div className="settings-form">
          {/* Email (sola lettura, cambiabile sotto) */}
          <div className="settings-field">
            <label className="settings-label">
              📧 Email di login
            </label>
            <input
              type="email"
              value={profile?.email || session.email}
              readOnly
              className="settings-input readonly"
            />
            <span className="settings-hint">La tua email di accesso. Cambiala nella sezione sotto.</span>
          </div>

          {/* Nome */}
          <div className="settings-field">
            <label className="settings-label" htmlFor="displayName">
              👤 Nome visualizzato
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="es. Ricardo Quintero"
              maxLength={50}
              className="settings-input"
            />
            <span className="settings-hint">Come apparirai nella vista team</span>
          </div>

          {/* Sede */}
          <div className="settings-field">
            <label className="settings-label" htmlFor="location">
              📍 Sede
            </label>
            <select
              id="location"
              value={locationCode}
              onChange={e => setLocationCode(e.target.value)}
              className="settings-select"
            >
              <option value="">-- Seleziona sede --</option>
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>
                  {loc.charAt(0) + loc.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <span className="settings-hint">
              Determina quali colleghi vedi nella vista team
            </span>
          </div>

          {/* Employee ID (fisso = userId Turso) */}
          <div className="settings-field">
            <label className="settings-label">
              🆔 ID Dipendente
            </label>
            <div className="settings-token-row">
              <input
                type="text"
                value={profile?.employeeId || session.userId}
                readOnly
                className="settings-input readonly"
              />
              <button
                type="button"
                onClick={handleCopyId}
                className="settings-toggle-btn"
                title="Copia ID"
              >
                {copied ? '✅' : '📋'}
              </button>
            </div>
            <span className="settings-hint">
              Il tuo identificativo unico e permanente. Corrisponde al tuo ID su database.
            </span>
          </div>

          {/* Dipartimento (sola lettura) */}
          <div className="settings-field">
            <label className="settings-label">
              🏢 Dipartimento
            </label>
            <input
              type="text"
              value={profile?.department || session.department || 'IT'}
              readOnly
              className="settings-input readonly"
            />
          </div>

          {/* Messaggi salvataggio */}
          {saveMsg && (
            <div className={saveMsg.type === 'success' ? 'settings-success' : 'settings-error'}>
              {saveMsg.text}
            </div>
          )}

          {/* Salva */}
          <div className="settings-actions">
            <button onClick={handleSave} disabled={saving} className="settings-save-btn">
              {saving ? '⏳ Salvataggio...' : '💾 Salva nel database'}
            </button>
          </div>

          {/* ── Cambio Email ── */}
          <div className="settings-section" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-primary)' }}>
            <h3 className="settings-section-title">📧 Cambia email</h3>
            <p className="settings-section-desc">
              Email attuale: <strong>{profile?.email || session.email}</strong>
            </p>

            <div className="settings-field">
              <label className="settings-label" htmlFor="newEmail">
                Nuova email
              </label>
              <input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="nuova@email.com"
                className="settings-input"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label" htmlFor="currentPassword">
                🔒 Password attuale (per confermare)
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="settings-input"
              />
            </div>

            {emailMsg && (
              <div className={emailMsg.type === 'success' ? 'settings-success' : 'settings-error'}>
                {emailMsg.text}
              </div>
            )}

            <button
              onClick={handleChangeEmail}
              disabled={emailLoading}
              className="settings-save-btn"
              style={{ marginTop: '0.5rem' }}
            >
              {emailLoading ? '⏳ Aggiornamento...' : '📧 Cambia email'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="settings-info">
          <h3 className="settings-info-title">ℹ️ Come funziona</h3>
          <ul className="settings-info-list">
            <li>Il tuo profilo è salvato su <strong>Turso</strong> (SQLite nel cloud)</li>
            <li>L'ID dipendente è fisso e unico — lo stesso su ogni dispositivo</li>
            <li>Nome e sede determinano cosa vedi nella vista team</li>
            <li>Per cambiare email serve la password attuale come verifica di sicurezza</li>
          </ul>
        </div>
      </div>

      {/* Link navigazione */}
      <div className="settings-footer-links">
        <Link to="/smartworking" className="sw-nav-link">📅 Pianifica</Link>
        <Link to="/smartworking/team" className="sw-nav-link">👥 Team</Link>
        <Link to="/" className="sw-nav-link">📊 Dashboard</Link>
      </div>
    </div>
  )
}