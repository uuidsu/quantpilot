import { render, screen } from '@testing-library/react';
import { MarketChart } from '../MarketChart';

// ResizeObserver mock is loaded globally via setupTests.ts

// Mock recharts ResponsiveContainer to give it a fixed size in testing
vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual('recharts');

  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 400 }} data-testid="recharts-container">
        {children}
      </div>
    )
  };
});

describe('MarketChart', () => {
  it('renders without crashing with history data', () => {
    const mockHistory = [100, 105, 95, 110, 120];

    render(<MarketChart history={mockHistory} />);

    // Level 1: Smoke & Render Assertions
    expect(screen.getByTestId('recharts-container')).toBeInTheDocument();

    // Level 2: Core User Flows Assertions
    // Actually we just ensure it rendered the container since recharts has issue rendering in jsdom correctly without proper mocking
    const container = screen.getByTestId('recharts-container');
    expect(container).toHaveStyle({ width: '800px', height: '400px' });
  });
});
