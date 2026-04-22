import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '../../components/AdvicePanel';

describe('AdvicePanel - Sentinel Level 1 & 2', () => {
  it('Level 1: Smoke & Render - renders "safe" state when leverage is well below limit', async () => {
    render(<AdvicePanel currentLeverage={50} limit={100} />);

    // Wait for animation to finish and element to be visible
    await waitFor(() => {
      const heading = screen.getByText('Comfortable Exposure');
      expect(heading).toBeInTheDocument();
      expect(heading).toBeVisible();
      expect(heading).toHaveClass('text-emerald-400');
    });

    const message = screen.getByText('You have room to increase exposure by buying more shares.');
    expect(message).toBeInTheDocument();
    expect(message).toBeVisible();

    // Card color assertions
    const card = message.closest('.p-6');
    expect(card).toHaveClass('bg-emerald-500/10');
  });

  it('Level 2: Core User Flows - renders "warning" state when approaching limit', async () => {
    // 85 is > 100 * 0.8
    render(<AdvicePanel currentLeverage={85} limit={100} />);

    await waitFor(() => {
      const heading = screen.getByText('Approaching Limit');
      expect(heading).toBeInTheDocument();
      expect(heading).toBeVisible();
      expect(heading).toHaveClass('text-yellow-500');
    });

    const message = screen.getByText('Your leverage is getting high. Be cautious with new purchases.');
    expect(message).toBeInTheDocument();
    expect(message).toBeVisible();

    const card = message.closest('.p-6');
    expect(card).toHaveClass('bg-yellow-500/10');
  });

  it('Level 2: Core User Flows - renders "danger" state when exceeding limit', async () => {
    // 110 is > 100
    render(<AdvicePanel currentLeverage={110} limit={100} />);

    await waitFor(() => {
      const heading = screen.getByText('Margin Call Risk!');
      expect(heading).toBeInTheDocument();
      expect(heading).toBeVisible();
      expect(heading).toHaveClass('text-destructive');
    });

    const message = screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.');
    expect(message).toBeInTheDocument();
    expect(message).toBeVisible();

    const card = message.closest('.p-6');
    expect(card).toHaveClass('bg-destructive/10');
  });
});
