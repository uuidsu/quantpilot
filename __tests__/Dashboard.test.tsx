import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from '@/components/Dashboard';

// Mock server actions to prevent real API calls
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
  fetchMarketIndices: vi.fn().mockResolvedValue({}),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({}),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getApiStats: vi.fn().mockResolvedValue({}),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
  getOptionsTargets: vi.fn().mockResolvedValue([]),
  getLoanPayments: vi.fn().mockResolvedValue([]),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue([]),
  getApiCacheEntries: vi.fn().mockResolvedValue([]),
  getApiUsageEntries: vi.fn().mockResolvedValue([]),
  getOptionsDeltaCacheEntries: vi.fn().mockResolvedValue([]),
  addStrategy: vi.fn().mockResolvedValue({ id: 1, name: 'New Test Strategy', symbol: '2330', quantity: 100 }),
  deleteCashEvent: vi.fn().mockResolvedValue({}),
  upsertAppSetting: vi.fn().mockResolvedValue({}),
}));

const mockSimulationData = {
  id: 1,
  leverageLimit: 1.5,
  exposureTarget: 0.8,
  createdAt: '2023-01-01T00:00:00Z',
};

describe('Dashboard Component - Sentinel Level 4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Level 1: Renders main dashboard structure successfully', async () => {
    render(<Dashboard initialData={mockSimulationData} onSimChange={vi.fn()} />);

    // Wait for the initial loading state to finish
    await waitFor(() => {
        expect(screen.queryByText(/初始化中/)).not.toBeInTheDocument();
    });

    // Verify initial "overview" state
    expect(screen.getByText('QuantPilot')).toBeInTheDocument();

    // Look at navigation elements
    const tabs = screen.getAllByRole('button');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('Level 2: Navigates tabs correctly and renders content per tab', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSimulationData} onSimChange={vi.fn()} />);

    await waitFor(() => {
        expect(screen.queryByText(/初始化中/)).not.toBeInTheDocument();
    });

    // Find the button with text '更多'
    const tabs = screen.getAllByRole('button');
    const moreTabBtn = tabs.find(btn => btn.textContent?.includes('更多'));
    expect(moreTabBtn).toBeDefined();

    await user.click(moreTabBtn!);

    await waitFor(() => {
       expect(screen.getByText(/資料庫/)).toBeInTheDocument();
       expect(screen.getByText(/設定/)).toBeInTheDocument();
    });

    const dbTab = screen.getByText(/資料庫/);
    await user.click(dbTab);

    await waitFor(() => {
        expect(screen.getAllByText(/股價快取/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/選擇權 Delta/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/API 紀錄/i).length).toBeGreaterThan(0);
    });
  });

  it('Level 3: Verifies empty states and interaction with async mock data correctly', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSimulationData} onSimChange={vi.fn()} />);

    await waitFor(() => {
        expect(screen.queryByText(/初始化中/)).not.toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('button');
    const moreTabBtn = tabs.find(btn => btn.textContent?.includes('更多'));
    await user.click(moreTabBtn!);

    const dbTab = await screen.findByText(/資料庫/);
    await user.click(dbTab);

    await waitFor(() => {
        expect(screen.getByText(/尚無快取資料/)).toBeInTheDocument();
    });

    const deltaTab = screen.getByText(/選擇權 Delta/);
    await user.click(deltaTab);
    await waitFor(() => {
        expect(screen.getByText(/尚無 Delta 資料/)).toBeInTheDocument();
    });

    const usageTab = screen.getByText(/API 紀錄/);
    await user.click(usageTab);
    await waitFor(() => {
        expect(screen.getByText(/尚無呼叫紀錄/)).toBeInTheDocument();
    });
  });

  it('Level 4: Validates edge cases and interactions for the Database actions', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSimulationData} onSimChange={vi.fn()} />);

    await waitFor(() => {
        expect(screen.queryByText(/初始化中/)).not.toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('button');
    const moreTabBtn = tabs.find(btn => btn.textContent?.includes('更多'));
    await user.click(moreTabBtn!);

    const dbTab = await screen.findByText(/資料庫/);
    await user.click(dbTab);

    await waitFor(() => {
        expect(screen.getAllByText(/股價快取/i).length).toBeGreaterThan(0);
    });

    // Check edge case behavior: switching subtabs rapidly without crashing
    const deltaTabBtn = screen.getByRole('button', { name: /選擇權 Delta/i });
    await user.click(deltaTabBtn);
    await waitFor(() => {
        expect(screen.getByText(/尚無 Delta 資料/)).toBeInTheDocument();
    });

    const apiTabBtn = screen.getByRole('button', { name: /API 紀錄/i });
    await user.click(apiTabBtn);
    await waitFor(() => {
        expect(screen.getByText(/尚無呼叫紀錄/)).toBeInTheDocument();
    });

    // Switch back
    const priceTabBtn = screen.getByRole('button', { name: /股價快取/i });
    await user.click(priceTabBtn);
    await waitFor(() => {
        expect(screen.getByText(/尚無快取資料/)).toBeInTheDocument();
    });
  });
});
