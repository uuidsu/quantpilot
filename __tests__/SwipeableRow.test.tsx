import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SwipeableRow from '../components/SwipeableRow';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

describe('SwipeableRow Component Level 2: Core User Flows', () => {
    it('renders the content properly and starts with hidden action buttons', () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const onSwipeRight = vi.fn();

        render(
            <SwipeableRow onEdit={onEdit} onDelete={onDelete} onSwipeRight={onSwipeRight}>
                <div data-testid="content">Row Content</div>
            </SwipeableRow>
        );

        const content = screen.getByTestId('content');
        expect(content).toBeInTheDocument();
        expect(content).toBeVisible();
        expect(content).toHaveTextContent('Row Content');

        const editButton = screen.getByRole('button', { name: '編輯' });
        expect(editButton).toBeInTheDocument();

        // Check it has no offset initially
        expect(content.parentElement).toHaveStyle('transform: translateX(0px)');
    });

    it('simulates swipe to left to reveal edit and delete buttons and click edit', async () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const onSwipeRight = vi.fn();

        render(
            <SwipeableRow onEdit={onEdit} onDelete={onDelete} onSwipeRight={onSwipeRight}>
                <div data-testid="content">Row Content</div>
            </SwipeableRow>
        );

        const rowWrapper = screen.getByTestId('content').parentElement;
        if (!rowWrapper) throw new Error("Wrapper not found");

        // Mock properties for swipe
        Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
            value: vi.fn().mockReturnValue(true),
            configurable: true
        });

        // Simulate Swipe Left
        fireEvent.pointerDown(rowWrapper, { clientX: 200, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(rowWrapper, { clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerUp(rowWrapper, { pointerId: 1 });

        // It should be swiped left and snap to reveal right buttons (-120px)
        expect(rowWrapper).toHaveStyle('transform: translateX(-120px)');

        // Click edit
        const editButton = screen.getByRole('button', { name: '編輯' });
        await userEvent.click(editButton);

        expect(onEdit).toHaveBeenCalled();
        expect(rowWrapper).toHaveStyle('transform: translateX(0px)'); // should close
    });

    it('simulates swipe to right to reveal adjust button and click adjust', async () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const onSwipeRight = vi.fn();

        render(
            <SwipeableRow onEdit={onEdit} onDelete={onDelete} onSwipeRight={onSwipeRight}>
                <div data-testid="content">Row Content</div>
            </SwipeableRow>
        );

        const rowWrapper = screen.getByTestId('content').parentElement;
        if (!rowWrapper) throw new Error("Wrapper not found");

        // Mock properties for swipe
        Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
            value: vi.fn().mockReturnValue(true),
            configurable: true
        });

        // Simulate Swipe Right
        fireEvent.pointerDown(rowWrapper, { clientX: 100, clientY: 100, pointerId: 2 });
        fireEvent.pointerMove(rowWrapper, { clientX: 200, clientY: 100, pointerId: 2 });
        fireEvent.pointerUp(rowWrapper, { pointerId: 2 });

        // It should be swiped right and snap to reveal left buttons (72px)
        expect(rowWrapper).toHaveStyle('transform: translateX(72px)');

        // Click adjust
        const adjustButton = screen.getByRole('button', { name: '調整' });
        await userEvent.click(adjustButton);

        expect(onSwipeRight).toHaveBeenCalled();
        expect(rowWrapper).toHaveStyle('transform: translateX(0px)'); // should close
    });
});
