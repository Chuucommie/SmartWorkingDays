// ──────────────────────────────────────────────
// EOS Timesheet — Logica pura (testabile)
// ──────────────────────────────────────────────
// Basato sul modulo Timesheet di Business Central.
// Campi BC esatti, nessun costo, righe per giorno.
// ──────────────────────────────────────────────

import type {
  Timesheet,
  TimesheetHeader,
  TimesheetLine,
  TimesheetStatus,
  TimesheetStats,
  TimesheetFilter,
  DaySummary,
  ValidationResult,
} from './timesheetTypes.ts'

// ── Nomi giorni ──

export const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'] as const
export const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'] as const

// ── Helpers ──

export function generateId(): string {
  return crypto.randomUUID()
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })
}

/**
 * ISO 8601 week number (lunedì = primo giorno della settimana).
 * La settimana 1 è quella che contiene il primo giovedì dell'anno.
 */
export function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr)
  const dayNum = d.getUTCDay() || 7 // domenica = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // sposta al giovedì
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return weekNo
}

/**
 * Restituisce le date di inizio e fine settimana ISO (lunedì-domenica).
 */
export function getWeekRange(weekNo: number, year: number = new Date().getFullYear()): { start: string; end: string } {
  // Trova il 4 gennaio (sempre nella settimana 1)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  // Lunedì della settimana 1
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1))
  // Lunedì della settimana target
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (weekNo - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(monday), end: fmt(sunday) }
}

/**
 * Restituisce le 5 date (Lun-Ven) per una settimana.
 */
export function getWeekDates(weekNo: number, year?: number): string[] {
  const { start } = getWeekRange(weekNo, year)
  const monday = new Date(start)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d.toISOString().split('T')[0]
  })
}

// ── Validazione ──

export function validateTimesheet(timesheet: Timesheet): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!timesheet.header.resourceNo) errors.push('Resource No. obbligatorio')
  if (!timesheet.header.resourceName) errors.push('Resource Name obbligatorio')
  if (!timesheet.header.startingDate) errors.push('Data inizio obbligatoria')
  if (!timesheet.header.endingDate) errors.push('Data fine obbligatoria')

  if (timesheet.header.startingDate && timesheet.header.endingDate) {
    if (new Date(timesheet.header.startingDate) > new Date(timesheet.header.endingDate)) {
      errors.push('Data inizio successiva alla data fine')
    }
  }

  if (timesheet.lines.length === 0) {
    warnings.push('Nessuna riga inserita')
  }

  for (const line of timesheet.lines) {
    if (line.quantity <= 0) errors.push(`Riga ${line.lineNo}: Quantity deve essere > 0`)
    if (line.quantity > 24) warnings.push(`Riga ${line.lineNo}: ${line.quantity}h in un giorno — verificare`)
    if (!line.description) errors.push(`Riga ${line.lineNo}: Description obbligatoria`)
  }

  // Totale ore giornaliero
  const byDay: Record<number, number> = {}
  for (const line of timesheet.lines) {
    byDay[line.dayIndex] = (byDay[line.dayIndex] || 0) + line.quantity
  }
  for (const [dayIdx, hours] of Object.entries(byDay)) {
    if (hours > 24) errors.push(`${DAY_NAMES[Number(dayIdx)]}: ${hours}h totali — supera le 24h`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ── Raggruppamento per giorno ──

/**
 * Raggruppa le righe per giorno (dayIndex 0-4).
 */
export function groupByDay(lines: TimesheetLine[], weekNo: number, year?: number): DaySummary[] {
  const dates = getWeekDates(weekNo, year)
  const groups: Record<number, TimesheetLine[]> = {}
  for (let i = 0; i < 5; i++) groups[i] = []

  for (const line of lines) {
    if (groups[line.dayIndex]) {
      groups[line.dayIndex].push(line)
    }
  }

  return DAY_NAMES.map((name, i) => ({
    dayIndex: i,
    dayName: name,
    date: dates[i],
    lines: groups[i],
    totalHours: groups[i].reduce((sum, l) => sum + l.quantity, 0),
  }))
}

// ── Calcoli ──

export function computeStats(timesheet: Timesheet): TimesheetStats {
  let totalHours = 0
  const byDay: Record<number, number> = {}
  const byWorkType: Record<string, number> = {}
  const byJob: Record<string, number> = {}

  for (const line of timesheet.lines) {
    totalHours += line.quantity
    byDay[line.dayIndex] = (byDay[line.dayIndex] || 0) + line.quantity

    const wt = line.workType || 'Standard'
    byWorkType[wt] = (byWorkType[wt] || 0) + line.quantity

    if (line.jobNo) {
      byJob[line.jobNo] = (byJob[line.jobNo] || 0) + line.quantity
    }
  }

  return { totalHours, byDay, byWorkType, byJob }
}

export function computeTotalHours(lines: TimesheetLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0)
}

// ── Filtri ──

export function filterTimesheets(timesheets: Timesheet[], filter: TimesheetFilter): Timesheet[] {
  return timesheets.filter(ts => {
    if (filter.status && ts.header.status !== filter.status) return false
    if (filter.resourceNo && ts.header.resourceNo !== filter.resourceNo) return false
    if (filter.weekNo && ts.header.weekNo !== filter.weekNo) return false
    if (filter.dateFrom && ts.header.startingDate < filter.dateFrom) return false
    if (filter.dateTo && ts.header.endingDate > filter.dateTo) return false
    return true
  })
}

// ── Factory ──

export function createEmptyTimesheet(resourceNo: string, resourceName: string): Timesheet {
  const now = new Date()
  const weekNo = getWeekNumber(now.toISOString())
  const { start, end } = getWeekRange(weekNo)
  const id = generateId()
  const no = `TS${String(weekNo).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  const header: TimesheetHeader = {
    id, no, resourceNo, resourceName,
    status: 'Open',
    startingDate: start,
    endingDate: end,
    weekNo,
    periodType: 'Week',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  return { header, lines: [] }
}

export function addEmptyLine(timesheet: Timesheet, dayIndex: number): Timesheet {
  const lineNo = timesheet.lines.length + 1
  const newLine: TimesheetLine = {
    id: generateId(),
    timesheetId: timesheet.header.id,
    lineNo,
    type: 'Resource',
    no: timesheet.header.resourceNo,
    description: '',
    quantity: 0,
    unitOfMeasure: 'Hours',
    jobNo: timesheet.header.jobNo,
    chargeable: true,
    dayIndex,
  }
  return { ...timesheet, lines: [...timesheet.lines, newLine] }
}

export function updateLine(timesheet: Timesheet, lineId: string, updates: Partial<TimesheetLine>): Timesheet {
  const lines = timesheet.lines.map(l => l.id !== lineId ? l : { ...l, ...updates })
  return { ...timesheet, lines }
}

export function removeLine(timesheet: Timesheet, lineId: string): Timesheet {
  const lines = timesheet.lines
    .filter(l => l.id !== lineId)
    .map((l, i) => ({ ...l, lineNo: i + 1 }))
  return { ...timesheet, lines }
}

export function changeStatus(timesheet: Timesheet, newStatus: TimesheetStatus): Timesheet {
  return {
    ...timesheet,
    header: { ...timesheet.header, status: newStatus, updatedAt: new Date().toISOString() },
  }
}

// ── Mock data ──

export function getMockTimesheets(): Timesheet[] {
  const now = new Date()
  const currentWeek = getWeekNumber(now.toISOString())
  const prevWeek = currentWeek - 1

  const makeLines = (tsId: string, weekNo: number, jobNo: string, desc: string): TimesheetLine[] => {
    const dates = getWeekDates(weekNo)
    return [
      { id: generateId(), timesheetId: tsId, lineNo: 1, type: 'Resource', no: 'EMP001', description: `${desc} — analisi requisiti`, quantity: 8, unitOfMeasure: 'Hours', jobNo, workType: 'Billable', chargeable: true, locationCode: 'MILANO', dayIndex: 0 },
      { id: generateId(), timesheetId: tsId, lineNo: 2, type: 'Resource', no: 'EMP001', description: `${desc} — sviluppo`, quantity: 8, unitOfMeasure: 'Hours', jobNo, workType: 'Billable', chargeable: true, locationCode: 'MILANO', dayIndex: 1 },
      { id: generateId(), timesheetId: tsId, lineNo: 3, type: 'Resource', no: 'EMP001', description: `${desc} — sviluppo`, quantity: 4, unitOfMeasure: 'Hours', jobNo, workType: 'Billable', chargeable: true, locationCode: 'MILANO', dayIndex: 2 },
      { id: generateId(), timesheetId: tsId, lineNo: 4, type: 'Resource', no: 'EMP001', description: `${desc} — documentazione`, quantity: 6, unitOfMeasure: 'Hours', jobNo, workType: 'Non-Billable', chargeable: false, locationCode: 'MILANO', dayIndex: 2 },
      { id: generateId(), timesheetId: tsId, lineNo: 5, type: 'Resource', no: 'EMP001', description: `${desc} — test`, quantity: 8, unitOfMeasure: 'Hours', jobNo, workType: 'Billable', chargeable: true, locationCode: 'MILANO', dayIndex: 3 },
      { id: generateId(), timesheetId: tsId, lineNo: 6, type: 'Resource', no: 'EMP001', description: `${desc} — review & deploy`, quantity: 6, unitOfMeasure: 'Hours', jobNo, workType: 'Billable', chargeable: true, locationCode: 'MILANO', dayIndex: 4 },
    ]
  }

  const ts1: Timesheet = {
    header: {
      id: 'ts-001', no: `TS${String(prevWeek).padStart(2, '0')}01`, resourceNo: 'EMP001', resourceName: 'Ricardo Quintero',
      status: 'Approved', startingDate: getWeekDates(prevWeek)[0], endingDate: getWeekDates(prevWeek)[4],
      weekNo: prevWeek, periodType: 'Week', jobNo: 'JOB-2024-001', description: 'Sviluppo modulo Timesheet',
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    },
    lines: makeLines('ts-001', prevWeek, 'JOB-2024-001', 'Timesheet'),
  }

  const ts2: Timesheet = {
    header: {
      id: 'ts-002', no: `TS${String(currentWeek).padStart(2, '0')}01`, resourceNo: 'EMP001', resourceName: 'Ricardo Quintero',
      status: 'Open', startingDate: getWeekDates(currentWeek)[0], endingDate: getWeekDates(currentWeek)[4],
      weekNo: currentWeek, periodType: 'Week', description: 'Documentazione e test',
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    },
    lines: makeLines('ts-002', currentWeek, 'JOB-2024-002', 'Documentazione'),
  }

  return [ts1, ts2]
}
