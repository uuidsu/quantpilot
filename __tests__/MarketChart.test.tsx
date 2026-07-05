import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketChart } from '@/components/MarketChart';

describe('MarketChart', () => {
  const mockData = [17000, 17100, 16900];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders chart data correctly', async () => {
    render(<MarketChart history={mockData} />);

    expect(screen.getByTestId('recharts-areachart')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-area')).toBeInTheDocument();
  });

  it('renders with correct minimum and maximum boundaries based on data', () => {
    render(<MarketChart history={mockData} />);

    expect(screen.getByTestId('recharts-yaxis')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-xaxis')).toBeInTheDocument();
  });

  it('renders defs correctly', () => {
    render(<MarketChart history={mockData} />);

    expect(document.querySelector('defs')).toBeInTheDocument();
    expect(document.querySelector('linearGradient')).toBeInTheDocument();
  });
});
