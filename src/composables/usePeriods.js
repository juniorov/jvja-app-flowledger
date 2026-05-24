import { ref } from 'vue'
import { subscribeToAllTransactions } from '@/services/transaction.service'

// ── Lógica pura (testeable sin Firebase) ─────────────────────────────────────

/**
 * Convierte un valor de fecha (Firestore Timestamp, Date o número) a Date nativo.
 * @param {any} value
 * @returns {Date}
 */
function toDate(value) {
  if (!value) return new Date()
  if (value?.toDate) return value.toDate()
  if (value instanceof Date) return value
  return new Date(value)
}

/**
 * Calcula la distribución de un monto neto entre los participantes del workspace.
 * @param {number} netDistributable
 * @param {Array<{ id: string, name: string, type: string, percentage: number }>} partners
 * @returns {Array<{ id, name, type, percentage, amount }>}
 */
export function calculateDistribution(netDistributable, partners) {
  if (!partners?.length || netDistributable <= 0) return []
  return partners.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    percentage: p.percentage,
    amount: (netDistributable * p.percentage) / 100,
  }))
}

/**
 * Agrupa un array de transacciones por período (mes/año) y moneda.
 * Retorna los períodos ordenados de más reciente a más antiguo.
 *
 * Estructura de cada período:
 * {
 *   key: string,     // 'YYYY-MM' — para ordenar y usar como key de v-for
 *   year: number,
 *   month: number,   // 1-12
 *   currencies: Array<{
 *     currency: 'CRC' | 'USD',
 *     totalIncome: number,
 *     totalExpense: number,
 *     balance: number,
 *     distributableIncome: number,
 *     totalFixedCosts: number,
 *     netDistributable: number,
 *     distribution: Array<{ id, name, type, percentage, amount }>
 *   }>
 * }
 *
 * @param {object[]} transactions
 * @param {object[]} partners  workspace.partners
 * @returns {object[]}
 */
export function groupTransactionsByPeriod(transactions, partners = []) {
  // Acumular por clave 'YYYY-MM' + moneda
  const periodMap = new Map()

  for (const tx of transactions) {
    const d = toDate(tx.date)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const key = `${year}-${String(month).padStart(2, '0')}`
    const currency = tx.currency || 'CRC'

    if (!periodMap.has(key)) {
      periodMap.set(key, { key, year, month, byCurrency: {} })
    }

    const period = periodMap.get(key)

    if (!period.byCurrency[currency]) {
      period.byCurrency[currency] = {
        totalIncome: 0,
        totalExpense: 0,
        distributableIncome: 0,
        totalFixedCosts: 0,
      }
    }

    const c = period.byCurrency[currency]
    c.totalIncome += tx.credit || 0
    c.totalExpense += tx.debit || 0

    if (tx.isDistributable && tx.type === 'income') {
      c.distributableIncome += tx.credit || 0
      c.totalFixedCosts += tx.fixedCosts || 0
    }
  }

  // Calcular derivados y armar array de currencies por período
  const periods = []

  for (const [, period] of periodMap) {
    const currencies = []

    // CRC primero, luego USD, para orden consistente
    for (const currency of ['CRC', 'USD']) {
      const c = period.byCurrency[currency]
      if (!c) continue

      const netDistributable = c.distributableIncome - c.totalFixedCosts

      currencies.push({
        currency,
        totalIncome: c.totalIncome,
        totalExpense: c.totalExpense,
        balance: c.totalIncome - c.totalExpense,
        distributableIncome: c.distributableIncome,
        totalFixedCosts: c.totalFixedCosts,
        netDistributable,
        distribution: calculateDistribution(netDistributable, partners),
      })
    }

    periods.push({ key: period.key, year: period.year, month: period.month, currencies })
  }

  // Orden descendente (más reciente primero)
  return periods.sort((a, b) => b.key.localeCompare(a.key))
}

// ── Composable ─────────────────────────────────────────────────────────────────

/**
 * Composable para el módulo de períodos.
 * Se suscribe a TODAS las transacciones del workspace y expone el array crudo.
 * El componente agrupa llamando a groupTransactionsByPeriod() con los partners.
 */
export function usePeriods() {
  const transactions = ref([])
  const loading = ref(false)
  const error = ref('')
  let _unsubscribe = null

  /**
   * Activa la suscripción en tiempo real a todas las transacciones.
   * @param {string} workspaceId
   */
  function subscribe(workspaceId) {
    if (!workspaceId) return
    if (_unsubscribe) _unsubscribe()

    loading.value = true
    error.value = ''

    _unsubscribe = subscribeToAllTransactions(
      workspaceId,
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

  /** Cancela la suscripción y limpia los datos. */
  function unsubscribe() {
    if (_unsubscribe) {
      _unsubscribe()
      _unsubscribe = null
    }
    transactions.value = []
  }

  return {
    transactions,
    loading,
    error,
    subscribe,
    unsubscribe,
  }
}
