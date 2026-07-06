import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock framer-motion to render children directly without animations
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref) => {
        // filter out framer-motion specific props
        const { layoutId, animate, initial, exit, transition, ...rest } = props;
        return <div ref={ref} {...rest}>{children}</div>;
      })
    }
  };
});

// Mock recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 400, height: 300 }}>{children}</div>,
    AreaChart: ({ children }: any) => <svg>{children}</svg>,
    Area: (props: any) => <path {...props} />,
    XAxis: (props: any) => <g {...props} />,
    YAxis: (props: any) => <g {...props} />,
    BarChart: ({ children }: any) => <svg>{children}</svg>,
    Bar: (props: any) => <path {...props} />,
    PieChart: ({ children }: any) => <svg>{children}</svg>,
    Pie: (props: any) => <path {...props} />,
    Cell: (props: any) => <path {...props} />,
    Legend: (props: any) => <div {...props} />,
    Tooltip: (props: any) => <div {...props} />,
  };
});

window.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
