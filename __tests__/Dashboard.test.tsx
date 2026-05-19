import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStrategies,
  getOptionsTrades,
  getOptionsTargetMatches,
  getOptionsPriceMap,
  getSymbolMetas,
  getStockTrades,
  listSimulations,
  addStockTrade,
  addStrategy,
  getCashEvents,
  getLoans,
  deleteSimulation,
  fetchMarketIndex,
  getOptionsApiStats,
  getAvailableOptionsDates,
  getOptionsTargets,
  getLoanPayments,
  getLoanRateEvents,
  getApiStats,
  getSourceConfigs,
  getAppSettings,
  getApiCacheEntries,
  getApiUsageEntries,
  getOptionsDeltaCacheEntries
} from '@/app/actions';

// Mock all actions
vi.mock('@/app/actions', () => ({
  getStrategies: vi.fn(),
  getOptionsTrades: vi.fn(),
  getOptionsTargetMatches: vi.fn(),
  getOptionsPriceMap: vi.fn(),
  getSymbolMetas: vi.fn(),
  getStockTrades: vi.fn(),
  listSimulations: vi.fn(),
  addStockTrade: vi.fn(),
  addStrategy: vi.fn(),
  getCashEvents: vi.fn(),
  getLoans: vi.fn(),
  deleteSimulation: vi.fn(),
  fetchMarketIndex: vi.fn(),
  getOptionsApiStats: vi.fn(),
  getAvailableOptionsDates: vi.fn(),
  getOptionsTargets: vi.fn(),
  getLoanPayments: vi.fn(),
  getLoanRateEvents: vi.fn(),
  getApiStats: vi.fn(),
  getSourceConfigs: vi.fn(),
  getAppSettings: vi.fn(),
  getApiCacheEntries: vi.fn(),
  getApiUsageEntries: vi.fn(),
  getOptionsDeltaCacheEntries: vi.fn(),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
}));

const mockSimulation = {
  id: 1,
  name: 'Test Sim Name 123',
  description: 'Test Desc',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'ACTIVE',
  baseValue: 1000000,
};

describe('Dashboard Component - Sentinel Level 4: Edge Cases & Web Quirks', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default resolves
    (getStrategies as any).mockResolvedValue([{ id: 1, name: "預設策略" }]);
    (getOptionsTrades as any).mockResolvedValue([]);
    (getOptionsTargetMatches as any).mockResolvedValue([]);
    (getOptionsPriceMap as any).mockResolvedValue({});
    (getSymbolMetas as any).mockResolvedValue([]);
    (getStockTrades as any).mockResolvedValue([]);
    (listSimulations as any).mockResolvedValue([]);
    (addStockTrade as any).mockResolvedValue({});
    (addStrategy as any).mockResolvedValue({ id: 1, name: "預設策略" });
    (getCashEvents as any).mockResolvedValue([]);
    (getLoans as any).mockResolvedValue([]);
    (fetchMarketIndex as any).mockResolvedValue({ index: 20000, date: '2023-10-26' });
    (getOptionsApiStats as any).mockResolvedValue({ calls: [], cooldownUntil: null });
    (getAvailableOptionsDates as any).mockResolvedValue(['202311W1', '202311W2']);
    (getOptionsTargets as any).mockResolvedValue([]);
    (getLoanPayments as any).mockResolvedValue([]);
    (getLoanRateEvents as any).mockResolvedValue([]);
    (getApiStats as any).mockResolvedValue([]);
    (getSourceConfigs as any).mockResolvedValue([]);
    (getAppSettings as any).mockResolvedValue({});
    (getApiCacheEntries as any).mockResolvedValue([{ id: 1, symbol: 'AAPL', source: 'twse', price: 150, fetchedAt: '2023-10-26' }]);
    (getApiUsageEntries as any).mockResolvedValue([]);
    (getOptionsDeltaCacheEntries as any).mockResolvedValue([]);
  });

  it('verifies Dashboard rendering, API integration, and tab switching functionality', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSimulation as any} />);

    // 1. Level 1: Smoke & Render
    // Check if the base simulation info and initial tab render
    expect(await screen.findByText('QuantPilot')).toBeInTheDocument();

    // 2. Level 2: Core User Flows
    // Switch to more tab
    const moreTab = screen.getByText('更多');
    await user.click(moreTab);

    // Switch to backup
    const backupMenu = screen.getByText('備份');
    await user.click(backupMenu);
    expect(await screen.findByText('匯出備份')).toBeInTheDocument();

    // 3. Level 3: Asynchronous & State
    // Check loading states and API integration with settings page
    await user.click(moreTab); // Open more menu again
    const settingsMenu = screen.getByText('設定');
    await user.click(settingsMenu);
    expect(await screen.findByText('還原原廠設定')).toBeInTheDocument();

    // Verify getAppSettings was called when tab switched to settings
    await waitFor(() => {
        expect(getAppSettings).toHaveBeenCalled();
    });

    // 4. Level 4: Edge Cases & Web Quirks
    // Verify async data caching properly renders on db view tab
    await user.click(moreTab);
    const databaseMenu = screen.getByText('資料庫');
    await user.click(databaseMenu);

    // Wait for the mock cache entry to appear
    expect(await screen.findByText('股價快取（1 筆）')).toBeInTheDocument();
    expect(await screen.findByText('AAPL')).toBeInTheDocument();
  });
});
