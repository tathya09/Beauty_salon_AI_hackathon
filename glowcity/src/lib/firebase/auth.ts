import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  User as FirebaseUser,
} from 'firebase/auth'
import { auth } from './client'

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')

/** Sign in with Google popup */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

/** Sign in with email + password. Throws with a user-friendly message on failure. */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (err: any) {
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        throw new Error('No account found with this email. Please sign up first.')
      case 'auth/wrong-password':
        throw new Error('Incorrect password. Please try again.')
      case 'auth/too-many-requests':
        throw new Error('Too many attempts. Please try again in a few minutes.')
      case 'auth/user-disabled':
        throw new Error('This account has been disabled.')
      default:
        throw new Error('Sign in failed. Please check your details and try again.')
    }
  }
}

/** Register a new user with email + password + display name.
 *  Returns the Firebase user. Throws if the email is already in use. */
export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<FirebaseUser> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName: name })
    return result.user
  } catch (err: any) {
    console.error('registerWithEmail error code:', err.code, 'message:', err.message)
    switch (err.code) {
      case 'auth/email-already-in-use':
        throw new Error('An account with this email already exists. Please log in instead.')
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address.')
      case 'auth/weak-password':
        throw new Error('Password must be at least 6 characters.')
      case 'auth/operation-not-allowed':
        throw new Error('Email/password sign-up is not enabled. Please contact support.')
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your connection and try again.')
      case 'auth/too-many-requests':
        throw new Error('Too many attempts. Please try again in a few minutes.')
      default:
        throw new Error(err.message ?? 'Registration failed. Please try again.')
    }
  }
}

/** Check whether an email is already registered */
export async function emailExists(email: string): Promise<boolean> {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email)
    return methods.length > 0
  } catch {
    return false
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}

export { onAuthStateChanged, auth }
