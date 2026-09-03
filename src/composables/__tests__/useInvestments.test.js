import { describe, it, expect } from 'vitest'
import {
  computeExpectedReturn,
  computeRemainingPrincipal,
  computeInvestmentStatus,
  computeReturnInterest,
  summarizeInvestments,
} from '../useInvestments'

// ── computeExpectedReturn ─────────────────────────────────────────────────────

describe('computeExpectedReturn', () => {
  it('calcula monto + interés correctamente', () => {
    expect(computeExpectedReturn(100000, 10)).toBe(110000)
  })

  it('retorna el monto original si el interés es 0', () => {
    expect(computeExpectedReturn(50000, 0)).toBe(50000)
  })

  it('maneja interés con decimales', () => {
    expect(computeExpectedReturn(200000, 2.5)).toBe(205000)
  })

  it('retorna 0 si el monto es 0', () => {
    expect(computeExpectedReturn(0, 10)).toBe(0)
  })

  it('trata valores no numéricos como 0', () => {
    expect(computeExpectedReturn(undefined, undefined)).toBe(0)
    expect(computeExpectedReturn(null, null)).toBe(0)
  })
})

// ── computeRemainingPrincipal ─────────────────────────────────────────────────

describe('computeRemainingPrincipal', () => {
  it('retorna el capital completo si no se ha devuelto nada', () => {
    expect(computeRemainingPrincipal(100000, 0)).toBe(100000)
  })

  it('resta lo ya devuelto', () => {
    expect(computeRemainingPrincipal(100000, 40000)).toBe(60000)
  })

  it('retorna 0 si se devolvió el capital completo', () => {
    expect(computeRemainingPrincipal(100000, 100000)).toBe(0)
  })

  it('trata valores no numéricos como 0', () => {
    expect(computeRemainingPrincipal(undefined, undefined)).toBe(0)
  })
})

// ── computeInvestmentStatus ────────────────────────────────────────────────────

describe('computeInvestmentStatus', () => {
  it('es pending si no se ha devuelto capital', () => {
    expect(computeInvestmentStatus(100000, 0)).toBe('pending')
  })

  it('sigue pending si solo se pagaron intereses (capital en 0)', () => {
    expect(computeInvestmentStatus(100000, 0)).toBe('pending')
  })

  it('es partial si se devolvió parte del capital', () => {
    expect(computeInvestmentStatus(100000, 40000)).toBe('partial')
  })

  it('es returned si se devolvió todo el capital', () => {
    expect(computeInvestmentStatus(100000, 100000)).toBe('returned')
  })

  it('es returned si se devolvió más del capital (redondeos)', () => {
    expect(computeInvestmentStatus(100000, 100050)).toBe('returned')
  })
})

// ── computeReturnInterest ──────────────────────────────────────────────────────

describe('computeReturnInterest', () => {
  it('calcula el interés como el resto del pago tras el capital', () => {
    expect(computeReturnInterest(110000, 100000)).toBe(10000)
  })

  it('retorna el monto completo como interés si el capital es 0 (pago solo de intereses)', () => {
    expect(computeReturnInterest(10000, 0)).toBe(10000)
  })

  it('retorna 0 si el pago es solo de capital', () => {
    expect(computeReturnInterest(100000, 100000)).toBe(0)
  })

  it('no retorna negativos si el capital declarado excede el monto', () => {
    expect(computeReturnInterest(50000, 60000)).toBe(0)
  })

  it('trata valores no numéricos como 0', () => {
    expect(computeReturnInterest(undefined, undefined)).toBe(0)
  })
})

// ── summarizeInvestments ────────────────────────────────────────────────────────

describe('summarizeInvestments', () => {
  it('retorna objeto vacío si no hay transacciones', () => {
    expect(summarizeInvestments([])).toEqual({})
  })

  it('suma la ganancia de los retornos por moneda', () => {
    const txs = [
      { type: 'income', isInvestmentReturn: true, investmentGain: 10000, currency: 'CRC' },
      { type: 'income', isInvestmentReturn: true, investmentGain: 5000, currency: 'CRC' },
    ]
    expect(summarizeInvestments(txs).CRC.totalGain).toBe(15000)
  })

  it('usa returnInterest si investmentGain no está presente', () => {
    const txs = [
      { type: 'income', isInvestmentReturn: true, returnInterest: 3000, currency: 'CRC' },
    ]
    expect(summarizeInvestments(txs).CRC.totalGain).toBe(3000)
  })

  it('ignora ingresos que no son retorno de inversión', () => {
    const txs = [
      { type: 'income', isInvestmentReturn: false, credit: 100000, currency: 'CRC' },
    ]
    expect(summarizeInvestments(txs)).toEqual({})
  })

  it('suma el capital pendiente de préstamos activos (pending o partial)', () => {
    const txs = [
      { id: 'a', type: 'expense', isInvestment: true, investmentStatus: 'pending', debit: 100000, returnedPrincipal: 0, currency: 'CRC' },
      { id: 'b', type: 'expense', isInvestment: true, investmentStatus: 'partial', debit: 50000, returnedPrincipal: 20000, currency: 'CRC' },
    ]
    const result = summarizeInvestments(txs)
    expect(result.CRC.outstandingPrincipal).toBe(130000) // 100000 + 30000
    expect(result.CRC.activeLoans).toHaveLength(2)
  })

  it('excluye préstamos ya saldados del capital pendiente', () => {
    const txs = [
      { id: 'a', type: 'expense', isInvestment: true, investmentStatus: 'returned', debit: 100000, returnedPrincipal: 100000, currency: 'CRC' },
    ]
    // Un préstamo ya saldado, sin ninguna otra actividad, no genera ni siquiera el bucket de la moneda
    expect(summarizeInvestments(txs)).toEqual({})
  })

  it('separa CRC y USD', () => {
    const txs = [
      { type: 'income', isInvestmentReturn: true, investmentGain: 1000, currency: 'CRC' },
      { type: 'income', isInvestmentReturn: true, investmentGain: 50, currency: 'USD' },
      { id: 'a', type: 'expense', isInvestment: true, investmentStatus: 'pending', debit: 500, returnedPrincipal: 0, currency: 'USD' },
    ]
    const result = summarizeInvestments(txs)
    expect(result.CRC.totalGain).toBe(1000)
    expect(result.CRC.outstandingPrincipal).toBe(0)
    expect(result.USD.totalGain).toBe(50)
    expect(result.USD.outstandingPrincipal).toBe(500)
  })

  it('incluye los datos del préstamo activo en activeLoans', () => {
    const txs = [
      { id: 'loan1', description: 'Préstamo a Juan', type: 'expense', isInvestment: true, investmentStatus: 'partial', debit: 100000, returnedPrincipal: 40000, interestRate: 10, currency: 'CRC' },
    ]
    const [loan] = summarizeInvestments(txs).CRC.activeLoans
    expect(loan).toMatchObject({
      id: 'loan1',
      description: 'Préstamo a Juan',
      debit: 100000,
      remaining: 60000,
      interestRate: 10,
      status: 'partial',
    })
  })
})
