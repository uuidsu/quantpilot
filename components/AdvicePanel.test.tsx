import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from './AdvicePanel';
import { describe, it, expect } from 'vitest';

describe('AdvicePanel', () => {
  it('Level 1: Smoke & Render - Safe state', async () => {
    render(<AdvicePanel currentLeverage={0.5} limit={1.0} />);

    await waitFor(() => {
      const title = screen.getByText('Comfortable Exposure');
      expect(title).toBeVisible();
      const message = screen.getByText('You have room to increase exposure by buying more shares.');
      expect(message).toBeVisible();
    });
  });

  it('Level 2: Core User Flows - Warning state', async () => {
    render(<AdvicePanel currentLeverage={0.9} limit={1.0} />);

    await waitFor(() => {
      const title = screen.getByText('Approaching Limit');
      expect(title).toBeVisible();
      const message = screen.getByText('Your leverage is getting high. Be cautious with new purchases.');
      expect(message).toBeVisible();
    });
  });

  it('Level 2: Core User Flows - Danger state', async () => {
    render(<AdvicePanel currentLeverage={1.5} limit={1.0} />);

    await waitFor(() => {
      const title = screen.getByText('Margin Call Risk!');
      expect(title).toBeVisible();
      const message = screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.');
      expect(message).toBeVisible();
    });
  });
});
