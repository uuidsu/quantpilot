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

// Mock framer-motion (filtering props to avoid DOM warnings)
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  // A helper component to pass only valid HTML props to a DOM element
  const MotionComponent = React.forwardRef((props: any, ref: any) => {
    const {
      initial, animate, exit, transition,
      whileHover, whileTap, layoutId, mode,
      ...validProps
    } = props;
    return <div ref={ref} {...validProps} />;
  });
  MotionComponent.displayName = 'MotionComponent';

  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: MotionComponent,
      span: MotionComponent,
      button: MotionComponent,
    },
  };
});
