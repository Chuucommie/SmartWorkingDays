import { describe, it, expect } from 'vitest'
import {
  createEmptyTimesheet,
  addEmptyLine,
  updateLine,
  removeLine,
  changeStatus,
  computeStats,
  computeTotalHours,
  computeTotalCost,
  validateTimesheet,
  filterTimesheets,
  getWeekNumber,
  getWeekRange,
  formatDate,
  formatCurrency,
  generateId,
} from './timesheetEngine.ts'
import type { Timesheet, TimesheetLine } from './timesheetTypes.ts'

// ──────────────────────────────────────────────
// 1. Factory functions
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

  it('generates a unique ID', () => {
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
  it('adds a line with correct lineNo', () => {
    const ts = createEmptyTimesheet('EMP001', 'Test')
    const withLine = addEmptyLine(ts)
    expect(withLine.lines).toHaveLength(1)
    expect(withLine.lines[0].lineNo).toBe(1)
    expect(withLine.lines[0].type).toBe('Resource')
    expect(withLine.lines[0].chargeable).toBe(true)
  })

  it('increments lineNo for subsequent lines', () => {
    let ts = createEmptyTimesheet('EMP001', 'Test')
    ts = addEmptyLine(ts)
    ts = addEmptyLine(ts)
    ts = addEmptyLine(ts)
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
  it('updates line fields and recalculates totalCost', () => {
    let ts = createEmptyTimesheet('EMP001', 'Test')
    ts = addEmptyLine(ts)
    const lineId = ts.lines[0].id

    ts = updateLine(ts, lineId, { quantity: 8, unitCost: 50 })
    expect(ts.lines[0].quantity).toBe(8)
    expect(ts.lines[0].unitCost).toBe(50)
    expect(ts.lines[0].totalCost).toBe(400)
  })

  it('does not modify other lines', () => {
    let ts = createEmptyTimesheet('EMP001', 'Test')
    ts = addEmptyLine(ts)
    ts = addEmptyLine(ts)
    const line1Id = ts.lines[0].id

    ts = updateLine(ts, line1Id, { description: 'Updated' })
    expect(ts.lines[0].description).toBe('Updated')
    expect(ts.lines[1].description).toBe('')
  })
})

describe('removeLine', () => {
  it('removes a line and renumbers remaining', () => {
    let ts = createEmptyTimesheet('EMP001', 'Test')
    ts = addEmptyLine(ts)
    ts = addEmptyLine(ts)
    ts = addEmptyLine(ts)
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
  it('changes status from Open to Pending Approval', () => {
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
      { id: '1', timesheetId: 'ts1', lineNo: 1, type: 'Resource', no: 'R1', description: 'A', quantity: 8, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 400, chargeable: true },
      { id: '2', timesheetId: 'ts1', lineNo: 2, type: 'Resource', no: 'R1', description: 'B', quantity: 4, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 200, chargeable: true },
    ]
    expect(computeTotalHours(lines)).toBe(12)
  })

  it('returns 0 for empty lines', () => {
    expect(computeTotalHours([])).toBe(0)
  })
})

describe('computeTotalCost', () => {
  it('sums all line totalCosts', () => {
    const lines: TimesheetLine[] = [
      { id: '1', timesheetId: 'ts1', lineNo: 1, type: 'Resource', no: 'R1', description: 'A', quantity: 8, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 400, chargeable: true },
      { id: '2', timesheetId: 'ts1', lineNo: 2, type: 'Resource', no: 'R1', description: 'B', quantity: 4, unitOfMeasure: 'Hours', unitCost: 75, totalCost: 300, chargeable: false },
    ]
    expect(computeTotalCost(lines)).toBe(700)
  })
})

describe('computeStats', () => {
  it('computes correct statistics', () => {
    const ts = createEmptyTimesheet('EMP001', 'Test')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: 'Dev', quantity: 8, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 400, chargeable: true, workType: 'Billable', jobNo: 'JOB-1', date: '2024-06-17' },
      { id: '2', timesheetId: ts.header.id, lineNo: 2, type: 'Resource', no: 'R1', description: 'Docs', quantity: 4, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 200, chargeable: false, workType: 'Non-Billable', date: '2024-06-17' },
      { id: '3', timesheetId: ts.header.id, lineNo: 3, type: 'Resource', no: 'R1', description: 'Test', quantity: 6, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 300, chargeable: true, workType: 'Billable', jobNo: 'JOB-2', date: '2024-06-18' },
    ]

    const stats = computeStats(ts)
    expect(stats.totalHours).toBe(18)
    expect(stats.totalCost).toBe(900)
    expect(stats.billableHours).toBe(14)
    expect(stats.nonBillableHours).toBe(4)
    expect(stats.byWorkType['Billable'].hours).toBe(14)
    expect(stats.byWorkType['Non-Billable'].hours).toBe(4)
    expect(stats.byJob['JOB-1'].hours).toBe(8)
    expect(stats.byJob['JOB-2'].hours).toBe(6)
    expect(stats.byDay['2024-06-17']).toBe(12)
    expect(stats.byDay['2024-06-18']).toBe(6)
  })
})

// ──────────────────────────────────────────────
// 5. Validation
// ──────────────────────────────────────────────
describe('validateTimesheet', () => {
  it('valid timesheet passes', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: 'Work', quantity: 8, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 400, chargeable: true },
    ]
    const result = validateTimesheet(ts)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects missing resource name', () => {
    const ts = createEmptyTimesheet('', '')
    const result = validateTimesheet(ts)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Resource'))).toBe(true)
  })

  it('detects zero quantity', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: 'Work', quantity: 0, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 0, chargeable: true },
    ]
    const result = validateTimesheet(ts)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('quantità'))).toBe(true)
  })

  it('detects missing description', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: '', quantity: 8, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 400, chargeable: true },
    ]
    const result = validateTimesheet(ts)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('descrizione'))).toBe(true)
  })

  it('warns on high daily hours', () => {
    const ts = createEmptyTimesheet('EMP001', 'Ricardo')
    ts.lines = [
      { id: '1', timesheetId: ts.header.id, lineNo: 1, type: 'Resource', no: 'R1', description: 'Work', quantity: 25, unitOfMeasure: 'Hours', unitCost: 50, totalCost: 1250, chargeable: true },
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
// 6. Filters
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
// 7. Helpers
// ──────────────────────────────────────────────
describe('formatDate', () => {
  it('formats ISO date to Italian locale', () => {
    const result = formatDate('2024-06-17')
    expect(result).toContain('giu')
    expect(result).toContain('2024')
  })
})

describe('formatCurrency', () => {
  it('formats number as Euro', () => {
    expect(formatCurrency(123.45)).toBe('€ 123.45')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('€ 0.00')
  })
})

describe('getWeekNumber', () => {
  it('returns a positive number', () => {
    const wn = getWeekNumber('2024-06-17')
    expect(wn).toBeGreaterThan(0)
    expect(wn).toBeLessThanOrEqual(53)
  })
})

describe('getWeekRange', () => {
  it('returns start and end dates 7 days apart', () => {
    const { start, end } = getWeekRange(25, 2024)
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    expect(diff).toBe(6)
  })
})

describe('generateId', () => {
  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})
