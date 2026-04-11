import React from 'react';
import { render } from '@testing-library/react';
import { MarketChart } from '@/components/MarketChart';

describe('MarketChart Component - Level 2/3: Assert Recharts render', () => {
  it('renders history data correctly', () => {
    const mockHistory = [100, 105, 110, 108, 115];
    const { container } = render(<MarketChart history={mockHistory} />);

    const wrapper = container.querySelector('.recharts-responsive-container');
    expect(wrapper).toBeInTheDocument();

    const svg = container.querySelector('svg.recharts-surface');
    expect(svg).toBeInTheDocument();

    const paths = container.querySelectorAll('path.recharts-area-area');
    expect(paths.length).toBeGreaterThan(0);

    const textNodes = Array.from(container.querySelectorAll('text.recharts-cartesian-axis-tick-value'));
    expect(textNodes.length).toBeGreaterThan(0);

    const hasDayOne = textNodes.some(node => node.textContent === '1');
    const hasDayFive = textNodes.some(node => node.textContent === '5');
    expect(hasDayOne).toBe(true);
    expect(hasDayFive).toBe(true);
  });
});
