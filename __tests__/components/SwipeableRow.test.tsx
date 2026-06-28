import { render, screen, fireEvent } from '@testing-library/react'
import SwipeableRow from '@/components/SwipeableRow'
import { expect, test, describe, vi, afterEach } from 'vitest'

describe('SwipeableRow', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('renders children correctly', () => {
    render(
      <SwipeableRow>
        <div>Row Content</div>
      </SwipeableRow>
    )
    expect(screen.getByText('Row Content')).toBeInTheDocument()
    expect(screen.queryByText('編輯')).not.toBeInTheDocument()
  })

  test('swiping left exposes right buttons', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const { container } = render(
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <div>Row Content</div>
      </SwipeableRow>
    )

    // Verify buttons are rendered but hidden by overflow initially
    expect(screen.getByText('編輯')).toBeInTheDocument()
    expect(screen.getByText('刪除')).toBeInTheDocument()

    // The swipeable container is the last child of the main container div
    const swipeableDiv = container.firstChild?.lastChild as HTMLDivElement

    // Initial state should be 0 translate
    expect(swipeableDiv).toHaveStyle({ transform: 'translateX(0px)' })

    // Simulate pointer events
    // Mock the hasPointerCapture to return true for the rest of this test
    const mockHasPointerCapture = vi.spyOn(window.HTMLElement.prototype, 'hasPointerCapture').mockReturnValue(true)

    // Start swipe at x=100
    fireEvent.pointerDown(swipeableDiv, { clientX: 100, clientY: 100, pointerId: 1 })

    // Move left to x=40
    fireEvent.pointerMove(swipeableDiv, { clientX: 40, clientY: 100, pointerId: 1 })

    // Wait and check transform has changed (should be moved by -60)
    expect(swipeableDiv).toHaveStyle({ transform: 'translateX(-60px)' })

    // Release pointer - should snap to -120px (RIGHT_BTN_W is 120 because both buttons are present)
    fireEvent.pointerUp(swipeableDiv, { clientX: 40, clientY: 100, pointerId: 1 })
    expect(swipeableDiv).toHaveStyle({ transform: 'translateX(-120px)' })

    // Click edit button
    fireEvent.click(screen.getByText('編輯'))
    expect(onEdit).toHaveBeenCalled()
    // It should close after clicking
    expect(swipeableDiv).toHaveStyle({ transform: 'translateX(0px)' })

    mockHasPointerCapture.mockRestore()
  })

  test('swiping right exposes left buttons', () => {
    const onSwipeRight = vi.fn()
    const { container } = render(
      <SwipeableRow onSwipeRight={onSwipeRight}>
        <div>Row Content</div>
      </SwipeableRow>
    )

    // The swipeable container is the last child of the main container div
    const swipeableDiv = container.firstChild?.lastChild as HTMLDivElement

    // Simulate pointer events
    // Mock the hasPointerCapture to return true for the rest of this test
    const mockHasPointerCapture = vi.spyOn(window.HTMLElement.prototype, 'hasPointerCapture').mockReturnValue(true)

    // Start swipe at x=100
    fireEvent.pointerDown(swipeableDiv, { clientX: 100, clientY: 100, pointerId: 1 })

    // Move right to x=150
    fireEvent.pointerMove(swipeableDiv, { clientX: 150, clientY: 100, pointerId: 1 })

    // Should be moved by 50
    expect(swipeableDiv).toHaveStyle({ transform: 'translateX(50px)' })

    // Release pointer - should snap to 72px (LEFT_BTN_W is 72)
    fireEvent.pointerUp(swipeableDiv, { clientX: 150, clientY: 100, pointerId: 1 })
    expect(swipeableDiv).toHaveStyle({ transform: 'translateX(72px)' })

    // Click action button
    fireEvent.click(screen.getByText('調整'))
    expect(onSwipeRight).toHaveBeenCalled()

    mockHasPointerCapture.mockRestore()
  })
})
