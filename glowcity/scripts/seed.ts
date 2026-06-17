// scripts/seed.ts
// Run with: npm run seed
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { encodeGeohash } from '../src/utils/geohash'
import { generateSlots } from '../src/utils/slots'
import type { SalonDoc, ServiceDoc, SlotDoc, WeeklyHours } from '../src/types'
import * as fs from 'fs'
import * as path from 'path'

// Load credentials: prefer service account JSON file, fallback to env vars
function getCredential(): ServiceAccount {
  // Look for service account JSON in common locations
  const possiblePaths = [
    path.resolve(__dirname, '../service-account.json'),
    path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS || '__none__'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('📄 Using service account file:', p)
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as ServiceAccount
    }
  }

  // Fallback to env vars
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim()

  console.log('🔑 Project ID from env:', projectId)
  console.log('🔑 Private key length:', privateKey.length)

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(`Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local`)
  }

  return { projectId, clientEmail, privateKey }
}

// Initialize
const app = initializeApp({ credential: cert(getCredential()) })
const db = getFirestore(app, '(default)')

const DEFAULT_HOURS: WeeklyHours = {
  monday: { open: '09:00', close: '20:00', closed: false },
  tuesday: { open: '09:00', close: '20:00', closed: false },
  wednesday: { open: '09:00', close: '20:00', closed: false },
  thursday: { open: '09:00', close: '20:00', closed: false },
  friday: { open: '09:00', close: '20:00', closed: false },
  saturday: { open: '09:00', close: '22:00', closed: false },
  sunday: { open: '10:00', close: '18:00', closed: false },
}

const SALONS = [
  {
    id: 'salon-001', name: 'Glow Studio Bandra', slug: 'glow-studio-bandra',
    area: 'Bandra West', coordinates: { latitude: 19.0596, longitude: 72.8295 },
    priceRange: 'mid' as const, rating: 4.7, reviewCount: 234,
    tags: ['hair-color', 'balayage', 'keratin', 'bridal'],
    coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    gallery: [],
    services: [
      { id: 'svc-001-1', name: 'Balayage', category: 'hair' as const, duration: 120, price: 3500, description: 'Sun-kissed balayage technique' },
      { id: 'svc-001-2', name: 'Keratin Treatment', category: 'hair' as const, duration: 90, price: 4000, description: 'Frizz-free keratin smoothing' },
      { id: 'svc-001-3', name: 'Bridal Makeup', category: 'bridal' as const, duration: 180, price: 8000, description: 'Complete bridal look with trial' },
    ],
  },
  {
    id: 'salon-002', name: 'Luxe Hair Andheri', slug: 'luxe-hair-andheri',
    area: 'Andheri West', coordinates: { latitude: 19.1136, longitude: 72.8697 },
    priceRange: 'luxury' as const, rating: 4.9, reviewCount: 412,
    tags: ['luxury', 'hair-spa', 'ombre', 'extensions'],
    coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    gallery: [],
    services: [
      { id: 'svc-002-1', name: 'Hair Extensions', category: 'hair' as const, duration: 240, price: 12000, description: 'Premium clip-in extensions' },
      { id: 'svc-002-2', name: 'Hair Spa', category: 'hair' as const, duration: 60, price: 1500, description: 'Deep conditioning spa treatment' },
      { id: 'svc-002-3', name: 'Ombre Coloring', category: 'hair' as const, duration: 150, price: 5000, description: 'Gradient ombre effect' },
    ],
  },
  {
    id: 'salon-003', name: 'Blush Beauty Juhu', slug: 'blush-beauty-juhu',
    area: 'Juhu', coordinates: { latitude: 19.1075, longitude: 72.8263 },
    priceRange: 'mid' as const, rating: 4.5, reviewCount: 187,
    tags: ['skin', 'facial', 'cleanup', 'waxing'],
    coverImage: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
    gallery: [],
    services: [
      { id: 'svc-003-1', name: 'Gold Facial', category: 'skin' as const, duration: 60, price: 1200, description: 'Anti-aging gold facial' },
      { id: 'svc-003-2', name: 'Full Body Wax', category: 'skin' as const, duration: 90, price: 800, description: 'Smooth full body waxing' },
      { id: 'svc-003-3', name: 'Clean-up', category: 'skin' as const, duration: 45, price: 500, description: 'Basic skin clean-up' },
    ],
  },
  {
    id: 'salon-004', name: 'The Nail Lounge Colaba', slug: 'nail-lounge-colaba',
    area: 'Colaba', coordinates: { latitude: 18.9067, longitude: 72.8147 },
    priceRange: 'mid' as const, rating: 4.6, reviewCount: 320,
    tags: ['nails', 'gel-nails', 'nail-art', 'manicure', 'soft-gel', 'pedicure'],
    coverImage: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    gallery: [],
    services: [
      { id: 'svc-004-1', name: 'Gel Manicure', category: 'nails' as const, duration: 45, price: 800, description: 'Long-lasting gel polish manicure' },
      { id: 'svc-004-2', name: 'Soft Gel Extensions', category: 'nails' as const, duration: 90, price: 1800, description: 'Natural-looking soft gel nail extensions' },
      { id: 'svc-004-3', name: 'Nail Art (per nail)', category: 'nails' as const, duration: 60, price: 600, description: 'Custom nail art designs' },
      { id: 'svc-004-4', name: 'Pedicure', category: 'nails' as const, duration: 45, price: 700, description: 'Relaxing foot pedicure' },
    ],
  },
  {
    id: 'salon-005', name: 'Swagger Grooming Powai', slug: 'swagger-grooming-powai',
    area: 'Powai', coordinates: { latitude: 19.1197, longitude: 72.9051 },
    priceRange: 'budget' as const, rating: 4.4, reviewCount: 156,
    tags: ['grooming', 'haircut', 'beard', 'mens'],
    coverImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
    gallery: [],
    services: [
      { id: 'svc-005-1', name: 'Haircut & Style', category: 'grooming' as const, duration: 30, price: 400, description: "Professional men's haircut" },
      { id: 'svc-005-2', name: 'Beard Trim', category: 'grooming' as const, duration: 20, price: 200, description: 'Precision beard shaping' },
      { id: 'svc-005-3', name: 'Head Massage', category: 'spa' as const, duration: 30, price: 300, description: 'Relaxing scalp massage' },
    ],
  },
  {
    id: 'salon-006', name: 'Aura Bridal Studio Bandra', slug: 'aura-bridal-bandra',
    area: 'Bandra East', coordinates: { latitude: 19.0544, longitude: 72.8407 },
    priceRange: 'luxury' as const, rating: 4.8, reviewCount: 98,
    tags: ['bridal', 'mehendi', 'makeup', 'draping'],
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    gallery: [],
    services: [
      { id: 'svc-006-1', name: 'Bridal Package', category: 'bridal' as const, duration: 300, price: 25000, description: 'Complete bridal package with trial' },
      { id: 'svc-006-2', name: 'Mehendi Design', category: 'bridal' as const, duration: 120, price: 3000, description: 'Intricate bridal mehendi' },
    ],
  },
  {
    id: 'salon-007', name: 'Glow Up Versova', slug: 'glow-up-versova',
    area: 'Versova', coordinates: { latitude: 19.1300, longitude: 72.8185 },
    priceRange: 'budget' as const, rating: 4.3, reviewCount: 89,
    tags: ['hair-color', 'highlights', 'hair-spa', 'waxing'],
    coverImage: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800',
    gallery: [],
    services: [
      { id: 'svc-007-1', name: 'Global Hair Color', category: 'hair' as const, duration: 90, price: 1500, description: 'Full head global color' },
      { id: 'svc-007-2', name: 'Highlights', category: 'hair' as const, duration: 120, price: 2000, description: 'Foil highlights' },
    ],
  },
  {
    id: 'salon-008', name: 'Serenity Spa Malad', slug: 'serenity-spa-malad',
    area: 'Malad West', coordinates: { latitude: 19.1871, longitude: 72.8481 },
    priceRange: 'mid' as const, rating: 4.5, reviewCount: 201,
    tags: ['spa', 'massage', 'facial', 'skin'],
    coverImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    gallery: [],
    services: [
      { id: 'svc-008-1', name: 'Full Body Massage', category: 'spa' as const, duration: 90, price: 2500, description: 'Swedish full body massage' },
      { id: 'svc-008-2', name: 'Anti-Aging Facial', category: 'skin' as const, duration: 75, price: 1800, description: 'Premium anti-aging treatment' },
    ],
  },
  {
    id: 'salon-009', name: 'Curl Cult Khar', slug: 'curl-cult-khar',
    area: 'Khar West', coordinates: { latitude: 19.0728, longitude: 72.8376 },
    priceRange: 'mid' as const, rating: 4.6, reviewCount: 143,
    tags: ['curly-hair', 'hair-color', 'treatment', 'balayage'],
    coverImage: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800',
    gallery: [],
    services: [
      { id: 'svc-009-1', name: 'Curly Cut', category: 'hair' as const, duration: 75, price: 1200, description: 'Specialist curly hair cut' },
      { id: 'svc-009-2', name: 'Deep Conditioning', category: 'hair' as const, duration: 60, price: 900, description: 'Moisture-rich deep conditioning' },
    ],
  },
  {
    id: 'salon-010', name: 'Naked Beauty Dadar', slug: 'naked-beauty-dadar',
    area: 'Dadar West', coordinates: { latitude: 19.0176, longitude: 72.8433 },
    priceRange: 'budget' as const, rating: 4.2, reviewCount: 267,
    tags: ['waxing', 'threading', 'cleanup', 'manicure', 'acrylic-nails'],
    coverImage: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=800',
    gallery: [],
    services: [
      { id: 'svc-010-1', name: 'Eyebrow Threading', category: 'skin' as const, duration: 15, price: 80, description: 'Precise eyebrow threading' },
      { id: 'svc-010-2', name: 'Upper Lip Wax', category: 'skin' as const, duration: 10, price: 60, description: 'Quick upper lip wax' },
      { id: 'svc-010-3', name: 'Acrylic Nail Extensions', category: 'nails' as const, duration: 75, price: 1200, description: 'Durable acrylic nail extensions' },
      { id: 'svc-010-4', name: 'Basic Manicure', category: 'nails' as const, duration: 30, price: 250, description: 'Classic manicure' },
    ],
  },
  {
    id: 'salon-011', name: 'Nail Canvas Santacruz', slug: 'nail-canvas-santacruz',
    area: 'Santacruz West', coordinates: { latitude: 19.0821, longitude: 72.8415 },
    priceRange: 'mid' as const, rating: 4.7, reviewCount: 178,
    tags: ['nails', 'soft-gel', 'gel-nails', 'nail-art', 'chrome-nails', 'ombre-nails'],
    coverImage: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    gallery: [],
    services: [
      { id: 'svc-011-1', name: 'Soft Gel Manicure', category: 'nails' as const, duration: 60, price: 1200, description: 'Builder gel overlay for natural strength' },
      { id: 'svc-011-2', name: 'Chrome Nail Art', category: 'nails' as const, duration: 75, price: 1500, description: 'Mirror-finish chrome powder nail art' },
      { id: 'svc-011-3', name: 'Ombre Nails', category: 'nails' as const, duration: 90, price: 1800, description: 'Gradient ombre nail design' },
      { id: 'svc-011-4', name: 'Gel Pedicure', category: 'nails' as const, duration: 50, price: 900, description: 'Long-lasting gel pedicure' },
    ],
  },
  {
    id: 'salon-012', name: 'The Polish Bar Worli', slug: 'polish-bar-worli',
    area: 'Worli', coordinates: { latitude: 19.0144, longitude: 72.8192 },
    priceRange: 'luxury' as const, rating: 4.8, reviewCount: 245,
    tags: ['nails', 'gel-nails', 'acrylic-nails', 'nail-art', 'bridal-nails', 'hard-gel'],
    coverImage: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    gallery: [],
    services: [
      { id: 'svc-012-1', name: 'Hard Gel Extensions', category: 'nails' as const, duration: 120, price: 3500, description: 'Durable hard gel nail extensions with top coat' },
      { id: 'svc-012-2', name: 'Acrylic Full Set', category: 'nails' as const, duration: 90, price: 2500, description: 'Classic acrylic nail set with gel overlay' },
      { id: 'svc-012-3', name: 'Bridal Nail Package', category: 'nails' as const, duration: 180, price: 6000, description: 'Complete bridal nail prep and art' },
      { id: 'svc-012-4', name: '3D Nail Art', category: 'nails' as const, duration: 120, price: 2000, description: 'Sculptural 3D nail art designs' },
    ],
  },
]

// Additional 10 salons for richer demo data
const MORE_SALONS = [
  {
    id: 'salon-011', name: 'The Polish Bar Worli', slug: 'polish-bar-worli',
    area: 'Worli', coordinates: { latitude: 19.0176, longitude: 72.8178 },
    priceRange: 'mid' as const, rating: 4.8, reviewCount: 310,
    tags: ['nails', 'gel-nails', 'nail-art', 'pedicure', 'manicure'],
    coverImage: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    services: [
      { id: 'svc-011-1', name: 'Gel Nail Art', category: 'nails' as const, duration: 60, price: 900, description: 'Custom gel nail art designs' },
      { id: 'svc-011-2', name: 'Spa Pedicure', category: 'nails' as const, duration: 50, price: 800, description: 'Relaxing spa pedicure with scrub' },
      { id: 'svc-011-3', name: 'Acrylic Extensions', category: 'nails' as const, duration: 90, price: 1500, description: 'Full set acrylic nail extensions' },
    ],
  },
  {
    id: 'salon-012', name: 'Studio Amore Santacruz', slug: 'studio-amore-santacruz',
    area: 'Santacruz West', coordinates: { latitude: 19.0806, longitude: 72.8453 },
    priceRange: 'luxury' as const, rating: 4.9, reviewCount: 189,
    tags: ['bridal', 'makeup', 'hair-color', 'balayage', 'luxury'],
    coverImage: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
    services: [
      { id: 'svc-012-1', name: 'Bridal Makeup', category: 'bridal' as const, duration: 180, price: 12000, description: 'Professional bridal makeup with airbrush' },
      { id: 'svc-012-2', name: 'Balayage + Toner', category: 'hair' as const, duration: 150, price: 5500, description: 'Seamless balayage with custom toner' },
      { id: 'svc-012-3', name: 'Party Makeup', category: 'skin' as const, duration: 60, price: 2500, description: 'Glam party makeup look' },
    ],
  },
  {
    id: 'salon-013', name: 'Trim & Groom Goregaon', slug: 'trim-groom-goregaon',
    area: 'Goregaon West', coordinates: { latitude: 19.1663, longitude: 72.8493 },
    priceRange: 'budget' as const, rating: 4.3, reviewCount: 221,
    tags: ['grooming', 'haircut', 'beard', 'mens', 'hair-spa'],
    coverImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
    services: [
      { id: 'svc-013-1', name: 'Men\'s Haircut', category: 'grooming' as const, duration: 30, price: 350, description: 'Classic men\'s styling' },
      { id: 'svc-013-2', name: 'Hot Towel Shave', category: 'grooming' as const, duration: 30, price: 300, description: 'Traditional hot towel shave' },
      { id: 'svc-013-3', name: 'D-Tan Pack', category: 'skin' as const, duration: 45, price: 400, description: 'Brightening D-Tan treatment' },
    ],
  },
  {
    id: 'salon-014', name: 'Glow & Go Thane', slug: 'glow-go-thane',
    area: 'Thane West', coordinates: { latitude: 19.2183, longitude: 72.9781 },
    priceRange: 'mid' as const, rating: 4.5, reviewCount: 178,
    tags: ['facial', 'skin', 'cleanup', 'hair-color', 'waxing'],
    coverImage: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=800',
    services: [
      { id: 'svc-014-1', name: 'Hydra Facial', category: 'skin' as const, duration: 75, price: 2200, description: 'Deep hydration facial with serum' },
      { id: 'svc-014-2', name: 'Global Hair Color', category: 'hair' as const, duration: 90, price: 1800, description: 'Full head color with nourishing treatment' },
      { id: 'svc-014-3', name: 'Rica Waxing (full legs)', category: 'skin' as const, duration: 40, price: 700, description: 'Painless rica wax' },
    ],
  },
  {
    id: 'salon-015', name: 'Regal Spa Chembur', slug: 'regal-spa-chembur',
    area: 'Chembur', coordinates: { latitude: 19.0620, longitude: 72.8999 },
    priceRange: 'mid' as const, rating: 4.6, reviewCount: 145,
    tags: ['spa', 'massage', 'skin', 'facial', 'hair-spa'],
    coverImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    services: [
      { id: 'svc-015-1', name: 'Aromatherapy Massage', category: 'spa' as const, duration: 60, price: 1800, description: 'Relaxing aromatherapy full body massage' },
      { id: 'svc-015-2', name: 'Vitamin C Facial', category: 'skin' as const, duration: 60, price: 1500, description: 'Brightening Vitamin C treatment' },
      { id: 'svc-015-3', name: 'Hair Spa with Massage', category: 'hair' as const, duration: 75, price: 1200, description: 'Nourishing hair spa + scalp massage' },
    ],
  },
  {
    id: 'salon-016', name: 'Fade & Blade Borivali', slug: 'fade-blade-borivali',
    area: 'Borivali West', coordinates: { latitude: 19.2307, longitude: 72.8567 },
    priceRange: 'budget' as const, rating: 4.4, reviewCount: 267,
    tags: ['grooming', 'fade', 'haircut', 'beard', 'mens'],
    coverImage: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800',
    services: [
      { id: 'svc-016-1', name: 'Fade Haircut', category: 'grooming' as const, duration: 30, price: 300, description: 'Skin fade to mid fade styling' },
      { id: 'svc-016-2', name: 'Beard Sculpting', category: 'grooming' as const, duration: 25, price: 250, description: 'Clean beard shape and style' },
      { id: 'svc-016-3', name: 'Hair + Beard Combo', category: 'grooming' as const, duration: 50, price: 499, description: 'Complete look makeover' },
    ],
  },
  {
    id: 'salon-017', name: 'Bridal Bliss Kandivali', slug: 'bridal-bliss-kandivali',
    area: 'Kandivali West', coordinates: { latitude: 19.2044, longitude: 72.8497 },
    priceRange: 'luxury' as const, rating: 4.7, reviewCount: 134,
    tags: ['bridal', 'mehendi', 'makeup', 'hair-color', 'draping'],
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    services: [
      { id: 'svc-017-1', name: 'Full Bridal Package', category: 'bridal' as const, duration: 360, price: 20000, description: 'Head-to-toe bridal transformation' },
      { id: 'svc-017-2', name: 'Engagement Makeup', category: 'bridal' as const, duration: 90, price: 4500, description: 'Flawless engagement look' },
      { id: 'svc-017-3', name: 'Bridal Mehendi', category: 'bridal' as const, duration: 150, price: 4000, description: 'Intricate full-hand bridal mehendi' },
    ],
  },
  {
    id: 'salon-018', name: 'Curl & Colour Lokhandwala', slug: 'curl-colour-lokhandwala',
    area: 'Lokhandwala', coordinates: { latitude: 19.1349, longitude: 72.8315 },
    priceRange: 'mid' as const, rating: 4.6, reviewCount: 198,
    tags: ['curly-hair', 'hair-color', 'balayage', 'ombre', 'highlights'],
    coverImage: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800',
    services: [
      { id: 'svc-018-1', name: 'Ombre Balayage', category: 'hair' as const, duration: 180, price: 4500, description: 'Seamless ombre to balayage blend' },
      { id: 'svc-018-2', name: 'Curly Colour', category: 'hair' as const, duration: 120, price: 3000, description: 'Specialist color for curly hair' },
      { id: 'svc-018-3', name: 'Toning + Treatment', category: 'hair' as const, duration: 60, price: 1500, description: 'Colour toning with deep conditioning' },
    ],
  },
  {
    id: 'salon-019', name: 'Zen Skin Studio Vile Parle', slug: 'zen-skin-vile-parle',
    area: 'Vile Parle West', coordinates: { latitude: 19.0990, longitude: 72.8467 },
    priceRange: 'mid' as const, rating: 4.5, reviewCount: 156,
    tags: ['skin', 'facial', 'acne', 'cleanup', 'derma'],
    coverImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
    services: [
      { id: 'svc-019-1', name: 'Acne Treatment Facial', category: 'skin' as const, duration: 75, price: 1800, description: 'Targeted acne & blemish treatment' },
      { id: 'svc-019-2', name: 'Microdermabrasion', category: 'skin' as const, duration: 60, price: 2500, description: 'Crystal microdermabrasion for smooth skin' },
      { id: 'svc-019-3', name: 'De-Pigmentation Pack', category: 'skin' as const, duration: 45, price: 1200, description: 'Targets dark spots and pigmentation' },
    ],
  },
  {
    id: 'salon-020', name: 'Lush Locks Mulund', slug: 'lush-locks-mulund',
    area: 'Mulund West', coordinates: { latitude: 19.1726, longitude: 72.9560 },
    priceRange: 'budget' as const, rating: 4.2, reviewCount: 189,
    tags: ['hair-color', 'keratin', 'hair-spa', 'rebonding', 'highlights'],
    coverImage: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800',
    services: [
      { id: 'svc-020-1', name: 'Rebonding', category: 'hair' as const, duration: 180, price: 3500, description: 'Permanent hair straightening with rebonding' },
      { id: 'svc-020-2', name: 'Keratin Smoothing', category: 'hair' as const, duration: 150, price: 4000, description: 'Brazilian keratin treatment' },
      { id: 'svc-020-3', name: 'Highlights (foil)', category: 'hair' as const, duration: 120, price: 2200, description: 'Natural-looking foil highlights' },
    ],
  },
]

async function seed() {
  console.log('🌱 Starting seed...')

  // Combine original + new salons
  const ALL_SALONS = [...SALONS, ...MORE_SALONS]
  const batch = db.batch()

  for (const salon of ALL_SALONS) {
    const { services, ...salonData } = salon
    const geohash = encodeGeohash(salonData.coordinates.latitude, salonData.coordinates.longitude)

    // Write salon doc
    const salonRef = db.collection('salons').doc(salon.id)
    const salonDoc: Omit<SalonDoc, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp } = {
      ...salonData,
      city: 'Mumbai',
      geohash,
      serviceCount: services.length,
      isVerified: true,
      ownerId: 'owner-001',
      openingHours: DEFAULT_HOURS,
      gallery: [],
      embedding: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    batch.set(salonRef, salonDoc)

    // Write services subcollection
    for (const service of services) {
      const serviceRef = salonRef.collection('services').doc(service.id)
      const serviceDoc: ServiceDoc = { ...service, salonId: salon.id, isActive: true }
      batch.set(serviceRef, serviceDoc)
    }
  }

  // Write test users
  batch.set(db.collection('users').doc('customer-001'), {
    uid: 'customer-001', displayName: 'Test Customer', email: 'customer@glowcity.in',
    role: 'customer', favoritesSalonIds: [], bookingHistory: [], createdAt: Timestamp.now(),
  })
  batch.set(db.collection('users').doc('owner-001'), {
    uid: 'owner-001', displayName: 'Salon Owner', email: 'owner@glowcity.in',
    role: 'salon_owner', favoritesSalonIds: [], bookingHistory: [], createdAt: Timestamp.now(),
  })

  await batch.commit()
  console.log('✅ Salons and users seeded.')

  // Seed 7 days of slots
  const today = new Date()
  for (const salon of ALL_SALONS) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() + d)
      const dateStr = date.toISOString().split('T')[0]
      const primaryService = salon.services[0]
      const slots = generateSlots(salon.id, dateStr, primaryService.duration, DEFAULT_HOURS)

      const slotBatch = db.batch()
      const parentDoc = db.collection('slots').doc(`${salon.id}_${dateStr}`)
      slotBatch.set(parentDoc, { salonId: salon.id, date: dateStr })

      for (const slot of slots) {
        const slotRef = parentDoc.collection('slots').doc(slot.startTime.replace(':', ''))
        const slotDoc: Omit<SlotDoc, 'lockedUntil'> = {
          ...slot,
          salonId: salon.id,
        }
        slotBatch.set(slotRef, slotDoc)
      }
      await slotBatch.commit()
    }
    console.log(`✅ Slots seeded for ${salon.name}`)
  }

  console.log('🎉 Seed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
