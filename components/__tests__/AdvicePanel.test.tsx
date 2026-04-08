import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdvicePanel } from "../AdvicePanel";

describe("AdvicePanel", () => {
  it("renders safe state when leverage is well below limits", () => {
    render(<AdvicePanel currentLeverage={0.5} limit={1.0} />);

    // Level 1: Smoke & Render
    expect(screen.getByText("Comfortable Exposure")).toBeInTheDocument();
    expect(
      screen.getByText("You have room to increase exposure by buying more shares.")
    ).toBeInTheDocument();

    // Assert visual clues
    const container = screen.getByText("Comfortable Exposure").closest(".border");
    expect(container).toHaveClass("bg-emerald-500/10");
  });

  it("renders safe state when leverage is exactly at warning boundary", () => {
    // warning condition is > limit * 0.8. So exactly 0.8 should be safe.
    render(<AdvicePanel currentLeverage={0.8} limit={1.0} />);

    expect(screen.getByText("Comfortable Exposure")).toBeInTheDocument();
    const container = screen.getByText("Comfortable Exposure").closest(".border");
    expect(container).toHaveClass("bg-emerald-500/10");
  });

  it("renders warning state when leverage approaches limit", () => {
    render(<AdvicePanel currentLeverage={0.9} limit={1.0} />);

    expect(screen.getByText("Approaching Limit")).toBeInTheDocument();
    expect(
      screen.getByText("Your leverage is getting high. Be cautious with new purchases.")
    ).toBeInTheDocument();

    const container = screen.getByText("Approaching Limit").closest(".border");
    expect(container).toHaveClass("bg-yellow-500/10");
  });

  it("renders warning state when leverage is exactly at limit boundary", () => {
    // danger condition is > limit. So exactly 1.0 should be warning (since 1.0 > 0.8).
    render(<AdvicePanel currentLeverage={1.0} limit={1.0} />);

    expect(screen.getByText("Approaching Limit")).toBeInTheDocument();
    const container = screen.getByText("Approaching Limit").closest(".border");
    expect(container).toHaveClass("bg-yellow-500/10");
  });

  it("renders danger state when leverage exceeds limit", () => {
    render(<AdvicePanel currentLeverage={1.1} limit={1.0} />);

    expect(screen.getByText("Margin Call Risk!")).toBeInTheDocument();
    expect(
      screen.getByText("Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.")
    ).toBeInTheDocument();

    const container = screen.getByText("Margin Call Risk!").closest(".border");
    expect(container).toHaveClass("bg-destructive/10");
  });

  it("handles edge case where limit is 0 and current leverage is 0", () => {
    // currentLeverage (0) > limit (0) is false
    // currentLeverage (0) > limit * 0.8 (0) is false
    // so it should be safe
    render(<AdvicePanel currentLeverage={0} limit={0} />);

    expect(screen.getByText("Comfortable Exposure")).toBeInTheDocument();
    const container = screen.getByText("Comfortable Exposure").closest(".border");
    expect(container).toHaveClass("bg-emerald-500/10");
  });

  it("handles edge case where limit is 0 and current leverage is positive", () => {
    // currentLeverage (0.1) > limit (0) is true
    // so it should be danger
    render(<AdvicePanel currentLeverage={0.1} limit={0} />);

    expect(screen.getByText("Margin Call Risk!")).toBeInTheDocument();
    const container = screen.getByText("Margin Call Risk!").closest(".border");
    expect(container).toHaveClass("bg-destructive/10");
  });
});
