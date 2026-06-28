import { render, screen } from '@testing-library/react'
import { AdvicePanel } from '@/components/AdvicePanel'
import { expect, test, describe } from 'vitest'

describe('AdvicePanel', () => {
  test('renders safe state', () => {
    const { container } = render(<AdvicePanel currentLeverage={1} limit={2} />)
    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument()
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument()

    // Check classes for colors
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bg-emerald-500/10')
    expect(screen.getByText('Comfortable Exposure')).toHaveClass('text-emerald-400')
  })

  test('renders warning state', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.7} limit={2} />)
    expect(screen.getByText('Approaching Limit')).toBeInTheDocument()
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument()

    // Check classes for colors
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bg-yellow-500/10')
    expect(screen.getByText('Approaching Limit')).toHaveClass('text-yellow-500')
  })

  test('renders danger state', () => {
    const { container } = render(<AdvicePanel currentLeverage={2.1} limit={2} />)
    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument()
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument()

    // Check classes for colors
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bg-destructive/10')
    expect(screen.getByText('Margin Call Risk!')).toHaveClass('text-destructive')
  })
})
