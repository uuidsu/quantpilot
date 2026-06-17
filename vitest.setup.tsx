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

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  const DummyComponent = ({ children, ...props }: any) => {
    const {
      layoutId, animate, initial, exit, transition,
      whileHover, whileTap, whileInView, viewport,
      variants, custom, drag, dragConstraints, dragElastic,
      onDragEnd, layout, ...validProps
    } = props;

    return <div {...validProps}>{children}</div>;
  };

  return {
    ...actual,
    motion: {
      div: DummyComponent,
      span: DummyComponent,
      p: DummyComponent,
      h1: DummyComponent,
      h2: DummyComponent,
      h3: DummyComponent,
      section: DummyComponent,
      button: DummyComponent,
      ul: DummyComponent,
      li: DummyComponent,
      a: DummyComponent,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
    AreaChart: ({ children }: any) => <svg data-testid="area-chart">{children}</svg>,
    Area: () => <path data-testid="area" />,
    XAxis: () => <g data-testid="x-axis" />,
    YAxis: () => <g data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    CartesianGrid: () => <g data-testid="cartesian-grid" />,
  };
});

// Mock Pointer Events API
if (typeof window !== 'undefined' && window.HTMLElement) {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
}
