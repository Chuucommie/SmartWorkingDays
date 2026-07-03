import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computeOfficeOverlaps,
  computeFullOverlapMatrix,
  bcPlanToInternal,
  extractLocations,
  getTeamView,
} from './teamView.ts'
import type { TeamPlan, WeekPlan } from '../shared/config.ts'

// ── Helper ──
const w = (arr: string[]): WeekPlan => arr as unknown as WeekPlan

// ── Mock modules ──
vi.mock('../shared/planBackend.ts', () => ({
  fetchTeamPlans: vi.fn(),
}))

vi.mock('../shared/tursoAuth.ts', () => ({
  loadSession: vi.fn(),
}))

vi.mock('../shared/msAuth.ts', () => ({
  getCurrentUserProfile: vi.fn(),
}))

import { fetchTeamPlans } from '../shared/planBackend.ts'
import { loadSession } from '../shared/tursoAuth.ts'
import { getCurrentUserProfile } from '../shared/msAuth.ts'

const mockFetch = fetchTeamPlans as ReturnType<typeof vi.fn>
const mockLoadSession = loadSession as ReturnType<typeof vi.fn>
const mockGetProfile = getCurrentUserProfile as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Factory per TeamPlan ──
function plan(overrides: Partial<TeamPlan> = {}): TeamPlan {
  return {
    employeeId: 'usr_test123',
    employeeName: 'Test User',
    department: 'IT',
    locationCode: 'MILANO',
    week: w(['office', 'sw', 'sw', 'office', 'sw']),
    swDaysRequested: 2,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════
// getTeamView() — test con mock
// ═══════════════════════════════════════════════════════════

describe('getTeamView() — integrazione con backend mockato', () => {
  it('con sessione Turso: matcha myPlan tramite session.userId', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_test123',
      email: 'test@test.it',
      name: 'Test',
      department: 'IT',
      locationCode: 'MILANO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_test123', employeeName: 'Test User', department: 'IT', locationCode: 'MILANO' }),
      plan({ employeeId: 'usr_other', employeeName: 'Collega', department: 'IT', locationCode: 'MILANO' }),
    ])

    const result = await getTeamView('2026-06-29')

    expect(result.myPlan).not.toBeNull()
    expect(result.myPlan!.employeeId).toBe('usr_test123')
    expect(result.myPlan!.employeeName).toBe('Test User')
    expect(result.colleagues).toHaveLength(1)
    expect(result.colleagues[0].employeeId).toBe('usr_other')
    expect(result.department).toBe('IT')
    expect(result.location).toBe('MILANO')
  })

  it('con sessione Turso: myPlan = null se nessun piano matcha userId', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_ghost',
      email: 'ghost@test.it',
      name: 'Ghost',
      department: 'IT',
      locationCode: 'MILANO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_other', employeeName: 'Collega', department: 'IT', locationCode: 'MILANO' }),
    ])

    const result = await getTeamView('2026-06-29')

    expect(result.myPlan).toBeNull()
    expect(result.colleagues).toHaveLength(1)
    expect(result.colleagues[0].employeeId).toBe('usr_other')
  })

  it('filtra per dipartimento: esclude piani di altri dipartimenti', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_it',
      email: 'it@test.it',
      name: 'IT User',
      department: 'IT',
      locationCode: 'MILANO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_it', department: 'IT', locationCode: 'MILANO' }),
      plan({ employeeId: 'usr_labs', employeeName: 'Labs User', department: 'LABS', locationCode: 'MILANO' }),
      plan({ employeeId: 'usr_hr', employeeName: 'HR User', department: 'HR', locationCode: 'MILANO' }),
    ])

    const result = await getTeamView('2026-06-29')

    expect(result.myPlan).not.toBeNull()
    expect(result.colleagues).toHaveLength(0) // LABS e HR esclusi
  })

  it('filtra per sede: default = sede utente', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_tv',
      email: 'tv@test.it',
      name: 'TV User',
      department: 'IT',
      locationCode: 'TREVISO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_tv', department: 'IT', locationCode: 'TREVISO' }),
      plan({ employeeId: 'usr_mi', employeeName: 'MI User', department: 'IT', locationCode: 'MILANO' }),
      plan({ employeeId: 'usr_bo', employeeName: 'BO User', department: 'IT', locationCode: 'BOLOGNA' }),
    ])

    const result = await getTeamView('2026-06-29')

    expect(result.myPlan).not.toBeNull()
    expect(result.colleagues).toHaveLength(0) // solo TREVISO, gli altri esclusi
    expect(result.location).toBe('TREVISO')
  })

  it('locationFilter esplicito sovrascrive sede utente', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_tv',
      email: 'tv@test.it',
      name: 'TV User',
      department: 'IT',
      locationCode: 'TREVISO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_tv', department: 'IT', locationCode: 'TREVISO' }),
      plan({ employeeId: 'usr_mi', employeeName: 'MI User', department: 'IT', locationCode: 'MILANO' }),
    ])

    const result = await getTeamView('2026-06-29', 'MILANO')

    // myPlan è l'utente TV ma il filtro è MILANO → myPlan escluso dal filtro!
    // myPlan viene cercato tra TUTTI i teamPlans (già filtrati per dipartimento+sede)
    expect(result.myPlan).toBeNull()
    expect(result.colleagues).toHaveLength(1)
    expect(result.colleagues[0].employeeId).toBe('usr_mi')
    expect(result.location).toBe('MILANO')
  })

  it("locationFilter='ALL' mostra tutte le sedi del dipartimento", async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_tv',
      email: 'tv@test.it',
      name: 'TV User',
      department: 'IT',
      locationCode: 'TREVISO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_tv', department: 'IT', locationCode: 'TREVISO' }),
      plan({ employeeId: 'usr_mi', employeeName: 'MI User', department: 'IT', locationCode: 'MILANO' }),
      plan({ employeeId: 'usr_bo', employeeName: 'BO User', department: 'IT', locationCode: 'BOLOGNA' }),
    ])

    const result = await getTeamView('2026-06-29', 'ALL')

    expect(result.myPlan).not.toBeNull()
    expect(result.colleagues).toHaveLength(2)
    expect(result.location).toBe('Tutte')
    expect(result.allLocations).toEqual(['BOLOGNA', 'MILANO', 'TREVISO'])
  })

  it('allLocations contiene tutte le sedi (non filtrate)', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_tv',
      email: 'tv@test.it',
      name: 'TV User',
      department: 'IT',
      locationCode: 'TREVISO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_tv', department: 'IT', locationCode: 'TREVISO' }),
      plan({ employeeId: 'usr_mi', employeeName: 'MI User', department: 'IT', locationCode: 'MILANO' }),
    ])

    const result = await getTeamView('2026-06-29')

    // allLocations viene da TUTTI i piani (pre-filtro)
    expect(result.allLocations).toEqual(['MILANO', 'TREVISO'])
  })

  it('piani vuoti → myPlan null, colleghi vuoti', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_test',
      email: 'test@test.it',
      name: 'Test',
      department: 'IT',
      locationCode: 'MILANO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([])

    const result = await getTeamView('2026-06-29')

    expect(result.myPlan).toBeNull()
    expect(result.colleagues).toEqual([])
    expect(result.allLocations).toEqual([])
    expect(result.department).toBe('IT')
  })

  it('fallback a MSAL se nessuna sessione Turso', async () => {
    mockLoadSession.mockReturnValue(null)
    mockGetProfile.mockReturnValue({
      employeeId: 'EMP001',
      employeeName: 'Ricardo',
      department: 'IT',
      locationCode: 'TREVISO',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'EMP001', department: 'IT', locationCode: 'TREVISO' }),
      plan({ employeeId: 'EMP002', employeeName: 'Collega', department: 'IT', locationCode: 'TREVISO' }),
    ])

    const result = await getTeamView('2026-06-29')

    expect(result.myPlan).not.toBeNull()
    expect(result.myPlan!.employeeId).toBe('EMP001')
    expect(result.colleagues).toHaveLength(1)
    expect(result.department).toBe('IT')
    expect(result.location).toBe('TREVISO')
  })

  it('errore se nessuna sessione E nessun profilo MSAL', async () => {
    mockLoadSession.mockReturnValue(null)
    mockGetProfile.mockReturnValue(null)

    await expect(getTeamView('2026-06-29')).rejects.toThrow(
      'Utente non autenticato — impossibile determinare dipartimento e sede'
    )
  })

  it('session.department undefined → default IT', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_test',
      email: 'test@test.it',
      name: 'Test',
      department: undefined,
      locationCode: 'MILANO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_test', department: 'IT', locationCode: 'MILANO' }),
    ])

    const result = await getTeamView('2026-06-29')

    expect(result.department).toBe('IT')
    expect(result.myPlan).not.toBeNull()
  })

  it('session.locationCode undefined → default MILANO', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_test',
      email: 'test@test.it',
      name: 'Test',
      department: 'IT',
      locationCode: undefined,
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([
      plan({ employeeId: 'usr_test', department: 'IT', locationCode: 'MILANO' }),
    ])

    const result = await getTeamView('2026-06-29')

    expect(result.location).toBe('MILANO')
    expect(result.myPlan).not.toBeNull()
  })

  it('passa weekStart corretto a fetchTeamPlans', async () => {
    mockLoadSession.mockReturnValue({
      userId: 'usr_test',
      email: 'test@test.it',
      name: 'Test',
      department: 'IT',
      locationCode: 'MILANO',
      token: 'tok123',
    })
    mockFetch.mockResolvedValue([])

    await getTeamView('2026-07-06')

    expect(mockFetch).toHaveBeenCalledWith('2026-07-06')
  })
})

// ═══════════════════════════════════════════════════════════
// Test esistenti (funzioni pure)
// ═══════════════════════════════════════════════════════════

describe('teamView — funzioni pure', () => {
  describe('extractLocations()', () => {
    it('estrai sedi uniche da array di piani', () => {
      const plans = [
        plan({ locationCode: 'TREVISO' }),
        plan({ locationCode: 'BOLOGNA' }),
        plan({ locationCode: 'TREVISO' }),
        plan({ locationCode: 'MILANO' }),
      ]
      const locs = extractLocations(plans)
      expect(locs).toEqual(['BOLOGNA', 'MILANO', 'TREVISO'])
    })

    it('ritorna array vuoto per input vuoto', () => {
      expect(extractLocations([])).toEqual([])
    })

    it('gestisce locationCode mancanti', () => {
      const plans = [
        plan({ locationCode: 'TREVISO' }),
        plan({ locationCode: '' }),
        plan({ locationCode: undefined as any }),
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
      const myPlan = plan({ week: w(['sw', 'sw', 'sw', 'sw', 'sw']) })
      const colleagues = [
        plan({ employeeName: 'Mario', week: w(['office', 'office', 'office', 'sw', 'sw']) }),
      ]
      const result = computeOfficeOverlaps(myPlan, colleagues)
      expect(result).toEqual({})
    })

    it('ritorna overlaps corretti per giorni office', () => {
      const myPlan = plan({ week: w(['office', 'office', 'sw', 'sw', 'sw']) })
      const colleagues = [
        plan({ employeeName: 'Mario', week: w(['office', 'office', 'office', 'sw', 'sw']) }),
        plan({ employeeName: 'Anna', week: w(['sw', 'office', 'office', 'office', 'office']) }),
      ]
      const result = computeOfficeOverlaps(myPlan, colleagues)
      expect(result[0]).toEqual(['Mario'])
      expect(result[1]).toEqual(['Mario', 'Anna'])
      expect(result[2]).toBeUndefined()
      expect(result[3]).toBeUndefined()
      expect(result[4]).toBeUndefined()
    })

    it('gestisce colleagues = []', () => {
      const myPlan = plan({ week: w(['office', 'office', 'sw', 'sw', 'sw']) })
      const result = computeOfficeOverlaps(myPlan, [])
      expect(result).toEqual({})
    })

    it('gestisce colleague senza week', () => {
      const myPlan = plan({ week: w(['office', 'sw', 'sw', 'sw', 'sw']) })
      const colleagues = [
        plan({ employeeName: 'Mario', week: null as any }),
        plan({ employeeName: 'Anna', week: w(['office', 'sw', 'sw', 'sw', 'sw']) }),
      ]
      const result = computeOfficeOverlaps(myPlan, colleagues)
      expect(result[0]).toEqual(['Anna'])
    })
  })

  describe('computeFullOverlapMatrix()', () => {
    it('matrice 5×N corretta', () => {
      const myPlan = plan({ week: w(['office', 'office', 'sw', 'sw', 'sw']) })
      const colleagues = [
        plan({ employeeName: 'Mario', week: w(['office', 'sw', 'sw', 'sw', 'sw']) }),
        plan({ employeeName: 'Anna', week: w(['sw', 'office', 'sw', 'sw', 'sw']) }),
      ]
      const matrix = computeFullOverlapMatrix(myPlan, colleagues)
      expect(matrix).toHaveLength(5)
      expect(matrix[0]).toHaveLength(2)
      expect(matrix[0][0]).toBe(true)
      expect(matrix[0][1]).toBe(false)
      expect(matrix[1][0]).toBe(false)
      expect(matrix[1][1]).toBe(true)
      for (let day = 2; day < 5; day++) {
        expect(matrix[day].every(v => v === false)).toBe(true)
      }
    })

    it('tutti false se myPlan null', () => {
      const matrix = computeFullOverlapMatrix(null, [
        plan({ employeeName: 'Mario', week: w(['office', 'office', 'office', 'sw', 'sw']) }),
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
      expect(result).not.toBeNull()
      expect(result!.week).toEqual(['sw', 'office', 'free', 'absent', 'sw'])
      expect(result!.employeeId).toBe('EMP001')
      expect(result!.swDaysRequested).toBe(3)
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
      expect(result).not.toBeNull()
      expect(result!.week[0]).toBe('free')
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
      expect(result).not.toBeNull()
      expect(result!.employeeName).toBe('Ricardo Quintero')
    })

    it('usa employeeNo come fallback per employeeId', () => {
      const bcPlan = {
        employeeNo: 'EMP002',
        monday: 'Free', tuesday: 'Free', wednesday: 'Free', thursday: 'Free', friday: 'Free',
      }
      const result = bcPlanToInternal(bcPlan)
      expect(result).not.toBeNull()
      expect(result!.employeeId).toBe('EMP002')
    })
  })
})
