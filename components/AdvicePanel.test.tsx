import { render, screen, waitFor } from "@testing-library/react";
import { AdvicePanel } from "./AdvicePanel";
import { describe, it, expect } from "vitest";

describe("AdvicePanel", () => {
  it("renders safe state correctly when leverage is well below limit", async () => {
    render(<AdvicePanel currentLeverage={1.5} limit={2.0} />);

    const title = screen.getByText("Comfortable Exposure");
    await waitFor(() => {
      expect(title).toBeVisible();
    });
    expect(title).toHaveClass("text-emerald-400");

    const message = screen.getByText("You have room to increase exposure by buying more shares.");
    expect(message).toBeVisible();
  });

  it("renders warning state correctly when leverage is approaching limit", async () => {
    // limit * 0.8 = 1.6, so 1.7 is > 1.6
    render(<AdvicePanel currentLeverage={1.7} limit={2.0} />);

    const title = screen.getByText("Approaching Limit");
    await waitFor(() => {
      expect(title).toBeVisible();
    });
    expect(title).toHaveClass("text-yellow-500");

    const message = screen.getByText("Your leverage is getting high. Be cautious with new purchases.");
    expect(message).toBeVisible();
  });

  it("renders danger state correctly when leverage exceeds limit", async () => {
    render(<AdvicePanel currentLeverage={2.5} limit={2.0} />);

    const title = screen.getByText("Margin Call Risk!");
    await waitFor(() => {
      expect(title).toBeVisible();
    });
    expect(title).toHaveClass("text-destructive");

    const message = screen.getByText("Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.");
    expect(message).toBeVisible();
  });
});
