// ──────────────────────────────────────────────
// EOS Timesheet — Tipi e interfacce
// ──────────────────────────────────────────────
// Basato sul modulo Timesheet di Business Central.
// ──────────────────────────────────────────────

/** Stato di un timesheet (come in BC) */
export type TimesheetStatus = 'Open' | 'Pending Approval' | 'Approved' | 'Rejected'

/** Tipo di riga timesheet */
export type TimesheetLineType = 'Resource' | 'Item' | 'G/L Account'

/** Unità di misura (principalmente ore) */
export type UnitOfMeasure = 'Hours' | 'Days'

/** Tipo periodo */
export type PeriodType = 'Week' | 'Month'

/** Intestazione timesheet */
export interface TimesheetHeader {
  id: string
  no: string                    // es. "TS00001"
  resourceNo: string
  resourceName: string
  status: TimesheetStatus
  startingDate: string          // ISO 8601
  endingDate: string            // ISO 8601
  weekNo: number
  periodType: PeriodType
  jobNo?: string
  description?: string
  createdAt: string
  updatedAt: string
}

/** Riga timesheet */
export interface TimesheetLine {
  id: string
  timesheetId: string
  lineNo: number
  type: TimesheetLineType
  no: string                    // Resource No. / Item No. / G/L Account No.
  description: string
  quantity: number              // Ore lavorate
  unitOfMeasure: UnitOfMeasure
  unitCost: number
  totalCost: number             // quantity × unitCost
  jobNo?: string
  workType?: string             // es. "Billable", "Non-Billable"
  chargeable: boolean
  locationCode?: string
  date?: string                 // Data specifica della riga (ISO 8601)
}

/** Timesheet completo (header + lines) */
export interface Timesheet {
  header: TimesheetHeader
  lines: TimesheetLine[]
}

/** Riepilogo statistiche */
export interface TimesheetStats {
  totalHours: number
  totalCost: number
  billableHours: number
  nonBillableHours: number
  byWorkType: Record<string, { hours: number; cost: number }>
  byJob: Record<string, { hours: number; cost: number }>
  byDay: Record<string, number>  // data → ore
}

/** Filtri per la lista timesheet */
export interface TimesheetFilter {
  status?: TimesheetStatus
  resourceNo?: string
  weekNo?: number
  dateFrom?: string
  dateTo?: string
}

/** Risultato validazione */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
