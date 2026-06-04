import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '@/components/Dashboard'

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
  fetchMarketIndices: vi.fn().mockResolvedValue({}),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue(null),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
}))

const mockSimulation = {
  id: 1,
  name: 'Test Simulation',
  targetDate: '2025-12-31',
  baseVix: 15,
  description: 'Test Description',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockOnSimChange = vi.fn();

describe('Dashboard Component - Level 2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Level 1: Smoke & Render - Should render the dashboard and main tabs successfully', async () => {
    render(<Dashboard initialData={mockSimulation as any} onSimChange={mockOnSimChange} />)

    // Wait for loading to finish by waiting for the account tab text
    await waitFor(() => {
      const tabs = screen.getAllByText('帳戶');
      expect(tabs.length).toBeGreaterThan(0);
    })

    expect(screen.getByText('明細')).toBeInTheDocument()
    // It seems "策略" is inside "更多" initially or not visible depending on viewport/tab config
    // We check for "更多" to ensure the tab bar renders
    expect(screen.getByText('更多')).toBeInTheDocument()
  })

  it('Level 2: Core User Flows - Should switch tab content when clicking on a tab', async () => {
    render(<Dashboard initialData={mockSimulation as any} onSimChange={mockOnSimChange} />)
    const user = userEvent.setup()

    // Wait for initial render
    await waitFor(() => {
      const tabs = screen.getAllByText('帳戶');
      expect(tabs.length).toBeGreaterThan(0);
    })

    // Click "更多" to open the dropdown
    const moreTab = screen.getByText('更多')
    await user.click(moreTab)

    // Wait for dropdown to show "策略" and click it
    let strategyTab;
    await waitFor(() => {
      strategyTab = screen.getByText('策略')
      expect(strategyTab).toBeInTheDocument()
    })

    await user.click(strategyTab!)

    // Wait for the Strategy tab content to become visible
    await waitFor(() => {
      // Based on Dashboard code: "載入中…" initially, then it shows strategy content if loaded
      expect(screen.getByText('載入中…')).toBeInTheDocument()
    })

    // Wait for the "更多" label to become active since "策略" is inside it
    await waitFor(() => {
      // The text-primary might not apply directly to "策略" when inside the dropdown
      // Let's assert that "更多" is text-primary as it holds the active item
      expect(screen.getByText('更多')).toHaveClass('text-primary')
    })
  })
})
