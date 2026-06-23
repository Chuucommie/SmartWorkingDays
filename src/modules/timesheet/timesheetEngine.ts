// ──────────────────────────────────────────────
// EOS Timesheet — Logica pura (testabile)
// ──────────────────────────────────────────────

import type {
  Timesheet,
  TimesheetHeader,
  TimesheetLine,
  TimesheetStatus,
  TimesheetStats,
  TimesheetFilter,
  ValidationResult,
} from './timesheetTypes.ts'

// ── Helpers ──

/** Genera un ID univoco */
export function generateId(): string {
  return crypto.randomUUID()
}

/** Formatta una data ISO in formato leggibile (it-IT) */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Formatta un numero come valuta */
export function formatCurrency(value: number): string {
  return `€ ${value.toFixed(2)}`
}

/** Restituisce il numero della settimana ISO da una data */
export function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr)
  const start = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return Math.ceil((days + start.getDay() + 1) / 7)
}

/** Restituisce le date di inizio e fine settimana */
export function getWeekRange(weekNo: number, year: number = new Date().getFullYear()): { start: string; end: string } {
  const jan1 = new Date(year, 0, 1)
  const daysOffset = (weekNo - 1) * 7 - jan1.getDay() + 1
  const start = new Date(year, 0, 1 + daysOffset)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

// ── Validazione ──

/**
 * Valida un timesheet completo.
 */
export function validateTimesheet(timesheet: Timesheet): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Header
  if (!timesheet.header.resourceNo) errors.push('Resource No. obbligatorio')
  if (!timesheet.header.resourceName) errors.push('Resource Name obbligatorio')
  if (!timesheet.header.startingDate) errors.push('Data inizio obbligatoria')
  if (!timesheet.header.endingDate) errors.push('Data fine obbligatoria')

  // Date
  if (timesheet.header.startingDate && timesheet.header.endingDate) {
    if (new Date(timesheet.header.startingDate) > new Date(timesheet.header.endingDate)) {
      errors.push('Data inizio successiva alla data fine')
    }
  }

  // Lines
  if (timesheet.lines.length === 0) {
    warnings.push('Nessuna riga inserita')
  }

  for (const line of timesheet.lines) {
    if (line.quantity <= 0) errors.push(`Riga ${line.lineNo}: quantità deve essere > 0`)
    if (line.quantity > 24) warnings.push(`Riga ${line.lineNo}: ${line.quantity}h in un giorno — verificare`)
    if (!line.description) errors.push(`Riga ${line.lineNo}: descrizione obbligatoria`)
    if (line.unitCost < 0) errors.push(`Riga ${line.lineNo}: costo unitario negativo`)
  }

  // Totale ore giornaliero
  const byDay: Record<string, number> = {}
  for (const line of timesheet.lines) {
    if (line.date) {
      byDay[line.date] = (byDay[line.date] || 0) + line.quantity
    }
  }
  for (const [date, hours] of Object.entries(byDay)) {
    if (hours > 24) errors.push(`${date}: ${hours}h totali — supera le 24h`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ── Calcoli ──

/**
 * Calcola le statistiche di un timesheet.
 */
export function computeStats(timesheet: Timesheet): TimesheetStats {
  let totalHours = 0
  let totalCost = 0
  let billableHours = 0
  let nonBillableHours = 0
  const byWorkType: Record<string, { hours: number; cost: number }> = {}
  const byJob: Record<string, { hours: number; cost: number }> = {}
  const byDay: Record<string, number> = {}

  for (const line of timesheet.lines) {
    totalHours += line.quantity
    totalCost += line.totalCost

    if (line.chargeable) billableHours += line.quantity
    else nonBillableHours += line.quantity

    // Per work type
    const wt = line.workType || 'Standard'
    if (!byWorkType[wt]) byWorkType[wt] = { hours: 0, cost: 0 }
    byWorkType[wt].hours += line.quantity
    byWorkType[wt].cost += line.totalCost

    // Per job
    if (line.jobNo) {
      if (!byJob[line.jobNo]) byJob[line.jobNo] = { hours: 0, cost: 0 }
      byJob[line.jobNo].hours += line.quantity
      byJob[line.jobNo].cost += line.totalCost
    }

    // Per giorno
    if (line.date) {
      byDay[line.date] = (byDay[line.date] || 0) + line.quantity
    }
  }

  return { totalHours, totalCost, billableHours, nonBillableHours, byWorkType, byJob, byDay }
}

/**
 * Calcola il totale delle ore di un timesheet.
 */
export function computeTotalHours(lines: TimesheetLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0)
}

/**
 * Calcola il costo totale.
 */
export function computeTotalCost(lines: TimesheetLine[]): number {
  return lines.reduce((sum, l) => sum + l.totalCost, 0)
}

// ── Filtri ──

/**
 * Filtra una lista di timesheet.
 */
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

/**
 * Crea un nuovo timesheet vuoto.
 */
export function createEmptyTimesheet(resourceNo: string, resourceName: string): Timesheet {
  const now = new Date()
  const weekNo = getWeekNumber(now.toISOString())
  const { start, end } = getWeekRange(weekNo)
  const id = generateId()
  const no = `TS${String(weekNo).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  const header: TimesheetHeader = {
    id,
    no,
    resourceNo,
    resourceName,
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

/**
 * Aggiunge una riga vuota al timesheet.
 */
export function addEmptyLine(timesheet: Timesheet): Timesheet {
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
    unitCost: 0,
    totalCost: 0,
    chargeable: true,
  }
  return {
    ...timesheet,
    lines: [...timesheet.lines, newLine],
  }
}

/**
 * Aggiorna una riga esistente.
 */
export function updateLine(timesheet: Timesheet, lineId: string, updates: Partial<TimesheetLine>): Timesheet {
  const lines = timesheet.lines.map(l => {
    if (l.id !== lineId) return l
    const updated = { ...l, ...updates }
    // Ricalcola totalCost
    updated.totalCost = updated.quantity * updated.unitCost
    return updated
  })
  return { ...timesheet, lines }
}

/**
 * Rimuove una riga.
 */
export function removeLine(timesheet: Timesheet, lineId: string): Timesheet {
  const lines = timesheet.lines
    .filter(l => l.id !== lineId)
    .map((l, i) => ({ ...l, lineNo: i + 1 }))
  return { ...timesheet, lines }
}

/**
 * Cambia lo stato di un timesheet.
 */
export function changeStatus(timesheet: Timesheet, newStatus: TimesheetStatus): Timesheet {
  return {
    ...timesheet,
    header: { ...timesheet.header, status: newStatus, updatedAt: new Date().toISOString() },
  }
}

// ── Mock data ──

/**
 * Genera dati mock per sviluppo/testing.
 */
export function getMockTimesheets(): Timesheet[] {
  const now = new Date()
  const weekNo = getWeekNumber(now.toISOString())
  const { start, end } = getWeekRange(weekNo)

  const days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']
  const dates = (() => {
    const s = new Date(start)
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(s)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  })()

  const ts1: Timesheet = {
    header: {
      id: 'ts-001',
      no: 'TS2401',
      resourceNo: 'EMP001',
      resourceName: 'Ricardo Quintero',
      status: 'Approved',
      startingDate: start,
      endingDate: end,
      weekNo,
      periodType: 'Week',
      jobNo: 'JOB-2024-001',
      description: 'Sviluppo modulo Timesheet',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    lines: days.map((day, i) => ({
      id: `line-${i + 1}`,
      timesheetId: 'ts-001',
      lineNo: i + 1,
      type: 'Resource' as const,
      no: 'EMP001',
      description: `${day} — Sviluppo frontend React`,
      quantity: i === 2 ? 4 : 8,
      unitOfMeasure: 'Hours' as const,
      unitCost: 45,
      totalCost: (i === 2 ? 4 : 8) * 45,
      jobNo: 'JOB-2024-001',
      workType: 'Billable',
      chargeable: true,
      locationCode: 'MILANO',
      date: dates[i],
    })),
  }

  const ts2: Timesheet = {
    header: {
      id: 'ts-002',
      no: 'TS2402',
      resourceNo: 'EMP001',
      resourceName: 'Ricardo Quintero',
      status: 'Open',
      startingDate: start,
      endingDate: end,
      weekNo: weekNo + 1,
      periodType: 'Week',
      description: 'Documentazione e test',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    lines: [
      {
        id: 'line-2-1',
        timesheetId: 'ts-002',
        lineNo: 1,
        type: 'Resource',
        no: 'EMP001',
        description: 'Documentazione tecnica',
        quantity: 6,
        unitOfMeasure: 'Hours',
        unitCost: 45,
        totalCost: 270,
        workType: 'Non-Billable',
        chargeable: false,
        date: dates[0],
      },
      {
        id: 'line-2-2',
        timesheetId: 'ts-002',
        lineNo: 2,
        type: 'Resource',
        no: 'EMP001',
        description: 'Test unitari',
        quantity: 8,
        unitOfMeasure: 'Hours',
        unitCost: 45,
        totalCost: 360,
        workType: 'Billable',
        chargeable: true,
        jobNo: 'JOB-2024-002',
        date: dates[1],
      },
    ],
  }

  return [ts1, ts2]
}
