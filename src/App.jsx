import { useState, useEffect } from 'react'

// Mappatura esatta degli arrotondamenti come da specifiche
const SW_DAYS_MAP = {
  5: 3.0,
  4: 2.5,
  3: 2.0,
  2: 1.0,
  1: 0.0,
  0: 0.0,
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']

function App() {
  const [workedDays, setWorkedDays] = useState([true, true, true, true, true])
  const [swDays, setSwDays] = useState(3.0)
  const [animating, setAnimating] = useState(false)

  const countWorked = () => workedDays.filter(Boolean).length

  const toggleDay = (index) => {
    const next = [...workedDays]
    next[index] = !next[index]
    setWorkedDays(next)
  }

  useEffect(() => {
    const count = countWorked()
    const result = SW_DAYS_MAP[count] ?? 0
    setAnimating(true)
    setSwDays(result)
    const timer = setTimeout(() => setAnimating(false), 400)
    return () => clearTimeout(timer)
  }, [workedDays])

  const workedCount = countWorked()
  const theoretical = (workedCount * 0.6).toFixed(1)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8"
         style={{ background: 'linear-gradient(180deg, #F2F2F7 0%, #E8E8ED 50%, #F2F2F7 100%)' }}>
      
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
           style={{
             backgroundImage: 'radial-gradient(circle at 25% 25%, #34C759 1px, transparent 1px), radial-gradient(circle at 75% 75%, #34C759 1px, transparent 1px)',
             backgroundSize: '60px 60px'
           }} />

      <div className="relative w-full max-w-[420px]">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[28px] mb-4"
               style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 50%, #248A3D 100%)',
                        boxShadow: '0 8px 24px rgba(52,199,89,0.25)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
            </svg>
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-[#1C1C1E] mb-1">
            Smart Working
          </h1>
          <p className="text-[15px] text-[#8E8E93] font-normal">
            Calcola i giorni di lavoro da remoto
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-[32px] p-6 sm:p-8">
          
          {/* Day Selector */}
          <div className="mb-8">
            <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-[0.5px] mb-4 text-center">
              Giorni in ufficio questa settimana
            </p>
            <div className="flex justify-center gap-2 sm:gap-3">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => toggleDay(i)}
                  className={`
                    day-pill w-[52px] h-[52px] sm:w-[60px] sm:h-[60px]
                    flex flex-col items-center justify-center
                    text-sm font-medium
                    ${workedDays[i] 
                      ? 'active bg-white/80 text-[#1C1C1E]' 
                      : 'bg-transparent text-[#8E8E93]'}
                  `}
                >
                  <span className="text-[11px] sm:text-xs opacity-60 mb-0.5">
                    {workedDays[i] ? '🏢' : '🏠'}
                  </span>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-center text-[13px] text-[#8E8E93] mt-3">
              {workedCount} {workedCount === 1 ? 'giorno' : 'giorni'} in ufficio
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#E5E5EA] to-transparent mb-8" />

          {/* Calculation Details */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center px-2">
              <span className="text-[15px] text-[#8E8E93]">Giorni lavorati</span>
              <span className="text-[15px] font-medium text-[#1C1C1E]">{workedCount}/5</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-[15px] text-[#8E8E93]">Percentuale SW (60%)</span>
              <span className="text-[15px] font-medium text-[#1C1C1E]">{theoretical} giorni</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-[15px] text-[#8E8E93]">Arrotondamento</span>
              <span className="text-[13px] text-[#34C759] font-medium">
                {workedCount === 4 ? '↑ 2.4 → 2.5' : 
                 workedCount === 3 ? '↑ 1.8 → 2.0' : 
                 workedCount === 2 ? '↓ 1.2 → 1.0' : 
                 workedCount === 1 ? '↓ 0.6 → 0.0' : '—'}
              </span>
            </div>
          </div>

          {/* Result */}
          <div className="result-pill px-8 py-5 text-center">
            <p className="text-[13px] font-medium text-white/70 uppercase tracking-[0.5px] mb-1">
              Giorni Smart Working
            </p>
            <p className={`text-[48px] font-bold text-white leading-none tracking-[-1px] ${animating ? 'animate-count' : ''}`}>
              {swDays.toFixed(1)}
            </p>
            <p className="text-[15px] text-white/80 mt-1">
              {swDays === 0 ? 'Nessun giorno disponibile' :
               swDays === 1 ? '1 giorno da remoto' :
               `${swDays.toFixed(1)} giorni da remoto`}
            </p>
          </div>

          {/* Info note */}
          <p className="text-center text-[12px] text-[#8E8E93] mt-5 leading-relaxed">
            Basato sull'accordo aziendale del 60% delle ore lavorate,<br/>
            con arrotondamenti specifici per ogni scenario.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-[#8E8E93] mt-6 opacity-60">
          SmartWorkingDays · v1.0
        </p>
      </div>
    </div>
  )
}

export default App