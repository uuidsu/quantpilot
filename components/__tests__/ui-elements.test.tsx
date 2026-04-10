import { render, screen, fireEvent } from '@testing-library/react'
import { Button, Input, Label, Card } from '../ui-elements'

describe('UI Elements - Sentinel Level 2/3', () => {
  describe('Button', () => {
    it('renders with correct default styling and content', () => {
      render(<Button>Click Me</Button>)
      const button = screen.getByRole('button', { name: 'Click Me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary text-white')
      expect(button).not.toBeDisabled()
    })

    it('renders loading state strictly and disables interactions', () => {
      const onClick = vi.fn()
      const { container } = render(<Button isLoading onClick={onClick}>Submit</Button>)
      const button = screen.getByRole('button', { name: 'Submit' })

      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-40 disabled:cursor-not-allowed')

      // Strict loading spinner check
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('lucide-loader-circle')

      fireEvent.click(button)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('renders disabled state strictly without spinner', () => {
      const { container } = render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button', { name: 'Disabled' })

      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-40')

      // Strict check: No spinner when disabled but not loading
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).not.toBeInTheDocument()
    })

    it('applies variant classes correctly', () => {
      render(<Button variant="danger">Delete</Button>)
      const button = screen.getByRole('button', { name: 'Delete' })
      expect(button).toHaveClass('bg-destructive text-white')
    })
  })

  describe('Card', () => {
    it('renders children with strict inset-grouped styling', () => {
      render(<Card>Card Content</Card>)
      const card = screen.getByText('Card Content')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('bg-card rounded-2xl overflow-hidden shadow-card')
    })
  })

  describe('Input', () => {
    it('renders correctly and handles value changes strictly', () => {
      render(<Input placeholder="Enter text" aria-label="custom-input" />)
      const input = screen.getByLabelText('custom-input')

      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('rounded-xl border-0 bg-secondary px-4 py-3')
      expect(input).toHaveAttribute('placeholder', 'Enter text')

      fireEvent.change(input, { target: { value: 'Hello World' } })
      expect(input).toHaveValue('Hello World')
    })
  })

  describe('Label', () => {
    it('renders with strict typography styling', () => {
      render(<Label htmlFor="test-id">My Label</Label>)
      const label = screen.getByText('My Label')

      expect(label).toBeInTheDocument()
      expect(label).toHaveClass('text-[13px] font-medium uppercase tracking-wide text-muted-foreground')
      expect(label).toHaveAttribute('for', 'test-id')
    })
  })
})