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

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Recharts ResponsiveContainer
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

// Mock Framer Motion
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  const DummyMotionComponent = React.forwardRef(({ children, ...props }: any, ref) => {
    // Filter out framer-motion specific props to prevent DOM warnings
    const {
      layoutId, animate, initial, exit, transition, whileHover, whileTap,
      layout, variants, custom, onAnimationComplete, onUpdate,
      ...domProps
    } = props;

    return React.createElement('div', { ...domProps, ref }, children);
  });

  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: DummyMotionComponent,
      span: DummyMotionComponent,
      button: DummyMotionComponent,
      h1: DummyMotionComponent,
      h2: DummyMotionComponent,
      h3: DummyMotionComponent,
      p: DummyMotionComponent,
      a: DummyMotionComponent,
    },
  };
});

// Pointer Events mock
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}
