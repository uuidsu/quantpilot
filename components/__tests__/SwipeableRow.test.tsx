import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwipeableRow from '../SwipeableRow';

describe('SwipeableRow', () => {
  it('renders content correctly without any actions', () => {
    render(<SwipeableRow><div>Row Content</div></SwipeableRow>);

    // Level 1: Smoke & Render Assertions
    expect(screen.getByText('Row Content')).toBeInTheDocument();
  });

  it('renders edit and delete buttons when onEdit and onDelete provided', () => {
    const onEditMock = vi.fn();
    const onDeleteMock = vi.fn();

    render(
      <SwipeableRow onEdit={onEditMock} onDelete={onDeleteMock}>
        <div>Row Content</div>
      </SwipeableRow>
    );

    // Initial buttons should be present (though hidden by offset, we test presence in DOM here)
    expect(screen.getByRole('button', { name: '編輯' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '刪除' })).toBeInTheDocument();
  });

  it('renders left button when onSwipeRight is provided', () => {
    const onSwipeRightMock = vi.fn();

    render(
      <SwipeableRow onSwipeRight={onSwipeRightMock} swipeRightLabel="Adjust">
        <div>Row Content</div>
      </SwipeableRow>
    );

    expect(screen.getByRole('button', { name: 'Adjust' })).toBeInTheDocument();
  });

  it('handles edit button click', async () => {
    const onEditMock = vi.fn();
    render(
      <SwipeableRow onEdit={onEditMock}>
        <div>Row Content</div>
      </SwipeableRow>
    );

    const editButton = screen.getByRole('button', { name: '編輯' });

    // Level 2: Core User Flows Assertions
    await userEvent.click(editButton);
    expect(onEditMock).toHaveBeenCalledTimes(1);
  });
});
