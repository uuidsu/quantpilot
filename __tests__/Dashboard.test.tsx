import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../components/Dashboard';
import { vi } from 'vitest';

// Explicitly mock ALL server actions from `@/app/actions`
vi.mock('@/app/actions', () => ({
  createSimulation: vi.fn().mockResolvedValue({}),
  deleteSimulation: vi.fn().mockResolvedValue({}),
  listSimulations: vi.fn().mockResolvedValue([]),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  upsertSymbolMeta: vi.fn().mockResolvedValue({}),
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 22000 }),
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getOptionsStats: vi.fn().mockResolvedValue({}),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
  addHolding: vi.fn().mockResolvedValue({}),
  deleteHolding: vi.fn().mockResolvedValue({}),
  updateHolding: vi.fn().mockResolvedValue({}),
  addStrategy: vi.fn().mockResolvedValue({}),
  deleteStrategy: vi.fn().mockResolvedValue({}),
  updateStrategy: vi.fn().mockResolvedValue({}),
  updateStrategyStatus: vi.fn().mockResolvedValue({}),
  addOptionsTrade: vi.fn().mockResolvedValue({}),
  deleteOptionsTrade: vi.fn().mockResolvedValue({}),
  updateOptionsTrade: vi.fn().mockResolvedValue({}),
  addOptionsTargetMatch: vi.fn().mockResolvedValue({}),
  deleteOptionsTargetMatch: vi.fn().mockResolvedValue({}),
  updateOptionsTargetMatch: vi.fn().mockResolvedValue({}),
  addStockTrade: vi.fn().mockResolvedValue({}),
  deleteStockTrade: vi.fn().mockResolvedValue({}),
  updateStockTrade: vi.fn().mockResolvedValue({}),
  addLoan: vi.fn().mockResolvedValue({}),
  updateLoan: vi.fn().mockResolvedValue({}),
  deleteLoan: vi.fn().mockResolvedValue({}),
  addCashEvent: vi.fn().mockResolvedValue({}),
  updateCashEvent: vi.fn().mockResolvedValue({}),
  deleteCashEvent: vi.fn().mockResolvedValue({}),
  getApiCacheEntries: vi.fn().mockResolvedValue([]),
  getApiUsageEntries: vi.fn().mockResolvedValue([]),
  getOptionsDeltaCacheEntries: vi.fn().mockResolvedValue([]),
  getApiStats: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue({}),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
}));

describe('Dashboard', () => {
  const mockSim = {
    id: 1,
    leverageLimit: 2,
    exposureTarget: 1.5,
    createdAt: new Date().toISOString()
  };

  const onSimChangeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Dashboard and shows loading state initially', () => {
    render(<Dashboard initialData={mockSim} onSimChange={onSimChangeMock} />);

    // Level 1: Smoke & Render
    expect(screen.getByText('初始化中...')).toBeInTheDocument();
    expect(screen.getByText('初始化中...')).toBeVisible();
  });

  it('renders main tabs and navigates between them', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSim} onSimChange={onSimChangeMock} />);

    // Wait for the initialization to complete
    await waitForElementToBeRemoved(() => screen.queryByText('初始化中...'));

    // Level 2: Core User Flows
    // Wait for default "account" tab content to appear
    await waitFor(() => {
      expect(screen.getAllByText('實體帳戶')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('實體帳戶')[0]).toBeVisible();

    // Find the "明細" tab and click it
    const tradesTab = screen.getByText('明細');
    expect(tradesTab).toBeInTheDocument();

    await user.click(tradesTab);

    // Wait for the "trades" tab content to appear
    await waitFor(() => {
      expect(screen.getByText('全部')).toBeInTheDocument();
    });

    expect(screen.getByText('全部')).toBeVisible();

    // Assert old content is not visible
    expect(screen.queryByText('實體帳戶')).not.toBeInTheDocument();
  });
});
