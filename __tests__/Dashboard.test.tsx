import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';
import * as actions from '@/app/actions';
import { vi } from 'vitest';

const mockSimulation = { id: 1, name: 'Sim 1', isDefault: true, createdAt: new Date() };

describe('Dashboard Component - Level 3: Asynchronous & State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (actions.getSymbolMetas as any).mockResolvedValue([
      { symbol: "AAPL", beta: 1.2, currentPrice: 150 }
    ]);
    (actions.getOptionsTrades as any).mockResolvedValue([]);
    (actions.getStockTrades as any).mockResolvedValue([
      { id: 1, symbol: "AAPL", tradeDate: "20231010", action: "BUY", price: 140, quantity: 10, fee: 5 }
    ]);
    (actions.getLoans as any).mockResolvedValue([]);
    (actions.getOptionsTargetMatches as any).mockResolvedValue([]);
    (actions.getCashEvents as any).mockResolvedValue([]);
    (actions.getOptionsPriceMap as any).mockResolvedValue({});
    (actions.getStrategies as any).mockResolvedValue([{ id: 1, name: "Test Strategy", leverageLimit: 2.0 }]);
    (actions.fetchMarketIndex as any).mockResolvedValue({ index: 22000 });
    (actions.getOptionsApiStats as any).mockResolvedValue({ calls: [], cooldownUntil: null });
    (actions.getAvailableOptionsDates as any).mockResolvedValue([]);
    (actions.getOptionsDeltaRows as any).mockResolvedValue([]);
    (actions.getLoanPayments as any).mockResolvedValue([]);
    (actions.getLoanRateEvents as any).mockResolvedValue([]);
    (actions.getApiStats as any).mockResolvedValue([]);
    (actions.getSourceConfigs as any).mockResolvedValue([]);
    (actions.getAppSettings as any).mockResolvedValue({});
  });

  it('renders correctly with async mocked data and interacts with tabs', async () => {
    render(<Dashboard initialData={mockSimulation} />);

    expect(screen.getByText('初始化中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('1 檔持股 · 0 選擇權持倉')).toBeInTheDocument();

    // Check account tab details (which is the default active tab)
    // Looking for the positions table row or values
    expect(screen.getByText('AAPL')).toBeInTheDocument();

    // Use getAllByText for "明細" and click the one in the bottom navigation
    const tabs = screen.getAllByText('明細');
    const tabBtn = tabs.find(el => el.tagName.toLowerCase() === 'span') || tabs[0];
    fireEvent.click(tabBtn);

    await waitFor(() => {
      expect(screen.getByText('買股')).toBeInTheDocument();
    });
  });

  it('opens and closes settings row', async () => {
    render(<Dashboard initialData={mockSimulation} />);

    await waitFor(() => {
      expect(screen.getByText('QuantPilot')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('更多'));

    await waitFor(() => {
      expect(screen.getByText('設定')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('設定'));

    await waitFor(() => {
      expect(screen.getByText('資料環境')).toBeInTheDocument();
    });

    const resetRow = screen.getByText('還原原廠設定');
    expect(screen.queryByText('確認還原')).not.toBeInTheDocument();

    fireEvent.click(resetRow);
    expect(screen.getByText('確認還原')).toBeInTheDocument();

    fireEvent.click(resetRow);
    expect(screen.queryByText('確認還原')).not.toBeInTheDocument();
  });
});
