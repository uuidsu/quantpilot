import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';

describe('Dashboard Complete Tests', () => {
  const mockData = {
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active' as const,
    cash: '10000',
    day: 1,
    lastTick: new Date(),
  };

  it('Level 1: Smoke & Render', async () => {
    render(<Dashboard initialData={mockData} />);

    // Baseline: check initial render.
    expect(screen.getByText(/初始化中.../i)).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    await waitFor(() => {
        expect(screen.queryByText(/初始化中.../i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/QuantPilot/i)).toBeInTheDocument();
    expect(screen.getByText(/帳戶平衡/i)).toBeInTheDocument();
    expect(screen.getByText(/實體帳戶/i)).toBeInTheDocument();

    const tabs = ['明細', '績效', '模擬器'];
    for (const tab of tabs) {
        expect(screen.getAllByText(new RegExp(tab, 'i')).length).toBeGreaterThan(0);
    }
  });

  it('Level 2: Core User Flows - Tab Switching', async () => {
    render(<Dashboard initialData={mockData} />);

    await waitFor(() => {
        expect(screen.queryByText(/初始化中.../i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // History
    const historyTab = screen.getByText('明細');
    await act(async () => { fireEvent.click(historyTab); });
    await waitFor(() => { expect(screen.getByText(/交易紀錄/i)).toBeInTheDocument(); });

    // Performance
    const perfTab = screen.getByText('績效');
    await act(async () => { fireEvent.click(perfTab); });
    await waitFor(() => { expect(screen.getByText(/損益趨勢/i)).toBeInTheDocument(); });

    // Simulator
    const simTab = screen.getByText('模擬器');
    await act(async () => { fireEvent.click(simTab); });
    await waitFor(() => { expect(screen.getByText(/大盤指數/i)).toBeInTheDocument(); });
  });

  it('Level 3: Asynchronous & State', async () => {
    render(<Dashboard initialData={mockData} />);

    // Initially loader visible
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    await waitFor(() => {
        expect(screen.queryByText(/初始化中.../i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Loader hidden
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();

    // Check fallback rendering from empty mock responses
    expect(screen.getByText(/0 檔持股/i)).toBeInTheDocument();
    expect(screen.getByText(/0 選擇權持倉/i)).toBeInTheDocument();
  });

  it('Level 4: Edge Cases & Quirks - Notifications', async () => {
    render(<Dashboard initialData={mockData} />);

    await waitFor(() => {
        expect(screen.queryByText(/初始化中.../i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const bellBtn = document.querySelector('header button svg.lucide-bell')?.parentElement;
    expect(bellBtn).not.toBeNull();

    await act(async () => {
      if (bellBtn) fireEvent.click(bellBtn);
    });

    await waitFor(() => {
        expect(screen.getByText(/待確認事件/i)).toBeInTheDocument();
        expect(screen.getByText(/沒有待確認的事件/i)).toBeInTheDocument();
    });

    // Close notifications panel
    const closeBtns = screen.getAllByRole('button').filter(btn => btn.querySelector('svg.lucide-x'));
    expect(closeBtns.length).toBeGreaterThan(0);

    await act(async () => {
        fireEvent.click(closeBtns[0]);
    });

    await waitFor(() => {
        expect(screen.queryByText(/沒有待確認的事件/i)).not.toBeInTheDocument();
    });
  });
});
