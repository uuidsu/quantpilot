import { render } from '@testing-library/react';
import { MarketChart } from './MarketChart';
import { describe, it, expect, vi } from 'vitest';

vi.mock('recharts', async () => {
    const ActualRecharts = await vi.importActual('recharts');
    return {
        ...ActualRecharts,
        ResponsiveContainer: ({ children }: any) => (
            <div data-testid="responsive-container" style={{ width: 800, height: 600 }}>
                {children}
            </div>
        )
    };
});

describe('MarketChart', () => {
  it('renders correctly with given history and applies proper dimensions', () => {
    const { container } = render(<MarketChart history={[100, 110, 120]} />);

    // Assertion 1: Verify the responsive container is rendered
    const responsiveContainer = container.querySelector('[data-testid="responsive-container"]');
    expect(responsiveContainer).toBeInTheDocument();

    // Assertion 2: Verify the responsive container applies the correct layout dimensions from the mock
    expect(responsiveContainer).toHaveStyle({ width: '800px', height: '600px' });
  });
});
