// ──────────────────────────────────────────────
// EOS Timesheet — Pagina Impostazioni
// ──────────────────────────────────────────────
//
// Permette a ogni membro del team di configurare:
//   - Token GitHub (per leggere/scrivere plans.json)
//   - Nome visualizzato
//   - Sede (Treviso, Bologna, Milano)
//
// I dati sono salvati in localStorage, mai committati.
// ──────────────────────────────────────────────
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { loadSettings, saveSettings, isConfigured, exportSettings, importSettings } from '../shared/settings.ts'
import type { UserSettings } from '../shared/settings.ts'
import { LOCATIONS } from './teamView.ts'

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(loadSettings)
  const [showToken, setShowToken] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (!settings.githubToken.trim()) {
      setError('Inserisci il token GitHub')
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

          {/* Turso (SQLite) */}
          <div className="settings-field">
            <label className="settings-label" htmlFor="tursoUrl">
              🗄️ Turso URL
            </label>
            <input
              id="tursoUrl"
              type="text"
              value={settings.tursoUrl}
              onChange={e => setSettings(s => ({ ...s, tursoUrl: e.target.value }))}
              placeholder="libsql://il-tuo-db.turso.io"
              className="settings-input"
              autoComplete="off"
            />
            <span className="settings-hint">
              <a href="https://turso.tech" target="_blank" rel="noopener noreferrer" className="settings-link">
                Crea un database
              </a>{' '}
              su Turso e incolla qui l'URL
            </span>
          </div>

          <div className="settings-field">
            <label className="settings-label" htmlFor="tursoToken">
              🔐 Turso Token
            </label>
            <div className="settings-token-row">
              <input
                id="tursoToken"
                type={showToken ? 'text' : 'password'}
                value={settings.tursoToken}
                onChange={e => setSettings(s => ({ ...s, tursoToken: e.target.value }))}
                placeholder="eyJ..."
                className="settings-input"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(s => !s)}
                className="settings-toggle-btn"
                title={showToken ? 'Nascondi token' : 'Mostra token'}
              >
                {showToken ? '🙈' : '👁️'}
              </button>
            </div>
            <span className="settings-hint">
              Token di autenticazione dal dashboard Turso
            </span>
          </div>

          {/* Token GitHub */}
          <div className="settings-field">
            <label className="settings-label" htmlFor="githubToken">
              🔑 Token GitHub
            </label>
            <div className="settings-token-row">
              <input
                id="githubToken"
                type={showToken ? 'text' : 'password'}
                value={settings.githubToken}
                onChange={e => setSettings(s => ({ ...s, githubToken: e.target.value }))}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="settings-input"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(s => !s)}
                className="settings-toggle-btn"
                title={showToken ? 'Nascondi token' : 'Mostra token'}
              >
                {showToken ? '🙈' : '👁️'}
              </button>
            </div>
            <span className="settings-hint">
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="settings-link"
              >
                Crea un token
              </a>{' '}
              con scope <code>repo</code>. Non viene mai condiviso con altri.
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
            <li>Ogni membro del team inserisce il <strong>proprio</strong> token GitHub</li>
            <li>Il token serve solo a leggere/scrivere il file <code>data/plans.json</code></li>
            <li>Nome e sede determinano cosa vedi nella vista team</li>
            <li>I dati sono salvati <strong>solo sul tuo browser</strong> (localStorage)</li>
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
