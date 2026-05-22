import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '../components/AdvicePanel';
import { describe, it, expect } from 'vitest';

describe('AdvicePanel', () => {
  it('Level 1: Renders safe state correctly (Smoke & Render)', () => {
    const { container } = render(<AdvicePanel currentLeverage={0.5} limit={1} />);
    const heading = screen.getByRole('heading', { level: 4, name: 'Comfortable Exposure' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-emerald-400');
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();

    expect(container.firstChild).toHaveClass('bg-emerald-500/10', 'border-emerald-500/20');
  });

  it('Level 2: Renders warning state correctly when approaching limit (State Transition)', () => {
    const { container } = render(<AdvicePanel currentLeverage={0.85} limit={1} />);
    const heading = screen.getByRole('heading', { level: 4, name: 'Approaching Limit' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-yellow-500');
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();

    expect(container.firstChild).toHaveClass('bg-yellow-500/10', 'border-yellow-500/20');
  });

  it('Level 3: Renders danger state correctly when exceeding limit (Critical State)', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.1} limit={1} />);
    const heading = screen.getByRole('heading', { level: 4, name: 'Margin Call Risk!' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-destructive');
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();

    expect(container.firstChild).toHaveClass('bg-destructive/10', 'border-destructive/20');
  });

  it('Level 4: Handles exact boundary edge cases correctly (Edge Cases)', () => {
    // Exactly at 80% of limit - should still be safe
    const { rerender } = render(<AdvicePanel currentLeverage={0.8} limit={1} />);
    expect(screen.getByRole('heading', { level: 4, name: 'Comfortable Exposure' })).toBeInTheDocument();

    // Exactly at limit - should be warning, not danger
    rerender(<AdvicePanel currentLeverage={1.0} limit={1} />);
    expect(screen.getByRole('heading', { level: 4, name: 'Approaching Limit' })).toBeInTheDocument();

    // Slightly above limit - should be danger
    rerender(<AdvicePanel currentLeverage={1.0001} limit={1} />);
    expect(screen.getByRole('heading', { level: 4, name: 'Margin Call Risk!' })).toBeInTheDocument();
  });
});
