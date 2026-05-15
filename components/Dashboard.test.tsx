import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getHoldings: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({}),
  getOptionsRows: vi.fn().mockResolvedValue([]),
  getOptionsTargets: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue({}),
  getOptionsPriceMap: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => {
        // filter out framer-motion specific props
        const { layoutId, animate, initial, exit, transition, ...rest } = props;
        return <div {...rest}>{children}</div>;
      },
      span: ({ children, ...props }: any) => {
        const { layoutId, animate, initial, exit, transition, ...rest } = props;
        return <span {...rest}>{children}</span>;
      },
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSim = { id: 1, name: 'Sim 1', createdAt: new Date().toISOString() };

  it('Level 1: Smoke & Render - should render the Dashboard with baseline state', async () => {
    render(<Dashboard initialData={mockSim} onSimChange={vi.fn()} />);

    // Test initial layout and smoke
    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
      expect(screen.getByText('0 檔持股 · 0 選擇權持倉')).toBeInTheDocument();
    });
  });

  it('Level 2: Core User Flows - should switch between tabs', async () => {
    render(<Dashboard initialData={mockSim} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
    });

    const tradesTab = screen.getByText('明細', { selector: 'span' });
    fireEvent.click(tradesTab);

    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeVisible();
    });
  });

  it('Level 3: Asynchronous & State - should load data correctly', async () => {
    const actions = await import('@/app/actions');
    vi.mocked(actions.getStockTrades).mockResolvedValue([{
      id: 1,
      simulationId: 1,
      symbol: 'AAPL',
      action: 'BUY',
      price: 150,
      quantity: 10,
      fee: 0,
      tradeDate: '20230101',
      createdAt: null,
      updatedAt: null,
      strategyId: null
    }] as any);

    render(<Dashboard initialData={mockSim} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
    });

    const tradesTab = screen.getByText('明細', { selector: 'span' });
    fireEvent.click(tradesTab);

    // After switching, the trades list should show AAPL buy
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeVisible();
    });
  });

  it('Level 4: Edge Cases - handles empty data gracefully', async () => {
    const actions = await import('@/app/actions');
    vi.mocked(actions.getStockTrades).mockResolvedValue([]);

    render(<Dashboard initialData={mockSim} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
    });

    const tradesTab = screen.getByText('明細', { selector: 'span' });
    fireEvent.click(tradesTab);

    // After switching to trades tab with empty data, check the fallback UI
    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeVisible();
      expect(screen.getByText('點擊「新增交易」開始記錄')).toBeVisible();
    });
  });
});
