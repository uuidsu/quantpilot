import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from './AppShell';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as actions from '@/app/actions';

// Mock the actions and Dashboard component
vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
}));

vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: any) => <div data-testid="dashboard">Dashboard: {initialData.id}</div>,
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Setup a promise that we won't resolve immediately to keep it in loading state
    vi.mocked(actions.listSimulations).mockReturnValue(new Promise(() => {}));

    render(<AppShell />);
    expect(screen.getByText('載入中...')).toBeVisible();
    // The spinner icon
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads existing simulation and renders Dashboard', async () => {
    const mockSim: any = { id: 'sim-1', name: 'Test Sim', initialCapital: '10000', settings: {}, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(actions.listSimulations).mockResolvedValue([mockSim]);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeVisible();
    });
    expect(screen.getByText('Dashboard: sim-1')).toBeVisible();
    expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
  });

  it('creates new simulation if none exist and renders Dashboard', async () => {
    const newSim: any = { id: 'sim-new', name: 'New Sim', initialCapital: '10000', settings: {}, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(actions.listSimulations).mockResolvedValue([]);
    vi.mocked(actions.createSimulation).mockResolvedValue(newSim);

    render(<AppShell />);

    await waitFor(() => {
      expect(actions.createSimulation).toHaveBeenCalled();
      expect(screen.getByTestId('dashboard')).toBeVisible();
    });
    expect(screen.getByText('Dashboard: sim-new')).toBeVisible();
  });
});
