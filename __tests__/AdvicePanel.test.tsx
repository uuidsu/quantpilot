import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '@/components/AdvicePanel';

describe('AdvicePanel Component - Level 3: Verify Status Styles and Content', () => {
  it('renders safe state when leverage is well below limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.2} limit={2.0} />);

    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();

    // Check for the specific CSS class associated with the safe state
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-emerald-500/10');
    expect(card.className).toContain('border-emerald-500/20');

    const title = screen.getByText('Comfortable Exposure');
    expect(title.className).toContain('text-emerald-400');
  });

  it('renders warning state when leverage is approaching limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.8} limit={2.0} />);

    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();

    // Check for the specific CSS class associated with the warning state
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-yellow-500/10');
    expect(card.className).toContain('border-yellow-500/20');

    const title = screen.getByText('Approaching Limit');
    expect(title.className).toContain('text-yellow-500');
  });

  it('renders danger state when leverage exceeds limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={2.5} limit={2.0} />);

    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();

    // Check for the specific CSS class associated with the danger state
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-destructive/10');
    expect(card.className).toContain('border-destructive/20');

    const title = screen.getByText('Margin Call Risk!');
    expect(title.className).toContain('text-destructive');
  });
});
