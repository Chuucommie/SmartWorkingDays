// ──────────────────────────────────────────────
// EOS Timesheet — UI (campi BC esatti, italiano)
// ──────────────────────────────────────────────

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Timesheet, TimesheetLine, TimesheetStatus, TimesheetFilter, DaySummary } from './timesheetTypes.ts'
import { FIELD_LABELS, STATUS_LABELS, STATUS_COLORS } from './timesheetTypes.ts'
import {
  createEmptyTimesheet, addEmptyLine, updateLine, removeLine, changeStatus,
  computeStats, computeTotalHours, validateTimesheet, filterTimesheets,
  groupByDay, formatDate, formatDateShort, getWeekDates, getMockTimesheets,
  DAY_NAMES, DAY_NAMES_SHORT,
} from './timesheetEngine.ts'
import { getCurrentUserProfile } from '../shared/msAuth.ts'
import { getReleasedTimesheets, onTimesheetReleased } from '../shared/timesheetBridge.ts'

type Tab = 'list' | 'new' | 'stats'

export default function TimesheetApp() {
  const [tab, setTab] = useState<Tab>('list')
  const [timesheets, setTimesheets] = useState<Timesheet[]>(() => [...getMockTimesheets(), ...getReleasedTimesheets()])
  const [selectedTs, setSelectedTs] = useState<Timesheet | null>(null)
  const [editingTs, setEditingTs] = useState<Timesheet | null>(null)
  const [filter, setFilter] = useState<TimesheetFilter>({})
  const [statsTs, setStatsTs] = useState<Timesheet | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]))

  // Ascolta nuovi timesheet rilasciati da SW
  useEffect(() => {
    return onTimesheetReleased(() => {
      setTimesheets(prev => [...prev, ...getReleasedTimesheets().filter(t => !prev.some(p => p.header.id === t.header.id))])
    })
  }, [])

  const profile = getCurrentUserProfile()
  const resourceNo = profile?.employeeId || 'EMP001'
  const resourceName = profile?.employeeName || 'Utente'
  const sedeCode = profile?.locationCode || 'BOLOGNA'

  const filtered = useMemo(() => filterTimesheets(timesheets, filter), [timesheets, filter])

  const handleNew = () => {
    const ts = createEmptyTimesheet(resourceNo, resourceName, sedeCode)
    setEditingTs(ts); setExpandedDays(new Set([0, 1, 2, 3, 4])); setTab('new')
  }
  const handleEdit = (ts: Timesheet) => {
    setEditingTs({ ...ts, lines: [...ts.lines] }); setExpandedDays(new Set([0, 1, 2, 3, 4])); setTab('new')
  }
  const handleDelete = (id: string) => {
    setTimesheets(prev => prev.filter(t => t.header.id !== id))
    if (selectedTs?.header.id === id) setSelectedTs(null)
  }
  const handleSubmit = (ts: Timesheet) => {
    const v = validateTimesheet(ts)
    if (!v.valid) { setSaveMsg(v.errors[0]); setTimeout(() => setSaveMsg(null), 3000); return }
    const updated = changeStatus(ts, 'Pending Approval')
    setTimesheets(prev => { const idx = prev.findIndex(t => t.header.id === ts.header.id); if (idx >= 0) { const c = [...prev]; c[idx] = updated; return c } return [...prev, updated] })
    setEditingTs(null); setTab('list')
    setSaveMsg('Timesheet inviato in approvazione ✓'); setTimeout(() => setSaveMsg(null), 3000)
  }
  const handleApprove = (id: string) => setTimesheets(prev => prev.map(t => t.header.id === id ? changeStatus(t, 'Approved') : t))
  const handleReject = (id: string) => setTimesheets(prev => prev.map(t => t.header.id === id ? changeStatus(t, 'Rejected') : t))
  const handleSaveDraft = (ts: Timesheet) => {
    setTimesheets(prev => { const idx = prev.findIndex(t => t.header.id === ts.header.id); if (idx >= 0) { const c = [...prev]; c[idx] = { ...ts }; return c } return [...prev, { ...ts }] })
    setEditingTs(null); setTab('list')
    setSaveMsg('Bozza salvata ✓'); setTimeout(() => setSaveMsg(null), 3000)
  }
  const handleAddLine = (dayIndex: number) => { if (!editingTs) return; setEditingTs(addEmptyLine(editingTs, dayIndex)) }
  const handleUpdateLine = (lineId: string, u: Partial<TimesheetLine>) => { if (!editingTs) return; setEditingTs(updateLine(editingTs, lineId, u)) }
  const handleRemoveLine = (lineId: string) => { if (!editingTs) return; setEditingTs(removeLine(editingTs, lineId)) }
  const handleViewStats = (ts: Timesheet) => { setStatsTs(ts); setTab('stats') }
  const toggleDay = (di: number) => setExpandedDays(prev => { const n = new Set(prev); n.has(di) ? n.delete(di) : n.add(di); return n })

  const inpS = { background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }
  const roS = { background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 sm:p-8 pt-8 sm:pt-12 sw-page-bg">
      <div className="relative w-full max-w-[680px]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[24px] mb-3"
               style={{ background: 'linear-gradient(135deg, #007AFF 0%, #409CFF 50%, #0056B3 100%)', boxShadow: '0 6px 20px rgba(0,122,255,0.22)' }}>
            <span style={{ fontSize: 24 }}>⏱️</span>
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] mb-1" style={{ color: 'var(--text-primary)' }}>Timesheet</h1>
          <p className="text-[14px] font-normal" style={{ color: 'var(--text-secondary)' }}>{resourceName}</p>
        </div>

        <div className="flex gap-1 mb-5 p-1 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
          {(['list', 'new', 'stats'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all"
              style={{ background: tab === t ? 'var(--bg-card)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: tab === t ? 'var(--shadow-card)' : 'none' }}>
              {t === 'list' && '📋 Elenco'}{t === 'new' && (editingTs ? '✏️ Modifica' : '➕ Nuovo')}{t === 'stats' && '📊 Statistiche'}
            </button>
          ))}
        </div>

        {saveMsg && <div className="text-center mb-4"><span className="text-sm font-medium px-4 py-2 rounded-full" style={{ background: 'rgba(52,199,89,0.1)', color: 'var(--text-green)' }}>{saveMsg}</span></div>}

        {/* TAB: Elenco */}
        {tab === 'list' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <select value={filter.status || ''} onChange={e => setFilter(f => ({ ...f, status: (e.target.value || undefined) as TimesheetStatus | undefined }))} className="text-xs px-3 py-2 rounded-full border" style={inpS}>
                <option value="">Tutti gli stati</option><option value="Open">Aperto</option><option value="Pending Approval">In approvazione</option><option value="Approved">Approvato</option><option value="Rejected">Respinto</option>
              </select>
              <button onClick={handleNew} className="ml-auto text-xs font-semibold px-4 py-2 rounded-full text-white" style={{ background: 'var(--accent-blue)' }}>+ Nuovo Timesheet</button>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}><span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📭</span><p className="text-sm">Nessun timesheet trovato</p></div>
            ) : (
              <div className="space-y-3">
                {filtered.map(ts => {
                  const stats = computeStats(ts)
                  const sc = STATUS_COLORS[ts.header.status]
                  return (
                    <div key={ts.header.id} className="glass-card rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg"
                         onClick={() => setSelectedTs(selectedTs?.header.id === ts.header.id ? null : ts)}>
                      <div className="flex items-center justify-between mb-2">
                        <div><span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ts.header.no}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>{ts.header.description || 'Nessuna descrizione'}</span></div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: sc + '18', color: sc }}>{STATUS_LABELS[ts.header.status]}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>📅 Sett. {ts.header.weekNo}</span><span>{formatDateShort(ts.header.startingDate)} — {formatDateShort(ts.header.endingDate)}</span><span>⏱️ {stats.totalHours}h</span>
                      </div>
                      {selectedTs?.header.id === ts.header.id && (
                        <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(ts) }} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>✏️ Modifica</button>
                          <button onClick={(e) => { e.stopPropagation(); handleViewStats(ts) }} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>📊 Statistiche</button>
                          {ts.header.status === 'Pending Approval' && (<>
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(ts.header.id) }} className="text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: 'var(--accent-green)' }}>✓ Approva</button>
                            <button onClick={(e) => { e.stopPropagation(); handleReject(ts.header.id) }} className="text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: 'var(--accent-red)' }}>✕ Respingi</button>
                          </>)}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(ts.header.id) }} className="text-xs font-medium px-3 py-1.5 rounded-full ml-auto" style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--text-red)' }}>🗑 Elimina</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: Nuovo/Modifica */}
        {tab === 'new' && editingTs && (() => {
          const days = groupByDay(editingTs.lines, editingTs.header.weekNo)
          const totalH = computeTotalHours(editingTs.lines)
          return (
            <div>
              {/* Header Card — campi BC ESATTI */}
              <div className="glass-card rounded-2xl p-5 mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Generale</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.resourceNo}</label><input type="text" value={editingTs.header.resourceNo} readOnly className="w-full px-3 py-2 rounded-lg text-sm border" style={roS} /></div>
                  <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.resourceName}</label><input type="text" value={editingTs.header.resourceName} readOnly className="w-full px-3 py-2 rounded-lg text-sm border" style={roS} /></div>
                  <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.status}</label><input type="text" value={STATUS_LABELS[editingTs.header.status]} readOnly className="w-full px-3 py-2 rounded-lg text-sm border font-semibold" style={{ ...roS, color: STATUS_COLORS[editingTs.header.status] }} /></div>
                  <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.weekNo}</label><input type="text" value={String(editingTs.header.weekNo)} readOnly className="w-full px-3 py-2 rounded-lg text-sm border" style={roS} /></div>
                  <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.startingDate}</label><input type="text" value={formatDate(editingTs.header.startingDate)} readOnly className="w-full px-3 py-2 rounded-lg text-sm border" style={roS} /></div>
                  <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.endingDate}</label><input type="text" value={formatDate(editingTs.header.endingDate)} readOnly className="w-full px-3 py-2 rounded-lg text-sm border" style={roS} /></div>
                  <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.periodType}</label><input type="text" value={editingTs.header.periodType} readOnly className="w-full px-3 py-2 rounded-lg text-sm border" style={roS} /></div>
                  <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.jobNo}</label><input type="text" value={editingTs.header.jobNo || ''} onChange={e => setEditingTs({ ...editingTs, header: { ...editingTs.header, jobNo: e.target.value } })} className="w-full px-3 py-2 rounded-lg text-sm border" style={inpS} /></div>
                </div>
                <div className="mt-3"><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.description}</label><input type="text" value={editingTs.header.description || ''} onChange={e => setEditingTs({ ...editingTs, header: { ...editingTs.header, description: e.target.value } })} placeholder="Descrizione timesheet..." className="w-full px-3 py-2 rounded-lg text-sm border" style={inpS} /></div>
              </div>

              {/* Righe — raggruppate per giorno, collapsable */}
              <div className="glass-card rounded-2xl p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Righe</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Totale: {totalH}h</span>
                </div>
                {days.map(day => {
                  const isExpanded = expandedDays.has(day.dayIndex)
                  const dateStr = formatDateShort(day.date)
                  return (
                    <div key={day.dayIndex} className="mb-2">
                      <button onClick={() => toggleDay(day.dayIndex)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                        style={{ background: day.totalHours > 0 ? 'rgba(0,122,255,0.06)' : 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{day.dayName} {dateStr}</span>
                          {day.totalHours > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,122,255,0.12)', color: 'var(--accent-blue)' }}>{day.totalHours}h</span>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleAddLine(day.dayIndex) }} className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>+ Aggiungi riga</button>
                      </button>
                      {isExpanded && (
                        <div className="mt-1 space-y-2 pl-2">
                          {day.lines.length === 0 ? <p className="text-xs py-2 text-center" style={{ color: 'var(--text-secondary)' }}>Nessuna riga per questo giorno</p> : day.lines.map(line => (
                            <div key={line.id} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-secondary)', background: 'var(--bg-tertiary)' }}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Riga {line.lineNo} — {DAY_NAMES_SHORT[line.dayIndex]} {dateStr}</span>
                                <button onClick={() => handleRemoveLine(line.id)} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--text-red)' }}>✕</button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.type}</label><select value={line.type} onChange={e => handleUpdateLine(line.id, { type: e.target.value as TimesheetLine['type'] })} className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS}><option value="Resource">Risorsa</option><option value="Item">Articolo</option><option value="G/L Account">C/G</option></select></div>
                                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.no}</label><input type="text" value={line.no} onChange={e => handleUpdateLine(line.id, { no: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS} /></div>
                                <div className="col-span-2"><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.description}</label><input type="text" value={line.description} onChange={e => handleUpdateLine(line.id, { description: e.target.value })} placeholder="Descrizione attività..." className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS} /></div>
                                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.quantity}</label><input type="number" value={line.quantity || ''} onChange={e => handleUpdateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })} min="0" max="24" step="0.5" className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS} /></div>
                                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.unitOfMeasure}</label><select value={line.unitOfMeasure} onChange={e => handleUpdateLine(line.id, { unitOfMeasure: e.target.value as TimesheetLine['unitOfMeasure'] })} className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS}><option value="Hours">Ore</option><option value="Days">Giorni</option></select></div>
                                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.jobNo}</label><input type="text" value={line.jobNo || ''} onChange={e => handleUpdateLine(line.id, { jobNo: e.target.value })} placeholder="Nr. commessa" className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS} /></div>
                                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.workType}</label><input type="text" value={line.workType || ''} onChange={e => handleUpdateLine(line.id, { workType: e.target.value })} placeholder="Tipo lavoro" className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS} /></div>
                                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.chargeable}</label><select value={line.chargeable ? 'Sì' : 'No'} onChange={e => handleUpdateLine(line.id, { chargeable: e.target.value === 'Sì' })} className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS}><option value="Sì">Sì</option><option value="No">No</option></select></div>
                                <div><label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{FIELD_LABELS.locationCode}</label><input type="text" value={line.locationCode || ''} onChange={e => handleUpdateLine(line.id, { locationCode: e.target.value })} placeholder="Codice ubicazione" className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inpS} /></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={() => handleSaveDraft(editingTs)} className="flex-1 py-3 rounded-full text-sm font-semibold transition-all" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>💾 Salva bozza</button>
                <button onClick={() => handleSubmit(editingTs)} className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all" style={{ background: 'var(--accent-blue)', boxShadow: '0 2px 12px rgba(0,122,255,0.3)' }}>📤 Invia in approvazione</button>
              </div>
              <button onClick={() => { setEditingTs(null); setTab('list') }} className="w-full mt-3 py-2 rounded-full text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>← Annulla</button>
            </div>
          )
        })()}

        {/* TAB: Statistiche */}
        {tab === 'stats' && (
          <div>
            {!statsTs ? (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}><span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📊</span><p className="text-sm">Seleziona un timesheet dall'elenco per vedere le statistiche</p><button onClick={() => setTab('list')} className="text-sm font-medium mt-2" style={{ color: 'var(--text-link)' }}>Vai all'elenco</button></div>
            ) : (() => {
              const stats = computeStats(statsTs)
              const days = groupByDay(statsTs.lines, statsTs.header.weekNo)
              return (
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{statsTs.header.no} — {statsTs.header.description || 'Timesheet'}</h3>
                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(0,122,255,0.06)' }}><p className="text-3xl font-bold" style={{ color: 'var(--accent-blue)' }}>{stats.totalHours}h</p><p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Ore totali — Sett. {statsTs.header.weekNo}</p></div>
                  </div>
                  <div className="glass-card rounded-2xl p-5">
                    <h4 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Ore per giorno</h4>
                    {days.map(day => {
                      const maxH = Math.max(...days.map(d => d.totalHours), 1)
                      const barW = Math.max((day.totalHours / maxH) * 100, 2)
                      return <div key={day.dayIndex} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}><span className="text-xs font-medium w-20" style={{ color: 'var(--text-primary)' }}>{DAY_NAMES_SHORT[day.dayIndex]} {formatDateShort(day.date)}</span><div className="flex-1 h-5 rounded-full relative overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}><div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: day.totalHours > 8 ? 'var(--accent-orange)' : 'var(--accent-blue)' }} /></div><span className="text-xs font-bold w-10 text-right" style={{ color: 'var(--text-primary)' }}>{day.totalHours}h</span></div>
                    })}
                  </div>
                  {Object.keys(stats.byWorkType).length > 0 && <div className="glass-card rounded-2xl p-5"><h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Per tipo lavoro</h4>{Object.entries(stats.byWorkType).map(([wt, hours]) => <div key={wt} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}><span className="text-sm" style={{ color: 'var(--text-primary)' }}>{wt}</span><span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{hours}h</span></div>)}</div>}
                  {Object.keys(stats.byJob).length > 0 && <div className="glass-card rounded-2xl p-5"><h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Per commessa</h4>{Object.entries(stats.byJob).map(([job, hours]) => <div key={job} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}><span className="text-sm" style={{ color: 'var(--text-primary)' }}>{job}</span><span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{hours}h</span></div>)}</div>}
                  <button onClick={() => setTab('list')} className="w-full py-2 rounded-full text-sm font-medium" style={{ color: 'var(--text-link)' }}>← Torna all'elenco</button>
                </div>
              )
            })()}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="sw-nav-link">⏱️ Dashboard</Link>
          <Link to="/smartworking" className="sw-nav-link" style={{ marginLeft: 8 }}>🏠 Smart Working</Link>
        </div>
      </div>
    </div>
  )
}
