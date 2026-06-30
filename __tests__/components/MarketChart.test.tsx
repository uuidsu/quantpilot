import { render, screen } from '@testing-library/react';
import { MarketChart } from '../../components/MarketChart';
import { vi } from 'vitest';

vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 400, height: 300 }} data-testid="responsive-container">{children}</div>,
    AreaChart: ({ children, data }: any) => <svg data-testid="area-chart" data-points={data.length}>{children}</svg>,
    Area: ({ dataKey }: any) => <path data-testid={`area-${dataKey}`} />,
    XAxis: ({ dataKey }: any) => <g data-testid={`xaxis-${dataKey}`} />,
    YAxis: ({ domain }: any) => <g data-testid="yaxis" data-domain={JSON.stringify(domain)} />,
    CartesianGrid: () => <g data-testid="cartesian-grid" />,
    Tooltip: () => <g data-testid="tooltip" />,
  };
});

describe('MarketChart', () => {
  it('renders structural chart elements correctly based on history data', () => {
    const historyData = [100, 105, 102, 110];
    render(<MarketChart history={historyData} />);

    // Assert structural wrapper
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

    // Assert main chart component and data length
    const chart = screen.getByTestId('area-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-points', '4');

    // Assert internal elements
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('xaxis-day')).toBeInTheDocument();
    expect(screen.getByTestId('area-price')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();

    // Assert YAxis domain calculation logic (buffer is 10% of min/max diff)
    // min = 100, max = 110, diff = 10, buffer = 1
    // domain = [99, 111]
    const yaxis = screen.getByTestId('yaxis');
    expect(yaxis).toBeInTheDocument();
    expect(yaxis).toHaveAttribute('data-domain', '[99,111]');
  });
});
