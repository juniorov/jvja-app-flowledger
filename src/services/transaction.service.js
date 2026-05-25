import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { dateStringToDate } from '@/shared/utils/formatters'

/**
 * @param {string} workspaceId
 * @returns {import('firebase/firestore').CollectionReference}
 */
function txCollection(workspaceId) {
  return collection(db, 'workspaces', workspaceId, 'transactions')
}

/**
 * Suscripción en tiempo real a las transacciones de un período (mes/año).
 * Llama a onData con el array de transacciones cada vez que haya cambios.
 *
 * @param {string} workspaceId
 * @param {number} year
 * @param {number} month  1-12
 * @param {(data: object[]) => void} onData
 * @param {(err: Error) => void} onError
 * @returns {() => void}  función para cancelar la suscripción
 */
export function subscribeToTransactions(workspaceId, year, month, onData, onError) {
  const start = Timestamp.fromDate(new Date(year, month - 1, 1, 0, 0, 0))
  const end = Timestamp.fromDate(new Date(year, month - 1, 31, 23, 59, 59))

  const q = query(
    txCollection(workspaceId),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc')
  )

  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

/**
 * Suscripción en tiempo real a TODAS las transacciones del workspace,
 * ordenadas por fecha descendente. Usada para el módulo de períodos.
 *
 * @param {string} workspaceId
 * @param {(data: object[]) => void} onData
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeToAllTransactions(workspaceId, onData, onError) {
  const q = query(txCollection(workspaceId), orderBy('date', 'desc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

/**
 * Lee una sola transacción por ID.
 * @param {string} workspaceId
 * @param {string} txId
 * @returns {Promise<object | null>}
 */
export async function getTransaction(workspaceId, txId) {
  const snap = await getDoc(doc(db, 'workspaces', workspaceId, 'transactions', txId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Crea una transacción manual en Firestore.
 *
 * @param {string} workspaceId
 * @param {{ date: string, description: string, notes: string, type: 'income'|'expense',
 *            amount: number, currency: 'CRC'|'USD', code: string, reference: string,
 *            balance: number, isDistributable: boolean, fixedCosts: number }} formData
 * @param {string} uid  UID del usuario que crea
 * @returns {Promise<string>}  ID de la transacción creada
 */
export async function createTransaction(workspaceId, formData, uid) {
  const isIncome = formData.type === 'income'
  const amount = Number(formData.amount) || 0

  const tx = {
    date: Timestamp.fromDate(dateStringToDate(formData.date)),
    reference: formData.reference?.trim() || '',
    code: formData.code?.trim() || '',
    description: formData.description.trim(),
    notes: formData.notes?.trim() || '',
    debit: isIncome ? 0 : amount,
    credit: isIncome ? amount : 0,
    balance: Number(formData.balance) || 0,
    currency: formData.currency || 'CRC',
    type: formData.type,
    isDistributable: isIncome ? !!formData.isDistributable : false,
    fixedCosts: isIncome && formData.isDistributable ? Number(formData.fixedCosts) || 0 : 0,
    importedFrom: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
  }

  const ref = await addDoc(txCollection(workspaceId), tx)
  return ref.id
}

/**
 * Actualiza una transacción.
 * Para importadas: pasar solo { notes, isDistributable, fixedCosts, description }.
 * Para manuales: se pueden actualizar todos los campos del modelo.
 *
 * @param {string} workspaceId
 * @param {string} txId
 * @param {object} data
 */
export async function updateTransaction(workspaceId, txId, data) {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'transactions', txId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Elimina una transacción. Solo usar en transacciones manuales.
 * @param {string} workspaceId
 * @param {string} txId
 */
export async function deleteTransaction(workspaceId, txId) {
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'transactions', txId))
}

/**
 * Guarda múltiples transacciones importadas en un batch de Firestore.
 * Las filas deben venir del composable useImportExcel (ya parseadas).
 * Firestore limita 500 operaciones por batch; se divide automáticamente.
 *
 * @param {string} workspaceId
 * @param {Array<{
 *   date: Date,
 *   reference: string,
 *   code: string,
 *   description: string,
 *   debit: number,
 *   credit: number,
 *   balance: number,
 *   currency: 'CRC'|'USD',
 *   type: 'income'|'expense',
 *   notes: string,
 *   isDistributable: boolean,
 *   fixedCosts: number,
 *   importedFrom: string,
 * }>} rows
 * @param {string} uid  UID del usuario que importa
 * @returns {Promise<number>}  cantidad de transacciones guardadas
 */
/**
 * ID de documento fijo para el saldo inicial por moneda.
 * Permite upsert directo sin queries adicionales.
 * @param {'CRC'|'USD'} currency
 */
function openingBalanceDocId(currency) {
  return `opening-balance-${currency.toLowerCase()}`
}

/**
 * Lee el saldo inicial de apertura para una moneda.
 * Devuelve null si no existe.
 *
 * @param {string} workspaceId
 * @param {'CRC'|'USD'} currency
 * @returns {Promise<object|null>}
 */
export async function getOpeningBalance(workspaceId, currency) {
  const snap = await getDoc(doc(txCollection(workspaceId), openingBalanceDocId(currency)))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Crea o reemplaza el saldo inicial de apertura para una moneda.
 * Usa un ID de documento fijo para garantizar que solo exista uno por moneda.
 *
 * @param {string} workspaceId
 * @param {{ amount: number, date: string, currency: 'CRC'|'USD' }} data
 * @param {string} uid
 */
export async function upsertOpeningBalance(workspaceId, { amount, date, currency }, uid) {
  const ref = doc(txCollection(workspaceId), openingBalanceDocId(currency))
  await setDoc(ref, {
    date: Timestamp.fromDate(dateStringToDate(date)),
    reference: '',
    code: 'SI',
    description: `Saldo inicial ${currency}`,
    notes: 'Saldo inicial de apertura',
    debit: 0,
    credit: Number(amount) || 0,
    balance: Number(amount) || 0,
    currency,
    type: 'income',
    isDistributable: false,
    fixedCosts: 0,
    importedFrom: null,
    updatedAt: serverTimestamp(),
    createdBy: uid,
  })
}

export async function saveBatchTransactions(workspaceId, rows, uid) {
  const BATCH_LIMIT = 499
  const col = txCollection(workspaceId)
  const now = serverTimestamp()

  // Dividir en chunks para respetar el límite de Firestore
  for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
    const chunk = rows.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)

    for (const row of chunk) {
      const ref = doc(col)
      const isIncome = row.type === 'income'
      batch.set(ref, {
        date: Timestamp.fromDate(row.date),
        reference: row.reference,
        code: row.code,
        description: row.description,
        notes: row.notes?.trim() || '',
        debit: row.debit,
        credit: row.credit,
        balance: row.balance,
        currency: row.currency || 'CRC',
        type: row.type,
        isDistributable: isIncome ? !!row.isDistributable : false,
        fixedCosts: isIncome && row.isDistributable ? Number(row.fixedCosts) || 0 : 0,
        importedFrom: row.importedFrom || null,
        createdAt: now,
        updatedAt: now,
        createdBy: uid,
      })
    }

    await batch.commit()
  }

  return rows.length
}
