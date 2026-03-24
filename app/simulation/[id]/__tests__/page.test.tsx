import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import SimulationPage from '../page';
import { notFound } from 'next/navigation';
import { getSimulation } from '@/app/actions';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}));

vi.mock('@/app/actions', () => ({
  getSimulation: vi.fn(),
}));

vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: any) => <div data-testid="dashboard">Dashboard: {initialData.id}</div>,
}));

describe('SimulationPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard when simulation is found (Level 1: Smoke & Render)', async () => {
    (getSimulation as any).mockResolvedValue({ id: 123, name: 'Test Sim' });

    // Server component needs to be awaited
    const PageContent = await SimulationPage({ params: Promise.resolve({ id: '123' }) });
    render(PageContent);

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeVisible();
    expect(screen.getByText('Dashboard: 123')).toBeInTheDocument();
  });

  it('calls notFound when id is not a number (Level 2: Error Handling)', async () => {
    try {
      await SimulationPage({ params: Promise.resolve({ id: 'abc' }) });
    } catch (e) {
      // Ignored
    }

    expect(notFound).toHaveBeenCalledTimes(1);
    // getSimulation might have been called with NaN before notFound stops execution depending on implementation logic
  });

  it('calls notFound when simulation does not exist (Level 2: Error Handling)', async () => {
    (getSimulation as any).mockResolvedValue(null);

    try {
      await SimulationPage({ params: Promise.resolve({ id: '456' }) });
    } catch (e) {
      // Ignored
    }

    expect(getSimulation).toHaveBeenCalledWith(456);
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
