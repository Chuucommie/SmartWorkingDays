// ──────────────────────────────────────────────
// Bridge SmartWorking → Timesheet
// ──────────────────────────────────────────────
// Stato condiviso: timesheet rilasciati da SW
// ──────────────────────────────────────────────

import type { Timesheet } from '../timesheet/timesheetTypes.ts'

/** Timesheet rilasciati dallo Smart Working (in attesa di approvazione) */
let releasedTimesheets: Timesheet[] = []

/** Listener per nuovi timesheet */
const listeners = new Set<() => void>()

export function getReleasedTimesheets(): Timesheet[] {
  return [...releasedTimesheets]
}

export function addReleasedTimesheet(ts: Timesheet): void {
  releasedTimesheets = [...releasedTimesheets, ts]
  for (const fn of listeners) fn()
}

export function removeReleasedTimesheet(id: string): void {
  releasedTimesheets = releasedTimesheets.filter(t => t.header.id !== id)
  for (const fn of listeners) fn()
}

export function onTimesheetReleased(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
