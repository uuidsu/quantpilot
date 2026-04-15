import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AdvicePanel } from '@/components/AdvicePanel'

describe('AdvicePanel', () => {
  it('Level 1: Renders safe state correctly', () => {
    render(<AdvicePanel currentLeverage={1.5} limit={2.5} />)
    expect(screen.getByText(/Comfortable Exposure/i)).toBeInTheDocument()
    expect(screen.getByText(/You have room to increase exposure by buying more shares/i)).toBeInTheDocument()
  })

  it('Level 2: Renders warning state correctly', () => {
    render(<AdvicePanel currentLeverage={2.1} limit={2.5} />)
    expect(screen.getByText(/Approaching Limit/i)).toBeInTheDocument()
    expect(screen.getByText(/Your leverage is getting high. Be cautious with new purchases/i)).toBeInTheDocument()
  })

  it('Level 2: Renders danger state correctly', () => {
    render(<AdvicePanel currentLeverage={3.0} limit={2.5} />)
    expect(screen.getByText(/Margin Call Risk!/i)).toBeInTheDocument()
    expect(screen.getByText(/Your leverage exceeds your limit. Consider selling shares immediately to reduce risk/i)).toBeInTheDocument()
  })

  it('Level 4: Edge case exact limit', () => {
    // Exactly at the limit should trigger warning, not danger
    // Leverage > limit (danger) vs leverage > limit * 0.8 (warning)
    // 2.5 > 2.5 is false. 2.5 > 2.0 is true. So it should be warning.
    render(<AdvicePanel currentLeverage={2.5} limit={2.5} />)
    expect(screen.getByText(/Approaching Limit/i)).toBeInTheDocument()
    expect(screen.getByText(/Your leverage is getting high. Be cautious with new purchases/i)).toBeInTheDocument()
  })
})
