import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard';
import * as actions from '@/app/actions';
import userEvent from '@testing-library/user-event';

// Mock all server actions used by Dashboard
vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 20000 }),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({ calls: [], cooldownUntil: null }),
  getOptionsRows: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getSettings: vi.fn().mockResolvedValue({ defaultLeverageLimit: 2 }),
  getStrategies: vi.fn().mockResolvedValue([{ id: 1, name: 'Default Strategy', targetWeight: 1 }]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargets: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getSources: vi.fn().mockResolvedValue([]),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getLoanPayments: vi.fn().mockResolvedValue([]),
  getApiStats: vi.fn().mockResolvedValue([]),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue({ dailyRefreshTime: '14:00' }),
}));

// Mock window matchMedia since some components might rely on it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Recharts to avoid rendering issues in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual as any,
    ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
  };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSim = {
    id: 1,
    name: 'Test Simulation',
    createdAt: new Date(),
  };

  it('renders Dashboard and successfully fetches all initial data', async () => {
    render(<Dashboard initialData={mockSim as any} onSimChange={vi.fn()} />);

    // Wait for the components to fetch data and settle (loading screen goes away)
    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('QuantPilot')).toBeInTheDocument();
    expect(actions.getStockTrades).toHaveBeenCalledWith(1);
    expect(actions.getOptionsTrades).toHaveBeenCalledWith(1);
    expect(actions.getStrategies).toHaveBeenCalledWith(1);
  });

  it('navigates to different tabs and shows corresponding content', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSim as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // We verify using the actual text labels from the nav bar output
    expect(screen.getByText('帳戶')).toBeInTheDocument();
    expect(screen.getByText('明細')).toBeInTheDocument();

    // Navigate to 明細 (Transactions)
    await user.click(screen.getByText('明細'));

    // Wait for the active state to apply and specific content to load
    await waitFor(() => {
      // The text-primary class is actually on the span itself or it conditionally renders a tab-indicator layoutid div
      const txTabSpan = screen.getByText('明細');
      expect(txTabSpan.className).toContain('text-primary');
    });

    // In transactions view, we expect to see '新增交易' or transaction specific filtering tabs
    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByText('股票')).toBeInTheDocument();
    expect(screen.getByText('選擇權')).toBeInTheDocument();
    expect(screen.getByText('貸款')).toBeInTheDocument();
  });
});
