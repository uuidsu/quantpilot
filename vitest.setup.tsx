import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

// Pointer Events API (needed by Framer Motion, some swiping libraries, etc)
if (typeof window !== 'undefined' && window.HTMLElement) {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Mock Recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();

  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 400, height: 300 }}>{children}</div>,
    AreaChart: ({ children }: any) => <svg data-testid="recharts-areachart">{children}</svg>,
    Area: ({ dataKey, stroke, fill, fillOpacity, activeDot, ...props }: any) => <path data-testid="recharts-area" {...props} />,
    XAxis: ({ dataKey, stroke, tick, tickLine, axisLine, dy, ...props }: any) => <g data-testid="recharts-xaxis" {...props} />,
    YAxis: ({ domain, stroke, tick, tickLine, axisLine, tickFormatter, ...props }: any) => <g data-testid="recharts-yaxis" {...props} />,
    Tooltip: () => <div data-testid="recharts-tooltip" />,
    CartesianGrid: ({ strokeDasharray, stroke, vertical, ...props }: any) => <g data-testid="recharts-grid" {...props} />
  };
});

// Mock Framer Motion
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  const motionDiv = React.forwardRef(({ children, layoutId, animate, initial, exit, transition, ...props }: any, ref) => {
    return <div ref={ref as any} {...props}>{children}</div>;
  });

  const motionButton = React.forwardRef(({ children, layoutId, animate, initial, exit, transition, ...props }: any, ref) => {
    return <button ref={ref as any} {...props}>{children}</button>;
  });

  const motionLi = React.forwardRef(({ children, layoutId, animate, initial, exit, transition, ...props }: any, ref) => {
    return <li ref={ref as any} {...props}>{children}</li>;
  });

  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: motionDiv,
      button: motionButton,
      li: motionLi,
    },
  };
});
