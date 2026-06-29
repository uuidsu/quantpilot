import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '@/components/AdvicePanel';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className} data-testid="motion-div">{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('AdvicePanel - Sentinel Level 2', () => {
  it('renders safe state correctly when leverage is well below limit', () => {
    // Leverage 0.5 is well below limit 1 (0.5 < 1 * 0.8)
    const { container } = render(<AdvicePanel currentLeverage={0.5} limit={1} />);

    // Assert text and icon presence
    const title = screen.getByText('Comfortable Exposure');
    expect(title).toBeVisible();
    expect(title).toHaveClass('text-emerald-400');
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeVisible();

    // Assert background class
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-emerald-500/10');
  });

  it('renders warning state correctly when leverage approaches limit', () => {
    // Leverage 0.9 is approaching limit 1 (0.9 > 1 * 0.8)
    const { container } = render(<AdvicePanel currentLeverage={0.9} limit={1} />);

    // Assert text and icon presence
    const title = screen.getByText('Approaching Limit');
    expect(title).toBeVisible();
    expect(title).toHaveClass('text-yellow-500');
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeVisible();

    // Assert background class
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-yellow-500/10');
  });

  it('renders danger state correctly when leverage exceeds limit', () => {
    // Leverage 1.5 exceeds limit 1
    const { container } = render(<AdvicePanel currentLeverage={1.5} limit={1} />);

    // Assert text and icon presence
    const title = screen.getByText('Margin Call Risk!');
    expect(title).toBeVisible();
    expect(title).toHaveClass('text-destructive');
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeVisible();

    // Assert background class
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-destructive/10');
  });
});
