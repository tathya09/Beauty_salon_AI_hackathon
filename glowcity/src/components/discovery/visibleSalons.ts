import type { Salon } from '@/types'

let _visibleSalons: Salon[] = []
const listeners = new Set<() => void>()

export function setVisibleSalons(salons: Salon[]) {
  _visibleSalons = salons
  listeners.forEach((listener) => listener())
}

export function subscribeVisibleSalons(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getVisibleSalons() {
  return _visibleSalons
}
