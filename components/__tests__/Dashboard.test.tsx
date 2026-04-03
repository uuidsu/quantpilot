import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard';

const mockSim = {
  id: 1,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
  currentCash: '100000',
  leverageLimit: '2.5',
  exposureTarget: '1.0',
};

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}));

describe('Dashboard', () => {
  it('renders Level 1: Smoke & Render correctly with default Account tab', async () => {
    render(<Dashboard initialData={mockSim as any} onSimChange={vi.fn()} />);

    // Level 1: Smoke & Render Assertions
    // Initially renders loading or straight to account tab.
    // Dashboard should show "帳戶" tab by default
    await waitFor(() => {
      expect(screen.getByText('帳戶平衡 ✓')).toBeInTheDocument();
    });

    // Verify the tabs are rendered
    expect(screen.getByRole('button', { name: '帳戶' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '明細' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '模擬器' })).toBeInTheDocument();
  });

  it('renders Level 2: Core User Flows by switching tabs', async () => {
    render(<Dashboard initialData={mockSim as any} onSimChange={vi.fn()} />);

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('帳戶平衡 ✓')).toBeInTheDocument();
    });

    // 1. Switch to Trades (明細) tab
    const tradesTabBtn = screen.getByRole('button', { name: '明細' });
    await userEvent.click(tradesTabBtn);

    // Level 2 Assertions: Check Trades tab specific content
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '股票' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '選擇權' })).toBeInTheDocument();

    // 2. Switch to Overview (模擬器) tab
    const overviewTabBtn = screen.getByRole('button', { name: '模擬器' });
    await userEvent.click(overviewTabBtn);

    // Level 2 Assertions: Check Overview tab specific content
    await waitFor(() => {
      expect(screen.getByText('漲跌模擬')).toBeInTheDocument();
    });
    expect(screen.getByText('拖曳模擬大盤點數')).toBeInTheDocument();
  });
});
