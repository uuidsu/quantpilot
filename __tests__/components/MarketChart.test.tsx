import { render } from '@testing-library/react'
import { MarketChart } from '@/components/MarketChart'
import { expect, test, describe } from 'vitest'

describe('MarketChart', () => {
  test('renders chart structurally in jsdom', () => {
    // We expect recharts to be mocked properly in vitest.setup.tsx
    // The ResponsiveContainer mock should render a div with fixed width/height
    const { container } = render(<MarketChart history={[100, 105, 95, 110]} />)

    // Test that the mock ResponsiveContainer renders correctly
    const wrapper = container.firstChild as HTMLDivElement
    expect(wrapper).toHaveStyle({ width: '400px', height: '300px' })

    // We expect the mocked AreaChart to output an SVG
    const svg = wrapper.querySelector('svg')
    expect(svg).toBeInTheDocument()

    // Since Area, XAxis, YAxis are all mocked to basic SVG elements
    // Area mock: () => <path />
    // XAxis, YAxis mock: () => <g />
    const path = wrapper.querySelector('path')
    expect(path).toBeInTheDocument()

    const groups = wrapper.querySelectorAll('g')
    expect(groups.length).toBeGreaterThanOrEqual(2) // At least X and Y axes
  })
})
