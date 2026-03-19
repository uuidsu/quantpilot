import { describe, it, expect } from 'vitest'
import { computePositions, computePortfolioMetrics, computeLeverage } from '../../shared/portfolio'
import type { StockTrade, SymbolMeta } from '../../shared/types'

describe('portfolio module', () => {
  describe('computePositions', () => {
    it('aggregates BUY and SELL trades and computes costBasis accurately', () => {
      const trades: StockTrade[] = [
        { id: 1, userId: 'u1', symbol: 'AAPL', action: 'BUY', quantity: 10, price: 150, tradeDate: '2024-01-01', createdAt: '2024-01-01T10:00:00Z', notes: null },
        { id: 2, userId: 'u1', symbol: 'AAPL', action: 'BUY', quantity: 5, price: 165, tradeDate: '2024-01-02', createdAt: '2024-01-02T10:00:00Z', notes: null },
        { id: 3, userId: 'u1', symbol: 'AAPL', action: 'SELL', quantity: 5, price: 160, tradeDate: '2024-01-03', createdAt: '2024-01-03T10:00:00Z', notes: null },
      ]

      const symbolMetas: SymbolMeta[] = [
        { symbol: 'AAPL', beta: 1.2, currentPrice: 170, priceUpdatedAt: '2024-01-04T10:00:00Z' }
      ]

      const positions = computePositions(trades, symbolMetas)

      expect(positions).toHaveLength(1)
      expect(positions[0].symbol).toBe('AAPL')
      expect(positions[0].shares).toBe(10) // 10 + 5 - 5
      expect(positions[0].costBasis).toBeCloseTo(155, 2) // (10*150 + 5*165) / 15 = 155
      expect(positions[0].currentPrice).toBe(170)
      expect(positions[0].beta).toBe(1.2)
    })

    it('ignores positions with 0 shares', () => {
      const trades: StockTrade[] = [
        { id: 1, userId: 'u1', symbol: 'AAPL', action: 'BUY', quantity: 10, price: 150, tradeDate: '2024-01-01', createdAt: '2024-01-01', notes: null },
        { id: 2, userId: 'u1', symbol: 'AAPL', action: 'SELL', quantity: 10, price: 160, tradeDate: '2024-01-02', createdAt: '2024-01-02', notes: null },
      ]

      const positions = computePositions(trades, [])
      expect(positions).toHaveLength(0)
    })
  })

  describe('computePortfolioMetrics', () => {
    it('calculates metrics with beta adjustment enabled', () => {
      const holdings = [
        { shares: 10, currentPrice: 100, costBasis: 90, beta: 1.5 }
      ]
      const metrics = computePortfolioMetrics(holdings, 500, 10, true) // +10% market adj

      expect(metrics.totalCost).toBe(900)
      expect(metrics.totalCurrentValue).toBe(1000)

      // Stock value: 1000 * (1 + 0.1 * 1.5) = 1000 * 1.15 = 1150
      expect(metrics.totalAdjustedStockValue).toBe(1150)

      // Total Adjusted Value: 1150 + 500 (cash) = 1650
      expect(metrics.totalAdjustedValue).toBe(1650)

      // PnL: 1650 - 900 = 750
      expect(metrics.totalPnL).toBe(750)
      expect(metrics.totalPnLPercent).toBeCloseTo((750 / 900) * 100, 2)
    })

    it('calculates metrics with beta adjustment disabled (legacy mode)', () => {
      const holdings = [
        { shares: 10, currentPrice: 100, costBasis: 90, beta: 1.5 }
      ]
      const metrics = computePortfolioMetrics(holdings, 500, 10, false) // +10% market adj

      expect(metrics.totalCost).toBe(900)
      expect(metrics.totalCurrentValue).toBe(1000)

      // Stock value: 1000 * (1 + 0.1) = 1100 (ignores beta)
      expect(metrics.totalAdjustedStockValue).toBe(1100)
      expect(metrics.totalAdjustedValue).toBe(1600)
    })
  })

  describe('computeLeverage', () => {
    it('calculates leverage within safe limits', () => {
      // adjustedStockValue: 1000, totalValue: 2000, currentValue: 1000
      // Limit 1.5, Cap null
      const res = computeLeverage(1000, 2000, 1000, 1.5, null)

      expect(res.portfolioLeverage).toBe(0.5) // 1000 / 2000
      expect(res.effectiveLeverageLimit).toBe(1.5)
      expect(res.isOverLeverage).toBe(false)
      expect(res.isInfiniteOrNegative).toBe(false)
    })

    it('detects over leverage', () => {
      // adjustedStockValue: 3000, totalValue: 2000
      // Leverage = 1.5, Limit = 1.2
      const res = computeLeverage(3000, 2000, 3000, 1.2, null)

      expect(res.portfolioLeverage).toBe(1.5)
      expect(res.effectiveLeverageLimit).toBe(1.2)
      expect(res.isOverLeverage).toBe(true)
    })

    it('applies leverage cap', () => {
      // limit ratio 2.0. totalValue: 10000 -> maxStock 20000
      // Cap at 15000
      const res = computeLeverage(16000, 10000, 16000, 2.0, 15000)

      expect(res.portfolioLeverage).toBe(1.6)
      expect(res.effectiveLeverageLimit).toBe(1.5) // 15000 / 10000
      expect(res.isOverLeverage).toBe(true)
    })

    it('handles negative or zero total adjusted value', () => {
      // Total value 0, but has current value -> infinite leverage
      const res = computeLeverage(1000, 0, 1000, 1.5, null)

      expect(res.portfolioLeverage).toBe(Infinity)
      expect(res.isInfiniteOrNegative).toBe(true)
      expect(res.isOverLeverage).toBe(false) // Inf treated separately by logic usually, but let's check exact return
    })
  })
})
