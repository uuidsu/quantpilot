import { render } from '@testing-library/react';
import { MarketChart } from './MarketChart';
import { describe, it, expect, vi } from 'vitest';

vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    // Without responsive container resizing logic, AreaChart renders nothing in jsdom
    // Let's override it to render its children directly with fixed dimension
    ResponsiveContainer: ({ children }: any) => {
      // Recharts children expect width/height props from ResponsiveContainer
      const clone = require('react').cloneElement(children, { width: 500, height: 300 });
      return <div data-testid="recharts-wrapper">{clone}</div>;
    },
  };
});

describe('MarketChart', () => {
  it('renders correctly with given history data', () => {
    const history = [100, 105, 95, 110];
    const { container, getByTestId } = render(<MarketChart history={history} />);

    expect(getByTestId('recharts-wrapper')).toBeInTheDocument();

    // Check for the gradient definition which is part of structural rendering check
    expect(container.querySelector('#colorPriceMobile')).toBeInTheDocument();
  });
});
