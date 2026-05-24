import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

/**
 * Crea una nueva invitación en Firestore.
 * El token es un UUID usado como ID del documento (y como parte del link).
 *
 * @param {{
 *   email: string,
 *   workspaceId: string,
 *   workspaceName: string,
 *   role: 'admin' | 'viewer',
 *   createdBy: string,
 * }} params
 * @returns {Promise<string>} token UUID
 */
export async function createInvitation({ email, workspaceId, workspaceName, role, createdBy }) {
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await setDoc(doc(db, 'invitations', token), {
    email: email.toLowerCase().trim(),
    workspaceId,
    workspaceName,
    role,
    status: 'pending',
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  })

  return token
}

/**
 * Lee una invitación por su token.
 * Convierte los Timestamps de Firestore a Date para facilitar comparaciones.
 *
 * @param {string} token
 * @returns {Promise<object | null>}
 */
export async function getInvitation(token) {
  const snap = await getDoc(doc(db, 'invitations', token))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    token: snap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? null,
    expiresAt: data.expiresAt?.toDate?.() ?? null,
  }
}

/**
 * Marca una invitación como aceptada.
 * @param {string} token
 */
export async function acceptInvitation(token) {
  await updateDoc(doc(db, 'invitations', token), {
    status: 'accepted',
  })
}
