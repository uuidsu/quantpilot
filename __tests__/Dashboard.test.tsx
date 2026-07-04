import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';
import { vi } from 'vitest';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getOptionsStats: vi.fn().mockResolvedValue({}),
  listSimulations: vi.fn().mockResolvedValue([]),
  createSimulation: vi.fn().mockResolvedValue({}),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getApiCacheEntries: vi.fn().mockResolvedValue([]),
  getApiUsageEntries: vi.fn().mockResolvedValue([]),
  getOptionsDeltaCacheEntries: vi.fn().mockResolvedValue([]),
  getApiStats: vi.fn().mockResolvedValue([]),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue({}),
  fetchAndCacheOptionsDelta: vi.fn().mockResolvedValue([]),
}));

// Mock Next.js router hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Dashboard Component Test Progression (Level 1-4)', () => {
  const mockSim: any = { id: 1, name: 'Main', isSimulation: false, balance: '10000', createdAt: new Date() };

  // Level 1: Smoke & Render
  it('renders without crashing and displays the default tab content', async () => {
    render(<Dashboard initialData={mockSim} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/載入中/i)).not.toBeInTheDocument();
    });

    const accountTabs = screen.getAllByRole('button', { name: /帳戶/i });
    expect(accountTabs.length).toBeGreaterThan(0);

    const accountTab = accountTabs[accountTabs.length - 1];
    expect(accountTab).toBeVisible();

    const textSpan = within(accountTab).getByText('帳戶');
    expect(textSpan).toHaveClass('text-primary');
  });

  // Level 2: Core User Flows
  it('allows user to switch between main tabs and updates the view and tab state', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSim} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/載入中/i)).not.toBeInTheDocument();
    });

    const accountTabs = screen.getAllByRole('button', { name: /帳戶/i });
    const tradesTabs = screen.getAllByRole('button', { name: /明細/i });

    const tradesTab = tradesTabs[tradesTabs.length - 1];

    expect(within(accountTabs[accountTabs.length - 1]).getByText('帳戶')).toHaveClass('text-primary');
    expect(within(tradesTab).getByText('明細')).not.toHaveClass('text-primary');

    await user.click(tradesTab);

    await waitFor(() => {
      expect(within(tradesTab).getByText('明細')).toHaveClass('text-primary');
    });

    expect(within(accountTabs[accountTabs.length - 1]).getByText('帳戶')).not.toHaveClass('text-primary');
  });

  // Level 3: Asynchronous & State
  it('handles data fetching and displays data for a sub-tab (database -> usage)', async () => {
    const user = userEvent.setup();
    const mockUsageData = [
      { id: 1, source: 'yahoo', symbol: '2330.TW', success: true, responseTimeMs: 120, createdAt: new Date().toISOString() }
    ];

    (actions.getApiUsageEntries as any).mockResolvedValue(mockUsageData);
    (actions.getApiCacheEntries as any).mockResolvedValue([]);
    (actions.getOptionsDeltaCacheEntries as any).mockResolvedValue([]);

    render(<Dashboard initialData={mockSim} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/載入中/i)).not.toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /更多/i });
    await user.click(moreButton);

    const dbTab = screen.getByRole('button', { name: /資料庫/i });
    await user.click(dbTab);

    await waitFor(() => {
      expect(actions.getApiUsageEntries).toHaveBeenCalled();
    });

    const usageSubTabs = await screen.findAllByRole('button', { name: /API 紀錄/i });
    await user.click(usageSubTabs[0]);

    await waitFor(() => {
      expect(screen.getByText('2330.TW')).toBeInTheDocument();
      expect(screen.getByText(/yahoo/i)).toBeInTheDocument();
    });
  });

  // Level 4: Edge Cases & Web Quirks
  it('correctly handles mobile-like "more" dropdown navigation and validates state updates', async () => {
    const user = userEvent.setup();

    render(<Dashboard initialData={mockSim} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/載入中/i)).not.toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /更多/i });
    await user.click(moreButton);

    const backupTab = screen.getByRole('button', { name: /備份/i });
    expect(backupTab).toBeVisible();

    await user.click(backupTab);

    await waitFor(() => {
      const moreText = within(moreButton).getByText('更多');
      expect(moreText).toHaveClass('text-primary');
    });

    await waitFor(() => {
        expect(screen.queryByText('匯出備份')).toBeVisible();
    });
  });
});
