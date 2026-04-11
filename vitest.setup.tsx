import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock matchMedia
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

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Override recharts ResponsiveContainer fully to render children with explicit dimensions
vi.mock('recharts', async (importOriginal) => {
  const OriginalRechartsModule: any = await importOriginal();
  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-responsive-container" style={{ width: 500, height: 300 }}>
        {React.cloneElement(children, { width: 500, height: 300 })}
      </div>
    ),
  };
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

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
}));

Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 500 });
Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 300 });

SVGElement.prototype.getBoundingClientRect = () => ({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  top: 0,
  right: 100,
  bottom: 100,
  left: 0,
  toJSON: () => ({}),
});
