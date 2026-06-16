import { Timestamp } from 'firebase/firestore'

// ── Supporting Types ──────────────────────────────────────────────
export type ServiceCategory = 'hair' | 'skin' | 'nails' | 'bridal' | 'grooming' | 'spa'
export type PriceRange = 'budget' | 'mid' | 'luxury'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'
export type UserRole = 'customer' | 'salon_owner' | 'admin'
export type PromotionType = 'instagram' | 'whatsapp' | 'website'

// Nail service sub-types for granular filtering
export type NailSubType =
  | 'gel-nails'
  | 'soft-gel'
  | 'hard-gel'
  | 'acrylic-nails'
  | 'nail-art'
  | 'manicure'
  | 'pedicure'
  | 'chrome-nails'
  | 'ombre-nails'
  | 'bridal-nails'

export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface WeeklyHours {
  [day: string]: { open: string; close: string; closed: boolean }
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  lastVisible?: unknown
}

// ── Domain Models ────────────────────────────────────────────────
export interface Service {
  id: string
  name: string
  category: ServiceCategory
  duration: number // minutes
  price: number    // INR
  description: string
}

export interface Salon {
  id: string
  name: string
  slug: string
  city: string
  area: string
  coordinates: GeoPoint
  coverImage: string
  gallery: string[]
  services: Service[]
  priceRange: PriceRange
  rating: number
  reviewCount: number
  tags: string[]
  embedding?: number[]
  isVerified: boolean
  ownerId: string
  openingHours: WeeklyHours
  createdAt: Timestamp
}

export interface TimeSlot {
  date: string      // ISO "YYYY-MM-DD"
  startTime: string // "HH:mm"
  endTime: string   // "HH:mm"
  isAvailable: boolean
}

export interface Booking {
  id: string
  userId: string
  salonId: string
  serviceIds: string[]
  slot: TimeSlot
  status: BookingStatus
  totalAmount: number
  paymentStatus: PaymentStatus
  paymentOrderId?: string
  aiRecommended: boolean
  createdAt: Timestamp
}

export interface StyleProfile {
  inspirationImageUrls: string[]
  extractedTags: string[]
  lastUpdated: Timestamp
}

export interface User {
  uid: string
  displayName: string
  email: string
  phone?: string
  photoURL?: string
  role: UserRole
  favoritesSalonIds: string[]
  bookingHistory: string[]
  stylePreferences?: StyleProfile
  createdAt: Timestamp
}

// ── AI Interfaces ─────────────────────────────────────────────────
export interface BookingIntent {
  service?: string
  area?: string
  budget?: number
  date?: string
  priceRange?: PriceRange
}

export interface SalonCard {
  salonId: string
  name: string
  area: string
  rating: number
  priceRange: PriceRange
  matchScore: number
  coverImage: string
  relevantService: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  salonCards?: SalonCard[]
  timestamp: number
}

export interface ChatSession {
  id: string
  userId?: string
  messages: ChatMessage[]
  extractedIntent?: BookingIntent
}

export interface StyleMatchResult {
  extractedTags: string[]
  recommendedSalons: SalonCard[]
  confidenceScore: number
  description: string
}

// ── Firestore Document Shapes ─────────────────────────────────────
export type SalonDoc = Omit<Salon, 'services'> & {
  geohash: string
  serviceCount: number
  updatedAt: Timestamp
}

export type ServiceDoc = Service & {
  salonId: string
  isActive: boolean
}

export type BookingDoc = Booking & {
  salonName: string
  serviceName: string
  userEmail: string
}

export type SlotDoc = TimeSlot & {
  salonId: string
  bookedByUserId?: string
  bookingId?: string
  lockedUntil?: Timestamp
}

// ── Search / API Types ────────────────────────────────────────────
export interface SearchFilters {
  city?: string
  area?: string
  priceRange?: PriceRange[]
  categories?: ServiceCategory[]
  nailSubTypes?: NailSubType[]
  minRating?: number
  maxPrice?: number
  tags?: string[]
}

export interface PaginationParams {
  limit: number
  offset?: number
  lastVisible?: unknown
}
