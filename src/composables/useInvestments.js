// ── Lógica pura de préstamos/inversiones (testeable sin Firebase) ───────────

/**
 * Calcula la ganancia esperada de un préstamo dado su interés.
 * Solo para referencia visual — no se guarda en Firestore.
 *
 * @param {number} amount        monto prestado (egreso)
 * @param {number} interestRate  porcentaje de interés (ej. 10 = 10%)
 * @returns {number}  monto + interés
 */
export function computeExpectedReturn(amount, interestRate) {
  const base = Number(amount) || 0
  const rate = Number(interestRate) || 0
  return base + (base * rate) / 100
}

/**
 * Capital pendiente de un préstamo: lo prestado menos lo ya devuelto como capital.
 * Puede recibirse en varios pagos parciales, con o sin intereses.
 *
 * @param {number} debit             monto prestado originalmente
 * @param {number} returnedPrincipal capital acumulado ya devuelto
 * @returns {number}
 */
export function computeRemainingPrincipal(debit, returnedPrincipal) {
  return (Number(debit) || 0) - (Number(returnedPrincipal) || 0)
}

/**
 * Estado de un préstamo según cuánto capital se ha devuelto.
 * 'pending'  — no se ha devuelto capital aún (puede haber pagos de solo interés).
 * 'partial'  — se devolvió parte del capital.
 * 'returned' — el capital fue devuelto por completo.
 *
 * @param {number} debit
 * @param {number} returnedPrincipal
 * @returns {'pending'|'partial'|'returned'}
 */
export function computeInvestmentStatus(debit, returnedPrincipal) {
  const returned = Number(returnedPrincipal) || 0
  if (returned <= 0) return 'pending'
  if (computeRemainingPrincipal(debit, returnedPrincipal) <= 0) return 'returned'
  return 'partial'
}

/**
 * Dado un pago de retorno y cuánto de ese pago es capital, calcula el resto
 * como interés. Permite pagos de solo interés (principal = 0) o solo capital
 * (principal = amount).
 *
 * @param {number} amount     monto total de este pago (ingreso)
 * @param {number} principal  porción de ese monto que es capital
 * @returns {number}  porción que es interés
 */
export function computeReturnInterest(amount, principal) {
  return Math.max((Number(amount) || 0) - (Number(principal) || 0), 0)
}

/**
 * Resume la actividad de préstamos/inversiones de un workspace, agrupada por
 * moneda: ganancia total obtenida (suma de intereses de todos los retornos)
 * y el capital que sigue en préstamo en este momento (egresos de inversión
 * con status pending o partial), con el detalle de cada préstamo activo.
 *
 * @param {object[]} transactions  todas las transacciones del workspace
 * @returns {Record<'CRC'|'USD', {
 *   totalGain: number,
 *   outstandingPrincipal: number,
 *   activeLoans: Array<{ id, description, debit, remaining, interestRate, status }>
 * }>}
 */
export function summarizeInvestments(transactions = []) {
  const summary = {}

  function bucket(currency) {
    if (!summary[currency]) {
      summary[currency] = { totalGain: 0, outstandingPrincipal: 0, activeLoans: [] }
    }
    return summary[currency]
  }

  for (const tx of transactions) {
    const currency = tx.currency || 'CRC'

    if (tx.type === 'income' && tx.isInvestmentReturn) {
      bucket(currency).totalGain += tx.investmentGain ?? tx.returnInterest ?? 0
    }

    if (tx.type === 'expense' && tx.isInvestment && tx.investmentStatus !== 'returned') {
      const remaining = computeRemainingPrincipal(tx.debit, tx.returnedPrincipal)
      const b = bucket(currency)
      b.outstandingPrincipal += remaining
      b.activeLoans.push({
        id: tx.id,
        description: tx.description,
        debit: tx.debit || 0,
        remaining,
        interestRate: tx.interestRate || 0,
        status: tx.investmentStatus,
      })
    }
  }

  return summary
}
