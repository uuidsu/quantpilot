import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '../AdvicePanel';

describe('AdvicePanel', () => {
  it('renders safe status and corresponding styles when leverage is below 80% of limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.5} limit={2.5} />);

    // Check specific text assertions
    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument();

    // Check styling
    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('bg-emerald-500/10');
    expect(panel).toHaveClass('border-emerald-500/20');

    // Title text styling
    const title = screen.getByText('Comfortable Exposure');
    expect(title).toHaveClass('text-emerald-400');

    // Verify icon renders (lucide-react adds SVG classes or use class name to find it)
    const iconContainer = panel.querySelector('.text-emerald-400');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders warning status and corresponding styles when leverage is above 80% but below limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={2.1} limit={2.5} />);

    // Check specific text assertions
    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument();

    // Check styling
    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('bg-yellow-500/10');
    expect(panel).toHaveClass('border-yellow-500/20');

    // Title text styling
    const title = screen.getByText('Approaching Limit');
    expect(title).toHaveClass('text-yellow-500');

    // Icon verification
    const iconContainer = panel.querySelector('.text-yellow-500');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders danger status and corresponding styles when leverage exceeds limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={3.0} limit={2.5} />);

    // Check specific text assertions
    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument();

    // Check styling
    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('bg-destructive/10');
    expect(panel).toHaveClass('border-destructive/20');

    // Title text styling
    const title = screen.getByText('Margin Call Risk!');
    expect(title).toHaveClass('text-destructive');

    // Icon verification
    const iconContainer = panel.querySelector('.text-destructive');
    expect(iconContainer).toBeInTheDocument();
  });
});
