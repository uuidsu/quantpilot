import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '../components/AdvicePanel';

describe('AdvicePanel', () => {
  it('renders "safe" state when leverage is low', async () => {
    render(<AdvicePanel currentLeverage={1.5} limit={2.0} />);

    // Wait for the AnimatePresence/motion component to render content
    await waitFor(() => {
      expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    });

    // Second assertion: check the detailed message
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();
  });

  it('renders "warning" state when leverage is approaching the limit', async () => {
    // 1.9 is > 2.0 * 0.8 (1.6) and <= 2.0
    render(<AdvicePanel currentLeverage={1.9} limit={2.0} />);

    await waitFor(() => {
      expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    });

    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();
  });

  it('renders "danger" state when leverage exceeds the limit', async () => {
    // 2.5 is > 2.0
    render(<AdvicePanel currentLeverage={2.5} limit={2.0} />);

    await waitFor(() => {
      expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    });

    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();
  });
});
