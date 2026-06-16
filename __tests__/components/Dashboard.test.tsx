import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "@/components/Dashboard";

// Mock @/app/actions
vi.mock("@/app/actions", () => ({
  createSimulation: vi.fn().mockResolvedValue({ id: 1, name: "Test Sim" }),
  deleteSimulation: vi.fn().mockResolvedValue(true),
  listSimulations: vi.fn().mockResolvedValue([{ id: 1, name: "Test Sim" }]),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  upsertSymbolMeta: vi.fn().mockResolvedValue({}),
  fetchSymbolPrice: vi.fn().mockResolvedValue({ symbolMeta: {}, fromCache: false }),
  fetchMarketIndex: vi.fn().mockResolvedValue({ index: 22000 }),
  getStrategies: vi.fn().mockResolvedValue([{ id: 1, name: "預設策略", simulationId: 1 }]),
  addStrategy: vi.fn().mockResolvedValue({ id: 1, name: "預設策略", simulationId: 1 }),
  updateStrategy: vi.fn().mockResolvedValue({}),
  deleteStrategy: vi.fn().mockResolvedValue(true),
  getApiStats: vi.fn().mockResolvedValue([]),
  getSourceConfigs: vi.fn().mockResolvedValue([]),
  upsertSourceConfig: vi.fn().mockResolvedValue({}),
  setDefaultSource: vi.fn().mockResolvedValue(true),
  fetchAndCacheOptionsDelta: vi.fn().mockResolvedValue({ date: "20240101", count: 0 }),
  getOptionsDeltaRows: vi.fn().mockResolvedValue([]),
  getAvailableOptionsDates: vi.fn().mockResolvedValue(["20240101"]),
  getOptionsApiStats: vi.fn().mockResolvedValue({ calls: [], cooldownUntil: null }),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  addOptionsTrade: vi.fn().mockResolvedValue({}),
  deleteOptionsTrade: vi.fn().mockResolvedValue(true),
  getStockTrades: vi.fn().mockResolvedValue([]),
  addStockTrade: vi.fn().mockResolvedValue({}),
  deleteStockTrade: vi.fn().mockResolvedValue(true),
  deleteAllTrades: vi.fn().mockResolvedValue(true),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getLoans: vi.fn().mockResolvedValue([]),
  createLoan: vi.fn().mockResolvedValue({}),
  deleteLoan: vi.fn().mockResolvedValue(true),
  getApiCacheEntries: vi.fn().mockResolvedValue([]),
  getApiUsageEntries: vi.fn().mockResolvedValue([]),
  getOptionsDeltaCacheEntries: vi.fn().mockResolvedValue([]),
  getOptionsTargets: vi.fn().mockResolvedValue([]),
  createOptionsTarget: vi.fn().mockResolvedValue({}),
  deleteOptionsTarget: vi.fn().mockResolvedValue(true),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  updateLoan: vi.fn().mockResolvedValue({}),
  updateOptionsTarget: vi.fn().mockResolvedValue({}),
  updateOptionsTrade: vi.fn().mockResolvedValue({}),
  updateStockTrade: vi.fn().mockResolvedValue({}),
  getLoanPayments: vi.fn().mockResolvedValue([]),
  addLoanPayment: vi.fn().mockResolvedValue({}),
  updateLoanPayment: vi.fn().mockResolvedValue({}),
  deleteLoanPayment: vi.fn().mockResolvedValue(true),
  getLoanRateEvents: vi.fn().mockResolvedValue([]),
  addLoanRateEvent: vi.fn().mockResolvedValue({}),
  deleteLoanRateEvent: vi.fn().mockResolvedValue(true),
  getAppSettings: vi.fn().mockResolvedValue({ dailyRefreshTime: "14:00" }),
  upsertAppSetting: vi.fn().mockResolvedValue(true),
  getCashEvents: vi.fn().mockResolvedValue([]),
  addCashEvent: vi.fn().mockResolvedValue({}),
  deleteCashEvent: vi.fn().mockResolvedValue(true),
}));

const mockSimulation: any = {
  id: 1,
  name: "Test Simulation",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Dashboard Component - Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Level 1: Smoke & Render", () => {
    it("should render the Dashboard completely without crashing and display the primary tabs", async () => {
      render(<Dashboard initialData={mockSimulation} onSimChange={vi.fn()} />);

      // Wait for initialization to complete and initLoading to be false
      await waitFor(() => {
        expect(screen.getByText("QuantPilot")).toBeInTheDocument();
      });

      // Verify header contents
      expect(screen.getByText(/檔持股/)).toBeInTheDocument();
      expect(screen.getByText(/選擇權持倉/)).toBeInTheDocument();

      // Verify Bottom tabs are present
      expect(screen.getByText("帳戶")).toBeInTheDocument();
      expect(screen.getByText("明細")).toBeInTheDocument();
      expect(screen.getByText("績效")).toBeInTheDocument();
      expect(screen.getByText("模擬器")).toBeInTheDocument();
      expect(screen.getByText("更多")).toBeInTheDocument();
    });
  });

  describe("Level 2: Core User Flows", () => {
    it("should allow navigating the main tabs and expanding the '更多' (More) menu", async () => {
      const user = userEvent.setup();
      render(<Dashboard initialData={mockSimulation} onSimChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("QuantPilot")).toBeInTheDocument();
      });

      const tradesTab = screen.getByText("明細");
      await user.click(tradesTab);

      await waitFor(() => {
        expect(screen.getByText("全部")).toBeInTheDocument();
        expect(screen.getByText("股票")).toBeInTheDocument();
        expect(screen.getByText("選擇權")).toBeInTheDocument();
        expect(screen.getByText(/尚無交易紀錄/)).toBeInTheDocument();
      });

      // Switch to Feedback ("績效")
      const feedbackTab = screen.getByText("績效");
      await user.click(feedbackTab);
      await waitFor(() => {
        expect(screen.getByText("股票市值")).toBeInTheDocument();
        expect(screen.getByText("未實現損益")).toBeInTheDocument();
      });

      // Open "更多" menu
      const moreTab = screen.getByText("更多");
      await user.click(moreTab);

      // Verify the popup menu items are rendered
      await waitFor(() => {
        expect(screen.getByText("收支分析")).toBeInTheDocument();
        expect(screen.getByText("策略")).toBeInTheDocument();
        expect(screen.getByText("資料庫")).toBeInTheDocument();
        expect(screen.getByText("備份")).toBeInTheDocument();
        expect(screen.getByText("同步")).toBeInTheDocument();
        expect(screen.getByText("設定")).toBeInTheDocument();
      });

      // Click "設定" from the more menu
      const settingsMenuOption = screen.getByText("設定");
      await user.click(settingsMenuOption);

      await waitFor(() => {
        expect(screen.getByText("資料環境")).toBeInTheDocument();
        expect(screen.getByText("股價來源")).toBeInTheDocument();
      });
    });

    it("should open and close the notification panel properly", async () => {
      const user = userEvent.setup();
      render(<Dashboard initialData={mockSimulation} onSimChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("QuantPilot")).toBeInTheDocument();
      });

      const bellButtons = screen.getAllByRole("button").filter(btn => btn.querySelector("svg.lucide-bell"));
      expect(bellButtons.length).toBeGreaterThan(0);
      const headerBellButton = bellButtons[0];

      await user.click(headerBellButton);

      await waitFor(() => {
        expect(screen.getByText("待確認事件")).toBeInTheDocument();
        expect(screen.getByText("沒有待確認的事件")).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole("button").filter(btn => btn.querySelector("svg.lucide-x"));
      expect(closeButtons.length).toBeGreaterThan(0);
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText("沒有待確認的事件")).not.toBeInTheDocument();
      });
    });
  });
});
