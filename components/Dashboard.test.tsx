import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { vi } from 'vitest';

// Mock all server actions to prevent real API/DB calls
vi.mock('@/app/actions', () => ({
  createSimulation: vi.fn(),
  deleteSimulation: vi.fn(),
  listSimulations: vi.fn().mockResolvedValue([]),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  upsertSymbolMeta: vi.fn(),
  getPositions: vi.fn().mockResolvedValue([]),
  updateLeverageLimit: vi.fn(),
  updateExposureTarget: vi.fn(),
  getStrategies: vi.fn().mockResolvedValue([{ id: 1, name: '預設策略', leverageLimit: 1.5, leverageCap: null, exposureTarget: 1.0, simulationId: 1, createdAt: new Date(), updatedAt: new Date() }]),
  addStrategy: vi.fn(),
  updateStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  searchStocks: vi.fn().mockResolvedValue([]),
  fetchSymbolPrice: vi.fn().mockResolvedValue({}),
  fetchAndCacheOptionsDelta: vi.fn().mockResolvedValue([]),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  addOptionsTrade: vi.fn(),
  updateOptionsTrade: vi.fn(),
  deleteOptionsTrade: vi.fn(),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getOptionsStats: vi.fn().mockResolvedValue({}),
  getStockTrades: vi.fn().mockResolvedValue([]),
  addStockTrade: vi.fn(),
  updateStockTrade: vi.fn(),
  deleteStockTrade: vi.fn(),
  getLoans: vi.fn().mockResolvedValue([]),
  addLoan: vi.fn(),
  updateLoan: vi.fn(),
  deleteLoan: vi.fn(),
  getLoanPayments: vi.fn().mockResolvedValue([]),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  addLoanPayment: vi.fn(),
  deleteLoanPayment: vi.fn(),
  getCashEvents: vi.fn().mockResolvedValue([]),
  addCashEvent: vi.fn(),
  updateCashEvent: vi.fn(),
  deleteCashEvent: vi.fn(),
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 22000 }),
  getApiStats: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({}),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  upsertSourceConfig: vi.fn(),
  setDefaultSource: vi.fn(),
  getDefaultSource: vi.fn().mockResolvedValue(null),
}));

// Mock sonner to prevent missing elements or contexts
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock initial data
const mockSimulation = {
  id: 1,
  name: 'Test Simulation',
  leverageLimit: 2,
  exposureTarget: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Dashboard (Level 1: Smoke & Render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and resolves loading state to show dashboard content', async () => {
    // Act
    render(<Dashboard initialData={mockSimulation as any} onSimChange={vi.fn()} />);

    // Assertion 1: Wait for initialization to finish and confirm loading screen is gone
    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // Assertion 2: Verify main tab "帳戶" exists
    expect(screen.getByText('帳戶')).toBeInTheDocument();

    // Assertion 3: Verify the "實體帳戶" section label which is part of the Account tab in Dashboard
    expect(screen.getAllByText('實體帳戶').length).toBeGreaterThan(0);

    // Assertion 4: Verify "模擬器" tab exists
    expect(screen.getByText('模擬器')).toBeInTheDocument();
  });
});
