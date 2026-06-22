import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../components/AppShell';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
}));

vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: any) => <div data-testid="dashboard">Dashboard for {initialData.name}</div>,
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Level 3: Async & State - Renders loading state initially and then Dashboard with existing simulation', async () => {
    const mockSim = { id: 1, name: 'Existing Sim' };
    vi.mocked(actions.listSimulations).mockResolvedValue([mockSim as any]);

    render(<AppShell />);

    // Check loading state
    expect(screen.getByText('載入中...')).toBeInTheDocument();

    // Wait for async load to finish
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard for Existing Sim')).toBeInTheDocument();
  });

  it('Level 3: Async & State - Creates new simulation if none exists', async () => {
    const newSim = { id: 2, name: 'New Sim' };
    vi.mocked(actions.listSimulations).mockResolvedValue([]);
    vi.mocked(actions.createSimulation).mockResolvedValue(newSim as any);

    render(<AppShell />);

    expect(screen.getByText('載入中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(actions.createSimulation).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard for New Sim')).toBeInTheDocument();
  });
});
