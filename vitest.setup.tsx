import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock framer-motion to prevent animation issues in jsdom
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual as any,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      // Filter out framer-motion specific props
      div: ({ layoutId, animate, initial, exit, transition, ...props }: any) => <div {...props} />,
    },
  };
});

// Polyfill ResizeObserver for Recharts
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverPolyfill;

// Mock Recharts ResponsiveContainer for jsdom environment to force dimensions
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual as any,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-responsive-container" style={{ width: 800, height: 600 }}>
        {typeof children === 'function'
          ? children({ width: 800, height: 600 })
          : React.cloneElement(children, { width: 800, height: 600 })
        }
      </div>
    ),
  };
});
