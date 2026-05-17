import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '../components/AdvicePanel';
import { describe, it, expect } from 'vitest';

describe('AdvicePanel', () => {
  it('renders safe state correctly', async () => {
    render(<AdvicePanel currentLeverage={1} limit={2} />);

    // Level 1: Render check
    await waitFor(() => {
      expect(screen.getByText('Comfortable Exposure')).toBeVisible();
    });

    // Check specific text
    expect(screen.getByText(/You have room to increase exposure by buying more shares/i)).toBeVisible();

    // Check styling indirectly (assuming standard colors map to these classes in the component)
    const card = screen.getByText('Comfortable Exposure').closest('.border');
    expect(card).toHaveClass('bg-emerald-500/10');
  });

  it('renders warning state correctly', async () => {
    // 1.8 is 90% of 2.0 (greater than 80%)
    const { rerender } = render(<AdvicePanel currentLeverage={1} limit={2.0} />);
    rerender(<AdvicePanel currentLeverage={1.8} limit={2.0} />);

    await waitFor(() => {
      expect(screen.getByText('Approaching Limit')).toBeVisible();
    });
    expect(screen.getByText(/Your leverage is getting high. Be cautious with new purchases/i)).toBeVisible();
    const card = screen.getByText('Approaching Limit').closest('.border');
    expect(card).toHaveClass('bg-yellow-500/10');
  });

  it('renders danger state correctly', async () => {
    // 2.5 is greater than limit of 2.0
    render(<AdvicePanel currentLeverage={2.5} limit={2.0} />);

    await waitFor(() => {
      expect(screen.getByText('Margin Call Risk!')).toBeVisible();
    });
    expect(screen.getByText(/Your leverage exceeds your limit. Consider selling shares immediately to reduce risk/i)).toBeVisible();
    const card = screen.getByText('Margin Call Risk!').closest('.border');
    expect(card).toHaveClass('bg-destructive/10');
  });

  it('renders safe state when exactly at limit (edge case)', async () => {
    // If leverage = limit, status should technically be warning or safe depending on implementation.
    // The current implementation uses `currentLeverage > limit` for danger, so exactly at limit should NOT be danger.
    render(<AdvicePanel currentLeverage={2.0} limit={2.0} />);

    await waitFor(() => {
      expect(screen.getByText('Approaching Limit')).toBeVisible();
    });
    const card = screen.getByText('Approaching Limit').closest('.border');
    expect(card).toHaveClass('bg-yellow-500/10');
  });
});
