import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([{ id: 1, name: '策略A' }, { id: 2, name: '策略B' }]),
  getOptionsTrades: vi.fn().mockResolvedValue([{ id: 1, callPut: 'C', strikePrice: 20000, action: 'BUY', quantity: 2 }]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getSymbolMetas: vi.fn().mockResolvedValue([{ symbol: '2330', beta: 1.1, currentPrice: 1000 }]),
  getOptionsStats: vi.fn().mockResolvedValue([]),
  listSimulations: vi.fn().mockResolvedValue([{ id: 1, name: 'Sim 1' }]),
  getStockTrades: vi.fn().mockResolvedValue([{ id: 1, symbol: '2330', action: 'BUY', quantity: 1000 }]),
  getLoans: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 20000, timestamp: 12345 }),
  addStrategy: vi.fn().mockResolvedValue({ id: 1, name: '預設策略' }),
  deleteSimulation: vi.fn().mockResolvedValue({}),
  updateSimulation: vi.fn().mockResolvedValue({}),
  getOptionsApiStats: vi.fn().mockResolvedValue({ calls: [], cooldownUntil: null }),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  fetchOptionsData: vi.fn().mockResolvedValue([]),
  executeSyncRemote: vi.fn().mockResolvedValue({ success: true })
}));

describe('Dashboard Component - Sync Tab Level 4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies UI elements render and function as expected (Level 1-2)', async () => {
    render(<Dashboard initialData={{ simulation: { id: 1, name: 'Test' }, sims: [] }} onSimChange={() => {}} />);
    await waitFor(() => expect(screen.getByText('更多')).toBeInTheDocument());
  });

  it('renders without crashing, handles async operations, state updates and shows detailed data comparison (Level 3: Asynchronous & State)', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={{ simulation: { id: 1, name: 'Test' }, sims: [] }} onSimChange={() => {}} />);

    // Switch to Sync tab
    await waitFor(() => {
      expect(screen.getByText('更多')).toBeInTheDocument();
    });
    await user.click(screen.getByText('更多'));
    const syncMenuItem = await screen.findByText('同步');
    await user.click(syncMenuItem);

    // Click Compare
    const compareButton = screen.getByText('比對');
    await user.click(compareButton);

    // Verify detailed results after async API completes
    await waitFor(() => {
      expect(screen.getByText('股票元資料')).toBeInTheDocument();
      expect(screen.getByText('選擇權交易')).toBeInTheDocument();
    });

    // Expand the "策略" diff category by finding the row and clicking its expand button
    const strategyCategoryBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('策略'));
    expect(strategyCategoryBtn).toBeDefined();
    await user.click(strategyCategoryBtn!);

    // Wait for the accordion to open and show inner contents
    await waitFor(() => {
      expect(screen.getByText('策略A')).toBeInTheDocument();
      expect(screen.getByText('策略B')).toBeInTheDocument();
    });

    // Check other mock data formatting
    const stockTradesBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('股票交易'));
    await user.click(stockTradesBtn!);
    await waitFor(() => {
      expect(screen.getByText('2330 買 ×1000')).toBeInTheDocument();
    });

    const optTradesBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('選擇權交易'));
    await user.click(optTradesBtn!);
    await waitFor(() => {
      expect(screen.getByText('C20000 買 ×2')).toBeInTheDocument();
    });
  });

  it('handles API failure during sync gracefully (Level 4: Edge Cases)', async () => {
    const user = userEvent.setup();
    // Force API to reject for this test case
    vi.mocked(actions.listSimulations).mockRejectedValueOnce(new Error('API failure'));

    render(<Dashboard initialData={{ simulation: { id: 1, name: 'Test' }, sims: [] }} onSimChange={() => {}} />);

    // Switch to Sync tab
    await waitFor(() => {
      expect(screen.getByText('更多')).toBeInTheDocument();
    });
    await user.click(screen.getByText('更多'));
    const syncMenuItem = await screen.findByText('同步');
    await user.click(syncMenuItem);

    // Click Compare
    const compareButton = screen.getByText('比對');
    await user.click(compareButton);

    // Verify that the initial CTA is restored (error state resets loading state and doesn't show diffs)
    await waitFor(() => {
      expect(screen.getByText('點擊「比對」查看遠端資料狀態')).toBeInTheDocument();
    });
  });

  it('collapses an expanded category correctly (Level 4: Edge Cases)', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={{ simulation: { id: 1, name: 'Test' }, sims: [] }} onSimChange={() => {}} />);

    // Go to Sync
    await waitFor(() => expect(screen.getByText('更多')).toBeInTheDocument());
    await user.click(screen.getByText('更多'));
    await user.click(await screen.findByText('同步'));
    await user.click(screen.getByText('比對'));

    await waitFor(() => expect(screen.getByText('策略')).toBeInTheDocument());

    const strategyCategoryBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('策略'))!;

    // Open
    await user.click(strategyCategoryBtn);
    await waitFor(() => expect(screen.getByText('策略A')).toBeInTheDocument());

    // Close
    await user.click(strategyCategoryBtn);
    await waitFor(() => {
      // It should be removed from the DOM
      expect(screen.queryByText('策略A')).not.toBeInTheDocument();
    });
  });
});
