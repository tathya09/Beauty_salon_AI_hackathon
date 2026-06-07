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

function docToSalon(docSnap: DocumentSnapshot): Salon {
  const data = docSnap.data() as SalonDoc
  return {
    ...data,
    id: docSnap.id,
    services: [], // services are in subcollection, loaded separately
  }
}

export async function getSalonById(salonId: string): Promise<Salon | null> {
  const docSnap = await getDoc(doc(db, 'salons', salonId))
  if (!docSnap.exists()) return null
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

  const snap = await getDocs(q)
  const items = snap.docs.map(docToSalon)

  return {
    items,
    total: items.length,
    hasMore: items.length === pagination.limit,
    lastVisible: snap.docs[snap.docs.length - 1],
  }
}

export async function searchSalonsByTags(tags: string[], city: string): Promise<Salon[]> {
  if (tags.length === 0) return []
  const q = query(
    collection(db, 'salons'),
    where('tags', 'array-contains-any', tags.slice(0, 10)),
    where('city', '==', city),
    orderBy('rating', 'desc'),
    limit(10)
  )
  const snap = await getDocs(q)
  return snap.docs.map(docToSalon)
}

export async function getTopRatedSalons(city: string, count = 6): Promise<Salon[]> {
  const q = query(
    collection(db, 'salons'),
    where('city', '==', city),
    where('isVerified', '==', true),
    orderBy('rating', 'desc'),
    limit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map(docToSalon)
}

export async function updateSalon(salonId: string, data: Partial<SalonDoc>): Promise<void> {
  await updateDoc(doc(db, 'salons', salonId), { ...data })
}
