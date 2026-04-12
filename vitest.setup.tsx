import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual('recharts');
  return {
    ...OriginalRechartsModule as any,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '100%', height: 300 }}>{children}</div>
    ),
  };
});

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Setup fake timer and mocked getSymbolMetas for level 3
vi.mock('@/app/actions', () => ({
  getSimulation: vi.fn().mockResolvedValue(null),
  createSimulation: vi.fn().mockResolvedValue({ id: 1 }),
  stepSimulation: vi.fn().mockResolvedValue([]),
  executeTrade: vi.fn().mockResolvedValue([]),
  getRecentTrades: vi.fn().mockResolvedValue([]),
  getPortfolio: vi.fn().mockResolvedValue([]),
  getSymbolMetas: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 50))),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  saveAdvice: vi.fn().mockResolvedValue({}),
  getSavedAdvice: vi.fn().mockResolvedValue([]),
  deleteSavedAdvice: vi.fn().mockResolvedValue({}),
  getLoans: vi.fn().mockResolvedValue([]),
  getInterestRateEvents: vi.fn().mockResolvedValue([]),
  getRepayments: vi.fn().mockResolvedValue([]),
  getLoanInterestEvents: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getMarginCalls: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  addStrategy: vi.fn().mockResolvedValue({id: 1, name: '預設策略'}),
  getStrategyRules: vi.fn().mockResolvedValue([]),
  getTradeSuggestions: vi.fn().mockResolvedValue([]),
  getSuggestionApprovals: vi.fn().mockResolvedValue([]),
  getOptionSymbols: vi.fn().mockResolvedValue([]),
  getGreeksMap: vi.fn().mockResolvedValue({}),
  getSimulations: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 10000 }),
  getOptionsApiStats: vi.fn().mockResolvedValue({ calls: [], cooldownUntil: null }),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
}));
