import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  subscribeToTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransaction,
} from '@/services/transaction.service'
import { formatDateGroup } from '@/shared/utils/formatters'

export const useTransactionStore = defineStore('transactions', () => {
  const transactions = ref([])
  const loading = ref(false)
  const error = ref(null)
  const currentYear = ref(new Date().getFullYear())
  const currentMonth = ref(new Date().getMonth() + 1)

  let _unsubscribe = null

  // ── Computeds ──────────────────────────────────────────────────────────────

  const totalIncome = computed(() =>
    transactions.value
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (t.credit || 0), 0)
  )

  const totalExpense = computed(() =>
    transactions.value
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.debit || 0), 0)
  )

  const balance = computed(() => totalIncome.value - totalExpense.value)

  const distributableIncome = computed(() =>
    transactions.value
      .filter((t) => t.type === 'income' && t.isDistributable)
      .reduce((sum, t) => sum + (t.credit || 0), 0)
  )

  const totalFixedCosts = computed(() =>
    transactions.value
      .filter((t) => t.isDistributable)
      .reduce((sum, t) => sum + (t.fixedCosts || 0), 0)
  )

  const netDistributable = computed(() => distributableIncome.value - totalFixedCosts.value)

  /**
   * Transacciones agrupadas por fecha para renderizar en lista.
   * @returns {[string, object[]][]}  [[etiquetaFecha, [tx, ...]], ...]
   */
  const groupedByDate = computed(() => {
    const map = new Map()
    for (const tx of transactions.value) {
      const key = formatDateGroup(tx.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(tx)
    }
    return Array.from(map.entries())
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Activa la suscripción en tiempo real para un período.
   * Cancela automáticamente la suscripción anterior.
   * @param {string} workspaceId
   * @param {number} year
   * @param {number} month  1-12
   */
  function subscribe(workspaceId, year, month) {
    if (!workspaceId) return

    if (_unsubscribe) _unsubscribe()

    loading.value = true
    error.value = null
    currentYear.value = year
    currentMonth.value = month

    _unsubscribe = subscribeToTransactions(
      workspaceId,
      year,
      month,
      (data) => {
        transactions.value = data
        loading.value = false
      },
      (err) => {
        error.value = err.message
        loading.value = false
      }
    )
  }

  /** Cancela la suscripción activa y limpia los datos. */
  function unsubscribe() {
    if (_unsubscribe) {
      _unsubscribe()
      _unsubscribe = null
    }
    transactions.value = []
  }

  /**
   * @param {string} workspaceId
   * @param {object} formData
   * @param {string} uid
   * @returns {Promise<string>}
   */
  async function addTransaction(workspaceId, formData, uid) {
    return createTransaction(workspaceId, formData, uid)
  }

  /**
   * @param {string} workspaceId
   * @param {string} txId
   * @param {object} data
   */
  async function editTransaction(workspaceId, txId, data) {
    return updateTransaction(workspaceId, txId, data)
  }

  /**
   * @param {string} workspaceId
   * @param {string} txId
   */
  async function removeTransaction(workspaceId, txId) {
    return deleteTransaction(workspaceId, txId)
  }

  /**
   * Lee una transacción individual desde Firestore.
   * @param {string} workspaceId
   * @param {string} txId
   * @returns {Promise<object | null>}
   */
  async function fetchOne(workspaceId, txId) {
    return getTransaction(workspaceId, txId)
  }

  return {
    transactions,
    loading,
    error,
    currentYear,
    currentMonth,
    totalIncome,
    totalExpense,
    balance,
    distributableIncome,
    totalFixedCosts,
    netDistributable,
    groupedByDate,
    subscribe,
    unsubscribe,
    addTransaction,
    editTransaction,
    removeTransaction,
    fetchOne,
  }
})
