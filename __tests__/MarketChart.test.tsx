import { render, screen } from '@testing-library/react';
import { MarketChart } from '../components/MarketChart';
import { describe, it, expect, vi } from 'vitest';

// We need to mock recharts differently because jsdom does not support SVG/Canvas well.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-wrapper">{children}</div>,
    AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    Area: () => <div data-testid="area" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
  };
});

describe('MarketChart', () => {
  it('renders structural elements of the chart', () => {
    const history = [100, 110, 105, 120, 115];
    render(<MarketChart history={history} />);

    // Level 1: Render check (checking the structural mock elements)
    expect(screen.getByTestId('recharts-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('handles empty history gracefully', () => {
    render(<MarketChart history={[]} />);
    expect(screen.getByTestId('recharts-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });
});
