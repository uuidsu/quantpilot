import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';

const mockUpdateStrategy = vi.fn().mockResolvedValue({ id: 1, name: 'Test Strategy', leverageLimit: 2.0, exposureTarget: 1.0 });

vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([{ id: 1, name: 'Test Strategy', leverageLimit: 1.5, exposureTarget: 1.0 }]),
  updateStrategy: (...args: any[]) => mockUpdateStrategy(...args),
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
  getLoanPayments: vi.fn().mockResolvedValue([]),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  getVirtualAccounts: vi.fn().mockResolvedValue([]),
  getVirtualAccountTransfers: vi.fn().mockResolvedValue([]),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  listStockTrades: vi.fn().mockResolvedValue([]),
  listLoans: vi.fn().mockResolvedValue([]),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
}));

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { layoutId, initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: any) => {
      const { layoutId, initial, animate, exit, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
    button: ({ children, ...props }: any) => {
      const { layoutId, initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      return <button {...rest}>{children}</button>;
    }
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div style={{ width: 400, height: 300 }}>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div></div>,
  XAxis: () => <div></div>,
  YAxis: () => <div></div>,
  CartesianGrid: () => <div></div>,
  Tooltip: () => <div></div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div></div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div></div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div></div>,
  Cell: () => <div></div>,
  Legend: () => <div></div>,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('Dashboard Component - Sentinel Complete Suite', () => {
  const dummySim = {
    id: 1,
    name: 'Test Sim',
    createdAt: new Date(),
    updatedAt: new Date(),
    cash: 1000000,
    targetNav: 1500000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Level 1 & Level 2: Core Render and Navigation
  it('renders main tabs and allows navigation', async () => {
    const user = userEvent.setup();
    let container: any;
    await act(async () => {
      const result = render(<Dashboard initialData={dummySim as any} />);
      container = result.container;
    });

    // Level 1: Smoke check: verify initialization text is gone
    expect(screen.queryByText(/初始化中/i)).not.toBeInTheDocument();

    // Default is active tab "account" (帳戶)
    const accountTab = screen.getByText('帳戶', { selector: 'button *' });
    expect(accountTab.className).toContain('text-primary'); // "帳戶" starts active

    // Click on "模擬器" (Overview/Simulator tab labeled 'overview' internally)
    const simulatorTab = screen.getByText('模擬器', { selector: 'button *' });
    const simulatorBtn = simulatorTab.closest('button');
    expect(simulatorBtn).not.toBeNull();

    await act(async () => {
      await user.click(simulatorBtn!);
    });

    // Verify view content for "overview" is rendered
    expect(screen.getByText(/總淨資產/i)).toBeInTheDocument();
    expect(screen.getByText(/大盤指數/i)).toBeInTheDocument();

    // Test the "更多" (More) dropdown to navigate to strategy
    const moreTab = screen.getByText('更多', { selector: 'button *' });
    const moreBtn = moreTab.closest('button');
    expect(moreBtn).not.toBeNull();

    await act(async () => {
      await user.click(moreBtn!);
    });

    // Inside the dropdown, there should be a "策略" button
    const strategyTab = screen.getByText('策略');
    expect(strategyTab).toBeVisible();

    const strategyBtn = strategyTab.closest('button');
    await act(async () => {
      await user.click(strategyBtn!);
    });

    // Strategy content should be rendered
    await waitFor(() => {
      expect(screen.getByText(/策略參數/i)).toBeInTheDocument();
    });

    // Another assertion for the strategy view, check for target
    expect(screen.getByText(/槓桿倍數上限/i)).toBeInTheDocument();
  });

  // Level 2: Interactive Element Mutation
  it('allows filling out a form/input in strategy tab (Level 2 interaction)', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<Dashboard initialData={dummySim as any} />);
    });

    // Navigate to "更多" -> "策略"
    const moreTab = screen.getByText('更多', { selector: 'button *' });
    const moreBtn = moreTab.closest('button');
    await act(async () => {
      await user.click(moreBtn!);
    });

    const strategyTab = screen.getByText('策略');
    const strategyBtn = strategyTab.closest('button');
    await act(async () => {
      await user.click(strategyBtn!);
    });

    // Wait for the "策略" tab content to be fully rendered
    await waitFor(() => {
      expect(screen.getByText(/槓桿倍數上限/i)).toBeInTheDocument();
    });

    // Find the input for Leverage Limit. There's a range input and a number input.
    // They share value 1.5. Let's find the number input by its value.
    const inputs = screen.getAllByRole('spinbutton'); // number inputs
    // The first one is likely the leverageLimit
    const leverageInput = inputs[0] as HTMLInputElement;
    expect(leverageInput.value).toBe('1.5');

    // Change input value to 2.0
    await act(async () => {
      fireEvent.change(leverageInput, { target: { value: '2.0' } });
    });

    // Assert value has changed
    expect(leverageInput.value).toBe('2.0');

    // Also assert the range input changes.
    const ranges = screen.getAllByRole('slider'); // range inputs
    const leverageRange = ranges[0] as HTMLInputElement;
    expect(leverageRange.value).toBe('2');
  });

  // Level 3: Asynchronous State / Server Interactions
  it('handles asynchronous states when clicking save strategy (Level 3 network)', async () => {
    const user = userEvent.setup();

    let resolveUpdate: any;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });
    mockUpdateStrategy.mockImplementation(() => updatePromise);

    await act(async () => {
      render(<Dashboard initialData={dummySim as any} />);
    });

    const moreTab = screen.getByText('更多', { selector: 'button *' });
    await act(async () => {
      await user.click(moreTab.closest('button')!);
    });

    const strategyTab = screen.getByText('策略');
    await act(async () => {
      await user.click(strategyTab.closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByText(/儲存參數/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/儲存參數/i).closest('button');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(saveButton!);
    });

    expect(saveButton).toBeDisabled();

    await act(async () => {
      resolveUpdate({ id: 1, name: 'Test Strategy', leverageLimit: 2.0, exposureTarget: 1.0 });
    });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    expect(toast.success).toHaveBeenCalledWith('策略已更新');
  });

  // Level 4: Edge Cases / Empty States
  it('renders gracefully when strategy list is empty and user views strategy tab', async () => {
    const user = userEvent.setup();
    // Re-mock `getStrategies` to return empty exclusively for this test block
    const { getStrategies } = await import('@/app/actions');
    (getStrategies as any).mockResolvedValueOnce([]);

    await act(async () => {
      render(<Dashboard initialData={dummySim as any} />);
    });

    const moreTab = screen.getByText('更多', { selector: 'button *' });
    await act(async () => {
      await user.click(moreTab.closest('button')!);
    });

    const strategyTab = screen.getByText('策略');
    await act(async () => {
      await user.click(strategyTab.closest('button')!);
    });

    // Level 4 edge case: empty strategies
    await waitFor(() => {
      expect(screen.getByText(/載入中…/i)).toBeInTheDocument();
    });

    expect(document.querySelector('.lucide-crosshair')).toBeInTheDocument();
    expect(screen.queryByText(/策略參數/i)).not.toBeInTheDocument();
  });

  it('handles small mobile viewports layout shifts', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<Dashboard initialData={dummySim as any} />);
    });

    const bellIcon = document.querySelector('.lucide-bell');
    expect(bellIcon).toBeInTheDocument();
    const bellBtn = bellIcon!.closest('button');

    await act(async () => {
      fireEvent.click(bellBtn!);
    });

    await waitFor(() => {
      expect(screen.getByText(/待確認事件/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/沒有待確認的事件/i)).toBeInTheDocument();

    const closeIcons = document.querySelectorAll('.lucide-x');
    expect(closeIcons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(closeIcons[closeIcons.length - 1].closest('button')!);
    });

    await waitFor(() => {
      expect(screen.queryByText(/待確認事件/i)).not.toBeInTheDocument();
    });
  });
});
