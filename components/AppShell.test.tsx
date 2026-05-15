import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from './AppShell';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
  getHoldings: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue({}),
  getOptionsRows: vi.fn().mockResolvedValue([]),
  getOptionsTargets: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getAppSettings: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-mock">Dashboard Component</div>
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then shows Dashboard if simulation exists', async () => {
    const mockSim = { id: 1, name: 'Sim 1', createdAt: new Date().toISOString() };
    vi.mocked(actions.listSimulations).mockResolvedValue([mockSim] as any);

    render(<AppShell />);

    // Level 1: Smoke & Render (Loading state)
    expect(screen.getByText('載入中...')).toBeVisible();

    // Level 3: Asynchronous & State (Data loaded)
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-mock')).toBeVisible();
    });

    expect(actions.listSimulations).toHaveBeenCalledTimes(1);
    expect(actions.createSimulation).not.toHaveBeenCalled();
  });

  it('creates a new simulation if none exist and then shows Dashboard', async () => {
    const mockSim = { id: 2, name: 'New Sim', createdAt: new Date().toISOString() };
    vi.mocked(actions.listSimulations).mockResolvedValue([]);
    vi.mocked(actions.createSimulation).mockResolvedValue(mockSim as any);

    render(<AppShell />);

    expect(screen.getByText('載入中...')).toBeVisible();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-mock')).toBeVisible();
    });

    expect(actions.listSimulations).toHaveBeenCalledTimes(1);
    expect(actions.createSimulation).toHaveBeenCalledTimes(1);
  });
});
