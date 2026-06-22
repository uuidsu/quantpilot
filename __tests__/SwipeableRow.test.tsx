import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwipeableRow from '../components/SwipeableRow';
import { vi, expect, it, describe, beforeEach } from 'vitest';

describe('SwipeableRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Level 1: Smoke & Render - Renders content and buttons are initially hidden via transform', () => {
    render(
      <SwipeableRow onEdit={() => {}} onDelete={() => {}} onSwipeRight={() => {}}>
        <div>Row Content</div>
      </SwipeableRow>
    );

    expect(screen.getByText('Row Content')).toBeInTheDocument();

    const contentContainer = screen.getByText('Row Content').parentElement;
    expect(contentContainer).toHaveStyle({ transform: 'translateX(0px)' });
  });

  it('Level 2: Pointer Interaction - Left swipe exposes right buttons and clicks trigger action', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(
          <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
              <div data-testid="swipe-content">Row Content</div>
          </SwipeableRow>
      );

      const content = screen.getByTestId('swipe-content').parentElement!;

      // Need to mock hasPointerCapture returning true during move and up
      window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);

      fireEvent.pointerDown(content, { clientX: 200, clientY: 100, pointerId: 1 });

      // First move to establish direction
      fireEvent.pointerMove(content, { clientX: 190, clientY: 100, pointerId: 1 });

      // Second move to actually swipe
      fireEvent.pointerMove(content, { clientX: 50, clientY: 100, pointerId: 1 });

      fireEvent.pointerUp(content, { pointerId: 1 });

      expect(content).toHaveStyle({ transform: 'translateX(-120px)' });

      const editButton = screen.getByText('編輯');
      expect(editButton).toBeInTheDocument();
      expect(editButton).toBeVisible();

      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(content).toHaveStyle({ transform: 'translateX(0px)' });
  });

  it('Level 2: Pointer Interaction - Right swipe exposes left buttons and triggers action', () => {
      const onSwipeRight = vi.fn();

      render(
          <SwipeableRow onSwipeRight={onSwipeRight}>
              <div data-testid="swipe-content">Row Content</div>
          </SwipeableRow>
      );

      const content = screen.getByTestId('swipe-content').parentElement!;

      window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);

      fireEvent.pointerDown(content, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(content, { clientX: 110, clientY: 100, pointerId: 1 }); // Establish 'h' dir
      fireEvent.pointerMove(content, { clientX: 200, clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(content, { pointerId: 1 });

      // LEFT_BTN_W is 72
      expect(content).toHaveStyle({ transform: 'translateX(72px)' });

      const rightButton = screen.getByText('調整');
      expect(rightButton).toBeInTheDocument();
      expect(rightButton).toBeVisible();

      fireEvent.click(rightButton);

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
      expect(content).toHaveStyle({ transform: 'translateX(0px)' });
  });

  it('Level 4: Edge Cases - Does not snap if threshold not met', () => {
      const onEdit = vi.fn();

      render(
          <SwipeableRow onEdit={onEdit}>
              <div data-testid="swipe-content">Row Content</div>
          </SwipeableRow>
      );

      const content = screen.getByTestId('swipe-content').parentElement!;
      window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);

      fireEvent.pointerDown(content, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(content, { clientX: 90, clientY: 100, pointerId: 1 }); // Establishing 'h' dir
      fireEvent.pointerMove(content, { clientX: 80, clientY: 100, pointerId: 1 }); // Total delta -20. Threshold is 30.
      fireEvent.pointerUp(content, { pointerId: 1 });

      // Should snap back to 0
      expect(content).toHaveStyle({ transform: 'translateX(0px)' });
  });
});
