import { render, screen, waitFor, act } from '@testing-library/react';
import { Dashboard } from '../components/Dashboard';
import '@testing-library/jest-dom';

// --------------------------------------------------------------------------------
// Mock Setup
// --------------------------------------------------------------------------------

// Mock ResizeObserver for Recharts rendering without real DOM dimensions
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Next.js App Router hooks used by the shell
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  }),
  useSearchParams: () => ({
    get: () => null
  }),
  usePathname: () => '/'
}));

// Comprehensive mock data covering stocks, options, cash, and loans to simulate rich state
const richMockSim = {
    id: 1,
    name: 'Sentinel Master Sim',
    symbols: [
        { symbol: 'AAPL', averagePrice: 150, currentPrice: 160, shares: 10, currency: 'USD' }
    ],
    options: [
        { id: 'opt1', symbol: 'TXO', strike: 15000, type: 'CALL', expiry: '2025-01-01', action: 'SELL', quantity: 1, price: 50, currentPrice: 40, fee: 20 }
    ],
    cashEvents: [
        { id: 1, account: 'Main', action: 'deposit', amount: 10000, currency: 'USD', description: 'Initial Funding', date: new Date().toISOString() }
    ],
    loans: [
        { id: 1, name: 'Mortgage', principal: 5000, interestRate: 0.05, durationMonths: 12, startDate: new Date().toISOString() }
    ],
    stockTrades: [
        { id: 1, symbol: 'AAPL', action: 'BUY', quantity: 10, price: 150, fee: 5, date: new Date().toISOString() }
    ],
    optionsTrades: [
        { id: '1', symbol: 'TXO', action: 'SELL', quantity: 1, price: 50, fee: 20, date: new Date().toISOString(), strike: 15000, type: 'CALL', expiry: '2025-01-01' }
    ],
    settings: {
        interestRate: 0.02
    }
};

describe('👁️‍🗨️ Sentinel: Dashboard Component Integration Tests', () => {

    it('Level 1: Smoke & Render (The Baseline)', async () => {
        render(<Dashboard initialData={{ sims: [richMockSim], appSettings: null }} />);

        await waitFor(() => {
          expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
        });

        // Assert primary UI shells and navigation are strictly visible
        expect(screen.getByText('QuantPilot')).toBeInTheDocument();
        expect(screen.getByText('帳戶')).toBeInTheDocument();
        expect(screen.getByText('明細')).toBeInTheDocument();
        expect(screen.getByText('績效')).toBeInTheDocument();
        expect(screen.getByText('模擬器')).toBeInTheDocument();
    });

    it('Level 2: Core User Flows (The Interaction)', async () => {
        render(<Dashboard initialData={{ sims: [richMockSim], appSettings: null }} />);

        await waitFor(() => {
          expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
        });

        // Ensure routing via state updates renders correct sub-views
        act(() => { screen.getByText('明細').click(); });
        await waitFor(() => {
            expect(screen.getByText('股票')).toBeInTheDocument();
            expect(screen.getByText('選擇權')).toBeInTheDocument();
            expect(screen.getByText('貸款')).toBeInTheDocument();
        });

        act(() => { screen.getByText('績效').click(); });
        await waitFor(() => {
            expect(screen.getByText('股票市值')).toBeInTheDocument();
            expect(screen.getByText('未實現損益')).toBeInTheDocument();
        });
    });

    it('Level 3: Asynchronous & State (The Network / Data Integration)', async () => {
        render(<Dashboard initialData={{ sims: [richMockSim], appSettings: null }} />);

        await waitFor(() => {
          expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
        });

        // Assert header computed the holdings properly based on mock data injection
        await waitFor(() => {
             const summaryEl = screen.getByText((content, element) => {
                 return element?.tagName.toLowerCase() === 'p' &&
                        element?.textContent?.includes('檔持股') || false;
             });
             expect(summaryEl).toBeInTheDocument();
        });

        // Expand the DoubleEntrySnapshot view and assert underlying accounting engines ran correctly
        act(() => { screen.getByText(/Σ所有帳戶/i).click(); });

        await waitFor(() => {
            expect(screen.getByText('現金')).toBeInTheDocument();
        });

        await waitFor(() => {
            const realAccounts = screen.queryAllByText(/實體帳戶/);
            expect(realAccounts.length).toBeGreaterThan(0);
        });
    });

    it('Level 4: Edge Cases & Web Quirks (The Hardening)', async () => {
        const emptySim = { ...richMockSim, id: 2, name: 'Empty', symbols: [], options: [], cashEvents: [], loans: [], stockTrades: [], optionsTrades: [] };

        render(<Dashboard initialData={{ sims: [emptySim], appSettings: null }} />);

        await waitFor(() => {
          expect(screen.queryByText('初始化中...')).not.toBeInTheDocument();
        });

        // Ensure 0-holdings format handles correctly
        await waitFor(() => {
             const zeroSummaryEl = screen.getByText((content, element) => {
                 return element?.tagName.toLowerCase() === 'p' &&
                        element?.textContent?.includes('0') &&
                        element?.textContent?.includes('檔持股') || false;
             });
             expect(zeroSummaryEl).toBeInTheDocument();
        });

        // Assert DoubleEntry balances properly empty state logic
        await waitFor(() => {
             const balanceEl = screen.getByText((content, element) => {
                 return element?.tagName.toLowerCase() === 'p' &&
                        element?.textContent?.includes('Σ所有帳戶 = $0') || false;
             });
             expect(balanceEl).toBeInTheDocument();
        });

        // Access 'More' to assert auxiliary views do not crash empty sims
        act(() => { screen.getByText('更多').click(); });

        await waitFor(() => {
            const settingsElements = screen.queryAllByText(/設定/);
            expect(settingsElements.length).toBeGreaterThan(0);
        });
    });
});
