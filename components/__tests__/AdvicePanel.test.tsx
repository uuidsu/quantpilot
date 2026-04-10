import { render, screen } from '@testing-library/react'
import { AdvicePanel } from '../AdvicePanel'

describe('AdvicePanel - Sentinel Level 3/4', () => {
  it('renders strict safe status styling and content when leverage is low', () => {
    const { container } = render(<AdvicePanel currentLeverage={1} limit={2} />)

    // Strict text match
    expect(screen.getByText('Comfortable Exposure')).toBeInTheDocument()
    expect(screen.getByText('You have room to increase exposure by buying more shares.')).toBeInTheDocument()

    // Strict container class check
    const card = screen.getByText('Comfortable Exposure').closest('.border')
    expect(card).toHaveClass('bg-emerald-500/10 border-emerald-500/20 transition-colors duration-500')

    // Strict text class check
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading).toHaveClass('text-emerald-400')

    // Strict SVG icon check (using container query as lucide doesn't have standard test ids)
    const icon = container.querySelector('svg')
    expect(icon).toHaveClass('text-emerald-400')
  })

  it('renders strict warning status styling and content when leverage approaches limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={1.8} limit={2} />)

    // Strict text match
    expect(screen.getByText('Approaching Limit')).toBeInTheDocument()
    expect(screen.getByText('Your leverage is getting high. Be cautious with new purchases.')).toBeInTheDocument()

    // Strict container class check
    const card = screen.getByText('Approaching Limit').closest('.border')
    expect(card).toHaveClass('bg-yellow-500/10 border-yellow-500/20 transition-colors duration-500')

    // Strict text class check
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading).toHaveClass('text-yellow-500')

    // Strict SVG icon check
    const icon = container.querySelector('svg')
    expect(icon).toHaveClass('text-yellow-500')
  })

  it('renders strict danger status styling and content when leverage exceeds limit', () => {
    const { container } = render(<AdvicePanel currentLeverage={2.5} limit={2} />)

    // Strict text match
    expect(screen.getByText('Margin Call Risk!')).toBeInTheDocument()
    expect(screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.')).toBeInTheDocument()

    // Strict container class check
    const card = screen.getByText('Margin Call Risk!').closest('.border')
    expect(card).toHaveClass('bg-destructive/10 border-destructive/20 transition-colors duration-500')

    // Strict text class check
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading).toHaveClass('text-destructive')

    // Strict SVG icon check
    const icon = container.querySelector('svg')
    expect(icon).toHaveClass('text-destructive')
  })
})