import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '@/components/AdvicePanel';

describe('AdvicePanel Level 3', () => {
  it('renders safe status correctly', () => {
    const { container } = render(<AdvicePanel currentLeverage={0.5} limit={1} />);

    const title = screen.getByText('Comfortable Exposure');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-emerald-400');

    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();

    expect(container.firstChild).toHaveClass('bg-emerald-500/10');
  });

  it('renders warning status when leverage is above 80% of limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={0.85} limit={1} />);

    const title = screen.getByText('Approaching Limit');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-yellow-500');

    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();

    expect(container.firstChild).toHaveClass('bg-yellow-500/10');
  });

  it('renders danger status when leverage exceeds limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.2} limit={1} />);

    const title = screen.getByText('Margin Call Risk!');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-destructive');

    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();

    expect(container.firstChild).toHaveClass('bg-destructive/10');
  });

  it('updates state and transitions correctly using framer-motion key', async () => {
    const { rerender } = render(<AdvicePanel currentLeverage={0.5} limit={1} />);

    // Initial state: Safe
    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();

    // Transition to: Warning
    rerender(<AdvicePanel currentLeverage={0.85} limit={1} />);
    await waitFor(() => {
      expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    });

    // Transition to: Danger
    rerender(<AdvicePanel currentLeverage={1.2} limit={1} />);
    await waitFor(() => {
      expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    });

    // Back to Safe
    rerender(<AdvicePanel currentLeverage={0.1} limit={1} />);
    await waitFor(() => {
      expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    });
  });
});
