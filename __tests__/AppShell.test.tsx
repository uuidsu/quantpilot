import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../components/AppShell';
import { describe, it, expect, vi } from 'vitest';
import * as actions from '@/app/actions';

// Mock Dashboard
vi.mock('@/components/Dashboard', () => ({
    Dashboard: ({ initialData }: any) => <div data-testid="dashboard">Dashboard ID: {initialData.id}</div>
}));

// Mock Actions
vi.mock('@/app/actions', () => ({
    listSimulations: vi.fn(),
    createSimulation: vi.fn(),
}));

describe('AppShell Component Level 3: Asynchronous & State', () => {
    it('shows loading state initially and then renders dashboard when simulation exists', async () => {
        // Mock listSimulations to return a simulation immediately
        const mockSim = { id: 1, baseDate: new Date(), targetDate: new Date() };
        (actions.listSimulations as any).mockResolvedValue([mockSim]);

        render(<AppShell />);

        // Loading state
        expect(screen.getByText('載入中...')).toBeInTheDocument();

        // Dashboard renders
        await waitFor(() => {
            const dashboard = screen.getByTestId('dashboard');
            expect(dashboard).toBeInTheDocument();
            expect(dashboard).toHaveTextContent('Dashboard ID: 1');
        });
    });

    it('creates a new simulation if none exist', async () => {
        const mockNewSim = { id: 2, baseDate: new Date(), targetDate: new Date() };
        (actions.listSimulations as any).mockResolvedValue([]);
        (actions.createSimulation as any).mockResolvedValue(mockNewSim);

        render(<AppShell />);

        // Loading state
        expect(screen.getByText('載入中...')).toBeInTheDocument();

        // Dashboard renders with new sim
        await waitFor(() => {
            const dashboard = screen.getByTestId('dashboard');
            expect(dashboard).toBeInTheDocument();
            expect(dashboard).toHaveTextContent('Dashboard ID: 2');
        });

        expect(actions.createSimulation).toHaveBeenCalled();
    });
});
