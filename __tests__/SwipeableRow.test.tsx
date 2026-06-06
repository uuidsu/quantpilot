import { render, screen, fireEvent } from "@testing-library/react";
import SwipeableRow from "@/components/SwipeableRow";
import { describe, it, expect, vi } from "vitest";
import userEvent from '@testing-library/user-event';

describe("SwipeableRow", () => {
  it("Level 1: Smoke & Render - displays children and handles initial state correctly", () => {
    render(
      <SwipeableRow onEdit={() => {}} onDelete={() => {}} onSwipeRight={() => {}}>
        <div data-testid="row-content">Row Content</div>
      </SwipeableRow>
    );

    // Assert child content is visible
    expect(screen.getByTestId("row-content")).toBeInTheDocument();
    expect(screen.getByText("Row Content")).toBeVisible();
  });

  it("Level 2: Core User Flows - left swipe reveals edit and delete buttons and click them", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <div data-testid="row-content">Row Content</div>
      </SwipeableRow>
    );

    const container = screen.getByTestId("row-content").parentElement!;

    // Simulate pointer events to swipe left (dx = -100, dy = 0)
    fireEvent.pointerDown(container, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(container, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(container, { pointerId: 1 });

    // Assert buttons are rendered and visible after swipe
    const editBtn = screen.getByText("編輯");
    const deleteBtn = screen.getByText("刪除");
    expect(editBtn).toBeVisible();
    expect(deleteBtn).toBeVisible();

    // Click edit
    await userEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);

    // Click delete
    await userEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("Level 2: Core User Flows - right swipe reveals swipeRight action button", async () => {
    const onSwipeRight = vi.fn();

    render(
      <SwipeableRow onSwipeRight={onSwipeRight} swipeRightLabel="調整">
        <div data-testid="row-content">Row Content</div>
      </SwipeableRow>
    );

    const container = screen.getByTestId("row-content").parentElement!;

    // Simulate pointer events to swipe right (dx = 100, dy = 0)
    fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 2 });
    fireEvent.pointerMove(container, { clientX: 200, clientY: 100, pointerId: 2 });
    fireEvent.pointerUp(container, { pointerId: 2 });

    const rightBtn = screen.getByText("調整");
    expect(rightBtn).toBeVisible();

    await userEvent.click(rightBtn);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it("Level 4: Edge Cases - does not trigger click on content if a swipe occurred", async () => {
    const onClick = vi.fn();

    render(
      <SwipeableRow onEdit={() => {}}>
        <div data-testid="row-content" onClick={onClick}>Row Content</div>
      </SwipeableRow>
    );

    const container = screen.getByTestId("row-content").parentElement!;

    // Perform swipe
    fireEvent.pointerDown(container, { clientX: 200, clientY: 100, pointerId: 3 });
    fireEvent.pointerMove(container, { clientX: 100, clientY: 100, pointerId: 3 });
    fireEvent.pointerUp(container, { pointerId: 3 });

    // Fire capture click that the component should stop propagation for
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    // Fire event at capture phase by doing standard dispatch
    fireEvent.click(container, clickEvent);

    expect(onClick).not.toHaveBeenCalled();

    // Now just a normal click
    await userEvent.click(screen.getByTestId("row-content"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
