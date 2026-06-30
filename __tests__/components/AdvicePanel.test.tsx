import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '../../components/AdvicePanel';

describe('AdvicePanel', () => {
  it('renders safe state correctly and applies green styling', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1} limit={2} />);

    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();

    // Check for safe class
    await waitFor(() => {
        const textElement = screen.getByText('Comfortable Exposure');
        expect(textElement.className).toContain('text-emerald-400');
    });
  });

  it('renders warning state correctly and applies yellow styling', async () => {
    const { container } = render(<AdvicePanel currentLeverage={1.8} limit={2} />);

    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();

    await waitFor(() => {
        const textElement = screen.getByText('Approaching Limit');
        expect(textElement.className).toContain('text-yellow-500');
    });
  });

  it('renders danger state correctly and applies red styling', async () => {
    const { container } = render(<AdvicePanel currentLeverage={2.5} limit={2} />);

    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();

    await waitFor(() => {
        const textElement = screen.getByText('Margin Call Risk!');
        expect(textElement.className).toContain('text-destructive');
    });
  });
});
