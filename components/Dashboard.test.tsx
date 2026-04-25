import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard';
import { vi, describe, it, expect } from 'vitest';

// Mock all actions
vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getOptionsDates: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  addStrategy: vi.fn().mockResolvedValue({ id: '1', name: '預設策略' }),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargets: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue([]),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getSimulations: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 20000 }),
  getOptionsApiStats: vi.fn().mockResolvedValue({ calls: [], cooldownUntil: null }),
  getApiStats: vi.fn().mockResolvedValue({}),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  getApiCacheEntries: vi.fn().mockResolvedValue([]),
  getApiUsageEntries: vi.fn().mockResolvedValue([]),
  getOptionsDeltaCacheEntries: vi.fn().mockResolvedValue([]),
}));

// Mock window resize to prevent ResizeObserver errors
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver;

// Mock pointers for Recharts
Object.assign(window.HTMLElement.prototype, {
  setPointerCapture: vi.fn(),
  hasPointerCapture: vi.fn(),
  releasePointerCapture: vi.fn()
});

const mockInitialData = {
  holdings: [],
  strategies: [],
  optionsTrades: [],
  optionsTargets: [],
  cashEvents: [],
  loans: [],
  optionsDates: [],
  appSettings: [],
  stockTrades: [],
  symbolMetas: [],
  optionsTargetMatches: []
};

describe('Dashboard (Level 1: Smoke & Render)', () => {
  it('renders without crashing and displays the app name', async () => {
    render(<Dashboard initialData={mockInitialData} />);

    // Check if the dashboard renders the main tabs
    await waitFor(() => {
      expect(screen.getByText(/QuantPilot/i)).toBeInTheDocument();
      // Wait for it to finish initializing and check for specific text
      expect(screen.getByText(/0 檔持股/i)).toBeInTheDocument();
    });
  });
});

describe('Dashboard (Level 2: Core User Flows)', () => {
  it('switches tabs correctly', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockInitialData} />);

    await waitFor(() => {
      expect(screen.getByText(/QuantPilot/i)).toBeInTheDocument();
    });

    // Click on 績效 tab
    const feedbackTab = screen.getByText('績效');
    await user.click(feedbackTab);

    // Validate state changes based on UI changes, since the tab change updates content
    await waitFor(() => {
      // Look for a label specific to the feedback tab
      expect(screen.getByText('股票市值')).toBeInTheDocument();
    });

    // Open More menu
    const moreMenuBtn = screen.getByText('更多');
    await user.click(moreMenuBtn);

    // Wait for the dropdown items
    await waitFor(() => {
      expect(screen.getByText('設定')).toBeInTheDocument();
    });

    // Click on 設定 tab in the dropdown
    const settingsTab = screen.getAllByText('設定').find(el => el.tagName.toLowerCase() === 'span' || el.tagName.toLowerCase() === 'div');
    if (settingsTab) await user.click(settingsTab);

    // Check if the tab changed successfully
    await waitFor(() => {
      expect(screen.getByText('資料環境')).toBeInTheDocument();
    });
  });
});

describe('Dashboard (Level 3: Asynchronous & State)', () => {
  it('handles simulated data fetching and loading states correctly', async () => {
    // Add mock implementation to capture loading state
    const { getApiCacheEntries } = await import('@/app/actions');

    // Create a delayed mock to test loading state
    vi.mocked(getApiCacheEntries).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve([]), 500);
      });
    });

    const user = userEvent.setup();
    render(<Dashboard initialData={mockInitialData} />);

    await waitFor(() => {
      expect(screen.getByText(/QuantPilot/i)).toBeInTheDocument();
    });

    const moreBtn = screen.getByText('更多');
    await user.click(moreBtn);
    await waitFor(() => expect(screen.getByText('資料庫')).toBeInTheDocument());

    const dbTab = screen.getAllByText('資料庫').find(el => el.tagName.toLowerCase() === 'span' || el.tagName.toLowerCase() === 'div');
    if (dbTab) await user.click(dbTab);

    // Check loading indicator or text that shows up when activeTab is database and dbLoading is true
    // In Dashboard.tsx, the loading indicator has class animate-spin
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    // Verify data appears after loading finishes
    await waitFor(() => {
      expect(screen.getByText('股價快取（0 筆）')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });
});

describe('Dashboard (Level 4: Edge Cases & Web Quirks)', () => {
  it('renders elements conditionally based on layout size / view state changes', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockInitialData} />);

    await waitFor(() => {
      expect(screen.getByText(/QuantPilot/i)).toBeInTheDocument();
    });

    // Use accessible queries rather than internal logic
    const moreBtn = screen.getByText('更多');
    expect(moreBtn).toBeInTheDocument();

    await user.click(moreBtn);

    // Wait for dropdown item to appear
    await waitFor(() => {
      expect(screen.getByText('備份')).toBeInTheDocument();
    });

    // Close the dropdown - since "More" behaves like a toggle, clicking it again should close it
    await user.click(moreBtn);

    // Check if it unmounts correctly
    await waitFor(() => {
      expect(screen.queryByText('備份')).not.toBeInTheDocument();
    });
  });
});
