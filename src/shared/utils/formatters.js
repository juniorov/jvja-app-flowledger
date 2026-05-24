/**
 * Convierte un valor de fecha (Timestamp de Firestore, Date o string) a Date nativo.
 * @param {any} value
 * @returns {Date}
 */
function toDate(value) {
  if (!value) return new Date()
  if (value?.toDate) return value.toDate()     // Firestore Timestamp
  if (value instanceof Date) return value
  return new Date(value)
}

function isSameDay(a, b) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
}

/**
 * Etiqueta para cabecera de grupo en lista de transacciones.
 * Ejemplos: "Hoy", "Ayer", "lunes, 19 de mayo"
 * @param {any} timestamp
 * @returns {string}
 */
export function formatDateGroup(timestamp) {
  const date = toDate(timestamp)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, today)) return 'Hoy'
  if (isSameDay(date, yesterday)) return 'Ayer'

  const str = new Intl.DateTimeFormat('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Fecha corta: "19/05/2026"
 * @param {any} timestamp
 * @returns {string}
 */
export function formatDateShort(timestamp) {
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(toDate(timestamp))
}

/**
 * Fecha larga: "lunes, 19 de mayo de 2026"
 * @param {any} timestamp
 * @returns {string}
 */
export function formatDateLong(timestamp) {
  return new Intl.DateTimeFormat('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(toDate(timestamp))
}

/**
 * Mes y año capitalizado: "Mayo 2026"
 * @param {number} year
 * @param {number} month  1-12
 * @returns {string}
 */
export function formatMonthYear(year, month) {
  const date = new Date(year, month - 1, 1)
  const str = new Intl.DateTimeFormat('es-CR', {
    month: 'long',
    year: 'numeric',
  }).format(date)
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Monto formateado con símbolo de moneda.
 * CRC sin decimales, USD con 2 decimales.
 * @param {number} amount
 * @param {'CRC' | 'USD'} currency
 * @returns {string}
 */
export function formatAmount(amount, currency = 'CRC') {
  const decimals = currency === 'USD' ? 2 : 0
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount || 0)
}

/**
 * Convierte string "YYYY-MM-DD" a Date usando mediodía local
 * para evitar desfases de zona horaria.
 * @param {string} dateString
 * @returns {Date}
 */
export function dateStringToDate(dateString) {
  return new Date(dateString + 'T12:00:00')
}

/**
 * Convierte Timestamp de Firestore o Date a string "YYYY-MM-DD"
 * compatible con input[type=date].
 * @param {any} timestamp
 * @returns {string}
 */
export function dateToInputString(timestamp) {
  const date = toDate(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calcula el mes/año anterior.
 * @param {number} year
 * @param {number} month  1-12
 * @returns {{ year: number, month: number }}
 */
export function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/**
 * Calcula el mes/año siguiente.
 * @param {number} year
 * @param {number} month  1-12
 * @returns {{ year: number, month: number }}
 */
export function nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}
