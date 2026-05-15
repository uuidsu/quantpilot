import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, Button, Input, Label, AnimatedNumber } from './ui-elements';

describe('UI Elements', () => {
  describe('Card', () => {
    it('renders correctly', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('bg-card', 'rounded-2xl', 'overflow-hidden', 'shadow-card');
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Button', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toHaveClass('bg-primary', 'text-white', 'px-5', 'py-2.5');
    });

    it('renders loading state', () => {
      const { container } = render(<Button isLoading>Loading...</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders correctly', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toHaveClass('bg-secondary', 'rounded-xl', 'px-4');
    });
  });
});
