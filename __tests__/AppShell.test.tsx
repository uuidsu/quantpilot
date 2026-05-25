import { render, screen, waitFor, act } from '@testing-library/react';
import { expect, test, vi, beforeEach } from 'vitest';
import React from 'react';
import { AppShell } from '@/components/AppShell';
import * as actions from '@/app/actions';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
}));

// Mock Dashboard since we're just testing AppShell wrapper behavior here
vi.mock('@/components/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-mock">Dashboard Content</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('AppShell renders loading initially', async () => {
  let resolveList: any;
  const listPromise = new Promise((res) => { resolveList = res; });
  (actions.listSimulations as any).mockReturnValue(listPromise);

  render(<AppShell />);
  expect(screen.getByText('載入中...')).toBeInTheDocument();

  // Resolve to prevent open handle and act warnings
  await act(async () => {
    resolveList([{ id: 1, name: 'Sim 1' }]);
  });
  await waitFor(() => {
    expect(screen.getByTestId('dashboard-mock')).toBeInTheDocument();
  });
});

test('AppShell loads simulation and renders Dashboard', async () => {
  (actions.listSimulations as any).mockResolvedValue([{ id: 1, name: 'Sim 1' }]);

  render(<AppShell />);

  await waitFor(() => {
    expect(screen.getByTestId('dashboard-mock')).toBeInTheDocument();
  });
  expect(actions.listSimulations).toHaveBeenCalledTimes(1);
  expect(actions.createSimulation).not.toHaveBeenCalled();
});

test('AppShell calls createSimulation when no simulations exist', async () => {
  (actions.listSimulations as any).mockResolvedValue([]);
  (actions.createSimulation as any).mockResolvedValue({ id: 2, name: 'New Sim' });

  render(<AppShell />);

  await waitFor(() => {
    expect(screen.getByTestId('dashboard-mock')).toBeInTheDocument();
  });

  expect(actions.listSimulations).toHaveBeenCalledTimes(1);
  expect(actions.createSimulation).toHaveBeenCalledTimes(1);
});
