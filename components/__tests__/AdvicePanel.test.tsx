import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '../AdvicePanel';

describe('AdvicePanel - Sentinel Level Progression', () => {
  // Level 1: Smoke & Render
  it('Level 1: Renders safe state when leverage is zero', async () => {
    render(<AdvicePanel currentLeverage={0} limit={10} />);

    await waitFor(() => {
      expect(screen.getByText('Comfortable Exposure')).toBeVisible();
    });
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeVisible();
  });

  it('Level 1: Renders safe state when leverage is well below limit', async () => {
    render(<AdvicePanel currentLeverage={5} limit={10} />);

    await waitFor(() => {
      expect(screen.getByText('Comfortable Exposure')).toBeVisible();
    });
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeVisible();
  });

  // Level 2: Core User Flows
  it('Level 2: Renders warning state when approaching limit', async () => {
    render(<AdvicePanel currentLeverage={9} limit={10} />);

    await waitFor(() => {
      expect(screen.getByText('Approaching Limit')).toBeVisible();
    });
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeVisible();
  });


  // Level 3: Asynchronous & State
  it('Level 3: Renders danger state when leverage exceeds limit', async () => {
    render(<AdvicePanel currentLeverage={11} limit={10} />);

    await waitFor(() => {
      expect(screen.getByText('Margin Call Risk!')).toBeVisible();
    });
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeVisible();
  });

  // Level 4: Edge Cases & Boundaries
  it('Level 4: Renders safe state at exact 0.8 boundary', async () => {
    render(<AdvicePanel currentLeverage={8} limit={10} />);

    await waitFor(() => {
      expect(screen.getByText('Comfortable Exposure')).toBeVisible();
    });
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeVisible();
  });

  it('Level 4: Renders warning state at exact limit boundary', async () => {
    render(<AdvicePanel currentLeverage={10} limit={10} />);

    await waitFor(() => {
      expect(screen.getByText('Approaching Limit')).toBeVisible();
    });
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeVisible();
  });

  it('Level 4: Handles zero limit correctly', async () => {
    render(<AdvicePanel currentLeverage={1} limit={0} />);

    await waitFor(() => {
      expect(screen.getByText('Margin Call Risk!')).toBeVisible();
    });
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeVisible();
  });

});
