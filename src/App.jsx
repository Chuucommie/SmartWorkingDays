import { useState, useEffect, useMemo } from 'react'

// Mappatura giorni SW spettanti in base ai giorni effettivamente lavorati
const SW_DAYS_MAP = { 5: 3.0, 4: 2.5, 3: 2.0, 2: 1.0, 1: 0.0, 0: 0.0 }
const OFFICE_DAYS_MAP = { 5: 2.0, 4: 1.5, 3: 1.0, 2: 1.0, 1: 1.0, 0: 0.0 }

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
const DAY_LABELS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']

// Stati possibili per ogni giorno
const STATES = {
  free:      { label: 'Libero',   icon: '◌', cls: 'state-free',   dot: '' },
  sw:        { label: 'SW Fisso', icon: '🏠', cls: 'state-sw',     dot: 'sw' },
  office:    { label: 'Ufficio',  icon: '🏢', cls: 'state-office', dot: 'office' },
  absent:    { label: 'Assenza',  icon: '✕', cls: 'state-absent', dot: 'absent' },
}
const STATE_ORDER = ['free', 'sw', 'office', 'absent']

// Genera TUTTE le 2^k combinazioni per i giorni liberi, poi filtra con la regola 60%
// Per target frazionari (2.5, 1.5) usa floor/ceil come tolleranza
function generatePermutations(dayStates, swTarget, officeTarget) {
  const freeIndices = []
  let fixedSW = 0
  let fixedOffice = 0

  dayStates.forEach((state, i) => {
    if (state === 'sw') fixedSW++
    else if (state === 'office') fixedOffice++
    else if (state === 'free') freeIndices.push(i)
  })

  const k = freeIndices.length

  // Nessun giorno libero: verifica se i vincoli già soddisfano i target
  if (k === 0) {
    const totalSW = fixedSW
    const totalOffice = fixedOffice
    const swOk = totalSW >= Math.floor(swTarget) && totalSW <= Math.ceil(swTarget)
    const officeOk = totalOffice >= Math.floor(officeTarget) && totalOffice <= Math.ceil(officeTarget)
    return swOk && officeOk ? [{ week: [...dayStates], totalSW, totalOffice }] : []
  }

  const totalCombos = 1 << k // 2^k
  const all = []

  // Genera tutte le 2^k combinazioni per i giorni liberi
  for (let mask = 0; mask < totalCombos; mask++) {
    const week = [...dayStates]
    let assignedSW = 0
    let assignedOffice = 0

    for (let bit = 0; bit < k; bit++) {
      const dayIdx = freeIndices[bit]
      if (mask & (1 << bit)) {
        week[dayIdx] = 'sw'
        assignedSW++
      } else {
        week[dayIdx] = 'office'
        assignedOffice++
      }
    }

    const totalSW = fixedSW + assignedSW
    const totalOffice = fixedOffice + assignedOffice

    // Filtro: SW e Office devono rientrare nei range [floor, ceil] del target
    const swOk = totalSW >= Math.floor(swTarget) && totalSW <= Math.ceil(swTarget)
    const officeOk = totalOffice >= Math.floor(officeTarget) && totalOffice <= Math.ceil(officeTarget)

    if (swOk && officeOk) {
      all.push({ week, totalSW, totalOffice })
    }
  }

  return all
}

function App() {
  // Stato: array di 5 elementi con 'free' | 'sw' | 'office' | 'absent'
  const [dayStates, setDayStates] = useState(['free', 'free', 'free', 'free', 'free'])
  const [selectedPerm, setSelectedPerm] = useState(null) // indice permutazione selezionata
  const [animating, setAnimating] = useState(false)

  // Cicla stato al click
  const cycleState = (index) => {
    setDayStates(prev => {
      const next = [...prev]
      const currentIdx = STATE_ORDER.indexOf(next[index])
      next[index] = STATE_ORDER[(currentIdx + 1) % STATE_ORDER.length]
      return next
    })
    setSelectedPerm(null)
  }

  // Calcoli derivati
  const workedCount = dayStates.filter(s => s !== 'absent').length
  const swTarget = SW_DAYS_MAP[workedCount] ?? 0
  const officeTarget = OFFICE_DAYS_MAP[workedCount] ?? 0

  // Genera permutazioni
  const permutations = useMemo(
    () => generatePermutations(dayStates, swTarget, officeTarget),
    [dayStates, swTarget, officeTarget]
  )

  // Animazione al cambio
  useEffect(() => {
    setAnimating(true)
    const t = setTimeout(() => setAnimating(false), 400)
    return () => clearTimeout(t)
  }, [swTarget])

  const theoretical = (workedCount * 0.6).toFixed(1)

  // Descrizione arrotondamento
  const roundNote = (() => {
    if (workedCount === 4) return '↑ 2.4 → 2.5'
    if (workedCount === 3) return '↑ 1.8 → 2.0'
    if (workedCount === 2) return '↓ 1.2 → 1.0'
    if (workedCount === 1) return '↓ 0.6 → 0.0'
    return '—'
  })()

  return (
    <div className="min-h-screen flex items-start justify-center p-4 sm:p-8 pt-8 sm:pt-12"
         style={{ background: 'linear-gradient(180deg, #F2F2F7 0%, #E8E8ED 50%, #F2F2F7 100%)' }}>

      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
           style={{
             backgroundImage: 'radial-gradient(circle at 25% 25%, #34C759 1px, transparent 1px), radial-gradient(circle at 75% 75%, #007AFF 1px, transparent 1px)',
             backgroundSize: '60px 60px'
           }} />

      <div className="relative w-full max-w-[480px]">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[24px] mb-3"
               style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 50%, #248A3D 100%)',
                        boxShadow: '0 6px 20px rgba(52,199,89,0.22)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-[#1C1C1E] mb-1">
            Smart Working
          </h1>
          <p className="text-[14px] text-[#8E8E93] font-normal">
            Configura i vincoli e scegli la tua settimana
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-[28px] p-5 sm:p-7">

          {/* ── Selettore Giorni ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-[0.5px]">
                Configura settimana
              </p>
              <span className="text-[12px] text-[#8E8E93]">
                clicca per cambiare stato
              </span>
            </div>

            {/* Day pills */}
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {DAY_LABELS.map((label, i) => {
                const state = dayStates[i]
                const cfg = STATES[state]
                return (
                  <button
                    key={label}
                    onClick={() => cycleState(i)}
                    className={`
                      day-pill ${cfg.cls}
                      w-[56px] h-[64px] sm:w-[64px] sm:h-[72px]
                      flex flex-col items-center justify-center gap-1
                      text-xs sm:text-sm font-medium
                    `}
                    title={`${DAY_LABELS_FULL[i]}: ${cfg.label}`}
                  >
                    {cfg.dot && <span className={`state-dot ${cfg.dot}`} />}
                    <span className="text-base sm:text-lg leading-none">{cfg.icon}</span>
                    <span className="text-[11px] sm:text-xs leading-none">{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-3 mt-3 flex-wrap">
              <span className="legend-pill sw">🏠 SW</span>
              <span className="legend-pill office">🏢 Ufficio</span>
              <span className="legend-pill absent">✕ Assenza</span>
              <span className="text-[11px] text-[#8E8E93] self-center">◌ Libero</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#E5E5EA] to-transparent mb-5" />

          {/* ── Riepilogo Calcolo ── */}
          <div className="space-y-2 mb-5 px-1">
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#8E8E93]">Giorni lavorati</span>
              <span className="text-[14px] font-medium text-[#1C1C1E]">{workedCount}/5</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#8E8E93]">Percentuale SW (60%)</span>
              <span className="text-[14px] font-medium text-[#1C1C1E]">{theoretical} giorni</span>
            </div>
            {roundNote !== '—' && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#8E8E93]">Arrotondamento</span>
                <span className="text-[13px] text-[#34C759] font-medium">{roundNote}</span>
              </div>
            )}
          </div>

          {/* ── Result Pill ── */}
          <div className="result-pill px-6 py-4 text-center mb-5">
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-[11px] font-medium text-white/60 uppercase tracking-[0.5px]">Smart Working</p>
                <p className={`text-[36px] font-bold text-white leading-none tracking-[-0.5px] ${animating ? 'animate-count' : ''}`}>
                  {swTarget.toFixed(1)}
                </p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-[11px] font-medium text-white/60 uppercase tracking-[0.5px]">Ufficio</p>
                <p className={`text-[36px] font-bold text-white leading-none tracking-[-0.5px] ${animating ? 'animate-count' : ''}`}>
                  {officeTarget.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Permutazioni ── */}
          {permutations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-[0.5px]">
                  Combinazioni possibili
                </p>
                <span className="text-[12px] text-[#34C759] font-medium">
                  {permutations.length} {permutations.length === 1 ? 'opzione' : 'opzioni'}
                </span>
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {permutations.map((perm, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => setSelectedPerm(pIdx === selectedPerm ? null : pIdx)}
                    className={`
                      perm-row w-full px-4 py-3
                      flex items-center justify-between gap-2
                      ${pIdx === selectedPerm ? 'selected' : ''}
                    `}
                  >
                    <span className="text-[11px] text-[#8E8E93] font-medium w-5 text-left">
                      {pIdx + 1}
                    </span>
                    <div className="flex gap-1.5 flex-1 justify-center">
                      {perm.week.map((state, i) => (
                        <span key={i} className={`mini-pill ${state}`}>
                          {STATES[state].icon} {DAY_LABELS[i]}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-[#248A3D] font-medium">🏠{perm.totalSW}</span>
                      <span className="text-[#8E8E93]">·</span>
                      <span className="text-[#0056B3] font-medium">🏢{perm.totalOffice}</span>
                    </div>
                    {pIdx === selectedPerm && (
                      <span className="text-[#34C759] text-sm">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nessuna permutazione */}
          {permutations.length === 0 && workedCount > 0 && (
            <div className="text-center py-4">
              <p className="text-[13px] text-[#8E8E93]">
                {dayStates.filter(s => s === 'sw').length > Math.ceil(swTarget)
                  ? '⚠️ Troppi giorni fissati in Smart Working'
                  : dayStates.filter(s => s === 'office').length > Math.ceil(officeTarget)
                  ? '⚠️ Troppi giorni fissati in Ufficio'
                  : 'Nessuna combinazione valida con questi vincoli'}
              </p>
            </div>
          )}

          {/* Info note */}
          <p className="text-center text-[11px] text-[#8E8E93] mt-4 leading-relaxed">
            Basato sull'accordo aziendale del 60% delle ore lavorate
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#8E8E93] mt-5 opacity-50">
          SmartWorkingDays v2 · IgelDev
        </p>
      </div>
    </div>
  )
}

export default App