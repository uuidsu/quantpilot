import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "@/components/Dashboard";
import { vi, describe, it, expect } from "vitest";

const mockInitialData = {
  id: "sim_1",
  name: "Test Simulation",
  baseData: null,
  scenarios: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock("@/app/actions", () => ({
  getHoldings: vi.fn().mockResolvedValue([]),
  getStrategies: vi.fn().mockResolvedValue([]),
  getOptionsTrades: vi.fn().mockResolvedValue([]),
  getOptionsTargetMatches: vi.fn().mockResolvedValue([]),
  getOptionsPriceMap: vi.fn().mockResolvedValue({}),
  getSymbolMetas: vi.fn().mockResolvedValue([]),
  getOptionsStats: vi.fn().mockResolvedValue({}),
  listSimulations: vi.fn().mockResolvedValue([]),
  createSimulation: vi.fn().mockResolvedValue({}),
  getStockTrades: vi.fn().mockResolvedValue([]),
  getLoans: vi.fn().mockResolvedValue([]),
  getCashEvents: vi.fn().mockResolvedValue([]),
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  fetchMarketIndex: vi.fn().mockResolvedValue({}),
  getOptionsApiStats: vi.fn().mockResolvedValue({}),
  getAvailableOptionsDates: vi.fn().mockResolvedValue([]),
}));

describe("Dashboard", () => {
  it("Level 1: Renders main tabs and initial state", async () => {
    render(<Dashboard initialData={mockInitialData as any} />);

    await waitFor(() => {
      // The "帳戶" tab exists in both the bottom nav and potentially a quick switch dropdown.
      // The bottom nav tabs should have both icon and text, we target by text content.
      const accountTabs = screen.getAllByText("帳戶");
      expect(accountTabs.length).toBeGreaterThan(0);
    });

    const detailTabs = screen.getAllByText("明細");
    expect(detailTabs.length).toBeGreaterThan(0);
  });

  it("Level 2: Switches tabs on click", async () => {
    const user = userEvent.setup();
    render(<Dashboard initialData={mockInitialData as any} />);

    await waitFor(() => {
      const accountTabs = screen.getAllByText("帳戶");
      expect(accountTabs.length).toBeGreaterThan(0);
    });

    // Find the actual button for the detail tab
    const detailTabLabel = screen.getAllByText("明細").find(el => el.tagName.toLowerCase() === 'span');
    const detailTabButton = detailTabLabel?.closest('button');

    expect(detailTabButton).toBeDefined();

    await user.click(detailTabButton!);

    // Since clicking it updates state and the component re-renders,
    // the text-primary class should be applied to the label span.
    await waitFor(() => {
      const updatedDetailTabLabels = screen.getAllByText("明細").filter(el => el.tagName.toLowerCase() === 'span');
      // Look for one that has text-primary class
      const activeLabel = updatedDetailTabLabels.find(el => el.classList.contains('text-primary'));
      expect(activeLabel).toBeDefined();
    });

    // Now let's test clicking on a more tab to check content change
    const performanceTabLabel = screen.getAllByText("績效").find(el => el.tagName.toLowerCase() === 'span');
    const performanceTabButton = performanceTabLabel?.closest('button');

    await user.click(performanceTabButton!);

    await waitFor(() => {
      const updatedPerformanceLabels = screen.getAllByText("績效").filter(el => el.tagName.toLowerCase() === 'span');
      const activeLabel = updatedPerformanceLabels.find(el => el.classList.contains('text-primary'));
      expect(activeLabel).toBeDefined();
    });
  });
});
