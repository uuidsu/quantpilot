import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AdvicePanel } from '../components/AdvicePanel';
import { describe, it, expect, vi } from 'vitest';

describe('AdvicePanel Component Level 2: State Visualization', () => {
    it('renders "safe" state when currentLeverage is well below limit', async () => {
        render(<AdvicePanel currentLeverage={1} limit={2.5} />);

        await waitFor(() => {
            const title = screen.getByText('Comfortable Exposure');
            expect(title).toBeInTheDocument();
        });

        const message = screen.getByText('You have room to increase exposure by buying more shares.');
        expect(message).toBeInTheDocument();
    });

    it('renders "warning" state when currentLeverage is approaching limit', async () => {
        render(<AdvicePanel currentLeverage={2.2} limit={2.5} />);

        await waitFor(() => {
            const title = screen.getByText('Approaching Limit');
            expect(title).toBeInTheDocument();
        });

        const message = screen.getByText('Your leverage is getting high. Be cautious with new purchases.');
        expect(message).toBeInTheDocument();
    });

    it('renders "danger" state when currentLeverage exceeds limit', async () => {
        render(<AdvicePanel currentLeverage={3} limit={2.5} />);

        await waitFor(() => {
            const title = screen.getByText('Margin Call Risk!');
            expect(title).toBeInTheDocument();
        });

        const message = screen.getByText('Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.');
        expect(message).toBeInTheDocument();
    });
});
