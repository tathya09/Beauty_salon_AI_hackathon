import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Salon, Service, SalonDoc, PaginatedResult, SearchFilters, PaginationParams } from '@/types'
import { MOCK_SALONS, isFirebaseConfigured } from '@/lib/mockData'
import { getGeminiGeneratedSalons } from '@/lib/geminiSalonData'

/**
 * Returns salons from: 1) Firestore (if configured & has data),
 * 2) Gemini-generated data (if Firestore empty), 3) static MOCK_SALONS fallback.
 */
async function getLiveSalons(): Promise<Salon[]> {
  if (!isFirebaseConfigured()) {
    const gemini = await getGeminiGeneratedSalons()
    return gemini.length > 0 ? gemini : MOCK_SALONS
  }
  return []
}

function docToSalon(docSnap: DocumentSnapshot): Salon {
  const data = docSnap.data() as SalonDoc
  return {
    ...data,
    id: docSnap.id,
    services: [], // services are in subcollection, loaded separately
  }
}

export async function getSalonById(salonId: string): Promise<Salon | null> {
  if (!isFirebaseConfigured()) {
    const salons = await getLiveSalons()
    return salons.find((s) => s.id === salonId) ?? null
  }
  const docSnap = await getDoc(doc(db, 'salons', salonId))
  if (!docSnap.exists()) {
    // Firestore empty — try Gemini-generated data
    const salons = await getGeminiGeneratedSalons()
    return salons.find((s) => s.id === salonId) ?? null
  }
  const salon = docToSalon(docSnap)
  // Load services subcollection
  const servicesSnap = await getDocs(collection(db, 'salons', salonId, 'services'))
  salon.services = servicesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Service))
  return salon
}

export async function getSalonsByArea(
  city: string,
  area: string | undefined,
  filters: SearchFilters,
  pagination: PaginationParams
): Promise<PaginatedResult<Salon>> {
  // Mock / Gemini fallback
  if (!isFirebaseConfigured()) {
    let items = (await getLiveSalons()).filter((s) => s.city === city)
    if (area) items = items.filter((s) => s.area === area)
    if (filters.priceRange?.length) items = items.filter((s) => filters.priceRange!.includes(s.priceRange))
    if (filters.categories?.length) items = items.filter((s) => s.services.some((sv) => filters.categories!.includes(sv.category)))
    if (filters.tags?.length) items = items.filter((s) => filters.tags!.some((t) => s.tags.includes(t)))
    items = items.sort((a, b) => b.rating - a.rating).slice(0, pagination.limit)
    return { items, total: items.length, hasMore: false }
  }

  let q = query(
    collection(db, 'salons'),
    where('city', '==', city),
    where('isVerified', '==', true),
    orderBy('rating', 'desc'),
    limit(pagination.limit)
  )

  if (area) {
    q = query(
      collection(db, 'salons'),
      where('city', '==', city),
      where('area', '==', area),
      where('isVerified', '==', true),
      orderBy('rating', 'desc'),
      limit(pagination.limit)
    )
  }

  if (filters.priceRange && filters.priceRange.length === 1) {
    q = query(
      collection(db, 'salons'),
      where('city', '==', city),
      where('priceRange', '==', filters.priceRange[0]),
      where('isVerified', '==', true),
      orderBy('rating', 'desc'),
      limit(pagination.limit)
    )
  }

  if (pagination.lastVisible) {
    q = query(q, startAfter(pagination.lastVisible))
  }

  try {
    const snap = await getDocs(q)
    let items = snap.docs.map(docToSalon)

    // Firestore returned nothing — use Gemini data
    if (items.length === 0) {
      let geminiItems = (await getGeminiGeneratedSalons()).filter((s) => s.city === city)
      if (geminiItems.length === 0) geminiItems = MOCK_SALONS.filter((s) => s.city === city)
      if (area) geminiItems = geminiItems.filter((s) => s.area === area)
      if (filters.priceRange?.length) geminiItems = geminiItems.filter((s) => filters.priceRange!.includes(s.priceRange))
      if (filters.categories?.length) geminiItems = geminiItems.filter((s) => filters.categories!.some((cat) => s.tags.includes(cat)))
      if (filters.tags?.length) geminiItems = geminiItems.filter((s) => filters.tags!.some((t) => s.tags.includes(t)))
      geminiItems = geminiItems.sort((a, b) => b.rating - a.rating).slice(0, pagination.limit)
      return { items: geminiItems, total: geminiItems.length, hasMore: false }
    }

    // Client-side category filter (Firestore doesn't support array-contains across subcollection)
    if (filters.categories?.length) {
      items = items.filter((s) => filters.categories!.some((cat) => s.tags.includes(cat)))
    }
    if (filters.tags?.length) {
      items = items.filter((s) => filters.tags!.some((t) => s.tags.includes(t)))
    }

    return {
      items,
      total: items.length,
      hasMore: items.length === pagination.limit,
      lastVisible: snap.docs[snap.docs.length - 1],
    }
  } catch (err) {
    console.warn('Firestore getSalonsByArea failed, using Gemini fallback:', err)
    let geminiItems = (await getGeminiGeneratedSalons()).filter((s) => s.city === city)
    if (geminiItems.length === 0) geminiItems = MOCK_SALONS.filter((s) => s.city === city)
    if (area) geminiItems = geminiItems.filter((s) => s.area === area)
    if (filters.priceRange?.length) geminiItems = geminiItems.filter((s) => filters.priceRange!.includes(s.priceRange))
    if (filters.tags?.length) geminiItems = geminiItems.filter((s) => filters.tags!.some((t) => s.tags.includes(t)))
    geminiItems = geminiItems.sort((a, b) => b.rating - a.rating).slice(0, pagination.limit)
    return { items: geminiItems, total: geminiItems.length, hasMore: false }
  }
}

export async function searchSalonsByTags(tags: string[], city: string): Promise<Salon[]> {
  if (tags.length === 0) return []

  // Gemini / Mock fallback
  if (!isFirebaseConfigured()) {
    const salons = await getLiveSalons()
    return salons
      .filter((s) => s.city === city && tags.some((t) => s.tags.includes(t)))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)
  }

  try {
    const q = query(
      collection(db, 'salons'),
      where('tags', 'array-contains-any', tags.slice(0, 10)),
      where('city', '==', city),
      orderBy('rating', 'desc'),
      limit(10)
    )
    const snap = await getDocs(q)
    const results = snap.docs.map(docToSalon)
    if (results.length > 0) return results
  } catch (err) {
    console.warn('Firestore searchSalonsByTags failed, using Gemini fallback:', err)
  }

  // Firestore failed or empty — Gemini fallback
  const salons = await getGeminiGeneratedSalons()
  const base = salons.length > 0 ? salons : MOCK_SALONS
  return base
    .filter((s) => s.city === city && tags.some((t) => s.tags.includes(t)))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10)
}

export async function getTopRatedSalons(city: string, count = 6): Promise<Salon[]> {
  // Gemini / Mock fallback
  if (!isFirebaseConfigured()) {
    const salons = await getLiveSalons()
    return salons
      .filter((s) => s.city === city)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, count)
  }

  try {
    const q = query(
      collection(db, 'salons'),
      where('city', '==', city),
      where('isVerified', '==', true),
      orderBy('rating', 'desc'),
      limit(count)
    )
    const snap = await getDocs(q)
    const results = snap.docs.map(docToSalon)

    if (results.length > 0) return results
  } catch (err) {
    console.warn('Firestore getTopRatedSalons failed, using Gemini fallback:', err)
  }

  // Firestore failed or empty — use Gemini data
  const salons = await getGeminiGeneratedSalons()
  return salons.length > 0
    ? salons.filter((s) => s.city === city).sort((a, b) => b.rating - a.rating).slice(0, count)
    : MOCK_SALONS.filter((s) => s.city === city).sort((a, b) => b.rating - a.rating).slice(0, count)
}

export async function updateSalon(salonId: string, data: Partial<SalonDoc>): Promise<void> {
  await updateDoc(doc(db, 'salons', salonId), { ...data })
}

export async function getAllSalons(count = 50): Promise<Salon[]> {
  if (!isFirebaseConfigured()) {
    const salons = await getLiveSalons()
    return salons.slice(0, count)
  }
  try {
    const q = query(
      collection(db, 'salons'),
      where('isVerified', '==', true),
      orderBy('rating', 'desc'),
      limit(count)
    )
    const snap = await getDocs(q)
    const results = snap.docs.map(docToSalon)
    if (results.length > 0) return results
  } catch (err) {
    console.warn('Firestore getAllSalons failed, using Gemini fallback:', err)
  }

  const salons = await getGeminiGeneratedSalons()
  return salons.length > 0 ? salons.slice(0, count) : MOCK_SALONS.slice(0, count)
}
