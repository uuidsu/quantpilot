import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { MarketChart } from './MarketChart';

// Memory says: mock ResponsiveContainer to return a wrapper with explicit dimensions
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 300 }}>
        {React.cloneElement(children, { width: 400, height: 300 })}
      </div>
    ),
  };
});

describe('MarketChart', () => {
  it('renders structural elements like area chart svg and linear gradient', () => {
    const history = [100, 105, 110, 108, 115];
    const { container } = render(<MarketChart history={history} />);

    // Smoke check 1: Svg surface is rendered
    const svgElement = container.querySelector('.recharts-surface');
    expect(svgElement).toBeInTheDocument();

    // Smoke check 2: linearGradient definition exists for chart coloring
    const linearGradient = container.querySelector('linearGradient#colorPriceMobile');
    expect(linearGradient).toBeInTheDocument();
  });
});
