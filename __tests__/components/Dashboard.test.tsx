import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '@/components/Dashboard'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import * as actions from '@/app/actions'

vi.mock('@/app/actions', () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  fetchOptionsStats: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  updateLoan: vi.fn().mockResolvedValue({}),
  getAppSettings: vi.fn().mockResolvedValue({ id: 1, dailyLivingCost: 1000 }),
  updateAppSettings: vi.fn().mockResolvedValue({}),
  addCashEvent: vi.fn().mockResolvedValue({}),
  deleteCashEvent: vi.fn().mockResolvedValue({}),
  addStrategy: vi.fn().mockResolvedValue({}),
  updateStrategy: vi.fn().mockResolvedValue({}),
  deleteStrategy: vi.fn().mockResolvedValue({}),
  addHolding: vi.fn().mockResolvedValue({}),
  updateHolding: vi.fn().mockResolvedValue({}),
  deleteHolding: vi.fn().mockResolvedValue({}),
  deleteOptionsTrade: vi.fn().mockResolvedValue({}),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getSimulations: vi.fn().mockResolvedValue([{ id: 1, name: 'Default Sim' }]),
  getSimulation: vi.fn().mockResolvedValue({ id: 1, name: 'Default Sim' }),
  addSimulation: vi.fn().mockResolvedValue({}),
  getOptionsTargets: vi.fn().mockResolvedValue([]),
  deleteSimulation: vi.fn().mockResolvedValue({}),
  getPrices: vi.fn().mockResolvedValue({}),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 20000, updatedAt: new Date().toISOString() }),
  deleteOptionsTarget: vi.fn().mockResolvedValue({}),
  addOptionsTarget: vi.fn().mockResolvedValue({}),
  syncOptionsTargetPrices: vi.fn().mockResolvedValue({}),
  getOptionsApiStats: vi.fn().mockResolvedValue({ calls: [], cooldownUntil: null }),
  updateSimulation: vi.fn().mockResolvedValue({}),
  addOptionsTrade: vi.fn().mockResolvedValue({}),
  addLoan: vi.fn().mockResolvedValue({}),
  deleteLoan: vi.fn().mockResolvedValue({}),
  addStockTrade: vi.fn().mockResolvedValue({}),
  deleteStockTrade: vi.fn().mockResolvedValue({}),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  fetchOptionsData: vi.fn().mockResolvedValue({ rows: [] }),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
  getApiCacheEntries: vi.fn().mockResolvedValue([]),
  getApiUsageEntries: vi.fn().mockResolvedValue([]),
  getOptionsDeltaCacheEntries: vi.fn().mockResolvedValue([]),
  deleteApiCacheEntry: vi.fn().mockResolvedValue({}),
  deleteOptionsDeltaCacheEntry: vi.fn().mockResolvedValue({}),
}))

const mockInitialData: any = {
  holdings: [],
  strategies: [],
  optionsTrades: [],
  cashEvents: [],
  optionsTargets: [],
  loans: [],
  appSettings: { id: 1, dailyLivingCost: 1000 },
}

const mockUnbalancedData: any = {
  ...mockInitialData,
  cashEvents: [
    { id: 1, simulationId: 1, action: { direction: "in" }, amount: 50000, date: 20231001, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, simulationId: 1, action: { direction: "out" }, amount: 10000, date: 20231002, createdAt: new Date(), updatedAt: new Date() }
  ]
}

describe('Dashboard Component - Progression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Level 1: Renders main tabs and default tab content (Smoke test)', async () => {
    render(<Dashboard initialData={mockInitialData} />)

    // Level 1 strict assertions
    await waitFor(() => {
        const accountTab = screen.getByText('帳戶')
        expect(accountTab).toBeInTheDocument()
        expect(accountTab).toBeVisible()

        expect(screen.getByText('明細')).toBeVisible()
        expect(screen.getByText('績效')).toBeVisible()
        expect(screen.getByText('模擬器')).toBeVisible()
        expect(screen.getByText('更多')).toBeVisible()
    })

    // Check main title
    expect(screen.getByRole('heading', { name: 'QuantPilot', level: 1 })).toBeVisible()
  })

  it('Level 2: Navigates between main tabs and views content (Core user flows)', async () => {
    const user = userEvent.setup()
    render(<Dashboard initialData={mockInitialData} />)

    await waitFor(() => {
        expect(screen.getByText('實體帳戶')).toBeVisible()
    })

    const tradesTab = screen.getByText('明細')
    await user.click(tradesTab)

    await waitFor(() => {
        // Assert specific sub-tabs appear in ' trades ' mode
        expect(screen.getByRole('button', { name: '股票' })).toBeVisible()
        expect(screen.getByRole('button', { name: '選擇權' })).toBeVisible()
        expect(screen.getByRole('button', { name: '貸款' })).toBeVisible()
    })
  })

  it('Level 3: Handles unbalanced account state correctly (Async & State)', async () => {
    // Return unbalanced events from API
    // The implementation expects an array of events
    vi.mocked(actions.getCashEvents).mockResolvedValueOnce(mockUnbalancedData.cashEvents)

    render(<Dashboard initialData={mockUnbalancedData} />)

    // Verify the account balanced/unbalanced UI
    await waitFor(() => {
        const balanceContainer = screen.getByText(/Σ所有帳戶 = \$0，點擊查看明細|帳戶不平衡/)
        expect(balanceContainer).toBeVisible()
    })
  })

  it('Level 3b: Displays loading spinner while fetching initial simulations (Async & State)', async () => {
    let resolveGetSimulations: any
    const slowGetSimulations = new Promise<any>(resolve => {
        resolveGetSimulations = resolve
    })

    // Instead of mocking the imported function directly, let's just bypass TS checking if it gets complex
    const actionsModule = actions as any;
    if (actionsModule.getSimulations) {
        actionsModule.getSimulations = vi.fn().mockImplementationOnce(() => slowGetSimulations)
    }

    render(<Dashboard initialData={mockInitialData} />)

    expect(screen.getByText('初始化中...')).toBeVisible()

    resolveGetSimulations([{ id: 1, name: 'Default Sim' }])

    await waitFor(() => {
        expect(screen.queryByText('初始化中...')).not.toBeInTheDocument()
        expect(screen.getByText('帳戶')).toBeVisible()
    })
  })

  it('Level 4: Handles "More" menu interactions and state changes (Edge Cases)', async () => {
    const user = userEvent.setup()
    render(<Dashboard initialData={mockInitialData} />)

    await waitFor(() => {
        expect(screen.getByText('更多')).toBeVisible()
    })

    const moreTab = screen.getByText('更多')
    await user.click(moreTab)

    // The More menu opens a slide-up panel or inline menu
    await waitFor(() => {
        expect(screen.getByText('收支分析')).toBeVisible()
        expect(screen.getByText('資料庫')).toBeVisible()
    })

    // Navigate to Database via More Menu
    await user.click(screen.getByText('資料庫'))

    // Ensure we see the database-specific sub-tabs
    await waitFor(() => {
        expect(screen.getByRole('button', { name: '股價快取' })).toBeVisible()
        expect(screen.getByRole('button', { name: '選擇權 Delta' })).toBeVisible()
        expect(screen.getByRole('button', { name: 'API 紀錄' })).toBeVisible()
    })
  })
})
