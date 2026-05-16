import { render, screen, fireEvent } from '@testing-library/react';
import SwipeableRow from './SwipeableRow';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SwipeableRow', () => {
  beforeEach(() => {
    // Mock setPointerCapture and hasPointerCapture since jsdom doesn't implement them
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  });

  it('renders children correctly', () => {
    render(<SwipeableRow><div>Test Content</div></SwipeableRow>);
    expect(screen.getByText('Test Content')).toBeVisible();
  });

  it('shows edit and delete buttons when dragging left', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('swipe-content').parentElement!;

    fireEvent.pointerDown(content, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 50, clientY: 100, pointerId: 1 }); // move left by 50px
    fireEvent.pointerUp(content, { pointerId: 1 });

    expect(screen.getByText('編輯')).toBeVisible();
    expect(screen.getByText('刪除')).toBeVisible();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();

    render(
      <SwipeableRow onEdit={onEdit}>
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('swipe-content').parentElement!;

    // Swipe left
    fireEvent.pointerDown(content, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 0, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(content, { pointerId: 1 });

    const editBtn = screen.getByText('編輯');
    fireEvent.click(editBtn);

    expect(onEdit).toHaveBeenCalled();
  });

  it('shows right swipe action when dragging right', () => {
    const onSwipeRight = vi.fn();

    render(
      <SwipeableRow onSwipeRight={onSwipeRight} swipeRightLabel="Action">
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('swipe-content').parentElement!;

    fireEvent.pointerDown(content, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 150, clientY: 100, pointerId: 1 }); // move right by 50px
    fireEvent.pointerUp(content, { pointerId: 1 });

    expect(screen.getByText('Action')).toBeVisible();
  });
});
