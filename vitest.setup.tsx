import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock framer-motion to prevent jsdom errors with AnimatePresence and motion components
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();

  // Create a helper to strip framer-motion specific props that cause React warnings in jsdom
  const stripMotionProps = (props: any) => {
    const { layoutId, animate, initial, exit, transition, whileHover, whileTap, ...rest } = props;
    return rest;
  };

  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: React.forwardRef((props: any, ref: any) => (
        <div ref={ref} {...stripMotionProps(props)} />
      )),
      span: React.forwardRef((props: any, ref: any) => (
        <span ref={ref} {...stripMotionProps(props)} />
      )),
      button: React.forwardRef((props: any, ref: any) => (
        <button ref={ref} {...stripMotionProps(props)} />
      )),
      a: React.forwardRef((props: any, ref: any) => (
        <a ref={ref} {...stripMotionProps(props)} />
      )),
      p: React.forwardRef((props: any, ref: any) => (
        <p ref={ref} {...stripMotionProps(props)} />
      )),
      h4: React.forwardRef((props: any, ref: any) => (
        <h4 ref={ref} {...stripMotionProps(props)} />
      )),
    },
  };
});
