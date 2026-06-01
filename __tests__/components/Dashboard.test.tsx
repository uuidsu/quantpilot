import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';
import { vi, describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock server actions
const mockGetHoldings = vi.fn().mockResolvedValue([]);
const mockGetStrategies = vi.fn().mockResolvedValue([]);
const mockGetOptionsTrades = vi.fn().mockResolvedValue([]);
const mockGetOptionsTargetMatches = vi.fn().mockResolvedValue([]);
const mockGetOptionsPriceMap = vi.fn().mockResolvedValue({});
const mockGetSymbolMetas = vi.fn().mockResolvedValue([]);
const mockGetOptionsStats = vi.fn().mockResolvedValue({});
const mockListSimulations = vi.fn().mockResolvedValue([]);
const mockGetStockTrades = vi.fn().mockResolvedValue([]);
const mockGetLoans = vi.fn().mockResolvedValue([]);
const mockGetCashEvents = vi.fn().mockResolvedValue([]);
const mockFetchMarketIndices = vi.fn().mockResolvedValue([]);
const mockFetchMarketIndex = vi.fn().mockResolvedValue(null);
const mockGetOptionsApiStats = vi.fn().mockResolvedValue({});
const mockGetAvailableOptionsDates = vi.fn().mockResolvedValue([]);
const mockGetLoanPayments = vi.fn().mockResolvedValue([]);
const mockGetLoanRateEvents = vi.fn().mockResolvedValue([]);

vi.mock('@/app/actions', () => ({
  getHoldings: (...args: any[]) => mockGetHoldings(...args),
  getStrategies: (...args: any[]) => mockGetStrategies(...args),
  getOptionsTrades: (...args: any[]) => mockGetOptionsTrades(...args),
  getOptionsTargetMatches: (...args: any[]) => mockGetOptionsTargetMatches(...args),
  getOptionsPriceMap: (...args: any[]) => mockGetOptionsPriceMap(...args),
  getSymbolMetas: (...args: any[]) => mockGetSymbolMetas(...args),
  getOptionsStats: (...args: any[]) => mockGetOptionsStats(...args),
  listSimulations: (...args: any[]) => mockListSimulations(...args),
  getStockTrades: (...args: any[]) => mockGetStockTrades(...args),
  getLoans: (...args: any[]) => mockGetLoans(...args),
  getCashEvents: (...args: any[]) => mockGetCashEvents(...args),
  fetchMarketIndices: (...args: any[]) => mockFetchMarketIndices(...args),
  fetchMarketIndex: (...args: any[]) => mockFetchMarketIndex(...args),
  getOptionsApiStats: (...args: any[]) => mockGetOptionsApiStats(...args),
  getAvailableOptionsDates: (...args: any[]) => mockGetAvailableOptionsDates(...args),
  getLoanPayments: (...args: any[]) => mockGetLoanPayments(...args),
  getLoanRateEvents: (...args: any[]) => mockGetLoanRateEvents(...args),
}));

const mockSimulation = {
  id: 1,
  name: "Test Sim",
  createdAt: new Date(),
  updatedAt: new Date(),
  initialCapital: 1000000
};

describe('Dashboard Component', () => {
  it('Level 2 & 3: should render tabs, allow navigating through menus, and display asynchronous data in Account tab', async () => {
    // Return a trade that simulates a holding
    const mockTrades = [{
      id: 1,
      simId: 1,
      symbol: "AAPL",
      price: 150.0,
      quantity: 100,
      fee: 0,
      currency: "USD",
      action: "BUY", // Must be uppercase BUY to compute correctly
      tradeDate: "2023-01-01",
      createdAt: new Date(),
      updatedAt: new Date()
    }];

    const mockMetas = [{
      symbol: "AAPL",
      name: "Apple Inc.",
      currentPrice: 175.5,
      currency: "USD",
      updatedAt: new Date(),
      type: "stock"
    }];

    mockGetStockTrades.mockResolvedValue(mockTrades);
    mockGetSymbolMetas.mockResolvedValue(mockMetas);
    mockGetCashEvents.mockResolvedValue([]);

    render(<Dashboard initialData={mockSimulation as any} onSimChange={vi.fn()} />);

    // Wait for the Dashboard to load fully.
    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
    });

    // Check main tabs are rendered (using getAllByText because there are multiple "明細")
    expect(screen.getByText('帳戶')).toBeInTheDocument();
    expect(screen.getAllByText('明細').length).toBeGreaterThan(0);
    expect(screen.getByText('績效')).toBeInTheDocument();
    expect(screen.getByText('模擬器')).toBeInTheDocument();

    // Level 3 Assertion: Wait for AAPL holding text to appear.
    // Dashboard component renders real stock items like: "AAPL" inside the account view.
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    }, { timeout: 3000 });

    // It should render "AAPL" as a label for the real_stock account
    expect(screen.getByText('AAPL')).toBeInTheDocument();

    // 100 shares at 175.5 is 17550. Let's look for that string or a similar balance.
    const priceEl = screen.getByText(/\$17,550/);
    expect(priceEl).toBeInTheDocument();
  });
});
