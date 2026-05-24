import { describe, it, expect } from 'vitest'
import { groupTransactionsByPeriod, calculateDistribution } from '../usePeriods'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const partners = [
  { id: 'company', type: 'company', name: 'Empresa',  percentage: 40 },
  { id: 'socioA',  type: 'partner', name: 'Socio A',  percentage: 30 },
  { id: 'socioB',  type: 'partner', name: 'Socio B',  percentage: 30 },
]

/** Helper para crear una transacción de prueba (usa Date nativo, no Timestamp) */
function tx(overrides) {
  return {
    credit: 0,
    debit: 0,
    currency: 'CRC',
    type: 'expense',
    isDistributable: false,
    fixedCosts: 0,
    ...overrides,
  }
}

// ── calculateDistribution ─────────────────────────────────────────────────────

describe('calculateDistribution', () => {
  it('calcula los montos correctamente para 40/30/30', () => {
    const dist = calculateDistribution(1000000, partners)
    expect(dist).toHaveLength(3)
    expect(dist[0].amount).toBe(400000)
    expect(dist[1].amount).toBe(300000)
    expect(dist[2].amount).toBe(300000)
  })

  it('la suma de los montos es igual al neto distribuible', () => {
    const net = 875000
    const dist = calculateDistribution(net, partners)
    const total = dist.reduce((s, d) => s + d.amount, 0)
    expect(total).toBeCloseTo(net)
  })

  it('devuelve array vacío si netDistributable es 0', () => {
    expect(calculateDistribution(0, partners)).toHaveLength(0)
  })

  it('devuelve array vacío si netDistributable es negativo', () => {
    expect(calculateDistribution(-100, partners)).toHaveLength(0)
  })

  it('devuelve array vacío si partners está vacío', () => {
    expect(calculateDistribution(100000, [])).toHaveLength(0)
  })

  it('preserva id, name, type y percentage en cada entrada', () => {
    const dist = calculateDistribution(100, partners)
    expect(dist[0]).toMatchObject({ id: 'company', type: 'company', percentage: 40 })
    expect(dist[1]).toMatchObject({ id: 'socioA',  type: 'partner', percentage: 30 })
  })
})

// ── groupTransactionsByPeriod — agrupamiento ──────────────────────────────────

describe('groupTransactionsByPeriod — agrupamiento', () => {
  it('agrupa transacciones de distintos meses en períodos separados', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 15), credit: 100000, type: 'income' }), // abril
      tx({ date: new Date(2026, 4,  5), credit: 200000, type: 'income' }), // mayo
    ]
    const periods = groupTransactionsByPeriod(txs, partners)
    expect(periods).toHaveLength(2)
  })

  it('agrupa transacciones del mismo mes en un solo período', () => {
    const txs = [
      tx({ date: new Date(2026, 3,  1), credit: 100000, type: 'income' }),
      tx({ date: new Date(2026, 3, 15), credit: 50000,  type: 'income' }),
      tx({ date: new Date(2026, 3, 30), debit:  20000,  type: 'expense' }),
    ]
    const periods = groupTransactionsByPeriod(txs, partners)
    expect(periods).toHaveLength(1)
    expect(periods[0].currencies[0].totalIncome).toBe(150000)
    expect(periods[0].currencies[0].totalExpense).toBe(20000)
  })

  it('ordena los períodos de más reciente a más antiguo', () => {
    const txs = [
      tx({ date: new Date(2026, 0, 1), credit: 100, type: 'income' }), // enero
      tx({ date: new Date(2026, 4, 1), credit: 100, type: 'income' }), // mayo
      tx({ date: new Date(2026, 2, 1), credit: 100, type: 'income' }), // marzo
    ]
    const periods = groupTransactionsByPeriod(txs, partners)
    expect(periods[0].key).toBe('2026-05')
    expect(periods[1].key).toBe('2026-03')
    expect(periods[2].key).toBe('2026-01')
  })

  it('devuelve array vacío si no hay transacciones', () => {
    expect(groupTransactionsByPeriod([], partners)).toHaveLength(0)
  })

  it('asigna correctamente year y month al período', () => {
    const txs = [tx({ date: new Date(2025, 11, 20), credit: 100, type: 'income' })] // diciembre
    const periods = groupTransactionsByPeriod(txs, partners)
    expect(periods[0].year).toBe(2025)
    expect(periods[0].month).toBe(12)
    expect(periods[0].key).toBe('2025-12')
  })
})

// ── groupTransactionsByPeriod — totales ───────────────────────────────────────

describe('groupTransactionsByPeriod — totales por moneda', () => {
  it('calcula balance = totalIncome - totalExpense', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 1), credit: 500000, type: 'income'  }),
      tx({ date: new Date(2026, 3, 2), debit:  120000, type: 'expense' }),
    ]
    const [period] = groupTransactionsByPeriod(txs, partners)
    const crc = period.currencies[0]
    expect(crc.balance).toBe(380000)
  })

  it('separa CRC y USD en secciones distintas dentro del mismo mes', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 1), credit: 100000, currency: 'CRC', type: 'income' }),
      tx({ date: new Date(2026, 3, 2), credit: 500,    currency: 'USD', type: 'income' }),
    ]
    const [period] = groupTransactionsByPeriod(txs, partners)
    expect(period.currencies).toHaveLength(2)
    expect(period.currencies[0].currency).toBe('CRC')
    expect(period.currencies[1].currency).toBe('USD')
  })

  it('no mezcla montos CRC y USD', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 1), credit: 100000, currency: 'CRC', type: 'income' }),
      tx({ date: new Date(2026, 3, 2), credit: 750,    currency: 'USD', type: 'income' }),
    ]
    const [period] = groupTransactionsByPeriod(txs, partners)
    const crc = period.currencies.find((c) => c.currency === 'CRC')
    const usd = period.currencies.find((c) => c.currency === 'USD')
    expect(crc.totalIncome).toBe(100000)
    expect(usd.totalIncome).toBe(750)
  })
})

// ── groupTransactionsByPeriod — distribución ─────────────────────────────────

describe('groupTransactionsByPeriod — distribución', () => {
  it('calcula distribuidbleIncome y totalFixedCosts correctamente', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 1), credit: 400000, type: 'income', isDistributable: true,  fixedCosts: 50000 }),
      tx({ date: new Date(2026, 3, 2), credit: 100000, type: 'income', isDistributable: false, fixedCosts: 0     }),
    ]
    const [period] = groupTransactionsByPeriod(txs, partners)
    const crc = period.currencies[0]
    expect(crc.distributableIncome).toBe(400000)
    expect(crc.totalFixedCosts).toBe(50000)
    expect(crc.netDistributable).toBe(350000)
  })

  it('incluye distribución cuando netDistributable > 0', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 1), credit: 1000000, type: 'income', isDistributable: true }),
    ]
    const [period] = groupTransactionsByPeriod(txs, partners)
    const crc = period.currencies[0]
    expect(crc.distribution).toHaveLength(3)
    expect(crc.distribution[0].amount).toBe(400000) // 40%
    expect(crc.distribution[1].amount).toBe(300000) // 30%
    expect(crc.distribution[2].amount).toBe(300000) // 30%
  })

  it('no incluye distribución si no hay isDistributable', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 1), credit: 100000, type: 'income', isDistributable: false }),
    ]
    const [period] = groupTransactionsByPeriod(txs, partners)
    expect(period.currencies[0].distribution).toHaveLength(0)
  })

  it('no incluye distribución si netDistributable es 0', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 1), credit: 100000, type: 'income', isDistributable: true, fixedCosts: 100000 }),
    ]
    const [period] = groupTransactionsByPeriod(txs, partners)
    expect(period.currencies[0].distribution).toHaveLength(0)
  })

  it('no cuenta egresos como distribuibles aunque tengan isDistributable:true', () => {
    const txs = [
      tx({ date: new Date(2026, 3, 1), debit: 50000, type: 'expense', isDistributable: true }),
    ]
    const [period] = groupTransactionsByPeriod(txs, partners)
    expect(period.currencies[0].distributableIncome).toBe(0)
    expect(period.currencies[0].netDistributable).toBe(0)
  })
})
