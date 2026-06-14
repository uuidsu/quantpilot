import React from 'react';
import { render } from '@testing-library/react';
import { MarketChart } from '../components/MarketChart';
import { describe, it, expect, vi } from 'vitest';

// Mock recharts to completely skip rendering issues in jsdom
vi.mock('recharts', async () => {
    const ActualRecharts = await vi.importActual<any>('recharts');
    return {
        ...ActualRecharts,
        ResponsiveContainer: ({ children }: any) => (
            <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>{children}</div>
        ),
        AreaChart: ({ children }: any) => <svg data-testid="area-chart">{children}</svg>,
        Area: () => <path data-testid="area" />,
        XAxis: () => <g data-testid="x-axis" />,
        YAxis: () => <g data-testid="y-axis" />,
        CartesianGrid: () => <g data-testid="cartesian-grid" />,
        Tooltip: () => <div data-testid="tooltip" />,
    };
});

describe('MarketChart Component Level 1: Smoke & Render', () => {
    it('renders structural mock definitions for the chart properly', () => {
        const history = [100, 105, 102, 110];
        const { getByTestId, container } = render(<MarketChart history={history} />);

        expect(getByTestId('responsive-container')).toBeInTheDocument();
        expect(getByTestId('area-chart')).toBeInTheDocument();
        expect(getByTestId('x-axis')).toBeInTheDocument();
        expect(getByTestId('y-axis')).toBeInTheDocument();
        expect(getByTestId('cartesian-grid')).toBeInTheDocument();
        expect(getByTestId('tooltip')).toBeInTheDocument();
        expect(getByTestId('area')).toBeInTheDocument();

        // Check if definitions (linearGradient) are present
        const defs = container.querySelector('defs');
        expect(defs).toBeInTheDocument();

        const linearGradient = container.querySelector('linearGradient#colorPriceMobile');
        expect(linearGradient).toBeInTheDocument();
        expect(linearGradient?.getAttribute('x1')).toBe('0');
        expect(linearGradient?.getAttribute('y1')).toBe('0');
    });

    it('renders with empty history', () => {
        const { getByTestId } = render(<MarketChart history={[]} />);

        expect(getByTestId('responsive-container')).toBeInTheDocument();
        expect(getByTestId('area-chart')).toBeInTheDocument();
    });
});
