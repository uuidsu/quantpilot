import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

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

// Mock pointer events
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Mock Recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
    AreaChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="recharts-area-chart">{children}</svg>,
    Area: () => <path data-testid="recharts-area" />,
    XAxis: () => <g data-testid="recharts-xaxis" />,
    YAxis: () => <g data-testid="recharts-yaxis" />,
    CartesianGrid: () => <g data-testid="recharts-cartesiangrid" />,
    Tooltip: () => <g data-testid="recharts-tooltip" />,
  };
});

// Mock framer-motion
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  const DummyMotion = React.forwardRef<any, any>(({ layoutId, animate, initial, exit, transition, variants, whileHover, whileTap, ...props }, ref) => {
    const Component = props.as || 'div';
    return <Component ref={ref} {...props} />;
  });
  DummyMotion.displayName = 'DummyMotion';

  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: DummyMotion,
      span: DummyMotion,
      button: DummyMotion,
      svg: DummyMotion,
      path: DummyMotion,
      custom: (Component: React.ComponentType) => React.forwardRef<any, any>((props, ref) => <Component ref={ref} {...props} />),
    },
  };
});
