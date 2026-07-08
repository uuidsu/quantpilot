import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '@/components/AdvicePanel';

describe('AdvicePanel', () => {
  it('renders correctly with safe leverage', () => {
    const { container } = render(<AdvicePanel currentLeverage={0.5} limit={1.0} />);

    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();

    const card = container.querySelector('.p-6');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-emerald-500/10', 'border-emerald-500/20');

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-emerald-400');
  });

  it('renders correctly with warning leverage', () => {
    const { container } = render(<AdvicePanel currentLeverage={0.9} limit={1.0} />);

    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();

    const card = container.querySelector('.p-6');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-yellow-500/10', 'border-yellow-500/20');

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-yellow-500');
  });

  it('renders correctly with danger leverage', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.2} limit={1.0} />);

    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();

    const card = container.querySelector('.p-6');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-destructive/10', 'border-destructive/20');

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-destructive');
  });
});
