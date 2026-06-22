import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '../components/AdvicePanel';
import { expect, it, describe } from 'vitest';

describe('AdvicePanel', () => {
  it('Level 1: Smoke & Render - Renders safe state when leverage is well below limit', async () => {
    render(<AdvicePanel currentLeverage={1.0} limit={2.0} />);

    // Using waitFor due to Framer Motion presence animations
    await waitFor(() => {
      const heading = screen.getByText('Comfortable Exposure');
      expect(heading).toBeInTheDocument();
      expect(heading).toBeVisible();
    });

    const message = screen.getByText(/room to increase exposure/i);
    expect(message).toBeInTheDocument();
    expect(message).toBeVisible();
  });

  it('Level 2: Warning State - Shows warning when approaching limit', async () => {
    render(<AdvicePanel currentLeverage={1.7} limit={2.0} />); // 1.7 > 2.0 * 0.8

    await waitFor(() => {
      const heading = screen.getByText('Approaching Limit');
      expect(heading).toBeInTheDocument();
      expect(heading).toBeVisible();
      // Test for specific warning classes if applicable
      expect(heading.className).toContain('text-yellow-500');
    });

    const message = screen.getByText(/be cautious with new purchases/i);
    expect(message).toBeInTheDocument();
    expect(message).toBeVisible();
  });

  it('Level 2: Danger State - Shows margin call risk when exceeding limit', async () => {
    render(<AdvicePanel currentLeverage={2.5} limit={2.0} />); // 2.5 > 2.0

    await waitFor(() => {
      const heading = screen.getByText('Margin Call Risk!');
      expect(heading).toBeInTheDocument();
      expect(heading).toBeVisible();
      expect(heading.className).toContain('text-destructive');
    });

    const message = screen.getByText(/exceeds your limit/i);
    expect(message).toBeInTheDocument();
    expect(message).toBeVisible();
  });
});
