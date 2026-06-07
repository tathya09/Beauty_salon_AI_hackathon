import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { generateSlots, timeToMinutes } from '../slots'
import type { WeeklyHours } from '@/types'

const DEFAULT_HOURS: WeeklyHours = {
  monday: { open: '09:00', close: '20:00', closed: false },
  tuesday: { open: '09:00', close: '20:00', closed: false },
  wednesday: { open: '09:00', close: '20:00', closed: false },
  thursday: { open: '09:00', close: '20:00', closed: false },
  friday: { open: '09:00', close: '20:00', closed: false },
  saturday: { open: '09:00', close: '20:00', closed: false },
  sunday: { open: '10:00', close: '18:00', closed: false },
}

describe('generateSlots()', () => {
  /**
   * Property 1: Non-overlapping slots
   * For any valid serviceDuration (15–120 min), no two generated slots overlap.
   * Validates: Design §5 — generateSlots() Loop Invariants
   */
  it('Property 1: no two slots overlap', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 15, max: 120 }),
        fc.constantFrom('2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14'),
        (duration, date) => {
          const slots = generateSlots('salon1', date, duration, DEFAULT_HOURS)
          for (let i = 0; i < slots.length - 1; i++) {
            expect(timeToMinutes(slots[i].endTime)).toBeLessThanOrEqual(
              timeToMinutes(slots[i + 1].startTime)
            )
          }
        }
      )
    )
  })

  /**
   * Property 2: Chronological ordering
   * Slots are always sorted by startTime ascending.
   * Validates: Design §5 — generateSlots() Postconditions
   */
  it('Property 2: slots are sorted chronologically', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 15, max: 120 }),
        fc.constantFrom('2026-06-09', '2026-06-10', '2026-06-11'),
        (duration, date) => {
          const slots = generateSlots('salon1', date, duration, DEFAULT_HOURS)
          for (let i = 0; i < slots.length - 1; i++) {
            expect(timeToMinutes(slots[i].startTime)).toBeLessThan(
              timeToMinutes(slots[i + 1].startTime)
            )
          }
        }
      )
    )
  })

  it('returns empty array for closed day', () => {
    const closedHours: WeeklyHours = {
      monday: { open: '09:00', close: '20:00', closed: true },
    }
    const slots = generateSlots('s1', '2026-06-08', 60, closedHours)
    expect(slots).toHaveLength(0)
  })
})
