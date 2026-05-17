import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Dashboard } from '../components/Dashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn().mockResolvedValue([]),
  createSimulation: vi.fn(),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([{ id: 1, name: 'Test Strategy', leverageLimit: "1.5" }]),
  getOptionsTrades: vi.fn().mockResolvedValue([{ id: 1, callPut: 'C', strikePrice: 10000, action: 'BUY', quantity: 1, tradeDate: '20240101', fee: 0, price: 10, contractMonth: '202401', contractId: 'TXO' }]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getHoldings: vi.fn().mockResolvedValue({ stockHoldings: [], optionHoldings: [] }),
  getAccounts: vi.fn().mockResolvedValue([{ id: 'acc1', name: 'Main', initialBalance: 1000 }]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ currentPrice: 1000 }),
  deleteSimulation: vi.fn(),
  upsertSymbolMeta: vi.fn(),
  upsertCashEvent: vi.fn(),
  deleteCashEvent: vi.fn(),
  createOptionsTrade: vi.fn(),
  createStockTrade: vi.fn(),
  createStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  saveSimulation: vi.fn(),
}));

// Mock framer-motion to prevent issues with AnimatePresence
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual as any,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      ...((actual as any).motion || {}),
      div: ({ children, ...props }: any) => {
        const { layoutId, animate, initial, exit, transition, ...validProps } = props;
        return <div {...validProps}>{children}</div>;
      },
      span: ({ children, ...props }: any) => {
        const { layoutId, animate, initial, exit, transition, ...validProps } = props;
        return <span {...validProps}>{children}</span>;
      },
      button: ({ children, ...props }: any) => {
        const { layoutId, animate, initial, exit, transition, ...validProps } = props;
        return <button {...validProps}>{children}</button>;
      }
    }
  };
});

// Mock Recharts to avoid container width issues in Dashboard
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 800, height: 400 }}>{children}</div>,
    AreaChart: () => <div data-testid="recharts-chart" />,
    BarChart: () => <div data-testid="recharts-bar-chart" />,
    PieChart: () => <div data-testid="recharts-pie-chart" />
  };
});

// Mock resize observer and matchMedia
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

describe('Dashboard', () => {
  const initialData = { id: 1, name: 'Initial Sim', initialCapital: '1000', currentCapital: '1000' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Level 1 correctly with initial data', async () => {
    render(<Dashboard initialData={initialData} />);

    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
    });
  });

  it('handles Level 2 core flow: switching to Transactions (明細) tab', async () => {
    render(<Dashboard initialData={initialData} />);

    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
    });

    const tradesBtns = screen.getAllByText('明細');
    // Find the one in the bottom navigation (should be a span)
    const navTradesBtn = tradesBtns.find(el => el.tagName.toLowerCase() === 'span' && el.parentElement?.tagName.toLowerCase() === 'button');

    if (navTradesBtn?.parentElement) {
      fireEvent.click(navTradesBtn.parentElement);
    }

    await waitFor(() => {
      // Look for the header text unique to transactions view
      expect(screen.getByText(/交易明細（/)).toBeInTheDocument();
    });
  });

  it('handles Level 2 core flow: switching to Strategies (更多 -> 策略) tab', async () => {
    render(<Dashboard initialData={initialData} />);

    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
    });

    // Handle "更多" click
    const moreBtnTexts = screen.getAllByText('更多');
    const navMoreBtnText = moreBtnTexts.find(el => el.tagName.toLowerCase() === 'span');
    if (navMoreBtnText) {
      fireEvent.click(navMoreBtnText);
    }

    await waitFor(() => {
      const strategiesBtn = screen.getByText('策略');
      fireEvent.click(strategiesBtn);
    });

    await waitFor(() => {
      // Check for elements specific to the strategy tab
      expect(screen.getByText('策略參數')).toBeInTheDocument();
      expect(actions.getStrategies).toHaveBeenCalled();
    });
  });
});
