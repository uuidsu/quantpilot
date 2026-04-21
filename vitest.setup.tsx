import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// For Framer Motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock the prefers-reduced-motion hook internal to framer motion
vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<any>("framer-motion");
    return {
        ...actual,
        useReducedMotion: () => false,
    };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Recharts ResponsiveContainer to prevent width/height errors
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual<any>('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 600 }}>{children}</div>
    ),
  };
});
