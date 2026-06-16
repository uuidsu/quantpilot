import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock framer-motion to prevent issues and animation delays
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <div ref={ref} {...props} />
      )),
    },
  };
});

// Mock recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    Bar: () => <path />,
    AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    Area: () => <path />,
    PieChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    Pie: ({ children }: { children: React.ReactNode }) => <g>{children}</g>,
    Cell: () => <circle />,
    LineChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    Line: () => <path />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    Tooltip: () => <div />,
    Legend: () => <div />,
  };
});

// Mock pointer capture methods
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = function () {};
}
if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = function () {
    return false;
  };
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = function () {};
}
