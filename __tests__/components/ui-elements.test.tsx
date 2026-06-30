import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Input, AnimatedNumber, Card, Label } from '../../components/ui-elements';

describe('ui-elements', () => {
  describe('Button', () => {
    it('renders with correct text and handles clicks', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click Me</Button>);

      const button = screen.getByText('Click Me');
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders loading spinner and disables button when isLoading is true', () => {
      render(<Button isLoading={true}>Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('updates value correctly on change', () => {
      render(<Input placeholder="Enter text" />);

      const input = screen.getByPlaceholderText('Enter text') as HTMLInputElement;
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'New Value' } });
      expect(input.value).toBe('New Value');
    });

    it('can be disabled', () => {
      render(<Input disabled placeholder="Disabled input" />);
      const input = screen.getByPlaceholderText('Disabled input');
      expect(input).toBeDisabled();
    });
  });

  describe('AnimatedNumber', () => {
    it('formats number correctly with prefix, suffix, and decimals', () => {
      render(
        <AnimatedNumber
          value={1234.567}
          prefix="$"
          suffix=" USD"
          decimals={2}
        />
      );

      // 1234.567 rounded to 2 decimals is 1234.57, with toLocaleString adds comma -> 1,234.57
      // Note: toLocaleString behavior can vary by locale, but in Node's default it should work.
      // Let's assert partial matches to be safe against strict locale mismatches
      expect(screen.getByText(/\$1,234\.57 USD/)).toBeInTheDocument();
    });
  });

  describe('Card and Label', () => {
    it('renders Card with children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('renders Label with text', () => {
      render(<Label>My Label</Label>);
      expect(screen.getByText('My Label')).toBeInTheDocument();
    });
  });
});
