import { render, screen, waitFor } from "@testing-library/react";
import { AdvicePanel } from "./AdvicePanel";

describe("AdvicePanel", () => {
  it("renders safe state correctly when currentLeverage <= limit * 0.8", async () => {
    // limit is 2, so 80% is 1.6
    render(<AdvicePanel currentLeverage={1.0} limit={2.0} />);

    await waitFor(() => {
      const heading = screen.getByRole("heading", { name: "Comfortable Exposure" });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass("text-emerald-400");
    });

    expect(screen.getByText("You have room to increase exposure by buying more shares.")).toBeInTheDocument();
  });

  it("renders warning state correctly when limit * 0.8 < currentLeverage <= limit", async () => {
    // limit is 2, so 80% is 1.6. We use 1.8 to hit the warning condition.
    render(<AdvicePanel currentLeverage={1.8} limit={2.0} />);

    await waitFor(() => {
      const heading = screen.getByRole("heading", { name: "Approaching Limit" });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass("text-yellow-500");
    });

    expect(screen.getByText("Your leverage is getting high. Be cautious with new purchases.")).toBeInTheDocument();
  });

  it("renders danger state correctly when currentLeverage > limit", async () => {
    // limit is 2, we use 2.5 to hit the danger condition.
    render(<AdvicePanel currentLeverage={2.5} limit={2.0} />);

    await waitFor(() => {
      const heading = screen.getByRole("heading", { name: "Margin Call Risk!" });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass("text-destructive");
    });

    expect(screen.getByText("Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.")).toBeInTheDocument();
  });
});
