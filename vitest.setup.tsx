import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

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

// Mock Next Navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock framer-motion components that could cause issues in jsdom
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  // Custom mock component factory that filters out framer-motion specific props
  const mockComponent = (tag: keyof JSX.IntrinsicElements) => {
    const Component = ({
      children,
      layoutId,
      animate,
      initial,
      exit,
      transition,
      layout,
      whileHover,
      whileTap,
      ...props
    }: any) => {
      const Tag = tag as any;
      return <Tag {...props}>{children}</Tag>;
    };
    return Component;
  };

  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: mockComponent('div'),
      span: mockComponent('span'),
      button: mockComponent('button'),
      a: mockComponent('a'),
      p: mockComponent('p'),
      li: mockComponent('li'),
      ul: mockComponent('ul'),
    }
  };
});

// Mock HTMLElement Pointer Capture
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

// Recharts mocking to prevent SVG structural errors in jsdom
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
    AreaChart: ({ children }: any) => <svg>{children}</svg>,
    Area: () => <path />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    Tooltip: () => null,
    ReferenceLine: () => <path />,
  };
});
