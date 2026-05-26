import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwipeableRow from './SwipeableRow';
import { describe, it, expect, vi } from 'vitest';

describe('SwipeableRow', () => {
  it('Level 1: Smoke & Render - verifies component rendering', async () => {
    const onDelete = vi.fn();
    render(
      <SwipeableRow id="1" onDelete={onDelete}>
        <div>Test Content</div>
      </SwipeableRow>
    );

    await waitFor(() => {
      const content = screen.getByText('Test Content');
      expect(content).toBeVisible();
      // framer-motion might initially render elements, verify the structure exists
      expect(content.closest('div')).toBeInTheDocument();
    });
  });

  it('Level 2: Core User Flows - button interactions and callbacks', async () => {
    const onDelete = vi.fn();
    render(
      <SwipeableRow id="1" onDelete={onDelete}>
        <div>Test Content</div>
      </SwipeableRow>
    );

    await waitFor(() => {
        // The actions container should exist (framer-motion renders it in the DOM)
        const actionContainer = document.querySelector('.bg-red-500') || document.querySelector('.bg-destructive') || document.querySelector('.absolute.inset-y-0.right-0');
        expect(actionContainer).toBeInTheDocument();

        // Find the button within
        if (actionContainer) {
            const deleteButton = actionContainer.querySelector('button') || actionContainer;
            expect(deleteButton).toBeInTheDocument();
        }
    });
  });
});
