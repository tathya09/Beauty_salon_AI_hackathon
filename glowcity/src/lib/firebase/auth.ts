import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  ConfirmationResult,
} from 'firebase/auth'
import { auth } from './client'

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function signInWithPhoneOTP(
  phone: string,
  recaptchaContainerId: string
): Promise<ConfirmationResult> {
  const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: 'invisible',
  })
  return signInWithPhoneNumber(auth, phone, recaptchaVerifier)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}

export { onAuthStateChanged, auth }
