import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock window properties required by JSDOM
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

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    entries: vi.fn(() => []),
  }),
  usePathname: () => '/',
}));

// Mock Framer Motion
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: React.forwardRef<HTMLDivElement, any>((props, ref) => {
        const { layoutId, animate, initial, exit, transition, whileHover, whileTap, drag, dragConstraints, dragElastic, ...rest } = props;
        return <div ref={ref} {...rest} />;
      }),
      span: React.forwardRef<HTMLSpanElement, any>((props, ref) => {
        const { layoutId, animate, initial, exit, transition, whileHover, whileTap, drag, dragConstraints, dragElastic, ...rest } = props;
        return <span ref={ref} {...rest} />;
      }),
      ul: React.forwardRef<HTMLUListElement, any>((props, ref) => {
        const { layoutId, animate, initial, exit, transition, whileHover, whileTap, drag, dragConstraints, dragElastic, ...rest } = props;
        return <ul ref={ref} {...rest} />;
      }),
      li: React.forwardRef<HTMLLIElement, any>((props, ref) => {
        const { layoutId, animate, initial, exit, transition, whileHover, whileTap, drag, dragConstraints, dragElastic, ...rest } = props;
        return <li ref={ref} {...rest} />;
      }),
    }
  };
});

// Mock Recharts ResponsiveContainer to give it a fixed size
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

// Mock Pointer Events API for components that need swiping/dragging
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
