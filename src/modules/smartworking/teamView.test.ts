import { describe, it, expect } from 'vitest'
import {
  computeOfficeOverlaps,
  computeFullOverlapMatrix,
  bcPlanToInternal,
  extractLocations,
} from './teamView.ts'

describe('teamView', () => {
  describe('extractLocations()', () => {
    it('estrai sedi uniche da array di piani', () => {
      const plans = [
        { locationCode: 'TREVISO' },
        { locationCode: 'BOLOGNA' },
        { locationCode: 'TREVISO' },
        { locationCode: 'MILANO' },
      ]
      const locs = extractLocations(plans)
      expect(locs).toEqual(['BOLOGNA', 'MILANO', 'TREVISO'])
    })

    it('ritorna array vuoto per input vuoto', () => {
      expect(extractLocations([])).toEqual([])
    })

    it('gestisce locationCode mancanti', () => {
      const plans = [
        { locationCode: 'TREVISO' },
        { locationCode: '' },
        {},
      ]
      const locs = extractLocations(plans)
      expect(locs).toEqual(['TREVISO'])
    })
  })
  describe('computeOfficeOverlaps()', () => {
    it('ritorna {} se myPlan è null', () => {
      const result = computeOfficeOverlaps(null, [])
      expect(result).toEqual({})
    })

    it('ritorna {} se myPlan non ha giorni office', () => {
      const myPlan = { week: ['sw', 'sw', 'sw', 'sw', 'sw'] }
      const colleagues = [
        { employeeName: 'Mario', week: ['office', 'office', 'office', 'sw', 'sw'] }
      ]
      const result = computeOfficeOverlaps(myPlan, colleagues)
      expect(result).toEqual({})
    })

    it('ritorna overlaps corretti per giorni office', () => {
      const myPlan = { week: ['office', 'office', 'sw', 'sw', 'sw'] }
      const colleagues = [
        { employeeName: 'Mario', week: ['office', 'office', 'office', 'sw', 'sw'] },
        { employeeName: 'Anna', week: ['sw', 'office', 'office', 'office', 'office'] },
      ]
      const result = computeOfficeOverlaps(myPlan, colleagues)
      // Giorno 0 (Lun): myPlan=office, Mario=office, Anna=sw → solo Mario
      expect(result[0]).toEqual(['Mario'])
      // Giorno 1 (Mar): myPlan=office, Mario=office, Anna=office → entrambi
      expect(result[1]).toEqual(['Mario', 'Anna'])
      // Giorni 2-4: myPlan non è office → nessuna chiave
      expect(result[2]).toBeUndefined()
      expect(result[3]).toBeUndefined()
      expect(result[4]).toBeUndefined()
    })

    it('gestisce colleagues = []', () => {
      const myPlan = { week: ['office', 'office', 'sw', 'sw', 'sw'] }
      const result = computeOfficeOverlaps(myPlan, [])
      expect(result).toEqual({})
    })

    it('gestisce colleague senza week', () => {
      const myPlan = { week: ['office', 'sw', 'sw', 'sw', 'sw'] }
      const colleagues = [
        { employeeName: 'Mario', week: null },
        { employeeName: 'Anna', week: ['office', 'sw', 'sw', 'sw', 'sw'] },
      ]
      const result = computeOfficeOverlaps(myPlan, colleagues)
      expect(result[0]).toEqual(['Anna']) // Mario ignorato (week null)
    })
  })

  describe('computeFullOverlapMatrix()', () => {
    it('matrice 5×N corretta', () => {
      const myPlan = { week: ['office', 'office', 'sw', 'sw', 'sw'] }
      const colleagues = [
        { employeeName: 'Mario', week: ['office', 'sw', 'sw', 'sw', 'sw'] },
        { employeeName: 'Anna', week: ['sw', 'office', 'sw', 'sw', 'sw'] },
      ]
      const matrix = computeFullOverlapMatrix(myPlan, colleagues)
      expect(matrix).toHaveLength(5)
      expect(matrix[0]).toHaveLength(2)
      // Giorno 0: myPlan=office, Mario=office → true, Anna=sw → false
      expect(matrix[0][0]).toBe(true)
      expect(matrix[0][1]).toBe(false)
      // Giorno 1: myPlan=office, Mario=sw → false, Anna=office → true
      expect(matrix[1][0]).toBe(false)
      expect(matrix[1][1]).toBe(true)
      // Giorni 2-4: myPlan non office → tutti false
      for (let day = 2; day < 5; day++) {
        expect(matrix[day].every(v => v === false)).toBe(true)
      }
    })

    it('tutti false se myPlan null', () => {
      const matrix = computeFullOverlapMatrix(null, [
        { employeeName: 'Mario', week: ['office', 'office', 'office', 'sw', 'sw'] }
      ])
      for (let day = 0; day < 5; day++) {
        expect(matrix[day].every(v => v === false)).toBe(true)
      }
    })
  })

  describe('bcPlanToInternal()', () => {
    it('converte tutti i day type correttamente', () => {
      const bcPlan = {
        employeeId: 'EMP001',
        employeeName: 'Ricardo Quintero',
        department: 'IT',
        locationCode: 'MILANO',
        monday: 'SmartWorking',
        tuesday: 'Office',
        wednesday: 'Free',
        thursday: 'Absent',
        friday: 'SmartWorking',
        swDaysRequested: 3,
      }
      const result = bcPlanToInternal(bcPlan)
      expect(result.week).toEqual(['sw', 'office', 'free', 'absent', 'sw'])
      expect(result.employeeId).toBe('EMP001')
      expect(result.swDaysRequested).toBe(3)
    })

    it('giorno non mappato → free (default sicuro)', () => {
      const bcPlan = {
        employeeId: 'EMP001',
        monday: 'UnknownValue',
        tuesday: 'Office',
        wednesday: 'Free',
        thursday: 'Free',
        friday: 'Free',
      }
      const result = bcPlanToInternal(bcPlan)
      expect(result.week[0]).toBe('free')
    })

    it('ritorna null se input null', () => {
      expect(bcPlanToInternal(null)).toBeNull()
    })

    it('costruisce employeeName da employee.firstName + lastName', () => {
      const bcPlan = {
        employeeId: 'EMP001',
        employee: { firstName: 'Ricardo', lastName: 'Quintero' },
        monday: 'Free', tuesday: 'Free', wednesday: 'Free', thursday: 'Free', friday: 'Free',
      }
      const result = bcPlanToInternal(bcPlan)
      expect(result.employeeName).toBe('Ricardo Quintero')
    })

    it('usa employeeNo come fallback per employeeId', () => {
      const bcPlan = {
        employeeNo: 'EMP002',
        monday: 'Free', tuesday: 'Free', wednesday: 'Free', thursday: 'Free', friday: 'Free',
      }
      const result = bcPlanToInternal(bcPlan)
      expect(result.employeeId).toBe('EMP002')
    })
  })
})
