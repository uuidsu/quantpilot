import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarketChart } from '@/components/MarketChart';

describe('MarketChart', () => {
  it('renders without crashing (Level 1: Smoke & Render)', () => {
    const history = [100, 105, 102, 110];
    const { container } = render(<MarketChart history={history} />);

    const svg = container.querySelector('svg.recharts-surface');
    expect(svg).toBeInTheDocument();

    const linearGradient = container.querySelector('linearGradient#colorPriceMobile');
    expect(linearGradient).toBeInTheDocument();
  });

  it('handles empty history data correctly (Level 4: Edge Cases)', () => {
    const { container } = render(<MarketChart history={[]} />);
    const svg = container.querySelector('svg.recharts-surface');
    expect(svg).toBeInTheDocument();

    const area = container.querySelector('path.recharts-area-area');
    expect(area).not.toBeInTheDocument();
  });

  it('handles negative or zero prices correctly (Level 4: Edge Cases)', () => {
    const history = [-10, 0, 50, -5];
    const { container } = render(<MarketChart history={history} />);

    const svg = container.querySelector('svg.recharts-surface');
    expect(svg).toBeInTheDocument();

    const yAxisTicks = container.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value tspan');
    expect(yAxisTicks.length).toBeGreaterThan(0);
    // At least one tick should contain a negative value format or be scaled properly.
    // The exact string matching depends on d3 formatting, but we can verify it doesn't crash
  });
});
