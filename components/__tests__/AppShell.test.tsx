import { render, screen, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { AppShell } from '../AppShell';

vi.mock('@/app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
}));

vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ initialData }: { initialData: any }) => <div data-testid="dashboard">Dashboard: {initialData.id}</div>,
}));

describe('AppShell', () => {
  let actions: any;
  beforeAll(async () => {
    actions = await import('@/app/actions');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially, then hides it and renders dashboard', async () => {
    let resolveList: any;
    const promise = new Promise(resolve => {
      resolveList = resolve;
    });
    actions.listSimulations.mockReturnValueOnce(promise);

    render(<AppShell />);

    // Level 1: Ensure loading state is visible and specific text exists
    expect(screen.getByText('載入中...')).toBeInTheDocument();
    expect(screen.getByText('載入中...')).toBeVisible();

    // Check loading spinner SVG
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    await act(async () => {
      resolveList([{ id: 'sim-1' }]);
    });

    // Level 3: Asynchronous & State - loading state disappears
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    // Ensure dashboard renders with correct state
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeVisible();
    expect(screen.getByTestId('dashboard')).toHaveTextContent('Dashboard: sim-1');
  });

  it('creates new simulation if none exists and handles the fallback state', async () => {
    const mockNewSim = { id: 'sim-new' };
    actions.listSimulations.mockResolvedValueOnce([]);
    actions.createSimulation.mockResolvedValueOnce(mockNewSim);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toHaveTextContent('Dashboard: sim-new');
    });
    expect(screen.getByTestId('dashboard')).toBeVisible();

    // Make sure createSimulation was indeed called
    expect(actions.createSimulation).toHaveBeenCalledTimes(1);
    expect(actions.listSimulations).toHaveBeenCalledTimes(1);
  });

  it('handles API errors gracefully and renders error state (Level 4: Edge Cases)', async () => {
    actions.listSimulations.mockRejectedValueOnce(new Error('伺服器錯誤'));

    render(<AppShell />);

    // Should still show loading initially
    expect(screen.getByText('載入中...')).toBeInTheDocument();

    // Wait for the error state to render
    await waitFor(() => {
      expect(screen.getByText('發生錯誤')).toBeInTheDocument();
    });

    // Assert that the error text is visible and loading is gone
    expect(screen.getByText('發生錯誤')).toBeVisible();
    expect(screen.getByText('伺服器錯誤')).toBeVisible();
    expect(screen.queryByText('載入中...')).not.toBeInTheDocument();

    // Assert dashboard does not render
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });
});
