import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '@/components/AppShell';
import { listSimulations, createSimulation } from '@/app/actions';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn()
}));

vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: any) => <div data-testid="dashboard">Dashboard: {initialData.name}</div>
}));

describe('AppShell - Sentinel Level 3', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows loading state initially and then renders Dashboard with existing simulation', async () => {
    const mockSim = { id: 1, name: 'Existing Sim' };
    (listSimulations as any).mockResolvedValue([mockSim]);

    render(<AppShell />);

    // Level 1/2: Render assertions
    expect(screen.getByText('載入中...')).toBeVisible();

    // Level 3: Async/State assertion
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('dashboard')).toBeVisible();
    expect(screen.getByText('Dashboard: Existing Sim')).toBeVisible();
  });

  it('creates a new simulation if none exist and then renders Dashboard', async () => {
    const newSim = { id: 2, name: 'New Sim' };
    (listSimulations as any).mockResolvedValue([]);
    (createSimulation as any).mockResolvedValue(newSim);

    render(<AppShell />);

    // Level 3: Async/State assertions
    await waitFor(() => {
      expect(createSimulation).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('dashboard')).toBeVisible();
    expect(screen.getByText('Dashboard: New Sim')).toBeVisible();
  });
});
