import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

/**
 * Lee el workspaceId activo del usuario desde `users/{uid}`.
 * @param {string} uid
 * @returns {Promise<string | null>}
 */
export async function getUserWorkspaceId(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return snap.data().currentWorkspaceId ?? null
}

/**
 * Lee los datos de un workspace.
 * @param {string} workspaceId
 * @returns {Promise<object | null>}
 */
export async function getWorkspace(workspaceId) {
  const snap = await getDoc(doc(db, 'workspaces', workspaceId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Crea un workspace nuevo y lo asigna al usuario creador.
 *
 * El campo `members` es un map con el uid como key, compatible con reglas
 * de seguridad de Firestore:
 *   allow read: if request.auth.uid in resource.data.members;
 *   allow write: if resource.data.members[request.auth.uid].role == 'admin';
 *
 * @param {string} uid
 * @param {string} email
 * @param {{
 *   name: string,
 *   baseCurrency: 'CRC' | 'USD',
 *   partners: Array<{ id: string, name: string, lastName: string, email: string, percentage: number }>
 * }} data
 * @returns {Promise<string>} workspaceId
 */
export async function createWorkspace(uid, email, data) {
  const workspaceRef = doc(db, 'workspaces', crypto.randomUUID())

  const workspace = {
    name: data.name,
    baseCurrency: data.baseCurrency ?? 'CRC',
    exchangeRate: data.exchangeRate ?? 500,
    partners: data.partners ?? [],
    // Map { [uid]: { email, role } } — requerido por las reglas de seguridad
    members: {
      [uid]: { email, role: 'admin' },
    },
    createdAt: serverTimestamp(),
  }

  await setDoc(workspaceRef, workspace)

  // Registrar el workspaceId activo en el documento del usuario
  await setDoc(
    doc(db, 'users', uid),
    { currentWorkspaceId: workspaceRef.id },
    { merge: true }
  )

  return workspaceRef.id
}

/**
 * Actualiza campos del workspace.
 * @param {string} workspaceId
 * @param {object} data
 */
export async function updateWorkspace(workspaceId, data) {
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Agrega o actualiza un miembro en el workspace.
 * Usa dot-notation para no sobreescribir el resto del map.
 * @param {string} workspaceId
 * @param {string} uid
 * @param {string} email
 * @param {'admin' | 'viewer'} role
 */
export async function addMember(workspaceId, uid, email, role = 'viewer') {
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    [`members.${uid}`]: { email, role },
    updatedAt: serverTimestamp(),
  })
}

/**
 * Elimina un miembro del workspace.
 * @param {string} workspaceId
 * @param {string} uid
 */
export async function removeMember(workspaceId, uid) {
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    [`members.${uid}`]: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

// ── Helpers de consulta (sin Firestore, solo sobre datos en memoria) ──────────

/**
 * Indica si un uid pertenece al workspace.
 * @param {object | null} workspace  datos del workspace (con members map)
 * @param {string} uid
 * @returns {boolean}
 */
export function isMember(workspace, uid) {
  return !!workspace?.members?.[uid]
}

/**
 * Indica si un uid tiene rol 'admin' en el workspace.
 * @param {object | null} workspace
 * @param {string} uid
 * @returns {boolean}
 */
export function isAdmin(workspace, uid) {
  return workspace?.members?.[uid]?.role === 'admin'
}
