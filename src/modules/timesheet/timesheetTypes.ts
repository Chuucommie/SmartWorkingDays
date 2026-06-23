// ──────────────────────────────────────────────
// EOS Timesheet — Tipi e interfacce
// ──────────────────────────────────────────────
// Basato sul modulo Timesheet di Business Central.
// Campi esattamente come in BC, senza costi.
// ──────────────────────────────────────────────

/** Stato di un timesheet (come in BC) */
export type TimesheetStatus = 'Open' | 'Pending Approval' | 'Approved' | 'Rejected'

/** Tipo di riga timesheet (BC: Type) */
export type TimesheetLineType = 'Resource' | 'Item' | 'G/L Account'

/** Unità di misura */
export type UnitOfMeasure = 'Hours' | 'Days'

/** Tipo periodo */
export type PeriodType = 'Week' | 'Month'

/** Intestazione timesheet — campi BC esatti */
export interface TimesheetHeader {
  id: string
  no: string                    // BC: No.
  resourceNo: string            // BC: Resource No.
  resourceName: string          // BC: Resource Name
  status: TimesheetStatus       // BC: Status
  startingDate: string          // BC: Starting Date (ISO 8601)
  endingDate: string            // BC: Ending Date (ISO 8601)
  weekNo: number                // BC: Week No.
  periodType: PeriodType        // BC: Period Type
  jobNo?: string                // BC: Job No.
  description?: string          // BC: Description
  createdAt: string
  updatedAt: string
}

/** Riga timesheet — campi BC esatti, senza costi */
export interface TimesheetLine {
  id: string
  timesheetId: string
  lineNo: number
  type: TimesheetLineType       // BC: Type
  no: string                    // BC: No.
  description: string           // BC: Description
  quantity: number              // BC: Quantity (ore)
  unitOfMeasure: UnitOfMeasure  // BC: Unit of Measure
  jobNo?: string                // BC: Job No.
  workType?: string             // BC: Work Type
  chargeable: boolean           // BC: Chargeable
  locationCode?: string         // BC: Location Code
  dayIndex: number              // 0=Lunedì, 1=Martedì, ..., 4=Venerdì
}

/** Timesheet completo (header + lines) */
export interface Timesheet {
  header: TimesheetHeader
  lines: TimesheetLine[]
}

/** Riepilogo per giorno */
export interface DaySummary {
  dayIndex: number
  dayName: string
  date: string
  lines: TimesheetLine[]
  totalHours: number
}

/** Riepilogo statistiche */
export interface TimesheetStats {
  totalHours: number
  byDay: Record<number, number>  // dayIndex → ore
  byWorkType: Record<string, number>
  byJob: Record<string, number>
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
