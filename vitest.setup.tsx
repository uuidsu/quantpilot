import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import * as React from 'react';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
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

// Mock pointer events for Radix UI
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual('recharts') as typeof import('recharts');

  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
    ),
  };
});
