import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '../AdvicePanel';

describe('AdvicePanel', () => {
  it('renders safe state when leverage is low', () => {
    render(<AdvicePanel currentLeverage={1} limit={2} />);

    // Level 1: Smoke & Render Assertions
    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();

    // Asserting correct styling class for safe state
    const heading = screen.getByText('Comfortable Exposure');
    expect(heading).toHaveClass('text-emerald-400');
  });

  it('renders warning state when leverage is approaching limit', () => {
    render(<AdvicePanel currentLeverage={1.8} limit={2} />);

    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();

    const heading = screen.getByText('Approaching Limit');
    expect(heading).toHaveClass('text-yellow-500');
  });

  it('renders danger state when leverage exceeds limit', () => {
    render(<AdvicePanel currentLeverage={2.5} limit={2} />);

    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();

    const heading = screen.getByText('Margin Call Risk!');
    expect(heading).toHaveClass('text-destructive');
  });
});
