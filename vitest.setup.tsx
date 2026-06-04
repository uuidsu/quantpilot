import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock Pointer Events API for components doing swiping/dragging
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.hasPointerCapture = vi.fn()

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}))

// Mock framer-motion to prevent DOM warnings and speed up tests
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => children,
    motion: {
      ...actual.motion,
      div: ({ layoutId, animate, initial, exit, transition, ...props }: any) => <div {...props} />,
      span: ({ layoutId, animate, initial, exit, transition, ...props }: any) => <span {...props} />,
    }
  }
})

// Mock recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    )
  }
})
