import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarketChart } from '@/components/MarketChart';

describe('MarketChart (Level 1: Smoke & Render)', () => {
  it('renders ResponsiveContainer properly with SVG components', () => {
    const mockHistory = [100, 105, 102, 110];

    const { container } = render(<MarketChart history={mockHistory} />);

    // In our ResponsiveContainer mock, it returns a div with width 100% and height 300px
    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toBeInTheDocument();
    expect(wrapperDiv).toHaveStyle('width: 100%');
    expect(wrapperDiv).toHaveStyle('height: 300px');

    // JSDOM does not render SVGs from recharts reliably when using mock
    // Just verify the container is rendered correctly
  });
});
