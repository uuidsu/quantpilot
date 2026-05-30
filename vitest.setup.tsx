import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: React.forwardRef<HTMLDivElement, any>(({ layoutId, animate, initial, exit, transition, ...props }, ref) => (
        <div ref={ref} {...props} />
      )),
      span: React.forwardRef<HTMLSpanElement, any>(({ layoutId, animate, initial, exit, transition, ...props }, ref) => (
        <span ref={ref} {...props} />
      )),
      button: React.forwardRef<HTMLButtonElement, any>(({ layoutId, animate, initial, exit, transition, ...props }, ref) => (
        <button ref={ref} {...props} />
      )),
      p: React.forwardRef<HTMLParagraphElement, any>(({ layoutId, animate, initial, exit, transition, ...props }, ref) => (
        <p ref={ref} {...props} />
      )),
      h1: React.forwardRef<HTMLHeadingElement, any>(({ layoutId, animate, initial, exit, transition, ...props }, ref) => (
        <h1 ref={ref} {...props} />
      )),
      h2: React.forwardRef<HTMLHeadingElement, any>(({ layoutId, animate, initial, exit, transition, ...props }, ref) => (
        <h2 ref={ref} {...props} />
      )),
      h3: React.forwardRef<HTMLHeadingElement, any>(({ layoutId, animate, initial, exit, transition, ...props }, ref) => (
        <h3 ref={ref} {...props} />
      )),
    },
  };
});

// Mock recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 600 }}>{children}</div>
    ),
  };
});

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

// Mock window functions
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

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}
