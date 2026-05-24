import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AdvicePanel } from "@/components/AdvicePanel";

describe("AdvicePanel - Level 2 Integration", () => {
  it("renders safe state correctly and asserts DOM attributes", () => {
    const { container } = render(<AdvicePanel currentLeverage={0.5} limit={1} />);

    // Assert visual text components
    const title = screen.getByText("Comfortable Exposure");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("text-emerald-400");

    const message = screen.getByText("You have room to increase exposure by buying more shares.");
    expect(message).toBeInTheDocument();

    // Assert structural classes
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("bg-emerald-500/10");
  });

  it("renders warning state correctly and asserts DOM attributes", () => {
    const { container } = render(<AdvicePanel currentLeverage={0.9} limit={1} />);

    const title = screen.getByText("Approaching Limit");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("text-yellow-500");

    const message = screen.getByText("Your leverage is getting high. Be cautious with new purchases.");
    expect(message).toBeInTheDocument();

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("bg-yellow-500/10");
  });

  it("renders danger state correctly and asserts DOM attributes", () => {
    const { container } = render(<AdvicePanel currentLeverage={1.5} limit={1} />);

    const title = screen.getByText("Margin Call Risk!");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("text-destructive");

    const message = screen.getByText(
      "Your leverage exceeds your limit. Consider selling shares immediately to reduce risk."
    );
    expect(message).toBeInTheDocument();

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("bg-destructive/10");
  });
});
