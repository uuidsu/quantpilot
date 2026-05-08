import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SwipeableRow from './SwipeableRow';

describe('SwipeableRow', () => {
  beforeEach(() => {
    // Mock the pointer capture functions since jsdom doesn't implement them
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it('renders content correctly', () => {
    render(<SwipeableRow><div>Row Content</div></SwipeableRow>);
    expect(screen.getByText('Row Content')).toBeInTheDocument();
  });

  it('shows edit and delete buttons when dragging left', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<SwipeableRow onEdit={onEdit} onDelete={onDelete}><div>Row Content</div></SwipeableRow>);

    const row = screen.getByText('Row Content').parentElement!;

    // Simulate swipe left
    fireEvent.pointerDown(row, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(row, { clientX: 20, clientY: 100, pointerId: 1 }); // Move left
    fireEvent.pointerUp(row, { clientX: 20, clientY: 100, pointerId: 1 });

    // Check transform is applied to show right buttons
    expect(row).toHaveStyle({ transform: 'translateX(-120px)' });

    const editBtn = screen.getByText('編輯');
    const delBtn = screen.getByText('刪除');
    expect(editBtn).toBeInTheDocument();
    expect(delBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalled();
  });

  it('shows swipe right button when dragging right', () => {
    const onSwipeRight = vi.fn();
    render(<SwipeableRow onSwipeRight={onSwipeRight}><div>Row Content</div></SwipeableRow>);

    const row = screen.getByText('Row Content').parentElement!;

    // Simulate swipe right
    fireEvent.pointerDown(row, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(row, { clientX: 180, clientY: 100, pointerId: 1 }); // Move right
    fireEvent.pointerUp(row, { clientX: 180, clientY: 100, pointerId: 1 });

    // Check transform is applied to show left buttons
    expect(row).toHaveStyle({ transform: 'translateX(72px)' });

    const actionBtn = screen.getByText('調整');
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(onSwipeRight).toHaveBeenCalled();
  });

  it('resets offset when isOpen prop becomes false', () => {
    const { rerender } = render(<SwipeableRow onEdit={vi.fn()} isOpen={true}><div>Row Content</div></SwipeableRow>);

    const row = screen.getByText('Row Content').parentElement!;

    // Swipe left to open
    fireEvent.pointerDown(row, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(row, { clientX: 20, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(row, { clientX: 20, clientY: 100, pointerId: 1 });

    expect(row).toHaveStyle({ transform: 'translateX(-60px)' }); // Right btn width is 60 (edit only)

    // Rerender with isOpen=false
    rerender(<SwipeableRow onEdit={vi.fn()} isOpen={false}><div>Row Content</div></SwipeableRow>);

    expect(row).toHaveStyle({ transform: 'translateX(0px)' });
  });

  it('prevents click event bubbling if a swipe occurred', () => {
    const onClickParent = vi.fn();

    render(
      <div onClick={onClickParent}>
        <SwipeableRow onEdit={vi.fn()}>
          <div>Row Content</div>
        </SwipeableRow>
      </div>
    );

    const row = screen.getByText('Row Content').parentElement!;

    // Simulate a swipe
    fireEvent.pointerDown(row, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(row, { clientX: 50, clientY: 100, pointerId: 1 }); // dx = -50
    fireEvent.pointerUp(row, { clientX: 50, clientY: 100, pointerId: 1 });

    // Fire a capture click that represents the end of touch/mouse interactions
    fireEvent.click(row);

    // Click should be stopped from bubbling
    expect(onClickParent).not.toHaveBeenCalled();

    // A subsequent normal click without swipe should bubble
    fireEvent.pointerDown(row, { clientX: 100, clientY: 100, pointerId: 2 });
    fireEvent.pointerMove(row, { clientX: 102, clientY: 102, pointerId: 2 }); // Not enough to trigger swipe
    fireEvent.pointerUp(row, { clientX: 102, clientY: 102, pointerId: 2 });

    fireEvent.click(row);
    expect(onClickParent).toHaveBeenCalledTimes(1);
  });
});
