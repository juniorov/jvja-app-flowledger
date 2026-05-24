import { describe, it, expect } from 'vitest'
import { parseBCRDate, parseCellNumber, parseRawRows } from '../useImportExcel'

// ── parseBCRDate ──────────────────────────────────────────────────────────────

describe('parseBCRDate', () => {
  it('parsea una fecha válida dd/MM/yyyy', () => {
    const d = parseBCRDate('15/03/2024')
    expect(d).toBeInstanceOf(Date)
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(2)   // 0-based → marzo
    expect(d.getDate()).toBe(15)
  })

  it('parsea fecha con día y mes de un dígito', () => {
    const d = parseBCRDate('01/01/2025')
    expect(d).toBeInstanceOf(Date)
    expect(d.getDate()).toBe(1)
    expect(d.getMonth()).toBe(0)
  })

  it('devuelve null para string vacío', () => {
    expect(parseBCRDate('')).toBeNull()
  })

  it('devuelve null para undefined', () => {
    expect(parseBCRDate(undefined)).toBeNull()
  })

  it('devuelve null para formato incorrecto', () => {
    expect(parseBCRDate('2024-03-15')).toBeNull()
    expect(parseBCRDate('abc')).toBeNull()
    expect(parseBCRDate('15/03')).toBeNull()
  })

  it('ignora espacios al inicio y final', () => {
    const d = parseBCRDate('  15/03/2024  ')
    expect(d).toBeInstanceOf(Date)
    expect(d.getDate()).toBe(15)
  })
})

// ── parseCellNumber ───────────────────────────────────────────────────────────

describe('parseCellNumber', () => {
  it('devuelve el número tal cual si ya es number', () => {
    expect(parseCellNumber(12345.67)).toBe(12345.67)
    expect(parseCellNumber(0)).toBe(0)
  })

  it('parsea strings con comas de miles', () => {
    expect(parseCellNumber('1,234,567.89')).toBe(1234567.89)
    expect(parseCellNumber('500,000')).toBe(500000)
  })

  it('parsea strings sin comas', () => {
    expect(parseCellNumber('9876')).toBe(9876)
  })

  it('devuelve 0 para valores vacíos', () => {
    expect(parseCellNumber('')).toBe(0)
    expect(parseCellNumber(null)).toBe(0)
    expect(parseCellNumber(undefined)).toBe(0)
  })

  it('devuelve 0 para strings no numéricos', () => {
    expect(parseCellNumber('abc')).toBe(0)
  })
})

// ── parseRawRows ──────────────────────────────────────────────────────────────

/**
 * Construye un array de arrays que simula el formato del extracto BCR.
 * Las filas de metadata usan texto no-fecha en columna 0 para no confundir al detector.
 * Filas 0-10: metadata (sin fechas), Fila 11: encabezados, Filas 12+: datos reales.
 */
function buildRawRows(dataRows) {
  const filler = Array.from({ length: 12 }, (_, i) => [`metadata ${i}`, '', '', '', '', '', '', '', '', ''])
  return [...filler, ...dataRows]
}

describe('parseRawRows', () => {
  it('parsea filas de datos correctamente', () => {
    const dataRows = [
      ['15/03/2024', 'REF001', '', 'TF', 'Pago cliente A', '', '', 0, 500000, 1000000],
      ['16/03/2024', 'REF002', '', 'CP', 'Factura proveedor', '', '', 120000, 0, 880000],
    ]
    const rows = parseRawRows(buildRawRows(dataRows), 'extracto.xlsx')

    expect(rows).toHaveLength(2)

    const row0 = rows[0]
    expect(row0.dateStr).toBe('15/03/2024')
    expect(row0.reference).toBe('REF001')
    expect(row0.code).toBe('TF')
    expect(row0.description).toBe('Pago cliente A')
    expect(row0.debit).toBe(0)
    expect(row0.credit).toBe(500000)
    expect(row0.balance).toBe(1000000)
    expect(row0.type).toBe('income')
    expect(row0.currency).toBe('CRC')
    expect(row0.notes).toBe('')
    expect(row0.isDistributable).toBe(false)
    expect(row0.fixedCosts).toBe(0)
    expect(row0.includeInImport).toBe(true)
    expect(row0.isDuplicate).toBe(false)
    expect(row0.importedFrom).toBe('extracto.xlsx')
    expect(row0._key).toBeTruthy()

    const row1 = rows[1]
    expect(row1.type).toBe('expense')
    expect(row1.debit).toBe(120000)
    expect(row1.credit).toBe(0)
  })

  it('devuelve array vacío si no hay filas de datos', () => {
    const rows = parseRawRows(buildRawRows([]))
    expect(rows).toHaveLength(0)
  })

  it('para al encontrar una fila con Fecha vacía', () => {
    const dataRows = [
      ['15/03/2024', 'REF001', '', 'TF', 'Ingreso 1', '', '', 0, 100000, 200000],
      ['', '', '', '', '', '', '', '', '', ''],  // fila vacía = inicio del resumen
      ['16/03/2024', 'REF002', '', 'TF', 'Ingreso 2', '', '', 0, 50000, 250000], // no debe leerse
    ]
    const rows = parseRawRows(buildRawRows(dataRows))
    expect(rows).toHaveLength(1)
    expect(rows[0].reference).toBe('REF001')
  })

  it('ignora las filas de metadata (sin fecha dd/MM/yyyy en columna 0)', () => {
    // Las filas de metadata tienen texto no-fecha en columna 0
    const raw = []
    for (let i = 0; i < 12; i++) {
      raw.push([`Cuenta corriente ${i}`, `META${i}`, '', '', 'metadata', '', '', 0, 0, 0])
    }
    raw.push(['15/03/2024', 'REAL001', '', 'TF', 'Real', '', '', 0, 100, 100])

    const rows = parseRawRows(raw)
    expect(rows).toHaveLength(1)
    expect(rows[0].reference).toBe('REAL001')
  })

  it('auto-detecta el inicio aunque haya más o menos filas de metadata', () => {
    // Simula un extracto con solo 5 filas de metadata en lugar de 12
    const raw = [
      ['Banco de Costa Rica', '', '', '', '', '', '', '', '', ''],
      ['Cuenta: 12345678', '', '', '', '', '', '', '', '', ''],
      ['Período: Marzo 2024', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['Fecha', 'Referencia', '', 'Código', 'Descripción', '', '', 'Débitos', 'Créditos', 'Saldo'],
      ['15/03/2024', 'REF001', '', 'TF', 'Ingreso', '', '', 0, 100000, 100000],
    ]
    const rows = parseRawRows(raw)
    expect(rows).toHaveLength(1)
    expect(rows[0].reference).toBe('REF001')
    expect(rows[0].credit).toBe(100000)
  })

  it('parsea números con comas de miles desde strings', () => {
    const dataRows = [
      ['15/03/2024', 'REF001', '', 'TF', 'Ingreso', '', '', '0', '1,500,000', '2,000,000'],
    ]
    const rows = parseRawRows(buildRawRows(dataRows))
    expect(rows[0].credit).toBe(1500000)
    expect(rows[0].balance).toBe(2000000)
  })

  it('asigna _key único a cada fila', () => {
    const dataRows = [
      ['15/03/2024', 'REF001', '', 'TF', 'Fila 1', '', '', 0, 100, 100],
      ['16/03/2024', 'REF002', '', 'TF', 'Fila 2', '', '', 0, 200, 300],
    ]
    const rows = parseRawRows(buildRawRows(dataRows))
    expect(rows[0]._key).not.toBe(rows[1]._key)
  })

  it('clasifica como income si credit > 0, expense si debit > 0', () => {
    const dataRows = [
      ['15/03/2024', 'R1', '', '', 'Ingreso', '', '', 0, 100, 100],    // credit > 0
      ['16/03/2024', 'R2', '', '', 'Egreso',  '', '', 50, 0,   50],    // debit > 0
    ]
    const rows = parseRawRows(buildRawRows(dataRows))
    expect(rows[0].type).toBe('income')
    expect(rows[1].type).toBe('expense')
  })

  it('usa la columna [3] para code y [4] para description (no [2])', () => {
    // raw: [0]=date, [1]=ref, [2]=ignored, [3]=code, [4]=description
    const dataRows = [
      ['15/03/2024', 'R1', 'IGNORADO', 'MD', 'Descripcion correcta', '', '', 0, 100, 100],
    ]
    const rows = parseRawRows(buildRawRows(dataRows))
    expect(rows[0].code).toBe('MD')
    expect(rows[0].description).toBe('Descripcion correcta')
  })
})
