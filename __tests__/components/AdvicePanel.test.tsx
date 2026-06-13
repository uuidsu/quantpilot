import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '@/components/AdvicePanel';
import { describe, it, expect } from 'vitest';

describe('AdvicePanel', () => {
  it('renders safe status when leverage is well below limit', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1.5} limit={3} />);

    // Level 1: Smoke & Render
    expect(screen.getByText('Comfortable Exposure')).toBeVisible();
    expect(screen.getByText(/room to increase exposure/i)).toBeVisible();

    // Level 3/4: Assert specific UI states (Colors/classes)
    await waitFor(() => {
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-emerald-500/10');
      const title = screen.getByText('Comfortable Exposure');
      expect(title).toHaveClass('text-emerald-400');
    });
  });

  it('renders warning status when leverage is approaching limit', async () => {
    const { container } = render(<AdvicePanel currentLeverage={2.5} limit={3} />);

    // Level 2/3: State/Logic checks
    expect(screen.getByText('Approaching Limit')).toBeVisible();
    expect(screen.getByText(/getting high/i)).toBeVisible();

    // Level 3/4: Assert specific UI states (Colors/classes)
    await waitFor(() => {
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-yellow-500/10');
      const title = screen.getByText('Approaching Limit');
      expect(title).toHaveClass('text-yellow-500');
    });
  });

  it('renders danger status when leverage exceeds limit', async () => {
    const { container } = render(<AdvicePanel currentLeverage={3.5} limit={3} />);

    // Level 2/3: State/Logic checks
    expect(screen.getByText('Margin Call Risk!')).toBeVisible();
    expect(screen.getByText(/exceeds your limit/i)).toBeVisible();

    // Level 3/4: Assert specific UI states (Colors/classes)
    await waitFor(() => {
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-destructive/10');
      const title = screen.getByText('Margin Call Risk!');
      expect(title).toHaveClass('text-destructive');
    });
  });
});
