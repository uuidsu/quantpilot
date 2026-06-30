import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SwipeableRow from '../../components/SwipeableRow';
import { vi } from 'vitest';

describe('SwipeableRow', () => {
  it('renders children correctly and does not show buttons initially', () => {
    const { container } = render(
      <SwipeableRow onEdit={() => {}} onDelete={() => {}} onSwipeRight={() => {}}>
        <div>Test Content</div>
      </SwipeableRow>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();

    // Check initial transform state (offset = 0)
    const contentLayer = screen.getByText('Test Content').parentElement as HTMLElement;
    expect(contentLayer.style.transform).toBe('translateX(0px)');
  });

  it('swipes left to reveal right buttons', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    const contentLayer = screen.getByTestId('swipe-content').parentElement as HTMLElement;

    // Simulate pointer events
    fireEvent.pointerDown(contentLayer, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentLayer, { clientX: 190, clientY: 100, pointerId: 1 }); // lock direction h
    fireEvent.pointerMove(contentLayer, { clientX: 100, clientY: 100, pointerId: 1 }); // move left
    fireEvent.pointerUp(contentLayer, { pointerId: 1 });

    // The component should snap to -120px (60px * 2)
    await waitFor(() => {
        expect(contentLayer.style.transform).toBe('translateX(-120px)');
    });

    const editBtn = screen.getByText('編輯');
    const deleteBtn = screen.getByText('刪除');
    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    // Click edit button
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);

    // After click, should reset offset to 0
    await waitFor(() => {
      expect(contentLayer.style.transform).toBe('translateX(0px)');
    });
  });

  it('swipes right to reveal left buttons', async () => {
    const onSwipeRight = vi.fn();
    render(
      <SwipeableRow onSwipeRight={onSwipeRight}>
        <div data-testid="swipe-content">Test Content</div>
      </SwipeableRow>
    );

    const contentLayer = screen.getByTestId('swipe-content').parentElement as HTMLElement;

    // Simulate pointer events
    fireEvent.pointerDown(contentLayer, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(contentLayer, { clientX: 110, clientY: 100, pointerId: 1 }); // lock direction h
    fireEvent.pointerMove(contentLayer, { clientX: 200, clientY: 100, pointerId: 1 }); // move right
    fireEvent.pointerUp(contentLayer, { pointerId: 1 });

    // The component should snap to 72px
    await waitFor(() => {
        expect(contentLayer.style.transform).toBe('translateX(72px)');
    });

    const adjustBtn = screen.getByText('調整');
    expect(adjustBtn).toBeInTheDocument();

    // Click adjust button
    fireEvent.click(adjustBtn);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);

    // After click, should reset offset to 0
    await waitFor(() => {
      expect(contentLayer.style.transform).toBe('translateX(0px)');
    });
  });
});
