import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Recharts to avoid layout issues in jsdom
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

// Mock all required actions
vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getOptionsStats: vi.fn().mockResolvedValue({}),
  listSimulations: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({}),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 100 }),
  addStrategy: vi.fn().mockResolvedValue({ id: 1, name: 'Test Strategy' })
}));

const mockSim = {
  id: 1,
  name: "Test Simulation",
  baseCapital: 100000,
  currentCapital: 100000,
  leverageLimit: 1.5,
  description: "Test description"
};

const defaultInitialData = {
  sim: mockSim,
  simulations: [mockSim],
  holdings: [],
  strategies: [],
  optionsTrades: [],
  optionsTargetMatches: [],
  optionsPriceMap: {},
  stockTrades: [],
  symbolMetas: [],
  optionsStats: { symbols: [] },
  loans: [],
  cashEvents: [],
  marketIndices: [],
  optionsApiStats: { source: 'cache' as const, timestamp: Date.now() },
  availableOptionsDates: []
};

describe('Dashboard - Deep Fortification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Level 1 & 2: Smoke, Render & Core Tab Navigation Flows', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={defaultInitialData} />);

    // Level 1: Verify initial rendering of core components
    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeVisible();
      expect(screen.getByText('帳戶平衡 ✓')).toBeVisible();
    });

    // Level 2: Verify main navigation tabs exist by visible text
    const accountTab = screen.getByText('帳戶');
    const simulatorTab = screen.getByText('模擬器');

    expect(accountTab).toBeVisible();
    expect(simulatorTab).toBeVisible();

    // Click on Simulator tab
    await user.click(simulatorTab);

    // Wait for Simulator view to mount and check its distinct content ('總淨資產' comes from Simulator layout)
    await waitFor(() => {
       const simulatorContent = screen.getByText('總淨資產');
       expect(simulatorContent).toBeVisible();
    });

    // Navigate back to Account tab
    await user.click(accountTab);

    // Wait for Account view to mount again
    await waitFor(() => {
       const accountsStatus = screen.getByText('帳戶平衡 ✓');
       expect(accountsStatus).toBeVisible();
    });
  });
});
