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

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Recharts ResponsiveContainer
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts')
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  }
})

// Mock framer-motion components (AnimatePresence, motion) if needed
vi.mock('framer-motion', async () => {
  const actual: any = await vi.importActual('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: any) => {
        const {
          initial,
          animate,
          exit,
          transition,
          variants,
          whileHover,
          whileTap,
          layoutId,
          ...rest
        } = props
        return <div {...rest}>{children}</div>
      },
      button: ({ children, ...props }: any) => {
        const {
          initial,
          animate,
          exit,
          transition,
          variants,
          whileHover,
          whileTap,
          layoutId,
          ...rest
        } = props
        return <button {...rest}>{children}</button>
      },
      span: ({ children, ...props }: any) => {
        const {
          initial,
          animate,
          exit,
          transition,
          variants,
          whileHover,
          whileTap,
          layoutId,
          ...rest
        } = props
        return <span {...rest}>{children}</span>
      },
      li: ({ children, ...props }: any) => {
         const {
          initial,
          animate,
          exit,
          transition,
          variants,
          whileHover,
          whileTap,
          layoutId,
          ...rest
        } = props
        return <li {...rest}>{children}</li>
      }
    },
  }
})
