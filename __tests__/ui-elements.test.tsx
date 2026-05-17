import { render, screen, waitFor } from '@testing-library/react';
import { Card, Button, Input, Label, AnimatedNumber } from '../components/ui-elements';
import { describe, it, expect } from 'vitest';

describe('UI Elements', () => {
  it('renders Card correctly', () => {
    render(<Card data-testid="card">Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeVisible();
    expect(screen.getByTestId('card')).toHaveClass('bg-card', 'rounded-2xl', 'overflow-hidden');
  });

  describe('Button', () => {
    it('renders different variants', () => {
      render(
        <>
          <Button variant="primary">Primary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </>
      );

      const primary = screen.getByText('Primary');
      expect(primary).toBeVisible();
      expect(primary).toHaveClass('bg-primary');

      const danger = screen.getByText('Danger');
      expect(danger).toBeVisible();
      expect(danger).toHaveClass('bg-destructive');

      const ghost = screen.getByText('Ghost');
      expect(ghost).toBeVisible();
      expect(ghost).toHaveClass('bg-transparent', 'text-primary');
    });

    it('shows loading state', () => {
      const { container } = render(<Button isLoading>Loading</Button>);
      expect(screen.getByText('Loading')).toBeVisible();
      expect(screen.getByRole('button')).toBeDisabled();
      // Test for lucide-react Loader2 icon existence (usually renders as svg with animate-spin class)
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('renders Input and Label correctly', () => {
    render(
      <>
        <Label htmlFor="test-input">Test Label</Label>
        <Input id="test-input" placeholder="Type here..." />
      </>
    );
    expect(screen.getByText('Test Label')).toBeVisible();
    expect(screen.getByPlaceholderText('Type here...')).toBeVisible();
  });

  it('renders AnimatedNumber correctly', async () => {
    render(<AnimatedNumber value={1234.56} prefix="$" suffix="!" />);
    await waitFor(() => {
      expect(screen.getByText('$1,234.56!')).toBeVisible();
    });
  });
});
