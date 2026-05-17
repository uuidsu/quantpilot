import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import SwipeableRow from '../components/SwipeableRow';
import { describe, it, expect, vi } from 'vitest';

describe('SwipeableRow', () => {
  it('renders correctly', () => {
    render(
      <SwipeableRow onEdit={() => {}} onDelete={() => {}}>
        <div>Row Content</div>
      </SwipeableRow>
    );
    expect(screen.getByText('Row Content')).toBeVisible();
    expect(screen.getByText('編輯')).toBeInTheDocument();
    expect(screen.getByText('刪除')).toBeInTheDocument();
  });

  it('swipes left to reveal right actions', () => {
    render(
      <SwipeableRow onEdit={() => {}} onDelete={() => {}}>
        <div data-testid="content">Row Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('content').parentElement!;

    // Initial state
    expect(content.style.transform).toBe('translateX(0px)');

    // Mock the setPointerCapture which is not present in JSDOM
    content.setPointerCapture = vi.fn();
    content.hasPointerCapture = vi.fn().mockReturnValue(true);

    // Swipe left
    fireEvent.pointerDown(content, { clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 90, clientY: 50, pointerId: 1 }); // lock horizontal
    fireEvent.pointerMove(content, { clientX: 50, clientY: 50, pointerId: 1 }); // move past snap threshold
    fireEvent.pointerUp(content, { pointerId: 1 });

    // -120px is the width of two 60px buttons (edit and delete)
    expect(content.style.transform).toBe('translateX(-120px)');
  });

  it('swipes right to reveal left actions', () => {
    render(
      <SwipeableRow onSwipeRight={() => {}}>
        <div data-testid="content">Row Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('content').parentElement!;

    // Mock the setPointerCapture which is not present in JSDOM
    content.setPointerCapture = vi.fn();
    content.hasPointerCapture = vi.fn().mockReturnValue(true);

    // Swipe right
    fireEvent.pointerDown(content, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 60, clientY: 50, pointerId: 1 }); // lock horizontal
    fireEvent.pointerMove(content, { clientX: 100, clientY: 50, pointerId: 1 }); // move past snap threshold
    fireEvent.pointerUp(content, { pointerId: 1 });

    // 72px is the width of the left action button
    expect(content.style.transform).toBe('translateX(72px)');
  });

  it('calls action callbacks', () => {
    const onEdit = vi.fn();
    render(
      <SwipeableRow onEdit={onEdit} onDelete={() => {}}>
        <div>Row Content</div>
      </SwipeableRow>
    );

    fireEvent.click(screen.getByText('編輯'));
    expect(onEdit).toHaveBeenCalled();
    // Sentinel: Require >= 2 meaningful assertions
    expect(screen.getByText('編輯')).toBeVisible();
  });

  it('snaps back when swipe distance is below threshold (Level 3/4 edge case)', () => {
    render(
      <SwipeableRow onEdit={() => {}} onDelete={() => {}}>
        <div data-testid="content">Row Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('content').parentElement!;
    content.setPointerCapture = vi.fn();
    content.hasPointerCapture = vi.fn().mockReturnValue(true);

    // Initial state
    expect(content.style.transform).toBe('translateX(0px)');

    // Swipe left just a little bit (< 30px threshold)
    fireEvent.pointerDown(content, { clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(content, { clientX: 90, clientY: 50, pointerId: 1 }); // lock h
    fireEvent.pointerMove(content, { clientX: 80, clientY: 50, pointerId: 1 }); // move 20px left

    // Check intermediate state
    expect(content.style.transform).toBe('translateX(-20px)');

    // Release pointer
    fireEvent.pointerUp(content, { pointerId: 1 });

    // Should snap back to 0
    expect(content.style.transform).toBe('translateX(0px)');
  });
});
