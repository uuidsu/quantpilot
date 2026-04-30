import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from './AdvicePanel';
import { describe, it, expect } from 'vitest';

describe('AdvicePanel', () => {
  it('renders safe state correctly and respects exact boundary condition (leverage == limit * 0.8)', async () => {
    // If limit * 0.8 is 0.8, leverage > 0.8 is warning, so leverage === 0.8 should be safe
    const { container } = render(<AdvicePanel currentLeverage={0.8} limit={1.0} />);

    await waitFor(() => {
      const heading = screen.getByText('Comfortable Exposure');
      expect(heading).toBeVisible();
      expect(heading).toHaveClass('text-emerald-400');
    });

    // Check message exact match
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeVisible();

    // Check parent card styling class
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-emerald-500/10');
    expect(card).toHaveClass('border-emerald-500/20');
  });

  it('renders warning state correctly for leverage > limit * 0.8 but <= limit (boundary limit check)', async () => {
    // Exact limit should be warning, as danger is leverage > limit
    const { container } = render(<AdvicePanel currentLeverage={1.0} limit={1.0} />);

    await waitFor(() => {
      const heading = screen.getByText('Approaching Limit');
      expect(heading).toBeVisible();
      expect(heading).toHaveClass('text-yellow-500');
    });

    // Check message exact match
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeVisible();

    // Check parent card styling class
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-yellow-500/10');
    expect(card).toHaveClass('border-yellow-500/20');
  });

  it('renders danger state correctly when leverage exceeds limit', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1.1} limit={1.0} />);

    await waitFor(() => {
      const heading = screen.getByText('Margin Call Risk!');
      expect(heading).toBeVisible();
      expect(heading).toHaveClass('text-destructive');
    });

    // Check message exact match
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeVisible();

    // Check parent card styling class
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-destructive/10');
    expect(card).toHaveClass('border-destructive/20');
  });
});
