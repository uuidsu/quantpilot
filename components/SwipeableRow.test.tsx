import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SwipeableRow from './SwipeableRow';

describe('SwipeableRow', () => {
  it('renders children and buttons correctly initially', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<SwipeableRow onEdit={onEdit} onDelete={onDelete}><div>Row Content</div></SwipeableRow>);

    // Meaningful assertion 1
    expect(screen.getByText('Row Content')).toBeInTheDocument();
    // Meaningful assertion 2
    expect(screen.getByText('編輯')).toBeInTheDocument();
    // Meaningful assertion 3
    expect(screen.getByText('刪除')).toBeInTheDocument();
  });

  it('calls correct callbacks when buttons are clicked', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<SwipeableRow onEdit={onEdit} onDelete={onDelete}><div>Row Content</div></SwipeableRow>);

    fireEvent.click(screen.getByText('編輯'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByText('刪除'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
