import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';
import { vi } from 'vitest';

// Mock all actions used by Dashboard
vi.mock('@/app/actions', () => ({
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getStrategies: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 22000 }),
  getApiStats: vi.fn().mockResolvedValue([]),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue({}),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({ calls: [] }),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSimulation = { id: 1, name: 'Test Sim', createdAt: new Date(), updatedAt: new Date() } as any;

  it('Level 1: Smoke & Render - loads and displays main components', async () => {
    render(<Dashboard initialData={mockSimulation} />);

    // Assertion 1: Loading state
    expect(screen.getByText('初始化中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // Assertion 2: Header title
    expect(screen.getByText('QuantPilot')).toBeInTheDocument();

    // Assertion 3: Default active tab
    expect(screen.getByText('帳戶')).toBeInTheDocument();
  });

  it('Level 2: Core User Flows - navigates between tabs correctly and shows empty state', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSimulation} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // Switch to trades tab
    const tradesTab = screen.getByText('明細');
    await user.click(tradesTab);

    // Assertion 1: Verify the tab name is visible and we switched Context
    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeInTheDocument();
    });

    // Assertion 2: Verify the empty state action hint is present
    expect(screen.getByText('點擊「新增交易」開始記錄')).toBeInTheDocument();
  });

  it('Level 3: Asynchronous & State - fetches data and updates UI state', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSimulation} />);

    // Assertion 1: Ensure initial loading state
    expect(screen.getByText('初始化中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // We can also switch to 'feedback' to check it renders correctly empty state
    const feedbackTab = screen.getByText('績效');
    await user.click(feedbackTab);

    // Assertion 2: Check for specific elements on feedback tab after async resolving
    await waitFor(() => {
       expect(screen.getByText('股票市值')).toBeInTheDocument();
    });

    expect(screen.getByText('未實現損益')).toBeInTheDocument();
  });

  it('Level 4: Edge Cases - handles More menu dropdown correctly', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockSimulation} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // Assertion 1: Sub-menu item not visible before click
    expect(screen.queryByText('收支分析')).not.toBeInTheDocument();

    const moreButton = screen.getByText('更多');
    await user.click(moreButton);

    // Assertion 2: Sub-menu item is visible after click
    await waitFor(() => {
      expect(screen.getByText('收支分析')).toBeInTheDocument();
    });

    // Check another item just to be sure
    expect(screen.getByText('資料庫')).toBeInTheDocument();
  });
});
