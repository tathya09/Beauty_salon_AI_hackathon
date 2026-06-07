import { Service } from '@/types'

/**
 * Computes total price from selected services.
 * Property: result === services.reduce((sum, s) => sum + s.price, 0)
 * Property: result >= 0 always
 */
export function computeTotal(services: Pick<Service, 'price'>[]): number {
  return services.reduce((sum, s) => sum + s.price, 0)
}

/** Convert INR amount to Razorpay paise (multiply by 100) */
export function toPaise(amount: number): number {
  return Math.round(amount * 100)
}
