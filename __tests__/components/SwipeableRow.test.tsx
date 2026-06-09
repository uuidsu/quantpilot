import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwipeableRow from '../../components/SwipeableRow';

describe('SwipeableRow - Sentinel Iterations', () => {
  beforeEach(() => {
    // Mock Pointer Events API which jsdom lacks
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  });

  // Level 1: Smoke & Render
  it('Level 1: Renders children correctly and action buttons are initially hidden in layout', () => {
    render(
      <SwipeableRow
        onEdit={() => {}}
        onDelete={() => {}}
        editLabel="EditMe"
        deleteLabel="DelMe"
      >
        <div data-testid="row-content">TargetRowContent</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('row-content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('TargetRowContent');

    // The buttons should exist in the DOM (but they are structurally behind the relative offset content)
    const editBtn = screen.getByRole('button', { name: 'EditMe' });
    const delBtn = screen.getByRole('button', { name: 'DelMe' });
    expect(editBtn).toBeInTheDocument();
    expect(delBtn).toBeInTheDocument();
  });

  // Level 2: Core User Flows
  it('Level 2: Simulates horizontal swipe left to reveal right action buttons', () => {
    const editMock = vi.fn();
    render(
      <SwipeableRow onEdit={editMock} editLabel="EditMe">
        <div data-testid="row-content">SwipeableContent</div>
      </SwipeableRow>
    );

    const container = screen.getByTestId('row-content').parentElement!;

    // Initial state: offset 0
    expect(container).toHaveStyle({ transform: 'translateX(0px)' });

    // Simulate pointer down
    fireEvent.pointerDown(container, { clientX: 100, clientY: 50, pointerId: 1 });

    // Simulate pointer move left by 60px (dx = -60)
    fireEvent.pointerMove(container, { clientX: 40, clientY: 50, pointerId: 1 });

    // Transform should update according to internal state (-60)
    expect(container).toHaveStyle({ transform: 'translateX(-60px)' });

    // Simulate pointer up to snap to the RIGHT_BTN_W (-60)
    fireEvent.pointerUp(container, { pointerId: 1 });
    expect(container).toHaveStyle({ transform: 'translateX(-60px)' });

    // Verify click behavior
    const editBtn = screen.getByRole('button', { name: 'EditMe' });
    fireEvent.click(editBtn);
    expect(editMock).toHaveBeenCalledTimes(1);

    // Offset resets after action is clicked
    expect(container).toHaveStyle({ transform: 'translateX(0px)' });
  });

  // Level 3 & 4: State Updates / Edge Cases
  it('Level 3: Simulates horizontal swipe right to reveal left action buttons', () => {
    const swipeRightMock = vi.fn();
    render(
      <SwipeableRow onSwipeRight={swipeRightMock} swipeRightLabel="AdjustMe">
        <div data-testid="row-content">Content</div>
      </SwipeableRow>
    );

    const container = screen.getByTestId('row-content').parentElement!;

    fireEvent.pointerDown(container, { clientX: 50, clientY: 50, pointerId: 2 });

    // Swipe right by 80px
    fireEvent.pointerMove(container, { clientX: 130, clientY: 50, pointerId: 2 });

    // The left button width is 72, so the max it goes is +72
    expect(container).toHaveStyle({ transform: 'translateX(72px)' });

    fireEvent.pointerUp(container, { pointerId: 2 });
    expect(container).toHaveStyle({ transform: 'translateX(72px)' });

    // Click left button
    const adjBtn = screen.getByRole('button', { name: 'AdjustMe' });
    fireEvent.click(adjBtn);
    expect(swipeRightMock).toHaveBeenCalledTimes(1);
  });
});
