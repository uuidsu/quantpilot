import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock window matchMedia
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
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Mock Pointer Events API
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Mock Recharts ResponsiveContainer
vi.mock('recharts', async (importOriginal) => {
  const OriginalRecharts = await importOriginal();
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '100%', height: 300 }}>{children}</div>
    ),
  };
});

// Mock framer-motion to avoid animation issues in tests and invalid DOM attributes
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');

  const customMotion = new Proxy({}, {
    get: (_, tag) => {
      return React.forwardRef((props, ref) => {
        // filter out motion specific props
        const {
          initial,
          animate,
          exit,
          transition,
          variants,
          whileHover,
          whileTap,
          whileInView,
          whileFocus,
          whileDrag,
          onPan,
          onPanStart,
          onPanEnd,
          layoutId,
          layout,
          layoutScroll,
          ...validProps
        } = props as any;

        const Component = tag as any;
        return <Component ref={ref} {...validProps} />;
      });
    }
  });

  return {
    ...actual,
    motion: customMotion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});
