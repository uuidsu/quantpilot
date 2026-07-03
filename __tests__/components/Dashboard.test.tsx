import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';

describe('Dashboard Component - Level 2 (Core Flows)', () => {
  const mockInitialData: any = {
    id: 1,
    name: 'Default',
    isDefault: true,
  };

  it('renders dashboard, loads data, and supports tab navigation', async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockInitialData} onSimChange={vi.fn()} />);

    // Level 1: Assert initial state / loading
    expect(screen.getByText('初始化中...')).toBeInTheDocument();

    // Level 3: Wait for async state / data load
    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    // Level 2: Core User Flows (Navigation)
    // Account tab active by default
    await waitFor(() => {
        expect(screen.getByText(/帳戶平衡/)).toBeInTheDocument();
    });

    // Check main tabs are visible
    const tabs = screen.getAllByRole('button');
    const accountTabBtn = tabs.find(t => t.textContent?.includes('帳戶'));
    expect(accountTabBtn).toBeInTheDocument();

    // Check account content is active and strategy content is not
    expect(screen.queryByText('策略清單')).not.toBeInTheDocument();

    const moreMenuBtn = tabs.find(t => t.textContent?.includes('更多'));
    expect(moreMenuBtn).toBeInTheDocument();

    // Click "More" menu and open "Settings"
    await user.click(moreMenuBtn!);

    await waitFor(() => {
      expect(screen.getByText('設定')).toBeInTheDocument();
    });

    const settingsMenuBtn = screen.getByText('設定');
    await user.click(settingsMenuBtn);

    // Verify settings tab content appears.
    await waitFor(() => {
      expect(screen.getByText('資料環境')).toBeInTheDocument();
      expect(screen.getByText('股價來源')).toBeInTheDocument();
    });

    // Verify account tab content is gone
    expect(screen.queryByText(/帳戶平衡/)).not.toBeInTheDocument();
  });
});
