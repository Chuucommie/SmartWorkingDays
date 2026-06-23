// ──────────────────────────────────────────────
// EOS Timesheet — Applicazione principale
// ──────────────────────────────────────────────
// Basato sul modulo Timesheet di Business Central.
// Tab: Lista Timesheet | Nuovo Timesheet | Statistiche
// ──────────────────────────────────────────────

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type {
  Timesheet,
  TimesheetHeader,
  TimesheetLine,
  TimesheetStatus,
  TimesheetFilter,
  TimesheetStats,
} from './timesheetTypes.ts'
import {
  createEmptyTimesheet,
  addEmptyLine,
  updateLine,
  removeLine,
  changeStatus,
  computeStats,
  computeTotalHours,
  computeTotalCost,
  validateTimesheet,
  filterTimesheets,
  formatDate,
  formatCurrency,
  getMockTimesheets,
} from './timesheetEngine.ts'
import { getCurrentUserProfile } from '../shared/msAuth.ts'

// ── Costanti ──

const STATUS_COLORS: Record<TimesheetStatus, string> = {
  'Open': '#007AFF',
  'Pending Approval': '#FF9500',
  'Approved': '#34C759',
  'Rejected': '#FF3B30',
}

const STATUS_LABELS: Record<TimesheetStatus, string> = {
  'Open': 'Aperto',
  'Pending Approval': 'In approvazione',
  'Approved': 'Approvato',
  'Rejected': 'Respinto',
}

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']

type Tab = 'list' | 'new' | 'stats'

// ── Componente principale ──

export default function TimesheetApp() {
  const [tab, setTab] = useState<Tab>('list')
  const [timesheets, setTimesheets] = useState<Timesheet[]>(() => getMockTimesheets())
  const [selectedTs, setSelectedTs] = useState<Timesheet | null>(null)
  const [editingTs, setEditingTs] = useState<Timesheet | null>(null)
  const [filter, setFilter] = useState<TimesheetFilter>({})
  const [statsTs, setStatsTs] = useState<Timesheet | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const profile = getCurrentUserProfile()
  const resourceNo = profile?.employeeId || 'EMP001'
  const resourceName = profile?.employeeName || 'Utente'

  // ── Timesheet filtrati ──
  const filtered = useMemo(() => filterTimesheets(timesheets, filter), [timesheets, filter])

  // ── Azioni ──

  const handleNew = () => {
    const ts = createEmptyTimesheet(resourceNo, resourceName)
    setEditingTs(ts)
    setTab('new')
  }

  const handleEdit = (ts: Timesheet) => {
    setEditingTs({ ...ts, lines: [...ts.lines] })
    setTab('new')
  }

  const handleDelete = (id: string) => {
    setTimesheets(prev => prev.filter(t => t.header.id !== id))
    if (selectedTs?.header.id === id) setSelectedTs(null)
  }

  const handleSubmit = (ts: Timesheet) => {
    const validation = validateTimesheet(ts)
    if (!validation.valid) {
      setSaveMsg(validation.errors[0])
      setTimeout(() => setSaveMsg(null), 3000)
      return
    }
    const updated = changeStatus(ts, 'Pending Approval')
    setTimesheets(prev => {
      const idx = prev.findIndex(t => t.header.id === ts.header.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = updated
        return copy
      }
      return [...prev, updated]
    })
    setEditingTs(null)
    setTab('list')
    setSaveMsg('Timesheet inviato per approvazione ✓')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleApprove = (id: string) => {
    setTimesheets(prev => prev.map(t =>
      t.header.id === id ? changeStatus(t, 'Approved') : t
    ))
  }

  const handleReject = (id: string) => {
    setTimesheets(prev => prev.map(t =>
      t.header.id === id ? changeStatus(t, 'Rejected') : t
    ))
  }

  const handleSaveDraft = (ts: Timesheet) => {
    setTimesheets(prev => {
      const idx = prev.findIndex(t => t.header.id === ts.header.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...ts }
        return copy
      }
      return [...prev, { ...ts }]
    })
    setEditingTs(null)
    setTab('list')
    setSaveMsg('Bozza salvata ✓')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleAddLine = () => {
    if (!editingTs) return
    setEditingTs(addEmptyLine(editingTs))
  }

  const handleUpdateLine = (lineId: string, updates: Partial<TimesheetLine>) => {
    if (!editingTs) return
    setEditingTs(updateLine(editingTs, lineId, updates))
  }

  const handleRemoveLine = (lineId: string) => {
    if (!editingTs) return
    setEditingTs(removeLine(editingTs, lineId))
  }

  const handleViewStats = (ts: Timesheet) => {
    setStatsTs(ts)
    setTab('stats')
  }

  // ── Render ──

  return (
    <div className="min-h-screen flex items-start justify-center p-4 sm:p-8 pt-8 sm:pt-12 sw-page-bg">
      <div className="relative w-full max-w-[640px]">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[24px] mb-3"
               style={{ background: 'linear-gradient(135deg, #007AFF 0%, #409CFF 50%, #0056B3 100%)',
                        boxShadow: '0 6px 20px rgba(0,122,255,0.22)' }}>
            <span style={{ fontSize: 24 }}>⏱️</span>
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] mb-1" style={{ color: 'var(--text-primary)' }}>
            Timesheet
          </h1>
          <p className="text-[14px] font-normal" style={{ color: 'var(--text-secondary)' }}>
            Registrazione ore — {resourceName}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-5 p-1 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
          {(['list', 'new', 'stats'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all"
              style={{
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
              }}
            >
              {t === 'list' && '📋 Lista'}
              {t === 'new' && (editingTs ? '✏️ Modifica' : '➕ Nuovo')}
              {t === 'stats' && '📊 Statistiche'}
            </button>
          ))}
        </div>

        {/* Save message */}
        {saveMsg && (
          <div className="text-center mb-4">
            <span className="text-sm font-medium px-4 py-2 rounded-full"
                  style={{ background: 'rgba(52,199,89,0.1)', color: 'var(--text-green)' }}>
              {saveMsg}
            </span>
          </div>
        )}

        {/* ── TAB: Lista ── */}
        {tab === 'list' && (
          <div>
            {/* Filtri */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <select
                value={filter.status || ''}
                onChange={e => setFilter(f => ({ ...f, status: (e.target.value || undefined) as TimesheetStatus | undefined }))}
                className="text-xs px-3 py-2 rounded-full border"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <option value="">Tutti gli stati</option>
                <option value="Open">Aperto</option>
                <option value="Pending Approval">In approvazione</option>
                <option value="Approved">Approvato</option>
                <option value="Rejected">Respinto</option>
              </select>
              <button
                onClick={handleNew}
                className="ml-auto text-xs font-semibold px-4 py-2 rounded-full text-white"
                style={{ background: 'var(--accent-blue)' }}
              >
                + Nuovo Timesheet
              </button>
            </div>

            {/* Lista */}
            {filtered.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📭</span>
                <p className="text-sm">Nessun timesheet trovato</p>
                <button onClick={handleNew} className="text-sm font-medium mt-2" style={{ color: 'var(--text-link)' }}>
                  Crea il primo timesheet
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(ts => {
                  const stats = computeStats(ts)
                  const statusColor = STATUS_COLORS[ts.header.status]
                  return (
                    <div
                      key={ts.header.id}
                      className="glass-card rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg"
                      onClick={() => setSelectedTs(selectedTs?.header.id === ts.header.id ? null : ts)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {ts.header.no}
                          </span>
                          <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                            {ts.header.description || 'Nessuna descrizione'}
                          </span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full"
                              style={{ background: statusColor + '18', color: statusColor }}>
                          {STATUS_LABELS[ts.header.status]}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>📅 {formatDate(ts.header.startingDate)} — {formatDate(ts.header.endingDate)}</span>
                        <span>📐 Sett. {ts.header.weekNo}</span>
                        <span>⏱️ {stats.totalHours}h</span>
                        <span>💰 {formatCurrency(stats.totalCost)}</span>
                      </div>

                      {/* Expanded actions */}
                      {selectedTs?.header.id === ts.header.id && (
                        <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(ts) }}
                                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                            ✏️ Modifica
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleViewStats(ts) }}
                                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                            📊 Statistiche
                          </button>
                          {ts.header.status === 'Pending Approval' && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleApprove(ts.header.id) }}
                                      className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                                      style={{ background: 'var(--accent-green)' }}>
                                ✓ Approva
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleReject(ts.header.id) }}
                                      className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                                      style={{ background: 'var(--accent-red)' }}>
                                ✕ Respingi
                              </button>
                            </>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(ts.header.id) }}
                                  className="text-xs font-medium px-3 py-1.5 rounded-full ml-auto"
                                  style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--text-red)' }}>
                            🗑 Elimina
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Nuovo/Modifica ── */}
        {tab === 'new' && editingTs && (
          <div>
            <div className="glass-card rounded-2xl p-5 mb-4">
              {/* Header fields */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>No.</label>
                  <input
                    type="text"
                    value={editingTs.header.no}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg text-sm border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Stato</label>
                  <input
                    type="text"
                    value={STATUS_LABELS[editingTs.header.status]}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg text-sm border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: STATUS_COLORS[editingTs.header.status] }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Risorsa</label>
                  <input
                    type="text"
                    value={editingTs.header.resourceName}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg text-sm border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Settimana</label>
                  <input
                    type="text"
                    value={`Sett. ${editingTs.header.weekNo} (${formatDate(editingTs.header.startingDate)} — ${formatDate(editingTs.header.endingDate)})`}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg text-sm border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Descrizione</label>
                <input
                  type="text"
                  value={editingTs.header.description || ''}
                  onChange={e => setEditingTs({
                    ...editingTs,
                    header: { ...editingTs.header, description: e.target.value },
                  })}
                  placeholder="Descrizione del timesheet..."
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Job No. */}
              <div className="mb-4">
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Job No.</label>
                <input
                  type="text"
                  value={editingTs.header.jobNo || ''}
                  onChange={e => setEditingTs({
                    ...editingTs,
                    header: { ...editingTs.header, jobNo: e.target.value },
                  })}
                  placeholder="Es. JOB-2024-001"
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Lines */}
            <div className="glass-card rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Righe Timesheet</h3>
                <button
                  onClick={handleAddLine}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                  style={{ background: 'var(--accent-blue)' }}
                >
                  + Aggiungi riga
                </button>
              </div>

              {editingTs.lines.length === 0 ? (
                <p className="text-center text-sm py-6" style={{ color: 'var(--text-secondary)' }}>
                  Nessuna riga. Clicca "Aggiungi riga" per iniziare.
                </p>
              ) : (
                <div className="space-y-3">
                  {editingTs.lines.map(line => (
                    <div key={line.id} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-secondary)', background: 'var(--bg-tertiary)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          Riga {line.lineNo}
                        </span>
                        <button
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--text-red)' }}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Type */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                          <select
                            value={line.type}
                            onChange={e => handleUpdateLine(line.id, { type: e.target.value as TimesheetLine['type'] })}
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          >
                            <option value="Resource">Resource</option>
                            <option value="Item">Item</option>
                            <option value="G/L Account">G/L Account</option>
                          </select>
                        </div>

                        {/* No. */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>No.</label>
                          <input
                            type="text"
                            value={line.no}
                            onChange={e => handleUpdateLine(line.id, { no: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          />
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Descrizione</label>
                          <input
                            type="text"
                            value={line.description}
                            onChange={e => handleUpdateLine(line.id, { description: e.target.value })}
                            placeholder="Descrizione attività..."
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Ore</label>
                          <input
                            type="number"
                            value={line.quantity || ''}
                            onChange={e => handleUpdateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                            min="0"
                            max="24"
                            step="0.5"
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          />
                        </div>

                        {/* Unit Cost */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Costo/h (€)</label>
                          <input
                            type="number"
                            value={line.unitCost || ''}
                            onChange={e => handleUpdateLine(line.id, { unitCost: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          />
                        </div>

                        {/* Total Cost (readonly) */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Totale</label>
                          <input
                            type="text"
                            value={formatCurrency(line.totalCost)}
                            readOnly
                            className="w-full px-2 py-1.5 rounded-lg text-xs border font-semibold"
                            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-green)' }}
                          />
                        </div>

                        {/* Chargeable */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Fatturabile</label>
                          <select
                            value={line.chargeable ? 'Yes' : 'No'}
                            onChange={e => handleUpdateLine(line.id, { chargeable: e.target.value === 'Yes' })}
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          >
                            <option value="Yes">Sì</option>
                            <option value="No">No</option>
                          </select>
                        </div>

                        {/* Work Type */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Tipo lavoro</label>
                          <input
                            type="text"
                            value={line.workType || ''}
                            onChange={e => handleUpdateLine(line.id, { workType: e.target.value })}
                            placeholder="Billable / Non-Billable"
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          />
                        </div>

                        {/* Job No. */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Job No.</label>
                          <input
                            type="text"
                            value={line.jobNo || ''}
                            onChange={e => handleUpdateLine(line.id, { jobNo: e.target.value })}
                            placeholder="Es. JOB-2024-001"
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          />
                        </div>

                        {/* Location Code */}
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Sede</label>
                          <input
                            type="text"
                            value={line.locationCode || ''}
                            onChange={e => handleUpdateLine(line.id, { locationCode: e.target.value })}
                            placeholder="Es. MILANO"
                            className="w-full px-2 py-1.5 rounded-lg text-xs border"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totali */}
              {editingTs.lines.length > 0 && (
                <div className="flex justify-between items-center mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Totale: {computeTotalHours(editingTs.lines)}h
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-green)' }}>
                    {formatCurrency(computeTotalCost(editingTs.lines))}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleSaveDraft(editingTs)}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              >
                💾 Salva bozza
              </button>
              <button
                onClick={() => handleSubmit(editingTs)}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all"
                style={{ background: 'var(--accent-blue)', boxShadow: '0 2px 12px rgba(0,122,255,0.3)' }}
              >
                📤 Invia per approvazione
              </button>
            </div>

            <button
              onClick={() => { setEditingTs(null); setTab('list') }}
              className="w-full mt-3 py-2 rounded-full text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              ← Annulla
            </button>
          </div>
        )}

        {/* ── TAB: Statistiche ── */}
        {tab === 'stats' && (
          <div>
            {!statsTs ? (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📊</span>
                <p className="text-sm">Seleziona un timesheet dalla lista per vedere le statistiche</p>
                <button onClick={() => setTab('list')} className="text-sm font-medium mt-2" style={{ color: 'var(--text-link)' }}>
                  Vai alla lista
                </button>
              </div>
            ) : (() => {
              const stats = computeStats(statsTs)
              return (
                <div className="space-y-4">
                  {/* Header stats */}
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                      {statsTs.header.no} — {statsTs.header.description || 'Timesheet'}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(52,199,89,0.08)' }}>
                        <p className="text-2xl font-bold" style={{ color: 'var(--text-green)' }}>{stats.totalHours}h</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Ore totali</p>
                      </div>
                      <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(0,122,255,0.08)' }}>
                        <p className="text-2xl font-bold" style={{ color: 'var(--text-blue)' }}>{formatCurrency(stats.totalCost)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Costo totale</p>
                      </div>
                      <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(52,199,89,0.06)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-green)' }}>{stats.billableHours}h</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Fatturabili</p>
                      </div>
                      <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(142,142,147,0.08)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>{stats.nonBillableHours}h</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Non fatturabili</p>
                      </div>
                    </div>
                  </div>

                  {/* Per Work Type */}
                  {Object.keys(stats.byWorkType).length > 0 && (
                    <div className="glass-card rounded-2xl p-5">
                      <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Per tipo lavoro</h4>
                      {Object.entries(stats.byWorkType).map(([wt, data]) => (
                        <div key={wt} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{wt}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {data.hours}h · {formatCurrency(data.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Per Job */}
                  {Object.keys(stats.byJob).length > 0 && (
                    <div className="glass-card rounded-2xl p-5">
                      <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Per commessa</h4>
                      {Object.entries(stats.byJob).map(([job, data]) => (
                        <div key={job} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{job}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {data.hours}h · {formatCurrency(data.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Per giorno */}
                  {Object.keys(stats.byDay).length > 0 && (
                    <div className="glass-card rounded-2xl p-5">
                      <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Ore per giorno</h4>
                      {Object.entries(stats.byDay)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([date, hours]) => (
                        <div key={date} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(date)}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 rounded-full" style={{
                              width: `${Math.min(hours * 10, 120)}px`,
                              background: hours > 8 ? 'var(--accent-orange)' : 'var(--accent-green)',
                            }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{hours}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setTab('list')}
                    className="w-full py-2 rounded-full text-sm font-medium"
                    style={{ color: 'var(--text-link)' }}
                  >
                    ← Torna alla lista
                  </button>
                </div>
              )
            })()}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link to="/" className="sw-nav-link">⏱️ Dashboard</Link>
          <Link to="/smartworking" className="sw-nav-link" style={{ marginLeft: 8 }}>🏠 Smart Working</Link>
        </div>
      </div>
    </div>
  )
}
