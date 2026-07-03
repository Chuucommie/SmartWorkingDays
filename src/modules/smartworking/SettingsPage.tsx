// ──────────────────────────────────────────────
// EOS Smart Working — Pagina Impostazioni
// ──────────────────────────────────────────────
//
// Permette a ogni membro del team di configurare:
//   - Nome visualizzato
//   - Sede (Treviso, Bologna, Milano)
//   - Cambio email (richiede password attuale)
//
// I dati sono salvati in localStorage, mai committati.
// ──────────────────────────────────────────────
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { loadSettings, saveSettings, isConfigured, exportSettings, importSettings } from '../shared/settings.ts'
import type { UserSettings } from '../shared/settings.ts'
import { LOCATIONS } from './teamView.ts'
import { loadSession, changeEmail } from '../shared/tursoAuth.ts'

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(loadSettings)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Cambio email ──
  const session = loadSession()
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

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
    } else {
      setEmailMsg({ type: 'error', text: result.error || 'Errore durante il cambio email' })
    }
  }

  const configured = isConfigured()

  const handleSave = () => {
    // Validazione
    if (!settings.displayName.trim()) {
      setError('Inserisci il tuo nome')
      return
    }
    if (!settings.location) {
      setError('Seleziona la tua sede')
      return
    }

    setError(null)
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    if (confirm('Cancellare tutte le impostazioni? Dovrai riconfigurare tutto.')) {
      localStorage.removeItem('eos-user-settings')
      setSettings(loadSettings())
      setError(null)
    }
  }

  // ── Esporta ──
  const handleExport = () => {
    const json = exportSettings()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'eos-settings-' + settings.employeeId + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Importa ──
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const ok = importSettings(text)
      if (ok) {
        setSettings(loadSettings())
        setImportMsg({ type: 'success', text: 'Impostazioni importate con successo!' })
      } else {
        setImportMsg({ type: 'error', text: 'File JSON non valido' })
      }
      setTimeout(() => setImportMsg(null), 3000)
    }
    reader.readAsText(file)
    // Reset input per permettere di ricaricare lo stesso file
    e.target.value = ''
  }

  // ── Copia ID ──
  const handleCopyId = () => {
    navigator.clipboard.writeText(settings.employeeId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="settings-page">
      <div className="settings-card glass-card">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-icon">⚙️</div>
          <h1 className="settings-title">Impostazioni</h1>
          <p className="settings-subtitle">
            Configura il tuo profilo per usare l'app con il team
          </p>
          {configured && (
            <span className="settings-status configured">✅ Configurato</span>
          )}
          {!configured && (
            <span className="settings-status not-configured">⚠️ Da configurare</span>
          )}
        </div>

        {/* Form */}
        <div className="settings-form">
          {/* Nome */}
          <div className="settings-field">
            <label className="settings-label" htmlFor="displayName">
              👤 Nome visualizzato
            </label>
            <input
              id="displayName"
              type="text"
              value={settings.displayName}
              onChange={e => setSettings(s => ({ ...s, displayName: e.target.value }))}
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
              value={settings.location}
              onChange={e => setSettings(s => ({ ...s, location: e.target.value as UserSettings['location'] }))}
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

          {/* Employee ID (copiabile) */}
          <div className="settings-field">
            <label className="settings-label">
              🆔 ID Dipendente
            </label>
            <div className="settings-token-row">
              <input
                type="text"
                value={settings.employeeId}
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
              Il tuo identificativo unico. Usalo per ritrovare le tue pianificazioni su altri browser.
            </span>
          </div>

          {/* ── Cambio Email ── */}
          {session && (
            <div className="settings-section">
              <h3 className="settings-section-title">📧 Cambia email</h3>
              <p className="settings-section-desc">
                Email attuale: <strong>{session.email}</strong>
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
          )}

          {/* Error */}
          {error && (
            <div className="settings-error">
              ⚠️ {error}
            </div>
          )}

          {/* Success */}
          {saved && (
            <div className="settings-success">
              ✅ Impostazioni salvate!
            </div>
          )}

          {/* Azioni */}
          <div className="settings-actions">
            <button onClick={handleSave} className="settings-save-btn">
              💾 Salva impostazioni
            </button>
            <button onClick={handleReset} className="settings-reset-btn">
              🗑️ Resetta
            </button>
          </div>

          {/* Esporta / Importa */}
          <div className="settings-actions">
            <button onClick={handleExport} className="settings-export-btn">
              📥 Esporta
            </button>
            <button onClick={handleImportClick} className="settings-import-btn">
              📤 Importa
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              style={{ display: 'none' }}
            />
          </div>
          {importMsg && (
            <div className={importMsg.type === 'success' ? 'settings-success' : 'settings-error'}>
              {importMsg.text}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="settings-info">
          <h3 className="settings-info-title">ℹ️ Come funziona</h3>
          <ul className="settings-info-list">
            <li>Registrati con la tua email nella pagina di login</li>
            <li>I dati sono salvati su <strong>Turso</strong> (SQLite nel cloud)</li>
            <li>Nome e sede determinano cosa vedi nella vista team</li>
            <li>Tutto il team condivide lo stesso database</li>
          </ul>
        </div>
      </div>

      {/* Link navigazione */}
      <div className="settings-footer-links">
        <Link to="/smartworking" className="sw-nav-link">🏠 Pianifica SW</Link>
        <Link to="/smartworking/team" className="sw-nav-link">👥 Vista Team</Link>
        <Link to="/" className="sw-nav-link">📊 Dashboard</Link>
      </div>
    </div>
  )
}
