import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from './AppShell';
import * as actions from '@/app/actions';

// Mock the actions
vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
}));

// Mock the Dashboard component
vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: any) => <div data-testid="dashboard">Dashboard with sim {initialData.id}</div>,
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    // Make listSimulations return a promise that doesn't resolve immediately
    // so we can see the loading state
    let resolvePromise: any;
    const promise = new Promise(resolve => {
        resolvePromise = resolve;
    });
    (actions.listSimulations as any).mockReturnValue(promise);

    render(<AppShell />);

    expect(screen.getByText('載入中...')).toBeVisible();

    // Wait for the mock to resolve
    const mockSim = { id: 'sim-1', name: 'Test Sim', initialCapital: '10000', currentCapital: '10000', createdAt: new Date() };
    resolvePromise([mockSim]);

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });
  });

  it('renders Dashboard with existing simulation', async () => {
    const mockSim = { id: 'sim-1', name: 'Test Sim', initialCapital: '10000', currentCapital: '10000', createdAt: new Date() };
    (actions.listSimulations as any).mockResolvedValue([mockSim]);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeVisible();
    });

    expect(screen.getByText('Dashboard with sim sim-1')).toBeVisible();
    expect(actions.listSimulations).toHaveBeenCalledTimes(1);
    expect(actions.createSimulation).not.toHaveBeenCalled();
  });

  it('creates a new simulation if none exist', async () => {
    (actions.listSimulations as any).mockResolvedValue([]);
    const mockNewSim = { id: 'new-sim', name: 'New Sim', initialCapital: '10000', currentCapital: '10000', createdAt: new Date() };
    (actions.createSimulation as any).mockResolvedValue(mockNewSim);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeVisible();
    });

    expect(screen.getByText('Dashboard with sim new-sim')).toBeVisible();
    expect(actions.listSimulations).toHaveBeenCalledTimes(1);
    expect(actions.createSimulation).toHaveBeenCalledTimes(1);
  });
});
