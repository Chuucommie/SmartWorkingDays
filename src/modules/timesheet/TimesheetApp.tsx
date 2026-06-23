// ──────────────────────────────────────────────
// EOS Timesheet — Applicazione principale
// ──────────────────────────────────────────────
// Basato sul modulo Timesheet di Business Central.
// Righe raggruppate per giorno, collapsable.
// Campi BC esatti, nessun costo.
// ──────────────────────────────────────────────

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type {
  Timesheet,
  TimesheetLine,
  TimesheetStatus,
  TimesheetFilter,
  DaySummary,
} from './timesheetTypes.ts'
import {
  createEmptyTimesheet,
  addEmptyLine,
  updateLine,
  removeLine,
  changeStatus,
  computeStats,
  computeTotalHours,
  validateTimesheet,
  filterTimesheets,
  groupByDay,
  formatDate,
  formatDateShort,
  getWeekDates,
  getMockTimesheets,
  DAY_NAMES,
  DAY_NAMES_SHORT,
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
  'Open': 'Open',
  'Pending Approval': 'Pending Approval',
  'Approved': 'Approved',
  'Rejected': 'Rejected',
}

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
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]))

  const profile = getCurrentUserProfile()
  const resourceNo = profile?.employeeId || 'EMP001'
  const resourceName = profile?.employeeName || 'Utente'

  const filtered = useMemo(() => filterTimesheets(timesheets, filter), [timesheets, filter])

  // ── Azioni ──

  const handleNew = () => {
    const ts = createEmptyTimesheet(resourceNo, resourceName)
    setEditingTs(ts)
    setExpandedDays(new Set([0, 1, 2, 3, 4]))
    setTab('new')
  }

  const handleEdit = (ts: Timesheet) => {
    setEditingTs({ ...ts, lines: [...ts.lines] })
    setExpandedDays(new Set([0, 1, 2, 3, 4]))
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
      if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy }
      return [...prev, updated]
    })
    setEditingTs(null)
    setTab('list')
    setSaveMsg('Timesheet submitted for approval ✓')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleApprove = (id: string) => {
    setTimesheets(prev => prev.map(t => t.header.id === id ? changeStatus(t, 'Approved') : t))
  }

  const handleReject = (id: string) => {
    setTimesheets(prev => prev.map(t => t.header.id === id ? changeStatus(t, 'Rejected') : t))
  }

  const handleSaveDraft = (ts: Timesheet) => {
    setTimesheets(prev => {
      const idx = prev.findIndex(t => t.header.id === ts.header.id)
      if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...ts }; return copy }
      return [...prev, { ...ts }]
    })
    setEditingTs(null)
    setTab('list')
    setSaveMsg('Draft saved ✓')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleAddLine = (dayIndex: number) => {
    if (!editingTs) return
    setEditingTs(addEmptyLine(editingTs, dayIndex))
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

  const toggleDay = (dayIndex: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(dayIndex)) next.delete(dayIndex)
      else next.add(dayIndex)
      return next
    })
  }

  // ── Input style ──
  const inputStyle = {
    background: 'var(--bg-input)',
    borderColor: 'var(--border-primary)',
    color: 'var(--text-primary)',
  }
  const readonlyStyle = {
    background: 'var(--bg-tertiary)',
    borderColor: 'var(--border-primary)',
    color: 'var(--text-secondary)',
  }

  // ── Render ──

  return (
    <div className="min-h-screen flex items-start justify-center p-4 sm:p-8 pt-8 sm:pt-12 sw-page-bg">
      <div className="relative w-full max-w-[680px]">

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
            {resourceName}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-5 p-1 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
          {(['list', 'new', 'stats'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all"
              style={{
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
              }}>
              {t === 'list' && '📋 List'}
              {t === 'new' && (editingTs ? '✏️ Edit' : '➕ New')}
              {t === 'stats' && '📊 Statistics'}
            </button>
          ))}
        </div>

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
            <div className="flex gap-2 mb-4 flex-wrap">
              <select value={filter.status || ''}
                onChange={e => setFilter(f => ({ ...f, status: (e.target.value || undefined) as TimesheetStatus | undefined }))}
                className="text-xs px-3 py-2 rounded-full border" style={inputStyle}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button onClick={handleNew}
                className="ml-auto text-xs font-semibold px-4 py-2 rounded-full text-white"
                style={{ background: 'var(--accent-blue)' }}>
                + New Timesheet
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📭</span>
                <p className="text-sm">No timesheets found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(ts => {
                  const stats = computeStats(ts)
                  const statusColor = STATUS_COLORS[ts.header.status]
                  return (
                    <div key={ts.header.id}
                      className="glass-card rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg"
                      onClick={() => setSelectedTs(selectedTs?.header.id === ts.header.id ? null : ts)}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {ts.header.no}
                          </span>
                          <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                            {ts.header.description || 'No description'}
                          </span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full"
                              style={{ background: statusColor + '18', color: statusColor }}>
                          {STATUS_LABELS[ts.header.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>📅 Week {ts.header.weekNo}</span>
                        <span>{formatDateShort(ts.header.startingDate)} — {formatDateShort(ts.header.endingDate)}</span>
                        <span>⏱️ {stats.totalHours}h</span>
                      </div>

                      {selectedTs?.header.id === ts.header.id && (
                        <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(ts) }}
                                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>✏️ Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleViewStats(ts) }}
                                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>📊 Statistics</button>
                          {ts.header.status === 'Pending Approval' && (<>
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(ts.header.id) }}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                                    style={{ background: 'var(--accent-green)' }}>✓ Approve</button>
                            <button onClick={(e) => { e.stopPropagation(); handleReject(ts.header.id) }}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                                    style={{ background: 'var(--accent-red)' }}>✕ Reject</button>
                          </>)}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(ts.header.id) }}
                                  className="text-xs font-medium px-3 py-1.5 rounded-full ml-auto"
                                  style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--text-red)' }}>🗑 Delete</button>
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
        {tab === 'new' && editingTs && (() => {
          const days = groupByDay(editingTs.lines, editingTs.header.weekNo)
          const weekDates = getWeekDates(editingTs.header.weekNo)
          const totalH = computeTotalHours(editingTs.lines)

          return (
            <div>
              {/* Header Card — campi BC esatti */}
              <div className="glass-card rounded-2xl p-5 mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
                  General
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Resource No.</label>
                    <input type="text" value={editingTs.header.resourceNo} readOnly
                      className="w-full px-3 py-2 rounded-lg text-sm border" style={readonlyStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Resource Name</label>
                    <input type="text" value={editingTs.header.resourceName} readOnly
                      className="w-full px-3 py-2 rounded-lg text-sm border" style={readonlyStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Status</label>
                    <input type="text" value={STATUS_LABELS[editingTs.header.status]} readOnly
                      className="w-full px-3 py-2 rounded-lg text-sm border font-semibold"
                      style={{ ...readonlyStyle, color: STATUS_COLORS[editingTs.header.status] }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Week No.</label>
                    <input type="text" value={String(editingTs.header.weekNo)} readOnly
                      className="w-full px-3 py-2 rounded-lg text-sm border" style={readonlyStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Starting Date</label>
                    <input type="text" value={formatDate(editingTs.header.startingDate)} readOnly
                      className="w-full px-3 py-2 rounded-lg text-sm border" style={readonlyStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Ending Date</label>
                    <input type="text" value={formatDate(editingTs.header.endingDate)} readOnly
                      className="w-full px-3 py-2 rounded-lg text-sm border" style={readonlyStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Period Type</label>
                    <input type="text" value={editingTs.header.periodType} readOnly
                      className="w-full px-3 py-2 rounded-lg text-sm border" style={readonlyStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Job No.</label>
                    <input type="text" value={editingTs.header.jobNo || ''}
                      onChange={e => setEditingTs({ ...editingTs, header: { ...editingTs.header, jobNo: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg text-sm border" style={inputStyle} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <input type="text" value={editingTs.header.description || ''}
                    onChange={e => setEditingTs({ ...editingTs, header: { ...editingTs.header, description: e.target.value } })}
                    placeholder="Timesheet description..."
                    className="w-full px-3 py-2 rounded-lg text-sm border" style={inputStyle} />
                </div>
              </div>

              {/* Lines Card — raggruppate per giorno, collapsable */}
              <div className="glass-card rounded-2xl p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Lines
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Total: {totalH}h
                  </span>
                </div>

                {days.map(day => {
                  const isExpanded = expandedDays.has(day.dayIndex)
                  const dateStr = formatDateShort(day.date)
                  return (
                    <div key={day.dayIndex} className="mb-2">
                      {/* Day header — collapsable */}
                      <button
                        onClick={() => toggleDay(day.dayIndex)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                        style={{
                          background: day.totalHours > 0 ? 'rgba(0,122,255,0.06)' : 'var(--bg-tertiary)',
                          border: '1px solid var(--border-secondary)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {day.dayName} {dateStr}
                          </span>
                          {day.totalHours > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: 'rgba(0,122,255,0.12)', color: 'var(--accent-blue)' }}>
                              {day.totalHours}h
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddLine(day.dayIndex) }}
                          className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                          + Add Line
                        </button>
                      </button>

                      {/* Day lines — collapsable content */}
                      {isExpanded && (
                        <div className="mt-1 space-y-2 pl-2">
                          {day.lines.length === 0 ? (
                            <p className="text-xs py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                              No lines for this day
                            </p>
                          ) : (
                            day.lines.map(line => (
                              <div key={line.id} className="p-3 rounded-xl border"
                                   style={{ borderColor: 'var(--border-secondary)', background: 'var(--bg-tertiary)' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                    Line {line.lineNo} — {DAY_NAMES_SHORT[line.dayIndex]} {dateStr}
                                  </span>
                                  <button onClick={() => handleRemoveLine(line.id)}
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--text-red)' }}>✕</button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {/* Type */}
                                  <div>
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Type</label>
                                    <select value={line.type}
                                      onChange={e => handleUpdateLine(line.id, { type: e.target.value as TimesheetLine['type'] })}
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle}>
                                      <option value="Resource">Resource</option>
                                      <option value="Item">Item</option>
                                      <option value="G/L Account">G/L Account</option>
                                    </select>
                                  </div>

                                  {/* No. */}
                                  <div>
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>No.</label>
                                    <input type="text" value={line.no}
                                      onChange={e => handleUpdateLine(line.id, { no: e.target.value })}
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle} />
                                  </div>

                                  {/* Description */}
                                  <div className="col-span-2">
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Description</label>
                                    <input type="text" value={line.description}
                                      onChange={e => handleUpdateLine(line.id, { description: e.target.value })}
                                      placeholder="Activity description..."
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle} />
                                  </div>

                                  {/* Quantity */}
                                  <div>
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Quantity</label>
                                    <input type="number" value={line.quantity || ''}
                                      onChange={e => handleUpdateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                                      min="0" max="24" step="0.5"
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle} />
                                  </div>

                                  {/* Unit of Measure */}
                                  <div>
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Unit of Measure</label>
                                    <select value={line.unitOfMeasure}
                                      onChange={e => handleUpdateLine(line.id, { unitOfMeasure: e.target.value as TimesheetLine['unitOfMeasure'] })}
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle}>
                                      <option value="Hours">Hours</option>
                                      <option value="Days">Days</option>
                                    </select>
                                  </div>

                                  {/* Job No. */}
                                  <div>
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Job No.</label>
                                    <input type="text" value={line.jobNo || ''}
                                      onChange={e => handleUpdateLine(line.id, { jobNo: e.target.value })}
                                      placeholder="Job No."
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle} />
                                  </div>

                                  {/* Work Type */}
                                  <div>
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Work Type</label>
                                    <input type="text" value={line.workType || ''}
                                      onChange={e => handleUpdateLine(line.id, { workType: e.target.value })}
                                      placeholder="Billable / Non-Billable"
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle} />
                                  </div>

                                  {/* Chargeable */}
                                  <div>
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Chargeable</label>
                                    <select value={line.chargeable ? 'Yes' : 'No'}
                                      onChange={e => handleUpdateLine(line.id, { chargeable: e.target.value === 'Yes' })}
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle}>
                                      <option value="Yes">Yes</option>
                                      <option value="No">No</option>
                                    </select>
                                  </div>

                                  {/* Location Code */}
                                  <div>
                                    <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>Location Code</label>
                                    <input type="text" value={line.locationCode || ''}
                                      onChange={e => handleUpdateLine(line.id, { locationCode: e.target.value })}
                                      placeholder="Location Code"
                                      className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle} />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button onClick={() => handleSaveDraft(editingTs)}
                  className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                  💾 Save Draft
                </button>
                <button onClick={() => handleSubmit(editingTs)}
                  className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all"
                  style={{ background: 'var(--accent-blue)', boxShadow: '0 2px 12px rgba(0,122,255,0.3)' }}>
                  📤 Submit for Approval
                </button>
              </div>
              <button onClick={() => { setEditingTs(null); setTab('list') }}
                className="w-full mt-3 py-2 rounded-full text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}>← Cancel</button>
            </div>
          )
        })()}

        {/* ── TAB: Statistiche ── */}
        {tab === 'stats' && (
          <div>
            {!statsTs ? (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📊</span>
                <p className="text-sm">Select a timesheet from the list to view statistics</p>
                <button onClick={() => setTab('list')} className="text-sm font-medium mt-2" style={{ color: 'var(--text-link)' }}>
                  Go to list
                </button>
              </div>
            ) : (() => {
              const stats = computeStats(statsTs)
              const days = groupByDay(statsTs.lines, statsTs.header.weekNo)
              return (
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                      {statsTs.header.no} — {statsTs.header.description || 'Timesheet'}
                    </h3>
                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(0,122,255,0.06)' }}>
                      <p className="text-3xl font-bold" style={{ color: 'var(--accent-blue)' }}>{stats.totalHours}h</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Total Hours — Week {statsTs.header.weekNo}</p>
                    </div>
                  </div>

                  {/* Per giorno */}
                  <div className="glass-card rounded-2xl p-5">
                    <h4 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      Hours per Day
                    </h4>
                    {days.map(day => {
                      const maxH = Math.max(...days.map(d => d.totalHours), 1)
                      const barW = Math.max((day.totalHours / maxH) * 100, 2)
                      return (
                        <div key={day.dayIndex} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}>
                          <span className="text-xs font-medium w-20" style={{ color: 'var(--text-primary)' }}>
                            {DAY_NAMES_SHORT[day.dayIndex]} {formatDateShort(day.date)}
                          </span>
                          <div className="flex-1 h-5 rounded-full relative overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${barW}%`,
                              background: day.totalHours > 8 ? 'var(--accent-orange)' : 'var(--accent-blue)',
                            }} />
                          </div>
                          <span className="text-xs font-bold w-10 text-right" style={{ color: 'var(--text-primary)' }}>
                            {day.totalHours}h
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Per Work Type */}
                  {Object.keys(stats.byWorkType).length > 0 && (
                    <div className="glass-card rounded-2xl p-5">
                      <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                        By Work Type
                      </h4>
                      {Object.entries(stats.byWorkType).map(([wt, hours]) => (
                        <div key={wt} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{wt}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{hours}h</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Per Job */}
                  {Object.keys(stats.byJob).length > 0 && (
                    <div className="glass-card rounded-2xl p-5">
                      <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                        By Job
                      </h4>
                      {Object.entries(stats.byJob).map(([job, hours]) => (
                        <div key={job} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-tertiary)' }}>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{job}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{hours}h</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => setTab('list')}
                    className="w-full py-2 rounded-full text-sm font-medium"
                    style={{ color: 'var(--text-link)' }}>← Back to list</button>
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
