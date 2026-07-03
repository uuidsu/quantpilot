import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';
import { act } from '@testing-library/react';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Pointer Capture
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
}));

// Mock framer-motion components that cause issues
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <div ref={ref} {...props} />
      )),
      span: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <span ref={ref} {...props} />
      )),
    }
  };
});

// Mock Recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 600 }}>{children}</div>
    ),
    AreaChart: ({ children }: any) => <svg>{children}</svg>,
    Area: (props: any) => <path {...props} />,
    XAxis: (props: any) => <g {...props} />,
    YAxis: (props: any) => <g {...props} />,
  };
});

// Mock the actions API functions to return valid initialized data
vi.mock('@/app/actions', () => {
  const resolveImmed = (val: any) => vi.fn().mockResolvedValue(val);
  return {
    getHoldings: resolveImmed([]),
    getStrategies: resolveImmed([]),
    getOptionsTrades: resolveImmed([]),
    getOptionsTargetMatches: resolveImmed([]),
    getOptionsPriceMap: resolveImmed({}),
    getSymbolMetas: resolveImmed([]),
    getOptionsStats: resolveImmed([]),
    listSimulations: resolveImmed([{ id: 1, name: 'Default', isDefault: true }]),
    createSimulation: resolveImmed({}),
    getStockTrades: resolveImmed([]),
    getLoans: resolveImmed([]),
    getCashEvents: resolveImmed([]),
    fetchMarketIndices: resolveImmed([]),
    fetchMarketIndex: resolveImmed([]),
    getOptionsApiStats: resolveImmed({}),
    getAvailableOptionsDates: resolveImmed([]),
    upsertSymbolMeta: resolveImmed({}),
    getLoanPayments: resolveImmed([]),
    getLoanRateEvents: resolveImmed([]),
    getApiStats: resolveImmed({}),
    getSourceConfigs: resolveImmed([]),
    getAppSettings: resolveImmed({}),
  }
});
