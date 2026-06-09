import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '../../components/AdvicePanel';

describe('AdvicePanel - Sentinel Iterations', () => {
  // Level 1: Smoke & Render
  it('Level 1: Renders the default safe state with correct text and visibility', () => {
    render(<AdvicePanel currentLeverage={0.5} limit={1} />);
    const heading = screen.getByRole('heading', { level: 4 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Comfortable Exposure');

    const message = screen.getByText('You have room to increase exposure by buying more shares.');
    expect(message).toBeInTheDocument();
    expect(message).toBeVisible();
  });

  // Level 2: Core User Flows (State updates based on props)
  it('Level 2: Transitions to warning state when leverage is > 80% of limit', () => {
    render(<AdvicePanel currentLeverage={0.85} limit={1} />);

    const heading = screen.getByRole('heading', { level: 4 });
    expect(heading).toHaveTextContent('Approaching Limit');
    expect(heading).toHaveClass('text-yellow-500');

    const message = screen.getByText('Your leverage is getting high. Be cautious with new purchases.');
    expect(message).toBeVisible();
  });

  it('Level 2: Transitions to danger state when leverage strictly exceeds limit', () => {
    render(<AdvicePanel currentLeverage={1.1} limit={1} />);

    const heading = screen.getByRole('heading', { level: 4 });
    expect(heading).toHaveTextContent('Margin Call Risk!');
    expect(heading).toHaveClass('text-destructive');

    const message = screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.');
    expect(message).toBeVisible();
  });

  // Level 3 & 4: Asynchronous, State & Edge Cases
  it('Level 3 & 4: Maintains safe state exactly at 80% boundary and warning state exactly at 100% boundary', async () => {
    const { rerender } = render(<AdvicePanel currentLeverage={0.8} limit={1} />);

    // Boundary 1: Exactly 80% -> Should still be Safe
    let heading = screen.getByRole('heading', { level: 4 });
    expect(heading).toHaveTextContent('Comfortable Exposure');
    expect(heading).toHaveClass('text-emerald-400');

    // Update to Exactly 100% boundary
    rerender(<AdvicePanel currentLeverage={1.0} limit={1} />);

    // Wait for the re-render text to update (simulating async DOM changes / framer-motion)
    await waitFor(() => {
      const updatedHeading = screen.getByRole('heading', { level: 4 });
      expect(updatedHeading).toHaveTextContent('Approaching Limit');
      expect(updatedHeading).toHaveClass('text-yellow-500');
    });
  });
});
