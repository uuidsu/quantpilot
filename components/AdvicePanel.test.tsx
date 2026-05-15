import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdvicePanel } from './AdvicePanel';

describe('AdvicePanel', () => {
  it('renders safe state correctly and applies success styles', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1} limit={2} />);

    await waitFor(() => {
      expect(screen.getByText('Comfortable Exposure')).toBeVisible();
      expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeVisible();
    });

    // Assertion 3: Test underlying styling class to make it robust
    expect(container.querySelector('.bg-emerald-500\\/10')).toBeInTheDocument();
  });

  it('renders warning state correctly and applies warning styles', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1.7} limit={2} />);

    await waitFor(() => {
      expect(screen.getByText('Approaching Limit')).toBeVisible();
      expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeVisible();
    });

    expect(container.querySelector('.bg-yellow-500\\/10')).toBeInTheDocument();
  });

  it('renders danger state correctly and applies danger styles', async () => {
    const { container } = render(<AdvicePanel currentLeverage={2.5} limit={2} />);

    await waitFor(() => {
      expect(screen.getByText('Margin Call Risk!')).toBeVisible();
      expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeVisible();
    });

    expect(container.querySelector('.bg-destructive\\/10')).toBeInTheDocument();
  });
});
