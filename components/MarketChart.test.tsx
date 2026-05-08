import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarketChart } from './MarketChart';

describe('MarketChart', () => {
  it('renders SVG chart elements with provided history data', () => {
    const history = [100, 105, 102, 110, 108];
    const { container } = render(<MarketChart history={history} />);

    // Check structural rendering of Recharts in jsdom
    const svg = container.querySelector('svg.recharts-surface');
    expect(svg).toBeInTheDocument();

    // Verify custom gradient definitions are present
    const gradient = container.querySelector('linearGradient#colorPriceMobile');
    expect(gradient).toBeInTheDocument();

    // Recharts renders axes as specific class groups
    const xAxis = container.querySelector('.recharts-xAxis');
    const yAxis = container.querySelector('.recharts-yAxis');
    expect(xAxis).toBeInTheDocument();
    expect(yAxis).toBeInTheDocument();
  });

  it('calculates domain bounds correctly based on history', () => {
    // We can't directly check the internal domain state in jsdom, but we can verify
    // Recharts receives the correct domain bounds by inspecting the ticks if rendered
    // or by mocking recharts and intercepting the props.
    // Let's verify by inspecting the rendered tick values since Recharts renders text nodes for them.

    const history = [100, 150, 200];
    // Min = 100, Max = 200
    // Buffer = (200 - 100) * 0.1 = 10
    // Domain should be [90, 210]

    const { container } = render(<MarketChart history={history} />);

    // Check Y-axis ticks are rendered. The lowest tick should be >= 90 and highest <= 210
    const ticks = container.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value tspan');

    expect(ticks.length).toBeGreaterThan(0);

    const tickValues = Array.from(ticks).map(tick => {
      // Remove the leading '$' and parse as number
      return parseFloat(tick.textContent?.replace('$', '') || '0');
    });

    // Max tick should not exceed our calculated max bound + some Recharts padding
    const maxTick = Math.max(...tickValues);
    const minTick = Math.min(...tickValues);

    expect(maxTick).toBeLessThanOrEqual(210);
    expect(minTick).toBeGreaterThanOrEqual(90);
  });
});
