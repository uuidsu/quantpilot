import { render, screen } from '@testing-library/react';
import { AdvicePanel } from '@/components/AdvicePanel';

describe('AdvicePanel (Levels 1 & 2)', () => {
  it('renders safe state correctly (Level 1: Smoke & Render)', () => {
    render(<AdvicePanel currentLeverage={1.0} limit={2.0} />);

    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument();
    expect(screen.getByText(/increase exposure/i)).toBeInTheDocument();
  });

  it('renders danger state correctly when leverage exceeds limit (Level 2: Core Flows)', () => {
    render(<AdvicePanel currentLeverage={2.5} limit={2.0} />);

    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument();
    expect(screen.getByText(/exceeds your limit/i)).toBeInTheDocument();

    // Check color classes
    const container = screen.getByText('Margin Call Risk!').closest('.rounded-2xl');
    expect(container).toHaveClass('bg-destructive/10');
  });

  it('renders warning state correctly when approaching limit (Level 2: Core Flows)', () => {
    render(<AdvicePanel currentLeverage={1.8} limit={2.0} />);

    expect(screen.getByText('Approaching Limit')).toBeInTheDocument();
    expect(screen.getByText(/getting high/i)).toBeInTheDocument();

    const container = screen.getByText('Approaching Limit').closest('.rounded-2xl');
    expect(container).toHaveClass('bg-yellow-500/10');
  });
});
