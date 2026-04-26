import { render } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import { MarketChart } from '../components/MarketChart';

describe('MarketChart - Sentinel Tests', () => {
  const history = [100, 110, 105, 120];

  test('Level 1: Smoke & Render (The Baseline)', () => {
    const { container } = render(<MarketChart history={history} />);

    // Core structure rendering
    expect(container.firstChild).toBeInTheDocument();

    // SVG existence
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('recharts-surface');

    // Gradient definitions
    const linearGradient = container.querySelector('linearGradient#colorPriceMobile');
    expect(linearGradient).toBeInTheDocument();
    expect(linearGradient?.children).toHaveLength(2); // Two stop elements
  });

  test('Level 2: Core Render States (The Interaction)', () => {
    const { container } = render(<MarketChart history={history} />);

    // Data visualization: Area path
    const areaPath = container.querySelector('.recharts-area-area');
    expect(areaPath).toBeInTheDocument();
    expect(areaPath?.getAttribute('fill')).toBe('url(#colorPriceMobile)');
    expect(areaPath?.getAttribute('d')).toBeTruthy(); // Path must have drawing instructions

    // Axes presence
    const xAxis = container.querySelector('.recharts-xAxis');
    expect(xAxis).toBeInTheDocument();

    const yAxis = container.querySelector('.recharts-yAxis');
    expect(yAxis).toBeInTheDocument();
  });

  test('Level 3: Edge Cases & Data Boundary (The Hardening)', () => {
    // 1. Single data point rendering
    const { container: containerSingle } = render(<MarketChart history={[100]} />);
    expect(containerSingle.querySelector('svg')).toBeInTheDocument();
    // Area might not draw for a single point, but chart must not crash

    // 2. Flat line boundary
    const { container: containerSame } = render(<MarketChart history={[100, 100, 100]} />);
    const samePath = containerSame.querySelector('.recharts-area-area');
    expect(samePath).toBeInTheDocument();
    expect(samePath?.getAttribute('d')).toBeTruthy();

    // 3. Negative value integration
    const { container: containerNegative } = render(<MarketChart history={[-50, 0, 50]} />);
    const negPath = containerNegative.querySelector('.recharts-area-area');
    expect(negPath).toBeInTheDocument();
  });

  test('Level 4: Empty State Handling', () => {
    const { container } = render(<MarketChart history={[]} />);

    // Component should still return structure
    expect(container.firstChild).toBeInTheDocument();

    // Path shouldn't exist if there's no data
    expect(container.querySelector('.recharts-area-area')).not.toBeInTheDocument();
  });
});
