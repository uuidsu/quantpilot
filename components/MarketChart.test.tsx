import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MarketChart } from './MarketChart';
import { describe, it, expect, vi } from 'vitest';

// Fix ResizeObserver mock properly
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// We will test if recharts classes are actually injected by mocking ResponsiveContainer
// to render with explicit width and height since jsdom doesn't compute layout
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-responsive-container" style={{ width: 400, height: 300 }}>
        {React.cloneElement(children, { width: 400, height: 300 })}
      </div>
    ),
  };
});

describe('MarketChart', () => {
  it('Level 1: Smoke & Render', async () => {
    // Provide correct prop `history` for MarketChart
    render(<MarketChart history={[100, 105, 102]} />);

    await waitFor(() => {
      // Look for the surface class which indicates recharts rendered SVG
      const svg = document.querySelector('.recharts-surface');
      expect(svg).toBeInTheDocument();

      // Look for custom defs like linearGradient used in AreaChart
      const defs = document.querySelector('defs');
      expect(defs).toBeInTheDocument();
    });
  });
});
