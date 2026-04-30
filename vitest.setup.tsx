import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Explicitly mock window.matchMedia
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
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Pointer Events
if (typeof window !== 'undefined' && window.HTMLElement) {
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
}
