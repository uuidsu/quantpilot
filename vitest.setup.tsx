import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
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

// Mock setPointerCapture
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
