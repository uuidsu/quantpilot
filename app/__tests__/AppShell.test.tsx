import { render, screen, waitFor } from '@testing-library/react'
import { AppShell } from '@/components/AppShell'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listSimulations, createSimulation } from '@/app/actions'

// Mock the actions
vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
}))

// Mock the Dashboard component
vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: { initialData: any }) => (
    <div data-testid="dashboard">Dashboard: {initialData.name}</div>
  ),
}))

// Mock the RefreshCcw component
vi.mock('lucide-react', () => ({
  RefreshCcw: () => <svg data-testid="loading-spinner" />,
}))

describe('AppShell - Sentinel Level 3: Asynchronous & State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Level 1/2: Render loading state initially and wait for sims', async () => {
    // Setup mock to resolve after a short delay so we can see loading state
    let resolveList: any
    const listPromise = new Promise((resolve) => {
      resolveList = resolve
    })
    vi.mocked(listSimulations).mockReturnValue(listPromise as any)

    render(<AppShell />)

    // Assertion 1: Loading spinner is visible
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    // Assertion 2: Loading text is visible
    expect(screen.getByText('載入中...')).toBeInTheDocument()

    // Resolve the promise to continue
    const mockSim = { id: 1, name: 'Existing Sim' }
    resolveList([mockSim])

    // Wait for the dashboard to render
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    // Assertion 3: Dashboard renders with correct data
    expect(screen.getByText('Dashboard: Existing Sim')).toBeInTheDocument()
    // Assertion 4: It should not try to create a simulation
    expect(createSimulation).not.toHaveBeenCalled()
  })

  it('Level 2/3: Create new simulation if none exists', async () => {
    vi.mocked(listSimulations).mockResolvedValue([])

    const newSim = { id: 2, name: 'New Sim' }
    vi.mocked(createSimulation).mockResolvedValue(newSim as any)

    render(<AppShell />)

    // Wait for the dashboard to render
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    // Assertion 1: createSimulation should be called
    expect(createSimulation).toHaveBeenCalledTimes(1)

    // Assertion 2: Dashboard renders with the newly created simulation
    expect(screen.getByText('Dashboard: New Sim')).toBeInTheDocument()
  })
})
