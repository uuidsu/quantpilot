import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';
import { vi } from 'vitest';
import * as actions from '@/app/actions';
import * as accountsModule from '@/shared/accounts';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Mock Pointer Events API
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

vi.mock('recharts', async () => {
  const Original = await vi.importActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
    AreaChart: ({ children }: any) => <svg data-testid="mock-areachart">{children}</svg>,
    Area: () => <path data-testid="mock-area" />,
    XAxis: () => <g data-testid="mock-xaxis" />,
    YAxis: () => <g data-testid="mock-yaxis" />,
    CartesianGrid: () => <g data-testid="mock-cartesiangrid" />,
    Tooltip: () => <g data-testid="mock-tooltip" />,
  };
});

vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getOptionsStats: vi.fn().mockResolvedValue([]),
  listSimulations: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
  getApiStats: vi.fn().mockResolvedValue([]),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue({ dailyRefreshTime: "14:00" }),
}));

const mockSimulation = {
  id: 'sim-1',
  name: 'Test Simulation',
  settings: {
    initialCapital: 1000000,
  }
};

describe('Dashboard Component - Level 3 & 4 Testing', () => {
  it('should render main tabs and navigate between views when clicked', async () => {
    render(<Dashboard initialData={mockSimulation as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/載入中/i)).not.toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const tradesTab = buttons.find(b => {
      const span = b.querySelector('span:nth-of-type(2)');
      return span && span.textContent === '明細';
    });

    expect(screen.getByText('實體帳戶')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(tradesTab!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /全部/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /股票/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /選擇權/ })).toBeInTheDocument();
    });
  });

  it('should fetch and display options target matches for account tab', async () => {
    const mockMatch = {
      target: { id: 1, targetDelta: 0.5, action: 'BUY', callPut: 'C', quantity: 1, simulationId: 'sim-1' },
      matchedStrike: 20000,
      matchedDelta: 0.5,
      matchedPrice: 100,
      matchedContractMonth: '202311',
      lastMarketDate: '20231027',
      lastFetchedAt: '2023-10-27T00:00:00Z',
    };
    (actions.getOptionsTargetMatches as any).mockResolvedValueOnce([mockMatch]);

    vi.spyOn(accountsModule, 'buildUnifiedAccounts').mockReturnValue([{
      id: 'opt-target-1',
      type: 'options',
      label: 'Buy Call · Δ0.5',
      value: 0,
      kind: 'real_options',
      balance: 0,
      data: { targetMatch: mockMatch, holding: null, trades: [] }
    }]);

    render(<Dashboard initialData={mockSimulation as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/載入中/i)).not.toBeInTheDocument();
    });

    expect(actions.getOptionsTargetMatches).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Buy Call · Δ0.5')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const textElement = screen.getByText('Buy Call · Δ0.5');
    const button = textElement.closest('button');

    if (button) {
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText('20,000')).toBeInTheDocument();
        expect(screen.getByText('0.5000')).toBeInTheDocument();
        expect(screen.getByText(/最後市場日 20231027/)).toBeInTheDocument();
      });
    }
  });

  it('should open more menu and navigate to settings properly (Level 4: Edge Cases & Quirks)', async () => {
    render(<Dashboard initialData={mockSimulation as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/載入中/i)).not.toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const moreBtn = buttons.find(b => {
      const span = b.querySelector('span:nth-of-type(2)');
      return span && span.textContent === '更多';
    });

    expect(moreBtn).toBeDefined();

    const user = userEvent.setup();

    // Toggle the More menu dropdown
    await act(async () => {
      await user.click(moreBtn!);
    });

    // Check for dropdown menu items (using exact match of specific items)
    await waitFor(() => {
      expect(screen.getByText('收支分析')).toBeInTheDocument();
      expect(screen.getByText('設定')).toBeInTheDocument();
    });

    // Click on Settings tab within dropdown menu
    const settingsBtn = screen.getByText('設定');
    await act(async () => {
      await user.click(settingsBtn);
    });

    // Verify settings tab content is displayed
    await waitFor(() => {
      expect(screen.getByText('資料環境')).toBeInTheDocument();
      expect(screen.getByText('股價來源')).toBeInTheDocument();
    });
  });
});
