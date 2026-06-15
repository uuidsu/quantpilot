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

// Mock Pointer Events API
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mock framer-motion to avoid DOM warnings
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  const FilteredMotionDiv = React.forwardRef<HTMLDivElement, any>(
    ({ layoutId, animate, initial, exit, transition, ...props }, ref) => {
      return <div ref={ref} {...props} />;
    }
  );
  FilteredMotionDiv.displayName = 'FilteredMotionDiv';

  const FilteredMotionSpan = React.forwardRef<HTMLSpanElement, any>(
    ({ layoutId, animate, initial, exit, transition, ...props }, ref) => {
      return <span ref={ref} {...props} />;
    }
  );
  FilteredMotionSpan.displayName = 'FilteredMotionSpan';

  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: FilteredMotionDiv,
      span: FilteredMotionSpan,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});
