import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Pointer Events mock for framer-motion/interactions
if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
}

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        AnimatePresence: ({ children }: any) => <>{children}</>,
        motion: {
            ...actual.motion,
            div: require('react').forwardRef((props: any, ref: any) => {
                const { layoutId, animate, initial, exit, transition, ...rest } = props;
                return <div ref={ref} {...rest} />;
            }),
            span: require('react').forwardRef((props: any, ref: any) => {
                const { layoutId, animate, initial, exit, transition, ...rest } = props;
                return <span ref={ref} {...rest} />;
            }),
            button: require('react').forwardRef((props: any, ref: any) => {
                const { layoutId, animate, initial, exit, transition, ...rest } = props;
                return <button ref={ref} {...rest} />;
            }),
        }
    };
});
