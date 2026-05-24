import { describe, it, expect } from 'vitest'
import { computeDistribution, validatePartners } from '../useDistribution'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const partners403030 = [
  { id: 'company', type: 'company', name: 'Empresa',  percentage: 40 },
  { id: 'socioA',  type: 'partner', name: 'Socio A',  percentage: 30 },
  { id: 'socioB',  type: 'partner', name: 'Socio B',  percentage: 30 },
]

function income(overrides) {
  return {
    type: 'income',
    isDistributable: true,
    credit: 0,
    fixedCosts: 0,
    currency: 'CRC',
    date: new Date(2026, 4, 15),
    description: 'Ingreso test',
    notes: '',
    id: crypto.randomUUID(),
    ...overrides,
  }
}

function expense(overrides) {
  return {
    type: 'expense',
    isDistributable: false,
    credit: 0,
    debit: 0,
    fixedCosts: 0,
    currency: 'CRC',
    date: new Date(2026, 4, 15),
    description: 'Egreso test',
    id: crypto.randomUUID(),
    ...overrides,
  }
}

// ── validatePartners ──────────────────────────────────────────────────────────

describe('validatePartners', () => {
  it('no lanza si los porcentajes suman 100%', () => {
    expect(() => validatePartners(partners403030)).not.toThrow()
  })

  it('lanza error si los porcentajes no suman 100%', () => {
    const invalid = [
      { percentage: 40 },
      { percentage: 30 },
      // solo 70%
    ]
    expect(() => validatePartners(invalid)).toThrow(/100%/)
  })

  it('lanza error si la suma excede 100%', () => {
    const invalid = [{ percentage: 60 }, { percentage: 60 }]
    expect(() => validatePartners(invalid)).toThrow(/100%/)
  })

  it('tolera diferencias de punto flotante mínimas (±0.01)', () => {
    // 33.33 * 3 = 99.99 — debería pasar
    const ok = [
      { percentage: 33.34 },
      { percentage: 33.33 },
      { percentage: 33.33 },
    ]
    expect(() => validatePartners(ok)).not.toThrow()
  })
})

// ── computeDistribution — casos básicos ──────────────────────────────────────

describe('computeDistribution — casos básicos', () => {
  it('devuelve {} si no hay transacciones', () => {
    expect(computeDistribution([], partners403030)).toEqual({})
  })

  it('devuelve {} si no hay partners', () => {
    const txs = [income({ credit: 100000 })]
    expect(computeDistribution(txs, [])).toEqual({})
  })

  it('devuelve {} si ninguna transacción es distribuible', () => {
    const txs = [
      income({ credit: 100000, isDistributable: false }),
      expense({ debit: 50000 }),
    ]
    expect(computeDistribution(txs, partners403030)).toEqual({})
  })

  it('ignora egresos aunque tengan isDistributable:true', () => {
    const txs = [
      { ...expense({ debit: 50000 }), isDistributable: true },
    ]
    expect(computeDistribution(txs, partners403030)).toEqual({})
  })
})

// ── computeDistribution — reparto 40/30/30 ───────────────────────────────────

describe('computeDistribution — reparto correcto 40/30/30', () => {
  it('calcula los montos de cada participante correctamente', () => {
    const txs = [income({ credit: 1000000 })]
    const result = computeDistribution(txs, partners403030)

    const { participants } = result.CRC
    expect(participants[0].amount).toBe(400000)  // empresa 40%
    expect(participants[1].amount).toBe(300000)  // socioA 30%
    expect(participants[2].amount).toBe(300000)  // socioB 30%
  })

  it('la suma de los montos es igual al netDistributable', () => {
    const txs = [income({ credit: 750000 })]
    const { netDistributable, participants } = computeDistribution(txs, partners403030).CRC
    const total = participants.reduce((s, p) => s + p.amount, 0)
    expect(total).toBeCloseTo(netDistributable)
  })

  it('preserva id, name, type y percentage en cada participante', () => {
    const txs = [income({ credit: 100000 })]
    const { participants } = computeDistribution(txs, partners403030).CRC
    expect(participants[0]).toMatchObject({ id: 'company', type: 'company', percentage: 40 })
    expect(participants[1]).toMatchObject({ id: 'socioA',  type: 'partner', percentage: 30 })
  })
})

// ── computeDistribution — costos fijos ───────────────────────────────────────

describe('computeDistribution — costos fijos', () => {
  it('descuenta los costos fijos antes de repartir', () => {
    const txs = [income({ credit: 1000000, fixedCosts: 100000 })]
    const { distributableIncome, totalFixedCosts, netDistributable } =
      computeDistribution(txs, partners403030).CRC

    expect(distributableIncome).toBe(1000000)
    expect(totalFixedCosts).toBe(100000)
    expect(netDistributable).toBe(900000)
  })

  it('acumula costos fijos de múltiples transacciones', () => {
    const txs = [
      income({ credit: 500000, fixedCosts: 50000 }),
      income({ credit: 300000, fixedCosts: 30000 }),
    ]
    const { totalFixedCosts, netDistributable } = computeDistribution(txs, partners403030).CRC
    expect(totalFixedCosts).toBe(80000)
    expect(netDistributable).toBe(720000)
  })

  it('calcula la contribución por transacción correctamente', () => {
    // Transacción con 100,000 de crédito y 20,000 de costos fijos
    // Net por transacción = 80,000; contribución empresa (40%) = 32,000
    const txs = [income({ credit: 100000, fixedCosts: 20000, id: 'tx1' })]
    const { participants } = computeDistribution(txs, partners403030).CRC
    const empresa = participants[0]
    expect(empresa.transactions[0].contribution).toBe(32000)
  })
})

// ── computeDistribution — múltiples transacciones ────────────────────────────

describe('computeDistribution — múltiples transacciones', () => {
  it('acumula créditos de múltiples transacciones distribuibles', () => {
    const txs = [
      income({ credit: 400000 }),
      income({ credit: 600000 }),
    ]
    const { distributableIncome } = computeDistribution(txs, partners403030).CRC
    expect(distributableIncome).toBe(1000000)
  })

  it('incluye todas las transacciones distribuibles en el detalle del participante', () => {
    const txs = [
      income({ credit: 200000, id: 'tx1' }),
      income({ credit: 300000, id: 'tx2' }),
    ]
    const { participants } = computeDistribution(txs, partners403030).CRC
    expect(participants[0].transactions).toHaveLength(2)
  })

  it('no incluye transacciones no distribuibles en el detalle', () => {
    const txs = [
      income({ credit: 200000, isDistributable: true  }),
      income({ credit: 100000, isDistributable: false }),
    ]
    const { distributableIncome, participants } = computeDistribution(txs, partners403030).CRC
    expect(distributableIncome).toBe(200000)
    expect(participants[0].transactions).toHaveLength(1)
  })
})

// ── computeDistribution — multimoneda ────────────────────────────────────────

describe('computeDistribution — multimoneda', () => {
  it('separa CRC y USD en claves distintas', () => {
    const txs = [
      income({ credit: 500000, currency: 'CRC' }),
      income({ credit: 1000,   currency: 'USD' }),
    ]
    const result = computeDistribution(txs, partners403030)
    expect(result).toHaveProperty('CRC')
    expect(result).toHaveProperty('USD')
  })

  it('no mezcla montos entre monedas', () => {
    const txs = [
      income({ credit: 500000, currency: 'CRC' }),
      income({ credit: 1000,   currency: 'USD' }),
    ]
    const result = computeDistribution(txs, partners403030)
    expect(result.CRC.distributableIncome).toBe(500000)
    expect(result.USD.distributableIncome).toBe(1000)
  })
})

// ── computeDistribution — error de configuración ─────────────────────────────

describe('computeDistribution — porcentajes inválidos', () => {
  it('lanza error si los porcentajes no suman 100%', () => {
    const txs = [income({ credit: 100000 })]
    const badPartners = [
      { id: 'a', type: 'company', name: 'A', percentage: 50 },
      { id: 'b', type: 'partner', name: 'B', percentage: 30 },
      // 80% total — inválido
    ]
    expect(() => computeDistribution(txs, badPartners)).toThrow(/100%/)
  })
})
