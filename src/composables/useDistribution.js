// ── Lógica pura (testeable sin Firebase) ─────────────────────────────────────

/**
 * Valida que los porcentajes de los participantes sumen exactamente 100%.
 * @param {Array<{ percentage: number }>} partners
 * @throws {Error} si la suma no es 100 (tolerancia ±0.01)
 */
export function validatePartners(partners) {
  const total = partners.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0)
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(
      `Los porcentajes de los participantes deben sumar 100% (actual: ${total.toFixed(2)}%)`
    )
  }
}

/**
 * Computa la distribución por moneda y participante.
 *
 * Retorna un objeto con una clave por moneda presente en las transacciones distribuibles:
 * {
 *   CRC: {
 *     distributableIncome: number,
 *     totalFixedCosts: number,
 *     netDistributable: number,
 *     participants: Array<{
 *       id, name, type, percentage, amount,
 *       transactions: Array<{ id, date, description, notes, credit, fixedCosts, contribution }>
 *     }>
 *   },
 *   USD?: { ... }
 * }
 *
 * @param {object[]} transactions  array crudo de transacciones (con campos del modelo)
 * @param {Array<{ id, name, type, percentage }>} partners
 * @returns {object}
 * @throws {Error} si partners no suman 100%
 */
export function computeDistribution(transactions, partners) {
  if (!transactions?.length || !partners?.length) return {}

  // Solo ingresos marcados como distribuibles
  const distributable = transactions.filter(
    (tx) => tx.isDistributable && tx.type === 'income'
  )
  if (!distributable.length) return {}

  validatePartners(partners)

  // Agrupar por moneda
  const byCurrency = {}
  for (const tx of distributable) {
    const currency = tx.currency || 'CRC'
    if (!byCurrency[currency]) byCurrency[currency] = []
    byCurrency[currency].push(tx)
  }

  const result = {}

  for (const [currency, txs] of Object.entries(byCurrency)) {
    const distributableIncome = txs.reduce((sum, tx) => sum + (tx.credit || 0), 0)
    const totalFixedCosts = txs.reduce((sum, tx) => sum + (tx.fixedCosts || 0), 0)
    const netDistributable = distributableIncome - totalFixedCosts

    const participants = partners.map((partner) => {
      const amount = (netDistributable * partner.percentage) / 100
      const txDetails = txs.map((tx) => {
        const txNet = (tx.credit || 0) - (tx.fixedCosts || 0)
        return {
          id: tx.id ?? tx._key ?? '',
          date: tx.date,
          description: tx.description || '',
          notes: tx.notes || '',
          credit: tx.credit || 0,
          fixedCosts: tx.fixedCosts || 0,
          contribution: (txNet * partner.percentage) / 100,
        }
      })

      return {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        percentage: partner.percentage,
        amount,
        transactions: txDetails,
      }
    })

    result[currency] = {
      distributableIncome,
      totalFixedCosts,
      netDistributable,
      participants,
    }
  }

  return result
}
