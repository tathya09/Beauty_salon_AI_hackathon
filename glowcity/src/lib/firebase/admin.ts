/**
 * Firebase Admin SDK — lazy singleton
 * Uses dynamic import pattern to avoid initialization at Next.js build time.
 * The proxy approach ensures env vars are read at runtime, not build time.
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, ' +
        'FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your environment.'
    )
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

// Getters — lazily called only when a route handler runs, never at build time
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp())
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}

// Convenience re-exports that look like singletons but resolve lazily
// Use these in API routes: `adminDb.collection(...)` etc.
export const adminDb = new Proxy({} as Firestore, {
  get(_t, p: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getAdminDb() as any)[p]
  },
})

export const adminAuth = new Proxy({} as Auth, {
  get(_t, p: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getAdminAuth() as any)[p]
  },
})
