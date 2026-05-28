import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '../components/AdvicePanel';

describe('AdvicePanel', () => {
  it('renders safe state correctly', () => {
    render(<AdvicePanel currentLeverage={1} limit={2} />);
    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();
  });

  it('renders warning state correctly', () => {
    render(<AdvicePanel currentLeverage={1.7} limit={2} />);
    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();
  });

  it('renders danger state correctly', () => {
    render(<AdvicePanel currentLeverage={2.1} limit={2} />);
    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();
  });
});
