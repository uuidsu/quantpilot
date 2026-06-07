import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdvicePanel } from './AdvicePanel';

describe('AdvicePanel', () => {
  it('displays safe message when leverage is low', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1} limit={2} />);

    await waitFor(() => {
      // Meaningful Assertion 1: Check text content
      expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
      expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();

      // Meaningful Assertion 2: Check CSS class states for safe (emerald)
      expect(screen.getByText('Comfortable Exposure')).toHaveClass('text-emerald-400');
      // Verify Card container class
      expect(container.firstChild).toHaveClass('bg-emerald-500/10', 'border-emerald-500/20');
    });
  });

  it('displays warning message when leverage approaches limit', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1.8} limit={2} />);

    await waitFor(() => {
      // Meaningful Assertion 1: Check text content
      expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
      expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();

      // Meaningful Assertion 2: Check CSS class states for warning (yellow)
      expect(screen.getByText('Approaching Limit')).toHaveClass('text-yellow-500');
      // Verify Card container class
      expect(container.firstChild).toHaveClass('bg-yellow-500/10', 'border-yellow-500/20');
    });
  });

  it('displays danger message when leverage exceeds limit', async () => {
    const { container } = render(<AdvicePanel currentLeverage={2.5} limit={2} />);

    await waitFor(() => {
      // Meaningful Assertion 1: Check text content
      expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
      expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();

      // Meaningful Assertion 2: Check CSS class states for danger (destructive)
      expect(screen.getByText('Margin Call Risk!')).toHaveClass('text-destructive');
      // Verify Card container class
      expect(container.firstChild).toHaveClass('bg-destructive/10', 'border-destructive/20');
    });
  });
});
