import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '@/firebase'

/**
 * Escucha cambios en el estado de autenticación.
 * Resuelve con el usuario actual (o null) en el primer evento.
 * @returns {Promise<import('firebase/auth').User | null>}
 */
export function waitForAuthReady() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

/**
 * Suscripción continua a cambios de auth.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} función para cancelar la suscripción
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function registerWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(result.user, { displayName })
  }
  return result.user
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function logout() {
  await signOut(auth)
}
