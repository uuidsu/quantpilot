import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as actions from '@/app/actions';

// Mock server actions to return empty data by default
beforeEach(() => {
  vi.resetAllMocks();
  (actions.getSymbolMetas as any).mockResolvedValue([]);
  (actions.getOptionsTrades as any).mockResolvedValue([]);
  (actions.getStockTrades as any).mockResolvedValue([]);
  (actions.getLoans as any).mockResolvedValue([]);
  (actions.getOptionsTargetMatches as any).mockResolvedValue([]);
  (actions.getCashEvents as any).mockResolvedValue([]);
  (actions.getOptionsPriceMap as any).mockResolvedValue({});
  (actions.getStrategies as any).mockResolvedValue([{ id: 1, name: '預設策略' }]);
  (actions.fetchMarketIndex as any).mockResolvedValue({ index: 22000 });
  (actions.getOptionsApiStats as any).mockResolvedValue({ calls: [], cooldownUntil: null });
  (actions.getAvailableOptionsDates as any).mockResolvedValue([]);
  (actions.getLoanPayments as any).mockResolvedValue([]);
  (actions.getLoanRateEvents as any).mockResolvedValue([]);

  // Settings Tab mocks
  (actions.getApiStats as any).mockResolvedValue([]);
  (actions.getSourceConfigs as any).mockResolvedValue([]);
  (actions.getAppSettings as any).mockResolvedValue({});

  // Database Tab mocks
  (actions.getApiCacheEntries as any).mockResolvedValue([]);
  (actions.getApiUsageEntries as any).mockResolvedValue([]);
  (actions.getOptionsDeltaCacheEntries as any).mockResolvedValue([]);
});

const mockSimulation = {
  id: 1,
  name: 'Test Sim',
  initialCapital: 1000000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Dashboard Component Test Suite', () => {
  let globalFetch: any;

  beforeEach(() => {
    globalFetch = global.fetch;
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      if (url.toString().includes('/api/search')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { symbol: '2330', name: '台積電', exchange: 'TSE' },
            { symbol: '0050', name: '元大台灣50', exchange: 'TSE' }
          ]),
        } as Response);
      }
      return Promise.resolve({ json: () => Promise.resolve([]) } as Response);
    });
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  it('Level 1 & 2: renders layout and navigates between main bottom tabs successfully', async () => {
    const { unmount } = render(<Dashboard initialData={mockSimulation} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('實體帳戶')).toBeInTheDocument();

    const tabs = screen.getAllByRole('button');
    const tradesTab = tabs.find(t => t.textContent === 'History明細');
    if (tradesTab) fireEvent.click(tradesTab);

    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeInTheDocument();
    });

    const feedbackTab = tabs.find(t => t.textContent === 'BarChart2績效');
    if (feedbackTab) fireEvent.click(feedbackTab);

    await waitFor(() => {
      expect(screen.getByText('股票市值')).toBeInTheDocument();
      expect(screen.getByText('未實現損益')).toBeInTheDocument();
    });

    unmount();
  });

  it('Level 2/3: opens More menu and navigates to sub-tabs', async () => {
    const { unmount } = render(<Dashboard initialData={mockSimulation} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const moreBtn = buttons.find(b => b.textContent === 'LayoutGrid更多');
    if (moreBtn) fireEvent.click(moreBtn);

    await waitFor(() => {
      expect(screen.getByText('設定')).toBeInTheDocument();
      expect(screen.getByText('收支分析')).toBeInTheDocument();
    });

    const settingsOption = screen.getByText('設定');
    fireEvent.click(settingsOption);

    await waitFor(() => {
      expect(screen.getByText('資料環境')).toBeInTheDocument();
      expect(screen.getByText('股價來源')).toBeInTheDocument();
    });

    const updatedButtons = screen.getAllByRole('button');
    const moreBtnAgain = updatedButtons.find(b => b.textContent === 'LayoutGrid更多');
    if (moreBtnAgain) fireEvent.click(moreBtnAgain);

    await waitFor(() => {
      expect(screen.getByText('收支分析')).toBeInTheDocument();
    });

    const cashflowOption = screen.getByText('收支分析');
    fireEvent.click(cashflowOption);

    await waitFor(() => {
      expect(screen.getAllByText('帳戶平衡 ✓')[0]).toBeInTheDocument();
      expect(screen.getAllByText('收入來源')[0]).toBeInTheDocument();
    });

    unmount();
  });

  it('Level 3: verifies the add trade button opens a search/add interface', async () => {
    const { unmount } = render(<Dashboard initialData={mockSimulation} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('button');
    const tradesTab = tabs.find(t => t.textContent === 'History明細');
    if (tradesTab) fireEvent.click(tradesTab);

    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeInTheDocument();
    });

    const plusBtns = screen.getAllByRole('button').filter(b => b.innerHTML.includes('Plus'));
    if (plusBtns.length > 0) fireEvent.click(plusBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('新增交易')).toBeInTheDocument();
    });

    const optionsButton = screen.getAllByText('選擇權').find(el => el.tagName === 'BUTTON');
    if (optionsButton) fireEvent.click(optionsButton);

    await waitFor(() => {
      expect(screen.getAllByText('Call')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Put')[0]).toBeInTheDocument();
      expect(screen.getAllByText('履約價')[0]).toBeInTheDocument();
    });

    const loanButton = screen.getAllByText('貸款').find(el => el.tagName === 'BUTTON');
    if (loanButton) fireEvent.click(loanButton);

    await waitFor(() => {
      expect(screen.getAllByText('貸款名稱')[0]).toBeInTheDocument();
      expect(screen.getAllByText('本金')[0]).toBeInTheDocument();
    });

    const cashButton = screen.getAllByText('收支').find(el => el.tagName === 'BUTTON');
    if (cashButton) fireEvent.click(cashButton);

    await waitFor(() => {
      expect(screen.getAllByText('金額')[0]).toBeInTheDocument();
    });

    unmount();
  });

  it('Level 4: displays validation errors when adding a trade with incomplete data', async () => {
    const { unmount } = render(<Dashboard initialData={mockSimulation} />);

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('button');
    const tradesTab = tabs.find(t => t.textContent === 'History明細');
    if (tradesTab) fireEvent.click(tradesTab);

    await waitFor(() => {
      expect(screen.getByText('尚無交易紀錄')).toBeInTheDocument();
    });

    const plusBtns = screen.getAllByRole('button').filter(b => b.innerHTML.includes('Plus'));
    if (plusBtns.length > 0) fireEvent.click(plusBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('新增交易')).toBeInTheDocument();
    });

    const allBtns = screen.getAllByRole('button');
    const primaryBtns = allBtns.filter(b => b.className.includes('bg-primary') && b.className.includes('text-white') && b.className.includes('w-full') && b.className.includes('h-12'));
    const submitBtn = primaryBtns[0];

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(actions.addStockTrade).not.toHaveBeenCalled();
    });

    const priceInput = screen.getByPlaceholderText('580');
    const qtyInput = screen.getByPlaceholderText('1000');
    const symbolInput = screen.getByPlaceholderText('2330.TW');

    fireEvent.change(priceInput, { target: { value: '600' } });
    fireEvent.change(qtyInput, { target: { value: '1000' } });
    fireEvent.change(symbolInput, { target: { value: '2330' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(actions.addStockTrade).toHaveBeenCalledWith(expect.objectContaining({
        simulationId: mockSimulation.id,
        symbol: '2330',
        price: 600,
        quantity: 1000
      }));
    });

    unmount();
  });
});
