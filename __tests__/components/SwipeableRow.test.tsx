import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwipeableRow from '@/components/SwipeableRow';

describe('SwipeableRow Component', () => {
  it('Level 1: Smoke & Render - should render children correctly and have proper initial style', () => {
    render(
      <SwipeableRow>
        <div data-testid="child">Swipeable Content</div>
      </SwipeableRow>
    );

    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(screen.getByText('Swipeable Content')).toBeInTheDocument();

    // Check initial transform state
    const contentContainer = child.parentElement!;
    expect(contentContainer.style.transform).toBe('translateX(0px)');
  });

  it('Level 2: Core User Flows - should handle pointer events to reveal buttons and trigger callbacks', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onSwipeRight = vi.fn();

    render(
      <SwipeableRow onEdit={onEdit} onDelete={onDelete} onSwipeRight={onSwipeRight}>
        <div data-testid="child">Swipeable Content</div>
      </SwipeableRow>
    );

    const child = screen.getByTestId('child');
    const contentContainer = child.parentElement!;

    // Ensure hasPointerCapture and setPointerCapture are properly mocked for this element
    contentContainer.hasPointerCapture = vi.fn().mockReturnValue(true);
    contentContainer.setPointerCapture = vi.fn();

    // Simulate left swipe to reveal right buttons (Edit/Delete)
    fireEvent.pointerDown(contentContainer, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentContainer, { clientX: 50, clientY: 100, pointerId: 1 }); // dx = -150
    fireEvent.pointerUp(contentContainer, { pointerId: 1 });

    // Wait for transform style update
    await waitFor(() => {
        expect(contentContainer.style.transform).toBe('translateX(-120px)'); // 60 + 60
    });

    const editBtn = screen.getByRole('button', { name: /編輯/i });
    const deleteBtn = screen.getByRole('button', { name: /刪除/i });

    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    await userEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);

    // After click, close() is called which sets offset back to 0
    await waitFor(() => {
        expect(contentContainer.style.transform).toBe('translateX(0px)');
    });

    // Re-open right buttons
    fireEvent.pointerDown(contentContainer, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentContainer, { clientX: 50, clientY: 100, pointerId: 1 }); // dx = -150
    fireEvent.pointerUp(contentContainer, { pointerId: 1 });

    await waitFor(() => {
        expect(contentContainer.style.transform).toBe('translateX(-120px)');
    });

    await userEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);

    // Simulate right swipe to reveal left button (Swipe Right)
    fireEvent.pointerDown(contentContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentContainer, { clientX: 250, clientY: 100, pointerId: 1 }); // dx = +150
    fireEvent.pointerUp(contentContainer, { pointerId: 1 });

    await waitFor(() => {
        expect(contentContainer.style.transform).toBe('translateX(72px)'); // 72
    });

    const adjustBtn = screen.getByRole('button', { name: /調整/i });
    expect(adjustBtn).toBeInTheDocument();

    await userEvent.click(adjustBtn);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('Level 4: Edge Cases - should ignore small pointer movements and handle vertical scrolls', async () => {
    const onEdit = vi.fn();
    render(
      <SwipeableRow onEdit={onEdit}>
        <div data-testid="child">Content</div>
      </SwipeableRow>
    );

    const child = screen.getByTestId('child');
    const contentContainer = child.parentElement!;

    contentContainer.hasPointerCapture = vi.fn().mockReturnValue(true);
    contentContainer.setPointerCapture = vi.fn();

    // Small movement should be ignored
    fireEvent.pointerDown(contentContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentContainer, { clientX: 103, clientY: 100, pointerId: 1 }); // dx = 3
    fireEvent.pointerUp(contentContainer, { pointerId: 1 });

    // Ensure transform did not change to open state
    expect(contentContainer.style.transform).toBe('translateX(0px)');

    // Vertical scroll should be ignored (dy > dx)
    fireEvent.pointerDown(contentContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentContainer, { clientX: 100, clientY: 150, pointerId: 1 }); // dx = 0, dy = 50
    fireEvent.pointerUp(contentContainer, { pointerId: 1 });

    expect(contentContainer.style.transform).toBe('translateX(0px)');
  });
});
