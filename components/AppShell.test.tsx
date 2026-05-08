import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from './AppShell';
import * as actions from '@/app/actions';
import userEvent from '@testing-library/user-event';

// Mock the actions
vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
  getHoldings: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue(null),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue(null),
  getOptionsRows: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getSettings: vi.fn().mockResolvedValue({ defaultLeverageLimit: 2 }),
}));

// Mock the Dashboard to isolate AppShell testing
vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData, onSimChange }: any) => (
    <div data-testid="dashboard">
      <p>Dashboard loaded with sim {initialData.id}</p>
      <button
        data-testid="switch-sim"
        onClick={() => onSimChange({ id: 99, name: 'Switched Sim', createdAt: new Date() })}
      >
        Switch Sim
      </button>
    </div>
  )
}));

// Mock ResizeObserver which Dashboard might use
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // Make listSimulations return a promise that doesn't resolve immediately
    (actions.listSimulations as any).mockImplementation(() => new Promise(() => {}));

    render(<AppShell />);
    expect(screen.getByText('載入中...')).toBeInTheDocument();
  });

  it('loads existing simulation when available', async () => {
    const mockSim = { id: 1, name: 'Test Sim', createdAt: new Date() };
    (actions.listSimulations as any).mockResolvedValue([mockSim]);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
    expect(screen.getByText('Dashboard loaded with sim 1')).toBeInTheDocument();
    expect(actions.createSimulation).not.toHaveBeenCalled();
  });

  it('creates new simulation when none exist', async () => {
    const mockNewSim = { id: 2, name: 'New Sim', createdAt: new Date() };
    (actions.listSimulations as any).mockResolvedValue([]);
    (actions.createSimulation as any).mockResolvedValue(mockNewSim);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
    expect(screen.getByText('Dashboard loaded with sim 2')).toBeInTheDocument();
    expect(actions.createSimulation).toHaveBeenCalledOnce();
  });

  it('updates simulation state when Dashboard triggers onSimChange', async () => {
    const user = userEvent.setup();
    const mockSim = { id: 1, name: 'Test Sim', createdAt: new Date() };
    (actions.listSimulations as any).mockResolvedValue([mockSim]);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard loaded with sim 1')).toBeInTheDocument();

    // Trigger the switch
    await user.click(screen.getByTestId('switch-sim'));

    // The AppShell state should update, causing Dashboard to re-render with new data
    await waitFor(() => {
      expect(screen.getByText('Dashboard loaded with sim 99')).toBeInTheDocument();
    });
  });
});
