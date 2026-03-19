import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdvicePanel } from '../../components/AdvicePanel'

// Mock the Card component which is internally imported from ui-elements
vi.mock('../../components/ui-elements', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>
}))

describe('AdvicePanel component - Sentinel Level 2', () => {
  it('renders safe state correctly when leverage is well below limit', () => {
    render(<AdvicePanel currentLeverage={0.5} limit={1.0} />)

    // Visibility and content assertions (Level 1)
    const title = screen.getByText('Comfortable Exposure')
    expect(title).toBeInTheDocument()
    expect(title).toHaveClass('text-emerald-400')

    const message = screen.getByText('You have room to increase exposure by buying more shares.')
    expect(message).toBeInTheDocument()
    expect(message).toHaveClass('text-muted-foreground')

    // State assertion
    const card = screen.getByTestId('card')
    expect(card).toHaveClass('bg-emerald-500/10')
    expect(card).toHaveClass('border-emerald-500/20')
  })

  it('transitions to warning state when leverage approaches limit', () => {
    // 0.9 > 1.0 * 0.8
    render(<AdvicePanel currentLeverage={0.9} limit={1.0} />)

    // Visibility and content assertions
    const title = screen.getByText('Approaching Limit')
    expect(title).toBeInTheDocument()
    expect(title).toHaveClass('text-yellow-500')

    const message = screen.getByText('Your leverage is getting high. Be cautious with new purchases.')
    expect(message).toBeInTheDocument()

    // State assertion
    const card = screen.getByTestId('card')
    expect(card).toHaveClass('bg-yellow-500/10')
    expect(card).toHaveClass('border-yellow-500/20')
  })

  it('enforces danger state when leverage strictly exceeds limit', () => {
    render(<AdvicePanel currentLeverage={1.5} limit={1.0} />)

    // Visibility and content assertions
    const title = screen.getByText('Margin Call Risk!')
    expect(title).toBeInTheDocument()
    expect(title).toHaveClass('text-destructive')

    const message = screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')
    expect(message).toBeInTheDocument()

    // State assertion
    const card = screen.getByTestId('card')
    expect(card).toHaveClass('bg-destructive/10')
    expect(card).toHaveClass('border-destructive/20')
  })
})
