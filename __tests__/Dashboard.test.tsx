import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server actions
vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getOptionsStats: vi.fn().mockResolvedValue({ totalDelta: 0, currentMonthDelta: 0 }),
  listSimulations: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({ count: 0 }),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
}));

const mockSimulation = {
  id: 1,
  name: 'Default Simulation',
  cash: 1000000,
  leverageLimit: 2,
  exposureTarget: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Dashboard Component - Level 1: Smoke & Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard with default elements', async () => {
    render(<Dashboard initialData={mockSimulation as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/初始化中/i)).not.toBeInTheDocument();
    });

    expect(screen.getAllByText('帳戶')[0]).toBeVisible();
  });

  it('renders the tab navigation', async () => {
    render(<Dashboard initialData={mockSimulation as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/初始化中/i)).not.toBeInTheDocument();
    });

    const accountBtns = screen.getAllByRole('button', { name: /帳戶/i });
    expect(accountBtns.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /明細/i }).length).toBeGreaterThan(0);
  });
});

describe('Dashboard Component - Level 2: Core User Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows tab switching to Trades (明細)', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSimulation as any} onSimChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/初始化中/i)).not.toBeInTheDocument();
    });

    // Find the specific bottom navigation "明細" button
    const nav = screen.getByRole('navigation');
    const tradesTabButton = within(nav).getByRole('button', { name: /明細/i });

    await user.click(tradesTabButton);

    // Strict Assertion 1: Wait for and verify the '全部' tab button is rendered and visible
    const allTabBtn = await screen.findByRole('button', { name: '全部' });
    expect(allTabBtn).toBeVisible();

    // Strict Assertion 2: Verify the "明細" button's inner span text gets the 'text-primary' class
    const tradesTabTextSpan = within(tradesTabButton).getByText('明細');
    expect(tradesTabTextSpan).toHaveClass('text-primary');
  });
});
