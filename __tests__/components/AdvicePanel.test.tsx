import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AdvicePanel } from "@/components/AdvicePanel";
import { describe, it, expect } from "vitest";

describe("AdvicePanel", () => {
  it("renders Safe state correctly (Comfortable Exposure)", async () => {
    // Render with 0 leverage and a limit of 100
    render(<AdvicePanel currentLeverage={0} limit={100} />);

    // Wait for the animation frame since Framer Motion might delay rendering
    await waitFor(() => {
      // Assert visibility of the correct title
      expect(screen.getByText("Comfortable Exposure")).toBeInTheDocument();
      expect(screen.getByText("Comfortable Exposure")).toBeVisible();

      // Assert visibility of the correct description message
      expect(
        screen.getByText("You have room to increase exposure by buying more shares.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("You have room to increase exposure by buying more shares.")
      ).toBeVisible();
    });
  });

  it("renders Warning state correctly (Approaching Limit)", async () => {
    // Render with 90 leverage and a limit of 100 (90 > 100 * 0.8)
    render(<AdvicePanel currentLeverage={90} limit={100} />);

    // Wait for the animation frame
    await waitFor(() => {
      // Assert visibility of the warning title
      expect(screen.getByText("Approaching Limit")).toBeInTheDocument();
      expect(screen.getByText("Approaching Limit")).toBeVisible();

      // Assert visibility of the warning message
      expect(
        screen.getByText("Your leverage is getting high. Be cautious with new purchases.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Your leverage is getting high. Be cautious with new purchases.")
      ).toBeVisible();
    });
  });

  it("renders Danger state correctly (Margin Call Risk!)", async () => {
    // Render with 110 leverage and a limit of 100 (110 > 100)
    render(<AdvicePanel currentLeverage={110} limit={100} />);

    // Wait for the animation frame
    await waitFor(() => {
      // Assert visibility of the danger title
      expect(screen.getByText("Margin Call Risk!")).toBeInTheDocument();
      expect(screen.getByText("Margin Call Risk!")).toBeVisible();

      // Assert visibility of the danger message
      expect(
        screen.getByText("Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.")
      ).toBeVisible();
    });
  });
});
