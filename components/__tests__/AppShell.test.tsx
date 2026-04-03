import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../AppShell';

// Mock server actions
vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
}));

// Mock Dashboard to avoid deep rendering issues
vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: any) => <div data-testid="dashboard">Dashboard (Sim ID: {initialData.id})</div>
}));

import { listSimulations, createSimulation } from '@/app/actions';

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (listSimulations as any).mockImplementation(() => new Promise(() => {}));
    render(<AppShell />);

    // Level 1: Smoke & Render Assertions
    expect(screen.getByText('載入中...')).toBeInTheDocument();
  });

  it('loads existing simulation and renders dashboard', async () => {
    const mockSim = { id: 'sim-1', currentCash: '1000' };
    (listSimulations as any).mockResolvedValue([mockSim]);

    render(<AppShell />);

    // Level 3: Asynchronous & State Assertions
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dashboard (Sim ID: sim-1)')).toBeInTheDocument();
  });

  it('creates new simulation when none exists', async () => {
    const newSim = { id: 'sim-new', currentCash: '1000' };
    (listSimulations as any).mockResolvedValue([]);
    (createSimulation as any).mockResolvedValue(newSim);

    render(<AppShell />);

    // Level 3: Asynchronous & State Assertions
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    expect(createSimulation).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Dashboard (Sim ID: sim-new)')).toBeInTheDocument();
  });
});
