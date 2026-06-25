import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '@/components/AdvicePanel';

describe('AdvicePanel - Level 4 (Edge Cases & Boundaries)', () => {
  it('renders safe state correctly at lower boundary and below warning threshold', async () => {
    // limit = 10, currentLeverage = 8 (which is limit * 0.8)
    const { container } = render(<AdvicePanel currentLeverage={8} limit={10} />);

    // Asserting text
    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    expect(screen.getByText(/You have room to increase exposure/i)).toBeInTheDocument();

    // Check classes applied correctly
    await waitFor(() => {
      expect(container.firstChild).toHaveClass('bg-emerald-500/10');
      expect(container.firstChild).toHaveClass('border-emerald-500/20');
    });
  });

  it('renders warning state exactly above 80% of limit', async () => {
    // limit = 10, currentLeverage = 8.1
    const { container } = render(<AdvicePanel currentLeverage={8.1} limit={10} />);

    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText(/Your leverage is getting high/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('bg-yellow-500/10');
      expect(container.firstChild).toHaveClass('border-yellow-500/20');
    });
  });

  it('renders warning state at exactly the limit boundary', async () => {
    // limit = 10, currentLeverage = 10
    const { container } = render(<AdvicePanel currentLeverage={10} limit={10} />);

    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText(/Your leverage is getting high/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('bg-yellow-500/10');
    });
  });

  it('renders danger state correctly when exceeding limit', async () => {
    // limit = 10, currentLeverage = 10.1
    const { container } = render(<AdvicePanel currentLeverage={10.1} limit={10} />);

    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    expect(screen.getByText(/Your leverage exceeds your limit/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('bg-destructive/10');
      expect(container.firstChild).toHaveClass('border-destructive/20');
    });
  });
});
