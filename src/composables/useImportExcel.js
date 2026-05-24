import { ref } from 'vue'
import * as XLSX from 'xlsx'

// ── Helpers de parseo ─────────────────────────────────────────────────────────

/**
 * Parsea una fecha en formato dd/MM/yyyy (extracto BCR) a un objeto Date.
 * @param {string} str
 * @returns {Date | null}
 */
export function parseBCRDate(str) {
  if (!str || typeof str !== 'string') return null
  const parts = str.trim().split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (!day || !month || !year) return null
  const d = new Date(year, month - 1, day)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Parsea un número de una celda Excel (puede venir como string con comas o como número).
 * @param {any} val
 * @returns {number}
 */
export function parseCellNumber(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const str = String(val).replace(/,/g, '').trim()
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

/** Regex para detectar fecha en formato dd/MM/yyyy o d/M/yyyy */
const DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{4}$/

/**
 * Detecta la moneda del extracto BCR leyendo la fila 5, columna 5 del archivo.
 * El BCR coloca 'CRC' o 'USD' en esa celda del encabezado de metadata.
 *
 * @param {any[][]} rawRows  resultado de sheet_to_json({ header: 1 })
 * @returns {'CRC' | 'USD' | null}  null si no se puede determinar
 */
export function detectCurrency(rawRows) {
  const val = String(rawRows[5]?.[5] ?? '').trim().toUpperCase()
  if (val === 'CRC' || val === 'USD') return val
  // Coincidencia parcial por si la celda contiene texto más largo (ej: "Moneda: CRC")
  if (val.includes('CRC')) return 'CRC'
  if (val.includes('USD')) return 'USD'
  return null
}

/**
 * Parsea las filas crudas de SheetJS al modelo de transacción.
 * Auto-detecta la primera fila de datos buscando la primera celda [0] con
 * formato dd/MM/yyyy — sin asumir un número fijo de filas de metadata.
 *
 * Mapeo de columnas BCR:
 *   [0] → date (dd/MM/yyyy)
 *   [1] → reference
 *   [3] → code  (TF, CP, MD…)
 *   [4] → description
 *   [7] → debit
 *   [8] → credit
 *   [9] → balance
 *
 * @param {any[][]} rawRows  resultado de sheet_to_json({ header: 1 })
 * @param {string} sourceFile  nombre del archivo origen
 * @param {'CRC' | 'USD'} currency  moneda a asignar a todas las transacciones
 * @returns {object[]}
 */
export function parseRawRows(rawRows, sourceFile = '', currency = 'CRC') {
  // Encontrar la primera fila que tenga una fecha válida en columna 0
  let dataStart = -1
  for (let i = 0; i < rawRows.length; i++) {
    const val = String(rawRows[i][0] ?? '').trim()
    if (DATE_RE.test(val) && parseBCRDate(val) !== null) {
      dataStart = i
      break
    }
  }

  if (dataStart === -1) return []

  const parsed = []

  for (let i = dataStart; i < rawRows.length; i++) {
    const row = rawRows[i]
    const dateVal = String(row[0] ?? '').trim()

    // Parar en fila con Fecha vacía → inicio del cuadro de resumen del banco
    if (!dateVal) break

    const date = parseBCRDate(dateVal)
    if (!date) break

    const debit = parseCellNumber(row[7])
    const credit = parseCellNumber(row[8])

    parsed.push({
      _key: crypto.randomUUID(),
      date,
      dateStr: dateVal,
      reference: String(row[1] ?? '').trim(),
      code: String(row[3] ?? '').trim(),
      description: String(row[4] ?? '').trim(),
      debit,
      credit,
      balance: parseCellNumber(row[9]),
      currency,
      type: credit > 0 ? 'income' : 'expense',
      // Campos editables por el usuario
      notes: '',
      isDistributable: false,
      fixedCosts: 0,
      // Estado
      isDuplicate: false,
      includeInImport: true,
      importedFrom: sourceFile,
    })
  }

  return parsed
}

// ── Composable ─────────────────────────────────────────────────────────────────

/**
 * Composable para importar extractos bancarios del BCR en formato Excel (.xls/.xlsx).
 *
 * Flujo típico:
 * 1. parseFile(file)           → llena `rows` con las transacciones parseadas
 * 2. markDuplicates(existingTxs) → marca filas que ya existen en Firestore
 * 3. Usuario revisa/edita cada fila (notes, isDistributable, fixedCosts, includeInImport)
 * 4. El componente llama a saveBatchTransactions con las filas seleccionadas
 */
export function useImportExcel() {
  const rows = ref([])
  const loading = ref(false)
  const error = ref('')
  const fileName = ref('')
  /**
   * Moneda detectada automáticamente del encabezado del archivo.
   * null = no se pudo detectar → el usuario debe elegir manualmente.
   * @type {import('vue').Ref<'CRC' | 'USD' | null>}
   */
  const detectedCurrency = ref(null)

  /**
   * Parsea un archivo .xls/.xlsx del BCR y llena `rows`.
   * Detecta la moneda automáticamente; si no puede, deja detectedCurrency en null.
   * @param {File} file
   */
  async function parseFile(file) {
    loading.value = true
    error.value = ''
    rows.value = []
    fileName.value = file.name
    detectedCurrency.value = null

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', raw: false, cellDates: false })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      const currency = detectCurrency(rawRows)
      detectedCurrency.value = currency
      rows.value = parseRawRows(rawRows, file.name, currency ?? 'CRC')

      if (rows.value.length === 0) {
        error.value =
          'No se encontraron transacciones en el archivo. Verificá que sea un extracto BCR válido.'
      }
    } catch (err) {
      error.value =
        'No se pudo leer el archivo. Asegurate de que sea un extracto BCR en formato .xls o .xlsx.'
      console.error('[useImportExcel] parseFile error:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Aplica una moneda a todas las filas (para selección manual o corrección del usuario).
   * @param {'CRC' | 'USD'} currency
   */
  function setCurrency(currency) {
    detectedCurrency.value = currency
    rows.value = rows.value.map((row) => ({ ...row, currency }))
  }

  /**
   * Compara las filas parseadas contra transacciones existentes en Firestore.
   * Marca como isDuplicate=true (y desmarca includeInImport) las que ya existen.
   *
   * @param {Array<{ reference: string, date: import('firebase/firestore').Timestamp }>} existingTxs
   */
  function markDuplicates(existingTxs) {
    const existingKeys = new Set(
      existingTxs.map((t) => {
        const d = t.date?.toDate ? t.date.toDate() : new Date(t.date)
        return `${t.reference}__${d.toDateString()}`
      })
    )

    rows.value.forEach((row) => {
      const key = `${row.reference}__${row.date.toDateString()}`
      row.isDuplicate = existingKeys.has(key)
      if (row.isDuplicate) row.includeInImport = false
    })
  }

  /** Reinicia el estado del composable. */
  function reset() {
    rows.value = []
    error.value = ''
    fileName.value = ''
    loading.value = false
    detectedCurrency.value = null
  }

  return {
    rows,
    loading,
    error,
    fileName,
    detectedCurrency,
    parseFile,
    markDuplicates,
    setCurrency,
    reset,
  }
}
