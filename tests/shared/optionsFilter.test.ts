import { describe, it, expect } from 'vitest'
import { filterOptionsRows, extractContractMonths, classifyContractMonth } from '../../shared/optionsFilter'

describe('optionsFilter', () => {
  it('filterOptionsRows filters by callPut', () => {
    const rows = [
      { callPut: 'Call', contractMonth: '202401', delta: 0.5, strikePrice: 100 },
      { callPut: 'Put', contractMonth: '202401', delta: -0.5, strikePrice: 100 },
    ] as any[]

    const res = filterOptionsRows(rows, {
      callPut: 'Call',
      contractMonth: 'ALL',
      deltaMin: '',
      deltaMax: '',
      strikePriceMin: '',
      strikePriceMax: ''
    })

    expect(res).toHaveLength(1)
    expect(res[0].callPut).toBe('Call')
  })

  it('filterOptionsRows filters by delta bounds', () => {
    const rows = [
      { callPut: 'Call', contractMonth: '202401', delta: 0.2, strikePrice: 100 },
      { callPut: 'Call', contractMonth: '202401', delta: 0.5, strikePrice: 100 },
      { callPut: 'Call', contractMonth: '202401', delta: 0.8, strikePrice: 100 },
    ] as any[]

    const res = filterOptionsRows(rows, {
      callPut: 'ALL',
      contractMonth: 'ALL',
      deltaMin: '0.3',
      deltaMax: '0.6',
      strikePriceMin: '',
      strikePriceMax: ''
    })

    expect(res).toHaveLength(1)
    expect(res[0].delta).toBe(0.5)
  })

  it('extractContractMonths sorts unique months', () => {
    const rows = [
      { contractMonth: '202402' },
      { contractMonth: '202401' },
      { contractMonth: '202402' },
      { contractMonth: '202403' },
    ] as any[]

    const res = extractContractMonths(rows)
    expect(res).toEqual(['202401', '202402', '202403'])
  })

  it('classifyContractMonth identifies near and next months', () => {
    const allMonths = ['202401', '202402', '202403']

    expect(classifyContractMonth('202401', allMonths)).toBe('近月')
    expect(classifyContractMonth('202402', allMonths)).toBe('次月')
    expect(classifyContractMonth('202403', allMonths)).toBeNull()
    expect(classifyContractMonth('202312', allMonths)).toBeNull()
  })
})
