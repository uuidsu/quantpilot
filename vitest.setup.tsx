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
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');

  const motionPropsFilter = (props: any) => {
    const { layoutId, animate, initial, exit, transition, variants, whileHover, whileTap, ...rest } = props;
    return rest;
  };

  return {
    ...actual as any,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: React.forwardRef((props: any, ref: any) => {
        return <div ref={ref} {...motionPropsFilter(props)} />;
      }),
      span: React.forwardRef((props: any, ref: any) => {
        return <span ref={ref} {...motionPropsFilter(props)} />;
      }),
      button: React.forwardRef((props: any, ref: any) => {
        return <button ref={ref} {...motionPropsFilter(props)} />;
      }),
      ul: React.forwardRef((props: any, ref: any) => {
        return <ul ref={ref} {...motionPropsFilter(props)} />;
      }),
      li: React.forwardRef((props: any, ref: any) => {
        return <li ref={ref} {...motionPropsFilter(props)} />;
      }),
    },
  };
});
