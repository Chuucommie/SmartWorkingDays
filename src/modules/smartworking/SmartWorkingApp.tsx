// ──────────────────────────────────────────────
// SmartWorkingDays — Pagina principale
// ──────────────────────────────────────────────
// Dropdown regola SW in alto, bottone Rilascia,
// bridge verso Timesheet con Location Code.
// ──────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { generateAllPermutations } from './smartworking.ts'
import type { Permutation } from './smartworking.ts'
import type { DayState, WeekPlan } from '../shared/config.ts'
import { computeTarget, describeSwRule } from '../shared/userProfile.ts'
import type { SwRule } from '../shared/userProfile.ts'
import { getCurrentUserProfile } from '../shared/msAuth.ts'
import { save } from './savedWeeks.ts'
import { savePlanning } from '../shared/planBackend.ts'
import { getCurrentWeekStart } from './teamWatcher.ts'
import UserBadge from './UserBadge.tsx'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'] as const
const DAY_LABELS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'] as const

interface StateConfig { label: string; icon: string; cls: string; dot: string }

const STATES: Record<DayState, StateConfig> = {
  free:      { label: 'Libero',   icon: '◌', cls: 'state-free',   dot: '' },
  sw:        { label: 'SW Fisso', icon: '🏠', cls: 'state-sw',     dot: 'sw' },
  office:    { label: 'Ufficio',  icon: '🏢', cls: 'state-office', dot: 'office' },
  absent:    { label: 'Assenza',  icon: '✕', cls: 'state-absent', dot: 'absent' },
  half:      { label: 'Misto',    icon: '◐', cls: 'state-half',   dot: 'half' },
}
const STATE_ORDER: DayState[] = ['free', 'sw', 'office', 'absent']

// ── Regole SW disponibili ──

interface RuleOption {
  value: string
  label: string
  rule: SwRule
}

const RULE_OPTIONS: RuleOption[] = [
  { value: '60', label: '60% Smart Working', rule: { type: 'percentage', value: 60 } },
  { value: '40', label: '40% Smart Working', rule: { type: 'percentage', value: 40 } },
  { value: 'fixed2', label: 'Max 2 giorni SW', rule: { type: 'fixed', value: 2 } },
  { value: 'fixed3', label: 'Max 3 giorni SW', rule: { type: 'fixed', value: 3 } },
]

function getAdherenceBadge(adherence: number): { emoji: string; cls: string; label: string } {
  if (adherence >= 0.99) return { emoji: '🟢', cls: 'adherence-green', label: 'Ottimale' }
  if (adherence >= 0.75) return { emoji: '🟡', cls: 'adherence-yellow', label: 'Buono' }
  if (adherence >= 0.4)  return { emoji: '🟠', cls: 'adherence-orange', label: 'Parziale' }
  return { emoji: '🔴', cls: 'adherence-red', label: 'Minimo' }
}

export default function SmartWorkingApp() {
  const [dayStates, setDayStates] = useState<WeekPlan>(['free', 'free', 'free', 'free', 'free'])
  const [selectedPerm, setSelectedPerm] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // ── Dropdown regola SW ──
  const [selectedRule, setSelectedRule] = useState<string>('60')
  const swRule: SwRule = RULE_OPTIONS.find(o => o.value === selectedRule)?.rule || RULE_OPTIONS[0].rule

  // ── Salvataggio ──
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Pubblicazione ──
  const [publishing, setPublishing] = useState(false)
  const [publishMsg, setPublishMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const userProfile = getCurrentUserProfile()
  const displayName = userProfile?.employeeName ?? 'Utente'
  const resourceNo = userProfile?.employeeId || 'EMP001'
  const sedeCode = userProfile?.locationCode || 'BOLOGNA'

  const cycleState = (index: number) => {
    setDayStates(prev => {
      const next = [...prev] as WeekPlan
      const currentIdx = STATE_ORDER.indexOf(next[index])
      next[index] = STATE_ORDER[(currentIdx + 1) % STATE_ORDER.length]
      return next
    })
    setSelectedPerm(null)
  }

  const workedCount = dayStates.filter(s => s !== 'absent').length
  const { targetSW, targetOffice } = computeTarget(swRule, workedCount)

  const permutations: Permutation[] = useMemo(
    () => generateAllPermutations(dayStates, swRule),
    [dayStates, swRule]
  )

  const validCount = permutations.filter(p => p.valid).length

  useEffect(() => {
    setAnimating(true)
    const t = setTimeout(() => setAnimating(false), 400)
    return () => clearTimeout(t)
  }, [targetSW])

  const ruleDesc = describeSwRule(swRule)
  const theoretical = swRule.type === 'percentage'
    ? ((swRule.value / 100) * workedCount).toFixed(1)
    : `${Math.min(swRule.value, workedCount)}`

  const roundNote = (() => {
    if (swRule.type !== 'percentage') return null
    if (workedCount === 4) return '↑ 2.4 → 2.5'
    if (workedCount === 3) return '↑ 1.8 → 2.0'
    if (workedCount === 2) return '↓ 1.2 → 1.0'
    if (workedCount === 1) return '↓ 0.6 → 0.0'
    return '—'
  })()

  // ── Salva ──
  const handleSave = () => {
    if (selectedPerm === null) return
    const perm = permutations[selectedPerm]
    if (!perm || !perm.valid) return
    const name = saveName.trim()
    if (!name) { setSaveMsg({ type: 'error', text: 'Inserisci un nome' }); return }
    const result = save(name, perm.week, perm.totalSW)
    if (result.success) { setSaveMsg({ type: 'success', text: `"${name}" salvata!` }); setSaveName(''); setSaving(false) }
    else setSaveMsg({ type: 'error', text: result.error || 'Errore' })
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // ── Pubblica (salva sul backend così il team vede) ──
  const handlePublish = async () => {
    if (selectedPerm === null) return
    const perm = permutations[selectedPerm]
    if (!perm || !perm.valid) return

    setPublishing(true)
    setPublishMsg(null)

    const weekStart = getCurrentWeekStart()
    const result = await savePlanning({
      employeeId: resourceNo,
      employeeName: displayName,
      department: userProfile?.department || 'IT',
      locationCode: sedeCode,
      weekStart,
      week: perm.week,
      swDaysRequested: perm.totalSW,
    })

    setPublishing(false)
    if (result.success) {
      setPublishMsg({ type: 'success', text: `Pianificazione pubblicata per la settimana del ${weekStart}! Il team può vederla.` })
    } else {
      setPublishMsg({ type: 'error', text: result.error || 'Errore durante la pubblicazione' })
    }
    setTimeout(() => setPublishMsg(null), 5000)
  }

  return (
    <div className="sw-page-bg min-h-screen flex items-start justify-center p-4 sm:p-8 pt-8 sm:pt-12">
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
           style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #34C759 1px, transparent 1px), radial-gradient(circle at 75% 75%, #007AFF 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div className="relative w-full max-w-[480px]">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[24px] mb-3"
               style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 50%, #248A3D 100%)', boxShadow: '0 6px 20px rgba(52,199,89,0.22)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] mb-1" style={{ color: 'var(--text-primary)' }}>Smart Working</h1>
          <p className="text-[14px] font-normal" style={{ color: 'var(--text-secondary)' }}>Configura i vincoli e scegli la tua settimana</p>
          <div className="mt-3"><UserBadge displayName={displayName} swRule={swRule} /></div>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-[28px] p-5 sm:p-7">

          {/* ── Dropdown Regola SW ── */}
          <div className="mb-5">
            <label className="text-[12px] font-medium uppercase tracking-[0.5px] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Regola Smart Working</label>
            <select
              value={selectedRule}
              onChange={e => { setSelectedRule(e.target.value); setSelectedPerm(null) }}
              className="w-full px-4 py-2.5 rounded-full text-sm font-medium border appearance-none"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              {RULE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* ── Selettore Giorni ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-medium uppercase tracking-[0.5px]" style={{ color: 'var(--text-secondary)' }}>Configura settimana</p>
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>clicca per cambiare stato</span>
            </div>
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {DAY_LABELS.map((label, i) => {
                const state = dayStates[i]
                const cfg = STATES[state]
                return (
                  <button key={label} onClick={() => cycleState(i)}
                    className={`day-pill ${cfg.cls} w-[56px] h-[64px] sm:w-[64px] sm:h-[72px] flex flex-col items-center justify-center gap-1 text-xs sm:text-sm font-medium`}
                    title={`${DAY_LABELS_FULL[i]}: ${cfg.label}`}>
                    {cfg.dot && <span className={`state-dot ${cfg.dot}`} />}
                    <span className="text-base sm:text-lg leading-none">{cfg.icon}</span>
                    <span className="text-[11px] sm:text-xs leading-none">{label}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-center gap-3 mt-3 flex-wrap">
              <span className="legend-pill sw">🏠 SW</span>
              <span className="legend-pill office">🏢 Ufficio</span>
              <span className="legend-pill absent">✕ Assenza</span>
              <span className="text-[11px] self-center" style={{ color: 'var(--text-secondary)' }}>◌ Libero</span>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-primary)] to-transparent mb-5" />

          {/* ── Riepilogo ── */}
          <div className="space-y-2 mb-5 px-1">
            <div className="flex justify-between items-center"><span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Giorni lavorati</span><span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{workedCount}/5</span></div>
            <div className="flex justify-between items-center"><span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Regola SW</span><span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{ruleDesc}</span></div>
            {swRule.type === 'percentage' && <div className="flex justify-between items-center"><span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Percentuale ({swRule.value}%)</span><span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{theoretical} giorni</span></div>}
            {roundNote && roundNote !== '—' && <div className="flex justify-between items-center"><span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Arrotondamento</span><span className="text-[13px] font-medium" style={{ color: 'var(--text-green)' }}>{roundNote}</span></div>}
          </div>

          {/* ── Result Pill ── */}
          <div className="result-pill px-6 py-4 text-center mb-5">
            <div className="flex justify-center gap-6">
              <div><p className="text-[11px] font-medium text-white/60 uppercase tracking-[0.5px]">Smart Working</p><p className={`text-[36px] font-bold text-white leading-none tracking-[-0.5px] ${animating ? 'animate-count' : ''}`}>{targetSW.toFixed(1)}</p><p className="text-[10px] text-white/40 mt-1">massimo</p></div>
              <div className="w-px bg-white/20" />
              <div><p className="text-[11px] font-medium text-white/60 uppercase tracking-[0.5px]">Ufficio</p><p className={`text-[36px] font-bold text-white leading-none tracking-[-0.5px] ${animating ? 'animate-count' : ''}`}>{targetOffice.toFixed(1)}</p><p className="text-[10px] text-white/40 mt-1">minimo</p></div>
            </div>
          </div>

          {/* ── Permutazioni ── */}
          {permutations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-medium uppercase tracking-[0.5px]" style={{ color: 'var(--text-secondary)' }}>Combinazioni</p>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium"><span style={{ color: 'var(--text-green)' }}>{validCount} valide</span>{showAll && <span style={{ color: 'var(--text-secondary)' }}> / {permutations.length} totali</span>}</span>
                  {permutations.length > validCount && <button onClick={() => setShowAll(s => !s)} className="text-[11px] px-2 py-1 rounded-full border transition-colors" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>{showAll ? 'Solo valide' : `+${permutations.length - validCount} non valide`}</button>}
                </div>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {(showAll ? permutations : permutations.filter(p => p.valid)).map((perm) => {
                  const origIdx = permutations.indexOf(perm)
                  const adh = getAdherenceBadge(perm.adherence)
                  const pct = Math.round(perm.adherence * 100)
                  return (
                  <button key={origIdx} onClick={() => perm.valid && setSelectedPerm(origIdx === selectedPerm ? null : origIdx)} disabled={!perm.valid}
                    className={`perm-row w-full px-4 py-3 flex items-center justify-between gap-2 ${!perm.valid ? 'opacity-40 cursor-not-allowed' : ''} ${origIdx === selectedPerm ? 'selected' : ''}`}
                    title={perm.valid ? `Aderenza ${pct}% — clicca per selezionare` : 'Non valida: supera il target SW'}>
                    <span className="text-[11px] font-medium w-5 text-left" style={{ color: 'var(--text-secondary)' }}>{origIdx + 1}</span>
                    <div className="flex gap-1.5 flex-1 justify-center">
                      {perm.week.map((state, i) => (<span key={i} className={`mini-pill ${state}`}>{STATES[state].icon} {DAY_LABELS[i]}</span>))}
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className={perm.valid ? 'font-medium' : ''} style={{ color: perm.valid ? 'var(--text-green)' : 'var(--text-secondary)' }}>🏠{perm.totalSW}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>·</span>
                      <span className={perm.valid ? 'font-medium' : ''} style={{ color: perm.valid ? 'var(--text-blue)' : 'var(--text-secondary)' }}>🏢{perm.totalOffice}</span>
                    </div>
                    <span className={`adherence-badge ${adh.cls}`} title={`${adh.label}: ${pct}%`}>{adh.emoji} {pct}%</span>
                    {perm.valid ? (origIdx === selectedPerm ? <span className="text-sm" style={{ color: 'var(--accent-green)' }}>✓</span> : <span className="text-[10px] opacity-60" style={{ color: 'var(--accent-green)' }}>valida</span>) : <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>✗</span>}
                  </button>
                )})}
              </div>
            </div>
          )}

          {permutations.length === 0 && workedCount > 0 && (
            <div className="text-center py-4"><p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{dayStates.filter(s => s === 'sw').length > targetSW ? '⚠️ Troppi giorni fissati in Smart Working' : dayStates.filter(s => s === 'office').length > targetOffice ? '⚠️ Troppi giorni fissati in Ufficio' : 'Nessuna combinazione possibile'}</p></div>
          )}

          {/* ── Azioni: Salva + Rilascia ── */}
          {selectedPerm !== null && permutations[selectedPerm]?.valid && (
            <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--border-secondary)' }}>
              {/* Salva */}
              {!saving ? (
                <button onClick={() => setSaving(true)} className="w-full py-2.5 rounded-full text-sm font-semibold transition-all"
                  style={{ background: 'var(--accent-green)', color: 'white', boxShadow: '0 2px 12px rgba(52,199,89,0.3)' }}>💾 Salva questa combinazione</button>
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setSaving(false); setSaveName('') } }} placeholder="Nome combinazione..." maxLength={50} autoFocus
                    className="flex-1 px-3 py-2 rounded-full text-sm border outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }} />
                  <button onClick={handleSave} className="px-4 py-2 rounded-full text-sm font-semibold transition-all" style={{ background: 'var(--accent-green)', color: 'white' }}>✓</button>
                  <button onClick={() => { setSaving(false); setSaveName('') }} className="px-4 py-2 rounded-full text-sm font-medium transition-all" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>✕</button>
                </div>
              )}
              {saveMsg && <p className="text-center text-xs" style={{ color: saveMsg.type === 'success' ? 'var(--text-green)' : 'var(--text-red)' }}>{saveMsg.text}</p>}

              {/* Pubblica */}
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--accent-blue)', boxShadow: '0 2px 12px rgba(0,122,255,0.3)' }}
              >
                {publishing ? '⏳ Pubblicazione...' : '📤 Pubblica pianificazione'}
              </button>
              {publishMsg && (
                <p className="text-center text-xs mt-1" style={{ color: publishMsg.type === 'success' ? 'var(--text-green)' : 'var(--text-red)' }}>
                  {publishMsg.text}
                </p>
              )}
            </div>
          )}

          <p className="text-center text-[11px] mt-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Regola: {ruleDesc} · Puoi fare meno SW del target</p>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/smartworking/team" className="sw-nav-link">👥 Vedi team</Link>
            <Link to="/smartworking/saved" className="sw-nav-link">💾 Combinazioni salvate</Link>
            <Link to="/timesheet" className="sw-nav-link">⏱️ Timesheet</Link>
            <Link to="/" className="sw-nav-link">📊 Dashboard</Link>
          </div>
          <p className="text-center text-[11px] opacity-50" style={{ color: 'var(--text-secondary)' }}>SmartWorkingDays v3 · IgelDev</p>
        </div>
      </div>
    </div>
  )
}
