import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from '../Dashboard';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  getSymbolMetas: vi.fn(),
  getStrategies: vi.fn(),
  addStrategy: vi.fn(),
  getOptionsTrades: vi.fn(),
  getStockTrades: vi.fn(),
  getLoans: vi.fn(),
  getLoanPayments: vi.fn(),
  getLoanRateEvents: vi.fn(),
  getCashEvents: vi.fn(),
  getOptionsTargetMatches: vi.fn(),
  getOptionsPriceMap: vi.fn(),
  fetchMarketIndex: vi.fn(),
  getOptionsApiStats: vi.fn(),
  getSourceConfigs: vi.fn(),
  getAvailableOptionsDates: vi.fn(),
  getAppSettings: vi.fn(),
}));

describe('Dashboard Component - SyncTab', () => {
  const initialData = { id: 1, name: 'Sim 1' };
  const mockOnSimChange = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (actions.listSimulations as any).mockResolvedValue([{ id: 1, name: 'Sim 1' }]);
    (actions.getSymbolMetas as any).mockResolvedValue([]);
    (actions.getStrategies as any).mockResolvedValue([{ id: 1, name: 'Test Strategy' }]);
    (actions.addStrategy as any).mockResolvedValue({ id: 1, name: 'Test Strategy' });
    (actions.getOptionsTrades as any).mockResolvedValue([]);
    (actions.getStockTrades as any).mockResolvedValue([]);
    (actions.getLoans as any).mockResolvedValue([]);
    (actions.getLoanPayments as any).mockResolvedValue([]);
    (actions.getLoanRateEvents as any).mockResolvedValue([]);
    (actions.getCashEvents as any).mockResolvedValue([]);
    (actions.getOptionsTargetMatches as any).mockResolvedValue([]);
    (actions.getOptionsPriceMap as any).mockResolvedValue({});
    (actions.fetchMarketIndex as any).mockResolvedValue({ index: 20000, points: 100, isUp: true, lastUpdated: '2023-01-01' });
    (actions.getOptionsApiStats as any).mockResolvedValue({ calls: [], cooldownUntil: null });
    (actions.getSourceConfigs as any).mockResolvedValue([]);
    (actions.getAvailableOptionsDates as any).mockResolvedValue([]);
    (actions.getAppSettings as any).mockResolvedValue({ dailyRefreshTime: '14:00' });
  });

  const getSyncTabButton = async () => {
    // Open More menu
    const moreBtn = await screen.findByRole('button', { name: /更多/i });
    fireEvent.click(moreBtn);

    // Wait for the modal or menu items to appear, then find the specific Sync button
    // It might be a button with text "同步" inside the more menu
    await waitFor(() => {
      expect(screen.getByText('同步')).toBeInTheDocument();
    });
    return screen.getByRole('button', { name: /同步/i });
  }

  it('Level 1: Renders Dashboard and Sync Tab without crashing', async () => {
    render(<Dashboard initialData={initialData as any} onSimChange={mockOnSimChange} />);

    // Find and click the sync tab
    const syncTab = await getSyncTabButton();
    fireEvent.click(syncTab);

    await waitFor(() => {
      expect(screen.getByText('同步狀態')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /比對/i })).toBeInTheDocument();
    });
  });

  it('Level 2: Sync Tab Core Flow - Fetches and compares remote data', async () => {
    // Setup specific mock data for this test
    (actions.getSymbolMetas as any).mockResolvedValue([{ symbol: 'AAPL', beta: 1.2, currentPrice: 150 }]);
    (actions.getStrategies as any).mockResolvedValue([{ id: 1, name: 'Test Strategy' }]);
    (actions.getOptionsTrades as any).mockResolvedValue([{ id: 1, callPut: 'C', strikePrice: 150, action: 'BUY', quantity: 1 }]);
    (actions.getStockTrades as any).mockResolvedValue([{ id: 1, symbol: 'AAPL', action: 'BUY', quantity: 10 }]);

    render(<Dashboard initialData={initialData as any} onSimChange={mockOnSimChange} />);

    // Go to Sync Tab
    const syncTab = await getSyncTabButton();
    fireEvent.click(syncTab);

    // Click Compare using a more specific query just in case
    const compareBtn = await screen.findByRole('button', { name: /比對/i });
    fireEvent.click(compareBtn);

    // Should see loading text
    expect(screen.getByText(/正在比對/i)).toBeInTheDocument();

    // Wait for the results to load
    await waitFor(() => {
      expect(screen.getByText('模擬')).toBeInTheDocument();
      expect(screen.getByText('股票元資料')).toBeInTheDocument();
      expect(screen.getByText('策略')).toBeInTheDocument();
      expect(screen.getByText('選擇權交易')).toBeInTheDocument();
      expect(screen.getByText('股票交易')).toBeInTheDocument();
    });

    // Expand the '策略' table to see specific contents
    const strategiesRow = screen.getByRole('button', { name: /策略.*1 筆/i });
    fireEvent.click(strategiesRow);

    await waitFor(() => {
      expect(screen.getByText('Test Strategy')).toBeInTheDocument();
      expect(screen.getByText('一致')).toBeInTheDocument();
    });
  });

  it('Level 3: Sync Tab Edge Case - Compare button is disabled while loading', async () => {
    // Make listSimulations never resolve to simulate loading
    let resolveMock: any;
    const promise = new Promise(resolve => { resolveMock = resolve; });
    (actions.listSimulations as any).mockReturnValue(promise);

    render(<Dashboard initialData={initialData as any} onSimChange={mockOnSimChange} />);

    const syncTab = await getSyncTabButton();
    fireEvent.click(syncTab);

    const compareBtn = await screen.findByRole('button', { name: /比對/i });
    fireEvent.click(compareBtn);

    // Verify it becomes disabled
    expect(compareBtn).toBeDisabled();

    // Resolve so it cleans up
    resolveMock([{ id: 1, name: 'Sim 1' }]);

    await waitFor(() => {
      expect(compareBtn).not.toBeDisabled();
    });
  });

});
