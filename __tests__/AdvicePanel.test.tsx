import { render, screen } from "@testing-library/react";
import { AdvicePanel } from "@/components/AdvicePanel";
import { describe, it, expect, vi } from "vitest";

vi.mock("framer-motion", () => {
  return {
    motion: {
      div: ({ children, className }: any) => <div className={className} data-testid="motion-div">{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe("AdvicePanel", () => {
  it("renders safe status when leverage is well below limit", () => {
    render(<AdvicePanel currentLeverage={1.5} limit={3.0} />);

    expect(screen.getByText("Comfortable Exposure")).toBeInTheDocument();
    expect(screen.getByText("You have room to increase exposure by buying more shares.")).toBeInTheDocument();
    expect(screen.getByTestId("motion-div")).toHaveTextContent("Comfortable Exposure");
  });

  it("renders warning status when leverage is approaching limit", () => {
    render(<AdvicePanel currentLeverage={2.5} limit={3.0} />);

    expect(screen.getByText("Approaching Limit")).toBeInTheDocument();
    expect(screen.getByText("Your leverage is getting high. Be cautious with new purchases.")).toBeInTheDocument();
  });

  it("renders danger status when leverage exceeds limit", () => {
    render(<AdvicePanel currentLeverage={3.5} limit={3.0} />);

    expect(screen.getByText("Margin Call Risk!")).toBeInTheDocument();
    expect(screen.getByText("Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.")).toBeInTheDocument();
  });
});
