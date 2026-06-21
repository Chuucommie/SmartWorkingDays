// ──────────────────────────────────────────────
// SmartWorkingDays — Pagina Combinazioni Salvate
// ──────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadAll, remove, rename, exportAll, importFromJSON } from './savedWeeks.ts'
import type { SavedTemplate } from './savedWeeks.ts'

const STATE_COLORS: Record<string, string> = { sw: '#34C759', office: '#007AFF', absent: '#8E8E93', free: '#E5E5EA' }

interface FeedbackMessage {
  type: 'success' | 'error'
  text: string
}

/**
 * Pagina per gestire i template settimanali salvati.
 * Carica, rinomina, elimina, esporta e importa template.
 */
export default function SavedWeeksPage() {
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [message, setMessage] = useState<FeedbackMessage | null>(null)
  const navigate = useNavigate()

  // Carica template all'avvio
  useEffect(() => {
    setTemplates(loadAll())
  }, [])

  // Mostra messaggio temporaneo
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // Carica un template nell'app SW
  const handleLoad = (template: SavedTemplate) => {
    // Passa i dati tramite sessionStorage (semplice, senza librerie di stato globali)
    sessionStorage.setItem('sw-load-template', JSON.stringify(template))
    navigate('/smartworking')
  }

  // Elimina template
  const handleDelete = (id: string) => {
    const result = remove(id)
    if (result.success) {
      setTemplates(loadAll())
      showMessage('success', 'Template eliminato')
    } else {
      showMessage('error', result.error || 'Errore sconosciuto')
    }
  }

  // Inizia rinomina
  const startRename = (template: SavedTemplate) => {
    setEditingId(template.id)
    setEditName(template.name)
  }

  // Conferma rinomina
  const confirmRename = () => {
    if (!editingId) return
    const result = rename(editingId, editName)
    if (result.success) {
      setTemplates(loadAll())
      setEditingId(null)
      setEditName('')
      showMessage('success', 'Template rinominato')
    } else {
      showMessage('error', result.error || 'Errore sconosciuto')
    }
  }

  // Annulla rinomina
  const cancelRename = () => {
    setEditingId(null)
    setEditName('')
  }

  // Esporta tutti i template
  const handleExport = () => {
    const json = exportAll()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'smartworking-templates.json'
    a.click()
    URL.revokeObjectURL(url)
    showMessage('success', 'Template esportati')
  }

  // Importa template da file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = importFromJSON(e.target?.result as string)
      if (result.success) {
        setTemplates(loadAll())
        showMessage('success', `Importati ${result.added} template (totale: ${result.total})`)
      } else {
        showMessage('error', result.error || 'Errore sconosciuto')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset input file
  }

  // Formatta data
  const formatDate = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="saved-weeks-page">
      {/* Header */}
      <div className="saved-header">
        <h1 className="saved-title">💾 Combinazioni salvate</h1>
        <div className="saved-actions">
          <button onClick={handleExport} className="saved-action-btn" title="Esporta tutti i template in JSON">
            📤 Esporta
          </button>
          <label className="saved-action-btn" style={{ cursor: 'pointer' }} title="Importa template da file JSON">
            📥 Importa
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Messaggio feedback */}
      {message && (
        <div style={{
          textAlign: 'center',
          marginBottom: 16,
          padding: '8px 16px',
          borderRadius: 12,
          fontSize: 13,
          background: message.type === 'success' ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)',
          color: message.type === 'success' ? '#248A3D' : '#FF3B30',
        }}>
          {message.text}
        </div>
      )}

      {/* Lista template */}
      {templates.length === 0 ? (
        <div className="saved-empty">
          <span className="saved-empty-icon">📭</span>
          <p>Nessuna combinazione salvata.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            Vai su <Link to="/smartworking" style={{ color: '#007AFF' }}>Smart Working</Link> e salva la tua prima settimana!
          </p>
        </div>
      ) : (
        <div className="saved-list">
          {templates.map(template => (
            <div key={template.id} className="saved-item">
              {/* Nome (o input rename) */}
              {editingId === template.id ? (
                <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') cancelRename() }}
                    autoFocus
                    maxLength={50}
                    style={{
                      flex: 1,
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.15)',
                      fontSize: 14,
                    }}
                  />
                  <button onClick={confirmRename} className="saved-item-btn load">✓</button>
                  <button onClick={cancelRename} className="saved-item-btn delete">✕</button>
                </div>
              ) : (
                <span className="saved-item-name" onDoubleClick={() => startRename(template)}>
                  {template.name}
                </span>
              )}

              {/* Pallini giorni */}
              <div className="saved-item-days" title={template.days.map((s, i) => `${['Lun','Mar','Mer','Gio','Ven'][i]}: ${s}`).join(', ')}>
                {template.days.map((state, i) => (
                  <span key={i} className={`saved-day-dot ${state}`} />
                ))}
              </div>

              {/* Conteggio SW */}
              <span className="saved-item-sw">
                {template.swDaysRequested} SW
              </span>

              {/* Azioni */}
              {editingId !== template.id && (
                <div className="saved-item-actions">
                  <button onClick={() => handleLoad(template)} className="saved-item-btn load" title="Carica questa combinazione">
                    Carica
                  </button>
                  <button onClick={() => startRename(template)} className="saved-item-btn" title="Rinomina">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="saved-item-btn delete" title="Elimina">
                    🗑
                  </button>
                </div>
              )}

              {/* Data creazione */}
              <span style={{ fontSize: 10, color: '#C7C7CC', flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                {formatDate(template.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Link navigazione */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/smartworking" className="sw-nav-link">🏠 Pianifica SW</Link>
        <Link to="/smartworking/team" className="sw-nav-link" style={{ marginLeft: 8 }}>👥 Vedi team</Link>
        <Link to="/" className="sw-nav-link" style={{ marginLeft: 8 }}>⏱️ Dashboard</Link>
      </div>
    </div>
  )
}
