import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { computeTotal } from '../booking'

describe('computeTotal()', () => {
  /**
   * Property 3: Booking total equals sum of service prices
   * For any array of services with positive prices, computeTotal(services) === sum of prices.
   * Validates: Design §5 — createBooking() Step 2
   */
  it('Property 3: total equals sum of service prices', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ price: fc.integer({ min: 1, max: 10000 }) }), { minLength: 1 }),
        (services) => {
          const total = computeTotal(services)
          const expected = services.reduce((sum, s) => sum + s.price, 0)
          expect(total).toBe(expected)
        }
      )
    )
  })

  /**
   * Property 4: Total is always non-negative
   * Result never goes below 0 for any non-negative service prices.
   * Validates: Design §5 — createBooking() Step 2
   */
  it('Property 4: total is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ price: fc.integer({ min: 0, max: 50000 }) }), { minLength: 0 }),
        (services) => {
          expect(computeTotal(services)).toBeGreaterThanOrEqual(0)
        }
      )
    )
  })

  it('returns 0 for empty services array', () => {
    expect(computeTotal([])).toBe(0)
  })
})
