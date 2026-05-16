import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { describe, it, expect, vi } from 'vitest';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';

vi.mock('@/app/actions', () => ({
  createSimulation: vi.fn(),
  deleteSimulation: vi.fn(),
  listSimulations: vi.fn().mockResolvedValue([]),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  upsertSymbolMeta: vi.fn(),
  getHoldings: vi.fn().mockResolvedValue([]),
  addHolding: vi.fn(),
  deleteHolding: vi.fn(),
  fetchSymbolPrice: vi.fn().mockResolvedValue(100),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([{ id: 'strategy-1', name: 'Strategy 1', leverageLimit: 1.5 }]),
  addStrategy: vi.fn(),
  updateStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  getApiStats: vi.fn().mockResolvedValue({}),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  upsertSourceConfig: vi.fn(),
  setDefaultSource: vi.fn(),
  fetchAndCacheOptionsDelta: vi.fn(),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({}),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  addOptionsTrade: vi.fn(),
  deleteOptionsTrade: vi.fn(),
  getStockTrades: vi.fn().mockResolvedValue([]),
  addStockTrade: vi.fn(),
  deleteStockTrade: vi.fn(),
  deleteAllTrades: vi.fn(),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getLoans: vi.fn().mockResolvedValue([]),
  createLoan: vi.fn(),
  deleteLoan: vi.fn(),
  getApiCacheEntries: vi.fn().mockResolvedValue([]),
  getApiUsageEntries: vi.fn().mockResolvedValue([]),
  getOptionsDeltaCacheEntries: vi.fn().mockResolvedValue([]),
  getOptionsTargets: vi.fn().mockResolvedValue([]),
  createOptionsTarget: vi.fn(),
  deleteOptionsTarget: vi.fn(),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  updateLoan: vi.fn(),
  updateOptionsTarget: vi.fn(),
  updateOptionsTrade: vi.fn(),
  updateStockTrade: vi.fn(),
  getLoanPayments: vi.fn().mockResolvedValue([]),
  addLoanPayment: vi.fn(),
  updateLoanPayment: vi.fn(),
  deleteLoanPayment: vi.fn(),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  addLoanRateEvent: vi.fn(),
  deleteLoanRateEvent: vi.fn(),
  getAppSettings: vi.fn().mockResolvedValue([]),
  upsertAppSetting: vi.fn(),
  getCashEvents: vi.fn().mockResolvedValue([]),
  addCashEvent: vi.fn(),
  deleteCashEvent: vi.fn(),
}));

describe('Dashboard', () => {
  const mockSim: any = {
    id: 'sim-1',
    name: 'Test Sim',
    initialCapital: '10000',
    settings: {
      activeStrategyId: 'strategy-1'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockRouter = {
    back: vi.fn(),
    forward: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };

  it('renders without crashing and displays initial tab content (Level 1)', async () => {
    render(
      <AppRouterContext.Provider value={mockRouter}>
        <Dashboard initialData={mockSim} onSimChange={vi.fn()} />
      </AppRouterContext.Provider>
    );

    await waitFor(() => {
      // 帳戶平衡 is in the UI overview
      expect(screen.getByText(/帳戶平衡/)).toBeInTheDocument();
      expect(screen.getByText('實體帳戶')).toBeInTheDocument();
    });
  });

  it('switches tabs to "明細" and displays empty state (Level 2)', async () => {
    render(
      <AppRouterContext.Provider value={mockRouter}>
        <Dashboard initialData={mockSim} onSimChange={vi.fn()} />
      </AppRouterContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('實體帳戶')).toBeInTheDocument();
    });

    const tradesTab = screen.getAllByText('明細').find(el => el.tagName.toLowerCase() === 'span' && el.parentElement?.tagName.toLowerCase() === 'button');
    if (tradesTab) fireEvent.click(tradesTab);

    await waitFor(() => {
      expect(screen.getByText('全部')).toBeInTheDocument();
      expect(screen.getByText('尚無交易紀錄')).toBeInTheDocument();
    });
  });

  it('navigates to simulator page by clicking "模擬器" tab (Level 2)', async () => {
    render(
      <AppRouterContext.Provider value={mockRouter}>
        <Dashboard initialData={mockSim} onSimChange={vi.fn()} />
      </AppRouterContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('實體帳戶')).toBeInTheDocument();
    });

    // Click "模擬器" tab
    const simTab = screen.getAllByText('模擬器').find(el => el.tagName.toLowerCase() === 'span' && el.parentElement?.tagName.toLowerCase() === 'button');
    if (simTab) fireEvent.click(simTab);

    // Wait for Simulator specific content
    await waitFor(() => {
      expect(screen.getByText('總淨資產')).toBeInTheDocument();
      expect(screen.getByText('大盤指數')).toBeInTheDocument();
    });
  });

  it('navigates to more menu, then "策略" and interacts with form (Level 3)', async () => {
    render(
      <AppRouterContext.Provider value={mockRouter}>
        <Dashboard initialData={mockSim} onSimChange={vi.fn()} />
      </AppRouterContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('實體帳戶')).toBeInTheDocument();
    });

    // Click "更多" tab
    const moreTab = screen.getAllByText('更多').find(el => el.tagName.toLowerCase() === 'span' && el.parentElement?.tagName.toLowerCase() === 'button');
    if (moreTab) fireEvent.click(moreTab);

    // Wait for the MORE_ITEMS menu to appear and click "策略"
    await waitFor(() => {
      const strategyBtn = screen.getAllByText('策略').find(el => el.tagName.toLowerCase() === 'span' && el.parentElement?.tagName.toLowerCase() === 'button');
      expect(strategyBtn).toBeInTheDocument();
    });

    const strategyBtn = screen.getAllByText('策略').find(el => el.tagName.toLowerCase() === 'span' && el.parentElement?.tagName.toLowerCase() === 'button');
    if (strategyBtn) fireEvent.click(strategyBtn);

    // Wait for Strategy page content to appear
    await waitFor(() => {
      expect(screen.getByText('策略參數')).toBeInTheDocument();
      expect(screen.getByText('槓桿倍數上限')).toBeInTheDocument();
    });
  });

  it('opens new trade form in "明細" and displays empty state then opens add form (Level 3)', async () => {
    render(
      <AppRouterContext.Provider value={mockRouter}>
        <Dashboard initialData={mockSim} onSimChange={vi.fn()} />
      </AppRouterContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('實體帳戶')).toBeInTheDocument();
    });

    const tradesTab = screen.getAllByText('明細').find(el => el.tagName.toLowerCase() === 'span' && el.parentElement?.tagName.toLowerCase() === 'button');
    if (tradesTab) fireEvent.click(tradesTab);

    await waitFor(() => {
      expect(screen.getByText('全部')).toBeInTheDocument();
    });

    const allPlusButtons = screen.getAllByRole('button');
    const addBtn = allPlusButtons.find(btn => btn.className.includes('lucide-plus') || (btn.querySelector('svg') && btn.querySelector('svg')?.className.baseVal.includes('lucide-plus')));

    if (addBtn) fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('新增交易')).toBeInTheDocument();
      // Since it's trades tab, adding trade might open a modal or form with "新增股票交易"
      expect(screen.getByText('新增股票交易')).toBeInTheDocument();
    });
  });
});
