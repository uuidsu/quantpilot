import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '../../components/Dashboard';
import * as actions from '../../app/actions';
import { vi } from 'vitest';

vi.mock('../../app/actions', () => ({
  createSimulation: vi.fn().mockResolvedValue({}),
  deleteSimulation: vi.fn().mockResolvedValue({}),
  listSimulations: vi.fn().mockResolvedValue([]),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  upsertSymbolMeta: vi.fn().mockResolvedValue({}),
  getStrategies: vi.fn().mockResolvedValue([]),
  createStrategy: vi.fn().mockResolvedValue({}),
  updateStrategy: vi.fn().mockResolvedValue({}),
  deleteStrategy: vi.fn().mockResolvedValue({}),
  getHoldings: vi.fn().mockResolvedValue([]),
  createHolding: vi.fn().mockResolvedValue({}),
  updateHolding: vi.fn().mockResolvedValue({}),
  deleteHolding: vi.fn().mockResolvedValue({}),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  createOptionsTrade: vi.fn().mockResolvedValue({}),
  updateOptionsTrade: vi.fn().mockResolvedValue({}),
  deleteOptionsTrade: vi.fn().mockResolvedValue({}),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getOptionsStats: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  createStockTrade: vi.fn().mockResolvedValue({}),
  updateStockTrade: vi.fn().mockResolvedValue({}),
  deleteStockTrade: vi.fn().mockResolvedValue({}),
  getLoans: vi.fn().mockResolvedValue([]),
  createLoan: vi.fn().mockResolvedValue({}),
  updateLoan: vi.fn().mockResolvedValue({}),
  deleteLoan: vi.fn().mockResolvedValue({}),
  getCashEvents: vi.fn().mockResolvedValue([]),
  addCashEvent: vi.fn().mockResolvedValue({}),
  updateCashEvent: vi.fn().mockResolvedValue({}),
  deleteCashEvent: vi.fn().mockResolvedValue({}),
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
}));

vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 400, height: 300 }}>{children}</div>,
    AreaChart: ({ children }: any) => <div>{children}</div>,
    Area: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: ({ children }: any) => <div>{children}</div>,
    Cell: () => <div />,
    Legend: () => <div />,
  };
});

const mockSim = { id: 1, name: 'Default Sim', createdAt: new Date() };

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial state with Account tab active', async () => {
    render(<Dashboard initialData={mockSim as any} onSimChange={vi.fn()} />);

    // Wait for "載入中…" (initial loading) to clear by looking for something on the account tab, like '資產' or by the tabs themselves
    await waitFor(() => {
        expect(screen.queryByText('載入中…')).not.toBeInTheDocument();
    });

    // Check tabs
    const accountTabButton = screen.getByText('帳戶').closest('button');
    expect(accountTabButton).toBeInTheDocument();

    // Verify it's active. The active styles are applied to inner span.
    const accountSpan = screen.getByText('帳戶');
    expect(accountSpan.className).toContain('text-primary');

    // Overview tab is inactive
    const overviewSpan = screen.getByText('模擬器');
    expect(overviewSpan.className).not.toContain('text-primary');
    expect(overviewSpan.className).toContain('text-muted-foreground');
  });

  it('switches to Trades tab on click', async () => {
    render(<Dashboard initialData={mockSim as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
        expect(screen.queryByText('載入中…')).not.toBeInTheDocument();
    });

    const tradesButton = screen.getByText('明細').closest('button')!;
    fireEvent.click(tradesButton);

    await waitFor(() => {
      const tradesSpan = screen.getByText('明細');
      expect(tradesSpan.className).toContain('text-primary');
      const accountSpan = screen.getByText('帳戶');
      expect(accountSpan.className).not.toContain('text-primary');
    });
  });

  it('opens More menu and switches to Strategy tab', async () => {
    render(<Dashboard initialData={mockSim as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
        expect(screen.queryByText('載入中…')).not.toBeInTheDocument();
    });

    // Click "更多"
    const moreButton = screen.getByText('更多').closest('button')!;
    fireEvent.click(moreButton);

    // Strategy option should appear in dropdown
    const strategyOption = screen.getAllByText('策略').find(el => el.tagName === 'SPAN');
    expect(strategyOption).toBeInTheDocument();

    // Click strategy
    fireEvent.click(strategyOption!);

    // "更多" icon/text should now be primary, and activeTab changes
    await waitFor(() => {
      const moreSpan = screen.getByText('更多');
      expect(moreSpan.className).toContain('text-primary');
    });
  });
});
