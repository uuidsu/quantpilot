import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Card, Button, Input, Label, AnimatedNumber } from '../components/ui-elements';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

describe('UI Elements Components Level 2: Core User Flows', () => {
    it('Button component renders properly and handles click interactions', async () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick} variant="primary">Click Me</Button>);

        const button = screen.getByRole('button', { name: 'Click Me' });
        expect(button).toBeInTheDocument();
        expect(button).toBeVisible();

        await userEvent.click(button);
        expect(onClick).toHaveBeenCalled();
    });

    it('Button component respects disabled and loading states', async () => {
        const onClick = vi.fn();
        const { rerender } = render(<Button onClick={onClick} disabled>Click Me</Button>);

        const button = screen.getByRole('button', { name: 'Click Me' });
        expect(button).toBeDisabled();

        await userEvent.click(button);
        expect(onClick).not.toHaveBeenCalled();

        // Loading state
        rerender(<Button onClick={onClick} isLoading>Click Me</Button>);
        expect(button).toBeDisabled();
        // check for loading spinner class within the button svg
        const svg = button.querySelector('svg');
        expect(svg).toHaveClass('animate-spin');
    });

    it('Input component handles text changes', async () => {
        render(<Input placeholder="Enter text..." data-testid="input" />);

        const input = screen.getByTestId('input');
        expect(input).toBeInTheDocument();

        await userEvent.type(input, 'Hello World');
        expect(input).toHaveValue('Hello World');
    });

    it('Card and Label render their children properly', () => {
        render(
            <Card>
                <Label data-testid="label">Hello Label</Label>
            </Card>
        );

        const label = screen.getByTestId('label');
        expect(label).toBeInTheDocument();
        expect(label).toHaveTextContent('Hello Label');
        expect(label.parentElement).toHaveClass('bg-card');
    });

    it('AnimatedNumber renders properly with format', () => {
        render(<AnimatedNumber value={1000.5} prefix="$" suffix="%" decimals={1} />);

        const animatedSpan = screen.getByText('$1,000.5%');
        expect(animatedSpan).toBeInTheDocument();
    });
});
