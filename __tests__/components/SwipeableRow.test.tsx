import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwipeableRow from '@/components/SwipeableRow';

describe('SwipeableRow', () => {
  it('renders children correctly and actions are in DOM (Level 1: Smoke & Render)', () => {
    render(
      <SwipeableRow onEdit={() => {}} onDelete={() => {}}>
        <div data-testid="row-content">Row Content</div>
      </SwipeableRow>
    );

    expect(screen.getByTestId('row-content')).toBeInTheDocument();
    expect(screen.getByText('Row Content')).toBeInTheDocument();

    // Actions should be present in the DOM but hidden via translation/overlay visually
    const editBtn = screen.getByText('編輯');
    const deleteBtn = screen.getByText('刪除');
    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();
  });

  it('triggers onEdit and onDelete callbacks when buttons are clicked (Level 2: Core Flows)', async () => {
    const user = userEvent.setup();
    const mockEdit = vi.fn();
    const mockDelete = vi.fn();

    render(
      <SwipeableRow onEdit={mockEdit} onDelete={mockDelete}>
        <div>Content</div>
      </SwipeableRow>
    );

    const editBtn = screen.getByText('編輯');
    const deleteBtn = screen.getByText('刪除');

    await user.click(editBtn);
    expect(mockEdit).toHaveBeenCalledTimes(1);

    await user.click(deleteBtn);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
