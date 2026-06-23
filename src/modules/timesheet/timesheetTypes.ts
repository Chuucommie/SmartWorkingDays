// ──────────────────────────────────────────────
// EOS Timesheet — Tipi e interfacce (BC esatti)
// ──────────────────────────────────────────────
// Campi esattamente come in Business Central.
// Nomi in italiano nella UI, interfacce in inglese.
// ──────────────────────────────────────────────

export type TimesheetStatus = 'Open' | 'Pending Approval' | 'Approved' | 'Rejected'
export type TimesheetLineType = 'Resource' | 'Item' | 'G/L Account'
export type UnitOfMeasure = 'Hours' | 'Days'
export type PeriodType = 'Week' | 'Month'

/** Mappa nomi campi BC → italiano */
export const FIELD_LABELS: Record<string, string> = {
  resourceNo: 'Nr. risorsa',
  resourceName: 'Nome risorsa',
  status: 'Stato',
  startingDate: 'Data inizio',
  endingDate: 'Data fine',
  weekNo: 'Nr. settimana',
  periodType: 'Tipo periodo',
  jobNo: 'Nr. commessa',
  description: 'Descrizione',
  type: 'Tipo',
  no: 'Nr.',
  quantity: 'Quantità',
  unitOfMeasure: 'UdM',
  workType: 'Tipo lavoro',
  chargeable: 'Addebitabile',
  locationCode: 'Codice ubicazione',
}

export const STATUS_LABELS: Record<TimesheetStatus, string> = {
  'Open': 'Aperto',
  'Pending Approval': 'In approvazione',
  'Approved': 'Approvato',
  'Rejected': 'Respinto',
}

export const STATUS_COLORS: Record<TimesheetStatus, string> = {
  'Open': '#007AFF',
  'Pending Approval': '#FF9500',
  'Approved': '#34C759',
  'Rejected': '#FF3B30',
}

export interface TimesheetHeader {
  id: string
  no: string
  resourceNo: string
  resourceName: string
  status: TimesheetStatus
  startingDate: string
  endingDate: string
  weekNo: number
  periodType: PeriodType
  jobNo?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface TimesheetLine {
  id: string
  timesheetId: string
  lineNo: number
  type: TimesheetLineType
  no: string
  description: string
  quantity: number
  unitOfMeasure: UnitOfMeasure
  jobNo?: string
  workType?: string
  chargeable: boolean
  locationCode?: string
  dayIndex: number  // 0=Lunedì ... 4=Venerdì
}

export interface Timesheet {
  header: TimesheetHeader
  lines: TimesheetLine[]
}

export interface DaySummary {
  dayIndex: number
  dayName: string
  date: string
  lines: TimesheetLine[]
  totalHours: number
}

export interface TimesheetStats {
  totalHours: number
  byDay: Record<number, number>
  byWorkType: Record<string, number>
  byJob: Record<string, number>
}

export interface TimesheetFilter {
  status?: TimesheetStatus
  resourceNo?: string
  weekNo?: number
  dateFrom?: string
  dateTo?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
