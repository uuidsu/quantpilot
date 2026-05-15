import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('recharts', () => {
  const OriginalRecharts = vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children }: any) => <svg className="recharts-surface">{children}</svg>,
    Area: () => <path />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    CartesianGrid: () => <g />,
    Tooltip: () => <div />,
  };
});

window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
