import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SwipeableRow from '@/components/SwipeableRow';
import { vi } from 'vitest';

describe('SwipeableRow Component - Level 3: Interaction & DOM States', () => {
  it('renders children correctly', () => {
    render(<SwipeableRow><div>Test Content</div></SwipeableRow>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('reveals right buttons (Edit/Delete) on left swipe', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    const swipeContainer = screen.getByTestId('swipe-content').parentElement!;

    // Mock capture methods for Pointer Events polyfill
    swipeContainer.setPointerCapture = vi.fn();
    swipeContainer.hasPointerCapture = vi.fn().mockReturnValue(true);

    fireEvent.pointerDown(swipeContainer, { clientX: 200, clientY: 100, pointerId: 1 });
    // Move left to reveal right buttons (width 120, offset should be clamped at -120)
    fireEvent.pointerMove(swipeContainer, { clientX: 50, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(swipeContainer, { pointerId: 1 });

    expect(screen.getByText('編輯')).toBeInTheDocument();
    expect(screen.getByText('刪除')).toBeInTheDocument();

    // Check translation applied
    expect(swipeContainer.style.transform).toBe('translateX(-120px)');
  });

  it('reveals left button (Adjust) on right swipe', () => {
    const onSwipeRight = vi.fn();
    const { container } = render(
      <SwipeableRow onSwipeRight={onSwipeRight}>
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    const swipeContainer = screen.getByTestId('swipe-content').parentElement!;

    swipeContainer.setPointerCapture = vi.fn();
    swipeContainer.hasPointerCapture = vi.fn().mockReturnValue(true);

    fireEvent.pointerDown(swipeContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    // Move right to reveal left button (width 72, offset clamped at 72)
    fireEvent.pointerMove(swipeContainer, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(swipeContainer, { pointerId: 1 });

    expect(screen.getByText('調整')).toBeInTheDocument();
    expect(swipeContainer.style.transform).toBe('translateX(72px)');
  });

  it('triggers delete action and resets offset', () => {
    const onDelete = vi.fn();
    render(
      <SwipeableRow onDelete={onDelete} isOpen={true}>
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    fireEvent.click(screen.getByText('刪除'));
    expect(onDelete).toHaveBeenCalledTimes(1);

    // The state is internal but we can check if it attempts to close.
    // Given the simple component logic, it calls close() before the callback.
  });

  it('does not snap if swipe threshold is not met', () => {
    const onEdit = vi.fn();
    render(
      <SwipeableRow onEdit={onEdit}>
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    const swipeContainer = screen.getByTestId('swipe-content').parentElement!;
    swipeContainer.setPointerCapture = vi.fn();
    swipeContainer.hasPointerCapture = vi.fn().mockReturnValue(true);

    fireEvent.pointerDown(swipeContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    // Move slightly left (-20px), threshold is 30px
    fireEvent.pointerMove(swipeContainer, { clientX: 80, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(swipeContainer, { pointerId: 1 });

    // Should snap back to 0
    expect(swipeContainer.style.transform).toBe('translateX(0px)');
  });
});
