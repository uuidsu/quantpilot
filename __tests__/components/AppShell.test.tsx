import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../../components/AppShell';
import * as actions from '../../app/actions';
import { vi } from 'vitest';

vi.mock('../../app/actions', () => ({
  listSimulations: vi.fn(),
  createSimulation: vi.fn(),
}));

vi.mock('../../components/Dashboard', () => ({
  Dashboard: ({ initialData }: any) => <div data-testid="mock-dashboard">Dashboard: {initialData.id}</div>,
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially and then resolves to Dashboard with existing simulation', async () => {
    const mockSim = { id: 1, name: 'Test Sim', createdAt: new Date() };
    vi.mocked(actions.listSimulations).mockResolvedValueOnce([mockSim as any]);

    render(<AppShell />);

    // Check loading state
    expect(screen.getByText('載入中...')).toBeInTheDocument();
    // Ensure animate-spin class is present
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    // Check resolved state
    await waitFor(() => {
      expect(screen.getByTestId('mock-dashboard')).toHaveTextContent('Dashboard: 1');
    });

    expect(actions.listSimulations).toHaveBeenCalledTimes(1);
    expect(actions.createSimulation).not.toHaveBeenCalled();
  });

  it('creates a new simulation if none exist', async () => {
    const newSim = { id: 2, name: 'New Sim', createdAt: new Date() };
    vi.mocked(actions.listSimulations).mockResolvedValueOnce([]);
    vi.mocked(actions.createSimulation).mockResolvedValueOnce(newSim as any);

    render(<AppShell />);

    // Check resolved state
    await waitFor(() => {
      expect(screen.getByTestId('mock-dashboard')).toHaveTextContent('Dashboard: 2');
    });

    expect(actions.listSimulations).toHaveBeenCalledTimes(1);
    expect(actions.createSimulation).toHaveBeenCalledTimes(1);
  });
});
