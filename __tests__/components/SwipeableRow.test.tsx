import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SwipeableRow from '../../components/SwipeableRow';

describe('SwipeableRow - Sentinel Level 1 & 2', () => {
  beforeAll(() => {
    // Mock the Pointer events methods that JSDOM does not implement
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('Level 1: Smoke & Render - renders children correctly', () => {
    render(
      <SwipeableRow>
        <div data-testid="row-content">Row Content</div>
      </SwipeableRow>
    );

    const content = screen.getByTestId('row-content');
    expect(content).toBeInTheDocument();
    expect(content).toBeVisible();
    expect(content).toHaveTextContent('Row Content');
  });

  it('Level 2: Core User Flows - swipe left exposes right buttons (edit/delete) and triggers callbacks', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <div data-testid="row-content">Row Content</div>
      </SwipeableRow>
    );

    const contentContainer = screen.getByTestId('row-content').parentElement as HTMLElement;

    // Simulate swipe left (dx = -50, which is > 30 threshold)
    fireEvent.pointerDown(contentContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentContainer, { clientX: 50, clientY: 100, pointerId: 1 });

    // Check if translation style is applied
    expect(contentContainer).toHaveStyle('transform: translateX(-50px)');

    fireEvent.pointerUp(contentContainer, { pointerId: 1 });

    // The threshold is 30, so snapping should set it to -120px (60 + 60 for edit + delete)
    expect(contentContainer).toHaveStyle('transform: translateX(-120px)');

    // Assert buttons are visible and click them
    const editBtn = screen.getByText('編輯');
    const deleteBtn = screen.getByText('刪除');

    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();
    expect(editBtn).toBeVisible();
    expect(deleteBtn).toBeVisible();

    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Level 2: Core User Flows - swipe right exposes left button (adjust) and triggers callback', () => {
    const onSwipeRight = vi.fn();

    render(
      <SwipeableRow onSwipeRight={onSwipeRight}>
        <div data-testid="row-content">Row Content</div>
      </SwipeableRow>
    );

    const contentContainer = screen.getByTestId('row-content').parentElement as HTMLElement;

    // Simulate swipe right (dx = +50, which is > 30 threshold)
    fireEvent.pointerDown(contentContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentContainer, { clientX: 150, clientY: 100, pointerId: 1 });

    expect(contentContainer).toHaveStyle('transform: translateX(50px)');

    fireEvent.pointerUp(contentContainer, { pointerId: 1 });

    // Snap to 72px (left button width)
    expect(contentContainer).toHaveStyle('transform: translateX(72px)');

    const adjustBtn = screen.getByText('調整');
    expect(adjustBtn).toBeInTheDocument();
    expect(adjustBtn).toBeVisible();

    fireEvent.click(adjustBtn);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('Level 2: Core User Flows - snaps back when swipe distance is below threshold', () => {
    render(
      <SwipeableRow onEdit={vi.fn()}>
        <div data-testid="row-content">Row Content</div>
      </SwipeableRow>
    );

    const contentContainer = screen.getByTestId('row-content').parentElement as HTMLElement;

    // Simulate short swipe left (dx = -20, which is < 30 threshold)
    fireEvent.pointerDown(contentContainer, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentContainer, { clientX: 80, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(contentContainer, { pointerId: 1 });

    // Should snap back to 0
    expect(contentContainer).toHaveStyle('transform: translateX(0px)');
  });
});
