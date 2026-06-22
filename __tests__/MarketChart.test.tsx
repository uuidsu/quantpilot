import { render } from '@testing-library/react';
import { MarketChart } from '../components/MarketChart';
import { vi, expect, it, describe } from 'vitest';

// Mock Recharts components structurally
vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: any) => (
    <div style={{ width: 400, height: 300 }} data-testid="recharts-wrapper">
      {children}
    </div>
  );

  const MockAreaChart = ({ children, data }: any) => (
    <svg data-testid="area-chart" data-points={data.length}>
      {children}
    </svg>
  );

  const MockArea = () => <path data-testid="area-path" />;
  const MockXAxis = () => <g data-testid="x-axis" />;
  const MockYAxis = () => <g data-testid="y-axis" />;
  const MockCartesianGrid = () => <g data-testid="grid" />;
  const MockTooltip = () => null;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    AreaChart: MockAreaChart,
    Area: MockArea,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: MockCartesianGrid,
    Tooltip: MockTooltip,
  };
});

describe('MarketChart', () => {
  it('Level 1: Smoke & Render - Renders recharts structural elements correctly with data', () => {
    const history = [100, 105, 95, 110];
    const { getByTestId } = render(<MarketChart history={history} />);

    const wrapper = getByTestId('recharts-wrapper');
    expect(wrapper).toBeInTheDocument();

    const chart = getByTestId('area-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('data-points')).toBe('4');

    expect(getByTestId('area-path')).toBeInTheDocument();
    expect(getByTestId('x-axis')).toBeInTheDocument();
    expect(getByTestId('y-axis')).toBeInTheDocument();
  });

  it('Level 2: Edge Cases - Handles empty history gracefully', () => {
    const history: number[] = [];
    const { getByTestId } = render(<MarketChart history={history} />);

    const chart = getByTestId('area-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('data-points')).toBe('0');
  });
});
