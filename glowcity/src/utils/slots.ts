import { TimeSlot, WeeklyHours } from '@/types'

/**
 * Generates non-overlapping, chronologically sorted TimeSlots for a given salon day.
 * Preconditions: date is ISO "YYYY-MM-DD", serviceDuration > 0, openingHours has the day
 * Postconditions: slots are non-overlapping and sorted by startTime
 */
export function generateSlots(
  salonId: string,
  date: string,
  serviceDuration: number,
  openingHours: WeeklyHours,
  bookedStartTimes: string[] = []
): TimeSlot[] {
  const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  const dayHours = openingHours[dayName]

  if (!dayHours || dayHours.closed) return []

  const slots: TimeSlot[] = []
  let current = timeToMinutes(dayHours.open)
  const close = timeToMinutes(dayHours.close)

  // Loop invariant: all slots in `slots` are non-overlapping with each other
  while (current + serviceDuration <= close) {
    const startTime = minutesToTime(current)
    const endTime = minutesToTime(current + serviceDuration)
    slots.push({
      date,
      startTime,
      endTime,
      isAvailable: !bookedStartTimes.includes(startTime),
    })
    current += serviceDuration
  }

  return slots
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
