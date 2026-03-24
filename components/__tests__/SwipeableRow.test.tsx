import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SwipeableRow from '../SwipeableRow';

describe('SwipeableRow', () => {
  it('renders children correctly and buttons are initially hidden via UI layout', () => {
    render(
      <SwipeableRow>
        <div>Test Content</div>
      </SwipeableRow>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders right action buttons correctly and allows interaction', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <div data-testid="content">Test Content</div>
      </SwipeableRow>
    );

    const editBtn = screen.getByText('編輯');
    const deleteBtn = screen.getByText('刪除');

    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('snaps open correctly when swiping left past threshold', () => {
    render(
      <SwipeableRow onEdit={vi.fn()} onDelete={vi.fn()}>
        <div data-testid="swipe-content">Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('swipe-content').parentElement!;

    // Mock capturing methods
    content.setPointerCapture = vi.fn();
    content.hasPointerCapture = vi.fn().mockReturnValue(true);

    // Start drag
    fireEvent.pointerDown(content, { clientX: 200, clientY: 100, pointerId: 1 });

    // Move slightly (under threshold 30px -> dx = -20)
    fireEvent.pointerMove(content, { clientX: 180, clientY: 100, pointerId: 1 });

    // Should be at -20px before pointerUp
    expect(content).toHaveStyle({ transform: 'translateX(-20px)' });

    // Pointer up before threshold - snaps back to 0
    fireEvent.pointerUp(content, { pointerId: 1 });
    expect(content).toHaveStyle({ transform: 'translateX(0px)' });

    // Drag again past threshold (dx = -50)
    fireEvent.pointerDown(content, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 150, clientY: 100, pointerId: 1 });

    expect(content).toHaveStyle({ transform: 'translateX(-50px)' });

    // Pointer up past threshold - snaps to full width (-120px)
    fireEvent.pointerUp(content, { pointerId: 1 });
    expect(content).toHaveStyle({ transform: 'translateX(-120px)' });
  });

  it('snaps open correctly when swiping right past threshold', () => {
    render(
      <SwipeableRow onSwipeRight={vi.fn()} swipeRightLabel="Action">
        <div data-testid="swipe-content">Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('swipe-content').parentElement!;

    content.setPointerCapture = vi.fn();
    content.hasPointerCapture = vi.fn().mockReturnValue(true);

    const leftActionBtn = screen.getByText('Action');
    expect(leftActionBtn).toBeInTheDocument();

    // Drag under threshold
    fireEvent.pointerDown(content, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 120, clientY: 100, pointerId: 1 });
    expect(content).toHaveStyle({ transform: 'translateX(20px)' });

    fireEvent.pointerUp(content, { pointerId: 1 });
    expect(content).toHaveStyle({ transform: 'translateX(0px)' });

    // Drag over threshold
    fireEvent.pointerDown(content, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 150, clientY: 100, pointerId: 1 });

    // Snaps to full left button width (72px)
    fireEvent.pointerUp(content, { pointerId: 1 });
    expect(content).toHaveStyle({ transform: 'translateX(72px)' });
  });

  it('closes swipe panel when action button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <SwipeableRow onEdit={onEdit} isOpen={false}>
        <div data-testid="swipe-content">Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('swipe-content').parentElement!;
    content.setPointerCapture = vi.fn();
    content.hasPointerCapture = vi.fn().mockReturnValue(true);

    // Force open
    fireEvent.pointerDown(content, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(content, { pointerId: 1 });
    expect(content).toHaveStyle({ transform: 'translateX(-60px)' });

    const editBtn = screen.getByText('編輯');
    fireEvent.click(editBtn);

    expect(onEdit).toHaveBeenCalledTimes(1);

    // State goes back to zero immediately on click
    // Note: since the close action calls setOffset(0) before invoking the callback,
    // the transform should be updated synchronously in React test rendering.
    expect(content).toHaveStyle({ transform: 'translateX(0px)' });
  });
});
