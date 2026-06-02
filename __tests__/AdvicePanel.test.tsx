import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '../components/AdvicePanel';

describe('AdvicePanel - Level 1: Smoke & Render', () => {
  it('renders safe status when leverage is well below limit', () => {
    render(<AdvicePanel currentLeverage={0.5} limit={1.0} />);
    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    expect(screen.getByText(/room to increase exposure/i)).toBeInTheDocument();
  });

  it('renders warning status when leverage approaches limit', () => {
    render(<AdvicePanel currentLeverage={0.9} limit={1.0} />);
    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText(/getting high/i)).toBeInTheDocument();
  });

  it('renders danger status when leverage exceeds limit', () => {
    render(<AdvicePanel currentLeverage={1.1} limit={1.0} />);
    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    expect(screen.getByText(/exceeds your limit/i)).toBeInTheDocument();
  });
});

describe('AdvicePanel - Level 4: Edge Cases & Web Quirks', () => {
  it('renders safe status when leverage is exactly equal to 80% of limit', () => {
    // limit * 0.8 is the threshold, but condition is `> limit * 0.8`
    render(<AdvicePanel currentLeverage={0.8} limit={1.0} />);

    // Using two assertions
    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Comfortable Exposure');
    expect(title).toHaveClass('text-emerald-400');
  });

  it('renders warning status when leverage is just above 80% of limit', () => {
    render(<AdvicePanel currentLeverage={0.81} limit={1.0} />);

    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Approaching Limit');
    expect(title).toHaveClass('text-yellow-500');
  });

  it('renders danger status when leverage is exactly equal to limit', () => {
    // condition is `> limit` for danger, so exactly limit should be warning because it's > limit * 0.8
    render(<AdvicePanel currentLeverage={1.0} limit={1.0} />);

    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Approaching Limit');
    expect(title).toHaveClass('text-yellow-500');
  });

  it('renders danger status when leverage is just above limit', () => {
    render(<AdvicePanel currentLeverage={1.01} limit={1.0} />);

    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Margin Call Risk!');
    expect(title).toHaveClass('text-destructive');
  });

  it('updates dynamically and applies correct classes when props change', () => {
    const { rerender } = render(<AdvicePanel currentLeverage={0.5} limit={1.0} />);

    // Initial state: Safe
    let title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Comfortable Exposure');
    expect(title).toHaveClass('text-emerald-400');

    // Update state to Danger
    rerender(<AdvicePanel currentLeverage={1.5} limit={1.0} />);

    title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Margin Call Risk!');
    expect(title).toHaveClass('text-destructive');
  });
});
