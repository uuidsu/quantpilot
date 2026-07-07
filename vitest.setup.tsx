import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock matchMedia
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

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock setPointerCapture
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mock next/navigation
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

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: React.forwardRef<HTMLDivElement, any>((props, ref) => {
        const { layoutId, animate, initial, exit, transition, ...rest } = props;
        return <div ref={ref} {...rest} />;
      }),
      button: React.forwardRef<HTMLButtonElement, any>((props, ref) => {
        const { layoutId, animate, initial, exit, transition, ...rest } = props;
        return <button ref={ref} {...rest} />;
      }),
      span: React.forwardRef<HTMLSpanElement, any>((props, ref) => {
        const { layoutId, animate, initial, exit, transition, ...rest } = props;
        return <span ref={ref} {...rest} />;
      }),
    }
  };
});

// Mock recharts
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 600 }}>{children}</div>
    ),
    AreaChart: ({ children }: any) => <svg data-testid="recharts-area-chart">{children}</svg>,
    Area: () => <path data-testid="recharts-area" />,
    XAxis: () => <g data-testid="recharts-xaxis" />,
    YAxis: () => <g data-testid="recharts-yaxis" />,
    CartesianGrid: () => <g data-testid="recharts-grid" />,
    Tooltip: () => <div data-testid="recharts-tooltip" />,
    ReferenceLine: () => <line data-testid="recharts-reference-line" />,
  };
});
