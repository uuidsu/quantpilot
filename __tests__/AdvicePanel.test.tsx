import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import { AdvicePanel } from '../components/AdvicePanel';

describe('AdvicePanel - Sentinel Tests', () => {
  test('Level 1: Smoke & Render (Safe State)', async () => {
    const { container } = render(<AdvicePanel currentLeverage={0.5} limit={1.0} />);

    // Core structure
    expect(container.firstChild).toBeInTheDocument();

    // Check specific class for safe state
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-emerald-500/10');
    expect(card).toHaveClass('border-emerald-500/20');

    // Wait for Framer Motion animation to render the title
    await waitFor(() => {
      expect(screen.getByText('Comfortable Exposure')).toBeVisible();
    });

    // Subtitle rendering
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();

    // Check the title specific color class
    const title = screen.getByText('Comfortable Exposure');
    expect(title).toHaveClass('text-emerald-400');
  });

  test('Level 2: Core State Transitions (Warning State)', async () => {
    const { container } = render(<AdvicePanel currentLeverage={0.85} limit={1.0} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-yellow-500/10');

    await waitFor(() => {
      expect(screen.getByText('Approaching Limit')).toBeVisible();
    });

    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();

    const title = screen.getByText('Approaching Limit');
    expect(title).toHaveClass('text-yellow-500');
  });

  test('Level 3: Core State Transitions (Danger State)', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1.5} limit={1.0} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-destructive/10');

    await waitFor(() => {
      expect(screen.getByText('Margin Call Risk!')).toBeVisible();
    });

    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();

    const title = screen.getByText('Margin Call Risk!');
    expect(title).toHaveClass('text-destructive');
  });

  test('Level 4: Edge Cases (Exact boundary condition)', async () => {
    // Exactly at the 80% boundary - should still be safe according to logic (> limit * 0.8)
    const { container: containerSafeBound } = render(<AdvicePanel currentLeverage={0.8} limit={1.0} />);

    await waitFor(() => {
      expect(containerSafeBound.querySelector('.bg-emerald-500\\/10')).toBeInTheDocument();
    });

    // Exactly at the 100% boundary - should be warning, not danger according to logic (> limit)
    const { container: containerWarningBound } = render(<AdvicePanel currentLeverage={1.0} limit={1.0} />);

    await waitFor(() => {
      expect(containerWarningBound.querySelector('.bg-yellow-500\\/10')).toBeInTheDocument();
    });
  });
});
