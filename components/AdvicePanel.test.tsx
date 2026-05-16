import { render, screen } from '@testing-library/react';
import { AdvicePanel } from './AdvicePanel';
import { describe, it, expect } from 'vitest';

describe('AdvicePanel', () => {
  it('renders safe status when currentLeverage <= limit * 0.8', () => {
    render(<AdvicePanel currentLeverage={1.5} limit={2.0} />);
    expect(screen.getByText('Comfortable Exposure')).toBeVisible();
    expect(screen.getByText(/You have room to increase exposure/i)).toBeVisible();
  });

  it('renders warning status when currentLeverage > limit * 0.8 and <= limit', () => {
    render(<AdvicePanel currentLeverage={1.7} limit={2.0} />);
    expect(screen.getByText('Approaching Limit')).toBeVisible();
    expect(screen.getByText(/Your leverage is getting high/i)).toBeVisible();
  });

  it('renders danger status when currentLeverage > limit', () => {
    render(<AdvicePanel currentLeverage={2.5} limit={2.0} />);
    expect(screen.getByText('Margin Call Risk!')).toBeVisible();
    expect(screen.getByText(/Your leverage exceeds your limit/i)).toBeVisible();
  });
});
