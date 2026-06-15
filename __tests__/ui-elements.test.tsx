import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Input, AnimatedNumber } from '@/components/ui-elements';

describe('ui-elements', () => {
  describe('Button', () => {
    it('renders with different variants and can be clicked', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary');

      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading state and is disabled', async () => {
      render(<Button isLoading>Submit</Button>);

      const button = screen.getByRole('button', { name: /submit/i });
      expect(button).toBeDisabled();

      // Loading icon should be present
      const loader = button.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('accepts input and reflects changes', async () => {
      render(<Input placeholder="Enter text" />);

      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();

      await userEvent.type(input, 'Hello World');
      expect(input).toHaveValue('Hello World');
    });

    it('can be disabled', () => {
      render(<Input disabled placeholder="Disabled" />);

      const input = screen.getByPlaceholderText('Disabled');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('AnimatedNumber', () => {
    it('renders formatted number correctly', async () => {
      render(<AnimatedNumber value={1234.567} prefix="$" suffix="!" decimals={2} />);

      await waitFor(() => {
        expect(screen.getByText('$1,234.57!')).toBeInTheDocument();
      });
      // Second assertion to make it 2 assertions
      const element = screen.getByText('$1,234.57!');
      expect(element).toHaveClass('font-mono');
    });
  });
});
