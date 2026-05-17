import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../components/AppShell';
import { describe, it, expect, vi } from 'vitest';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
  getHoldings: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({ currentPrice: 100 }),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
  getOptionsApiStats: vi.fn().mockResolvedValue([]),
}));

// Mock Dashboard since it's complex and we just want to test AppShell
vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: any) => <div data-testid="mock-dashboard">Dashboard {initialData.id}</div>
}));

describe('AppShell', () => {
  it('shows loading state initially', () => {
    // Make listSimulations never resolve so we can see loading state
    vi.mocked(actions.listSimulations).mockReturnValue(new Promise(() => {}));

    render(<AppShell />);

    expect(screen.getByText('載入中...')).toBeVisible();
    expect(screen.getByText('載入中...').previousElementSibling).toHaveClass('animate-spin');
  });

  it('loads existing simulation', async () => {
    vi.mocked(actions.listSimulations).mockResolvedValue([
      { id: 1, name: 'Test Sim', initialCapital: '10000', currentCapital: '10000', createdAt: new Date(), updatedAt: new Date() } as any
    ]);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-dashboard')).toBeVisible();
    });
    expect(screen.getByText('Dashboard 1')).toBeVisible();
  });

  it('creates new simulation if none exists', async () => {
    vi.mocked(actions.listSimulations).mockResolvedValue([]);
    vi.mocked(actions.createSimulation).mockResolvedValue({
      id: 2, name: 'New Sim', initialCapital: '10000', currentCapital: '10000', createdAt: new Date(), updatedAt: new Date()
    } as any);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-dashboard')).toBeVisible();
    });
    expect(screen.getByText('Dashboard 2')).toBeVisible();
    expect(actions.createSimulation).toHaveBeenCalled();
  });
});
