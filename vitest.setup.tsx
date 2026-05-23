import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

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

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Provide some necessary mocks for pointer events if needed
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Mock Recharts to avoid rendering issues in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  CartesianGrid: () => <div />,
}));


// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => {
      // Filter out framer-motion specific props
      const validProps = Object.keys(props).reduce((acc: any, key) => {
        if (!['layoutId', 'animate', 'initial', 'exit', 'transition', 'whileHover', 'whileTap', 'variants'].includes(key)) {
          acc[key] = props[key];
        }
        return acc;
      }, {});
      return <div className={className} {...validProps}>{children}</div>;
    },
    button: ({ children, className, ...props }: any) => {
      const validProps = Object.keys(props).reduce((acc: any, key) => {
        if (!['layoutId', 'animate', 'initial', 'exit', 'transition', 'whileHover', 'whileTap', 'variants'].includes(key)) {
          acc[key] = props[key];
        }
        return acc;
      }, {});
      return <button className={className} {...validProps}>{children}</button>;
    },
    span: ({ children, className, ...props }: any) => {
      const validProps = Object.keys(props).reduce((acc: any, key) => {
        if (!['layoutId', 'animate', 'initial', 'exit', 'transition', 'whileHover', 'whileTap', 'variants'].includes(key)) {
          acc[key] = props[key];
        }
        return acc;
      }, {});
      return <span className={className} {...validProps}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
