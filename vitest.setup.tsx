import { expect, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Mock generic browser APIs that jsdom lacks
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  }
}))

// Mock recharts to prevent rendering crashes
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '100%', height: '300px' }}>{children}</div>
    ),
  }
})

// Mock lucide-react to prevent issues
vi.mock('lucide-react', () => ({
  RefreshCcw: () => 'RefreshCcw',
  Settings2: () => 'Settings2',
  Home: () => 'Home',
  Plus: () => 'Plus',
  Pencil: () => 'Pencil',
  Trash2: () => 'Trash2',
  Wifi: () => 'Wifi',
  BarChart2: () => 'BarChart2',
  X: () => 'X',
  Check: () => 'Check',
  Crosshair: () => 'Crosshair',
  Activity: () => 'Activity',
  ChevronDown: () => 'ChevronDown',
  Filter: () => 'Filter',
  History: () => 'History',
  Database: () => 'Database',
  Clock: () => 'Clock',
  Briefcase: () => 'Briefcase',
  LayoutGrid: () => 'LayoutGrid',
  ChevronRight: () => 'ChevronRight',
  GitBranch: () => 'GitBranch',
  AlertTriangle: () => 'AlertTriangle',
  Landmark: () => 'Landmark',
  Wallet: () => 'Wallet',
  Download: () => 'Download',
  Upload: () => 'Upload',
  HardDrive: () => 'HardDrive',
  Bell: () => 'Bell',
  TrendingUp: () => 'TrendingUp',
  TrendingDown: () => 'TrendingDown',
  ArrowDownLeft: () => 'ArrowDownLeft',
  ArrowUpRight: () => 'ArrowUpRight',
  DollarSign: () => 'DollarSign',
  Layers: () => 'Layers',
  CheckCircle2: () => 'CheckCircle2',
  XCircle: () => 'XCircle',
  CalendarDays: () => 'CalendarDays',
  List: () => 'List',
  ChevronLeft: () => 'ChevronLeft',
  Search: () => 'Search',
}))

// Mock server actions
vi.mock('@/app/actions', () => ({
  createSimulation: vi.fn(),
  deleteSimulation: vi.fn(),
  listSimulations: vi.fn(),
  getSymbolMetas: vi.fn(),
  upsertSymbolMeta: vi.fn(),
  fetchSymbolPrice: vi.fn(),
  fetchMarketIndex: vi.fn(),
  getStrategies: vi.fn(),
  addStrategy: vi.fn(),
  updateStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  getApiStats: vi.fn(),
  getSourceConfigs: vi.fn(),
  upsertSourceConfig: vi.fn(),
  setDefaultSource: vi.fn(),
  fetchAndCacheOptionsDelta: vi.fn(),
  getOptionsDeltaRows: vi.fn(),
  getAvailableOptionsDates: vi.fn(),
  getOptionsApiStats: vi.fn(),
  getOptionsTrades: vi.fn(),
  addOptionsTrade: vi.fn(),
  deleteOptionsTrade: vi.fn(),
  getStockTrades: vi.fn(),
  addStockTrade: vi.fn(),
  deleteStockTrade: vi.fn(),
  deleteAllTrades: vi.fn(),
  getOptionsPriceMap: vi.fn(),
  getLoans: vi.fn(),
  createLoan: vi.fn(),
  deleteLoan: vi.fn(),
  getApiCacheEntries: vi.fn(),
  getApiUsageEntries: vi.fn(),
  getOptionsDeltaCacheEntries: vi.fn(),
  getOptionsTargets: vi.fn(),
  createOptionsTarget: vi.fn(),
  deleteOptionsTarget: vi.fn(),
  getOptionsTargetMatches: vi.fn(),
  updateLoan: vi.fn(),
  updateOptionsTarget: vi.fn(),
  updateOptionsTrade: vi.fn(),
  updateStockTrade: vi.fn(),
  getLoanPayments: vi.fn(),
  addLoanPayment: vi.fn(),
  updateLoanPayment: vi.fn(),
  deleteLoanPayment: vi.fn(),
  getLoanRateEvents: vi.fn(),
  addLoanRateEvent: vi.fn(),
  deleteLoanRateEvent: vi.fn(),
  getAppSettings: vi.fn(),
  upsertAppSetting: vi.fn(),
  getCashEvents: vi.fn(),
  addCashEvent: vi.fn(),
  deleteCashEvent: vi.fn(),
}))
