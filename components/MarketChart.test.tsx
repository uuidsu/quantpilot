import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarketChart } from './MarketChart';

describe('MarketChart', () => {
  it('renders without crashing and outputs surface and container', () => {
    const { container } = render(<MarketChart history={[100, 105, 110]} />);

    // Assertion 1
    expect(container.querySelector('.recharts-surface')).toBeInTheDocument();
    // Assertion 2
    expect(container.querySelector('linearGradient')).toBeInTheDocument();
  });
});
