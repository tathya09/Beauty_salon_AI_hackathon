/**
 * POST /api/salon/create
 * Creates a new salon document in Firestore for a salon owner.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { encodeGeohash } from '@/utils/geohash'

const AREA_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Bandra West': { latitude: 19.0596, longitude: 72.8295 },
  'Bandra East': { latitude: 19.0544, longitude: 72.8407 },
  'Andheri West': { latitude: 19.1136, longitude: 72.8697 },
  'Andheri East': { latitude: 19.1197, longitude: 72.8757 },
  'Juhu': { latitude: 19.1075, longitude: 72.8263 },
  'Colaba': { latitude: 18.9067, longitude: 72.8147 },
  'Powai': { latitude: 19.1197, longitude: 72.9051 },
  'Malad West': { latitude: 19.1871, longitude: 72.8481 },
  'Khar West': { latitude: 19.0728, longitude: 72.8376 },
  'Versova': { latitude: 19.1300, longitude: 72.8185 },
  'Dadar West': { latitude: 19.0176, longitude: 72.8433 },
  'Borivali West': { latitude: 19.2307, longitude: 72.8567 },
  'Chembur': { latitude: 19.0620, longitude: 72.8999 },
  'Worli': { latitude: 19.0176, longitude: 72.8178 },
  'Santacruz West': { latitude: 19.0806, longitude: 72.8453 },
  'Goregaon West': { latitude: 19.1663, longitude: 72.8493 },
  'Thane West': { latitude: 19.2183, longitude: 72.9781 },
  'Lokhandwala': { latitude: 19.1349, longitude: 72.8315 },
  'Vile Parle West': { latitude: 19.0990, longitude: 72.8467 },
  'Kandivali West': { latitude: 19.2044, longitude: 72.8497 },
  'Mulund West': { latitude: 19.1726, longitude: 72.9560 },
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    const ownerId = decoded.uid

    const { name, area, priceRange, description, phone, services, openingHours } = await req.json()

    if (!name || !area || !services?.length) {
      return NextResponse.json({ error: 'name, area and at least one service are required' }, { status: 400 })
    }

    // Check if owner already has a salon
    const existing = await adminDb.collection('salons').where('ownerId', '==', ownerId).limit(1).get()
    if (!existing.empty) {
      return NextResponse.json({ salonId: existing.docs[0].id, alreadyExists: true })
    }

    const coordinates = AREA_COORDINATES[area] ?? { latitude: 19.076, longitude: 72.877 }
    const geohash = encodeGeohash(coordinates.latitude, coordinates.longitude)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Derive tags from service categories
    const tags = [...new Set(services.map((s: { category: string }) => s.category))] as string[]

    const salonRef = adminDb.collection('salons').doc()
    const salonData = {
      name,
      slug: `${slug}-${salonRef.id.slice(-4)}`,
      city: 'Mumbai',
      area,
      coordinates,
      geohash,
      priceRange: priceRange ?? 'mid',
      description: description ?? '',
      phone: phone ?? '',
      rating: 0,
      reviewCount: 0,
      tags,
      coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
      gallery: [],
      embedding: [],
      isVerified: true,
      ownerId,
      serviceCount: services.length,
      openingHours: openingHours ?? {
        monday: { open: '09:00', close: '20:00', closed: false },
        tuesday: { open: '09:00', close: '20:00', closed: false },
        wednesday: { open: '09:00', close: '20:00', closed: false },
        thursday: { open: '09:00', close: '20:00', closed: false },
        friday: { open: '09:00', close: '20:00', closed: false },
        saturday: { open: '09:00', close: '20:00', closed: false },
        sunday: { open: '10:00', close: '18:00', closed: false },
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await salonRef.set(salonData)

    // Add services as subcollection
    const batch = adminDb.batch()
    for (const svc of services) {
      const svcRef = salonRef.collection('services').doc()
      batch.set(svcRef, {
        ...svc,
        id: svcRef.id,
        salonId: salonRef.id,
        isActive: true,
      })
    }
    await batch.commit()

    // Update user doc to reference the salon
    await adminDb.doc(`users/${ownerId}`).update({ salonId: salonRef.id })

    return NextResponse.json({ salonId: salonRef.id, success: true })
  } catch (err) {
    console.error('salon/create error:', err)
    return NextResponse.json({ error: 'Failed to create salon' }, { status: 500 })
  }
}
