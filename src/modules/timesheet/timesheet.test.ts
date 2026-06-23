import { describe, it, expect } from 'vitest'
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
  getWeekNumber,
  getWeekRange,
  getWeekDates,
  formatDate,
  generateId,
  DAY_NAMES,
} from './timesheetEngine.ts'
import type { TimesheetLine } from './timesheetTypes.ts'

// ──────────────────────────────────────────────
// 1. Factory
// ──────────────────────────────────────────────
describe('createEmptyTimesheet', () => {
  it('creates a timesheet with correct resource info', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo Quintero')
    expect(ts.header.resourceNo).toBe('EMP001')
    expect(ts.header.resourceName).toBe('Ricardo Quintero')
    expect(ts.header.status).toBe('Open')
    expect(ts.header.periodType).toBe('Week')
    expect(ts.lines).toHaveLength(0)
  })

  it('generates unique IDs', () => {
    const ts1 = createEmptyTimesheet('EMP001', 'Test')
    const ts2 = createEmptyTimesheet('EMP001', 'Test')
    expect(ts1.header.id).not.toBe(ts2.header.id)
  })

  it('sets correct week range', () => {
    const ts = createEmptyTimesheet('EMP001', 'Test')
    expect(ts.header.startingDate).toBeTruthy()
    expect(ts.header.endingDate).toBeTruthy()
    expect(new Date(ts.header.startingDate) <= new Date(ts.header.endingDate)).toBe(true)
  })
})

describe('addEmptyLine', () => {
  it('adds a line with correct dayIndex', () => {
    const ts = createEmptyTimesheet('EMP001', 'Test')
    const withLine = addEmptyLine(ts, 2) // Mercoledì
    expect(withLine.lines).toHaveLength(1)
    expect(withLine.lines[0].lineNo).toBe(1)
    expect(withLine.lines[0].dayIndex).toBe(2)
    expect(withLine.lines[0].type).toBe('Resource')
    expect(withLine.lines[0].chargeable).toBe(true)
  })

  it('increments lineNo for subsequent lines', () => {
    let ts = createEmptyTimesheet('EMP001', 'Test')
    ts = addEmptyLine(ts, 0)
    ts = addEmptyLine(ts, 1)
    ts = addEmptyLine(ts, 2)
    expect(ts.lines).toHaveLength(3)
    expect(ts.lines[0].lineNo).toBe(1)
    expect(ts.lines[1].lineNo).toBe(2)
    expect(ts.lines[2].lineNo).toBe(3)
  })
})

// ──────────────────────────────────────────────
// 2. Line operations
// ──────────────────────────────────────────────
describe('updateLine', () => {
  it('updates line fields', () => {
    let ts = createEmptyTimesheet('EMP001', 'Test')
    ts = addEmptyLine(ts, 0)
    const lineId = ts.lines[0].id
    ts = updateLine(ts, lineId, { quantity: 8, description: 'Updated' })
    expect(ts.lines[0].quantity).toBe(8)
    expect(ts.lines[0].description).toBe('Updated')
  })
})

describe('removeLine', () => {
  it('removes a line and renumbers remaining', () => {
    let ts = createEmptyTimesheet('EMP001', 'Test')
    ts = addEmptyLine(ts, 0)
    ts = addEmptyLine(ts, 1)
    ts = addEmptyLine(ts, 2)
    const line2Id = ts.lines[1].id
    ts = removeLine(ts, line2Id)
    expect(ts.lines).toHaveLength(2)
    expect(ts.lines[0].lineNo).toBe(1)
    expect(ts.lines[1].lineNo).toBe(2)
  })
})

// ──────────────────────────────────────────────
// 3. Status changes
// ──────────────────────────────────────────────
describe('changeStatus', () => {
  it('changes status to Pending Approval', () => {
    const ts = createEmptyTimesheet('EMP001', 'Test')
    const updated = changeStatus(ts, 'Pending Approval')
    expect(updated.header.status).toBe('Pending Approval')
  })

  it('changes status to Approved', () => {
    const ts = createEmptyTimesheet('EMP001', 'Test')
    const updated = changeStatus(ts, 'Approved')
    expect(updated.header.status).toBe('Approved')
  })

  it('changes status to Rejected', () => {
    const ts = createEmptyTimesheet('EMP001', 'Test')
    const updated = changeStatus(ts, 'Rejected')
    expect(updated.header.status).toBe('Rejected')
  })
})

// ──────────────────────────────────────────────
// 4. Computations
// ──────────────────────────────────────────────
describe('computeTotalHours', () => {
  it('sums all line quantities', () => {
    const lines: TimesheetLine[] = [
      { id: '1', timesheetId: 'ts1', lineNo: 1, type: 'Resource', no: 'R1', description: 'A', quantity: 8, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 0 },
      { id: '2', timesheetId: 'ts1', lineNo: 2, type: 'Resource', no: 'R1', description: 'B', quantity: 4, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 1 },
    ]
    expect(computeTotalHours(lines)).toBe(12)
  })

  it('returns 0 for empty lines', () => {
    expect(computeTotalHours([])).toBe(0)
  })
})

describe('computeStats', () => {
  it('computes correct statistics', () => {
    const ts = createEmptyTimesheet('EMP001', 'Test')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: 'Dev', quantity: 8, unitOfMeasure: 'Hours', chargeable: true, workType: 'Billable', jobNo: 'JOB-1', dayIndex: 0 },
      { id: '2', timesheetId: ts.header.id, lineNo: 2, type: 'Resource', no: 'R1', description: 'Docs', quantity: 4, unitOfMeasure: 'Hours', chargeable: false, workType: 'Non-Billable', dayIndex: 0 },
      { id: '3', timesheetId: ts.header.id, lineNo: 3, type: 'Resource', no: 'R1', description: 'Test', quantity: 6, unitOfMeasure: 'Hours', chargeable: true, workType: 'Billable', jobNo: 'JOB-2', dayIndex: 1 },
    ]
    const stats = computeStats(ts)
    expect(stats.totalHours).toBe(18)
    expect(stats.byDay[0]).toBe(12)
    expect(stats.byDay[1]).toBe(6)
    expect(stats.byWorkType['Billable']).toBe(14)
    expect(stats.byWorkType['Non-Billable']).toBe(4)
    expect(stats.byJob['JOB-1']).toBe(8)
    expect(stats.byJob['JOB-2']).toBe(6)
  })
})

// ──────────────────────────────────────────────
// 5. groupByDay
// ──────────────────────────────────────────────
describe('groupByDay', () => {
  it('groups lines by dayIndex', () => {
    const lines: TimesheetLine[] = [
      { id: '1', timesheetId: 'ts1', lineNo: 1, type: 'Resource', no: 'R1', description: 'A', quantity: 8, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 0 },
      { id: '2', timesheetId: 'ts1', lineNo: 2, type: 'Resource', no: 'R1', description: 'B', quantity: 4, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 0 },
      { id: '3', timesheetId: 'ts1', lineNo: 3, type: 'Resource', no: 'R1', description: 'C', quantity: 6, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 3 },
    ]
    const days = groupByDay(lines, 26, 2024)
    expect(days).toHaveLength(5)
    expect(days[0].lines).toHaveLength(2)
    expect(days[0].totalHours).toBe(12)
    expect(days[1].lines).toHaveLength(0)
    expect(days[3].lines).toHaveLength(1)
    expect(days[3].totalHours).toBe(6)
  })

  it('returns all 5 days even if empty', () => {
    const days = groupByDay([], 26, 2024)
    expect(days).toHaveLength(5)
    for (const d of days) {
      expect(d.lines).toHaveLength(0)
      expect(d.totalHours).toBe(0)
    }
  })
})

// ──────────────────────────────────────────────
// 6. Validation
// ──────────────────────────────────────────────
describe('validateTimesheet', () => {
  it('valid timesheet passes', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: 'Work', quantity: 8, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 0 },
    ]
    const result = validateTimesheet(ts)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects missing resource name', () => {
    const ts = createEmptyTimesheet('', '')
    const result = validateTimesheet(ts)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('risorsa'))).toBe(true)
  })

  it('detects zero quantity', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: 'Work', quantity: 0, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 0 },
    ]
    const result = validateTimesheet(ts)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Quantità'))).toBe(true)
  })

  it('detects missing description', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: '', quantity: 8, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 0 },
    ]
    const result = validateTimesheet(ts)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Descrizione'))).toBe(true)
  })

  it('warns on high daily hours', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: 'Work', quantity: 25, unitOfMeasure: 'Hours', chargeable: true, dayIndex: 0 },
    ]
    const result = validateTimesheet(ts)
    expect(result.warnings.some(w => w.includes('verificare'))).toBe(true)
  })

  it('warns on empty lines', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    const result = validateTimesheet(ts)
    expect(result.warnings.some(w => w.includes('Nessuna riga'))).toBe(true)
  })
})

// ──────────────────────────────────────────────
// 7. Filters
// ──────────────────────────────────────────────
describe('filterTimesheets', () => {
  const ts1 = createEmptyTimesheet('EMP001', 'Ricardo')
  const ts2 = createEmptyTimesheet('EMP002', 'Mario')
  const tsApproved = changeStatus(ts1, 'Approved')
  const all = [tsApproved, ts2]

  it('filters by status', () => {
    const result = filterTimesheets(all, { status: 'Approved' })
    expect(result).toHaveLength(1)
    expect(result[0].header.status).toBe('Approved')
  })

  it('filters by resource', () => {
    const result = filterTimesheets(all, { resourceNo: 'EMP002' })
    expect(result).toHaveLength(1)
    expect(result[0].header.resourceNo).toBe('EMP002')
  })

  it('returns all when no filter', () => {
    const result = filterTimesheets(all, {})
    expect(result).toHaveLength(2)
  })
})

// ──────────────────────────────────────────────
// 8. Week helpers
// ──────────────────────────────────────────────
describe('getWeekNumber', () => {
  it('returns a positive number', () => {
    const wn = getWeekNumber('2024-06-17')
    expect(wn).toBeGreaterThan(0)
    expect(wn).toBeLessThanOrEqual(53)
  })

  it('different weeks return different numbers', () => {
    const wn1 = getWeekNumber('2024-06-17')
    const wn2 = getWeekNumber('2024-06-24')
    expect(wn2).toBe(wn1 + 1)
  })
})

describe('getWeekRange', () => {
  it('returns start and end dates 7 days apart', () => {
    const { start, end } = getWeekRange(26, 2024)
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    expect(diff).toBe(6)
  })

  it('start is a Monday', () => {
    const { start } = getWeekRange(26, 2024)
    const d = new Date(start)
    expect(d.getUTCDay()).toBe(1) // Monday
  })
})

describe('getWeekDates', () => {
  it('returns 5 dates (Mon-Fri)', () => {
    const dates = getWeekDates(26, 2024)
    expect(dates).toHaveLength(5)
  })

  it('first date is a Monday', () => {
    const dates = getWeekDates(26, 2024)
    const d = new Date(dates[0])
    expect(d.getUTCDay()).toBe(1)
  })

  it('consecutive weeks have different dates', () => {
    const w26 = getWeekDates(26, 2024)
    const w27 = getWeekDates(27, 2024)
    expect(w26[0]).not.toBe(w27[0])
  })
})

// ──────────────────────────────────────────────
// 9. Helpers
// ──────────────────────────────────────────────
describe('formatDate', () => {
  it('formats ISO date to Italian locale', () => {
    const result = formatDate('2024-06-17')
    expect(result).toContain('giu')
    expect(result).toContain('2024')
  })
})

describe('generateId', () => {
  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})
