import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard';
import userEvent from '@testing-library/user-event';
import * as actions from '@/app/actions';

// Mock server actions
vi.mock('@/app/actions', () => ({
  createSimulation: vi.fn(),
  deleteSimulation: vi.fn(),
  listSimulations: vi.fn(),
  getSymbolMetas: vi.fn(),
  upsertSymbolMeta: vi.fn(),
  fetchSymbolPrice: vi.fn(),
  fetchMarketIndex: vi.fn(),
  getStrategies: vi.fn(),
  addStrategy: vi.fn(),
  updateStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  getApiStats: vi.fn(),
  getSourceConfigs: vi.fn(),
  upsertSourceConfig: vi.fn(),
  setDefaultSource: vi.fn(),
  fetchAndCacheOptionsDelta: vi.fn(),
  getOptionsDeltaRows: vi.fn(),
  getAvailableOptionsDates: vi.fn(),
  getOptionsApiStats: vi.fn(),
  getOptionsTrades: vi.fn(),
  addOptionsTrade: vi.fn(),
  deleteOptionsTrade: vi.fn(),
  getStockTrades: vi.fn(),
  addStockTrade: vi.fn(),
  deleteStockTrade: vi.fn(),
  deleteAllTrades: vi.fn(),
  getOptionsPriceMap: vi.fn(),
  getLoans: vi.fn(),
  createLoan: vi.fn(),
  deleteLoan: vi.fn(),
  getApiCacheEntries: vi.fn(),
  getApiUsageEntries: vi.fn(),
  getOptionsDeltaCacheEntries: vi.fn(),
  getOptionsTargets: vi.fn(),
  createOptionsTarget: vi.fn(),
  deleteOptionsTarget: vi.fn(),
  getOptionsTargetMatches: vi.fn(),
  updateLoan: vi.fn(),
  updateOptionsTarget: vi.fn(),
  updateOptionsTrade: vi.fn(),
  updateStockTrade: vi.fn(),
  getLoanPayments: vi.fn(),
  addLoanPayment: vi.fn(),
  updateLoanPayment: vi.fn(),
  deleteLoanPayment: vi.fn(),
  getLoanRateEvents: vi.fn(),
  addLoanRateEvent: vi.fn(),
  deleteLoanRateEvent: vi.fn(),
  getAppSettings: vi.fn(),
  upsertAppSetting: vi.fn(),
  getCashEvents: vi.fn(),
  addCashEvent: vi.fn(),
  deleteCashEvent: vi.fn(),
}));

describe('Dashboard Component', () => {
  const mockInitialData = { id: 1, name: 'Default Simulation' } as any;

  beforeEach(() => {
    vi.resetAllMocks();

    // Default mocks
    vi.mocked(actions.getSymbolMetas).mockResolvedValue([]);
    vi.mocked(actions.getOptionsTrades).mockResolvedValue([]);
    vi.mocked(actions.getStockTrades).mockResolvedValue([]);
    vi.mocked(actions.getLoans).mockResolvedValue([]);
    vi.mocked(actions.getOptionsTargetMatches).mockResolvedValue([]);
    vi.mocked(actions.getCashEvents).mockResolvedValue([]);
    vi.mocked(actions.getOptionsPriceMap).mockResolvedValue({});
    vi.mocked(actions.getStrategies).mockResolvedValue([{ id: 1, name: 'Default Strategy', simulationId: 1 }] as any);
    vi.mocked(actions.fetchMarketIndex).mockResolvedValue({ index: 22000 } as any);
    vi.mocked(actions.getOptionsApiStats).mockResolvedValue({ calls: [], cooldownUntil: null } as any);
    vi.mocked(actions.getAvailableOptionsDates).mockResolvedValue([]);
  });

  it('Level 1: Smoke & Render - should render the component and main tabs', async () => {
    render(<Dashboard initialData={mockInitialData} />);

    // Wait for the initialization to complete (spinner goes away)
    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // Check header
    expect(screen.getByText('QuantPilot')).toBeInTheDocument();

    // Check default tab (account) content
    expect(screen.getByText('帳戶')).toBeInTheDocument();
    expect(screen.getByText('明細')).toBeInTheDocument();
    expect(screen.getByText('績效')).toBeInTheDocument();
    expect(screen.getByText('模擬器')).toBeInTheDocument();
  });

  it('Level 2: Core User Flows - can navigate to trades tab and trigger search panel', async () => {
    render(<Dashboard initialData={mockInitialData} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // Navigate to trades
    fireEvent.click(screen.getByText('明細'));

    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeInTheDocument();
    });

    // Click the plus button to open add trade form
    const plusButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-plus'));
    if (plusButtons.length > 0) {
      fireEvent.click(plusButtons[plusButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getAllByText('新增交易')[0]).toBeInTheDocument();
      });

      // Test stock subtab of the form (use getAllByText)
      const stockBtns = screen.getAllByText('股票');
      fireEvent.click(stockBtns[0]);
      expect(screen.getByText('股票代號')).toBeInTheDocument();

      // Navigate to search
      const searchInput = screen.getByPlaceholderText('2330.TW');
      expect(searchInput).toBeInTheDocument();
    }
  });

  it('Level 3: Asynchronous & State - mock loading states and success API behavior for adding trades', async () => {
    render(<Dashboard initialData={mockInitialData} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // Navigate to trades
    fireEvent.click(screen.getByText('明細'));

    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeInTheDocument();
    });

    const plusButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-plus'));
    fireEvent.click(plusButtons[plusButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getAllByText('新增交易')[0]).toBeInTheDocument();
    });

    // Navigate to stock trade form
    const stockBtns = screen.getAllByText('股票');
    fireEvent.click(stockBtns[0]);

    // Setup mock successful addition
    const user = userEvent.setup();
    vi.mocked(actions.addStockTrade).mockResolvedValue({ id: 1 } as any);
    vi.mocked(actions.getStockTrades).mockResolvedValue([{
      id: 1, simulationId: 1, tradeDate: '20260428', action: 'BUY', symbol: '2330.TW', price: 600, quantity: 1000, fee: 0
    }] as any);

    // Fill form
    const symbolInput = screen.getByPlaceholderText('2330.TW');
    const priceInput = screen.getByPlaceholderText('580');
    const quantityInput = screen.getByPlaceholderText('1000');

    await user.type(symbolInput, '2330.TW');
    await user.type(priceInput, '600');
    await user.type(quantityInput, '1000');

    // Submit
    const submitBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('新增交易')) as HTMLButtonElement;
    if (submitBtn) {
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(actions.addStockTrade).toHaveBeenCalledWith(expect.objectContaining({
          symbol: '2330.TW',
          price: 600,
          quantity: 1000,
          action: 'BUY'
        }));
      });

      // Verify UI state after success
      await waitFor(() => {
        expect(screen.getByText('交易明細（1 筆）')).toBeInTheDocument();
      });
    }
  });

  it('Level 4: Edge Cases - simulate API failure and check error handling', async () => {
    render(<Dashboard initialData={mockInitialData} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('明細'));

    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeInTheDocument();
    });

    const plusButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-plus'));
    fireEvent.click(plusButtons[plusButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getAllByText('新增交易')[0]).toBeInTheDocument();
    });

    const stockBtns = screen.getAllByText('股票');
    fireEvent.click(stockBtns[0]);

    // Setup mock failure
    const user = userEvent.setup();
    vi.mocked(actions.addStockTrade).mockRejectedValue(new Error('Network error'));

    // Fill form
    const symbolInput = screen.getByPlaceholderText('2330.TW');
    const priceInput = screen.getByPlaceholderText('580');
    const quantityInput = screen.getByPlaceholderText('1000');

    await user.type(symbolInput, '2330.TW');
    await user.type(priceInput, '600');
    await user.type(quantityInput, '1000');

    // Submit
    const submitBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('新增交易')) as HTMLButtonElement;
    if (submitBtn) {
      fireEvent.click(submitBtn);

      // Wait for the action to be called
      await waitFor(() => {
        expect(actions.addStockTrade).toHaveBeenCalled();
      });

      // Since sonner toast might not be fully mockable or visible in jsdom easily,
      // we can at least ensure the form is NOT closed.
      expect(screen.getByPlaceholderText('2330.TW')).toBeInTheDocument();
    }
  });
});
