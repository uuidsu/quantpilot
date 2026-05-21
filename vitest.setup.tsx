import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

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
})

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion') as any;
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <div ref={ref} {...props} />
      )),
      span: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <span ref={ref} {...props} />
      )),
      button: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <button ref={ref} {...props} />
      )),
      svg: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <svg ref={ref} {...props} />
      )),
      path: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <path ref={ref} {...props} />
      )),
      h2: React.forwardRef(({ layoutId, animate, initial, exit, transition, ...props }: any, ref) => (
        <h2 ref={ref} {...props} />
      )),
    }
  }
})

vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual('recharts') as any;
  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>
}))
