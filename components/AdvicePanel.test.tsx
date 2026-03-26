import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AdvicePanel } from './AdvicePanel'

describe('AdvicePanel', () => {
  it('renders safe state when leverage is within limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.5} limit={2.5} />)

    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument()
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument()
    // Verify specific visual classes for "safe" state
    expect(screen.getByText('Comfortable Exposure')).toHaveClass('text-emerald-400')
    const card = container.firstChild
    expect(card).toHaveClass('bg-emerald-500/10')
  })

  it('renders warning state when leverage is approaching limit (> 80%)', () => {
    const { container } = render(<AdvicePanel currentLeverage={2.1} limit={2.5} />) // 2.1 / 2.5 = 84%

    expect(screen.getByText('Approaching Limit')).toBeInTheDocument()
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument()
    // Verify specific visual classes for "warning" state
    expect(screen.getByText('Approaching Limit')).toHaveClass('text-yellow-500')
    const card = container.firstChild
    expect(card).toHaveClass('bg-yellow-500/10')
  })

  it('renders danger state when leverage exceeds limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={2.8} limit={2.5} />)

    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument()
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument()
    // Verify specific visual classes for "danger" state
    expect(screen.getByText('Margin Call Risk!')).toHaveClass('text-destructive')
    const card = container.firstChild
    expect(card).toHaveClass('bg-destructive/10')
  })
})
