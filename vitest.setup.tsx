import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

// Mock framer-motion per Sentinel memory guidelines
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();

  // Use simple components to avoid "invalid DOM attributes" warnings
  const MotionComponent = React.forwardRef<any, any>((props, ref) => {
    // Filter out motion-specific props
    const {
      layoutId,
      animate,
      initial,
      exit,
      transition,
      variants,
      whileHover,
      whileTap,
      whileInView,
      viewport,
      onViewportEnter,
      onViewportLeave,
      layout,
      layoutScroll,
      ...validProps
    } = props;
    return <div ref={ref} {...validProps} />;
  });

  return {
    ...actual,
    motion: {
      div: MotionComponent,
      span: MotionComponent,
      button: MotionComponent,
      p: MotionComponent,
      h4: MotionComponent,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});
